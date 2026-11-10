// Azota Toán - Exam Editor & Question Authoring View (Soạn đề trực tiếp & Nhập Excel hàng loạt)
const ExamEditor = {
  currentExam: null,
  activeTab: 'list', // 'list' | 'edit'
  excelErrors: [],
  editingQuestionIndex: -1,

  async render() {
    const exams = await DB.getExams(null, 'admin');

    if (this.activeTab === 'edit' && this.currentExam) {
      return this._renderEditExamScreen();
    }

    return `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Quản Lý & Soạn Đề Thi</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hỗ trợ 3 phần trắc nghiệm chuẩn GDPT 2018, công thức KaTeX và nhập Excel hàng loạt
            </p>
          </div>

          <div class="flex items-center space-x-2">
            <button
              onclick="window.ExcelHelper.downloadExamTemplate()"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center space-x-1.5"
            >
              <span>📥 Tải File Mẫu Excel</span>
            </button>

            <button
              onclick="window.ExamEditor.createNewExam()"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <span>+ Tạo Đề Thi Mới</span>
            </button>
          </div>
        </div>

        <!-- Exams List Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${exams.map(exam => {
            const qCount = exam.questions ? exam.questions.length : 0;
            const p1 = (exam.questions || []).filter(q => q.part === 1).length;
            const p2 = (exam.questions || []).filter(q => q.part === 2).length;
            const p3 = (exam.questions || []).filter(q => q.part === 3).length;

            return `
              <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      ${exam.classGroup || 'Toán học'}
                    </span>
                    <span class="text-xs text-slate-400 font-medium">
                      ⏱️ ${exam.durationMinutes} phút
                    </span>
                  </div>

                  <h3 class="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2 mb-3">
                    ${exam.title}
                  </h3>

                  <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1.5 mb-4">
                    <div class="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Tổng số câu:</span>
                      <strong class="font-bold text-slate-900 dark:text-white">${qCount} câu</strong>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-500">
                      <span>Phần I (4 lựa chọn):</span>
                      <span>${p1} câu</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-500">
                      <span>Phần II (Đúng/Sai):</span>
                      <span>${p2} câu</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-500">
                      <span>Phần III (Điền số):</span>
                      <span>${p3} câu</span>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onclick="window.ExamEditor.editExam('${exam.id}')"
                    class="py-2 px-2 text-center rounded-xl font-bold text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition"
                  >
                    ✏️ Soạn bài
                  </button>
                  <button
                    onclick="window.App.navigateTo('exam-assign', '${exam.id}')"
                    class="py-2 px-2 text-center rounded-xl font-bold text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition"
                  >
                    📤 Giao bài
                  </button>
                  <button
                    onclick="window.ExamEditor.deleteExam('${exam.id}')"
                    class="py-2 px-2 text-center rounded-xl font-bold text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  },

  _renderEditExamScreen() {
    const exam = this.currentExam;
    const questions = exam.questions || [];
    const p1Questions = questions.filter(q => q.part === 1);
    const p2Questions = questions.filter(q => q.part === 2);
    const p3Questions = questions.filter(q => q.part === 3);

    const part1Pt = exam.partPoints?.part1 !== undefined ? exam.partPoints.part1 : 0.25;
    const part2Pt = exam.partPoints?.part2 !== undefined ? exam.partPoints.part2 : 1.0;
    const part3Pt = exam.partPoints?.part3 !== undefined ? exam.partPoints.part3 : 0.5;

    const totalCalculated = (p1Questions.length * part1Pt) + (p2Questions.length * part2Pt) + (p3Questions.length * part3Pt);

    return `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <button
              onclick="window.ExamEditor.closeEditor()"
              class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
            >
              ← Quay lại
            </button>
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">
                ${exam.id.startsWith('new_') ? 'Tạo Đề Thi Mới' : 'Chỉnh Sửa Đề Thi'}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật thông số đề và soạn câu hỏi trực tiếp hoặc nhập từ Excel
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <label class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center space-x-1.5">
              <span>📤 Nhập Câu Hỏi Từ Excel</span>
              <input type="file" accept=".xlsx, .xls" class="hidden" onchange="window.ExamEditor.handleExcelImport(event)" />
            </label>

            <button
              onclick="window.ExamEditor.saveCurrentExam()"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <span>💾 Lưu Đề Thi</span>
            </button>
          </div>
        </div>

        <!-- Excel Errors Warning (if any) -->
        ${this.excelErrors.length > 0 ? `
          <div class="p-4 rounded-3xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-xs space-y-2">
            <div class="flex items-center justify-between font-bold">
              <span>⚠️ Phát hiện ${this.excelErrors.length} lỗi trong file Excel vừa tải lên:</span>
              <button onclick="window.ExamEditor.clearExcelErrors()" class="font-bold">✕ Đóng</button>
            </div>
            <ul class="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto font-mono text-[11px]">
              ${this.excelErrors.map(err => `<li>${err}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Exam Configuration Settings Card -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            1. Cấu Hình Chung Của Đề Thi
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên bài kiểm tra</label>
              <input
                type="text"
                id="editExamTitle"
                value="${exam.title}"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Khối lớp / Chủ đề</label>
              <input
                type="text"
                id="editExamClassGroup"
                value="${exam.classGroup || 'Khối 12'}"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Thời gian (Phút)</label>
              <input
                type="number"
                id="editExamDuration"
                value="${exam.durationMinutes || 45}"
                min="5"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Thang điểm</label>
              <input
                type="number"
                id="editExamScale"
                value="${exam.scale || 10}"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trộn câu hỏi</label>
              <select id="editExamShuffleQ" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none">
                <option value="true" ${exam.shuffleQuestions ? 'selected' : ''}>Bật (Trộn thứ tự)</option>
                <option value="false" ${!exam.shuffleQuestions ? 'selected' : ''}>Tắt (Giữ nguyên)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trộn đáp án</label>
              <select id="editExamShuffleC" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none">
                <option value="true" ${exam.shuffleChoices ? 'selected' : ''}>Bật</option>
                <option value="false" ${!exam.shuffleChoices ? 'selected' : ''}>Tắt</option>
              </select>
            </div>
          </div>

          <!-- Anti-Cheat & Display Options -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Xem điểm thi</label>
              <select id="editViewScoreMode" class="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                <option value="immediate" ${exam.viewScoreMode === 'immediate' ? 'selected' : ''}>Xem ngay sau khi nộp</option>
                <option value="after_due" ${exam.viewScoreMode === 'after_due' ? 'selected' : ''}>Chỉ xem sau khi hết hạn nộp</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Xem đáp án & Lời giải</label>
              <select id="editViewAnswerMode" class="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none">
                <option value="immediate" ${exam.viewAnswerMode === 'immediate' ? 'selected' : ''}>Xem ngay sau khi nộp</option>
                <option value="after_due" ${exam.viewAnswerMode === 'after_due' ? 'selected' : ''}>Chỉ xem sau khi hết hạn nộp</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số lần rời tab tối đa</label>
              <input
                type="number"
                id="editMaxTabSwitches"
                value="${exam.antiCheat?.maxTabSwitches || 3}"
                class="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Part Points Settings Card (Quy định điểm từng phần tùy ý người ra đề) -->
        <div class="bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-slate-50 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/40 rounded-3xl border border-blue-200/80 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="font-black text-sm text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center space-x-2">
                <span>🎯 2. Quy Định Điểm Từng Phần (Tuỳ Ý Người Ra Đề)</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cài đặt số điểm cho mỗi câu của từng phần. Bấm nút áp dụng để tự động cập nhật cho toàn bộ câu hỏi trong đề.
              </p>
            </div>

            <button
              type="button"
              onclick="window.ExamEditor.applyPartPointsToAllQuestions()"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center space-x-1.5 shrink-0"
              title="Cập nhật điểm cho tất cả câu hỏi trong bài"
            >
              <span>⚡ Áp Dụng Cho Tất Cả Câu Hỏi</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Phần I -->
            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Phần I: 4 Lựa chọn
                </span>
                <span class="text-xs text-slate-400 font-bold">${p1Questions.length} câu</span>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Điểm mỗi câu:</label>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    id="partPoints_1"
                    value="${part1Pt}"
                    oninput="window.ExamEditor.updatePartPointsPreview()"
                    class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="text-xs font-bold text-slate-500">điểm</span>
                </div>
              </div>
              <p class="text-[10px] text-slate-400 leading-tight">Mặc định: 0.25đ / câu. Đúng nhận đủ điểm, sai nhận 0đ.</p>
            </div>

            <!-- Phần II -->
            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 space-y-2 shadow-sm">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Phần II: Đúng / Sai (4 ý)
                </span>
                <span class="text-xs text-slate-400 font-bold">${p2Questions.length} câu</span>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Điểm tối đa mỗi câu:</label>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    id="partPoints_2"
                    value="${part2Pt}"
                    oninput="window.ExamEditor.updatePartPointsPreview()"
                    class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="text-xs font-bold text-slate-500">điểm</span>
                </div>
              </div>
              <div class="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 text-[10px] text-amber-900 dark:text-amber-200 space-y-1 font-medium">
                <div class="font-bold text-amber-800 dark:text-amber-300 mb-0.5">Quy tắc chấm Đúng/Sai 4 ý:</div>
                <div class="flex justify-between"><span>• Đúng 1 ý:</span><strong id="p2_sample_1">${(part2Pt * 0.1).toFixed(2)}đ (10%)</strong></div>
                <div class="flex justify-between"><span>• Đúng 2 ý:</span><strong id="p2_sample_2">${(part2Pt * 0.25).toFixed(2)}đ (25%)</strong></div>
                <div class="flex justify-between"><span>• Đúng 3 ý:</span><strong id="p2_sample_3">${(part2Pt * 0.5).toFixed(2)}đ (50%)</strong></div>
                <div class="flex justify-between"><span>• Đúng 4 ý:</span><strong id="p2_sample_4">${part2Pt}đ (100%)</strong></div>
                <div class="flex justify-between text-red-500 font-bold"><span>• Chưa chọn / Sai hết:</span><span>0 điểm</span></div>
              </div>
            </div>

            <!-- Phần III -->
            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Phần III: Điền số
                </span>
                <span class="text-xs text-slate-400 font-bold">${p3Questions.length} câu</span>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Điểm mỗi câu:</label>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    id="partPoints_3"
                    value="${part3Pt}"
                    oninput="window.ExamEditor.updatePartPointsPreview()"
                    class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="text-xs font-bold text-slate-500">điểm</span>
                </div>
              </div>
              <p class="text-[10px] text-slate-400 leading-tight">Mặc định: 0.5đ / câu. Đúng nhận đủ điểm, sai nhận 0đ.</p>
            </div>
          </div>

          <!-- Total Points Summary Bar -->
          <div id="partPointsSummaryBar" class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 gap-2">
            <div class="flex items-center space-x-3">
              <span>Phần I: <strong>${(p1Questions.length * part1Pt).toFixed(2)}đ</strong></span>
              <span>•</span>
              <span>Phần II: <strong>${(p2Questions.length * part2Pt).toFixed(2)}đ</strong></span>
              <span>•</span>
              <span>Phần III: <strong>${(p3Questions.length * part3Pt).toFixed(2)}đ</strong></span>
            </div>
            <div class="text-blue-600 dark:text-blue-400 font-black text-sm">
              Tổng điểm đề: <span>${totalCalculated.toFixed(2)}đ</span>
            </div>
          </div>
        </div>

        <!-- Question List Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                3. Danh Sách Câu Hỏi (${questions.length} câu)
              </h3>
              <p class="text-xs text-slate-400">Bạn có thể thêm từng câu hoặc nhập hàng loạt từ Excel ở trên</p>
            </div>

            <button
              onclick="window.ExamEditor.openQuestionEditor(-1)"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1"
            >
              <span>+ Thêm Câu Hỏi Mới</span>
            </button>
          </div>

          <!-- Questions Cards List -->
          <div class="space-y-3">
            ${questions.map((q, idx) => `
              <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex items-start justify-between gap-4">
                <div class="space-y-1.5 flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-black bg-blue-600 text-white">
                      Câu ${idx + 1}
                    </span>
                    <span class="text-xs font-bold text-slate-500">
                      ${q.part === 1 ? 'Phần I (4 lựa chọn)' : q.part === 2 ? 'Phần II (Đúng/Sai)' : 'Phần III (Điền số)'}
                    </span>
                    <span class="text-xs text-slate-400">
                      • ${q.points || (q.part === 1 ? 0.25 : (q.part === 2 ? 1.0 : 0.5))} điểm
                    </span>
                  </div>

                  <div class="text-sm font-medium text-slate-800 dark:text-slate-200 py-1 leading-relaxed overflow-visible">
                    ${MathRenderer.renderToString(q.content)}
                  </div>
                </div>

                <div class="flex items-center space-x-1 shrink-0">
                  <button
                    onclick="window.ExamEditor.openQuestionEditor(${idx})"
                    class="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold text-xs"
                    title="Chỉnh sửa câu hỏi"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onclick="window.ExamEditor.deleteQuestion(${idx})"
                    class="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 font-bold text-xs"
                    title="Xóa câu hỏi"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Modal Soạn Thảo Câu Hỏi Trực Tiếp Với Xem Trước LaTeX -->
      <div id="questionEditorModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 id="questionModalTitle" class="font-black text-base text-slate-900 dark:text-white">
              Soạn Câu Hỏi
            </h3>
            <button onclick="document.getElementById('questionEditorModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <!-- Select Part -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Dạng câu hỏi</label>
            <select
              id="modalQPart"
              onchange="window.ExamEditor.handlePartChange(this.value)"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none"
            >
              <option value="1">Phần I: Trắc nghiệm 4 lựa chọn (A, B, C, D)</option>
              <option value="2">Phần II: Trắc nghiệm Đúng / Sai (4 ý a, b, c, d)</option>
              <option value="3">Phần III: Trả lời ngắn (Điền số)</option>
            </select>
          </div>

          <!-- Question Content & Math Helper Bar -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Nội dung câu hỏi (hỗ trợ LaTeX $...$)
              </label>
              <span class="text-[11px] text-slate-400">Bấm biểu tượng để chèn nhanh</span>
            </div>

            <!-- KaTeX Quick Toolbar -->
            <div class="flex items-center space-x-1 overflow-x-auto pb-1.5 scrollbar-none mb-1.5">
              ${MathRenderer.MATH_TOOLBAR.map(item => `
                <button
                  type="button"
                  onclick="window.ExamEditor.insertMathSymbol('${item.tex}')"
                  class="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 transition"
                  title="${item.title}"
                >
                  ${item.label}
                </button>
              `).join('')}
            </div>

            <textarea
              id="modalQContent"
              rows="3"
              oninput="window.ExamEditor.updateLiveMathPreview()"
              placeholder="ví dụ: Cho hàm số $y = \\frac{2x - 1}{x + 3}$. Tiệm cận ngang là:"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            ></textarea>

            <!-- Live LaTeX Preview Box -->
            <div class="mt-2 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 overflow-visible">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">👁️ Xem trước hiển thị công thức:</span>
              <div id="modalQLivePreview" class="text-sm font-medium text-slate-800 dark:text-slate-200 min-h-[24px] py-1 leading-relaxed overflow-visible"></div>
            </div>
          </div>

          <!-- Dynamic Answers Container based on Part -->
          <div id="modalQAnswersContainer"></div>

          <!-- Explanation with LaTeX -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Hướng dẫn giải chi tiết (LaTeX)
            </label>
            <textarea
              id="modalQExplanation"
              rows="2"
              placeholder="Giải thích các bước tìm đáp án..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            ></textarea>
          </div>

          <!-- Points -->
          <div class="w-40">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm của câu này</label>
            <input
              type="number"
              step="0.05"
              id="modalQPoints"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onclick="document.getElementById('questionEditorModal').classList.add('hidden')"
              class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onclick="window.ExamEditor.saveQuestionFromModal()"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
            >
              Lưu Câu Hỏi
            </button>
          </div>

        </div>
      </div>
    `;
  },

  createNewExam() {
    this.currentExam = {
      id: `new_${Date.now()}`,
      title: 'Đề Kiểm Tra Toán Mới',
      classGroup: 'Khối 12',
      durationMinutes: 45,
      scale: 10,
      shuffleQuestions: true,
      shuffleChoices: true,
      viewScoreMode: 'immediate',
      viewAnswerMode: 'immediate',
      allowRetake: 1,
      antiCheat: { maxTabSwitches: 3, autoSubmitOnExcess: true, disableContextMenu: true, disableCopy: true },
      questions: []
    };
    this.activeTab = 'edit';
    this.excelErrors = [];
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  async editExam(examId) {
    this.currentExam = await DB.getExamById(examId, 'admin');
    this.activeTab = 'edit';
    this.excelErrors = [];
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  closeEditor() {
    this.activeTab = 'list';
    this.currentExam = null;
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  async saveCurrentExam() {
    if (!this.currentExam) return;

    this.currentExam.title = document.getElementById('editExamTitle').value.trim();
    this.currentExam.classGroup = document.getElementById('editExamClassGroup').value.trim();
    this.currentExam.durationMinutes = parseInt(document.getElementById('editExamDuration').value, 10) || 45;
    this.currentExam.scale = parseFloat(document.getElementById('editExamScale').value) || 10;
    this.currentExam.shuffleQuestions = document.getElementById('editExamShuffleQ').value === 'true';
    this.currentExam.shuffleChoices = document.getElementById('editExamShuffleC').value === 'true';
    this.currentExam.viewScoreMode = document.getElementById('editViewScoreMode').value;
    this.currentExam.viewAnswerMode = document.getElementById('editViewAnswerMode').value;
    
    // Lưu cấu hình điểm từng phần
    const p1 = parseFloat(document.getElementById('partPoints_1')?.value) || 0.25;
    const p2 = parseFloat(document.getElementById('partPoints_2')?.value) || 1.0;
    const p3 = parseFloat(document.getElementById('partPoints_3')?.value) || 0.5;
    this.currentExam.partPoints = { part1: p1, part2: p2, part3: p3 };

    if (!this.currentExam.antiCheat) this.currentExam.antiCheat = {};
    this.currentExam.antiCheat.maxTabSwitches = parseInt(document.getElementById('editMaxTabSwitches').value, 10) || 3;

    if (this.currentExam.id.startsWith('new_')) {
      this.currentExam.id = `exam_${Date.now()}`;
    }

    await DB.saveExam(this.currentExam);
    alert('Đã lưu đề thi thành công!');
    this.closeEditor();
  },

  applyPartPointsToAllQuestions() {
    if (!this.currentExam) return;
    const p1 = parseFloat(document.getElementById('partPoints_1')?.value) || 0.25;
    const p2 = parseFloat(document.getElementById('partPoints_2')?.value) || 1.0;
    const p3 = parseFloat(document.getElementById('partPoints_3')?.value) || 0.5;

    this.currentExam.partPoints = { part1: p1, part2: p2, part3: p3 };

    let count = 0;
    (this.currentExam.questions || []).forEach(q => {
      if (q.part === 1) { q.points = p1; count++; }
      else if (q.part === 2) { q.points = p2; count++; }
      else if (q.part === 3) { q.points = p3; count++; }
    });

    alert(`Đã cập nhật lại điểm thành công cho toàn bộ ${count} câu hỏi:\n- Phần I: ${p1}đ / câu\n- Phần II: ${p2}đ / câu (theo quy tắc 1 ý: 10%, 2 ý: 25%, 3 ý: 50%, 4 ý: 100%)\n- Phần III: ${p3}đ / câu`);
    window.App.renderApp();
  },

  updatePartPointsPreview() {
    if (!this.currentExam) return;
    const p1 = parseFloat(document.getElementById('partPoints_1')?.value) || 0;
    const p2 = parseFloat(document.getElementById('partPoints_2')?.value) || 0;
    const p3 = parseFloat(document.getElementById('partPoints_3')?.value) || 0;

    const p1Count = (this.currentExam.questions || []).filter(q => q.part === 1).length;
    const p2Count = (this.currentExam.questions || []).filter(q => q.part === 2).length;
    const p3Count = (this.currentExam.questions || []).filter(q => q.part === 3).length;

    const total = (p1Count * p1) + (p2Count * p2) + (p3Count * p3);

    const s1 = document.getElementById('p2_sample_1');
    if (s1) s1.textContent = `${(p2 * 0.1).toFixed(2)}đ (10%)`;
    const s2 = document.getElementById('p2_sample_2');
    if (s2) s2.textContent = `${(p2 * 0.25).toFixed(2)}đ (25%)`;
    const s3 = document.getElementById('p2_sample_3');
    if (s3) s3.textContent = `${(p2 * 0.5).toFixed(2)}đ (50%)`;
    const s4 = document.getElementById('p2_sample_4');
    if (s4) s4.textContent = `${p2}đ (100%)`;

    const bar = document.getElementById('partPointsSummaryBar');
    if (bar) {
      bar.innerHTML = `
        <div class="flex items-center space-x-3">
          <span>Phần I: <strong>${(p1Count * p1).toFixed(2)}đ</strong></span>
          <span>•</span>
          <span>Phần II: <strong>${(p2Count * p2).toFixed(2)}đ</strong></span>
          <span>•</span>
          <span>Phần III: <strong>${(p3Count * p3).toFixed(2)}đ</strong></span>
        </div>
        <div class="text-blue-600 dark:text-blue-400 font-black text-sm">
          Tổng điểm đề: <span>${total.toFixed(2)}đ</span>
        </div>
      `;
    }
  },

  async deleteExam(examId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này? Tất cả bài làm của học sinh thuộc đề này cũng sẽ bị xóa.')) return;
    await DB.deleteExam(examId);
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  // Import câu hỏi từ file Excel
  async handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const result = ExcelHelper.parseExamExcel(buffer);

    if (!result.success) {
      this.excelErrors = result.errors;
      alert(`Phát hiện ${result.errors.length} lỗi khi đọc file! Vui lòng kiểm tra thông báo màu đỏ bên dưới.`);
      if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
        window.AdminDashboard.switchTab('exams');
      } else {
        window.App.renderApp();
      }
      return;
    }

    this.excelErrors = [];
    this.currentExam.questions = result.questions;
    alert(`Đã nhập thành công ${result.questions.length} câu hỏi từ file Excel!`);
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  clearExcelErrors() {
    this.excelErrors = [];
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  // Question Modal Operations
  openQuestionEditor(index) {
    this.editingQuestionIndex = index;
    const modal = document.getElementById('questionEditorModal');
    modal.classList.remove('hidden');

    const p1Default = this.currentExam?.partPoints?.part1 !== undefined ? this.currentExam.partPoints.part1 : 0.25;
    const p2Default = this.currentExam?.partPoints?.part2 !== undefined ? this.currentExam.partPoints.part2 : 1.0;
    const p3Default = this.currentExam?.partPoints?.part3 !== undefined ? this.currentExam.partPoints.part3 : 0.5;

    let q = null;
    if (index >= 0) {
      q = this.currentExam.questions[index];
      document.getElementById('questionModalTitle').textContent = `Chỉnh Sửa Câu ${index + 1}`;
    } else {
      q = {
        part: 1,
        content: '',
        options: [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }],
        correctAnswer: 'A',
        explanation: '',
        points: p1Default
      };
      document.getElementById('questionModalTitle').textContent = `Thêm Câu Hỏi Mới`;
    }

    document.getElementById('modalQPart').value = q.part;
    document.getElementById('modalQContent').value = q.content || '';
    document.getElementById('modalQExplanation').value = q.explanation || '';
    document.getElementById('modalQPoints').value = q.points !== undefined && q.points !== null ? q.points : (q.part === 1 ? p1Default : (q.part === 2 ? p2Default : p3Default));

    this.handlePartChange(q.part, q);
    this.updateLiveMathPreview();
  },

  handlePartChange(partVal, existingQ = null) {
    const part = parseInt(partVal, 10);
    const container = document.getElementById('modalQAnswersContainer');

    const p1Default = this.currentExam?.partPoints?.part1 !== undefined ? this.currentExam.partPoints.part1 : 0.25;
    const p2Default = this.currentExam?.partPoints?.part2 !== undefined ? this.currentExam.partPoints.part2 : 1.0;
    const p3Default = this.currentExam?.partPoints?.part3 !== undefined ? this.currentExam.partPoints.part3 : 0.5;

    const ptInput = document.getElementById('modalQPoints');
    if (ptInput && !existingQ) {
      if (part === 1) ptInput.value = p1Default;
      else if (part === 2) ptInput.value = p2Default;
      else if (part === 3) ptInput.value = p3Default;
    }

    if (part === 1) {
      const opts = existingQ?.options || [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }];
      const correct = existingQ?.correctAnswer || 'A';

      container.innerHTML = `
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">4 Đáp án & Chọn đáp án đúng:</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${['A', 'B', 'C', 'D'].map((letter, i) => `
              <div class="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <input type="radio" name="modalPart1Correct" value="${letter}" ${correct === letter ? 'checked' : ''} class="w-4 h-4 text-blue-600" />
                <span class="font-bold text-xs text-slate-700 dark:text-slate-300">${letter}:</span>
                <input type="text" id="modalOpt_${letter}" value="${opts[i]?.text || ''}" placeholder="Nội dung đáp án (LaTeX)" class="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none" />
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (part === 2) {
      const subs = existingQ?.subItems || [
        { id: 'a', text: '', correct: true },
        { id: 'b', text: '', correct: true },
        { id: 'c', text: '', correct: false },
        { id: 'd', text: '', correct: true }
      ];

      container.innerHTML = `
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">4 Ý Đúng/Sai (a, b, c, d):</label>
          <div class="space-y-1.5">
            ${['a', 'b', 'c', 'd'].map((letter, i) => `
              <div class="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <span class="font-bold text-xs text-indigo-600 w-5">${letter})</span>
                <input type="text" id="modalSub_${letter}" value="${subs[i]?.text || ''}" placeholder="Khẳng định..." class="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none" />
                <select id="modalSubAns_${letter}" class="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1">
                  <option value="true" ${subs[i]?.correct === true ? 'selected' : ''}>Đúng</option>
                  <option value="false" ${subs[i]?.correct === false ? 'selected' : ''}>Sai</option>
                </select>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (part === 3) {
      const accepted = existingQ?.acceptedAnswers ? existingQ.acceptedAnswers.join('; ') : '';
      const tolerance = existingQ?.tolerance !== undefined ? existingQ.tolerance : 0.01;

      container.innerHTML = `
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Đáp án số & Sai số:</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="sm:col-span-2">
              <input type="text" id="modalAcceptedAns" value="${accepted}" placeholder="ví dụ: 6; 6.0; 6,0 (ngăn cách dấu ;)" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none" />
            </div>
            <div>
              <input type="number" step="0.001" id="modalTolerance" value="${tolerance}" placeholder="Sai số (0.01)" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none" />
            </div>
          </div>
        </div>
      `;
    }
  },

  insertMathSymbol(tex) {
    const textarea = document.getElementById('modalQContent');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    textarea.value = current.substring(0, start) + `$${tex}$` + current.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tex.length + 2;
    this.updateLiveMathPreview();
  },

  updateLiveMathPreview() {
    const text = document.getElementById('modalQContent')?.value || '';
    const previewEl = document.getElementById('modalQLivePreview');
    if (previewEl) {
      previewEl.innerHTML = MathRenderer.renderToString(text) || '<span class="text-slate-400 italic">Nhập nội dung ở trên để xem trước công thức</span>';
    }
  },

  saveQuestionFromModal() {
    const part = parseInt(document.getElementById('modalQPart').value, 10);
    const content = document.getElementById('modalQContent').value.trim();
    const explanation = document.getElementById('modalQExplanation').value.trim();
    const points = parseFloat(document.getElementById('modalQPoints').value) || (part === 1 ? 0.25 : (part === 2 ? 1.0 : 0.5));

    if (!content) {
      alert('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    const questionObj = {
      id: this.editingQuestionIndex >= 0 ? this.currentExam.questions[this.editingQuestionIndex].id : `q_${Date.now()}`,
      part,
      questionNumber: this.editingQuestionIndex >= 0 ? this.editingQuestionIndex + 1 : this.currentExam.questions.length + 1,
      content,
      explanation,
      points
    };

    if (part === 1) {
      questionObj.options = ['A', 'B', 'C', 'D'].map(l => ({
        id: l,
        text: document.getElementById(`modalOpt_${l}`)?.value.trim() || ''
      }));
      const checked = document.querySelector('input[name="modalPart1Correct"]:checked');
      questionObj.correctAnswer = checked ? checked.value : 'A';
    } else if (part === 2) {
      questionObj.subItems = ['a', 'b', 'c', 'd'].map(l => ({
        id: l,
        text: document.getElementById(`modalSub_${l}`)?.value.trim() || '',
        correct: document.getElementById(`modalSubAns_${l}`)?.value === 'true'
      }));
    } else if (part === 3) {
      const rawAns = document.getElementById('modalAcceptedAns')?.value || '';
      questionObj.acceptedAnswers = rawAns.split(';').map(s => s.trim()).filter(Boolean);
      questionObj.tolerance = parseFloat(document.getElementById('modalTolerance')?.value) || 0.01;
    }

    if (this.editingQuestionIndex >= 0) {
      this.currentExam.questions[this.editingQuestionIndex] = questionObj;
    } else {
      this.currentExam.questions.push(questionObj);
    }

    document.getElementById('questionEditorModal').classList.add('hidden');
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  },

  deleteQuestion(index) {
    if (!confirm('Xóa câu hỏi này?')) return;
    this.currentExam.questions.splice(index, 1);
    if (window.AdminDashboard && window.AdminDashboard.currentTab === 'exams') {
      window.AdminDashboard.switchTab('exams');
    } else {
      window.App.renderApp();
    }
  }
};

window.ExamEditor = ExamEditor;
