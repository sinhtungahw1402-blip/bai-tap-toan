// Azota Toán - Grading Engine (Chuẩn GDPT 2018)
const GradingEngine = {
  // Loại bỏ toàn bộ đáp án đúng và lời giải trước khi gửi đề cho học sinh làm bài
  stripAnswersForStudent(fullExam) {
    if (!fullExam) return null;
    const sanitized = JSON.parse(JSON.stringify(fullExam));

    sanitized.questions = (sanitized.questions || []).map(q => {
      const safeQ = {
        id: q.id,
        part: q.part,
        questionNumber: q.questionNumber,
        content: q.content,
        image: q.image || '',
        points: q.points
      };

      if (q.part === 1) {
        safeQ.options = (q.options || []).map(opt => ({
          id: opt.id,
          text: opt.text
        }));
      } else if (q.part === 2) {
        safeQ.subItems = (q.subItems || []).map(sub => ({
          id: sub.id,
          text: sub.text
        }));
      } else if (q.part === 3) {
        // Không gửi acceptedAnswers hoặc tolerance
      }

      return safeQ;
    });

    return sanitized;
  },

  // Chuẩn hóa chuỗi số (chấp nhận cả dấu phẩy và dấu chấm: 2,5 -> 2.5)
  normalizeNumberString(str) {
    if (str === null || str === undefined) return '';
    return String(str).trim().replace(/,/g, '.').replace(/\s+/g, '');
  },

  // Chấm điểm bài thi (Dùng đáp án gốc từ examKey)
  gradeSubmission(examKey, studentAnswers, options = {}) {
    const questions = examKey.questions || [];
    let rawScore = 0;
    let maxRawScore = 0;
    const itemResults = {};

    questions.forEach(q => {
      const qId = q.id;
      const sAns = studentAnswers ? studentAnswers[qId] : null;

      if (q.part === 1) {
        // --- PHẦN 1: TRẮC NGHIỆM 4 LỰA CHỌN ---
        const defaultPt = q.points !== undefined && q.points !== null 
          ? Number(q.points) 
          : (examKey.partPoints?.part1 !== undefined ? Number(examKey.partPoints.part1) : 0.25);
        maxRawScore += defaultPt;

        const isCorrect = sAns && String(sAns).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
        const earned = isCorrect ? defaultPt : 0;
        rawScore += earned;

        itemResults[qId] = {
          part: 1,
          questionNumber: q.questionNumber,
          studentAnswer: sAns || '',
          correctAnswer: q.correctAnswer,
          isCorrect,
          earnedPoints: earned,
          maxPoints: defaultPt,
          explanation: q.explanation || ''
        };

      } else if (q.part === 2) {
        // --- PHẦN 2: ĐÚNG / SAI (4 Ý a, b, c, d) ---
        // Quy tắc chấm:
        // • Đúng 1 ý: 0.1 điểm (10% điểm câu)
        // • Đúng 2 ý: 0.25 điểm (25% điểm câu)
        // • Đúng 3 ý: 0.5 điểm (50% điểm câu)
        // • Đúng 4 ý: 1.0 điểm (100% điểm câu)
        // • Không làm hoặc sai cả 4: 0 điểm
        const defaultMaxPt = q.points !== undefined && q.points !== null 
          ? Number(q.points) 
          : (examKey.partPoints?.part2 !== undefined ? Number(examKey.partPoints.part2) : 1.0);
        maxRawScore += defaultMaxPt;

        const subItems = q.subItems || [];
        let correctSubCount = 0;
        let answeredSubCount = 0;
        const subDetails = {};

        subItems.forEach(sub => {
          const subAns = sAns ? sAns[sub.id] : undefined;
          const expected = Boolean(sub.correct);
          const hasAnswered = typeof subAns === 'boolean';
          if (hasAnswered) answeredSubCount++;
          const isMatch = hasAnswered && (subAns === expected);

          if (isMatch) correctSubCount++;

          subDetails[sub.id] = {
            text: sub.text,
            studentAnswer: hasAnswered ? subAns : null,
            expectedAnswer: expected,
            isMatch
          };
        });

        // Điểm lũy tiến theo số ý đúng:
        let baseEarned = 0;
        if (correctSubCount === 1) baseEarned = 0.1;
        else if (correctSubCount === 2) baseEarned = 0.25;
        else if (correctSubCount === 3) baseEarned = 0.5;
        else if (correctSubCount === 4) baseEarned = 1.0;
        else baseEarned = 0; // Chưa làm hoặc sai hết = 0 điểm tuyệt đối

        // Nếu câu có điểm tối đa tùy chỉnh thì tính tỉ lệ theo điểm của câu
        const earned = correctSubCount > 0 ? Number(((baseEarned / 1.0) * defaultMaxPt).toFixed(3)) : 0;
        rawScore += earned;

        itemResults[qId] = {
          part: 2,
          questionNumber: q.questionNumber,
          correctSubCount,
          answeredSubCount,
          subDetails,
          earnedPoints: earned,
          maxPoints: defaultMaxPt,
          isFullCorrect: correctSubCount === 4,
          isCorrect: correctSubCount === 4,
          explanation: q.explanation || ''
        };

      } else if (q.part === 3) {
        // --- PHẦN 3: TRẢ LỜI NGẮN (ĐIỀN SỐ) ---
        const defaultPt = q.points !== undefined && q.points !== null 
          ? Number(q.points) 
          : (examKey.partPoints?.part3 !== undefined ? Number(examKey.partPoints.part3) : 0.5);
        maxRawScore += defaultPt;

        const sNorm = this.normalizeNumberString(sAns);
        const sVal = parseFloat(sNorm);
        const tolerance = q.tolerance !== undefined && q.tolerance !== null ? Number(q.tolerance) : 0.01;

        // Danh sách các đáp án được chấp nhận (ngăn cách bởi dấu ;)
        const accepted = (q.acceptedAnswers || []).map(a => this.normalizeNumberString(a));
        
        let isCorrect = false;
        if (sNorm !== '') {
          // 1. So khớp chuỗi chính xác
          if (accepted.includes(sNorm)) {
            isCorrect = true;
          } else if (!isNaN(sVal)) {
            // 2. So khớp số thực với sai số cho phép
            for (const acc of accepted) {
              const accVal = parseFloat(acc);
              if (!isNaN(accVal) && Math.abs(sVal - accVal) <= tolerance) {
                isCorrect = true;
                break;
              }
            }
          }
        }

        const earned = isCorrect ? defaultPt : 0;
        rawScore += earned;

        itemResults[qId] = {
          part: 3,
          questionNumber: q.questionNumber,
          studentAnswer: sAns || '',
          acceptedAnswers: q.acceptedAnswers || [],
          isCorrect,
          earnedPoints: earned,
          maxPoints: defaultPt,
          explanation: q.explanation || ''
        };
      }
    });

    // Quy đổi về thang điểm 10 (hoặc thang điểm tùy chọn của bài)
    const scale = options.scale || examKey.scale || 10;
    const finalScore = maxRawScore > 0 ? Number(((rawScore / maxRawScore) * scale).toFixed(2)) : 0;

    return {
      rawScore: Number(rawScore.toFixed(3)),
      maxRawScore: Number(maxRawScore.toFixed(3)),
      finalScore,
      scale,
      itemResults
    };
  }
};

window.GradingEngine = GradingEngine;
