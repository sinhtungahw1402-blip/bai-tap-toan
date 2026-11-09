// Azota Toán - Student Login View (Thân thiện, Nút vào thi 1 chạm)
const StudentLogin = {
  render() {
    return `
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          
          <!-- Welcome Brand Card -->
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl shadow-blue-500/25 mb-3 overflow-hidden border-2 border-white dark:border-slate-700 bg-amber-50">
              <img src="./assets/logo-thay-tung.jpg" alt="Toán thầy Tùng" class="w-full h-full object-cover" />
            </div>
            <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Toán Thầy Tùng
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cổng Khảo sát & Kiểm tra Toán Trực tuyến Chuẩn GDPT 2018
            </p>
          </div>

          <!-- Direct Test Button (1-Click Instant Access) -->
          <div class="mb-4">
            <button
              type="button"
              onclick="window.StudentLogin.directDemoExam()"
              class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition flex items-center justify-center space-x-2"
            >
              <span class="text-lg">⚡</span>
              <span>VÀO LÀM BÀI THI THỬ NGAY (1 CHẠM)</span>
            </button>
          </div>

          <!-- Main Login Form -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8">
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
                    placeholder="ví dụ: tranminh hoặc nguyenan"
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
                    placeholder="Nhập mật khẩu (mặc định: 123456)"
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
                Đăng Nhập Vào Phòng Thi
              </button>
            </form>

            <!-- Quick Test Accounts Helper -->
            <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/60">
              <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
                <span>⚡ Chọn nhanh tài khoản thi thử:</span>
                <span class="text-[10px] text-blue-600 dark:text-blue-400">Pass: 123456</span>
              </p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onclick="window.StudentLogin.fillAndLogin('vhgn10', '123456')"
                  class="p-2.5 text-left rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 border border-blue-200/60 dark:border-slate-600 transition"
                  title="Võ Hồng Gia Nghi - LỚP 10"
                >
                  <div class="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">Gia Nghi</div>
                  <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Lớp 10</div>
                </button>

                <button
                  type="button"
                  onclick="window.StudentLogin.fillAndLogin('vptt10', '123456')"
                  class="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                  title="Võ Phan Thanh Trúc - LỚP 10"
                >
                  <div class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">Thanh Trúc</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">Lớp 10</div>
                </button>

                <button
                  type="button"
                  onclick="window.StudentLogin.fillAndLogin('ptd10', '123456')"
                  class="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                  title="Phan Tuấn Đạt - LỚP 10"
                >
                  <div class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">Tuấn Đạt</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">Lớp 10</div>
                </button>
              </div>
            </div>

          </div>

          <!-- Bottom Switch to Admin -->
          <div class="text-center mt-5">
            <button
              onclick="window.App.navigateTo('admin-login')"
              class="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              Bạn là giáo viên / Quản trị viên? <span class="underline font-bold text-blue-600 dark:text-blue-400">Cổng Quản trị viên</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Modal Đổi Mật Khẩu Lần Đầu -->
      <div id="changePasswordModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-bounce-once">
          <div class="flex items-center justify-between mb-2">
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              🔑
            </div>
            <button onclick="document.getElementById('changePasswordModal').classList.add('hidden')" class="p-1 text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>

          <h3 class="text-base font-black text-slate-900 dark:text-white">Đổi Mật Khẩu Lần Đầu</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Để bảo mật tài khoản cá nhân, vui lòng đặt mật khẩu mới (hoặc bấm bỏ qua).
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

            <div class="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onclick="window.StudentLogin.skipPasswordChange()"
                class="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Bỏ qua & Vào thi
              </button>
              <button
                type="submit"
                class="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                Lưu Mật Khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  tempStudent: null,

  async handleSubmit(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const errorBox = document.getElementById('loginErrorBox');

    if (errorBox) errorBox.classList.add('hidden');

    try {
      const student = await DB.getStudentByUsername(username);
      if (!student) {
        if (errorBox) {
          errorBox.textContent = `Tên đăng nhập "${username}" không tồn tại trong danh sách học sinh! Vui lòng kiểm tra lại chính xác tên đăng nhập hoặc liên hệ Thầy Tùng.`;
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (student.status === 'locked') {
        if (errorBox) {
          errorBox.textContent = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Thầy/Cô.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      // Kiểm tra mật khẩu (hỗ trợ hash, mật khẩu ban đầu và mặc định 123456)
      let inputHash = '';
      try {
        inputHash = await DeviceSecurity.sha256(password);
      } catch (e) {}

      const isMatch = (student.passwordHash && student.passwordHash === inputHash) ||
                      (student.initialPassword && student.initialPassword === password) ||
                      (password === '123456');

      if (!isMatch) {
        if (errorBox) {
          errorBox.textContent = 'Mật khẩu không chính xác! (Mật khẩu mặc định là 123456)';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      // Đăng nhập thành công!
      window.App.loginAsStudent(student);

    } catch (err) {
      if (errorBox) {
        errorBox.textContent = 'Lỗi hệ thống: ' + err.message;
        errorBox.classList.remove('hidden');
      }
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

    try {
      const newHash = await DeviceSecurity.sha256(p1);
      this.tempStudent.passwordHash = newHash;
      this.tempStudent.initialPassword = null;
      this.tempStudent.mustChangePassword = false;
      await DB.saveStudent(this.tempStudent);
    } catch (e) {}

    document.getElementById('changePasswordModal')?.classList.add('hidden');
    window.App.loginAsStudent(this.tempStudent);
  },

  skipPasswordChange() {
    document.getElementById('changePasswordModal')?.classList.add('hidden');
    if (this.tempStudent) {
      window.App.loginAsStudent(this.tempStudent);
    }
  },

  async fillAndLogin(username, password) {
    const u = document.getElementById('loginUsername');
    const p = document.getElementById('loginPassword');
    if (u) u.value = username;
    if (p) p.value = password;

    const student = await DB.getStudentByUsername(username);
    if (student) {
      window.App.loginAsStudent(student);
    } else {
      this.handleSubmit();
    }
  },

  async directDemoExam() {
    // Vào thẳng phòng thi với bài kiểm tra mẫu có sẵn
    const exams = await DB.getExams(null, 'admin');
    const targetExam = exams[0] || SampleData.exams[0];
    const students = await DB.getStudents();
    const demoStudent = students.find(s => s.username === 'vhgn10') || students[0] || {
      id: 'hs_001',
      name: 'Võ Hồng Gia Nghi',
      class: 'LỚP 10'
    };

    window.App.currentUser = { role: 'student', ...demoStudent };
    window.App.startExam(targetExam.id);
  }
};

window.StudentLogin = StudentLogin;
