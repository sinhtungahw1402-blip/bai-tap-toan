// Toán thầy Tùng - Admin Login & Device Verification View
const AdminLogin = {
  activeTab: 'login', // 'login' | 'pair' | 'recover'

  render() {
    return `
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          
          <div class="text-center mb-6">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg shadow-amber-500/25">
              👑
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">Cổng Quản Trị Viên</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bảo mật 1 Thiết Bị Duy Nhất • Mã hóa SHA-256
            </p>
          </div>

          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
            
            <!-- Switch Tabs -->
            <div class="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900">
              <button
                onclick="window.AdminLogin.switchTab('login')"
                class="py-2 rounded-xl text-xs font-bold transition ${
                  this.activeTab === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }"
              >
                🔑 Đăng Nhập
              </button>
              <button
                onclick="window.AdminLogin.switchTab('pair')"
                class="py-2 rounded-xl text-xs font-bold transition ${
                  this.activeTab === 'pair'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }"
              >
                📱 Ghép Nối
              </button>
              <button
                onclick="window.AdminLogin.switchTab('recover')"
                class="py-2 rounded-xl text-xs font-bold transition ${
                  this.activeTab === 'recover'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }"
              >
                🔄 Khôi Phục
              </button>
            </div>

            <!-- Tab Content -->
            ${this._renderTabContent()}

            <!-- Simulation Helper for Testing Security -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onclick="window.AdminLogin.simulateAlienDevice()"
                class="w-full text-[11px] text-slate-400 hover:text-red-500 hover:underline transition text-center"
                title="Xóa token trình duyệt để giả lập máy lạ thử nghiệm tính năng khóa thiết bị"
              >
                🧪 Giả lập 'Thiết bị lạ' để thử nghiệm tính năng chặn thiết bị
              </button>
            </div>

          </div>

          <div class="text-center mt-5">
            <button onclick="window.App.navigateTo('student-login')" class="text-xs text-slate-500 dark:text-slate-400 hover:underline">
              ← Trở về Cổng thi của Học sinh
            </button>
          </div>

        </div>
      </div>
    `;
  },

  _renderTabContent() {
    if (this.activeTab === 'pair') {
      return this._renderPairForm();
    }
    if (this.activeTab === 'recover') {
      return this._renderRecoverForm();
    }
    return this._renderLoginForm();
  },

  _renderLoginForm() {
    return `
      <form onsubmit="window.AdminLogin.handleLogin(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Mật khẩu Quản Trị
          </label>
          <input
            type="password"
            id="adminPasswordInput"
            required
            autocomplete="current-password"
            placeholder="Nhập mật khẩu quản trị của bạn"
            class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
          />
        </div>

        <div id="adminLoginErrorBox" class="hidden p-3.5 rounded-2xl text-xs font-semibold leading-relaxed"></div>

        <button
          type="submit"
          class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition active:scale-98"
        >
          Xác Thực & Vào Quản Trị
        </button>
      </form>
    `;
  },

  _renderPairForm() {
    return `
      <form onsubmit="window.AdminLogin.handlePairInput(event)" class="space-y-4">
        <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <div class="font-bold flex items-center space-x-1">
            <span>📱 Ghép nối Điện thoại Quản trị:</span>
          </div>
          <p class="text-[11px] text-amber-700 dark:text-amber-300">
            Trên máy tính, vào <strong>Bảng Quản Trị &gt; 📱 Đồng Bộ Điện Thoại</strong>. Bạn có thể mở camera quét mã QR, hoặc sao chép link dán vào ô bên dưới:
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Dán Link hoặc Mã Ghép Nối từ Máy Tính
          </label>
          <textarea
            id="pairInputText"
            required
            rows="3"
            placeholder="Dán link gửi qua Zalo (ví dụ: https://...#pair=...) vào đây"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
          ></textarea>
        </div>

        <div id="pairErrorBox" class="hidden p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold"></div>

        <button
          type="submit"
          class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-md transition"
        >
          Xác Nhận & Đồng Bộ Thiết Bị Này
        </button>
      </form>
    `;
  },

  _renderRecoverForm() {
    return `
      <form onsubmit="window.AdminLogin.handleRecover(event)" class="space-y-4">
        <div class="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300">
          ℹ️ Nhập <strong>Mã khôi phục 1 lần</strong> đã lưu khi thiết lập ban đầu để cấp quyền quản trị cho thiết bị mới này.
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Mã khôi phục (Recovery Code)
          </label>
          <input
            type="text"
            id="recoveryCodeInput"
            required
            placeholder="ví dụ: AZOTA-A1B2-C3D4"
            class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Mật khẩu quản trị mới (hoặc giữ nguyên)
          </label>
          <input
            type="password"
            id="newPasswordForDevice"
            required
            minlength="6"
            placeholder="Đặt lại mật khẩu cho máy này"
            class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        <div id="recoverErrorBox" class="hidden p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold"></div>

        <button
          type="submit"
          class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
        >
          Chuyển Quyền Sang Thiết Bị Này
        </button>
      </form>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    window.App.renderApp();
  },

  async handleLogin(event) {
    event.preventDefault();
    const pass = document.getElementById('adminPasswordInput').value;
    const errBox = document.getElementById('adminLoginErrorBox');

    errBox.className = 'hidden';

    const adminConfig = await DB.getAdminConfig();
    if (!adminConfig || !adminConfig.isInitialized) {
      window.App.navigateTo('admin-setup');
      return;
    }

    const verify = await DeviceSecurity.verifyAdminLogin(pass, adminConfig);

    // Cập nhật trạng thái số lần thử sai hoặc khóa
    if (verify.failedAttempts !== undefined || verify.lockedUntil !== undefined) {
      await DB.saveAdminConfig({
        failedAttempts: verify.failedAttempts || 0,
        lockedUntil: verify.lockedUntil || null
      });
    }

    if (!verify.success) {
      errBox.innerHTML = verify.error;
      errBox.className = verify.isUnauthorizedDevice
        ? 'p-4 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold leading-relaxed'
        : 'p-3 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200';
      return;
    }

    // Đăng nhập thành công!
    await DB.saveAdminConfig({ lastLoginAt: new Date().toISOString() });
    window.App.loginAsAdmin();
  },

  async handlePairInput(event) {
    event.preventDefault();
    const rawInput = document.getElementById('pairInputText').value.trim();
    const errBox = document.getElementById('pairErrorBox');
    errBox.classList.add('hidden');

    if (!rawInput) return;

    let hash = rawInput;
    if (rawInput.includes('#pair=')) {
      hash = '#' + rawInput.split('#')[1];
    } else if (!rawInput.startsWith('#pair=')) {
      hash = '#pair=' + rawInput;
    }

    const success = await window.App.handlePhonePairing(hash);
    if (!success) {
      errBox.textContent = 'Mã hoặc link ghép nối không hợp lệ! Vui lòng kiểm tra lại link sao chép từ máy tính.';
      errBox.classList.remove('hidden');
    }
  },

  async handleRecover(event) {
    event.preventDefault();
    const code = document.getElementById('recoveryCodeInput').value;
    const newPass = document.getElementById('newPasswordForDevice').value;
    const errBox = document.getElementById('recoverErrorBox');

    errBox.classList.add('hidden');

    const adminConfig = await DB.getAdminConfig();
    if (!adminConfig) return;

    const result = await DeviceSecurity.recoverDevice(code, newPass, adminConfig);
    if (!result.success) {
      errBox.textContent = result.error;
      errBox.classList.remove('hidden');
      return;
    }

    await DB.saveAdminConfig(result.updatedConfig);
    alert(`Thiết bị này đã được ủy quyền thành công!\nMÃ KHÔI PHỤC MỚI CỦA BẠN LÀ:\n${result.newRecoveryCode}\nHãy lưu lại mã mới này!`);
    window.App.loginAsAdmin();
  },

  // Giả lập thiết bị lạ bằng cách đổi mã token cục bộ
  simulateAlienDevice() {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN, 'alien_unauthorized_device_' + Date.now());
    alert('Đã đổi sang mã thiết bị lạ! Bây giờ bạn hãy thử nhập đúng mật khẩu để xem hệ thống từ chối truy cập.');
  }
};

window.AdminLogin = AdminLogin;
