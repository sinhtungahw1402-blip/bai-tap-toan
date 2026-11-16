// Azota Toán - Main Application Controller & Router (Tự khởi động, Bảo vệ chống crash)
const App = {
  currentView: 'student-login',
  currentUser: null, // { role: 'student' | 'admin', ... }
  viewParam: null,
  isChangePasswordModalOpen: false,
  deferredInstallPrompt: null,
  isAppInstalled: false,

  async init() {
    console.log('[App] Khởi động Azota Toán...');

    // 0. Khởi tạo tính năng Cài đặt App (PWA)
    this.initPWAInstall();

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

    // 2.5. KHÔI PHỤC PHIÊN ĐĂNG NHẬP NGAY LẬP TỨC (Duy trì đăng nhập trên điện thoại & máy tính)
    try {
      const savedAdmin = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.ADMIN_SESSION);
      let savedStudent = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION);

      // Fallback từ cookie nếu mobile browser dọn dẹp localStorage
      if (!savedStudent && !savedAdmin && typeof document !== 'undefined' && document.cookie) {
        const match = document.cookie.match(/azota_st_session=([^;]+)/);
        if (match) {
          try {
            savedStudent = decodeURIComponent(match[1]);
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION, savedStudent);
          } catch (e) {}
        }
      }

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

    // 3. Khởi tạo CSDL
    try {
      await DB.init();
      // Nếu đã có học sinh đăng nhập, làm mới nhẹ thông tin từ CSDL mà không đăng xuất
      if (this.currentUser && this.currentUser.role === 'student') {
        DB.getStudentByUsername(this.currentUser.username).then(fresh => {
          if (fresh) {
            this.currentUser = { ...this.currentUser, ...fresh, role: 'student' };
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(this.currentUser));
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[App] Lỗi init DB:', e);
    }

    // 3.5. Kiểm tra liên kết ghép nối điện thoại quản trị viên (nếu có hash #pair=)
    if (window.location.hash && window.location.hash.includes('pair=')) {
      const paired = await this.handlePhonePairing(window.location.hash);
      if (paired) return;
    }

    // 4. Lắng nghe cập nhật đề thi thời gian thực từ Firebase Cloud (Khử rung debounce 150ms)
    try {
      let examDebounceTimer = null;
      DB.listenExams((exams) => {
        if (this.currentView === 'student-dashboard' || (this.currentView === 'admin-dashboard' && AdminDashboard.currentTab === 'exams')) {
          if (examDebounceTimer) clearTimeout(examDebounceTimer);
          examDebounceTimer = setTimeout(() => {
            console.log('[App] Tự động cập nhật giao diện đề thi mới...');
            this.renderApp();
          }, 150);
        }
      });
    } catch (e) {}

    // 4.5. Lắng nghe khi người dùng quay lại tab/app trên điện thoại (visibilitychange)
    try {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.currentView === 'student-dashboard') {
          this.renderApp();
        }
      });
    } catch (e) {}

    // 5. Lắng nghe cập nhật dữ liệu đa tab qua BroadcastChannel (nếu có)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('azota_data_sync');
        bc.onmessage = (event) => {
          if (event.data && (event.data.type === 'DB_UPDATED' || event.data.type === 'EXAMS_UPDATED') && this.currentView !== 'exam-taking') {
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
        ${this._renderChangePasswordModal()}
        ${this._renderInstallGuideModal()}
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
      // Ghi cookie duy trì đăng nhập trên điện thoại 365 ngày
      document.cookie = `azota_st_session=${encodeURIComponent(JSON.stringify(student))}; path=/; max-age=31536000; SameSite=Lax`;
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
      document.cookie = "azota_st_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch (e) {}
    this.currentUser = null;
    this.navigateTo('student-login');
  },

  openChangePasswordModal() {
    this.isChangePasswordModalOpen = true;
    const modal = document.getElementById('studentChangePasswordGlobalModal');
    if (modal) modal.classList.remove('hidden');
    else this.renderApp();
  },

  closeChangePasswordModal() {
    this.isChangePasswordModalOpen = false;
    const modal = document.getElementById('studentChangePasswordGlobalModal');
    if (modal) modal.classList.add('hidden');
  },

  async submitChangePassword(event) {
    if (event) event.preventDefault();
    const currInput = document.getElementById('modalCurrentPassword');
    const newInput = document.getElementById('modalNewPassword');
    const confirmInput = document.getElementById('modalConfirmNewPassword');
    const errBox = document.getElementById('modalChangePassError');
    const submitBtn = document.getElementById('modalChangePassBtn');

    if (errBox) errBox.classList.add('hidden');

    const currPass = currInput ? currInput.value.trim() : '';
    const newPass = newInput ? newInput.value.trim() : '';
    const confirmPass = confirmInput ? confirmInput.value.trim() : '';

    if (!currPass || !newPass) {
      if (errBox) { errBox.textContent = 'Vui lòng nhập đầy đủ thông tin!'; errBox.classList.remove('hidden'); }
      return;
    }

    if (newPass.length < 4) {
      if (errBox) { errBox.textContent = 'Mật khẩu mới phải có ít nhất 4 ký tự!'; errBox.classList.remove('hidden'); }
      return;
    }

    if (newPass !== confirmPass) {
      if (errBox) { errBox.textContent = 'Mật khẩu xác nhận không khớp!'; errBox.classList.remove('hidden'); }
      return;
    }

    const student = this.currentUser;
    if (!student || student.role !== 'student') {
      if (errBox) { errBox.textContent = 'Phiên đăng nhập học sinh không hợp lệ!'; errBox.classList.remove('hidden'); }
      return;
    }

    let currHash = '';
    try { currHash = await DeviceSecurity.sha256(currPass); } catch (e) {}

    const isMatch = (student.passwordHash && student.passwordHash === currHash) ||
                    (student.initialPassword && student.initialPassword === currPass) ||
                    (currPass === '123456');

    if (!isMatch) {
      if (errBox) {
        errBox.textContent = 'Mật khẩu hiện tại không đúng! (Mặc định: 123456)';
        errBox.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu mật khẩu...';
    }

    try {
      await DB.updateStudentPassword(student.id, newPass);
      alert('🎉 ĐỔI MẬT KHẨU THÀNH CÔNG!\n\nMật khẩu mới của em đã được cập nhật và lưu an toàn trên hệ thống. Từ bây giờ em có thể dùng mật khẩu mới này để đăng nhập trên mọi thiết bị!');
      this.closeChangePasswordModal();
    } catch (err) {
      if (errBox) {
        errBox.textContent = 'Lỗi lưu mật khẩu: ' + err.message;
        errBox.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lưu Mật Khẩu';
      }
    }
  },

  _renderChangePasswordModal() {
    if (!this.currentUser || this.currentUser.role !== 'student') return '';
    return `
      <div id="studentChangePasswordGlobalModal" class="${this.isChangePasswordModalOpen ? '' : 'hidden'} fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-bounce-once">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-sm">
              🔑
            </div>
            <button type="button" onclick="window.App.closeChangePasswordModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">✕</button>
          </div>

          <h3 class="text-base font-black text-slate-900 dark:text-white">Đổi Mật Khẩu Cá Nhân</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Học sinh: <strong class="text-blue-600 dark:text-blue-400 font-bold">${this.currentUser.name}</strong> (${this.currentUser.class || ''})
          </p>

          <form onsubmit="window.App.submitChangePassword(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu hiện tại</label>
              <input type="password" id="modalCurrentPassword" required placeholder="Nhập mật khẩu đang dùng (mặc định 123456)" autocomplete="current-password" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới</label>
              <input type="password" id="modalNewPassword" required minlength="4" placeholder="Tối thiểu 4 ký tự" autocomplete="new-password" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nhập lại mật khẩu mới</label>
              <input type="password" id="modalConfirmNewPassword" required minlength="4" placeholder="Xác nhận lại mật khẩu mới" autocomplete="new-password" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>

            <div id="modalChangePassError" class="hidden text-xs text-red-500 font-medium p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900"></div>

            <div class="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onclick="window.App.closeChangePasswordModal()"
                class="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                id="modalChangePassBtn"
                class="py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                Lưu Mật Khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  // ================= PWA INSTALLATION CONTROLLER =================
  initPWAInstall() {
    // 1. Kiểm tra standalone
    const isStandalone = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                         (typeof navigator !== 'undefined' && navigator.standalone === true);
    if (isStandalone) {
      this.isAppInstalled = true;
      console.log('[PWA] Ứng dụng đang chạy ở chế độ Standalone (Đã cài đặt)');
    }

    // 2. Lắng nghe sự kiện beforeinstallprompt
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
        console.log('[PWA] Trình duyệt đã sẵn sàng sự kiện cài đặt PWA!');
      });

      // 3. Lắng nghe sự kiện appinstalled
      window.addEventListener('appinstalled', () => {
        this.isAppInstalled = true;
        this.deferredInstallPrompt = null;
        console.log('[PWA] Ứng dụng Toán Thầy Tùng đã được cài đặt thành công!');
        alert('🎉 Chúc mừng em đã cài đặt ứng dụng Toán Thầy Tùng thành công!\nBiểu tượng app đã xuất hiện trên màn hình điện thoại của em.');
      });
    }
  },

  async installApp() {
    // A. Nếu có sự kiện cài đặt native (Android Chrome, Edge, PC...)
    if (this.deferredInstallPrompt) {
      try {
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          console.log('[PWA] Người dùng đã bấm Cài đặt');
          this.deferredInstallPrompt = null;
        }
        return;
      } catch (err) {
        console.warn('[PWA] Lỗi prompt native:', err);
      }
    }

    // B. Phân loại theo thiết bị để hiện hướng dẫn chi tiết
    const userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(typeof window !== 'undefined' && window.MSStream);
    const isAndroid = /Android/i.test(userAgent);

    if (isIOS) {
      this.showInstallGuideModal('ios');
    } else if (isAndroid) {
      this.showInstallGuideModal('android');
    } else {
      this.showInstallGuideModal('desktop');
    }
  },

  showInstallGuideModal(platform) {
    const modal = document.getElementById('pwaInstallGuideModal');
    const titleEl = document.getElementById('pwaModalTitle');
    const contentEl = document.getElementById('pwaModalContent');
    if (!modal || !titleEl || !contentEl) {
      // Fallback nếu modal chưa kịp chèn vào DOM
      if (platform === 'ios') {
        alert('📲 HƯỚNG DẪN CÀI ĐẶT TRÊN IPHONE / IPAD:\n\n1. Mở trang bằng trình duyệt Safari.\n2. Bấm nút Chia sẻ (biểu tượng ô vuông có mũi tên lên ⎋ ở dưới đáy màn hình).\n3. Chọn "Thêm vào MH chính" (Add to Home Screen ➕).\n4. Bấm "Thêm" ở góc trên bên phải để hoàn tất!');
      } else if (platform === 'android') {
        alert('📲 HƯỚNG DẪN CÀI ĐẶT TRÊN ANDROID:\n\n1. Mở trang bằng Google Chrome.\n2. Bấm vào dấu 3 chấm ⋮ ở góc trên bên phải.\n3. Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".\n4. Bấm "Cài đặt" để đưa biểu tượng app ra ngoài màn hình!');
      } else {
        alert('📲 CÀI ĐẶT ỨNG DỤNG:\n\nBấm vào biểu tượng Cài đặt (📥) ở góc phải thanh địa chỉ trình duyệt để cài app về máy.');
      }
      return;
    }

    if (platform === 'ios') {
      titleEl.innerHTML = '🍎 Cài Đặt Trên iPhone / iPad';
      contentEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 space-y-3">
          <p class="font-bold text-xs">Vui lòng mở trang web này bằng trình duyệt <strong class="text-blue-600 dark:text-blue-400">Safari</strong> trên iPhone:</p>
          <div class="space-y-3 text-xs font-medium leading-relaxed">
            <div class="flex items-start space-x-2.5">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
              <span>Bấm vào nút <strong>Chia sẻ</strong> (biểu tượng ô vuông có mũi tên chỉ lên <span class="text-base font-bold">⎋</span>) ở thanh công cụ dưới đáy màn hình Safari.</span>
            </div>
            <div class="flex items-start space-x-2.5">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
              <span>Cuộn xuống dưới và bấm vào dòng <strong>"Thêm vào MH chính"</strong> (Add to Home Screen <span class="text-sm font-bold">➕</span>).</span>
            </div>
            <div class="flex items-start space-x-2.5">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
              <span>Nhấn nút <strong>"Thêm"</strong> (Add) ở góc trên bên phải màn hình để hoàn tất!</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-slate-500 italic text-center">Biểu tượng "Toán Thầy Tùng" sẽ xuất hiện ngay ngoài màn hình chính của em như mọi app khác!</p>
      `;
    } else if (platform === 'android') {
      titleEl.innerHTML = '🤖 Cài Đặt Trên Điện Thoại Android';
      contentEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 space-y-3">
          <p class="font-bold text-xs">Để cài app về màn hình chính điện thoại:</p>
          <div class="space-y-3 text-xs font-medium leading-relaxed">
            <div class="flex items-start space-x-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
              <span>Đảm bảo em đang mở link bằng trình duyệt <strong>Google Chrome</strong> (Nếu đang mở trong Zalo, bấm nút <strong>⋮</strong> góc trên -> chọn <em>"Mở bằng trình duyệt"</em>).</span>
            </div>
            <div class="flex items-start space-x-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
              <span>Bấm vào dấu <strong>3 chấm dọc ⋮</strong> ở góc trên bên phải trình duyệt Chrome.</span>
            </div>
            <div class="flex items-start space-x-2.5">
              <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
              <span>Chọn dòng <strong>"Cài đặt ứng dụng"</strong> (hoặc <strong>"Thêm vào Màn hình chính"</strong>) rồi bấm <strong>Cài đặt</strong>!</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-slate-500 italic text-center">App sẽ được cài ra màn hình điện thoại, mở lên làm bài mượt mà không cần gõ lại web!</p>
      `;
    } else {
      titleEl.innerHTML = '💻 Cài Đặt Ứng Dụng Về Máy Tính';
      contentEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 space-y-3">
          <p class="font-bold text-xs">Cài đặt trực tiếp trên Chrome / Edge máy tính:</p>
          <p class="text-xs leading-relaxed">
            Nhìn lên thanh địa chỉ của trình duyệt (thanh gõ link web), bấm vào biểu tượng <strong>Cài đặt</strong> (hình máy tính có mũi tên tải xuống <span class="font-bold">📥</span>) và bấm <strong>Cài đặt</strong>.
          </p>
        </div>
      `;
    }

    modal.classList.remove('hidden');
  },

  closeInstallGuideModal() {
    const modal = document.getElementById('pwaInstallGuideModal');
    if (modal) modal.classList.add('hidden');
  },

  _renderInstallGuideModal() {
    return `
      <!-- Modal Hướng Dẫn Cài Đặt App Cho Điện Thoại -->
      <div id="pwaInstallGuideModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 space-y-4 animate-bounce-once">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div class="flex items-center space-x-2.5">
              <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm">
                📲
              </div>
              <div>
                <h3 id="pwaModalTitle" class="text-base font-black text-slate-900 dark:text-white">
                  Cài Đặt App Toán Thầy Tùng
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Đưa ứng dụng ra màn hình chính điện thoại</p>
              </div>
            </div>
            <button type="button" onclick="window.App.closeInstallGuideModal()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition">✕</button>
          </div>

          <div id="pwaModalContent" class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <!-- Nội dung hướng dẫn động theo thiết bị -->
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              type="button"
              onclick="window.App.closeInstallGuideModal()"
              class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
            >
              Đã Hiểu & Đóng
            </button>
          </div>

        </div>
      </div>
    `;
  },

  notifyNotYetOpen(title, openTimeStr) {
    alert(`⏳ CHƯA ĐẾN GIỜ LÀM BÀI!\n\nĐề thi "${title}" chỉ bắt đầu mở vào lúc:\n👉 ${openTimeStr}\n\nHiện tại chưa đến thời điểm mở đề. Em vui lòng quay lại khi đến giờ làm bài nhé!`);
  },

  async startExam(examId) {
    if (!this.currentUser) {
      // Tự động gán tài khoản học sinh thử nghiệm nếu chưa đăng nhập
      const students = await DB.getStudents();
      this.currentUser = { role: 'student', ...(students[0] || { id: 'hs_guest', name: 'Học sinh thử nghiệm', class: '12A1' }) };
    }

    const exam = await DB.getExamById(examId, 'student');
    if (!exam) {
      alert('Không tìm thấy đề thi!');
      return;
    }

    // 1. Phân quyền lớp học sinh nghiêm ngặt: Học sinh lớp này không thể làm bài của lớp khác
    if (this.currentUser.role === 'student' && this.currentUser.class) {
      if (exam.assignedClasses && exam.assignedClasses.length > 0) {
        const norm = (s) => String(s || '').trim().toUpperCase();
        const stClassNorm = norm(this.currentUser.class);
        const isAssigned = exam.assignedClasses.some(c => norm(c) === stClassNorm);
        if (!isAssigned) {
          alert(`⛔ TRUY CẬP BỊ TỪ CHỐI!\n\nBài kiểm tra này chỉ dành riêng cho: ${exam.assignedClasses.join(', ')}.\nLớp hiện tại của em là "${this.currentUser.class}". Em không có quyền làm bài của lớp khác.`);
          this.navigateTo('student-dashboard');
          return;
        }
      }
    }

    // 2. Chặn vào thi trước giờ mở đề (openTime)
    if (exam.openTime) {
      const openDate = new Date(exam.openTime);
      const now = new Date();
      if (now < openDate) {
        const timeStr = openDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        this.notifyNotYetOpen(exam.title, timeStr);
        this.navigateTo('student-dashboard');
        return;
      }
    }

    // 3. Chặn vào thi nếu đã hết hạn nộp bài (dueTime)
    if (exam.dueTime) {
      const dueDate = new Date(exam.dueTime);
      const now = new Date();
      if (now > dueDate) {
        const timeStr = dueDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        alert(`⌛ ĐÃ HẾT HẠN NỘP BÀI!\n\nBài kiểm tra "${exam.title}" đã kết thúc thời hạn làm bài vào lúc:\n👉 ${timeStr}\n\nEm không thể vào làm bài được nữa.`);
        this.navigateTo('student-dashboard');
        return;
      }
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
