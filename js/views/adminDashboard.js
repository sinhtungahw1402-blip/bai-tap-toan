// Azota Toán - Admin Master Dashboard View (Bảng điều khiển trung tâm Quản trị viên)
const AdminDashboard = {
  currentTab: 'overview', // 'overview' | 'students' | 'exams' | 'assign' | 'analytics'

  async render(presetTab = null, param = null) {
    if (presetTab) this.currentTab = presetTab;

    const students = await DB.getStudents();
    const exams = await DB.getExams(null, 'admin');
    const submissions = await DB.getSubmissions();
    const adminConfig = await DB.getAdminConfig();

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        <!-- Admin Bar Header -->
        <div class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-500/15">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
                <span>🛡️ Thiết bị bảo mật duy nhất</span>
                <span>•</span>
                <span>${DB.isFirebaseActive ? '🟢 Đã kết nối Firebase Cloud' : '🟡 CSDL Cục Bộ (Đang hoạt động)'}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
                Không Gian Quản Trị Viên 👑
              </h1>
              <p class="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
                Quản lý ngân hàng đề thi toán, phân quyền lớp học sinh, theo dõi giám sát gian lận và xuất báo cáo thống kê.
              </p>
            </div>

            <!-- Firebase Connection & System Config Actions -->
            <div class="flex items-center flex-wrap gap-2">
              <button
                onclick="window.AdminDashboard.openPairPhoneModal()"
                class="px-3.5 py-2 rounded-xl bg-white/25 hover:bg-white/35 backdrop-blur-md text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm ring-1 ring-white/30"
                title="Ủy quyền và đồng bộ tài khoản quản trị sang điện thoại duy nhất của bạn"
              >
                <span>📱 Đồng Bộ Điện Thoại</span>
              </button>

              <button
                onclick="window.DB.exportDatabaseJson()"
                class="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
                title="Tải về file sao lưu CSDL (gồm toàn bộ học sinh và đề thi) để chuyển sang điện thoại"
              >
                <span>📥 Xuất CSDL (.json)</span>
              </button>

              <label
                class="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                title="Nhập file sao lưu CSDL từ máy khác vào thiết bị này"
              >
                <span>📤 Nhập CSDL</span>
                <input type="file" accept=".json" class="hidden" onchange="window.AdminDashboard.handleDatabaseImport(event)" />
              </label>

              <button
                onclick="window.AdminDashboard.openFirebaseModal()"
                class="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-xs transition flex items-center space-x-1.5"
              >
                <span>🔥 Cài Đặt Firebase</span>
              </button>

              <button
                onclick="window.AdminDashboard.resetSampleData()"
                class="px-3.5 py-2 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur-md text-white font-bold text-xs transition"
                title="Khôi phục lại dữ liệu bài mẫu và học sinh ban đầu"
              >
                ↺ Nạp Lại Dữ Liệu Mẫu
              </button>
            </div>
          </div>
        </div>

        <!-- Master Tabs Navigation -->
        <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          ${this._renderNavTab('overview', 'Tổng quan', '📊')}
          ${this._renderNavTab('students', `Học sinh & Lớp (${students.length})`, '👥')}
          ${this._renderNavTab('exams', `Ngân hàng Đề thi (${exams.length})`, '📝')}
          ${this._renderNavTab('assign', 'Giao bài', '📤')}
          ${this._renderNavTab('analytics', 'Thống kê & Báo cáo', '📈')}
        </div>

        <!-- Dynamic Tab Body -->
        <div id="adminTabContainer" class="pt-2">
          ${await this._renderActiveTabContent(this.currentTab, { students, exams, submissions, adminConfig, param })}
        </div>

      </div>

      <!-- Modal Cài Đặt Firebase Cloud Database -->
      <div id="firebaseConfigModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 class="font-black text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <span>🔥 Cấu Hình Firebase Cloud</span>
            </h3>
            <button onclick="document.getElementById('firebaseConfigModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400">
            Dán đoạn cấu hình <code>firebaseConfig</code> từ <strong>Firebase Console &gt; Project Settings</strong> vào đây để dữ liệu được đồng bộ trực tuyến trên mọi máy tính và điện thoại học sinh:
          </p>

          <textarea
            id="firebaseConfigInput"
            rows="7"
            placeholder='{
  "apiKey": "AIzaSy...",
  "authDomain": "azota-toan.firebaseapp.com",
  "projectId": "azota-toan",
  "storageBucket": "azota-toan.appspot.com",
  "messagingSenderId": "...",
  "appId": "..."
}'
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>

          <div class="flex justify-between items-center pt-2">
            <button
              type="button"
              onclick="window.AdminDashboard.clearFirebaseConfig()"
              class="text-xs text-red-500 hover:underline"
            >
              Xóa cấu hình (Dùng Local CSDL)
            </button>

            <div class="space-x-2">
              <button
                type="button"
                onclick="document.getElementById('firebaseConfigModal').classList.add('hidden')"
                class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onclick="window.AdminDashboard.saveFirebaseConfig()"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                Lưu & Kết Nối Cloud
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Ghép Nối & Đồng Bộ Điện Thoại Quản Trị Viên -->
      <div id="pairPhoneModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 class="font-black text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <span>📱 Ghép Nối Điện Thoại Quản Trị</span>
            </h3>
            <button onclick="document.getElementById('pairPhoneModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Hệ thống cho phép bạn sử dụng tài khoản Quản trị trên <strong>cả Máy tính này và 1 Điện thoại duy nhất của bạn</strong>. Bất kỳ máy lạ nào khác vẫn sẽ bị chặn.
          </p>

          <!-- QR Code Section -->
          <div class="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              📸 Mở Camera điện thoại quét mã QR bên dưới:
            </span>
            <div id="pairPhoneQrContainer" class="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 min-w-[200px] min-h-[200px] flex items-center justify-center">
              <span class="text-xs text-slate-400">Đang tạo mã QR...</span>
            </div>
            <span class="text-[11px] text-slate-400 mt-2 text-center">
              Sau khi quét, điện thoại sẽ tự động nhận quyền Quản trị và đồng bộ dữ liệu ngay lập tức.
            </span>
          </div>

          <!-- Link Share Section -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Hoặc gửi link sang điện thoại qua Zalo (Cloud của tôi):
            </label>
            <div class="flex space-x-2">
              <input
                id="pairPhoneLinkInput"
                type="text"
                readonly
                class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
              />
              <button
                type="button"
                onclick="window.AdminDashboard.copyPairLink()"
                class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shrink-0"
              >
                Sao Chép Link
              </button>
            </div>
          </div>

          <div class="pt-2 text-right">
            <button
              type="button"
              onclick="document.getElementById('pairPhoneModal').classList.add('hidden')"
              class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _renderNavTab(key, label, icon) {
    const isActive = this.currentTab === key;
    return `
      <button
        data-tab-key="${key}"
        onclick="window.AdminDashboard.switchTab('${key}')"
        class="admin-nav-tab whitespace-nowrap px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition ${
          isActive
            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80'
        }"
      >
        <span>${icon}</span>
        <span>${label}</span>
      </button>
    `;
  },

  async _renderActiveTabContent(tab, data) {
    if (tab === 'overview') {
      return this._renderOverviewTab(data);
    }
    if (tab === 'students') {
      return await StudentManagement.render();
    }
    if (tab === 'exams') {
      return await ExamEditor.render();
    }
    if (tab === 'assign') {
      return await ExamAssign.render(data.param);
    }
    if (tab === 'analytics') {
      return await Analytics.render(data.param);
    }
    return '';
  },

  _renderOverviewTab(data) {
    const { students, exams, submissions } = data;
    const scores = submissions.map(s => s.score);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
    const cheatViolations = submissions.filter(s => (s.tabSwitches || 0) > 0);

    return `
      <div class="space-y-6">
        
        <!-- 4 Stats Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Tổng số học sinh</div>
            <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">${students.length}</div>
            <div class="text-[11px] text-blue-600 font-bold mt-1">Đã cấp tài khoản</div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Số đề thi đã tạo</div>
            <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">${exams.length}</div>
            <div class="text-[11px] text-emerald-600 font-bold mt-1">Ngân hàng đề GDPT 2018</div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Lượt bài đã nộp</div>
            <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">${submissions.length}</div>
            <div class="text-[11px] text-slate-500 mt-1">Điểm TB: <strong>${avgScore}đ</strong></div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Cảnh báo rời tab</div>
            <div class="text-2xl sm:text-3xl font-black text-amber-500 mt-1">${cheatViolations.length}</div>
            <div class="text-[11px] text-slate-500 mt-1">Lượt bài có vi phạm</div>
          </div>
        </div>

        <!-- Recent Submissions Overview Table -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Bài Làm Gần Nhất
            </h3>
            <button onclick="window.AdminDashboard.switchTab('analytics')" class="text-xs font-bold text-blue-600 hover:underline">
              Xem toàn bộ thống kê →
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4">Học sinh</th>
                  <th class="py-3 px-4">Lớp</th>
                  <th class="py-3 px-4">Thời gian nộp</th>
                  <th class="py-3 px-4 text-center">Điểm số</th>
                  <th class="py-3 px-4 text-center">Rời tab</th>
                  <th class="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${submissions.slice(0, 5).map(sub => `
                  <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${sub.studentName}</td>
                    <td class="py-3.5 px-4 font-medium text-slate-500">${sub.studentClass}</td>
                    <td class="py-3.5 px-4 text-slate-500">${new Date(sub.submittedAt).toLocaleString('vi-VN')}</td>
                    <td class="py-3.5 px-4 text-center font-black ${sub.score >= 8 ? 'text-emerald-600' : (sub.score >= 5 ? 'text-blue-600' : 'text-red-500')}">
                      ${sub.score}đ
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      ${sub.tabSwitches > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">${sub.tabSwitches} lần</span>` : '<span class="text-slate-400">0</span>'}
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <button onclick="window.App.viewResult('${sub.id}')" class="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition">
                        Xem bài
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  async switchTab(tab, param = null) {
    this.currentTab = tab;
    const container = document.getElementById('adminTabContainer');

    if (container) {
      // 1. Cập nhật màu sắc cho các nút tab ngay lập tức
      const buttons = document.querySelectorAll('.admin-nav-tab');
      buttons.forEach(btn => {
        const key = btn.getAttribute('data-tab-key');
        if (key === tab) {
          btn.className = 'admin-nav-tab whitespace-nowrap px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition bg-amber-500 text-white shadow-md shadow-amber-500/20';
        } else {
          btn.className = 'admin-nav-tab whitespace-nowrap px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80';
        }
      });

      // 2. Tải và hiển thị nội dung tab tương ứng
      const students = await DB.getStudents();
      const exams = await DB.getExams(null, 'admin');
      const submissions = await DB.getSubmissions();
      const adminConfig = await DB.getAdminConfig();

      container.innerHTML = await this._renderActiveTabContent(tab, { students, exams, submissions, adminConfig, param });

      // 3. Render công thức Toán nếu có
      if (typeof MathRenderer !== 'undefined') {
        MathRenderer.renderElement(container);
      }
    } else {
      window.App.renderApp(param);
    }
  },

  openFirebaseModal() {
    const existing = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG) || '';
    document.getElementById('firebaseConfigInput').value = existing;
    document.getElementById('firebaseConfigModal').classList.remove('hidden');
  },

  saveFirebaseConfig() {
    let raw = document.getElementById('firebaseConfigInput').value.trim();
    if (!raw) {
      alert('Vui lòng nhập cấu hình Firebase!');
      return;
    }

    // Nếu người dùng dán cả thẻ <script> hoặc "const firebaseConfig = { ... };"
    if (raw.includes('{') && raw.includes('}')) {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      raw = raw.substring(start, end + 1);
    }

    let parsedConfig = null;
    try {
      parsedConfig = JSON.parse(raw);
    } catch (e) {
      // Tự động phân tích dạng JavaScript Object không có dấu ngoặc kép chuẩn JSON
      try {
        const extractVal = (key) => {
          const match = raw.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`));
          return match ? match[1] : '';
        };

        parsedConfig = {
          apiKey: extractVal('apiKey'),
          authDomain: extractVal('authDomain'),
          projectId: extractVal('projectId'),
          storageBucket: extractVal('storageBucket'),
          messagingSenderId: extractVal('messagingSenderId'),
          appId: extractVal('appId')
        };

        if (!parsedConfig.apiKey || !parsedConfig.projectId) {
          throw new Error('Thiếu apiKey hoặc projectId');
        }
      } catch (err2) {
        alert('Không thể nhận diện cấu hình Firebase. Vui lòng sao chép toàn bộ đoạn mã firebaseConfig từ Firebase Console!');
        return;
      }
    }

    if (!parsedConfig.apiKey || !parsedConfig.projectId) {
      alert('Cấu hình Firebase không hợp lệ (phải có apiKey và projectId)!');
      return;
    }

    const cleanJson = JSON.stringify(parsedConfig, null, 2);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG, cleanJson);
    alert('🎉 ĐÃ LƯU CẤU HÌNH FIREBASE!\n\nHệ thống sẽ tải lại để kết nối với CSDL Đám Mây Cloud.');
    location.reload();
  },

  clearFirebaseConfig() {
    if (confirm('Xác nhận xóa cấu hình Firebase và chuyển về CSDL cục bộ?')) {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG);
      location.reload();
    }
  },

  async openPairPhoneModal() {
    const adminConfig = await DB.getAdminConfig();
    if (!adminConfig) {
      alert('Chưa khởi tạo tài khoản quản trị!');
      return;
    }

    const firebaseConfigStr = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FIREBASE_CONFIG) || '';

    // Tạo gói xác thực ủy quyền thiết bị siêu gọn (dưới 250 ký tự để mã QR hiển thị ngay lập tức)
    const payload = {
      action: 'PAIR_PHONE',
      adminPasswordHash: adminConfig.adminPasswordHash,
      registeredDeviceHash: adminConfig.registeredDeviceHash,
      timestamp: Date.now()
    };

    if (firebaseConfigStr && firebaseConfigStr.length < 500) {
      payload.firebaseConfig = firebaseConfigStr;
    }

    const jsonStr = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const pairUrl = `${window.location.origin}${window.location.pathname}#pair=${encoded}`;

    const qrContainer = document.getElementById('pairPhoneQrContainer');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: pairUrl,
          width: 180,
          height: 180,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pairUrl)}" alt="Mã QR Ghép Nối Điện Thoại" class="w-44 h-44 object-contain" />`;
      }
    }

    const input = document.getElementById('pairPhoneLinkInput');
    if (input) {
      input.value = pairUrl;
    }

    document.getElementById('pairPhoneModal').classList.remove('hidden');
  },

  copyPairLink() {
    const input = document.getElementById('pairPhoneLinkInput');
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value);
      alert('Đã sao chép link đồng bộ vào bộ nhớ đệm!\n\nThầy/Cô hãy gửi link này qua Zalo (Cloud của tôi) và mở trên điện thoại để hoàn tất đồng bộ.');
    }
  },

  async handleDatabaseImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm(`Xác nhận nạp tệp CSDL "${file.name}" vào thiết bị này? Dữ liệu hiện tại sẽ được cập nhật đồng bộ.`)) {
      event.target.value = '';
      return;
    }

    const res = await DB.importDatabaseJson(file);
    if (!res.success) {
      alert('Lỗi nạp dữ liệu: ' + res.error);
    } else {
      alert(`🎉 ĐỒNG BỘ DỮ LIỆU THÀNH CÔNG!\n\nĐã nạp ${res.studentCount} học sinh và ${res.examCount} đề thi vào thiết bị này.`);
      location.reload();
    }
  },

  resetSampleData() {
    if (confirm('Bạn có chắc chắn muốn nạp lại dữ liệu mẫu (1 bài kiểm tra chuẩn 3 phần + 3 học sinh mẫu)? Dữ liệu hiện tại sẽ được thay thế.')) {
      DB.resetToSampleData();
      alert('Đã khôi phục dữ liệu mẫu thành công!');
      location.reload();
    }
  }
};

window.AdminDashboard = AdminDashboard;
