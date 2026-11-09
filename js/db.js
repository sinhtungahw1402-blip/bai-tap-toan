// Azota Toán - Unified Database Adapter (Local Storage + Cloud Firebase)
const DB = {
  isFirebaseActive: false,
  firestore: null,

  // Khởi tạo Database
  async init() {
    // 1. Kiểm tra cấu hình Firebase tùy chỉnh lưu trong máy
    try {
      const customConfigStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
      if (customConfigStr) {
        const config = JSON.parse(customConfigStr);
        if (config.apiKey && config.projectId && typeof firebase !== 'undefined') {
          if (!firebase.apps.length) {
            firebase.initializeApp(config);
          }
          this.firestore = firebase.firestore();
          this.isFirebaseActive = true;
          console.log('[DB] Kết nối Firebase Firestore thành công!');
          return;
        }
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
    if (this.isFirebaseActive && this.firestore) {
      try {
        const snap = await this.firestore.collection('exams').get();
        if (!snap.empty) allExams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {}
    }

    if (allExams.length === 0) {
      const db = this._getLocal();
      allExams = db.exams || [];
    }

    // Nếu là học sinh: lọc bài phù hợp và loại bỏ đáp án đúng
    if (role === 'student') {
      if (studentClass) {
        allExams = allExams.filter(ex => 
          !ex.assignedClasses || 
          ex.assignedClasses.length === 0 || 
          ex.assignedClasses.includes(studentClass)
        );
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
    let allSubs = [];
    if (this.isFirebaseActive && this.firestore) {
      try {
        let query = this.firestore.collection('submissions');
        if (examId) query = query.where('examId', '==', examId);
        if (studentId) query = query.where('studentId', '==', studentId);
        const snap = await query.get();
        allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {}
    }

    if (allSubs.length === 0) {
      const db = this._getLocal();
      allSubs = db.submissions || [];
      if (examId) allSubs = allSubs.filter(s => s.examId === examId);
      if (studentId) allSubs = allSubs.filter(s => s.studentId === studentId);
    }

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
