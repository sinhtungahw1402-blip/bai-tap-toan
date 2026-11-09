// Azota Toán - Device Security & Admin Single-Device Enforcement
const DeviceSecurity = {
  // Băm chuỗi bằng SHA-256 (Web Crypto API)
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Tạo mã định danh thiết bị duy nhất (Device Token)
  generateDeviceToken() {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const screenInfo = `${window.screen.width}x${window.screen.height}_${window.screen.colorDepth}`;
    return `azota_dev_${randomHex}_${btoa(screenInfo).replace(/=/g, '')}`;
  },

  // Tạo mã khôi phục 1 lần (Recovery Code)
  generateRecoveryCode() {
    const segment1 = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    const segment2 = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    return `AZOTA-${segment1}-${segment2}`;
  },

  // Lấy hoặc khởi tạo token thiết bị của trình duyệt hiện tại
  getDeviceToken() {
    let token = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
    if (!token) {
      token = this.generateDeviceToken();
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEVICE_TOKEN, token);
    }
    return token;
  },

  // Thiết lập quản trị viên lần đầu
  async setupInitialAdmin(password) {
    const deviceToken = this.getDeviceToken();
    const passwordHash = await this.sha256(password + '_azota_salt_2026');
    const deviceHash = await this.sha256(deviceToken);
    const recoveryCode = this.generateRecoveryCode();
    const recoveryHash = await this.sha256(recoveryCode);

    const adminConfig = {
      isInitialized: true,
      adminPasswordHash: passwordHash,
      registeredDeviceHash: deviceHash,
      recoveryCodeHash: recoveryHash,
      recoveryCodeUsed: false,
      failedAttempts: 0,
      lockedUntil: null,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      deviceInfo: `${navigator.userAgent.substring(0, 80)}`
    };

    return { adminConfig, recoveryCode };
  },

  // Xác thực đăng nhập quản trị (Mật khẩu + Thiết bị duy nhất + Khóa tạm thời)
  async verifyAdminLogin(password, adminConfig) {
    const now = Date.now();

    // 1. Kiểm tra khóa tài khoản
    if (adminConfig.lockedUntil && now < adminConfig.lockedUntil) {
      const remainingSeconds = Math.ceil((adminConfig.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return {
        success: false,
        error: `Tài khoản đang bị khóa tạm thời do nhập sai quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút (hoặc dùng mã khôi phục).`,
        isLocked: true,
        remainingSeconds
      };
    }

    // 2. Kiểm tra mật khẩu băm
    const inputPasswordHash = await this.sha256(password + '_azota_salt_2026');
    if (inputPasswordHash !== adminConfig.adminPasswordHash) {
      const newFailed = (adminConfig.failedAttempts || 0) + 1;
      let lockedUntil = null;
      if (newFailed >= APP_CONFIG.MAX_ADMIN_FAILED_ATTEMPTS) {
        lockedUntil = now + APP_CONFIG.LOCKOUT_DURATION_MS;
      }
      return {
        success: false,
        error: newFailed >= APP_CONFIG.MAX_ADMIN_FAILED_ATTEMPTS
          ? 'Bạn đã nhập sai quá 5 lần! Tài khoản quản trị bị khóa tạm thời trong 15 phút.'
          : `Mật khẩu quản trị không đúng! Còn ${APP_CONFIG.MAX_ADMIN_FAILED_ATTEMPTS - newFailed} lần thử.`,
        failedAttempts: newFailed,
        lockedUntil
      };
    }

    // 3. KIỂM TRA THIẾT BỊ DUY NHẤT (QUAN TRỌNG)
    const currentDeviceToken = this.getDeviceToken();
    const currentDeviceHash = await this.sha256(currentDeviceToken);

    if (currentDeviceHash !== adminConfig.registeredDeviceHash) {
      return {
        success: false,
        error: '🚫 THIẾT BỊ BỊ CHẶN: Dù đúng mật khẩu, thiết bị này CHƯA ĐƯỢC ỦY QUYỀN! Hệ thống chỉ cho phép 1 thiết bị duy nhất của quản trị viên. Nếu bạn đã đổi máy, vui lòng sử dụng "Mã khôi phục" để chuyển quyền.',
        isUnauthorizedDevice: true
      };
    }

    // Đăng nhập thành công! Reset số lần thử sai
    return {
      success: true,
      failedAttempts: 0,
      lockedUntil: null
    };
  },

  // Chuyển quyền sang thiết bị mới bằng Mã khôi phục 1 lần
  async recoverDevice(recoveryCode, newPassword, adminConfig) {
    const inputRecoveryHash = await this.sha256(recoveryCode.trim().toUpperCase());
    
    if (adminConfig.recoveryCodeUsed || inputRecoveryHash !== adminConfig.recoveryCodeHash) {
      return {
        success: false,
        error: 'Mã khôi phục không hợp lệ hoặc đã từng được sử dụng trước đó!'
      };
    }

    // Cấp quyền cho thiết bị hiện tại
    const newDeviceToken = this.getDeviceToken();
    const newDeviceHash = await this.sha256(newDeviceToken);
    const newPasswordHash = await this.sha256(newPassword + '_azota_salt_2026');
    
    // Sinh mã khôi phục mới cho lần sau
    const newRecoveryCode = this.generateRecoveryCode();
    const newRecoveryHash = await this.sha256(newRecoveryCode);

    const updatedConfig = {
      ...adminConfig,
      adminPasswordHash: newPasswordHash,
      registeredDeviceHash: newDeviceHash,
      recoveryCodeHash: newRecoveryHash,
      recoveryCodeUsed: false,
      failedAttempts: 0,
      lockedUntil: null,
      transferredAt: new Date().toISOString(),
      deviceInfo: `${navigator.userAgent.substring(0, 80)}`
    };

    return {
      success: true,
      updatedConfig,
      newRecoveryCode
    };
  }
};

window.DeviceSecurity = DeviceSecurity;
