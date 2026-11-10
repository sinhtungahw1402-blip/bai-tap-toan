// Azota Toán - Exam Result View (Xem kết quả, Điểm số & Lời giải chi tiết)
const ExamResult = {
  async render(submissionId, currentUser) {
    const subs = await DB.getSubmissions();
    const submission = subs.find(s => s.id === submissionId);

    if (!submission) {
      return `
        <div class="max-w-xl mx-auto p-8 text-center">
          <p class="text-red-500 font-bold mb-4">Không tìm thấy kết quả bài thi!</p>
          <button onclick="window.App.navigateTo('student-dashboard')" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">
            Về Trang Chủ
          </button>
        </div>
      `;
    }

    const rawExam = await DB.getExamById(submission.examId, 'admin');
    const exam = rawExam || { title: 'Bài kiểm tra Toán', dueTime: null, scale: 10, viewScoreMode: 'immediate', viewAnswerMode: 'immediate', questions: [] };

    // Tự động kiểm tra và tính toán lại chi tiết chấm nếu submission bị thiếu subDetails
    const sampleP2Q = (exam.questions || []).find(q => q.part === 2);
    if (!submission.itemResults || (sampleP2Q && (!submission.itemResults[sampleP2Q.id] || !submission.itemResults[sampleP2Q.id].subDetails))) {
      if (typeof GradingEngine !== 'undefined') {
        const regraded = GradingEngine.gradeSubmission(exam, submission.answers, { scale: exam.scale || 10 });
        submission.itemResults = regraded.itemResults;
        submission.score = regraded.finalScore;
        submission.rawScore = regraded.rawScore;
        submission.maxRawScore = regraded.maxRawScore;
      }
    }

    const now = new Date();
    const isDuePassed = exam.dueTime ? (now > new Date(exam.dueTime)) : true;
    const canViewScore = exam.viewScoreMode === 'immediate' || isDuePassed;
    const canViewAnswers = exam.viewAnswerMode === 'immediate' || isDuePassed;

    // Kích hoạt pháo giấy nếu điểm cao (>= 8.0)
    if (canViewScore && submission.score >= 8.0 && typeof confetti !== 'undefined') {
      setTimeout(() => {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }, 300);
    }

    const durMin = Math.floor((submission.durationSeconds || 0) / 60);
    const durSec = (submission.durationSeconds || 0) % 60;

    return `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        <!-- Score Celebration Card -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
          
          <div class="max-w-md mx-auto space-y-3">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Kết Quả Bài Làm • ${submission.studentName} (${submission.studentClass})
            </span>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              ${exam.title}
            </h1>

            ${canViewScore ? `
              <!-- Big Score Display -->
              <div class="py-4">
                <div class="text-6xl sm:text-7xl font-black tracking-tight ${
                  submission.score >= 8 ? 'text-emerald-500' :
                  submission.score >= 5 ? 'text-blue-600 dark:text-blue-400' :
                  'text-amber-500'
                }">
                  ${submission.score}
                </div>
                <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Thang điểm ${exam.scale || 10}
                </div>
                <p class="text-sm font-semibold mt-2 ${
                  submission.score >= 8 ? 'text-emerald-600 dark:text-emerald-400' :
                  submission.score >= 5 ? 'text-blue-600 dark:text-blue-400' :
                  'text-slate-600 dark:text-slate-300'
                }">
                  ${submission.score >= 8 ? '🎉 Xuất sắc! Em đã hoàn thành bài thi rất tốt!' :
                    submission.score >= 5 ? '👍 Khá tốt! Hãy xem lại các câu sai để củng cố kiến thức.' :
                    '💪 Hãy cố gắng hơn ở các bài kiểm tra tiếp theo nhé!'}
                </p>
              </div>
            ` : `
              <div class="py-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
                🔒 <strong>Điểm số được bảo mật:</strong> Thầy/Cô đã cài đặt công bố điểm sau khi bài thi kết thúc hạn nộp (${new Date(exam.dueTime).toLocaleString('vi-VN')}).
              </div>
            `}

            <!-- Metrics Grid -->
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-xs text-slate-400">Thời gian làm</div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">${durMin}m ${durSec}s</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-xs text-slate-400">Thời điểm nộp</div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">${new Date(submission.submittedAt).toLocaleTimeString('vi-VN')}</div>
              </div>
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-xs text-slate-400">Rời màn hình</div>
                <div class="text-sm font-bold ${submission.tabSwitches > 0 ? 'text-amber-500' : 'text-emerald-500'} mt-0.5">
                  ${submission.tabSwitches || 0} lần
                </div>
              </div>
            </div>

            <!-- Actions Bar -->
            <div class="flex items-center justify-center space-x-3 pt-3">
              <button
                onclick="window.App.navigateTo('${currentUser && currentUser.role === 'admin' ? 'analytics' : 'student-dashboard'}')"
                class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
              >
                ← Quay lại danh sách
              </button>
              <button
                onclick="window.print()"
                class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
              >
                <span>🖨️ In Kết Quả / Lưu PDF</span>
              </button>
            </div>

          </div>

        </div>

        <!-- Detailed Review Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-black text-slate-900 dark:text-white">
              Chi Tiết Bài Làm & Đáp Án
            </h2>
            ${canViewAnswers ? `
              <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Hiển thị đầy đủ lời giải
              </span>
            ` : `
              <span class="text-xs font-semibold text-amber-500">
                🔒 Lời giải sẽ mở sau hạn nộp
              </span>
            `}
          </div>

          ${!canViewAnswers ? `
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto mb-3 text-xl">
                🔒
              </div>
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Đáp án & Lời giải đang được khóa</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Để đảm bảo công bằng cho các bạn học sinh chưa nộp bài, lời giải và đáp án đúng sẽ tự động mở sau hạn nộp: <strong>${new Date(exam.dueTime).toLocaleString('vi-VN')}</strong>.
              </p>
            </div>
          ` : `
            <div class="space-y-4">
              ${(exam.questions || []).map((q, idx) => this._renderItemDetail(q, idx, submission)).join('')}
            </div>
          `}
        </div>

      </div>
    `;
  },

  _renderItemDetail(q, idx, submission) {
    const res = submission.itemResults ? submission.itemResults[q.id] : null;
    const isCorrect = res ? (res.isCorrect || res.isFullCorrect) : false;
    const earned = res ? (res.earnedPoints || 0) : 0;
    const maxPt = res ? (res.maxPoints || q.points) : q.points;

    return `
      <div class="bg-white dark:bg-slate-900 rounded-3xl border ${
        isCorrect ? 'border-emerald-200/80 dark:border-emerald-900/60' : 'border-slate-200/80 dark:border-slate-800'
      } p-5 sm:p-6 shadow-sm space-y-4">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-1 rounded-xl text-xs font-black ${
              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }">
              Câu ${idx + 1}
            </span>
            <span class="text-xs font-bold text-slate-500">
              Phần ${q.part}
            </span>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : (earned > 0 ? 'text-amber-500' : 'text-red-500')}">
              ${earned} / ${maxPt} điểm
            </span>
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
              isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
              (earned > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400')
            }">
              ${isCorrect ? '✓' : (earned > 0 ? '½' : '✕')}
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="text-sm sm:text-base text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
          ${MathRenderer.renderToString(q.content)}
        </div>

        <!-- Answers by Part -->
        <div class="pt-2">
          ${this._renderItemAnswersReview(q, res)}
        </div>

        <!-- Explanation with KaTeX -->
        ${q.explanation ? `
          <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs sm:text-sm">
            <div class="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center space-x-1">
              <span>💡 Hướng dẫn giải chi tiết:</span>
            </div>
            <div class="text-slate-700 dark:text-slate-300 leading-relaxed">
              ${MathRenderer.renderToString(q.explanation)}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  },

  _renderItemAnswersReview(q, res) {
    if (q.part === 1) {
      const studentAns = res ? res.studentAnswer : '';
      const correctAns = q.correctAnswer;

      return `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          ${(q.options || []).map(opt => {
            const isStudent = studentAns === opt.id;
            const isTarget = correctAns === opt.id;

            let border = 'border-slate-200 dark:border-slate-700';
            let bg = 'bg-slate-50 dark:bg-slate-800/40';
            if (isTarget) {
              border = 'border-emerald-500';
              bg = 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold';
            } else if (isStudent && !isTarget) {
              border = 'border-red-400';
              bg = 'bg-red-50/60 dark:bg-red-950/40 text-red-700 dark:text-red-300';
            }

            return `
              <div class="p-2.5 rounded-xl border ${border} ${bg} flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="w-6 h-6 rounded-lg font-bold flex items-center justify-center ${isTarget ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">
                    ${opt.id}
                  </span>
                  <span>${MathRenderer.renderToString(opt.text)}</span>
                </div>
                ${isStudent ? `<span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isTarget ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}">Em chọn</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.part === 2) {
      const sAnsObj = (submission.answers && submission.answers[q.id]) || {};
      const details = res ? (res.subDetails || {}) : {};

      return `
        <div class="space-y-1.5 text-xs">
          ${(q.subItems || []).map(sub => {
            const d = details[sub.id];
            let studentVal = null;
            if (d && typeof d.studentAnswer === 'boolean') {
              studentVal = d.studentAnswer;
            } else if (typeof sAnsObj[sub.id] === 'boolean') {
              studentVal = sAnsObj[sub.id];
            }

            const expected = Boolean(sub.correct);
            const isMatch = studentVal !== null && studentVal === expected;
            const expectedStr = expected ? 'Đúng' : 'Sai';
            const studentStr = studentVal === true ? 'Đúng' : (studentVal === false ? 'Sai' : 'Chưa chọn');

            let cardBorder = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40';
            if (studentVal !== null) {
              cardBorder = isMatch 
                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20' 
                : 'border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20';
            }

            return `
              <div class="p-2.5 rounded-xl border ${cardBorder} flex items-center justify-between gap-2">
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-indigo-600 dark:text-indigo-400">${sub.id})</span>
                  <span class="text-slate-800 dark:text-slate-200">${MathRenderer.renderToString(sub.text)}</span>
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                  <span class="text-[11px] ${studentVal === null ? 'text-slate-400 italic' : (isMatch ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold')}">
                    Em chọn: <strong>${studentStr}</strong>
                  </span>
                  <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Đáp án: <strong>${expectedStr}</strong>
                  </span>
                  <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px] ${
                    studentVal === null ? 'bg-slate-300 dark:bg-slate-600' : (isMatch ? 'bg-emerald-500' : 'bg-rose-500')
                  }">
                    ${studentVal === null ? '—' : (isMatch ? '✓' : '✕')}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.part === 3) {
      const studentAns = res ? res.studentAnswer : '';
      const accepted = q.acceptedAnswers ? q.acceptedAnswers.join(' hoặc ') : '';

      return `
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div>Em đã nhập: <strong class="text-sm ${res && res.isCorrect ? 'text-emerald-600' : 'text-red-500'} font-bold">${studentAns || '(bỏ trống)'}</strong></div>
          <div>Đáp án đúng chấp nhận: <strong class="text-emerald-600 font-bold">${accepted}</strong> (sai số cho phép: ±${q.tolerance || 0.01})</div>
        </div>
      `;
    }
  }
};

window.ExamResult = ExamResult;
