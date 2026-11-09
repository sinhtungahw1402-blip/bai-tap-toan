// Azota Toán - Admin Initial Setup View (Khởi tạo mật khẩu & Đăng ký thiết bị duy nhất)
const AdminSetup = {
  recoveryCodeGenerated: null,

  render() {
    return `
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          
          <div class="text-center mb-6">
            <div class="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg shadow-amber-500/25">
              🛡️
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">Thiết Lập Quản Trị Viên</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Hệ thống bảo mật chỉ cho phép <strong>1 thiết bị duy nhất</strong> của bạn được quyền truy cập quản trị.
            </p>
          </div>

          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
            
            <div id="setupFormSection">
              <form onsubmit="window.AdminSetup.handleSetup(event)" class="space-y-4">
                
                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Mật khẩu quản trị mới
                  </label>
                  <input
                    type="password"
                    id="newAdminPass"
                    required
                    minlength="6"
                    placeholder="Ít nhất 6 ký tự bảo mật"
                    class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    id="confirmAdminPass"
                    required
                    minlength="6"
                    placeholder="Nhập lại mật khẩu trên"
                    class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <div class="font-bold flex items-center space-x-1">
                    <span>📱 Đăng ký thiết bị hiện tại</span>
                  </div>
                  <p class="text-[11px] leading-relaxed">
                    Trình duyệt trên máy tính/điện thoại bạn đang dùng sẽ được ghi nhận là thiết bị chính thức duy nhất.
                  </p>
                </div>

                <div id="setupErrorBox" class="hidden p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-200"></div>

                <button
                  type="submit"
                  class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition active:scale-98"
                >
                  Tạo Mật Khẩu & Đăng Ký Thiết Bị
                </button>
              </form>
            </div>

            <!-- Recovery Code Display Section (Shows once generated) -->
            <div id="recoveryCodeSection" class="hidden space-y-4">
              <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                <span class="text-2xl">🎉</span>
                <h3 class="text-sm font-black text-emerald-800 dark:text-emerald-200">
                  Đăng Ký Thiết Bị Thành Công!
                </h3>
                <p class="text-xs text-slate-600 dark:text-slate-300">
                  Dưới đây là <strong>MÃ KHÔI PHỤC 1 LẦN</strong> của bạn. Hãy sao chép và lưu trữ cẩn thận phòng khi đổi máy tính/điện thoại mới:
                </p>
                
                <div class="my-3 p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-emerald-400 font-mono text-base font-black text-slate-900 dark:text-white tracking-widest flex items-center justify-between">
                  <span id="displayedRecoveryCode">AZOTA-XXXX-YYYY</span>
                  <button
                    type="button"
                    onclick="window.AdminSetup.copyRecoveryCode()"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Sao chép
                  </button>
                </div>

                <p class="text-[11px] text-red-600 dark:text-red-400 font-bold">
                  ⚠️ Mã này chỉ hiển thị một lần duy nhất lúc này!
                </p>
              </div>

              <button
                type="button"
                onclick="window.AdminSetup.finishSetup()"
                class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
              >
                Tôi Đã Lưu Mã & Vào Bảng Quản Trị →
              </button>
            </div>

          </div>

          <div class="text-center mt-4">
            <button onclick="window.App.navigateTo('student-login')" class="text-xs text-slate-400 hover:underline">
              ← Quay lại Cổng học sinh
            </button>
          </div>

        </div>
      </div>
    `;
  },

  async handleSetup(event) {
    event.preventDefault();
    const p1 = document.getElementById('newAdminPass').value;
    const p2 = document.getElementById('confirmAdminPass').value;
    const errBox = document.getElementById('setupErrorBox');

    errBox.classList.add('hidden');

    if (p1 !== p2) {
      errBox.textContent = 'Mật khẩu xác nhận không khớp!';
      errBox.classList.remove('hidden');
      return;
    }

    try {
      const { adminConfig, recoveryCode } = await DeviceSecurity.setupInitialAdmin(p1);
      await DB.saveAdminConfig(adminConfig);

      this.recoveryCodeGenerated = recoveryCode;
      document.getElementById('setupFormSection').classList.add('hidden');
      document.getElementById('recoveryCodeSection').classList.remove('hidden');
      document.getElementById('displayedRecoveryCode').textContent = recoveryCode;

    } catch (err) {
      errBox.textContent = 'Lỗi khởi tạo: ' + err.message;
      errBox.classList.remove('hidden');
    }
  },

  copyRecoveryCode() {
    if (this.recoveryCodeGenerated) {
      navigator.clipboard.writeText(this.recoveryCodeGenerated);
      alert('Đã sao chép Mã khôi phục vào bộ nhớ đệm!');
    }
  },

  finishSetup() {
    window.App.loginAsAdmin();
  }
};

window.AdminSetup = AdminSetup;
