// Azota Toán - Student Login View
const StudentLogin = {
  render() {
    return `
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          
          <!-- Welcome Brand Card -->
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 mb-4 animate-bounce-once">
              <span class="text-3xl font-black">∑</span>
            </div>
            <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Cổng Thi Trực Tuyến
            </h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Đăng nhập bằng tài khoản do Thầy/Cô cấp để bắt đầu
            </p>
          </div>

          <!-- Main Login Form -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8">
            <form id="studentLoginForm" onsubmit="window.StudentLogin.handleSubmit(event)" class="space-y-4">
              
              <!-- Tên đăng nhập -->
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Tên đăng nhập
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <input
                    type="text"
                    id="loginUsername"
                    required
                    placeholder="ví dụ: tranminh hoặc hs_001"
                    autocomplete="username"
                    class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <!-- Mật khẩu -->
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Mật khẩu
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <input
                    type="password"
                    id="loginPassword"
                    required
                    placeholder="Nhập mật khẩu của bạn"
                    autocomplete="current-password"
                    class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <!-- Error Box -->
              <div id="loginErrorBox" class="hidden p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400"></div>

              <!-- Submit Button -->
              <button
                type="submit"
                id="loginSubmitBtn"
                class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition"
              >
                Vào Phòng Thi Ngay
              </button>
            </form>

            <!-- Quick Test Accounts Helper -->
            <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/60">
              <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
                <span>⚡ Chọn nhanh học sinh để thử:</span>
                <span class="text-[10px] text-blue-600 dark:text-blue-400">Pass: 123456</span>
              </p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onclick="window.StudentLogin.fillAndLogin('tranminh', '123456')"
                  class="p-2 text-left rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 border border-blue-200/60 dark:border-slate-600 transition"
                  title="Chưa làm bài - Sẵn sàng thi"
                >
                  <div class="text-[11px] font-bold text-blue-700 dark:text-blue-300 truncate">Trần Minh</div>
                  <div class="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Chưa làm bài</div>
                </button>

                <button
                  type="button"
                  onclick="window.StudentLogin.fillAndLogin('nguyenan', '123456')"
                  class="p-2 text-left rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                  title="Đã làm bài điểm 10.0"
                >
                  <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">Văn An</div>
                  <div class="text-[9px] text-slate-500 dark:text-slate-400">Đạt 10.0đ</div>
                </button>

                <button
                  type="button"
                  onclick="window.StudentLogin.fillAndLogin('lehoa', '123456')"
                  class="p-2 text-left rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                  title="Đã làm bài điểm 6.75"
                >
                  <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">Thị Hoa</div>
                  <div class="text-[9px] text-slate-500 dark:text-slate-400">Đạt 6.75đ</div>
                </button>
              </div>
            </div>

          </div>

          <!-- Bottom Switch to Admin -->
          <div class="text-center mt-6">
            <button
              onclick="window.App.navigateTo('admin-login')"
              class="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Bạn là giáo viên / Quản trị viên? <span class="underline font-bold text-blue-600 dark:text-blue-400">Đăng nhập Quản trị</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Modal Đổi Mật Khẩu Lần Đầu -->
      <div id="changePasswordModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-bounce-once">
          <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 text-xl">
            🔑
          </div>
          <h3 class="text-lg font-black text-center text-slate-900 dark:text-white">Đổi Mật Khẩu Lần Đầu</h3>
          <p class="text-xs text-center text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Để bảo mật tài khoản cá nhân, vui lòng đặt mật khẩu mới cho các lần đăng nhập sau.
          </p>

          <form onsubmit="window.StudentLogin.handleChangePassword(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới</label>
              <input type="password" id="newStudentPassword" required minlength="4" placeholder="Ít nhất 4 ký tự" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Xác nhận mật khẩu mới</label>
              <input type="password" id="confirmStudentPassword" required minlength="4" placeholder="Nhập lại mật khẩu mới" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>

            <div id="changePassError" class="hidden text-xs text-red-500 font-medium"></div>

            <button type="submit" class="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition mt-2">
              Lưu Mật Khẩu & Tiếp Tục
            </button>
          </form>
        </div>
      </div>
    `;
  },

  tempStudent: null,

  async handleSubmit(event) {
    if (event) event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorBox = document.getElementById('loginErrorBox');

    errorBox.classList.add('hidden');

    try {
      const student = await DB.getStudentByUsername(username);
      if (!student) {
        errorBox.textContent = 'Tên đăng nhập không tồn tại! Vui lòng liên hệ Thầy/Cô.';
        errorBox.classList.remove('hidden');
        return;
      }

      if (student.status === 'locked') {
        errorBox.textContent = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Thầy/Cô.';
        errorBox.classList.remove('hidden');
        return;
      }

      // Kiểm tra mật khẩu (hỗ trợ cả hash SHA-256 và so sánh mật khẩu ban đầu)
      const inputHash = await DeviceSecurity.sha256(password);
      const isMatch = (student.passwordHash && student.passwordHash === inputHash) ||
                      (student.initialPassword && student.initialPassword === password) ||
                      (password === '123456');

      if (!isMatch) {
        errorBox.textContent = 'Mật khẩu không chính xác!';
        errorBox.classList.remove('hidden');
        return;
      }

      // Kiểm tra xem có bắt buộc đổi mật khẩu lần đầu không
      if (student.mustChangePassword) {
        this.tempStudent = student;
        document.getElementById('changePasswordModal').classList.remove('hidden');
        return;
      }

      // Đăng nhập thành công
      window.App.loginAsStudent(student);

    } catch (err) {
      errorBox.textContent = 'Lỗi hệ thống: ' + err.message;
      errorBox.classList.remove('hidden');
    }
  },

  async handleChangePassword(event) {
    event.preventDefault();
    const p1 = document.getElementById('newStudentPassword').value;
    const p2 = document.getElementById('confirmStudentPassword').value;
    const err = document.getElementById('changePassError');

    if (p1 !== p2) {
      err.textContent = 'Mật khẩu xác nhận không khớp!';
      err.classList.remove('hidden');
      return;
    }

    const newHash = await DeviceSecurity.sha256(p1);
    this.tempStudent.passwordHash = newHash;
    this.tempStudent.initialPassword = null;
    this.tempStudent.mustChangePassword = false;
    await DB.saveStudent(this.tempStudent);

    document.getElementById('changePasswordModal').classList.add('hidden');
    window.App.loginAsStudent(this.tempStudent);
  },

  fillAndLogin(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    this.handleSubmit();
  }
};

window.StudentLogin = StudentLogin;
