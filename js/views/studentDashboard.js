// Azota Toán - Student Dashboard View
const StudentDashboard = {
  activeTab: 'active', // 'active' | 'due_soon' | 'completed' | 'expired' | 'history'

  async render(student) {
    const exams = await DB.getExams(student.class, 'student');
    const submissions = await DB.getSubmissions(null, student.id);
    const subMap = {};
    submissions.forEach(s => {
      if (!subMap[s.examId] || new Date(s.submittedAt) > new Date(subMap[s.examId].submittedAt)) {
        subMap[s.examId] = s;
      }
    });

    const now = new Date();

    // Phân loại danh sách đề
    const activeExams = [];
    const dueSoonExams = [];
    const completedExams = [];
    const expiredExams = [];

    exams.forEach(exam => {
      const openDate = exam.openTime ? new Date(exam.openTime) : null;
      const dueDate = exam.dueTime ? new Date(exam.dueTime) : null;
      const hasSub = subMap[exam.id];

      // Đã nộp
      if (hasSub) {
        completedExams.push({ exam, submission: hasSub });
      }

      const isExpired = dueDate && now > dueDate;
      const isNotYetOpen = openDate && now < openDate;

      if (isExpired) {
        if (!hasSub) expiredExams.push({ exam });
      } else if (!isNotYetOpen) {
        // Đang mở
        const hoursLeft = dueDate ? (dueDate - now) / (1000 * 60 * 60) : 999;
        if (hoursLeft <= 24 && hoursLeft > 0) {
          dueSoonExams.push({ exam, submission: hasSub, hoursLeft: Math.round(hoursLeft) });
        }
        if (!hasSub || (exam.allowRetake && exam.allowRetake > 1)) {
          activeExams.push({ exam, submission: hasSub });
        }
      }
    });

    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <!-- Welcome Hero Banner -->
        <div class="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/15 mb-8">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
                <span>🎓 Lớp: ${student.class || 'Khối 12'}</span>
                <span>•</span>
                <span>Học sinh: ${student.name}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
                Chào em, ${student.name}! 👋
              </h1>
              <p class="text-blue-100 text-sm mt-1 max-w-xl">
                Hãy xem kỹ thời gian làm bài, chuẩn bị nháp và giữ đường truyền ổn định trước khi bấm vào phòng thi nhé.
              </p>
            </div>

            <!-- Stats Quick Counters -->
            <div class="flex items-center gap-3">
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center min-w-[90px]">
                <div class="text-2xl font-black">${activeExams.length}</div>
                <div class="text-[11px] text-blue-100 font-medium">Đang mở</div>
              </div>
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center min-w-[90px]">
                <div class="text-2xl font-black">${completedExams.length}</div>
                <div class="text-[11px] text-blue-100 font-medium">Đã hoàn thành</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs Filter Header -->
        <div class="flex items-center space-x-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          ${this._renderTabBtn('active', `Đang mở (${activeExams.length})`, '⚡')}
          ${this._renderTabBtn('due_soon', `Sắp đến hạn (${dueSoonExams.length})`, '⏳')}
          ${this._renderTabBtn('completed', `Đã làm (${completedExams.length})`, '✅')}
          ${this._renderTabBtn('expired', `Quá hạn (${expiredExams.length})`, '⌛')}
          ${this._renderTabBtn('history', `Bảng điểm cá nhân`, '📊')}
        </div>

        <!-- Tab Contents -->
        <div id="studentTabContent">
          ${this._renderTabContent(this.activeTab, { activeExams, dueSoonExams, completedExams, expiredExams, submissions, exams, student })}
        </div>

      </div>
    `;
  },

  _renderTabBtn(tabKey, label, icon) {
    const isActive = this.activeTab === tabKey;
    return `
      <button
        onclick="window.StudentDashboard.switchTab('${tabKey}')"
        class="whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition ${
          isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80'
        }"
      >
        <span>${icon}</span>
        <span>${label}</span>
      </button>
    `;
  },

  _renderTabContent(tab, data) {
    if (tab === 'active') {
      if (data.activeExams.length === 0) {
        return this._renderEmptyState('Hiện tại không có bài kiểm tra nào đang mở cho lớp của em.');
      }
      return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${data.activeExams.map(item => this._renderExamCard(item.exam, item.submission, 'active')).join('')}
      </div>`;
    }

    if (tab === 'due_soon') {
      if (data.dueSoonExams.length === 0) {
        return this._renderEmptyState('Không có bài kiểm tra nào sắp hết hạn trong 24 giờ tới.');
      }
      return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${data.dueSoonExams.map(item => this._renderExamCard(item.exam, item.submission, 'due_soon', item.hoursLeft)).join('')}
      </div>`;
    }

    if (tab === 'completed') {
      if (data.completedExams.length === 0) {
        return this._renderEmptyState('Em chưa hoàn thành bài kiểm tra nào.');
      }
      return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${data.completedExams.map(item => this._renderExamCard(item.exam, item.submission, 'completed')).join('')}
      </div>`;
    }

    if (tab === 'expired') {
      if (data.expiredExams.length === 0) {
        return this._renderEmptyState('Tuyệt vời! Em không bỏ lỡ bài kiểm tra nào.');
      }
      return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${data.expiredExams.map(item => this._renderExamCard(item.exam, null, 'expired')).join('')}
      </div>`;
    }

    if (tab === 'history') {
      return this._renderHistoryView(data.submissions, data.exams);
    }
  },

  _renderExamCard(exam, submission, status, hoursLeft) {
    const qCount = exam.questions ? exam.questions.length : 0;
    const p1Count = (exam.questions || []).filter(q => q.part === 1).length;
    const p2Count = (exam.questions || []).filter(q => q.part === 2).length;
    const p3Count = (exam.questions || []).filter(q => q.part === 3).length;

    const dueDateStr = exam.dueTime ? new Date(exam.dueTime).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    }) : 'Không giới hạn';

    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div>
          <!-- Badges Bar -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
              ${exam.classGroup || 'Toán học'}
            </span>

            ${submission ? `
              <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                ⭐ ${submission.score} / ${exam.scale || 10}đ
              </span>
            ` : (status === 'due_soon' ? `
              <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 animate-pulse">
                ⏳ Còn ${hoursLeft}h
              </span>
            ` : (status === 'expired' ? `
              <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                Đã quá hạn
              </span>
            ` : `
              <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                Đang mở
              </span>
            `))}
          </div>

          <!-- Exam Title -->
          <h3 class="text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-2 leading-snug">
            ${exam.title}
          </h3>

          <!-- Details Pills -->
          <div class="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
            <div class="flex items-center space-x-1.5">
              <span>⏱️ Thời gian: <strong class="text-slate-700 dark:text-slate-200">${exam.durationMinutes} phút</strong></span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span>📝 Số lượng: <strong class="text-slate-700 dark:text-slate-200">${qCount} câu</strong> (${p1Count} TN, ${p2Count} Đ/S, ${p3Count} Tự luận)</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span>📅 Hạn nộp: <span class="text-slate-700 dark:text-slate-300 font-medium">${dueDateStr}</span></span>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60">
          ${submission ? `
            <div class="grid grid-cols-2 gap-2">
              <button
                onclick="window.App.viewResult('${submission.id}')"
                class="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs transition"
              >
                Xem chi tiết & Lời giải
              </button>
              ${exam.allowRetake > 1 ? `
                <button
                  onclick="window.App.startExam('${exam.id}')"
                  class="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                >
                  Làm lại bài
                </button>
              ` : `
                <button disabled class="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold text-xs cursor-not-allowed">
                  Đã hoàn thành
                </button>
              `}
            </div>
          ` : (status === 'expired' ? `
            <button disabled class="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 font-bold text-xs cursor-not-allowed">
              Không thể vào thi (Hết hạn)
            </button>
          ` : `
            <button
              onclick="window.App.startExam('${exam.id}')"
              class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition flex items-center justify-center space-x-1.5"
            >
              <span>Vào Làm Bài Thi</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          `)}
        </div>
      </div>
    `;
  },

  _renderHistoryView(submissions, exams) {
    if (submissions.length === 0) {
      return this._renderEmptyState('Chưa có lịch sử làm bài nào.');
    }

    const examMap = {};
    exams.forEach(e => { examMap[e.id] = e; });

    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
        <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
          <h3 class="font-extrabold text-slate-900 dark:text-white text-base">
            Bảng Lịch Sử & Điểm Số Cá Nhân
          </h3>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng cộng ${submissions.length} bài đã nộp</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th class="py-3 px-4">Bài thi</th>
                <th class="py-3 px-4">Thời gian nộp</th>
                <th class="py-3 px-4">Thời lượng</th>
                <th class="py-3 px-4 text-center">Điểm số</th>
                <th class="py-3 px-4 text-center">Rời tab</th>
                <th class="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
              ${submissions.map(sub => {
                const ex = examMap[sub.examId] || { title: 'Bài kiểm tra' };
                const durMin = Math.floor((sub.durationSeconds || 0) / 60);
                const durSec = (sub.durationSeconds || 0) % 60;
                return `
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">${ex.title}</td>
                    <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">${new Date(sub.submittedAt).toLocaleString('vi-VN')}</td>
                    <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">${durMin}m ${durSec}s</td>
                    <td class="py-3.5 px-4 text-center font-black text-sm ${sub.score >= 8 ? 'text-emerald-600 dark:text-emerald-400' : (sub.score >= 5 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500')}">
                      ${sub.score}đ
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      ${sub.tabSwitches > 0 ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">${sub.tabSwitches} lần</span>` : `<span class="text-slate-400">0</span>`}
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <button onclick="window.App.viewResult('${sub.id}')" class="px-3 py-1.5 rounded-lg font-bold text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition">
                        Xem bài làm
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _renderEmptyState(message) {
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-12 text-center">
        <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 text-2xl">
          📖
        </div>
        <h4 class="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Chưa có bài kiểm tra nào</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">${message}</p>
      </div>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    window.App.renderApp();
  }
};

window.StudentDashboard = StudentDashboard;
