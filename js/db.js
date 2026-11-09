// Azota Toán - Unified Database Adapter (Local Storage + Cloud Firebase)
const DB = {
  isFirebaseActive: false,
  firestore: null,

  // Khởi tạo Database
  async init() {
    // 1. Kiểm tra cấu hình Firebase tùy chỉnh lưu trong máy
    const customConfigStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
    if (customConfigStr) {
      try {
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
      } catch (err) {
        console.warn('[DB] Lỗi khởi động Firebase, chuyển sang chế độ cục bộ:', err);
      }
    }

    // 2. Chế độ Lưu trữ Cục bộ có Dữ liệu mẫu (Khởi chạy ngay không cần cài đặt)
    let localData = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB);
    if (!localData) {
      console.log('[DB] Khởi tạo dữ liệu mẫu lần đầu vào LocalStorage');
      const initialDb = {
        students: SampleData.students,
        exams: SampleData.exams,
        submissions: SampleData.submissions,
        adminConfig: null // Sẽ thiết lập ở lần đầu Admin đăng ký
      };
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(initialDb));
    }
  },

  // Lấy toàn bộ bản ghi Local
  _getLocal() {
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB);
    return raw ? JSON.parse(raw) : { students: [], exams: [], submissions: [], adminConfig: null };
  },

  // Lưu bản ghi Local
  _saveLocal(dbObj) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(dbObj));
    // Phát thông báo qua BroadcastChannel để các tab/cửa sổ khác cập nhật theo
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
      const doc = await this.firestore.collection('admin_config').doc('device_lock').get();
      return doc.exists ? doc.data() : null;
    }
    const db = this._getLocal();
    return db.adminConfig || null;
  },

  async saveAdminConfig(config) {
    if (this.isFirebaseActive && this.firestore) {
      await this.firestore.collection('admin_config').doc('device_lock').set(config, { merge: true });
    }
    const db = this._getLocal();
    db.adminConfig = { ...db.adminConfig, ...config };
    this._saveLocal(db);
    return db.adminConfig;
  },

  // ================= HỌC SINH (STUDENTS) =================
  async getStudents() {
    if (this.isFirebaseActive && this.firestore) {
      const snap = await this.firestore.collection('students').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    const db = this._getLocal();
    return db.students || [];
  },

  async getStudentByUsername(username) {
    const students = await this.getStudents();
    return students.find(s => s.username.toLowerCase() === username.toLowerCase());
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
      await this.firestore.collection('students').doc(studentData.id).set(studentData, { merge: true });
    }
    return studentData;
  },

  async saveStudentsBulk(newStudentsList) {
    const db = this._getLocal();
    const existing = db.students || [];
    
    // Gộp và ghi đè theo username hoặc id
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
      const batch = this.firestore.batch();
      newStudentsList.forEach(st => {
        const docRef = this.firestore.collection('students').doc(st.id);
        batch.set(docRef, st, { merge: true });
      });
      await batch.commit();
    }
    return existing;
  },

  async deleteStudent(studentId) {
    const db = this._getLocal();
    db.students = (db.students || []).filter(s => s.id !== studentId);
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      await this.firestore.collection('students').doc(studentId).delete();
    }
    return true;
  },

  // ================= ĐỀ KIỂM TRA (EXAMS) =================
  async getExams(studentClass = null, role = 'admin') {
    let allExams = [];
    if (this.isFirebaseActive && this.firestore) {
      const snap = await this.firestore.collection('exams').get();
      allExams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const db = this._getLocal();
      allExams = db.exams || [];
    }

    // Nếu là học sinh: chỉ lọc đề giao cho lớp của học sinh và BẢO MẬT loại bỏ đáp án
    if (role === 'student') {
      if (studentClass) {
        allExams = allExams.filter(ex => 
          !ex.assignedClasses || 
          ex.assignedClasses.length === 0 || 
          ex.assignedClasses.includes(studentClass)
        );
      }
      // Bảo mật tuyệt đối: không để đáp án đúng lộ phía client học sinh
      return allExams.map(ex => GradingEngine.stripAnswersForStudent(ex));
    }

    return allExams;
  },

  async getExamById(examId, role = 'admin') {
    let exam = null;
    if (this.isFirebaseActive && this.firestore) {
      const doc = await this.firestore.collection('exams').doc(examId).get();
      if (doc.exists) exam = { id: doc.id, ...doc.data() };
    } else {
      const db = this._getLocal();
      exam = (db.exams || []).find(e => e.id === examId);
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
      await this.firestore.collection('exams').doc(examData.id).set(examData, { merge: true });
    }
    return examData;
  },

  async deleteExam(examId) {
    const db = this._getLocal();
    db.exams = (db.exams || []).filter(e => e.id !== examId);
    // Xóa luôn các bài nộp thuộc đề này
    db.submissions = (db.submissions || []).filter(s => s.examId !== examId);
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      await this.firestore.collection('exams').doc(examId).delete();
    }
    return true;
  },

  // ================= BÀI NỘP (SUBMISSIONS) & CHẤM ĐIỂM BẢO MẬT =================
  async getSubmissions(examId = null, studentId = null) {
    let allSubs = [];
    if (this.isFirebaseActive && this.firestore) {
      let query = this.firestore.collection('submissions');
      if (examId) query = query.where('examId', '==', examId);
      if (studentId) query = query.where('studentId', '==', studentId);
      const snap = await query.get();
      allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const db = this._getLocal();
      allSubs = db.submissions || [];
      if (examId) allSubs = allSubs.filter(s => s.examId === examId);
      if (studentId) allSubs = allSubs.filter(s => s.studentId === studentId);
    }
    return allSubs;
  },

  // Nộp bài và chấm điểm tự động (Bảo mật: lấy exam gốc có đáp án phía DB để chấm)
  async submitExam(submissionData) {
    // 1. Lấy đề thi gốc (có đáp án để chấm)
    const fullExam = await this.getExamById(submissionData.examId, 'admin');
    if (!fullExam) throw new Error('Không tìm thấy đề thi để chấm điểm!');

    // 2. Chạy thuật toán chấm điểm chuẩn
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

    // 3. Lưu vào Database
    const db = this._getLocal();
    const subs = db.submissions || [];
    subs.push(completeSubmission);
    db.submissions = subs;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      await this.firestore.collection('submissions').doc(completeSubmission.id).set(completeSubmission);
    }

    return completeSubmission;
  },

  // Khôi phục dữ liệu mẫu
  resetToSampleData() {
    const resetDb = {
      students: SampleData.students,
      exams: SampleData.exams,
      submissions: SampleData.submissions,
      adminConfig: null
    };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(resetDb));
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
  }
};

window.DB = DB;
