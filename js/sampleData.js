// Azota Toán - Dữ liệu mẫu chuẩn (Đề thi 3 phần + 3 học sinh + Lịch sử bài nộp)
const SampleData = {
  // 1. DANH SÁCH HỌC SINH MẪU
  students: [
    {
      id: 'hs_001',
      name: 'Nguyễn Văn An',
      class: '12A1',
      username: 'nguyenan',
      passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '123456'
      mustChangePassword: false,
      status: 'active',
      createdAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: 'hs_002',
      name: 'Lê Thị Hoa',
      class: '12A1',
      username: 'lehoa',
      passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '123456'
      mustChangePassword: false,
      status: 'active',
      createdAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: 'hs_003',
      name: 'Trần Minh Quân',
      class: '12A2',
      username: 'tranminh',
      passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '123456'
      mustChangePassword: true, // Thử nghiệm đổi mật khẩu lần đầu
      status: 'active',
      createdAt: '2026-11-01T08:00:00.000Z'
    }
  ],

  // 2. ĐỀ THI MẪU CHUẨN KỲ THI GDPT 2018 (3 PHẦN TOÁN HỌC)
  exams: [
    {
      id: 'exam_sample_12hk1',
      title: 'Đề Khảo Sát Toán 12 - Học Kỳ 1 (Chuẩn GDPT 2018)',
      classGroup: 'Khối 12',
      assignedClasses: ['12A1', '12A2'],
      durationMinutes: 45,
      scale: 10,
      allowRetake: 2,
      shuffleQuestions: true,
      shuffleChoices: true,
      viewScoreMode: 'immediate', // Cho xem điểm ngay sau khi nộp
      viewAnswerMode: 'immediate', // Cho xem đáp án & hướng dẫn giải ngay
      openTime: new Date(Date.now() - 3600000 * 24).toISOString(), // Mở từ hôm qua
      dueTime: new Date(Date.now() + 3600000 * 24 * 7).toISOString(), // Còn hạn 7 ngày
      antiCheat: {
        maxTabSwitches: 3,
        autoSubmitOnExcess: true,
        disableContextMenu: true,
        disableCopy: true
      },
      questions: [
        // ================= PHẦN 1: TRẮC NGHIỆM 4 LỰA CHỌN =================
        {
          id: 'q1',
          part: 1,
          questionNumber: 1,
          content: 'Cho hàm số $y = f(x)$ có bảng biến thiên dưới đây. Điểm cực đại của đồ thị hàm số là:\n$f\'(x)$ đổi dấu từ dương sang âm tại $x = 1$, với $f(1) = 3$.',
          options: [
            { id: 'A', text: '$x = 1$' },
            { id: 'B', text: '$(1; 3)$' },
            { id: 'C', text: '$y = 3$' },
            { id: 'D', text: '$(3; 1)$' }
          ],
          correctAnswer: 'B',
          explanation: 'Điểm cực đại của **đồ thị** hàm số có tọa độ là cặp $(x; y)$, do đó điểm cần tìm là $(1; 3)$. (Lưu ý: $x = 1$ là điểm cực đại của hàm số, $y = 3$ là giá trị cực đại).',
          points: 0.25
        },
        {
          id: 'q2',
          part: 1,
          questionNumber: 2,
          content: 'Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{2x - 3}{x + 1}$ có phương trình là:',
          options: [
            { id: 'A', text: '$x = -1$' },
            { id: 'B', text: '$y = 2$' },
            { id: 'C', text: '$x = 1$' },
            { id: 'D', text: '$y = -3$' }
          ],
          correctAnswer: 'A',
          explanation: 'Mẫu số $x + 1 = 0 \\iff x = -1$. Vì tử số tại $x = -1$ là $-5 \\neq 0$, nên đường thẳng $x = -1$ là tiệm cận đứng.',
          points: 0.25
        },
        {
          id: 'q3',
          part: 1,
          questionNumber: 3,
          content: 'Cho khối chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = a$, $BC = 2a$. Cạnh bên $SA$ vuông góc với mặt đáy và $SA = 3a$. Thể tích $V$ của khối chóp đã cho bằng:',
          options: [
            { id: 'A', text: '$2a^3$' },
            { id: 'B', text: '$a^3$' },
            { id: 'C', text: '$6a^3$' },
            { id: 'D', text: '$\\frac{a^3}{3}$' }
          ],
          correctAnswer: 'B',
          explanation: 'Diện tích đáy: $S_{\\Delta ABC} = \\frac{1}{2}AB \\cdot BC = \\frac{1}{2} \\cdot a \\cdot 2a = a^2$. Chiều cao $h = SA = 3a$. Thể tích $V = \\frac{1}{3} S_{ABC} \\cdot SA = \\frac{1}{3} a^2 \\cdot 3a = a^3$.',
          points: 0.25
        },
        {
          id: 'q4',
          part: 1,
          questionNumber: 4,
          content: 'Tìm tập xác định $D$ của hàm số $y = (x - 2)^{\\sqrt{3}}$.',
          options: [
            { id: 'A', text: '$D = \\mathbb{R} \\setminus \\{2\\}$' },
            { id: 'B', text: '$D = [2; +\\infty)$' },
            { id: 'C', text: '$D = (2; +\\infty)$' },
            { id: 'D', text: '$D = \\mathbb{R}$' }
          ],
          correctAnswer: 'C',
          explanation: 'Vì số mũ $\\sqrt{3}$ là số vô tỉ (không nguyên), nên hàm số lũy thừa $y = u^\\alpha$ xác định khi và chỉ khi $u > 0 \\iff x - 2 > 0 \\iff x > 2$.',
          points: 0.25
        },

        // ================= PHẦN 2: TRẮC NGHIỆM ĐÚNG / SAI =================
        {
          id: 'q5',
          part: 2,
          questionNumber: 5,
          content: 'Cho hàm số bậc ba $y = f(x) = x^3 - 3x^2 + 2$. Xét tính đúng/sai của các mệnh đề sau:',
          subItems: [
            { id: 'a', text: 'Hàm số đồng biến trên khoảng $(2; +\\infty)$', correct: true },
            { id: 'b', text: 'Điểm cực tiểu của đồ thị hàm số là $(2; -2)$', correct: true },
            { id: 'c', text: 'Giá trị lớn nhất của hàm số trên đoạn $[0; 3]$ bằng $5$', correct: false },
            { id: 'd', text: 'Phương trình $x^3 - 3x^2 + 2 = 0$ có đúng 3 nghiệm thực phân biệt', correct: true }
          ],
          explanation: 'Ta có $y\' = 3x^2 - 6x = 3x(x - 2) = 0 \\iff x = 0$ hoặc $x = 2$.\n- $y\' > 0$ trên $(-\\infty; 0)$ và $(2; +\\infty) \\implies$ ý a ĐÚNG.\n- Tại $x = 2 \\implies y = 2^3 - 3(4) + 2 = -2 \\implies$ cực tiểu là $(2; -2) \\implies$ ý b ĐÚNG.\n- Trên $[0; 3]$: $f(0) = 2, f(2) = -2, f(3) = 2$. Giá trị lớn nhất là $2 \\neq 5 \\implies$ ý c SAI.\n- Đồ thị cắt trục $Ox$ tại 3 nghiệm phân biệt $x = 1, x = 1 \\pm \\sqrt{3} \\implies$ ý d ĐÚNG.',
          points: 1.0
        },
        {
          id: 'q6',
          part: 2,
          questionNumber: 6,
          content: 'Trong không gian với hệ tọa độ $Oxyz$, cho mặt phẳng $(P): 2x - y + 2z - 6 = 0$ và điểm $A(1; 2; 3)$.',
          subItems: [
            { id: 'a', text: 'Vectơ pháp tuyến của mặt phẳng $(P)$ là $\\vec{n} = (2; -1; 2)$', correct: true },
            { id: 'b', text: 'Điểm $A(1; 2; 3)$ thuộc mặt phẳng $(P)$', correct: false },
            { id: 'c', text: 'Khoảng cách từ điểm $A$ đến mặt phẳng $(P)$ bằng $\\frac{2}{3}$', correct: false },
            { id: 'd', text: 'Mặt cầu tâm $A$ tiếp xúc với $(P)$ có bán kính $R = 2$', correct: false }
          ],
          explanation: '- $\\vec{n} = (2; -1; 2) \\implies$ ý a ĐÚNG.\n- Thay tọa độ $A$: $2(1) - 2 + 2(3) - 6 = 0 \\implies A \\in (P) \\implies$ ý b SAI (vì điểm A thuộc mặt phẳng).\n- Vì $A \\in (P)$ nên khoảng cách $d(A, (P)) = 0 \\implies$ ý c và d đều SAI.',
          points: 1.0
        },

        // ================= PHẦN 3: TRẢ LỜI NGẮN (ĐIỀN SỐ) =================
        {
          id: 'q7',
          part: 3,
          questionNumber: 7,
          content: 'Tìm giá trị nhỏ nhất của hàm số $y = x + \\frac{9}{x}$ trên khoảng $(0; +\\infty)$. (Nhập kết quả dưới dạng số).',
          acceptedAnswers: ['6', '6.0', '6,0'],
          tolerance: 0.01,
          explanation: 'Áp dụng bất đẳng thức Cauchy cho hai số dương $x$ và $\\frac{9}{x}$:\n$x + \\frac{9}{x} \\ge 2\\sqrt{x \\cdot \\frac{9}{x}} = 2 \\cdot 3 = 6$.\nDấu "=" xảy ra khi $x = \\frac{9}{x} \\iff x^2 = 9 \\iff x = 3$ (nhận vì $3 > 0$). Vậy giá trị nhỏ nhất là $6$.',
          points: 0.5
        },
        {
          id: 'q8',
          part: 3,
          questionNumber: 8,
          content: 'Tính tích phân $I = \\int_{0}^{2} (2x + 1) dx$. (Chấp nhận dấu chấm hoặc phẩy thập phân).',
          acceptedAnswers: ['6', '6.0', '6,0'],
          tolerance: 0.01,
          explanation: 'Nguyên hàm của $2x + 1$ là $F(x) = x^2 + x$.\nSuy ra $I = F(2) - F(0) = (2^2 + 2) - 0 = 6$.',
          points: 0.5
        }
      ]
    }
  ],

  // 3. BÀI NỘP MẪU ĐỂ QUẢN TRỊ VIÊN XEM NGAY BIỂU ĐỒ & THỐNG KÊ
  submissions: [
    {
      id: 'sub_001',
      examId: 'exam_sample_12hk1',
      studentId: 'hs_001',
      studentName: 'Nguyễn Văn An',
      studentClass: '12A1',
      startedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      submittedAt: new Date(Date.now() - 3600000 * 5 + 1850000).toISOString(),
      durationSeconds: 1850,
      answers: {
        q1: 'B',
        q2: 'A',
        q3: 'B',
        q4: 'C',
        q5: { a: true, b: true, c: false, d: true },
        q6: { a: true, b: false, c: false, d: false },
        q7: '6',
        q8: '6,0'
      },
      score: 10.0,
      tabSwitches: 0,
      tabSwitchLogs: [],
      itemResults: {
        q1: { isCorrect: true, earnedPoints: 0.25 },
        q2: { isCorrect: true, earnedPoints: 0.25 },
        q3: { isCorrect: true, earnedPoints: 0.25 },
        q4: { isCorrect: true, earnedPoints: 0.25 },
        q5: { isFullCorrect: true, correctSubCount: 4, earnedPoints: 1.0 },
        q6: { isFullCorrect: true, correctSubCount: 4, earnedPoints: 1.0 },
        q7: { isCorrect: true, earnedPoints: 0.5 },
        q8: { isCorrect: true, earnedPoints: 0.5 }
      }
    },
    {
      id: 'sub_002',
      examId: 'exam_sample_12hk1',
      studentId: 'hs_002',
      studentName: 'Lê Thị Hoa',
      studentClass: '12A1',
      startedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      submittedAt: new Date(Date.now() - 3600000 * 3 + 2100000).toISOString(),
      durationSeconds: 2100,
      answers: {
        q1: 'A', // Chọn sai A thay vì B
        q2: 'A',
        q3: 'B',
        q4: 'C',
        q5: { a: true, b: true, c: true, d: true }, // đúng 3/4 ý
        q6: { a: true, b: true, c: false, d: false }, // đúng 3/4 ý
        q7: '6.0',
        q8: '5.5' // sai câu 8
      },
      score: 6.75,
      tabSwitches: 2,
      tabSwitchLogs: [
        'Hệ thống ghi nhận rời tab lúc 11:15:20',
        'Hệ thống ghi nhận rời tab lúc 11:28:44'
      ],
      itemResults: {
        q1: { isCorrect: false, studentAnswer: 'A', earnedPoints: 0 },
        q2: { isCorrect: true, earnedPoints: 0.25 },
        q3: { isCorrect: true, earnedPoints: 0.25 },
        q4: { isCorrect: true, earnedPoints: 0.25 },
        q5: { isFullCorrect: false, correctSubCount: 3, earnedPoints: 0.5 },
        q6: { isFullCorrect: false, correctSubCount: 3, earnedPoints: 0.5 },
        q7: { isCorrect: true, earnedPoints: 0.5 },
        q8: { isCorrect: false, studentAnswer: '5.5', earnedPoints: 0 }
      }
    }
  ]
};

window.SampleData = SampleData;
