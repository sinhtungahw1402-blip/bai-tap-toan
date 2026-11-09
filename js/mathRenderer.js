// Azota Toán - KaTeX Math Renderer & Math Equation Helper
const MathRenderer = {
  // Chuyển đổi văn bản chứa cú pháp LaTeX ($...$ hoặc $$...$$) thành HTML an toàn
  renderToString(rawText) {
    if (!rawText) return '';
    if (typeof katex === 'undefined') {
      // Fallback nếu KaTeX chưa tải xong
      return String(rawText).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    let text = String(rawText);

    // Xử lý display math $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false
        });
      } catch (err) {
        return `<span class="text-red-500 font-mono">[Lỗi công thức: ${formula}]</span>`;
      }
    });

    // Xử lý inline math $...$ (không trùng dấu $ của giá tiền hay ký tự escape)
    text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false
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
    { label: 'véc-tơ', tex: '\\vec{u}', title: 'Véc-tơ' },
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

window.MathRenderer = MathRenderer;
