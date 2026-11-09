// Azota Toán - Analytics & Reports View (Thống kê phổ điểm, Phân tích từng câu & Xuất Excel)
const Analytics = {
  selectedExamId: null,
  inspectingSubmission: null,

  async render(presetExamId) {
    const exams = await DB.getExams(null, 'admin');
    const students = await DB.getStudents();

    if (!this.selectedExamId && exams.length > 0) {
      this.selectedExamId = presetExamId || exams[0].id;
    } else if (presetExamId) {
      this.selectedExamId = presetExamId;
    }

    const currentExam = exams.find(e => e.id === this.selectedExamId) || exams[0];
    if (!currentExam) {
      return `<div class="p-8 text-center text-slate-500">Chưa có đề thi nào để thống kê.</div>`;
    }

    const submissions = await DB.getSubmissions(currentExam.id);
    const assignedClasses = currentExam.assignedClasses || [];
    
    // Danh sách học sinh thuộc diện thi đề này
    const targetStudents = assignedClasses.length > 0
      ? students.filter(s => assignedClasses.includes(s.class))
      : students;

    const subMap = {};
    submissions.forEach(s => { subMap[s.studentId] = s; });

    const submittedStudents = targetStudents.filter(s => Boolean(subMap[s.id]));
    const unsubmittedStudents = targetStudents.filter(s => !subMap[s.id]);

    // Tính toán KPI
    const scores = submittedStudents.map(s => subMap[s.id].score);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const lowScoreStudents = submittedStudents.filter(s => subMap[s.id].score < 5.0);

    // Tính phổ điểm
    const dist = {
      under5: scores.filter(sc => sc < 5.0).length,
      from5to65: scores.filter(sc => sc >= 5.0 && sc < 6.5).length,
      from65to8: scores.filter(sc => sc >= 6.5 && sc < 8.0).length,
      from8to10: scores.filter(sc => sc >= 8.0).length
    };
    const maxBarCount = Math.max(1, dist.under5, dist.from5to65, dist.from65to8, dist.from8to10);

    // Sắp xếp học sinh theo điểm giảm dần để xếp hạng
    const rankedStudents = [...submittedStudents].sort((a, b) => subMap[b.id].score - subMap[a.id].score);

    // Lưu cache dữ liệu để xuất Excel và sao chép an toàn
    this.cachedData = {
      currentExam,
      targetStudents,
      submissions,
      unsubmittedStudents
    };

    return `
      <div class="space-y-6">
        
        <!-- Header & Exam Selector -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Thống Kê & Báo Cáo Điểm</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phổ điểm, phân tích độ khó từng câu hỏi và danh sách học sinh cần hỗ trợ
            </p>
          </div>

          <div class="flex items-center flex-wrap gap-2">
            <button
              onclick="window.Analytics.exportScoreboard()"
              class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5"
            >
              <span>📊 Xuất Bảng Điểm Excel</span>
            </button>

            <button
              onclick="window.Analytics.exportQuestionAnalysis()"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center space-x-1.5"
            >
              <span>📑 Xuất Phân Tích Câu Hỏi</span>
            </button>

            <button
              onclick="window.print()"
              class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <span>🖨️ In / PDF</span>
            </button>
          </div>
        </div>

        <!-- Exam Filter Bar -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between gap-3">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
            Chọn bài kiểm tra:
          </label>
          <select
            onchange="window.Analytics.changeExam(this.value)"
            class="flex-1 max-w-lg px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            ${exams.map(e => `
              <option value="${e.id}" ${e.id === currentExam.id ? 'selected' : ''}>
                ${e.title} (${e.classGroup || 'Toán'})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Điểm trung bình</div>
            <div class="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
              ${avgScore}đ
            </div>
            <div class="text-[11px] text-slate-500 mt-1">Toàn bộ bài nộp</div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Cao nhất / Thấp nhất</div>
            <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              ${maxScore} <span class="text-sm font-normal text-slate-400">/ ${minScore}đ</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1">Khoảng điểm đạt được</div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Tỉ lệ hoàn thành</div>
            <div class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ${submittedStudents.length} / ${targetStudents.length}
            </div>
            <div class="text-[11px] text-slate-500 mt-1">
              ${targetStudents.length > 0 ? Math.round((submittedStudents.length / targetStudents.length) * 100) : 0}% đã nộp bài
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
            <div class="text-xs text-slate-400 font-medium">Cần hỗ trợ (&lt; 5.0)</div>
            <div class="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
              ${lowScoreStudents.length} HS
            </div>
            <div class="text-[11px] text-slate-500 mt-1">Học sinh dưới 5 điểm</div>
          </div>
        </div>

        <!-- Visual Score Distribution (Phổ Điểm Dạng Cột) -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Phổ Điểm Của Bài Thi (Biểu đồ phân bố)
            </h3>
            <span class="text-xs text-slate-400 font-medium">${submittedStudents.length} bài nộp</span>
          </div>

          <div class="pt-4 grid grid-cols-4 gap-4 items-end h-48 border-b border-slate-200 dark:border-slate-800 px-4">
            
            <!-- Cột Dưới 5 -->
            <div class="flex flex-col items-center justify-end h-full">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">${dist.under5} HS</span>
              <div
                class="w-full max-w-[64px] bg-rose-500 rounded-t-xl transition-all duration-500"
                style="height: ${(dist.under5 / maxBarCount) * 100}%"
              ></div>
            </div>

            <!-- Cột 5 - 6.5 -->
            <div class="flex flex-col items-center justify-end h-full">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">${dist.from5to65} HS</span>
              <div
                class="w-full max-w-[64px] bg-amber-500 rounded-t-xl transition-all duration-500"
                style="height: ${(dist.from5to65 / maxBarCount) * 100}%"
              ></div>
            </div>

            <!-- Cột 6.5 - 8 -->
            <div class="flex flex-col items-center justify-end h-full">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">${dist.from65to8} HS</span>
              <div
                class="w-full max-w-[64px] bg-blue-500 rounded-t-xl transition-all duration-500"
                style="height: ${(dist.from65to8 / maxBarCount) * 100}%"
              ></div>
            </div>

            <!-- Cột 8 - 10 -->
            <div class="flex flex-col items-center justify-end h-full">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">${dist.from8to10} HS</span>
              <div
                class="w-full max-w-[64px] bg-emerald-500 rounded-t-xl transition-all duration-500"
                style="height: ${(dist.from8to10 / maxBarCount) * 100}%"
              ></div>
            </div>

          </div>

          <!-- Nhãn Trục Hoành -->
          <div class="grid grid-cols-4 gap-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
            <div>&lt; 5.0 (Yếu)</div>
            <div>5.0 - 6.4 (TB)</div>
            <div>6.5 - 7.9 (Khá)</div>
            <div>8.0 - 10 (Giỏi)</div>
          </div>
        </div>

        <!-- Itemized Question Difficulty Analysis (Thống kê từng câu) -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Thống Kê Chi Tiết Từng Câu Hỏi
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Xác định câu nào học sinh làm sai nhiều và các phương án bẫy</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-3">Câu</th>
                  <th class="py-3 px-3">Phần</th>
                  <th class="py-3 px-4">Nội dung tóm tắt</th>
                  <th class="py-3 px-3 text-center">Tỉ lệ đúng</th>
                  <th class="py-3 px-3 text-center">Độ khó</th>
                  <th class="py-3 px-4">Phân bố lựa chọn</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${(currentExam.questions || []).map(q => {
                  let total = 0;
                  let correct = 0;
                  const distOpts = { A: 0, B: 0, C: 0, D: 0 };

                  submissions.forEach(sub => {
                    const r = sub.itemResults ? sub.itemResults[q.id] : null;
                    if (!r) return;
                    total++;
                    if (q.part === 1) {
                      if (r.isCorrect) correct++;
                      if (r.studentAnswer && distOpts[r.studentAnswer] !== undefined) distOpts[r.studentAnswer]++;
                    } else if (q.part === 2) {
                      if (r.isFullCorrect) correct++;
                    } else if (q.part === 3) {
                      if (r.isCorrect) correct++;
                    }
                  });

                  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                  let diffBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
                  let diffText = 'Vừa sức';
                  if (pct < 40) { diffBadge = 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'; diffText = 'Rất khó'; }
                  else if (pct < 60) { diffBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'; diffText = 'Khó'; }
                  else if (pct >= 85) { diffBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'; diffText = 'Dễ'; }

                  return `
                    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td class="py-3 px-3 font-bold text-slate-900 dark:text-white">Câu ${q.questionNumber}</td>
                      <td class="py-3 px-3 text-slate-500 font-semibold">Phần ${q.part}</td>
                      <td class="py-3 px-4 text-slate-800 dark:text-slate-200 max-w-[240px] truncate">
                        ${q.content.substring(0, 70).replace(/\$/g, '')}
                      </td>
                      <td class="py-3 px-3 text-center font-black ${pct >= 70 ? 'text-emerald-600' : (pct >= 40 ? 'text-blue-600' : 'text-red-500')}">
                        ${pct}% (${correct}/${total})
                      </td>
                      <td class="py-3 px-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${diffBadge}">
                          ${diffText}
                        </span>
                      </td>
                      <td class="py-3 px-4 font-mono text-[11px] text-slate-500">
                        ${q.part === 1 ? `A: <strong>${distOpts.A}</strong> | B: <strong>${distOpts.B}</strong> | C: <strong>${distOpts.C}</strong> | D: <strong>${distOpts.D}</strong>` : (q.part === 2 ? 'Đúng/Sai 4 ý' : 'Điền số')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Leaderboard & Student Scoreboard -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Bảng Điểm & Xếp Hạng Bài Làm (${submittedStudents.length} học sinh)
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-4 text-center">Hạng</th>
                  <th class="py-3 px-4">Họ và tên</th>
                  <th class="py-3 px-4">Lớp</th>
                  <th class="py-3 px-4 text-center">Điểm số</th>
                  <th class="py-3 px-4">Thời gian làm</th>
                  <th class="py-3 px-4 text-center">Rời tab</th>
                  <th class="py-3 px-4 text-right">Xem chi tiết</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${rankedStudents.map((st, idx) => {
                  const sub = subMap[st.id];
                  const durMin = Math.floor((sub.durationSeconds || 0) / 60);
                  const durSec = (sub.durationSeconds || 0) % 60;
                  const rankBadge = idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : `${idx + 1}`));

                  return `
                    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td class="py-3.5 px-4 text-center font-extrabold text-slate-700 dark:text-slate-300">${rankBadge}</td>
                      <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${st.name}</td>
                      <td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded font-bold text-xs bg-slate-100 dark:bg-slate-800">${st.class}</span></td>
                      <td class="py-3.5 px-4 text-center font-black text-sm ${sub.score >= 8 ? 'text-emerald-600' : (sub.score >= 5 ? 'text-blue-600' : 'text-red-500')}">
                        ${sub.score}đ
                      </td>
                      <td class="py-3.5 px-4 text-slate-500">${durMin}m ${durSec}s</td>
                      <td class="py-3.5 px-4 text-center">
                        ${sub.tabSwitches > 0
                          ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">${sub.tabSwitches} lần</span>`
                          : '<span class="text-slate-400">0</span>'}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <button
                          onclick="window.App.viewResult('${sub.id}')"
                          class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs transition"
                        >
                          Xem bài
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Unsubmitted Students List -->
        ${unsubmittedStudents.length > 0 ? `
          <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Học Sinh Chưa Làm Bài (${unsubmittedStudents.length} học sinh)
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Danh sách học sinh cần nhắc nhở vào thi trước hạn</p>
              </div>

              <button
                onclick="window.Analytics.copyReminderMessage()"
                class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center space-x-1"
              >
                <span>📋 Sao Chép Tin Nhắc Nhở</span>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              ${unsubmittedStudents.map(st => `
                <div class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <span class="font-bold text-slate-800 dark:text-slate-200 truncate">${st.name}</span>
                  <span class="text-[10px] text-slate-400 shrink-0">Lớp ${st.class}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  },

  changeExam(id) {
    this.selectedExamId = id;
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'analytics') {
      window.AdminDashboard.switchTab('analytics', id);
    } else {
      window.App.renderApp();
    }
  },

  exportScoreboard() {
    if (!this.cachedData || !this.cachedData.currentExam) {
      alert('Chưa có dữ liệu bài thi để xuất Excel!');
      return;
    }
    const { currentExam, targetStudents, submissions } = this.cachedData;
    ExcelHelper.exportScoreboard(currentExam.title, targetStudents, submissions);
  },

  exportQuestionAnalysis() {
    if (!this.cachedData || !this.cachedData.currentExam) {
      alert('Chưa có dữ liệu bài thi để xuất Excel!');
      return;
    }
    const { currentExam, submissions } = this.cachedData;
    ExcelHelper.exportQuestionAnalysis(currentExam.title, currentExam.questions || [], submissions);
  },

  copyReminderMessage() {
    if (!this.cachedData || !this.cachedData.currentExam) return;
    const { currentExam, unsubmittedStudents } = this.cachedData;
    if (!unsubmittedStudents || unsubmittedStudents.length === 0) {
      alert('Tất cả học sinh đều đã nộp bài!');
      return;
    }
    const names = unsubmittedStudents.map(s => `${s.name} (${s.class})`).join(', ');
    const msg = `📢 [NHẮC NHỞ LÀM BÀI]: Thầy/Cô nhắc các bạn học sinh sau chưa nộp bài kiểm tra "${currentExam.title}":\n${names}\nCác em hãy nhanh chóng đăng nhập để hoàn thành bài thi trước hạn nộp nhé!`;
    navigator.clipboard.writeText(msg);
    alert('Đã sao chép nội dung nhắc nhở vào bộ nhớ đệm!\nBạn có thể dán vào nhóm Zalo/Facebook lớp.');
  }
};

window.Analytics = Analytics;
