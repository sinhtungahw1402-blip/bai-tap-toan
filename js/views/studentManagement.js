// Azota Toán - Student & Class Management View (Quản lý học sinh, Lớp học & Nhập Excel hàng loạt)
const StudentManagement = {
  selectedClass: 'ALL',
  searchQuery: '',

  async render() {
    const students = await DB.getStudents();
    const classes = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

    let filtered = students;
    if (this.selectedClass !== 'ALL') {
      filtered = filtered.filter(s => s.class === this.selectedClass);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
    }

    return `
      <div class="space-y-6">
        
        <!-- Action Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Quản Lý Học Sinh & Lớp Học</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng cộng: <strong>${students.length} học sinh</strong> thuộc <strong>${classes.length} lớp</strong>
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex items-center flex-wrap gap-2">
            <button
              onclick="window.ExcelHelper.downloadStudentTemplate()"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center space-x-1.5"
            >
              <span>📥 Tải File Mẫu Excel</span>
            </button>

            <label class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center space-x-1.5">
              <span>📤 Nhập Từ Excel</span>
              <input type="file" accept=".xlsx, .xls" class="hidden" onchange="window.StudentManagement.handleExcelUpload(event)" />
            </label>

            <button
              onclick="window.StudentManagement.openAddModal()"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <span>+ Thêm Học Sinh</span>
            </button>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          
          <!-- Class Filter Tabs -->
          <div class="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            <button
              onclick="window.StudentManagement.setClassFilter('ALL')"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                this.selectedClass === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }"
            >
              Tất cả (${students.length})
            </button>
            ${classes.map(c => `
              <button
                onclick="window.StudentManagement.setClassFilter('${c}')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  this.selectedClass === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }"
              >
                Lớp ${c} (${students.filter(s => s.class === c).length})
              </button>
            `).join('')}
          </div>

          <!-- Search Input -->
          <div class="w-full sm:w-64">
            <input
              type="text"
              value="${this.searchQuery}"
              oninput="window.StudentManagement.handleSearch(this.value)"
              placeholder="Tìm theo tên hoặc username..."
              class="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>

        <!-- Student Table -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">STT</th>
                  <th class="py-3 px-4">Họ và tên</th>
                  <th class="py-3 px-4">Lớp</th>
                  <th class="py-3 px-4">Tên đăng nhập</th>
                  <th class="py-3 px-4 text-center">Trạng thái</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400">Không tìm thấy học sinh nào</td>
                  </tr>
                ` : filtered.map((st, idx) => `
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3.5 px-4 text-slate-400 font-semibold">${idx + 1}</td>
                    <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${st.name}</td>
                    <td class="py-3.5 px-4">
                      <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        ${st.class}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">${st.username}</td>
                    <td class="py-3.5 px-4 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.status === 'locked' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }">
                        ${st.status === 'locked' ? 'Đã khóa' : 'Đang mở'}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right space-x-1">
                      <button
                        onclick="window.StudentManagement.resetPassword('${st.id}')"
                        title="Đặt lại mật khẩu về 123456"
                        class="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition text-xs font-bold"
                      >
                        🔑 Reset
                      </button>

                      <button
                        onclick="window.StudentManagement.toggleLock('${st.id}')"
                        title="${st.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}"
                        class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold"
                      >
                        ${st.status === 'locked' ? '🔓 Mở' : '🔒 Khóa'}
                      </button>

                      <button
                        onclick="window.StudentManagement.deleteStudent('${st.id}')"
                        title="Xóa học sinh"
                        class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition text-xs font-bold"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Modal Thêm Học Sinh Mới -->
      <div id="addStudentModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-black text-base text-slate-900 dark:text-white">Thêm Học Sinh Mới</h3>
            <button onclick="document.getElementById('addStudentModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <form onsubmit="window.StudentManagement.handleAddSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Họ và tên</label>
              <input type="text" id="newStudentName" required placeholder="Nguyễn Văn A" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
                <input type="text" id="newStudentClass" required placeholder="12A1" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên đăng nhập</label>
                <input type="text" id="newStudentUsername" required placeholder="an.nv" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm lowercase outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu ban đầu</label>
              <input type="text" id="newStudentPassword" value="123456" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" />
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition mt-2">
              Lưu Học Sinh
            </button>
          </form>
        </div>
      </div>
    `;
  },

  setClassFilter(c) {
    this.selectedClass = c;
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'students') {
      window.AdminDashboard.switchTab('students');
    } else {
      window.App.renderApp();
    }
  },

  handleSearch(q) {
    this.searchQuery = q;
    const query = q.toLowerCase();
    const rows = document.querySelectorAll('#adminTabContainer tbody tr');
    rows.forEach(tr => {
      const text = tr.innerText.toLowerCase();
      if (!query || text.includes(query)) {
        tr.style.display = '';
      } else {
        tr.style.display = 'none';
      }
    });
  },

  openAddModal() {
    document.getElementById('addStudentModal')?.classList.remove('hidden');
  },

  async handleAddSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('newStudentName').value.trim();
    const className = document.getElementById('newStudentClass').value.trim().toUpperCase();
    const username = document.getElementById('newStudentUsername').value.trim().toLowerCase();
    const password = document.getElementById('newStudentPassword').value.trim() || '123456';

    const pHash = await DeviceSecurity.sha256(password);
    const newStudent = {
      id: `hs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      class: className,
      username,
      passwordHash: pHash,
      initialPassword: password,
      mustChangePassword: true,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await DB.saveStudent(newStudent);
    document.getElementById('addStudentModal')?.classList.add('hidden');
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'students') {
      window.AdminDashboard.switchTab('students');
    } else {
      window.App.renderApp();
    }
  },

  async handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const result = ExcelHelper.parseStudentExcel(buffer);

    if (!result.success) {
      alert('Lỗi nhập Excel:\n' + result.errors.join('\n'));
      return;
    }

    if (result.students.length > 0) {
      // Băm mật khẩu ban đầu
      for (const st of result.students) {
        st.passwordHash = await DeviceSecurity.sha256(st.initialPassword || '123456');
      }
      await DB.saveStudentsBulk(result.students);
      alert(`Đã thêm thành công ${result.students.length} học sinh từ file Excel!`);
      if (window.AdminDashboard && window.AdminDashboard.currentTab === 'students') {
        window.AdminDashboard.switchTab('students');
      } else {
        window.App.renderApp();
      }
    }
  },

  async resetPassword(studentId) {
    if (!confirm('Đặt lại mật khẩu học sinh này về mặc định "123456"?')) return;
    const students = await DB.getStudents();
    const st = students.find(s => s.id === studentId);
    if (st) {
      st.passwordHash = await DeviceSecurity.sha256('123456');
      st.initialPassword = '123456';
      st.mustChangePassword = true;
      await DB.saveStudent(st);
      alert('Đã đặt lại mật khẩu thành công!');
      if (window.AdminDashboard && window.AdminDashboard.currentTab === 'students') {
        window.AdminDashboard.switchTab('students');
      } else {
        window.App.renderApp();
      }
    }
  },

  async toggleLock(studentId) {
    const students = await DB.getStudents();
    const st = students.find(s => s.id === studentId);
    if (st) {
      st.status = st.status === 'locked' ? 'active' : 'locked';
      await DB.saveStudent(st);
      if (window.AdminDashboard && window.AdminDashboard.currentTab === 'students') {
        window.AdminDashboard.switchTab('students');
      } else {
        window.App.renderApp();
      }
    }
  },

  async deleteStudent(studentId) {
    if (!confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi hệ thống?')) return;
    await DB.deleteStudent(studentId);
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'students') {
      window.AdminDashboard.switchTab('students');
    } else {
      window.App.renderApp();
    }
  }
};

window.StudentManagement = StudentManagement;
