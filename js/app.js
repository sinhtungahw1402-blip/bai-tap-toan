// Azota Toán - Main Application Controller & Router (Tự khởi động, Bảo vệ chống crash)
const App = {
  currentView: 'student-login',
  currentUser: null, // { role: 'student' | 'admin', ... }
  viewParam: null,

  async init() {
    console.log('[App] Khởi động Azota Toán...');

    // 1. Đăng ký Service Worker cho PWA (bỏ qua nếu file:// hoặc không hỗ trợ)
    try {
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[SW] ServiceWorker đã đăng ký:', reg.scope))
          .catch(err => console.warn('[SW] Bỏ qua đăng ký SW cục bộ'));
      }
    } catch (e) {}

    // 2. Khởi tạo chế độ Sáng/Tối
    try {
      const isDark = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DARK_MODE) === 'true';
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}

    // 3. Khởi tạo CSDL
    try {
      await DB.init();
    } catch (e) {
      console.warn('[App] Lỗi init DB:', e);
    }

    // 3.5. Kiểm tra liên kết ghép nối điện thoại quản trị viên (nếu có hash #pair=)
    if (window.location.hash && window.location.hash.includes('pair=')) {
      const paired = await this.handlePhonePairing(window.location.hash);
      if (paired) return;
    }

    // 4. Khôi phục phiên đăng nhập
    try {
      const savedAdmin = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
      const savedStudent = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);

      if (savedAdmin) {
        this.currentUser = { role: 'admin', name: 'Quản trị viên' };
        this.currentView = 'admin-dashboard';
      } else if (savedStudent) {
        const st = JSON.parse(savedStudent);
        this.currentUser = { role: 'student', ...st };
        this.currentView = 'student-dashboard';
      } else {
        this.currentView = 'student-login';
      }
    } catch (e) {
      this.currentView = 'student-login';
    }

    // 5. Lắng nghe cập nhật dữ liệu đa tab qua BroadcastChannel (nếu có)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('azota_data_sync');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'DB_UPDATED' && this.currentView !== 'exam-taking') {
            this.renderApp();
          }
        };
      }
    } catch (e) {}

    // 6. Vẽ giao diện lần đầu
    await this.renderApp();
  },

  async renderApp(param = null) {
    if (param !== null) this.viewParam = param;
    const root = document.getElementById('appRoot');
    if (!root) return;

    try {
      let viewHtml = '';

      // Render Navigation Bar (trừ màn hình làm bài thi để tạo không gian tập trung tối đa)
      const showNavbar = this.currentView !== 'exam-taking';
      const navHtml = showNavbar
        ? Navbar.render(this.currentUser, () => this.logout(), (v) => this.navigateTo(v), () => this.toggleDarkMode(), this.currentView)
        : '';

      // Route Switching
      switch (this.currentView) {
        case 'student-login':
          viewHtml = StudentLogin.render();
          break;

        case 'student-dashboard':
          if (!this.currentUser) {
            this.currentView = 'student-login';
            viewHtml = StudentLogin.render();
          } else {
            viewHtml = await StudentDashboard.render(this.currentUser);
          }
          break;

        case 'exam-taking':
          viewHtml = ExamTaking.render();
          break;

        case 'exam-result':
          viewHtml = await ExamResult.render(this.viewParam, this.currentUser);
          break;

        case 'admin-login':
          const adminConfig = await DB.getAdminConfig();
          if (!adminConfig || !adminConfig.isInitialized) {
            viewHtml = AdminSetup.render();
          } else {
            viewHtml = AdminLogin.render();
          }
          break;

        case 'admin-setup':
          viewHtml = AdminSetup.render();
          break;

        case 'admin-dashboard':
          viewHtml = await AdminDashboard.render(AdminDashboard.currentTab || 'overview', this.viewParam);
          break;

        case 'student-management':
          AdminDashboard.currentTab = 'students';
          viewHtml = await AdminDashboard.render('students');
          break;

        case 'exam-editor':
          AdminDashboard.currentTab = 'exams';
          viewHtml = await AdminDashboard.render('exams');
          break;

        case 'exam-assign':
          AdminDashboard.currentTab = 'assign';
          viewHtml = await AdminDashboard.render('assign', this.viewParam);
          break;

        case 'analytics':
          AdminDashboard.currentTab = 'analytics';
          viewHtml = await AdminDashboard.render('analytics', this.viewParam);
          break;

        default:
          viewHtml = StudentLogin.render();
      }

      root.innerHTML = `
        ${navHtml}
        <main class="min-h-[calc(100vh-4rem)]">
          ${viewHtml}
        </main>
      `;

      // Kích hoạt render công thức KaTeX cho toàn bộ trang
      if (typeof MathRenderer !== 'undefined') {
        MathRenderer.renderElement(root);
      }

    } catch (err) {
      console.error('[App] Lỗi render:', err);
      root.innerHTML = `
        <div class="p-8 max-w-lg mx-auto text-center space-y-4">
          <div class="text-4xl">⚠️</div>
          <h2 class="text-lg font-bold text-slate-800 dark:text-white">Đã xảy ra lỗi tải giao diện</h2>
          <p class="text-xs text-red-500 font-mono bg-red-50 dark:bg-red-950/40 p-3 rounded-xl">${err.message}</p>
          <button onclick="window.DB.resetToSampleData(); location.reload();" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">
            Khôi phục CSDL & Tải Lại Trang
          </button>
        </div>
      `;
    }
  },

  navigateTo(view, param = null) {
    this.currentView = view;
    this.viewParam = param;
    this.renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  loginAsStudent(student) {
    this.currentUser = { role: 'student', ...student };
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(student));
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    } catch (e) {}
    this.navigateTo('student-dashboard');
  },

  loginAsAdmin() {
    this.currentUser = { role: 'admin', name: 'Quản trị viên' };
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION, 'true');
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
    } catch (e) {}
    this.navigateTo('admin-dashboard');
  },

  logout() {
    try {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    } catch (e) {}
    this.currentUser = null;
    this.navigateTo('student-login');
  },

  async startExam(examId) {
    if (!this.currentUser) {
      // Tự động gán tài khoản học sinh thử nghiệm nếu chưa đăng nhập
      const students = await DB.getStudents();
      this.currentUser = { role: 'student', ...(students[0] || { id: 'hs_guest', name: 'Học sinh thử nghiệm', class: '12A1' }) };
    }
    this.currentView = 'exam-taking';
    this.viewParam = examId;
    await ExamTaking.init(examId, this.currentUser);
  },

  viewResult(submissionId) {
    this.navigateTo('exam-result', submissionId);
  },

  async handlePhonePairing(hash) {
    try {
      const match = hash.match(/pair=([^&]+)/);
      if (!match) return false;

      const raw = decodeURIComponent(match[1]);
      const jsonStr = decodeURIComponent(escape(atob(raw)));
      const payload = JSON.parse(jsonStr);

      if (payload.action !== 'PAIR_PHONE' || !payload.adminPasswordHash) {
        alert('Mã ghép nối không hợp lệ!');
        return false;
      }

      console.log('[App] Đang tiến hành ghép nối thiết bị điện thoại...');

      // 1. Lấy token thiết bị của điện thoại hiện tại
      const phoneToken = DeviceSecurity.getDeviceToken();
      const phoneHash = await DeviceSecurity.sha256(phoneToken);

      // 2. Tạo hoặc cập nhật cấu hình quản trị cho điện thoại
      const existingConfig = await DB.getAdminConfig() || {};
      const trustedHashes = existingConfig.registeredDeviceHashes || [];
      if (payload.registeredDeviceHash && !trustedHashes.includes(payload.registeredDeviceHash)) {
        trustedHashes.push(payload.registeredDeviceHash);
      }
      if (!trustedHashes.includes(phoneHash)) {
        trustedHashes.push(phoneHash);
      }

      const updatedAdminConfig = {
        ...existingConfig,
        isInitialized: true,
        adminPasswordHash: payload.adminPasswordHash,
        registeredDeviceHash: payload.registeredDeviceHash || phoneHash,
        registeredDeviceHashes: trustedHashes,
        failedAttempts: 0,
        lockedUntil: null,
        phoneAuthorizedAt: new Date().toISOString()
      };

      // 3. Lưu cấu hình quản trị mới đã ủy quyền cho điện thoại
      await DB.saveAdminConfig(updatedAdminConfig);

      // 4. Nếu máy tính đã có cấu hình Firebase, tự động truyền sang điện thoại
      if (payload.firebaseConfig) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG, payload.firebaseConfig);
        await DB.init();
      }

      // 5. Kích hoạt phiên đăng nhập Quản trị viên trên điện thoại
      this.currentUser = { role: 'admin', name: 'Quản trị viên' };
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION, 'true');
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);

      // 6. Xóa mã ghép nối khỏi URL để bảo mật
      history.replaceState(null, '', window.location.pathname);

      alert('🎉 ĐỒNG BỘ THÀNH CÔNG!\n\nĐiện thoại này đã được xác thực là Thiết Bị Quản Trị Viên Tin Cậy.\nBây giờ Thầy/Cô có thể quản lý đề thi và xem thống kê trên cả Máy tính và Điện thoại của mình!');

      this.currentView = 'admin-dashboard';
      await this.renderApp();
      return true;
    } catch (err) {
      console.error('[App] Lỗi ghép nối thiết bị:', err);
      alert('Không thể hoàn tất ghép nối: ' + err.message);
      return false;
    }
  },

  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DARK_MODE, String(isDark));
    } catch (e) {}
    this.renderApp();
  }
};

window.App = App;

// Khởi chạy ngay (Bất kể DOMContentLoaded đã kích hoạt hay chưa)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  // DOM đã sẵn sàng -> chạy ngay lập tức!
  App.init();
}
