// Azota Toán - Exam Assignment View (Giao bài cho lớp & Cài đặt thời gian)
const ExamAssign = {
  selectedExamId: null,

  async render(presetExamId = null, presetExams = null, presetStudents = null) {
    const exams = presetExams || await DB.getExams(null, 'admin');
    const students = presetStudents || await DB.getStudents();
    const classes = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

    if (!this.selectedExamId && exams.length > 0) {
      this.selectedExamId = presetExamId || exams[0].id;
    } else if (presetExamId) {
      this.selectedExamId = presetExamId;
    }

    const currentExam = exams.find(e => e.id === this.selectedExamId) || exams[0];
    if (!currentExam) {
      return `<div class="p-8 text-center text-slate-500">Chưa có đề thi nào để giao. Vui lòng tạo đề trước.</div>`;
    }

    // Định dạng ngày giờ cho input datetime-local
    const toLocalISO = (dStr) => {
      if (!dStr) return '';
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const openVal = toLocalISO(currentExam.openTime || new Date().toISOString());
    const dueVal = toLocalISO(currentExam.dueTime || new Date(Date.now() + 2 * 86400000).toISOString());
    const assignedClasses = currentExam.assignedClasses || [];

    return `
      <div class="max-w-4xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Giao Bài Kiểm Tra</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phân quyền lớp học sinh, hẹn giờ mở đề, đặt hạn nộp và cài đặt thời lượng làm bài
            </p>
          </div>

          <button
            onclick="window.ExamAssign.saveAssignment()"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-95 transition flex items-center space-x-1.5"
          >
            <span>✓ Lưu & Giao Bài Ngay</span>
          </button>
        </div>

        <!-- Guiding Policy Box -->
        <div class="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div class="font-extrabold text-blue-900 dark:text-blue-200 flex items-center space-x-2 text-sm">
            <span>💡 Quy Tắc Giao Bài & Tính Giờ Chuẩn:</span>
          </div>
          <ul class="list-disc list-inside space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            <li><strong>Khoảng thời gian mở đề (ví dụ 2 ngày):</strong> Thầy có thể giao mở trong 2 ngày hoặc tùy ý. Học sinh có thể vào làm bài bất kỳ lúc nào trong khoảng thời gian đó.</li>
            <li><strong>Thời điểm bắt đầu:</strong> Khi chưa tới thời gian mở đề, học sinh chưa thể vào thi (nút làm bài bị khóa và thông báo rõ thời gian mở).</li>
            <li><strong>Thời lượng làm bài riêng (ví dụ 30 hoặc 45 phút):</strong> Khi học sinh bấm <em>"Vào làm bài thi ngay"</em>, đồng hồ đếm ngược riêng của em đó mới bắt đầu chạy. Đúng thời gian quy định (hoặc khi chạm mốc hạn nộp), hệ thống sẽ <strong>cưỡng chế dừng làm và tự động nộp bài</strong>.</li>
            <li><strong>Phân quyền lớp nghiêm ngặt:</strong> Chỉ những lớp được thầy tick chọn bên dưới mới thấy và làm được đề thi. Học sinh lớp khác hoàn toàn không thể làm bài của lớp này.</li>
          </ul>
        </div>

        <!-- Select Exam Dropdown -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Đề kiểm tra đang chọn giao:
          </label>
          <select
            onchange="window.ExamAssign.changeExam(this.value)"
            class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            ${exams.map(e => `
              <option value="${e.id}" ${e.id === currentExam.id ? 'selected' : ''}>
                ${e.title} (${e.questions?.length || 0} câu - ${e.durationMinutes} phút) - ${e.classGroup || 'Toán học'}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Target Classes -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                1. Đối Tượng Giao Bài (Chỉ định lớp)
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chỉ học sinh thuộc các lớp được tick chọn mới thấy và làm bài. Lớp khác bị chặn hoàn toàn.
              </p>
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                type="button"
                onclick="window.ExamAssign.selectAllClasses(true)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
              >
                ✓ Chọn tất cả
              </button>
              <button
                type="button"
                onclick="window.ExamAssign.selectAllClasses(false)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition"
              >
                ✕ Bỏ chọn
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${classes.map(c => {
              const isChecked = assignedClasses.includes(c);
              const count = students.filter(s => s.class === c).length;
              return `
                <label class="cursor-pointer p-3.5 rounded-2xl border transition flex items-center space-x-3 select-none ${
                  isChecked
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }">
                  <input
                    type="checkbox"
                    name="assignedClassCheckbox"
                    value="${c}"
                    ${isChecked ? 'checked' : ''}
                    class="w-4 h-4 text-blue-600 rounded"
                    onchange="this.parentElement.className = this.checked ? 'cursor-pointer p-3.5 rounded-2xl border transition flex items-center space-x-3 select-none border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm' : 'cursor-pointer p-3.5 rounded-2xl border transition flex items-center space-x-3 select-none border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'"
                  />
                  <div>
                    <div class="font-extrabold text-sm">${c}</div>
                    <div class="text-[11px] text-slate-400">${count} học sinh</div>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Scheduling & Time Settings -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                2. Thời Gian Mở Đề & Thời Lượng Làm Bài
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bấm nút chọn nhanh hoặc tự điều chỉnh ngày giờ theo ý muốn
              </p>
            </div>

            <!-- Quick Preset Buttons -->
            <div class="flex items-center flex-wrap gap-1.5">
              <span class="text-xs font-bold text-slate-400 mr-1">⚡ Chọn nhanh:</span>
              <button
                type="button"
                onclick="window.ExamAssign.setPresetDays(2)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                title="Mở ngay từ hôm nay, làm bất kỳ lúc nào trong 2 ngày tới"
              >
                ⏱️ Mở 2 ngày
              </button>
              <button
                type="button"
                onclick="window.ExamAssign.setPresetDays(3)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
              >
                ⏱️ Mở 3 ngày
              </button>
              <button
                type="button"
                onclick="window.ExamAssign.setPresetDays(7)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                ⏱️ 1 tuần
              </button>
              <button
                type="button"
                onclick="window.ExamAssign.setPresetTomorrow(2)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
                title="Hẹn giờ bắt đầu từ 08:00 sáng mai, mở trong 2 ngày"
              >
                ⏰ Mở sáng mai (2 ngày)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thời gian mở đề (Bắt đầu)
              </label>
              <input
                type="datetime-local"
                id="assignOpenTime"
                value="${openVal}"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-[11px] text-slate-400 mt-1">Học sinh chưa thể làm bài trước thời điểm này.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hạn chót nộp bài (Kết thúc)
              </label>
              <input
                type="datetime-local"
                id="assignDueTime"
                value="${dueVal}"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-[11px] text-slate-400 mt-1">Đến thời điểm này, đề sẽ đóng và cưỡng chế thu bài.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thời lượng làm bài riêng của học sinh (Phút)
              </label>
              <input
                type="number"
                id="assignDuration"
                value="${currentExam.durationMinutes || 45}"
                min="5"
                max="180"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-[11px] text-slate-400 mt-1">Kể từ lúc học sinh bấm vào thi, đồng hồ sẽ đếm ngược đúng số phút này.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Số lần được làm lại</label>
              <select
                id="assignAllowRetake"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1" ${currentExam.allowRetake === 1 ? 'selected' : ''}>Chỉ làm 1 lần duy nhất</option>
                <option value="2" ${currentExam.allowRetake === 2 ? 'selected' : ''}>Tối đa 2 lần</option>
                <option value="3" ${currentExam.allowRetake === 3 ? 'selected' : ''}>Tối đa 3 lần</option>
                <option value="-1" ${currentExam.allowRetake === -1 ? 'selected' : ''}>Không giới hạn (Luyện tập tự do)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Viewing & Security Policies -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            3. Cài Đặt Điểm Số, Đáp Án & Giám Sát Gian Lận
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Hiển thị điểm số cho học sinh</label>
              <select id="assignViewScore" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                <option value="immediate" ${currentExam.viewScoreMode === 'immediate' ? 'selected' : ''}>Hiển thị điểm ngay sau khi nộp</option>
                <option value="after_due" ${currentExam.viewScoreMode === 'after_due' ? 'selected' : ''}>Chỉ hiển thị điểm sau khi hết hạn nộp bài</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Hiển thị đáp án & hướng dẫn giải</label>
              <select id="assignViewAnswer" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                <option value="immediate" ${currentExam.viewAnswerMode === 'immediate' ? 'selected' : ''}>Xem đáp án & lời giải ngay sau khi nộp</option>
                <option value="after_due" ${currentExam.viewAnswerMode === 'after_due' ? 'selected' : ''}>Khóa lời giải, chỉ mở sau hạn nộp bài</option>
              </select>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <label class="flex items-center space-x-2.5 cursor-pointer">
              <input type="checkbox" id="assignAutoSubmitExcess" checked class="w-4 h-4 text-blue-600 rounded" />
              <span class="font-bold text-slate-700 dark:text-slate-300">Tự động thu bài khi học sinh rời tab quá số lần cho phép</span>
            </label>
            <label class="flex items-center space-x-2.5 cursor-pointer">
              <input type="checkbox" id="assignDisableCopy" checked class="w-4 h-4 text-blue-600 rounded" />
              <span class="font-bold text-slate-700 dark:text-slate-300">Khóa chuột phải, cấm sao chép câu hỏi trong khi thi</span>
            </label>
          </div>
        </div>

      </div>
    `;
  },

  changeExam(id) {
    this.selectedExamId = id;
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'assign') {
      window.AdminDashboard.switchTab('assign', id);
    } else {
      window.App.renderApp();
    }
  },

  selectAllClasses(selectAll) {
    const checkboxes = document.querySelectorAll('input[name="assignedClassCheckbox"]');
    checkboxes.forEach(cb => {
      cb.checked = selectAll;
      const parent = cb.parentElement;
      if (parent) {
        parent.className = selectAll
          ? 'cursor-pointer p-3.5 rounded-2xl border transition flex items-center space-x-3 select-none border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
          : 'cursor-pointer p-3.5 rounded-2xl border transition flex items-center space-x-3 select-none border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
      }
    });
  },

  setPresetDays(days) {
    const toLocalISO = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const start = new Date();
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const openInput = document.getElementById('assignOpenTime');
    const dueInput = document.getElementById('assignDueTime');
    if (openInput) openInput.value = toLocalISO(start);
    if (dueInput) dueInput.value = toLocalISO(end);
  },

  setPresetTomorrow(days) {
    const toLocalISO = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(8, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + days);
    end.setHours(22, 0, 0, 0);

    const openInput = document.getElementById('assignOpenTime');
    const dueInput = document.getElementById('assignDueTime');
    if (openInput) openInput.value = toLocalISO(start);
    if (dueInput) dueInput.value = toLocalISO(end);
  },

  async saveAssignment() {
    const exams = await DB.getExams(null, 'admin');
    const exam = exams.find(e => e.id === this.selectedExamId);
    if (!exam) return;

    // Lấy danh sách lớp được chọn
    const checked = Array.from(document.querySelectorAll('input[name="assignedClassCheckbox"]:checked'))
      .map(el => el.value);

    if (checked.length === 0) {
      alert('⚠️ Vui lòng tick chọn ít nhất một lớp học sinh để giao bài!');
      return;
    }

    const openTimeVal = document.getElementById('assignOpenTime').value;
    const dueTimeVal = document.getElementById('assignDueTime').value;

    if (!openTimeVal || !dueTimeVal) {
      alert('⚠️ Vui lòng nhập đầy đủ thời gian mở đề và hạn nộp bài!');
      return;
    }

    const openTime = new Date(openTimeVal);
    const dueTime = new Date(dueTimeVal);

    if (dueTime <= openTime) {
      alert('⚠️ Hạn nộp bài phải sau thời gian mở đề!');
      return;
    }

    exam.assignedClasses = checked;
    exam.openTime = openTime.toISOString();
    exam.dueTime = dueTime.toISOString();
    exam.durationMinutes = parseInt(document.getElementById('assignDuration').value, 10) || 45;
    exam.allowRetake = parseInt(document.getElementById('assignAllowRetake').value, 10) || 1;
    exam.viewScoreMode = document.getElementById('assignViewScore').value;
    exam.viewAnswerMode = document.getElementById('assignViewAnswer').value;

    if (!exam.antiCheat) exam.antiCheat = {};
    exam.antiCheat.autoSubmitOnExcess = document.getElementById('assignAutoSubmitExcess').checked;
    exam.antiCheat.disableContextMenu = document.getElementById('assignDisableCopy').checked;
    exam.antiCheat.disableCopy = document.getElementById('assignDisableCopy').checked;

    await DB.saveExam(exam);

    const openStr = openTime.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    const dueStr = dueTime.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    alert(`🎉 ĐÃ GIAO BÀI THÀNH CÔNG!\n\n• Đề thi: ${exam.title}\n• Lớp nhận bài: ${checked.join(', ')}\n• Thời lượng làm: ${exam.durationMinutes} phút\n• Mở đề lúc: ${openStr}\n• Hạn nộp lúc: ${dueStr}\n\nChỉ học sinh các lớp trên mới có thể làm bài. Hệ thống sẽ tự động thu bài khi hết giờ.`);

    if (window.AdminDashboard) {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.navigateTo('admin-dashboard');
    }
  }
};

window.ExamAssign = ExamAssign;
