// Azota Toán - Configuration & Constants
const APP_CONFIG = {
  APP_NAME: 'Azota Toán',
  VERSION: '1.0.0',
  DEFAULT_SCALE: 10,
  
  // Thời gian tối đa đăng nhập sai trước khi khóa tạm thời (15 phút)
  MAX_ADMIN_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,

  // Định dạng mặc định cho 3 dạng câu hỏi (Chuẩn kỳ thi GDPT 2018)
  PARTS: {
    PART_1: { id: 1, name: 'Phần I: Trắc nghiệm 4 lựa chọn (A, B, C, D)', defaultPoints: 0.25 },
    PART_2: { id: 2, name: 'Phần II: Trắc nghiệm Đúng / Sai (4 ý a, b, c, d)', defaultPoints: 1.0 },
    PART_3: { id: 3, name: 'Phần III: Trả lời ngắn (Điền số)', defaultPoints: 0.5 }
  },

  // Điểm lũy tiến cho Phần II (Đúng/Sai)
  PART_2_PROGRESSIVE_POINTS: {
    1: 0.1,
    2: 0.25,
    3: 0.5,
    4: 1.0
  },

  // Key lưu trữ cục bộ
  STORAGE_KEYS: {
    STUDENT_SESSION: 'azota_student_session',
    ADMIN_SESSION: 'azota_admin_session',
    DEVICE_TOKEN: 'azota_device_token',
    LOCAL_DB: 'azota_local_db_v1',
    FIREBASE_CONFIG: 'azota_firebase_custom_config',
    DARK_MODE: 'azota_dark_mode'
  }
};

window.APP_CONFIG = APP_CONFIG;
