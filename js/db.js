// Azota Toán - Unified Database Adapter (Local Storage + Cloud Firebase)
const DB = {
  isFirebaseActive: false,
  firestore: null,

  // Khởi tạo Database
  async init() {
    // 1. Kiểm tra cấu hình Firebase: ưu tiên cấu hình tùy chỉnh máy Admin, sau đó cấu hình mặc định toàn trường trong APP_CONFIG
    try {
      let config = null;
      const customConfigStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
      if (customConfigStr) {
        try { config = JSON.parse(customConfigStr); } catch (e) {}
      }
      if (!config && APP_CONFIG.FIREBASE_CONFIG && APP_CONFIG.FIREBASE_CONFIG.apiKey) {
        config = APP_CONFIG.FIREBASE_CONFIG;
      }

      if (config && config.apiKey && config.projectId && typeof firebase !== 'undefined') {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(config);
        }
        this.firestore = firebase.firestore();
        this.isFirebaseActive = true;
        console.log('[DB] Kết nối Firebase Firestore Cloud thành công cho toàn trường!');

        // Tự động kiểm tra nếu Cloud chưa có dữ liệu thì đẩy dữ liệu cục bộ lên Cloud
        try {
          const snapCheck = await this.firestore.collection('students').limit(1).get();
          if (snapCheck.empty) {
            const local = this._getLocal();
            if (local && local.students && local.students.length > 0) {
              console.log(`[DB] Đang tự động tải ${local.students.length} học sinh và đề thi lên Firebase Cloud...`);
              await this.syncLocalToFirestore(local);
            }
          }
        } catch (e) {
          console.warn('[DB] Lưu ý khi kiểm tra dữ liệu Cloud:', e);
        }

        // Đồng bộ dữ liệu mới nhất từ Cloud về Local Cache của thiết bị
        try {
          // A. Đồng bộ Đề thi từ Cloud
          const snapExams = await this.firestore.collection('exams').get();
          if (!snapExams.empty) {
            const cloudExams = snapExams.docs.map(d => ({ id: d.id, ...d.data() }));
            const local = this._getLocal();
            local.exams = cloudExams;
            // Xóa bỏ các bài nộp mẫu cũ nếu có
            if (local.submissions && local.submissions.some(s => s.examId === 'exam_sample_12hk1')) {
              local.submissions = local.submissions.filter(s => s.examId !== 'exam_sample_12hk1');
            }
            this._saveLocal(local);
            console.log(`[DB] Đã đồng bộ ${cloudExams.length} đề thi mới từ Firebase Cloud!`);
          }

          // B. Đồng bộ Học sinh từ Cloud
          const snapStudents = await this.firestore.collection('students').get();
          if (!snapStudents.empty) {
            const cloudStudents = snapStudents.docs.map(d => ({ id: d.id, ...d.data() }));
            const local = this._getLocal();
            local.students = cloudStudents;
            this._saveLocal(local);
          }
        } catch (syncErr) {
          console.warn('[DB] Lưu ý khi đồng bộ Cloud về máy:', syncErr);
        }

        return;
      }
    } catch (err) {
      console.warn('[DB] Lỗi khởi động Firebase, chuyển sang chế độ cục bộ:', err);
    }

    // 2. Chế độ Lưu trữ Cục bộ có Dữ liệu mẫu (Khởi chạy ngay không cần cài đặt)
    let localData = null;
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB);
      if (raw) localData = JSON.parse(raw);
    } catch (e) {}

    // Tự động khôi phục dữ liệu mẫu nếu chưa có hoặc bị rỗng
    if (!localData || !localData.students || localData.students.length === 0 || !localData.exams || localData.exams.length === 0) {
      console.log('[DB] Nạp dữ liệu mẫu chuẩn vào CSDL');
      const initialDb = {
        students: SampleData.students || [],
        exams: SampleData.exams || [],
        submissions: SampleData.submissions || [],
        adminConfig: localData ? localData.adminConfig : null
      };
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(initialDb));
    } else {
      // Tự động đồng bộ và bổ sung học sinh mới từ SampleData (87 học sinh) vào CSDL máy hiện tại
      let modified = false;
      if (Array.isArray(localData.students) && Array.isArray(SampleData.students)) {
        const existingMap = new Map();
        localData.students.forEach(s => {
          if (s.username) existingMap.set(s.username.toLowerCase(), s);
        });

        SampleData.students.forEach(s => {
          const u = (s.username || '').toLowerCase();
          if (!existingMap.has(u)) {
            localData.students.push(s);
            existingMap.set(u, s);
            modified = true;
          }
        });
      }

      // Đảm bảo đề thi mở cho tất cả các lớp của trường và có cấu hình partPoints
      if (Array.isArray(localData.exams)) {
        localData.exams.forEach(ex => {
          if (!ex.partPoints) {
            ex.partPoints = { part1: 0.25, part2: 1.0, part3: 0.5 };
            modified = true;
          }
          if (!ex.assignedClasses || ex.assignedClasses.length === 0 || !ex.assignedClasses.includes('LỚP 10')) {
            ex.assignedClasses = ['LỚP 9', 'LỚP 10', 'LỚP 11', 'LỚP 12', '12A1', '12A2'];
            modified = true;
          }
        });
      }

      // Cập nhật chi tiết kết quả bài nộp mẫu nếu bị thiếu subDetails
      if (Array.isArray(localData.submissions) && Array.isArray(SampleData.submissions)) {
        SampleData.submissions.forEach(sampleSub => {
          const idx = localData.submissions.findIndex(s => s.id === sampleSub.id);
          if (idx >= 0) {
            localData.submissions[idx].itemResults = sampleSub.itemResults;
            localData.submissions[idx].score = sampleSub.score;
            modified = true;
          }
        });
      }

      if (modified) {
        console.log(`[DB] Đã cập nhật CSDL cục bộ: ${localData.students.length} học sinh`);
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(localData));
      }
    }
  },

  // Lấy toàn bộ bản ghi Local
  _getLocal() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.students && parsed.exams) return parsed;
      }
    } catch (e) {}

    // Fallback nếu rỗng
    return {
      students: SampleData.students || [],
      exams: SampleData.exams || [],
      submissions: SampleData.submissions || [],
      adminConfig: null
    };
  },

  // Lưu bản ghi Local
  _saveLocal(dbObj) {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(dbObj));
    } catch (e) {
      console.warn('Lỗi ghi LocalStorage:', e);
    }

    // Phát thông báo qua BroadcastChannel (nếu trình duyệt hỗ trợ)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('azota_data_sync');
        bc.postMessage({ type: 'DB_UPDATED', timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {}
  },

  // ================= ADMIN CONFIG & DEVICE LOCK =================
  async getAdminConfig() {
    if (this.isFirebaseActive && this.firestore) {
      try {
        const doc = await this.firestore.collection('admin_config').doc('device_lock').get();
        if (doc.exists) return doc.data();
      } catch (e) {}
    }
    const db = this._getLocal();
    return db.adminConfig || null;
  },

  async saveAdminConfig(config) {
    const db = this._getLocal();
    db.adminConfig = { ...db.adminConfig, ...config };
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('admin_config').doc('device_lock').set(config, { merge: true });
      } catch (e) {}
    }
    return db.adminConfig;
  },

  // ================= HỌC SINH (STUDENTS) =================
  async getStudents() {
    if (this.isFirebaseActive && this.firestore) {
      try {
        const snap = await this.firestore.collection('students').get();
        if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {}
    }
    const db = this._getLocal();
    return db.students || [];
  },

  async getStudentByUsername(username) {
    const students = await this.getStudents();
    return students.find(s => s.username && s.username.toLowerCase() === String(username).toLowerCase().trim());
  },

  async saveStudent(studentData) {
    const db = this._getLocal();
    const students = db.students || [];
    const index = students.findIndex(s => s.id === studentData.id);

    if (index >= 0) {
      students[index] = { ...students[index], ...studentData };
    } else {
      students.push(studentData);
    }
    db.students = students;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('students').doc(studentData.id).set(studentData, { merge: true });
      } catch (e) {}
    }
    return studentData;
  },

  async saveStudentsBulk(newStudentsList) {
    const db = this._getLocal();
    const existing = db.students || [];
    
    newStudentsList.forEach(st => {
      const idx = existing.findIndex(e => e.username === st.username);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...st };
      } else {
        existing.push(st);
      }
    });

    db.students = existing;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        const batch = this.firestore.batch();
        newStudentsList.forEach(st => {
          const docRef = this.firestore.collection('students').doc(st.id);
          batch.set(docRef, st, { merge: true });
        });
        await batch.commit();
      } catch (e) {}
    }
    return existing;
  },

  async deleteStudent(studentId) {
    const db = this._getLocal();
    db.students = (db.students || []).filter(s => s.id !== studentId);
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('students').doc(studentId).delete();
      } catch (e) {}
    }
    return true;
  },

  // ================= ĐỀ KIỂM TRA (EXAMS) =================
  async getExams(studentClass = null, role = 'admin') {
    let allExams = [];
    let cloudLoaded = false;
    if (this.isFirebaseActive && this.firestore) {
      try {
        const snap = await this.firestore.collection('exams').get();
        allExams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cloudLoaded = true;
        // Cập nhật bộ nhớ đệm cục bộ
        const db = this._getLocal();
        db.exams = allExams;
        this._saveLocal(db);
      } catch (e) {
        console.warn('[DB] Lỗi tải đề từ Cloud:', e);
      }
    }

    if (!cloudLoaded) {
      const db = this._getLocal();
      allExams = db.exams || [];
    }

    // Nếu là học sinh: lọc bài phù hợp và loại bỏ đáp án đúng
    if (role === 'student') {
      if (studentClass) {
        allExams = allExams.filter(ex => {
          // 1. Không giới hạn lớp hoặc mảng rỗng -> cho phép toàn trường
          if (!ex.assignedClasses || ex.assignedClasses.length === 0) return true;
          // 2. Trực tiếp có tên lớp của học sinh (ví dụ "LỚP 10", "12A1")
          if (ex.assignedClasses.includes(studentClass)) return true;
          // 3. Khớp khối (ví dụ đề gán "Khối 10" và học sinh thuộc lớp "LỚP 10" hoặc "10A1")
          const cleanGroup = (ex.classGroup || '').replace(/khối\s*/i, '').trim();
          const cleanClass = studentClass.replace(/lớp\s*/i, '').trim();
          if (cleanGroup && cleanClass && (cleanClass.startsWith(cleanGroup) || cleanGroup.startsWith(cleanClass))) {
            return true;
          }
          return false;
        });
      }
      return allExams.map(ex => GradingEngine.stripAnswersForStudent(ex));
    }

    return allExams;
  },

  async getExamById(examId, role = 'admin') {
    let exam = null;
    if (this.isFirebaseActive && this.firestore) {
      try {
        const doc = await this.firestore.collection('exams').doc(examId).get();
        if (doc.exists) exam = { id: doc.id, ...doc.data() };
      } catch (e) {}
    }

    if (!exam) {
      const db = this._getLocal();
      exam = (db.exams || []).find(e => e.id === examId);
    }

    if (!exam) {
      // Tìm trong SampleData
      exam = (SampleData.exams || []).find(e => e.id === examId);
    }

    if (!exam) return null;

    if (role === 'student') {
      return GradingEngine.stripAnswersForStudent(exam);
    }
    return exam;
  },

  async saveExam(examData) {
    const db = this._getLocal();
    const exams = db.exams || [];
    const idx = exams.findIndex(e => e.id === examData.id);

    if (idx >= 0) {
      exams[idx] = { ...exams[idx], ...examData, updatedAt: new Date().toISOString() };
    } else {
      exams.push({ ...examData, createdAt: new Date().toISOString() });
    }
    db.exams = exams;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('exams').doc(examData.id).set(examData, { merge: true });
      } catch (e) {}
    }
    return examData;
  },

  async deleteExam(examId) {
    const db = this._getLocal();
    db.exams = (db.exams || []).filter(e => e.id !== examId);
    db.submissions = (db.submissions || []).filter(s => s.examId !== examId);
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('exams').doc(examId).delete();
      } catch (e) {}
    }
    return true;
  },

  // ================= BÀI NỘP (SUBMISSIONS) =================
  async getSubmissions(examId = null, studentId = null) {
    if (this.isFirebaseActive && this.firestore) {
      try {
        let query = this.firestore.collection('submissions');
        if (examId) query = query.where('examId', '==', examId);
        if (studentId) query = query.where('studentId', '==', studentId);
        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('[DB] Lỗi tải bài nộp từ Firestore:', e);
      }
    }

    // Fallback cục bộ (chỉ khi offline hoặc chưa kết nối Firebase)
    const db = this._getLocal();
    let allSubs = db.submissions || [];
    if (examId) allSubs = allSubs.filter(s => s.examId === examId);
    if (studentId) allSubs = allSubs.filter(s => s.studentId === studentId);
    return allSubs;
  },

  async submitExam(submissionData) {
    const fullExam = await this.getExamById(submissionData.examId, 'admin');
    if (!fullExam) throw new Error('Không tìm thấy đề thi để chấm điểm!');

    const gradeResult = GradingEngine.gradeSubmission(
      fullExam,
      submissionData.answers,
      { scale: fullExam.scale || 10 }
    );

    const completeSubmission = {
      ...submissionData,
      id: submissionData.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      submittedAt: new Date().toISOString(),
      score: gradeResult.finalScore,
      rawScore: gradeResult.rawScore,
      maxRawScore: gradeResult.maxRawScore,
      itemResults: gradeResult.itemResults
    };

    const db = this._getLocal();
    const subs = db.submissions || [];
    subs.push(completeSubmission);
    db.submissions = subs;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('submissions').doc(completeSubmission.id).set(completeSubmission);
      } catch (e) {}
    }

    return completeSubmission;
  },

  // Đồng bộ toàn bộ dữ liệu CSDL cục bộ lên Firestore
  async syncLocalToFirestore(dbObj = null) {
    if (!this.isFirebaseActive || !this.firestore) return;
    const db = dbObj || this._getLocal();
    
    // Lưu adminConfig
    if (db.adminConfig) {
      await this.firestore.collection('admin_config').doc('device_lock').set(db.adminConfig, { merge: true });
    }

    // Lưu danh sách học sinh
    if (db.students && db.students.length > 0) {
      for (const st of db.students) {
        await this.firestore.collection('students').doc(st.id).set(st, { merge: true });
      }
    }

    // Lưu ngân hàng đề thi
    if (db.exams && db.exams.length > 0) {
      for (const ex of db.exams) {
        await this.firestore.collection('exams').doc(ex.id).set(ex, { merge: true });
      }
    }

    // Lưu các bài đã nộp
    if (db.submissions && db.submissions.length > 0) {
      for (const sub of db.submissions) {
        await this.firestore.collection('submissions').doc(sub.id).set(sub, { merge: true });
      }
    }
    console.log('[DB] Đã hoàn tất đồng bộ toàn bộ dữ liệu lên Firebase Firestore Cloud!');
  },

  // Xuất toàn bộ CSDL (Học sinh, Đề thi, Cấu hình) ra file JSON để sao lưu / chuyển máy
  exportDatabaseJson() {
    const db = this._getLocal();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Du_Lieu_Azota_Toan_${db.students ? db.students.length : 0}HS_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  // Nhập dữ liệu CSDL từ file JSON
  async importDatabaseJson(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!imported.students || !imported.exams) {
            throw new Error('Tệp không đúng cấu trúc CSDL của Azota Toán!');
          }

          // Bảo lưu deviceToken của thiết bị hiện tại nếu có
          const currentToken = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
          if (currentToken && imported.adminConfig) {
            const currentHash = await DeviceSecurity.sha256(currentToken);
            const hashes = imported.adminConfig.registeredDeviceHashes || [];
            if (!hashes.includes(currentHash)) hashes.push(currentHash);
            imported.adminConfig.registeredDeviceHashes = hashes;
          }

          this._saveLocal(imported);

          // Nếu đang kết nối Firebase, đồng bộ tiếp lên Cloud
          if (this.isFirebaseActive && this.firestore) {
            await this.syncLocalToFirestore(imported);
          }

          resolve({ success: true, studentCount: imported.students.length, examCount: imported.exams.length });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'Không thể đọc tệp tin' });
      reader.readAsText(file);
    });
  },

  // Khôi phục dữ liệu mẫu
  resetToSampleData() {
    const resetDb = {
      students: SampleData.students || [],
      exams: SampleData.exams || [],
      submissions: SampleData.submissions || [],
      adminConfig: null
    };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(resetDb));
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
  }
};

window.DB = DB;
