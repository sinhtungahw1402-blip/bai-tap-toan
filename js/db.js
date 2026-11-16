// Azota Toán - Unified Database Adapter (Cache-First In-Memory + Local Storage + Cloud Firebase)
const DB = {
  isFirebaseActive: false,
  firestore: null,

  // Bộ nhớ đệm In-Memory RAM: Phản hồi tức thì trong 0 miligiây, triệt tiêu hoàn toàn độ trễ khi chuyển tab
  _cache: {
    students: null,
    exams: null,
    submissions: null,
    adminConfig: null
  },
  _listenersAttached: false,
  _subscribers: [],

  // Nạp bộ nhớ đệm In-Memory từ LocalStorage ngay từ mili-giây đầu tiên
  _initCache() {
    if (!this._cache.students || !this._cache.exams) {
      const local = this._getLocal();
      this._cache.students = local.students || [];
      this._cache.exams = local.exams || [];
      this._cache.submissions = local.submissions || [];
      this._cache.adminConfig = local.adminConfig || null;
    }
  },

  // Đăng ký nhận thông báo thay đổi dữ liệu thời gian thực
  subscribe(callback) {
    if (typeof callback === 'function') {
      this._subscribers.push(callback);
    }
  },

  _notifySubscribers(type, data) {
    this._subscribers.forEach(cb => {
      try { cb(type, data); } catch (e) {}
    });
  },

  // Gắn các listener lắng nghe Firebase Cloud ngầm không chặn luồng chính (Non-blocking)
  _attachRealtimeListeners() {
    if (this._listenersAttached || !this.isFirebaseActive || !this.firestore) return;
    this._listenersAttached = true;
    console.log('[DB] Đã kích hoạt cơ chế đồng bộ Firebase Cloud Realtime ngầm (Zero-Latency Cache)...');

    // 1. Lắng nghe Đề thi
    try {
      this.firestore.collection('exams').onSnapshot((snap) => {
        if (!snap.empty) {
          const cloudExams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          cloudExams.sort((a, b) => new Date(b.createdAt || b.openTime || 0) - new Date(a.createdAt || a.openTime || 0));
          this._cache.exams = cloudExams;
          const local = this._getLocal();
          local.exams = cloudExams;
          this._saveLocal(local, false);
          this._notifySubscribers('exams', cloudExams);
        }
      }, (err) => console.warn('[DB Realtime] Lỗi lắng nghe đề thi:', err));
    } catch (e) {}

    // 2. Lắng nghe Học sinh
    try {
      this.firestore.collection('students').onSnapshot((snap) => {
        if (!snap.empty) {
          const cloudStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this._cache.students = cloudStudents;
          const local = this._getLocal();
          local.students = cloudStudents;
          this._saveLocal(local, false);
          this._notifySubscribers('students', cloudStudents);
        }
      }, (err) => console.warn('[DB Realtime] Lỗi lắng nghe học sinh:', err));
    } catch (e) {}

    // 3. Lắng nghe Bài nộp
    try {
      this.firestore.collection('submissions').onSnapshot((snap) => {
        if (!snap.empty) {
          const cloudSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this._cache.submissions = cloudSubs;
          const local = this._getLocal();
          local.submissions = cloudSubs;
          this._saveLocal(local, false);
          this._notifySubscribers('submissions', cloudSubs);
        }
      }, (err) => console.warn('[DB Realtime] Lỗi lắng nghe bài nộp:', err));
    } catch (e) {}

    // 4. Lắng nghe Cấu hình bảo mật Admin (Device lock)
    try {
      this.firestore.collection('admin_config').doc('device_lock').onSnapshot((doc) => {
        if (doc.exists) {
          const cloudConf = doc.data();
          this._cache.adminConfig = cloudConf;
          const local = this._getLocal();
          local.adminConfig = cloudConf;
          this._saveLocal(local, false);
          this._notifySubscribers('adminConfig', cloudConf);
        }
      }, (err) => console.warn('[DB Realtime] Lỗi lắng nghe admin config:', err));
    } catch (e) {}
  },

  // Khởi tạo Database
  async init() {
    // 0. Đảm bảo dữ liệu cục bộ luôn có sẵn SampleData (87 học sinh & đề thi) ngay lập tức
    let localData = null;
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB);
      if (raw) localData = JSON.parse(raw);
    } catch (e) {}

    // Tự động khôi phục dữ liệu mẫu nếu chưa có hoặc bị rỗng
    if (!localData || !localData.students || localData.students.length === 0 || !localData.exams || localData.exams.length === 0) {
      console.log('[DB] Nạp dữ liệu mẫu chuẩn vào CSDL');
      const initialDb = {
        students: (typeof SampleData !== 'undefined' && SampleData.students) ? SampleData.students : [],
        exams: (typeof SampleData !== 'undefined' && SampleData.exams) ? SampleData.exams : [],
        submissions: (typeof SampleData !== 'undefined' && SampleData.submissions) ? SampleData.submissions : [],
        adminConfig: localData ? localData.adminConfig : null
      };
      this._saveLocal(initialDb, false);
      localData = initialDb;
    } else {
      // Tự động đồng bộ và bổ sung học sinh mới từ SampleData (87 học sinh) vào CSDL máy hiện tại
      let modified = false;
      if (Array.isArray(localData.students) && typeof SampleData !== 'undefined' && Array.isArray(SampleData.students)) {
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

      // Đảm bảo đề thi có cấu hình thang điểm partPoints chuẩn
      if (Array.isArray(localData.exams)) {
        localData.exams.forEach(ex => {
          if (!ex.partPoints) {
            ex.partPoints = { part1: 0.25, part2: 1.0, part3: 0.5 };
            modified = true;
          }
          if (!Array.isArray(ex.assignedClasses)) {
            ex.assignedClasses = [];
            modified = true;
          }
        });
      }

      // Cập nhật chi tiết kết quả bài nộp mẫu nếu bị thiếu subDetails
      if (Array.isArray(localData.submissions) && typeof SampleData !== 'undefined' && Array.isArray(SampleData.submissions)) {
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
        this._saveLocal(localData, false);
      }
    }

    // Khởi tạo bộ nhớ đệm In-Memory siêu tốc từ LocalStorage đã hoàn thiện
    this._initCache();

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

        // Gắn lắng nghe Realtime chạy nền (hoàn toàn không chặn luồng khởi động app)
        this._attachRealtimeListeners();

        // Tự động kiểm tra Cloud ngầm: Nếu Cloud chưa có dữ liệu thì đẩy dữ liệu cục bộ lên Cloud
        this.firestore.collection('students').limit(1).get().then(snapCheck => {
          if (snapCheck.empty) {
            const local = this._getLocal();
            if (local && local.students && local.students.length > 0) {
              console.log(`[DB] Đang tự động tải ${local.students.length} học sinh và đề thi lên Firebase Cloud...`);
              this.syncLocalToFirestore(local);
            }
          }
        }).catch(e => console.warn('[DB] Lưu ý khi kiểm tra dữ liệu Cloud:', e));

        return;
      }
    } catch (err) {
      console.warn('[DB] Lỗi khởi động Firebase, chuyển sang chế độ cục bộ:', err);
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
      students: (typeof SampleData !== 'undefined' && SampleData.students) ? SampleData.students : [],
      exams: (typeof SampleData !== 'undefined' && SampleData.exams) ? SampleData.exams : [],
      submissions: (typeof SampleData !== 'undefined' && SampleData.submissions) ? SampleData.submissions : [],
      adminConfig: null
    };
  },

  // Lưu bản ghi Local và cập nhật tức thì Cache In-Memory
  _saveLocal(dbObj, broadcast = true) {
    if (dbObj.students) this._cache.students = dbObj.students;
    if (dbObj.exams) this._cache.exams = dbObj.exams;
    if (dbObj.submissions) this._cache.submissions = dbObj.submissions;
    if (dbObj.adminConfig !== undefined) this._cache.adminConfig = dbObj.adminConfig;

    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(dbObj));
    } catch (e) {
      console.warn('Lỗi ghi LocalStorage:', e);
    }

    if (broadcast) {
      // Phát thông báo qua BroadcastChannel (nếu trình duyệt hỗ trợ)
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('azota_data_sync');
          bc.postMessage({ type: 'DB_UPDATED', timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}
    }
  },

  // ================= ADMIN CONFIG & DEVICE LOCK =================
  async getAdminConfig(forceFresh = false) {
    this._initCache();
    if (!forceFresh && this._cache.adminConfig !== null) {
      return this._cache.adminConfig;
    }

    if (this.isFirebaseActive && this.firestore) {
      try {
        const doc = await this.firestore.collection('admin_config').doc('device_lock').get();
        if (doc.exists) {
          const data = doc.data();
          this._cache.adminConfig = data;
          const db = this._getLocal();
          db.adminConfig = data;
          this._saveLocal(db, false);
          return data;
        }
      } catch (e) {}
    }

    const db = this._getLocal();
    this._cache.adminConfig = db.adminConfig || null;
    return this._cache.adminConfig;
  },

  async saveAdminConfig(config) {
    this._initCache();
    this._cache.adminConfig = { ...(this._cache.adminConfig || {}), ...config };

    const db = this._getLocal();
    db.adminConfig = this._cache.adminConfig;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('admin_config').doc('device_lock').set(config, { merge: true });
      } catch (e) {}
    }
    return this._cache.adminConfig;
  },

  // ================= HỌC SINH (STUDENTS) =================
  async getStudents(forceFresh = false) {
    this._initCache();
    if (!forceFresh && this._cache.students && this._cache.students.length > 0) {
      return this._cache.students;
    }

    if (this.isFirebaseActive && this.firestore) {
      try {
        const snap = await this.firestore.collection('students').get();
        if (!snap.empty) {
          const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this._cache.students = students;
          const local = this._getLocal();
          local.students = students;
          this._saveLocal(local, false);
          return students;
        }
      } catch (e) {}
    }

    const db = this._getLocal();
    this._cache.students = db.students || [];
    return this._cache.students;
  },

  async getStudentByUsername(username) {
    const students = await this.getStudents();
    return students.find(s => s.username && s.username.toLowerCase() === String(username).toLowerCase().trim());
  },

  async saveStudent(studentData) {
    this._initCache();
    const students = this._cache.students || [];
    const index = students.findIndex(s => s.id === studentData.id);

    if (index >= 0) {
      students[index] = { ...students[index], ...studentData };
    } else {
      students.push(studentData);
    }
    this._cache.students = students;

    const db = this._getLocal();
    db.students = students;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('students').doc(studentData.id).set(studentData, { merge: true });
      } catch (e) {}
    }
    return studentData;
  },

  async updateStudentPassword(studentId, newPassword) {
    let hash = '';
    try {
      hash = await DeviceSecurity.sha256(newPassword);
    } catch (e) {
      hash = newPassword;
    }

    this._initCache();
    const students = this._cache.students || [];
    const index = students.findIndex(s => s.id === studentId);
    if (index >= 0) {
      students[index].passwordHash = hash;
      students[index].initialPassword = newPassword;
      students[index].mustChangePassword = false;
      students[index].updatedAt = new Date().toISOString();
      this._cache.students = students;
    }

    const db = this._getLocal();
    db.students = students;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('students').doc(studentId).set({
          passwordHash: hash,
          initialPassword: newPassword,
          mustChangePassword: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[DB] Đã cập nhật mật khẩu mới của học sinh ${studentId} lên Firebase Cloud!`);
      } catch (err) {
        console.warn('[DB] Lỗi lưu mật khẩu học sinh lên Firebase:', err);
      }
    }

    // Cập nhật phiên đăng nhập hiện hành nếu đúng học sinh này
    try {
      const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
      if (saved) {
        const current = JSON.parse(saved);
        if (current.id === studentId) {
          current.passwordHash = hash;
          current.initialPassword = newPassword;
          current.mustChangePassword = false;
          localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(current));
          if (window.App && window.App.currentUser) {
            window.App.currentUser.passwordHash = hash;
            window.App.currentUser.initialPassword = newPassword;
            window.App.currentUser.mustChangePassword = false;
          }
        }
      }
    } catch (e) {}

    return true;
  },

  async saveStudentsBulk(newStudentsList) {
    this._initCache();
    const existing = [...(this._cache.students || [])];
    
    newStudentsList.forEach(st => {
      const idx = existing.findIndex(e => e.username === st.username);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...st };
      } else {
        existing.push(st);
      }
    });

    this._cache.students = existing;
    const db = this._getLocal();
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
    this._initCache();
    this._cache.students = (this._cache.students || []).filter(s => s.id !== studentId);
    const db = this._getLocal();
    db.students = this._cache.students;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('students').doc(studentId).delete();
      } catch (e) {}
    }
    return true;
  },

  // ================= ĐỀ KIỂM TRA (EXAMS) =================
  async getExams(studentClass = null, role = 'admin', forceFresh = false) {
    this._initCache();
    let allExams = this._cache.exams || [];

    if (forceFresh || allExams.length === 0) {
      if (this.isFirebaseActive && this.firestore) {
        try {
          const snap = await this.firestore.collection('exams').get();
          if (!snap.empty) {
            allExams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            this._cache.exams = allExams;
            const db = this._getLocal();
            db.exams = allExams;
            this._saveLocal(db, false);
          }
        } catch (e) {
          console.warn('[DB] Lỗi tải đề từ Cloud:', e);
        }
      }

      if (allExams.length === 0) {
        const db = this._getLocal();
        allExams = db.exams || [];
        this._cache.exams = allExams;
      }
    }

    // Sắp xếp đề thi mới nhất lên trên (xử lý tức thì trong RAM)
    const sorted = [...allExams].sort((a, b) => new Date(b.createdAt || b.openTime || 0) - new Date(a.createdAt || a.openTime || 0));

    // Nếu là học sinh: chỉ hiển thị đề được giao cho đúng lớp của học sinh này
    if (role === 'student') {
      let filtered = sorted;
      if (studentClass) {
        const norm = (s) => String(s || '').trim().toUpperCase();
        const stClassNorm = norm(studentClass);
        filtered = sorted.filter(ex => {
          // 1. Nếu đề chưa giao lớp nào hoặc danh sách rỗng -> Không hiển thị cho học sinh
          if (!ex.assignedClasses || ex.assignedClasses.length === 0) return false;
          // 2. Nghiêm ngặt: Học sinh lớp này CHỈ thấy đề khi lớp mình có tên trong danh sách được giao (không phân biệt hoa thường hoặc khoảng trắng)
          return ex.assignedClasses.some(c => norm(c) === stClassNorm);
        });
      }
      return filtered.map(ex => GradingEngine.stripAnswersForStudent(ex));
    }

    return sorted;
  },

  async getExamById(examId, role = 'admin') {
    this._initCache();
    let exam = (this._cache.exams || []).find(e => e.id === examId);

    if (!exam) {
      const db = this._getLocal();
      exam = (db.exams || []).find(e => e.id === examId);
    }

    if (!exam && typeof SampleData !== 'undefined' && SampleData.exams) {
      exam = SampleData.exams.find(e => e.id === examId);
    }

    if (!exam && this.isFirebaseActive && this.firestore) {
      try {
        const doc = await this.firestore.collection('exams').doc(examId).get();
        if (doc.exists) {
          exam = { id: doc.id, ...doc.data() };
          if (this._cache.exams) {
            this._cache.exams.push(exam);
          }
        }
      } catch (e) {}
    }

    if (!exam) return null;

    if (role === 'student') {
      return GradingEngine.stripAnswersForStudent(exam);
    }
    return exam;
  },

  async saveExam(examData) {
    this._initCache();
    const exams = this._cache.exams || [];
    const idx = exams.findIndex(e => e.id === examData.id);

    if (idx >= 0) {
      exams[idx] = { ...exams[idx], ...examData, updatedAt: new Date().toISOString() };
    } else {
      exams.push({ ...examData, createdAt: new Date().toISOString() });
    }
    this._cache.exams = exams;

    const db = this._getLocal();
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
    this._initCache();
    this._cache.exams = (this._cache.exams || []).filter(e => e.id !== examId);
    this._cache.submissions = (this._cache.submissions || []).filter(s => s.examId !== examId);

    const db = this._getLocal();
    db.exams = this._cache.exams;
    db.submissions = this._cache.submissions;
    this._saveLocal(db);

    if (this.isFirebaseActive && this.firestore) {
      try {
        await this.firestore.collection('exams').doc(examId).delete();
      } catch (e) {}
    }
    return true;
  },

  // Lắng nghe thay đổi Đề thi từ Firebase Cloud theo thời gian thực (Real-time updates)
  listenExams(callback) {
    this.subscribe((type, data) => {
      if (type === 'exams' && typeof callback === 'function') {
        callback(data);
      }
    });
  },

  // ================= BÀI NỘP (SUBMISSIONS) =================
  async getSubmissions(examId = null, studentId = null, forceFresh = false) {
    this._initCache();
    let allSubs = this._cache.submissions;

    if (forceFresh || allSubs === null) {
      if (this.isFirebaseActive && this.firestore) {
        try {
          const snap = await this.firestore.collection('submissions').get();
          allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this._cache.submissions = allSubs;
          const db = this._getLocal();
          db.submissions = allSubs;
          this._saveLocal(db, false);
        } catch (e) {
          console.warn('[DB] Lỗi tải bài nộp từ Firestore:', e);
        }
      }
      if (allSubs === null) {
        const db = this._getLocal();
        allSubs = db.submissions || [];
        this._cache.submissions = allSubs;
      }
    }

    let filtered = allSubs || [];
    if (examId) filtered = filtered.filter(s => s.examId === examId);
    if (studentId) filtered = filtered.filter(s => s.studentId === studentId);
    return filtered;
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

    this._initCache();
    const subs = this._cache.submissions || [];
    subs.push(completeSubmission);
    this._cache.submissions = subs;

    const db = this._getLocal();
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
      students: (typeof SampleData !== 'undefined' && SampleData.students) ? SampleData.students : [],
      exams: (typeof SampleData !== 'undefined' && SampleData.exams) ? SampleData.exams : [],
      submissions: (typeof SampleData !== 'undefined' && SampleData.submissions) ? SampleData.submissions : [],
      adminConfig: null
    };
    this._cache = {
      students: [...resetDb.students],
      exams: [...resetDb.exams],
      submissions: [...resetDb.submissions],
      adminConfig: null
    };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(resetDb));
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
  }
};

window.DB = DB;