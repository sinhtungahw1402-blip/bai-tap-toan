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
  isCurrentlyAway: false,
  lastLeftTime: null,
  currentLeaveReason: '',
  hasRequestedFullscreen: false,
  initialWidth: 0,
  initialHeight: 0,

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

    // Phân quyền lớp học sinh nghiêm ngặt: Học sinh lớp này không thể làm bài của lớp khác
    if (this.student && this.student.class && this.exam.assignedClasses && this.exam.assignedClasses.length > 0) {
      if (!this.exam.assignedClasses.includes(this.student.class)) {
        alert(`⛔ TRUY CẬP BỊ TỪ CHỐI!\n\nBài kiểm tra này chỉ dành riêng cho: ${this.exam.assignedClasses.join(', ')}.\nLớp hiện tại của em là "${this.student.class}". Em không có quyền làm bài của lớp khác.`);
        window.App.navigateTo('student-dashboard');
        return;
      }
    }

    // Kiểm tra nghiêm ngặt thời điểm bắt đầu mở đề thi
    if (this.exam.openTime) {
      const openDate = new Date(this.exam.openTime);
      const now = new Date();
      if (now < openDate) {
        const timeStr = openDate.toLocaleString('vi-VN', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
        });
        alert(`⏳ CHƯA ĐẾN GIỜ LÀM BÀI!\n\nĐề thi "${this.exam.title}" chỉ bắt đầu mở vào lúc:\n👉 ${timeStr}\n\nHiện tại: ${now.toLocaleString('vi-VN')}\nEm vui lòng quay lại khi đến giờ làm bài nhé!`);
        window.App.navigateTo('student-dashboard');
        return;
      }
    }

    // Kiểm tra thời hạn kết thúc nộp bài (dueTime)
    if (this.exam.dueTime) {
      const dueDate = new Date(this.exam.dueTime);
      const now = new Date();
      if (now > dueDate) {
        const timeStr = dueDate.toLocaleString('vi-VN', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
        });
        alert(`⌛ ĐÃ HẾT HẠN NỘP BÀI!\n\nBài kiểm tra "${this.exam.title}" đã kết thúc thời gian nộp bài vào lúc:\n👉 ${timeStr}\n\nEm không thể vào làm bài được nữa.`);
        window.App.navigateTo('student-dashboard');
        return;
      }
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

    // 3. Tính toán thời gian còn lại (kết hợp thời lượng làm bài và thời hạn chót của bài thi)
    const totalDurationSeconds = (this.exam.durationMinutes || 45) * 60;
    const elapsedSeconds = Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000);
    let remaining = Math.max(0, totalDurationSeconds - elapsedSeconds);

    if (this.exam.dueTime) {
      const dueSecondsLeft = Math.floor((new Date(this.exam.dueTime).getTime() - Date.now()) / 1000);
      if (dueSecondsLeft <= 0) {
        alert('⌛ ĐÃ HẾT HẠN NỘP BÀI!\n\nBài kiểm tra này đã kết thúc hạn nộp.');
        window.App.navigateTo('student-dashboard');
        return;
      }
      remaining = Math.min(remaining, dueSecondsLeft);
    }
    this.remainingSeconds = remaining;

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
        this.remainingSeconds = 0;
        this._updateTimerDisplay();
        alert('⏰ ĐÃ HẾT GIỜ LÀM BÀI!\n\nThời gian làm bài quy định đã kết thúc. Hệ thống tự động thu bài và gửi kết quả chấm điểm.');
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
    this.initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    this.initialHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    this.isCurrentlyAway = false;
    this.lastLeftTime = null;

    // Gắn class css bảo vệ vào body
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('in-exam');
    }

    // Bindings để removeEventListener chuẩn xác
    this._boundContextMenu = (e) => this._preventContextMenu(e);
    this._boundCopy = (e) => this._preventCopy(e);
    this._boundPaste = (e) => this._preventPaste(e);
    this._boundSelect = (e) => this._preventSelect(e);
    this._boundDrag = (e) => this._preventDrag(e);
    this._boundKeyDown = (e) => this._handleKeyDown(e);
    this._boundVisibilityChange = () => this._handleVisibilityChange();
    this._boundPageHide = () => this._handlePageHide();
    this._boundWindowBlur = () => this._handleWindowBlur();
    this._boundWindowFocus = () => this._handleWindowFocus();
    this._boundFullscreenChange = () => this._handleFullscreenChange();
    this._boundWindowResize = () => this._handleWindowResize();
    this._boundBeforePrint = () => this._handleBeforePrint();

    // 1. Chống copy, chuột phải, chọn văn bản & kéo thả
    if (anti.disableContextMenu !== false) {
      document.addEventListener('contextmenu', this._boundContextMenu);
    }
    if (anti.disableCopy !== false) {
      document.addEventListener('copy', this._boundCopy);
      document.addEventListener('cut', this._boundCopy);
      document.addEventListener('paste', this._boundPaste);
      document.addEventListener('selectstart', this._boundSelect);
      document.addEventListener('dragstart', this._boundDrag);
    }

    // 2. Chặn các tổ hợp phím gian lận (F12, Ctrl+U, Ctrl+P, DevTools...)
    document.addEventListener('keydown', this._boundKeyDown);

    // 3. Giám sát chuyển tab, đổi ứng dụng & mất tiêu điểm (Cực nhạy trên cả Mobile & PC)
    document.addEventListener('visibilitychange', this._boundVisibilityChange);
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this._boundPageHide);
      window.addEventListener('blur', this._boundWindowBlur);
      window.addEventListener('focus', this._boundWindowFocus);
      window.addEventListener('resize', this._boundWindowResize);
      window.addEventListener('beforeprint', this._boundBeforePrint);
    }

    // 4. Giám sát trạng thái toàn màn hình
    document.addEventListener('fullscreenchange', this._boundFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._boundFullscreenChange);
    document.addEventListener('mozfullscreenchange', this._boundFullscreenChange);
  },

  _cleanupAntiCheat() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('in-exam');
    }
    if (this._boundContextMenu) document.removeEventListener('contextmenu', this._boundContextMenu);
    if (this._boundCopy) {
      document.removeEventListener('copy', this._boundCopy);
      document.removeEventListener('cut', this._boundCopy);
      document.removeEventListener('paste', this._boundPaste);
      document.removeEventListener('selectstart', this._boundSelect);
      document.removeEventListener('dragstart', this._boundDrag);
    }
    if (this._boundKeyDown) document.removeEventListener('keydown', this._boundKeyDown);
    if (this._boundVisibilityChange) document.removeEventListener('visibilitychange', this._boundVisibilityChange);
    if (typeof window !== 'undefined') {
      if (this._boundPageHide) window.removeEventListener('pagehide', this._boundPageHide);
      if (this._boundWindowBlur) window.removeEventListener('blur', this._boundWindowBlur);
      if (this._boundWindowFocus) window.removeEventListener('focus', this._boundWindowFocus);
      if (this._boundWindowResize) window.removeEventListener('resize', this._boundWindowResize);
      if (this._boundBeforePrint) window.removeEventListener('beforeprint', this._boundBeforePrint);
    }
    if (this._boundFullscreenChange) {
      document.removeEventListener('fullscreenchange', this._boundFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this._boundFullscreenChange);
      document.removeEventListener('mozfullscreenchange', this._boundFullscreenChange);
    }
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  _preventContextMenu(e) {
    e.preventDefault();
    this._showQuickSecurityToast('⚠️ Đã vô hiệu hóa chuột phải để bảo vệ đề thi!');
    return false;
  },

  _preventCopy(e) {
    e.preventDefault();
    this._showQuickSecurityToast('⚠️ Cấm sao chép nội dung câu hỏi bài thi!');
    return false;
  },

  _preventPaste(e) {
    // Chỉ cho phép dán ở ô nhập số Phần III
    const target = e.target;
    if (target && target.tagName === 'INPUT' && target.id && target.id.startsWith('part3_input_')) {
      return;
    }
    e.preventDefault();
    this._showQuickSecurityToast('⚠️ Không thể dán nội dung trong phòng thi!');
    return false;
  },

  _preventSelect(e) {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    return false;
  },

  _preventDrag(e) {
    e.preventDefault();
    return false;
  },

  _handleKeyDown(e) {
    if (ExamTaking.isSubmitting) return;

    // F12 -> Mở DevTools
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      ExamTaking._recordCheatIncident('Cố gắng mở công cụ phát triển (F12 / DevTools)');
      return false;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd) {
      const key = (e.key || '').toLowerCase();
      // Ctrl+U, Ctrl+S, Ctrl+P
      if (key === 'u' || key === 's' || key === 'p') {
        e.preventDefault();
        ExamTaking._recordCheatIncident(`Cố gắng sử dụng phím tắt Ctrl+${key.toUpperCase()}`);
        return false;
      }
      // Ctrl+Shift+I / J / C (DevTools Inspect)
      if (e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        ExamTaking._recordCheatIncident('Cố gắng kiểm tra phần tử trang thi (Inspect)');
        return false;
      }
      // Ctrl+C, Ctrl+A, Ctrl+X trên câu hỏi
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInput && (key === 'c' || key === 'x' || key === 'a')) {
        e.preventDefault();
        ExamTaking._showQuickSecurityToast('⚠️ Cấm sao chép hoặc bôi đen toàn bộ đề thi!');
        return false;
      }
    }
  },

  _handleBeforePrint() {
    ExamTaking._recordCheatIncident('Cố gắng in hoặc xuất đề thi thành PDF');
  },

  _triggerLeave(reason) {
    if (this.isSubmitting || this.isCurrentlyAway) return;
    this.isCurrentlyAway = true;
    this.lastLeftTime = Date.now();
    this.currentLeaveReason = reason || 'Rời màn hình thi';
  },

  _triggerReturn() {
    if (!this.isCurrentlyAway) return;
    this.isCurrentlyAway = false;
    const awayMs = Date.now() - (this.lastLeftTime || Date.now());
    const awaySec = Math.max(1, Math.round(awayMs / 1000));
    const reason = this.currentLeaveReason || 'Rời màn hình thi';
    this._recordCheatIncident(`${reason} (Vắng mặt ${awaySec} giây)`);
  },

  _handleVisibilityChange() {
    if (document.hidden) {
      this._triggerLeave('Chuyển sang ứng dụng hoặc tab khác');
    } else {
      this._triggerReturn();
    }
  },

  _handlePageHide() {
    this._triggerLeave('Thoát ứng dụng trình duyệt');
  },

  _handleWindowBlur() {
    // Tránh false-positive khi mở bàn phím ảo gõ câu điền số
    if (typeof document !== 'undefined') {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
    }
    this._triggerLeave('Rời cửa sổ làm bài thi');
  },

  _handleWindowFocus() {
    this._triggerReturn();
  },

  _handleFullscreenChange() {
    if (typeof document === 'undefined') return;
    const isFS = Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    const fsBtn = document.getElementById('examFullscreenToggleBtn');
    if (fsBtn) {
      fsBtn.innerHTML = isFS
        ? '<span>🗗</span> <span class="hidden sm:inline">Thu nhỏ</span>'
        : '<span>⛶</span> <span class="hidden sm:inline">Toàn màn hình</span>';
    }
    if (!isFS && this.hasRequestedFullscreen && !this.isSubmitting) {
      this._recordCheatIncident('Thoát khỏi chế độ Toàn Màn Hình');
    }
  },

  _handleWindowResize() {
    if (this.isSubmitting || typeof window === 'undefined') return;
    // Phát hiện chia đôi màn hình (Split screen trên PC hoặc Tablet)
    if (this.initialWidth > 768 && window.innerWidth < this.initialWidth * 0.65) {
      this._triggerLeave('Phát hiện chia đôi màn hình (Split-screen)');
    }
  },

  toggleFullscreen() {
    if (typeof document === 'undefined') return;
    const docEl = document.documentElement;
    const isFS = Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    if (!isFS) {
      this.hasRequestedFullscreen = true;
      if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen().catch(() => {});
      else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen().catch(() => {});
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
    }
  },

  _playWarningBeep() {
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  },

  _showQuickSecurityToast(msg) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('examSecurityToast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.remove('hidden');
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
      }, 2500);
    }
  },

  _recordCheatIncident(reason) {
    if (this.isSubmitting) return;

    this.tabSwitches++;
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const logEntry = `${timeStr}: ${reason} (Lần ${this.tabSwitches})`;
    this.tabSwitchLogs.push(logEntry);
    this._saveProgress();

    this._playWarningBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([250, 100, 250]); } catch (e) {}
    }

    const maxAllowed = (this.exam.antiCheat && this.exam.antiCheat.maxTabSwitches !== undefined)
      ? this.exam.antiCheat.maxTabSwitches
      : 3;
    const autoSubmit = this.exam.antiCheat ? this.exam.antiCheat.autoSubmitOnExcess !== false : true;

    // Cập nhật banner trên trang
    if (typeof document !== 'undefined') {
      const banner = document.getElementById('cheatWarningBanner');
      const warningText = document.getElementById('cheatWarningText');
      if (banner && warningText) {
        banner.classList.remove('hidden');
        warningText.textContent = `⚠️ Đã ghi nhận ${this.tabSwitches}/${maxAllowed} lần rời khỏi màn hình thi!`;
      }

      // Kích hoạt Modal Cảnh Báo Khẩn Cấp Toàn Màn Hình
      this._showCheatAlertModal(reason, this.tabSwitches, maxAllowed, autoSubmit);
    }
  },

  _showCheatAlertModal(reason, currentCount, maxAllowed, autoSubmit) {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('cheatAlertModal');
    if (!modal) return;

    const isExceeded = autoSubmit && currentCount >= maxAllowed;

    const titleEl = document.getElementById('cheatModalTitle');
    const iconEl = document.getElementById('cheatModalIcon');
    const descEl = document.getElementById('cheatModalDesc');
    const countEl = document.getElementById('cheatModalCount');
    const progressEl = document.getElementById('cheatModalProgressBar');
    const reasonEl = document.getElementById('cheatModalReason');
    const actionEl = document.getElementById('cheatModalActionBtn');

    if (countEl) countEl.textContent = `${currentCount} / ${maxAllowed}`;
    if (reasonEl) reasonEl.textContent = reason;

    const pct = Math.min(100, Math.round((currentCount / maxAllowed) * 100));
    if (progressEl) {
      progressEl.style.width = `${pct}%`;
      progressEl.className = currentCount >= maxAllowed
        ? 'h-full bg-red-600 transition-all duration-300'
        : 'h-full bg-amber-500 transition-all duration-300';
    }

    if (isExceeded) {
      if (iconEl) iconEl.innerHTML = '⛔';
      if (titleEl) titleEl.textContent = 'ĐÌNH CHỈ THI DO VI PHẠM GIAN LẬN!';
      if (descEl) {
        descEl.innerHTML = `Em đã rời khỏi màn hình làm bài <strong>${currentCount} lần</strong>, vượt quá giới hạn cho phép (tối đa <strong>${maxAllowed} lần</strong>).<br><br><span class="text-red-600 font-bold">Hệ thống đang tiến hành cưỡng chế thu bài và chuyển toàn bộ nhật ký vi phạm về cho Thầy giáo...</span>`;
      }
      if (actionEl) {
        actionEl.innerHTML = '<span class="animate-spin inline-block mr-2">⏳</span> Đang tự động thu bài...';
        actionEl.disabled = true;
      }
      modal.classList.remove('hidden');

      setTimeout(() => {
        this.submitExam(true);
      }, 1800);

    } else {
      if (iconEl) iconEl.innerHTML = '🚨';
      if (titleEl) titleEl.textContent = 'CẢNH BÁO VI PHẠM NỘI QUY PHÒNG THI';
      if (descEl) {
        descEl.innerHTML = `Hệ thống vừa phát hiện hành vi rời khỏi giao diện làm bài thi.<br>Mọi thao tác đã được lưu vào biên bản giám sát gửi Thầy giáo.<br><br><strong>LƯU Ý NGHIÊM KHẮC:</strong> Nếu vi phạm quá <strong>${maxAllowed} lần</strong>, hệ thống sẽ <strong>LẬP TỨC ĐÌNH CHỈ VÀ TỰ ĐỘNG THU BÀI!</strong>`;
      }
      if (actionEl) {
        actionEl.innerHTML = '⚠️ Tôi Đã Hiểu & Quay Lại Làm Bài';
        actionEl.disabled = false;
        actionEl.onclick = () => {
          modal.classList.add('hidden');
          if (this.hasRequestedFullscreen) {
            this.toggleFullscreen();
          }
        };
      }
      modal.classList.remove('hidden');
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
        <div class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm safe-area-header">
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
                id="examFullscreenToggleBtn"
                type="button"
                onclick="window.ExamTaking.toggleFullscreen()"
                class="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1 transition shadow-sm"
                title="Bật/Tắt Toàn Màn Hình"
              >
                <span>⛶</span>
                <span class="hidden sm:inline">Toàn màn hình</span>
              </button>

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

      <!-- Fullscreen Cheat Alert Modal (Cảnh Báo Gian Lận Khẩn Cấp) -->
      <div id="cheatAlertModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-bounce-once">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500/80 dark:border-red-600 space-y-4 text-center">
          
          <div id="cheatModalIcon" class="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-3xl shadow-inner animate-pulse">
            🚨
          </div>

          <div class="space-y-1">
            <h3 id="cheatModalTitle" class="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              CẢNH BÁO VI PHẠM NỘI QUY PHÒNG THI
            </h3>
            <p class="text-xs text-red-500 font-bold">Hệ thống phát hiện hành vi nghi vấn gian lận</p>
          </div>

          <!-- Strike Counter & Progress Bar -->
          <div class="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2">
            <div class="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-200">
              <span>Lần vi phạm:</span>
              <span id="cheatModalCount" class="text-red-600 dark:text-red-400 text-sm">1 / 3</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div id="cheatModalProgressBar" class="h-full bg-red-600 transition-all duration-300" style="width: 33%;"></div>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Chi tiết:</span>
              <span id="cheatModalReason" class="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">Rời màn hình thi</span>
            </div>
          </div>

          <div id="cheatModalDesc" class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            Hệ thống vừa phát hiện hành vi rời khỏi giao diện làm bài thi.
          </div>

          <div class="pt-2">
            <button
              type="button"
              id="cheatModalActionBtn"
              class="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm shadow-lg shadow-red-600/30 active:scale-95 transition"
            >
              ⚠️ Tôi Đã Hiểu & Quay Lại Làm Bài
            </button>
          </div>

        </div>
      </div>

      <!-- Floating Security Feedback Toast -->
      <div id="examSecurityToast" class="hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 font-bold text-xs shadow-2xl border border-slate-700 dark:border-slate-200 security-toast pointer-events-none">
      </div>

      <!-- Watermark Background chống chụp màn hình bằng thiết bị thứ hai -->
      ${(this.exam.antiCheat?.enableWatermark !== false) ? `
        <div class="exam-watermark-overlay" style="background-image: url('data:image/svg+xml;utf8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="280" height="130">
            <text x="15" y="65" fill="%2364748b" font-size="11" font-family="sans-serif" font-weight="bold" transform="rotate(-20 15 65)" opacity="0.6">${this.student.name} • ${this.student.class} • ${this.student.id || ''}</text>
          </svg>
        `.trim())}');"></div>
      ` : ''}
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
    const maxAllowed = (this.exam.antiCheat && this.exam.antiCheat.maxTabSwitches !== undefined)
      ? this.exam.antiCheat.maxTabSwitches
      : 3;
    const isDisqualified = isAuto && this.tabSwitches >= maxAllowed;

    const submissionPayload = {
      examId: this.exam.id,
      studentId: this.student.id,
      studentName: this.student.name,
      studentClass: this.student.class,
      startedAt: this.startedAt,
      durationSeconds: elapsedSeconds,
      answers: this.answers,
      tabSwitches: this.tabSwitches,
      tabSwitchLogs: this.tabSwitchLogs,
      isDisqualified: isDisqualified,
      disqualifiedReason: isDisqualified ? `Vi phạm rời màn hình thi ${this.tabSwitches} lần (vượt giới hạn ${maxAllowed} lần)` : null
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
