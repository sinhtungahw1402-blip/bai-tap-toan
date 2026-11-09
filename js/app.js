// Azota Toán - Main Application Controller & Router
const App = {
  currentView: 'student-login',
  currentUser: null, // { role: 'student' | 'admin', ... }
  viewParam: null,

  async init() {
    console.log('[App] Khởi động Azota Toán...');

    // 1. Đăng ký Service Worker cho PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[SW] ServiceWorker đã đăng ký:', reg.scope))
          .catch(err => console.warn('[SW] Lỗi đăng ký SW:', err));
      });
    }

    // 2. Khởi tạo chế độ Sáng/Tối
    const isDark = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DARK_MODE) === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    }

    // 3. Khởi tạo CSDL
    await DB.init();

    // 4. Khôi phục phiên đăng nhập
    const savedAdmin = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    const savedStudent = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);

    if (savedAdmin) {
      this.currentUser = { role: 'admin', name: 'Quản trị viên' };
      this.currentView = 'admin-dashboard';
    } else if (savedStudent) {
      try {
        const st = JSON.parse(savedStudent);
        this.currentUser = { role: 'student', ...st };
        this.currentView = 'student-dashboard';
      } catch (e) {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
        this.currentView = 'student-login';
      }
    } else {
      this.currentView = 'student-login';
    }

    // 5. Lắng nghe cập nhật dữ liệu đa tab qua BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('azota_data_sync');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'DB_UPDATED' && this.currentView !== 'exam-taking') {
            console.log('[App] Đồng bộ dữ liệu cập nhật từ tab khác');
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
        viewHtml = await StudentDashboard.render(this.currentUser);
        break;

      case 'exam-taking':
        viewHtml = ExamTaking.render();
        break;

      case 'exam-result':
        viewHtml = await ExamResult.render(this.viewParam, this.currentUser);
        break;

      case 'admin-login':
        // Kiểm tra xem đã có admin nào thiết lập chưa
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
        viewHtml = await AdminDashboard.render('overview');
        break;

      case 'student-management':
        viewHtml = await AdminDashboard.render('students');
        break;

      case 'exam-editor':
        viewHtml = await AdminDashboard.render('exams');
        break;

      case 'exam-assign':
        viewHtml = await AdminDashboard.render('assign', this.viewParam);
        break;

      case 'analytics':
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
  },

  navigateTo(view, param = null) {
    this.currentView = view;
    this.viewParam = param;
    this.renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  loginAsStudent(student) {
    this.currentUser = { role: 'student', ...student };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(student));
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    this.navigateTo('student-dashboard');
  },

  loginAsAdmin() {
    this.currentUser = { role: 'admin', name: 'Quản trị viên' };
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION, 'true');
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
    this.navigateTo('admin-dashboard');
  },

  logout() {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    this.currentUser = null;
    this.navigateTo('student-login');
  },

  startExam(examId) {
    this.currentView = 'exam-taking';
    this.viewParam = examId;
    ExamTaking.init(examId, this.currentUser);
  },

  viewResult(submissionId) {
    this.navigateTo('exam-result', submissionId);
  },

  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DARK_MODE, String(isDark));
    this.renderApp();
  }
};

window.App = App;

// Khởi chạy khi tài liệu DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
