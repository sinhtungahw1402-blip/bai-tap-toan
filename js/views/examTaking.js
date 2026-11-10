// Azota Toán - Exam Taking View (Giao diện làm bài thi trực tuyến)
const ExamTaking = {
  exam: null,
  student: null,
  shuffledQuestions: [],
  currentIndex: 0,
  answers: {}, // { qId: answerValue }
  flaggedQuestions: {}, // { qId: boolean }
  startedAt: null,
  timerInterval: null,
  remainingSeconds: 0,
  tabSwitches: 0,
  tabSwitchLogs: [],
  isSubmitting: false,

  // Khởi động phòng thi
  async init(examId, student) {
    this.student = student || { id: 'hs_demo', name: 'Học sinh', class: '12A1' };
    this.exam = await DB.getExamById(examId, 'student');
    this.currentIndex = 0;
    this.isSubmitting = false;

    if (!this.exam) {
      alert('Không tìm thấy đề thi!');
      window.App.navigateTo('student-dashboard');
      return;
    }

    // 1. Khôi phục bài làm từ LocalStorage (nếu rớt mạng hoặc tải lại trang)
    const storageKey = `azota_exam_session_${this.exam.id}_${this.student.id}`;
    const savedSession = localStorage.getItem(storageKey);

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        this.answers = parsed.answers || {};
        this.flaggedQuestions = parsed.flaggedQuestions || {};
        this.startedAt = parsed.startedAt || new Date().toISOString();
        this.tabSwitches = parsed.tabSwitches || 0;
        this.tabSwitchLogs = parsed.tabSwitchLogs || [];
      } catch (e) {
        this._initNewSession();
      }
    } else {
      this._initNewSession();
    }

    // 2. Trộn câu hỏi và trộn đáp án (nếu đề bật) dựa trên hạt giống học sinh
    this._prepareQuestions();

    // 3. Tính toán thời gian còn lại
    const totalDurationSeconds = (this.exam.durationMinutes || 45) * 60;
    const elapsedSeconds = Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000);
    this.remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    // 4. Kích hoạt chống gian lận
    this._setupAntiCheat();

    // 5. Khởi động đồng hồ đếm ngược
    this._startTimer();

    window.App.renderApp();
  },

  _initNewSession() {
    this.answers = {};
    this.flaggedQuestions = {};
    this.startedAt = new Date().toISOString();
    this.tabSwitches = 0;
    this.tabSwitchLogs = [];
    this._saveProgress();
  },

  _prepareQuestions() {
    const rawQuestions = JSON.parse(JSON.stringify(this.exam.questions || []));

    if (this.exam.shuffleQuestions) {
      // Xáo trộn giả ngẫu nhiên có hạt giống là student.id để nhất quán khi reload
      const seedStr = `${this.student.id}_${this.exam.id}`;
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) hash = (hash << 5) - hash + seedStr.charCodeAt(i);

      rawQuestions.sort((a, b) => {
        const hA = (hash * (a.questionNumber || 1)) % 100;
        const hB = (hash * (b.questionNumber || 1)) % 100;
        return hA - hB;
      });
    }

    this.shuffledQuestions = rawQuestions;
  },

  _saveProgress() {
    const storageKey = `azota_exam_session_${this.exam.id}_${this.student.id}`;
    const sessionData = {
      answers: this.answers,
      flaggedQuestions: this.flaggedQuestions,
      startedAt: this.startedAt,
      tabSwitches: this.tabSwitches,
      tabSwitchLogs: this.tabSwitchLogs
    };
    localStorage.setItem(storageKey, JSON.stringify(sessionData));

    const statusEl = document.getElementById('saveStatusIndicator');
    if (statusEl) {
      const timeStr = new Date().toLocaleTimeString('vi-VN');
      statusEl.innerHTML = `🟢 Đã lưu tự động lúc ${timeStr}`;
    }
  },

  _startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;

      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.submitExam(true); // Tự động nộp bài khi hết giờ
        return;
      }

      this._updateTimerDisplay();
    }, 1000);
  },

  _updateTimerDisplay() {
    const timerEl = document.getElementById('examCountdownTimer');
    if (!timerEl) return;

    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    timerEl.textContent = formatted;

    if (this.remainingSeconds <= 60) {
      timerEl.className = 'text-base font-black text-red-600 dark:text-red-400 animate-pulse';
    } else if (this.remainingSeconds <= 300) {
      timerEl.className = 'text-base font-black text-amber-500';
    } else {
      timerEl.className = 'text-base font-black text-blue-600 dark:text-blue-400';
    }
  },

  _setupAntiCheat() {
    const anti = this.exam.antiCheat || {};

    // 1. Chống copy & chuột phải
    if (anti.disableContextMenu) {
      document.addEventListener('contextmenu', this._preventContextMenu);
    }
    if (anti.disableCopy) {
      document.addEventListener('copy', this._preventCopy);
      document.addEventListener('cut', this._preventCopy);
    }

    // 2. Bắt sự kiện chuyển tab / ẩn màn hình (chính xác, không bị false positive khi mở bàn phím điện thoại)
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
  },

  _cleanupAntiCheat() {
    document.removeEventListener('contextmenu', this._preventContextMenu);
    document.removeEventListener('copy', this._preventCopy);
    document.removeEventListener('cut', this._preventCopy);
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  _preventContextMenu(e) { e.preventDefault(); },
  _preventCopy(e) { e.preventDefault(); },

  _handleVisibilityChange() {
    if (document.hidden && !ExamTaking.isSubmitting) {
      ExamTaking._recordCheatIncident('Chuyển sang ứng dụng hoặc tab khác');
    }
  },

  _handleWindowBlur() {
    if (!ExamTaking.isSubmitting) {
      ExamTaking._recordCheatIncident('Rời khỏi cửa sổ bài thi');
    }
  },

  _recordCheatIncident(reason) {
    this.tabSwitches++;
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const logEntry = `${timeStr}: ${reason} (Lần ${this.tabSwitches})`;
    this.tabSwitchLogs.push(logEntry);
    this._saveProgress();

    const maxAllowed = this.exam.antiCheat?.maxTabSwitches || 3;
    const autoSubmit = this.exam.antiCheat?.autoSubmitOnExcess;

    // Hiển thị cảnh báo cho học sinh
    const banner = document.getElementById('cheatWarningBanner');
    if (banner) {
      banner.classList.remove('hidden');
      document.getElementById('cheatWarningText').textContent = 
        `⚠️ Cảnh báo gian lận: Bạn vừa rời khỏi màn hình thi! Đã ghi nhận lần thứ ${this.tabSwitches}/${maxAllowed}.`;
    }

    if (autoSubmit && this.tabSwitches >= maxAllowed) {
      alert(`Bạn đã rời màn hình thi quá ${maxAllowed} lần! Hệ thống tự động thu bài.`);
      this.submitExam(true);
    }
  },

  render() {
    if (!this.exam || this.shuffledQuestions.length === 0) {
      return `<div class="p-8 text-center text-slate-500">Đang tải đề thi...</div>`;
    }

    const currentQ = this.shuffledQuestions[this.currentIndex];
    const totalQ = this.shuffledQuestions.length;
    const isFirst = this.currentIndex === 0;
    const isLast = this.currentIndex === totalQ - 1;
    const isFlagged = Boolean(this.flaggedQuestions[currentQ.id]);

    // Đếm số câu đã làm
    let answeredCount = 0;
    this.shuffledQuestions.forEach(q => {
      const a = this.answers[q.id];
      if (q.part === 1 && a) answeredCount++;
      else if (q.part === 2 && a && Object.keys(a).length > 0) answeredCount++;
      else if (q.part === 3 && a && String(a).trim() !== '') answeredCount++;
    });

    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return `
      <div class="anti-cheat-protected min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-950">
        
        <!-- Top Sticky Header -->
        <div class="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
          <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            <!-- Left Info -->
            <div class="flex items-center space-x-3">
              <span class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                ${this.exam.title}
              </span>
              <span class="hidden md:inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Lớp: ${this.student.class}
              </span>
            </div>

            <!-- Middle Countdown Timer -->
            <div class="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span class="text-xs">⏱️</span>
              <span id="examCountdownTimer" class="text-base font-black text-blue-600 dark:text-blue-400">
                ${timeFormatted}
              </span>
            </div>

            <!-- Right Buttons -->
            <div class="flex items-center space-x-2">
              <button
                onclick="window.ExamTaking.openPaletteModal()"
                class="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
                title="Bảng câu hỏi"
              >
                📋 ${answeredCount}/${totalQ}
              </button>

              <button
                onclick="window.ExamTaking.promptSubmit()"
                class="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition"
              >
                Nộp Bài
              </button>
            </div>

          </div>

          <!-- Anti-Cheat Violation Banner -->
          <div id="cheatWarningBanner" class="${this.tabSwitches > 0 ? '' : 'hidden'} mt-2 p-2 rounded-xl bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center justify-between">
            <span id="cheatWarningText">⚠️ Cảnh báo: Đã ghi nhận ${this.tabSwitches} lần rời khỏi màn hình thi!</span>
            <button onclick="document.getElementById('cheatWarningBanner').classList.add('hidden')" class="text-red-500 font-black px-2">✕</button>
          </div>
        </div>

        <!-- Main Body: Question Area & Navigation Grid -->
        <div class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- Left: Current Question Card (lg:col-span-8) -->
          <div class="lg:col-span-8 flex flex-col justify-between space-y-6">
            
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-sm">
              
              <!-- Question Header Meta -->
              <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div class="flex items-center space-x-2">
                  <span class="px-3 py-1 rounded-xl text-xs font-black bg-blue-600 text-white">
                    Câu ${this.currentIndex + 1} / ${totalQ}
                  </span>
                  <span class="px-2.5 py-1 rounded-xl text-xs font-bold ${
                    currentQ.part === 1 ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                    currentQ.part === 2 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }">
                    ${currentQ.part === 1 ? 'Phần I: 4 Lựa chọn' : currentQ.part === 2 ? 'Phần II: Đúng / Sai' : 'Phần III: Điền số'}
                  </span>
                  <span class="text-xs text-slate-400 font-medium">
                    (${currentQ.points || (currentQ.part === 1 ? 0.25 : (currentQ.part === 2 ? 1.0 : 0.5))} điểm)
                  </span>
                </div>

                <!-- Flag for review button -->
                <button
                  onclick="window.ExamTaking.toggleFlag()"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                    isFlagged
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }"
                >
                  <span>🚩</span>
                  <span class="hidden sm:inline">${isFlagged ? 'Đã xem lại' : 'Xem lại'}</span>
                </button>
              </div>

              <!-- Question Content (Rendered with KaTeX) -->
              <div class="text-base sm:text-lg text-slate-800 dark:text-slate-100 font-medium leading-relaxed py-1 mb-6 overflow-visible">
                ${MathRenderer.renderToString(currentQ.content)}
              </div>

              <!-- Optional Image -->
              ${currentQ.image ? `
                <div class="mb-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
                  <img src="${currentQ.image}" alt="Hình minh họa" class="w-full object-contain" />
                </div>
              ` : ''}

              <!-- Interactive Answers according to Part -->
              <div class="mt-6">
                ${this._renderQuestionAnswers(currentQ)}
              </div>

            </div>

            <!-- Bottom Navigation Bar -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-sm">
              <button
                onclick="window.ExamTaking.prevQuestion()"
                ${isFirst ? 'disabled' : ''}
                class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition ${
                  isFirst
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }"
              >
                <span>←</span>
                <span>Câu trước</span>
              </button>

              <span id="saveStatusIndicator" class="text-xs text-slate-400 font-medium hidden sm:inline-block">
                🟢 Đã tự động lưu
              </span>

              ${isLast ? `
                <button
                  onclick="window.ExamTaking.promptSubmit()"
                  class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5"
                >
                  <span>Hoàn thành & Nộp bài</span>
                  <span>✓</span>
                </button>
              ` : `
                <button
                  onclick="window.ExamTaking.nextQuestion()"
                  class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                >
                  <span>Câu tiếp theo</span>
                  <span>→</span>
                </button>
              `}
            </div>

          </div>

          <!-- Right: Desktop Question Navigation Palette (lg:col-span-4) -->
          <div class="hidden lg:block lg:col-span-4">
            <div class="sticky top-36 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
              
              <div class="flex items-center justify-between">
                <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">Bảng Điều Hướng</h4>
                <span class="text-xs font-bold text-blue-600 dark:text-blue-400">
                  ${answeredCount} / ${totalQ} câu
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-blue-600 h-full transition-all duration-300" style="width: ${(answeredCount / totalQ) * 100}%"></div>
              </div>

              <!-- Status Legend -->
              <div class="grid grid-cols-3 gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold pt-1">
                <div class="flex items-center space-x-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>Đã làm</span></div>
                <div class="flex items-center space-x-1"><span class="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></span><span>Chưa làm</span></div>
                <div class="flex items-center space-x-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>Xem lại</span></div>
              </div>

              <!-- Palette Grid Buttons -->
              <div class="grid grid-cols-5 gap-2 pt-2 max-h-[360px] overflow-y-auto pr-1">
                ${this.shuffledQuestions.map((q, idx) => {
                  const state = this._getQuestionState(q);
                  const isCurrent = idx === this.currentIndex;

                  let colorClass = 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                  if (state === 'flagged') {
                    colorClass = 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20';
                  } else if (state === 'answered') {
                    colorClass = 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20';
                  }

                  const ringClass = isCurrent ? 'ring-2 ring-blue-600 dark:ring-blue-400 ring-offset-2 dark:ring-offset-slate-900 scale-105 font-black' : '';

                  return `
                    <button
                      onclick="window.ExamTaking.goToQuestion(${idx})"
                      class="pal-btn relative h-10 rounded-xl border font-bold text-xs flex items-center justify-center transition ${colorClass} ${ringClass}"
                    >
                      <span>${idx + 1}</span>
                      ${state === 'flagged' ? `<span class="absolute -top-1 -right-1 text-[9px]">🚩</span>` : ''}
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- Nộp bài button -->
              <button
                onclick="window.ExamTaking.promptSubmit()"
                class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition mt-4"
              >
                Nộp Bài Thi
              </button>

            </div>
          </div>

        </div>

      </div>

      <!-- Mobile Palette Modal -->
      <div id="paletteMobileModal" class="hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-extrabold text-base text-slate-900 dark:text-white">Danh Sách Câu Hỏi</h3>
            <button onclick="document.getElementById('paletteMobileModal').classList.add('hidden')" class="p-1 text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div class="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto mb-4">
            ${this.shuffledQuestions.map((q, idx) => {
              const state = this._getQuestionState(q);
              const isCurrent = idx === this.currentIndex;
              let bg = state === 'flagged' ? 'bg-amber-500 text-white' : (state === 'answered' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300');
              return `
                <button onclick="window.ExamTaking.goToQuestion(${idx}); document.getElementById('paletteMobileModal').classList.add('hidden')" class="h-10 rounded-xl font-bold text-xs ${bg} ${isCurrent ? 'ring-2 ring-blue-500' : ''}">
                  ${idx + 1} ${state === 'flagged' ? '🚩' : ''}
                </button>
              `;
            }).join('')}
          </div>
          <button onclick="window.ExamTaking.promptSubmit()" class="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm">
            Nộp Bài
          </button>
        </div>
      </div>

      <!-- Submit Confirmation Modal -->
      <div id="submitConfirmModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-bounce-once">
          <div class="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 text-2xl">
            📋
          </div>
          <h3 class="text-lg font-black text-slate-900 dark:text-white">Xác Nhận Nộp Bài?</h3>
          
          <div class="my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
            <div class="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Đã trả lời:</span>
              <strong class="text-emerald-600 dark:text-emerald-400 font-bold">${answeredCount} / ${totalQ} câu</strong>
            </div>
            ${totalQ - answeredCount > 0 ? `
              <div class="flex justify-between text-amber-600 font-bold">
                <span>Còn chưa làm:</span>
                <span>${totalQ - answeredCount} câu</span>
              </div>
            ` : ''}
          </div>

          ${totalQ - answeredCount > 0 ? `
            <p class="text-xs text-amber-600 font-medium mb-4">
              ⚠️ Em vẫn còn câu chưa hoàn thành. Em có chắc chắn muốn nộp bài bây giờ không?
            </p>
          ` : `
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Em đã hoàn thành tất cả các câu. Hãy chắc chắn trước khi gửi nhé!
            </p>
          `}

          <div class="grid grid-cols-2 gap-2">
            <button
              onclick="document.getElementById('submitConfirmModal').classList.add('hidden')"
              class="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
            >
              Làm tiếp
            </button>
            <button
              onclick="window.ExamTaking.submitExam(false)"
              class="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition"
            >
              Đồng ý Nộp
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _getQuestionState(q) {
    if (this.flaggedQuestions[q.id]) return 'flagged';
    const a = this.answers[q.id];
    if (q.part === 1 && a) return 'answered';
    if (q.part === 2 && a && Object.keys(a).length > 0) return 'answered';
    if (q.part === 3 && a && String(a).trim() !== '') return 'answered';
    return 'unanswered';
  },

  _renderQuestionAnswers(q) {
    if (q.part === 1) {
      // Phần I: 4 Lựa chọn A, B, C, D
      const selected = this.answers[q.id];
      const opts = q.options || [];

      return `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${opts.map(opt => {
            const isChosen = selected === opt.id;
            return `
              <div
                onclick="window.ExamTaking.selectPart1Choice('${q.id}', '${opt.id}')"
                class="cursor-pointer p-4 rounded-2xl border transition-all flex items-start space-x-3 ${
                  isChosen
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm shadow-blue-500/10'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }"
              >
                <div class="w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shrink-0 transition ${
                  isChosen
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }">
                  ${opt.id}
                </div>
                <div class="text-sm sm:text-base text-slate-800 dark:text-slate-200 py-1 leading-relaxed overflow-visible">
                  ${MathRenderer.renderToString(opt.text)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.part === 2) {
      // Phần II: Đúng / Sai 4 ý a, b, c, d
      const subItems = q.subItems || [];
      const currentAns = this.answers[q.id] || {};

      return `
        <div class="space-y-3">
          <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Chọn Đúng hoặc Sai cho từng ý dưới đây:
          </p>
          <div class="space-y-2.5">
            ${subItems.map(sub => {
              const val = currentAns[sub.id]; // true, false hoặc undefined
              const isTrue = val === true;
              const isFalse = val === false;

              return `
                <div class="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-start space-x-2.5 flex-1">
                    <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                      ${sub.id})
                    </span>
                    <div class="text-sm text-slate-800 dark:text-slate-200 font-medium py-1 leading-relaxed overflow-visible">
                      ${MathRenderer.renderToString(sub.text)}
                    </div>
                  </div>

                  <!-- 2 Nút Đúng / Sai -->
                  <div class="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <button
                      onclick="window.ExamTaking.selectPart2Choice('${q.id}', '${sub.id}', true)"
                      class="px-4 py-2 rounded-xl font-bold text-xs transition ${
                        isTrue
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }"
                    >
                      ✓ Đúng
                    </button>
                    <button
                      onclick="window.ExamTaking.selectPart2Choice('${q.id}', '${sub.id}', false)"
                      class="px-4 py-2 rounded-xl font-bold text-xs transition ${
                        isFalse
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }"
                    >
                      ✕ Sai
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (q.part === 3) {
      // Phần III: Trả lời ngắn điền số
      const currentVal = this.answers[q.id] || '';

      return `
        <div class="max-w-md space-y-2">
          <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Nhập kết quả (Số thập phân chấp nhận cả dấu phẩy và dấu chấm):
          </label>
          <div class="relative">
            <input
              type="text"
              id="part3_input_${q.id}"
              value="${currentVal}"
              oninput="window.ExamTaking.inputPart3Answer('${q.id}', this.value)"
              placeholder="ví dụ: 6 hoặc 2,5 hoặc -1.25"
              class="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition"
            />
          </div>
          <p class="text-[11px] text-slate-400 italic">
            * Nhập số nguyên hoặc số thập phân (ví dụ: 2.5 hoặc 2,5). Hệ thống tự chuẩn hóa khi chấm.
          </p>
        </div>
      `;
    }
  },

  // Handlers
  selectPart1Choice(qId, choiceId) {
    this.answers[qId] = choiceId;
    this._saveProgress();
    window.App.renderApp();
  },

  selectPart2Choice(qId, subId, isTrue) {
    if (!this.answers[qId]) this.answers[qId] = {};
    this.answers[qId][subId] = isTrue;
    this._saveProgress();
    window.App.renderApp();
  },

  inputPart3Answer(qId, val) {
    this.answers[qId] = val;
    this._saveProgress();
  },

  toggleFlag() {
    const qId = this.shuffledQuestions[this.currentIndex].id;
    this.flaggedQuestions[qId] = !this.flaggedQuestions[qId];
    this._saveProgress();
    window.App.renderApp();
  },

  goToQuestion(idx) {
    this.currentIndex = idx;
    window.App.renderApp();
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      window.App.renderApp();
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.shuffledQuestions.length - 1) {
      this.currentIndex++;
      window.App.renderApp();
    }
  },

  openPaletteModal() {
    document.getElementById('paletteMobileModal')?.classList.remove('hidden');
  },

  promptSubmit() {
    document.getElementById('submitConfirmModal')?.classList.remove('hidden');
  },

  async submitExam(isAuto = false) {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Dọn dẹp listener chống gian lận & interval
    this._cleanupAntiCheat();

    const elapsedSeconds = Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000);

    const submissionPayload = {
      examId: this.exam.id,
      studentId: this.student.id,
      studentName: this.student.name,
      studentClass: this.student.class,
      startedAt: this.startedAt,
      durationSeconds: elapsedSeconds,
      answers: this.answers,
      tabSwitches: this.tabSwitches,
      tabSwitchLogs: this.tabSwitchLogs
    };

    try {
      const result = await DB.submitExam(submissionPayload);

      // Xóa phiên làm bài tạm trong localStorage
      localStorage.removeItem(`azota_exam_session_${this.exam.id}_${this.student.id}`);

      // Chuyển sang màn hình xem kết quả
      window.App.viewResult(result.id);

    } catch (err) {
      alert('Lỗi nộp bài: ' + err.message);
      this.isSubmitting = false;
    }
  }
};

window.ExamTaking = ExamTaking;
