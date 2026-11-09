// Azota Toán - Exam Assignment View (Giao bài cho lớp & Cài đặt thời gian)
const ExamAssign = {
  selectedExamId: null,

  async render(presetExamId) {
    const exams = await DB.getExams(null, 'admin');
    const students = await DB.getStudents();
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
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const openVal = toLocalISO(currentExam.openTime || new Date().toISOString());
    const dueVal = toLocalISO(currentExam.dueTime || new Date(Date.now() + 7 * 86400000).toISOString());
    const assignedClasses = currentExam.assignedClasses || [];

    return `
      <div class="max-w-4xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Giao Bài Kiểm Tra</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chọn lớp học sinh tham gia, đặt thời gian mở/đóng đề và quy tắc bảo mật
            </p>
          </div>

          <button
            onclick="window.ExamAssign.saveAssignment()"
            class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
          >
            <span>✓ Lưu & Giao Bài Ngay</span>
          </button>
        </div>

        <!-- Select Exam Dropdown -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Chọn đề kiểm tra cần giao:
          </label>
          <select
            onchange="window.ExamAssign.changeExam(this.value)"
            class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            ${exams.map(e => `
              <option value="${e.id}" ${e.id === currentExam.id ? 'selected' : ''}>
                ${e.title} (${e.questions?.length || 0} câu - ${e.durationMinutes} phút)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Target Classes -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              1. Đối Tượng Giao Bài (Chọn Lớp)
            </h3>
            <span class="text-xs text-slate-400">Chọn tất cả hoặc từng lớp</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${classes.map(c => {
              const isChecked = assignedClasses.includes(c);
              const count = students.filter(s => s.class === c).length;
              return `
                <label class="cursor-pointer p-3.5 rounded-2xl border transition flex items-center space-x-3 ${
                  isChecked
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }">
                  <input
                    type="checkbox"
                    name="assignedClassCheckbox"
                    value="${c}"
                    ${isChecked ? 'checked' : ''}
                    class="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div class="font-extrabold text-sm">Lớp ${c}</div>
                    <div class="text-[11px] text-slate-400">${count} học sinh</div>
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Scheduling & Time Settings -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            2. Thời Gian & Lượt Làm Bài
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Thời gian mở đề (Bắt đầu)</label>
              <input
                type="datetime-local"
                id="assignOpenTime"
                value="${openVal}"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn nộp bài (Kết thúc)</label>
              <input
                type="datetime-local"
                id="assignDueTime"
                value="${dueVal}"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Thời lượng làm bài (Phút)</label>
              <input
                type="number"
                id="assignDuration"
                value="${currentExam.durationMinutes || 45}"
                min="5"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Số lần được làm lại</label>
              <select
                id="assignAllowRetake"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none"
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
    window.App.renderApp();
  },

  async saveAssignment() {
    const exams = await DB.getExams(null, 'admin');
    const exam = exams.find(e => e.id === this.selectedExamId);
    if (!exam) return;

    // Lấy danh sách lớp được chọn
    const checked = Array.from(document.querySelectorAll('input[name="assignedClassCheckbox"]:checked'))
      .map(el => el.value);

    exam.assignedClasses = checked;
    exam.openTime = new Date(document.getElementById('assignOpenTime').value).toISOString();
    exam.dueTime = new Date(document.getElementById('assignDueTime').value).toISOString();
    exam.durationMinutes = parseInt(document.getElementById('assignDuration').value, 10) || 45;
    exam.allowRetake = parseInt(document.getElementById('assignAllowRetake').value, 10) || 1;
    exam.viewScoreMode = document.getElementById('assignViewScore').value;
    exam.viewAnswerMode = document.getElementById('assignViewAnswer').value;

    if (!exam.antiCheat) exam.antiCheat = {};
    exam.antiCheat.autoSubmitOnExcess = document.getElementById('assignAutoSubmitExcess').checked;
    exam.antiCheat.disableContextMenu = document.getElementById('assignDisableCopy').checked;
    exam.antiCheat.disableCopy = document.getElementById('assignDisableCopy').checked;

    await DB.saveExam(exam);
    alert(`Đã giao bài thành công cho ${checked.length > 0 ? checked.join(', ') : 'tất cả các lớp'}!`);
    window.App.navigateTo('admin-dashboard');
  }
};

window.ExamAssign = ExamAssign;
