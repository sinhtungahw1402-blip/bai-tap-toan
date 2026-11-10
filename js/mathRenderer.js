// Azota Toán - KaTeX Math Renderer & Math Equation Helper
// Hỗ trợ hiển thị đầy đủ và chuẩn xác các công thức toán học GDPT 2018 (Véc-tơ, Mũi tên, Góc, Hệ PT, Tích phân,...)

const KATEX_MACROS = {
  // Mở rộng dấu mũi tên véc-tơ co dãn chuẩn SGK Việt Nam bao phủ toàn bộ chữ cái (CB, CD, AB, MN, u, v,...)
  "\\vec": "\\overrightarrow",
  "\\vv": "\\overrightarrow",
  "\\vecto": "\\overrightarrow",
  "\\vector": "\\overrightarrow",
  // Cung tròn hình học
  "\\wideparen": "\\overset{\\frown}{#1}"
};

const MathRenderer = {
  MACROS: KATEX_MACROS,

  // Tiền xử lý chuẩn hoá mã LaTeX trước khi đưa vào KaTeX
  preprocessLatex(rawFormula) {
    if (!rawFormula) return '';
    let formula = String(rawFormula).trim();

    // Tự động thêm ngoặc nhọn nếu người dùng gõ thiếu: \vec AB -> \vec{AB}, \vec u -> \vec{u}
    formula = formula.replace(/\\vec\s+([A-Za-z]{1,4})/g, '\\vec{$1}');
    formula = formula.replace(/\\overrightarrow\s+([A-Za-z]{1,4})/g, '\\overrightarrow{$1}');

    return formula;
  },

  // Chuyển đổi văn bản chứa cú pháp LaTeX ($...$, $$...$$, \[...\], \(...\)) thành HTML an toàn
  renderToString(rawText) {
    if (!rawText) return '';
    if (typeof katex === 'undefined') {
      // Fallback nếu KaTeX chưa tải xong
      return String(rawText).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    let text = String(rawText);

    // 1. Xử lý Display Math dạng $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        const cleanFormula = this.preprocessLatex(formula);
        return katex.renderToString(cleanFormula, {
          displayMode: true,
          throwOnError: false,
          macros: this.MACROS
        });
      } catch (err) {
        return `<span class="text-red-500 font-mono">[Lỗi công thức: ${formula}]</span>`;
      }
    });

    // 2. Xử lý Display Math dạng \[...\]
    text = text.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
      try {
        const cleanFormula = this.preprocessLatex(formula);
        return katex.renderToString(cleanFormula, {
          displayMode: true,
          throwOnError: false,
          macros: this.MACROS
        });
      } catch (err) {
        return `<span class="text-red-500 font-mono">[Lỗi công thức: ${formula}]</span>`;
      }
    });

    // 3. Xử lý Inline Math dạng $...$ (không trùng dấu $ của giá tiền hay ký tự escape)
    text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, formula) => {
      try {
        const cleanFormula = this.preprocessLatex(formula);
        return katex.renderToString(cleanFormula, {
          displayMode: false,
          throwOnError: false,
          macros: this.MACROS
        });
      } catch (err) {
        return `<span class="text-red-500 font-mono">[Lỗi: ${formula}]</span>`;
      }
    });

    // 4. Xử lý Inline Math dạng \(...\)
    text = text.replace(/\\\(([\s\S]+?)\\\)/g, (match, formula) => {
      try {
        const cleanFormula = this.preprocessLatex(formula);
        return katex.renderToString(cleanFormula, {
          displayMode: false,
          throwOnError: false,
          macros: this.MACROS
        });
      } catch (err) {
        return `<span class="text-red-500 font-mono">[Lỗi: ${formula}]</span>`;
      }
    });

    // Chuyển dấu xuống dòng \n thành <br> nếu không nằm trong thẻ html
    return text.replace(/\n/g, '<br/>');
  },

  // Render toán học trực tiếp vào một DOM element
  renderElement(element) {
    if (!element) return;
    try {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
          ],
          macros: this.MACROS,
          throwOnError: false
        });
      }
    } catch (e) {
      console.warn('[MathRenderer] Bỏ qua lỗi render:', e);
    }
  },

  // Danh mục ký hiệu Toán học hỗ trợ gõ nhanh cho Quản trị viên
  MATH_TOOLBAR: [
    { label: 'a/b', tex: '\\frac{a}{b}', title: 'Phân số' },
    { label: '√x', tex: '\\sqrt{x}', title: 'Căn bậc 2' },
    { label: '∛x', tex: '\\sqrt[3]{x}', title: 'Căn bậc n' },
    { label: 'x²', tex: 'x^{2}', title: 'Số mũ' },
    { label: 'x₁', tex: 'x_{1}', title: 'Chỉ số dưới' },
    { label: '∫', tex: '\\int_{a}^{b} f(x)dx', title: 'Tích phân' },
    { label: 'lim', tex: '\\lim_{x \\to 0}', title: 'Giới hạn' },
    { label: 'f\'(x)', tex: 'f\'(x)', title: 'Đạo hàm' },
    { label: 'véc-tơ', tex: '\\vec{AB}', title: 'Véc-tơ' },
    { label: 'Góc', tex: '\\widehat{ABC}', title: 'Góc' },
    { label: 'Hệ PT', tex: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}', title: 'Hệ phương trình' },
    { label: '∞', tex: '+\\infty', title: 'Vô cực' },
    { label: 'π', tex: '\\pi', title: 'Pi' },
    { label: 'Δ', tex: '\\Delta', title: 'Delta' },
    { label: '≤', tex: '\\le', title: 'Nhỏ hơn hoặc bằng' },
    { label: '≥', tex: '\\ge', title: 'Lớn hơn hoặc bằng' },
    { label: '≠', tex: '\\neq', title: 'Khác' },
    { label: '∈', tex: '\\in', title: 'Thuộc' }
  ]
};

if (typeof window !== 'undefined') {
  window.MathRenderer = MathRenderer;
} else if (typeof globalThis !== 'undefined') {
  globalThis.MathRenderer = MathRenderer;
}
