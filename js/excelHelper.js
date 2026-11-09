// Azota Toán - SheetJS Excel Helper (Nhập/Xuất đề thi, Học sinh, Báo cáo thống kê)
const ExcelHelper = {
  // 1. TẠO VÀ TẢI FILE EXCEL MẪU ĐỀ THI
  downloadExamTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('Thư viện SheetJS chưa sẵn sàng!');
      return;
    }

    const headers = [
      'Phần (1/2/3)',
      'Số câu',
      'Nội dung câu hỏi (hỗ trợ LaTeX $...$)',
      'Link ảnh (nếu có)',
      'Đáp án A',
      'Đáp án B',
      'Đáp án C',
      'Đáp án D',
      'Đáp án đúng P1 (A/B/C/D)',
      'Ý a (P2)',
      'Đáp án a (Đ/S)',
      'Ý b (P2)',
      'Đáp án b (Đ/S)',
      'Ý c (P2)',
      'Đáp án c (Đ/S)',
      'Ý d (P2)',
      'Đáp án d (Đ/S)',
      'Đáp án số P3 (ngăn cách dấu ;)',
      'Sai số P3 (mặc định 0.01)',
      'Hướng dẫn giải (LaTeX)',
      'Điểm riêng (để trống nếu mặc định)'
    ];

    const sampleRows = [
      [
        1,
        1,
        'Cho hàm số $y = f(x)$ có đạo hàm $f\'(x) = x(x-1)^2(x+2)$. Số điểm cực trị của hàm số là:',
        '',
        '$1$',
        '$2$',
        '$3$',
        '$4$',
        'B',
        '', '', '', '', '', '', '', '',
        '',
        '',
        'Đạo hàm $f\'(x)$ đổi dấu $2$ lần qua $x = 0$ và $x = -2$. Điểm $x = 1$ là nghiệm bội chẵn không đổi dấu.',
        0.25
      ],
      [
        1,
        2,
        'Tìm tiệm cận ngang của đồ thị hàm số $y = \\frac{2x - 1}{x + 3}$.',
        '',
        '$y = 2$',
        '$y = -1$',
        '$x = -3$',
        '$y = -3$',
        'A',
        '', '', '', '', '', '', '', '',
        '',
        '',
        'Ta có $\\lim_{x \\to \\pm \\infty} \\frac{2x - 1}{x + 3} = 2 \\implies y = 2$.',
        0.25
      ],
      [
        2,
        3,
        'Cho hàm số bậc ba $y = x^3 - 3x + 2$. Xét tính đúng sai của các khẳng định sau:',
        '',
        '', '', '', '',
        '',
        'Hàm số đồng biến trên khoảng $(-\\infty; -1)$',
        'Đ',
        'Điểm cực đại của đồ thị là $(-1; 4)$',
        'Đ',
        'Giá trị nhỏ nhất trên đoạn $[0; 2]$ bằng $0$',
        'Đ',
        'Đồ thị hàm số không cắt trục hoành',
        'S',
        '',
        '',
        'Đạo hàm $y\' = 3x^2 - 3 = 0 \\iff x = \\pm 1$. Bảng biến thiên cho thấy cực đại tại $(-1; 4)$, cực tiểu tại $(1; 0)$.',
        1.0
      ],
      [
        3,
        4,
        'Tính giá trị của tích phân $I = \\int_{0}^{2} (2x + 1) dx$.',
        '',
        '', '', '', '',
        '',
        '', '', '', '', '', '', '', '',
        '6; 6.0; 6,0',
        0.01,
        'Nguyên hàm là $F(x) = x^2 + x$. Suy ra $F(2) - F(0) = (4 + 2) - 0 = 6$.',
        0.5
      ]
    ];

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Đặt độ rộng cột
    ws['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 45 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 },
      { wch: 25 }, { wch: 14 }, { wch: 25 }, { wch: 14 },
      { wch: 25 }, { wch: 14 }, { wch: 25 }, { wch: 14 },
      { wch: 25 }, { wch: 14 }, { wch: 40 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_De_Thi_Toan');
    XLSX.writeFile(wb, 'Mau_De_Thi_Toan_Azota.xlsx');
  },

  // 2. NHẬP VÀ KIỂM TRA LỖI FILE EXCEL ĐỀ THI TỪNG DÒNG
  parseExamExcel(dataBuffer) {
    if (typeof XLSX === 'undefined') {
      return { success: false, errors: ['Thư viện Excel chưa sẵn sàng'] };
    }

    try {
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length < 2) {
        return { success: false, errors: ['File Excel trống hoặc không có dòng dữ liệu câu hỏi'] };
      }

      const questions = [];
      const errors = [];

      // Dòng 0 là tiêu đề cột, duyệt từ dòng 1 (tức Dòng 2 trên Excel)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        // Bỏ qua dòng trống hoàn toàn
        if (!row || row.every(cell => String(cell).trim() === '')) continue;

        const partVal = parseInt(row[0], 10);
        const qNum = parseInt(row[1], 10) || (questions.length + 1);
        const content = String(row[2] || '').trim();
        const image = String(row[3] || '').trim();
        const explanation = String(row[19] || '').trim();
        const customPoints = row[20] !== '' && !isNaN(parseFloat(row[20])) ? parseFloat(row[20]) : null;

        if (![1, 2, 3].includes(partVal)) {
          errors.push(`Dòng ${rowNum}: Cột 'Phần' phải là 1 (Nhiều lựa chọn), 2 (Đúng/Sai) hoặc 3 (Trả lời ngắn). Hiện tại là '${row[0]}'.`);
          continue;
        }

        if (!content) {
          errors.push(`Dòng ${rowNum}: Nội dung câu hỏi không được để trống.`);
          continue;
        }

        if (partVal === 1) {
          // Kiểm tra phần 1
          const optA = String(row[4] || '').trim();
          const optB = String(row[5] || '').trim();
          const optC = String(row[6] || '').trim();
          const optD = String(row[7] || '').trim();
          const correct = String(row[8] || '').trim().toUpperCase();

          if (!optA || !optB || !optC || !optD) {
            errors.push(`Dòng ${rowNum}: Câu trắc nghiệm phần 1 phải có đủ 4 đáp án A, B, C, D.`);
            continue;
          }

          if (!['A', 'B', 'C', 'D'].includes(correct)) {
            errors.push(`Dòng ${rowNum}: Đáp án đúng phần 1 phải là A, B, C hoặc D. Hiện tại là '${row[8]}'.`);
            continue;
          }

          questions.push({
            id: `q_${Date.now()}_${questions.length + 1}`,
            part: 1,
            questionNumber: qNum,
            content,
            image,
            options: [
              { id: 'A', text: optA },
              { id: 'B', text: optB },
              { id: 'C', text: optC },
              { id: 'D', text: optD }
            ],
            correctAnswer: correct,
            explanation,
            points: customPoints !== null ? customPoints : 0.25
          });

        } else if (partVal === 2) {
          // Kiểm tra phần 2 (Đúng/Sai 4 ý)
          const subA = String(row[9] || '').trim();
          const ansA = String(row[10] || '').trim().toUpperCase();
          const subB = String(row[11] || '').trim();
          const ansB = String(row[12] || '').trim().toUpperCase();
          const subC = String(row[13] || '').trim();
          const ansC = String(row[14] || '').trim().toUpperCase();
          const subD = String(row[15] || '').trim();
          const ansD = String(row[16] || '').trim().toUpperCase();

          if (!subA || !subB || !subC || !subD) {
            errors.push(`Dòng ${rowNum}: Câu đúng sai phần 2 phải có đủ 4 ý a, b, c, d.`);
            continue;
          }

          const parseBool = (val) => {
            if (['Đ', 'D', 'TRUE', 'T', '1', 'ĐÚNG'].includes(val)) return true;
            if (['S', 'FALSE', 'F', '0', 'SAI'].includes(val)) return false;
            return null;
          };

          const bA = parseBool(ansA);
          const bB = parseBool(ansB);
          const bC = parseBool(ansC);
          const bD = parseBool(ansD);

          if (bA === null || bB === null || bC === null || bD === null) {
            errors.push(`Dòng ${rowNum}: Đáp án mỗi ý phần 2 phải là 'Đ' (Đúng) hoặc 'S' (Sai). Kiểm tra các cột đáp án a, b, c, d.`);
            continue;
          }

          questions.push({
            id: `q_${Date.now()}_${questions.length + 1}`,
            part: 2,
            questionNumber: qNum,
            content,
            image,
            subItems: [
              { id: 'a', text: subA, correct: bA },
              { id: 'b', text: subB, correct: bB },
              { id: 'c', text: subC, correct: bC },
              { id: 'd', text: subD, correct: bD }
            ],
            explanation,
            points: customPoints !== null ? customPoints : 1.0
          });

        } else if (partVal === 3) {
          // Kiểm tra phần 3 (Trả lời ngắn điền số)
          const ansStr = String(row[17] || '').trim();
          const tolStr = String(row[18] || '').trim();
          const tolerance = tolStr !== '' && !isNaN(parseFloat(tolStr.replace(/,/g, '.')))
            ? parseFloat(tolStr.replace(/,/g, '.'))
            : 0.01;

          if (!ansStr) {
            errors.push(`Dòng ${rowNum}: Cột 'Đáp án số P3' không được để trống.`);
            continue;
          }

          const acceptedAnswers = ansStr.split(';').map(s => s.trim()).filter(Boolean);

          questions.push({
            id: `q_${Date.now()}_${questions.length + 1}`,
            part: 3,
            questionNumber: qNum,
            content,
            image,
            acceptedAnswers,
            tolerance,
            explanation,
            points: customPoints !== null ? customPoints : 0.5
          });
        }
      }

      if (errors.length > 0) {
        return { success: false, questions, errors };
      }

      return { success: true, questions, errors: [] };
    } catch (err) {
      return { success: false, errors: ['Không thể đọc file Excel: ' + err.message] };
    }
  },

  // 3. TẠO VÀ TẢI FILE MẪU DANH SÁCH HỌC SINH
  downloadStudentTemplate() {
    if (typeof XLSX === 'undefined') return;

    const headers = ['Họ và tên', 'Lớp', 'Tên đăng nhập', 'Mật khẩu ban đầu'];
    const sample = [
      ['Nguyễn Văn An', '12A1', 'an.nv12', '123456'],
      ['Lê Thị Hoa', '12A1', 'hoa.lt12', '123456'],
      ['Trần Minh Quân', '12A2', 'quan.tm12', '123456']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Hoc_Sinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh.xlsx');
  },

  // 4. ĐỌC FILE EXCEL HỌC SINH HÀNG LOẠT
  parseStudentExcel(dataBuffer) {
    try {
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length < 2) return { success: false, errors: ['File Excel không có dữ liệu'] };

      const students = [];
      const errors = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        if (!row || row.every(c => String(c).trim() === '')) continue;

        const name = String(row[0] || '').trim();
        const className = String(row[1] || '').trim().toUpperCase();
        const username = String(row[2] || '').trim().toLowerCase();
        const password = String(row[3] || '').trim() || '123456';

        if (!name || !className || !username) {
          errors.push(`Dòng ${rowNum}: Thiếu Họ tên, Lớp hoặc Tên đăng nhập.`);
          continue;
        }

        students.push({
          id: `hs_${Date.now()}_${students.length + 1}`,
          name,
          class: className,
          username,
          initialPassword: password,
          mustChangePassword: true,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }

      return { success: errors.length === 0, students, errors };
    } catch (err) {
      return { success: false, errors: ['Lỗi đọc file: ' + err.message] };
    }
  },

  // 5. XUẤT BẢNG ĐIỂM BÀI THI RA FILE EXCEL
  exportScoreboard(examTitle, students, submissions) {
    if (typeof XLSX === 'undefined') return;

    const subMap = {};
    submissions.forEach(sub => { subMap[sub.studentId] = sub; });

    const headers = [
      'STT',
      'Họ và tên',
      'Lớp',
      'Tên đăng nhập',
      'Trạng thái',
      'Điểm số (Thang 10)',
      'Thời gian làm bài',
      'Thời điểm nộp',
      'Số lần rời tab (Vi phạm)'
    ];

    const dataRows = students.map((st, idx) => {
      const sub = subMap[st.id];
      const hasSubmitted = Boolean(sub);

      let durationText = '--';
      if (sub && sub.durationSeconds) {
        const mins = Math.floor(sub.durationSeconds / 60);
        const secs = sub.durationSeconds % 60;
        durationText = `${mins} phút ${secs} giây`;
      }

      return [
        idx + 1,
        st.name,
        st.class,
        st.username,
        hasSubmitted ? 'Đã nộp bài' : 'Chưa làm bài',
        hasSubmitted ? sub.score : '--',
        durationText,
        sub ? new Date(sub.submittedAt).toLocaleString('vi-VN') : '--',
        sub ? (sub.tabSwitches || 0) : '--'
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 16 },
      { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 22 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bang_Diem');
    const safeTitle = (examTitle || 'Bang_Diem').replace(/[^\w\s-]/gi, '_');
    XLSX.writeFile(wb, `Bang_Diem_${safeTitle}.xlsx`);
  },

  // 6. XUẤT THỐNG KÊ CHI TIẾT TỪNG CÂU HỎI
  exportQuestionAnalysis(examTitle, questions, submissions) {
    if (typeof XLSX === 'undefined') return;

    const headers = [
      'Câu số',
      'Phần',
      'Nội dung tóm tắt',
      'Số lượt trả lời',
      'Tỉ lệ đúng (%)',
      'Tỉ lệ sai (%)',
      'Đánh giá độ khó',
      'Phân bố lựa chọn (nếu có)'
    ];

    const dataRows = questions.map(q => {
      let totalAns = 0;
      let correctAns = 0;
      const dist = { A: 0, B: 0, C: 0, D: 0 };

      submissions.forEach(sub => {
        if (!sub.itemResults || !sub.itemResults[q.id]) return;
        totalAns++;
        const res = sub.itemResults[q.id];

        if (q.part === 1) {
          if (res.isCorrect) correctAns++;
          if (res.studentAnswer && dist[res.studentAnswer] !== undefined) {
            dist[res.studentAnswer]++;
          }
        } else if (q.part === 2) {
          if (res.isFullCorrect) correctAns++;
        } else if (q.part === 3) {
          if (res.isCorrect) correctAns++;
        }
      });

      const rateCorrect = totalAns > 0 ? ((correctAns / totalAns) * 100).toFixed(1) : 0;
      const rateWrong = totalAns > 0 ? (100 - parseFloat(rateCorrect)).toFixed(1) : 0;
      
      let difficulty = 'Vừa sức';
      if (parseFloat(rateCorrect) < 40) difficulty = 'Rất khó';
      else if (parseFloat(rateCorrect) < 60) difficulty = 'Khó';
      else if (parseFloat(rateCorrect) >= 85) difficulty = 'Dễ';

      let distStr = '';
      if (q.part === 1 && totalAns > 0) {
        distStr = `A: ${dist.A} | B: ${dist.B} | C: ${dist.C} | D: ${dist.D}`;
      }

      return [
        q.questionNumber,
        `Phần ${q.part}`,
        q.content.substring(0, 80).replace(/\$/g, ''),
        totalAns,
        `${rateCorrect}%`,
        `${rateWrong}%`,
        difficulty,
        distStr
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 8 }, { wch: 10 }, { wch: 45 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 25 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Thong_Ke_Cau_Hoi');
    const safeTitle = (examTitle || 'Thong_Ke').replace(/[^\w\s-]/gi, '_');
    XLSX.writeFile(wb, `Thong_Ke_Cau_Hoi_${safeTitle}.xlsx`);
  }
};

window.ExcelHelper = ExcelHelper;
