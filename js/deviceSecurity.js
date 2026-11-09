// Azota Toán - Device Security & Admin Single-Device Enforcement (Hỗ trợ 100% mọi trình duyệt & thiết bị)
const DeviceSecurity = {
  // Pure JavaScript SHA-256 (Chuẩn FIPS 180-2, hoạt động độc lập không cần HTTPS, không sợ lỗi crypto.subtle trên điện thoại/file://)
  _pureSha256(str) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let i, j;
    let result = '';

    const words = [];
    // Chuyển chuỗi UTF-8 sang byte string
    const utf8Str = unescape(encodeURIComponent(str));
    const asciiBitLength = utf8Str.length * 8;

    let hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    let ascii = utf8Str + '\x80';
    while ((ascii.length % 64) !== 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - (i % 4)) * 8);
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength | 0);

    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = (hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? (w[i] | 0) : (
            (w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + (w[i - 7] | 0)
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0
          ))) | 0;

        const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (let b = 3; b >= 0; b--) {
        const byte = (hash[i] >> (8 * b)) & 255;
        result += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  },

  // Băm chuỗi bằng SHA-256 (Tự động dùng Web Crypto nếu có, fallback sang Pure JS an toàn 100%)
  async sha256(message) {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      // Fallback
    }
    return this._pureSha256(String(message));
  },

  // Tạo byte ngẫu nhiên an toàn (tương thích mọi trình duyệt và mạng nội bộ)
  getRandomBytes(length) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      try {
        const arr = new Uint8Array(length);
        window.crypto.getRandomValues(arr);
        return Array.from(arr);
      } catch (e) {}
    }
    // Fallback Math.random
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(Math.random() * 256));
    }
    return bytes;
  },

  // Tạo mã định danh thiết bị duy nhất (Device Token)
  generateDeviceToken() {
    const randomHex = this.getRandomBytes(16).map(b => b.toString(16).padStart(2, '0')).join('');
    const screenInfo = `${window.screen?.width || 1920}x${window.screen?.height || 1080}_${Date.now()}`;
    return `azota_dev_${randomHex}_${Math.random().toString(36).substr(2, 8)}`;
  },

  // Tạo mã khôi phục 1 lần (Recovery Code)
  generateRecoveryCode() {
    const s1 = this.getRandomBytes(3).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    const s2 = this.getRandomBytes(3).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    return `AZOTA-${s1}-${s2}`;
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
      deviceInfo: `${navigator.userAgent ? navigator.userAgent.substring(0, 80) : 'Browser'}`
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
      deviceInfo: `${navigator.userAgent ? navigator.userAgent.substring(0, 80) : 'Browser'}`
    };

    return {
      success: true,
      updatedConfig,
      newRecoveryCode
    };
  }
};

window.DeviceSecurity = DeviceSecurity;
