# 🎓 AZOTA TOÁN - NỀN TẢNG KHẢO SÁT & THI TOÁN TRỰC TUYẾN CHUẨN GDPT 2018

Ứng dụng web PWA làm bài kiểm tra Toán theo định dạng thi mới của Bộ Giáo dục (3 phần: Trắc nghiệm 4 lựa chọn, Đúng/Sai 4 ý và Trả lời ngắn điền số), tích hợp hiển thị công thức **KaTeX/LaTeX**, chấm điểm tự động bảo mật, xuất/nhập Excel hàng loạt bằng **SheetJS**, biểu đồ phổ điểm trực quan và **cơ chế khóa 1 thiết bị duy nhất cho Quản trị viên**.

---

## 🚀 1. HƯỚNG DẪN CHẠY THỬ NGAY (KHÔNG CẦN CÀI ĐẶT THÊM GÌ)

Dự án được tối ưu hóa để chạy trực tiếp trên Windows bằng máy chủ PowerShell có sẵn:

1. Mở thư mục dự án tại đường dẫn:
   ```
   C:\Users\TUNG\.gemini\antigravity\scratch\azota-toan
   ```
2. **Nhấp chuột phải** vào file `server.ps1` và chọn **Run with PowerShell** (hoặc mở cửa sổ PowerShell tại thư mục này và gõ `powershell ./server.ps1`).
3. Trình duyệt web sẽ tự động mở trang web tại địa chỉ:
   ```
   http://localhost:8080
   ```
4. **Trải nghiệm trên điện thoại (PWA):**
   - Đảm bảo điện thoại của bạn kết nối **cùng mạng Wi-Fi** với máy tính.
   - Máy chủ PowerShell sẽ hiển thị sẵn địa chỉ IP mạng nội bộ (ví dụ: `http://192.168.1.15:8080`).
   - Mở Safari (iPhone) hoặc Chrome (Android) trên điện thoại và truy cập địa chỉ trên.
   - Nhấn nút **"Thêm vào màn hình chính" (Add to Home Screen)** để cài đặt ứng dụng như app điện thoại thực thụ.

---

## 👥 2. TÀI KHOẢN MẪU CÓ SẴN ĐỂ THỬ NGHIỆM

Hệ thống đã nạp sẵn dữ liệu 1 đề thi Toán mẫu chuẩn 3 phần và 3 tài khoản học sinh:

| Vai trò | Tên đăng nhập | Mật khẩu mặc định | Trạng thái ghi chú |
| :--- | :--- | :--- | :--- |
| **Học sinh 1** | `tranminh` | `123456` | **Chưa làm bài** (Học sinh sẽ được yêu cầu đổi mật khẩu lần đầu và vào phòng thi ngay) |
| **Học sinh 2** | `nguyenan` | `123456` | **Đã nộp bài** (Điểm xuất sắc: **10.0đ**) |
| **Học sinh 3** | `lehoa` | `123456` | **Đã nộp bài** (Điểm khá: **6.75đ**, có ghi nhận 2 lần rời tab) |

---

## 🛡️ 3. THIẾT LẬP QUẢN TRỊ VIÊN LẦN ĐẦU (BẢO MẬT 1 THIẾT BỊ DUY NHẤT)

### A. Đăng ký thiết bị lần đầu:
1. Tại góc trên bên phải màn hình đăng nhập, bấm nút **"🔒 Quản trị viên"**.
2. Vì hệ thống chưa có quản trị viên, giao diện **"Thiết Lập Quản Trị Viên"** sẽ xuất hiện.
3. Nhập mật khẩu quản trị của bạn (ít nhất 6 ký tự).
4. Hệ thống sẽ:
   - Tự động sinh mã định danh duy nhất cho trình duyệt hiện tại và băm SHA-256 lưu lại.
   - Băm mật khẩu bằng SHA-256 (tuyệt đối không lưu mật khẩu dạng chữ thường).
   - Hiển thị **MÃ KHÔI PHỤC 1 LẦN** (dạng `AZOTA-XXXX-YYYY`).
5. **QUAN TRỌNG:** Hãy bấm nút **"Sao chép"** và cất giữ mã khôi phục này vào sổ tay hoặc tin nhắn cá nhân.

### B. Cơ chế ngăn chặn thiết bị lạ:
- Nếu ai đó (hoặc chính bạn) mở trình duyệt khác hoặc máy tính/điện thoại khác, dù nhập **đúng 100% mật khẩu**, hệ thống vẫn hiển thị thông báo chặn:
  > *🚫 BỊ CHẶN: Dù đúng mật khẩu, thiết bị này CHƯA ĐƯỢC ỦY QUYỀN! Hệ thống chỉ cho phép 1 thiết bị duy nhất của quản trị viên.*
- **Khóa tạm thời:** Nhập sai mật khẩu quá 5 lần sẽ khóa tài khoản trong 15 phút.

### C. Cách chuyển quyền sang máy mới khi đổi máy:
1. Trên máy mới, mở trang đăng nhập Quản trị viên và chọn tab **"🔄 Đổi Máy / Khôi Phục"**.
2. Nhập **Mã khôi phục 1 lần** đã lưu ở bước trên và đặt mật khẩu mới.
3. Hệ thống sẽ hủy quyền máy cũ và ủy quyền cho máy mới, đồng thời cấp một mã khôi phục mới cho lần sau.

---

## 📝 4. HƯỚNG DẪN SOẠN ĐỀ VÀ NHẬP EXCEL HÀNG LOẠT

Quản trị viên có thể tự do soạn câu hỏi theo 2 cách:

### Cách 1: Tải file mẫu Excel về và nạp lên hàng loạt:
1. Vào tab **"Ngân hàng Đề thi"** > Bấm **"📥 Tải File Mẫu Excel"**.
2. File Excel mẫu gồm các cột:
   - Cột 1: `Phần (1/2/3)` (1: Trắc nghiệm 4 lựa chọn, 2: Đúng/Sai 4 ý, 3: Trả lời ngắn điền số).
   - Cột 2: `Số câu`.
   - Cột 3: `Nội dung câu hỏi` (chứa công thức toán kẹp giữa `$công_thức$`, ví dụ `$y = \frac{2x-1}{x+3}$`).
   - Cột 4: `Link ảnh` (nếu có).
   - Cột 5-8: `Đáp án A`, `Đáp án B`, `Đáp án C`, `Đáp án D`.
   - Cột 9: `Đáp án đúng P1` (`A`, `B`, `C` hoặc `D`).
   - Cột 10-17: 4 ý `a, b, c, d` và đáp án mỗi ý (`Đ` hoặc `S`).
   - Cột 18: `Đáp án số P3` (chấp nhận nhiều đáp án phân cách bằng dấu `;`, ví dụ `6; 6.0; 6,0`).
   - Cột 19: `Sai số P3` (mặc định `0.01`).
   - Cột 20: `Hướng dẫn giải chi tiết` (hỗ trợ LaTeX).
   - Cột 21: `Điểm riêng` (để trống nếu dùng điểm mặc định).
3. Bấm **"📤 Nhập Câu Hỏi Từ Excel"** để tải file lên.
4. Hệ thống sẽ tự động quét và kiểm tra lỗi từng dòng: Nếu dòng nào thiếu đáp án, sai mã phần hay sai định dạng, hệ thống sẽ **báo rõ ràng số dòng và nguyên nhân sai** để bạn sửa.

### Cách 2: Trình soạn thảo trực quan trên web:
- Bấm **"Chỉnh sửa / Soạn bài"** > Bấm **"+ Thêm Câu Hỏi Mới"**.
- Có thanh công cụ chèn nhanh ký hiệu Toán: $\frac{a}{b}$, $\sqrt{x}$, $x^2$, $\int$, $\lim$, hệ phương trình, vectơ, v.v.
- Hộp **Xem trước công thức trực tiếp (Live LaTeX Preview)** giúp bạn thấy ngay hình thức công thức toán trước khi lưu.

---

## 📐 5. BA DẠNG CÂU HỎI VÀ THUẬT TOÁN CHẤM ĐIỂM (GDPT 2018)

1. **Phần I: Trắc nghiệm 4 lựa chọn (A, B, C, D):**
   - Học sinh chọn 1 đáp án.
   - Đúng: Được điểm câu đó (mặc định 0,25 điểm). Sai hoặc bỏ trống: 0 điểm.
2. **Phần II: Trắc nghiệm Đúng/Sai (mỗi câu 4 ý a, b, c, d):**
   - Học sinh chọn Đúng hoặc Sai cho từng ý.
   - Tính điểm lũy tiến tiêu chuẩn kỳ thi mới:
     - Đúng 1 ý: **0,1 điểm**
     - Đúng 2 ý: **0,25 điểm**
     - Đúng 3 ý: **0,5 điểm**
     - Đúng 4 ý: **1,0 điểm**
   - Sau khi nộp hiển thị chi tiết từng ý đúng/sai.
3. **Phần III: Trả lời ngắn (điền số):**
   - Học sinh gõ số trực tiếp.
   - Tự động chuẩn hóa: chấp nhận cả dấu phẩy và dấu chấm thập phân (ví dụ `2,5` và `2.5` như nhau).
   - So sánh với danh sách đáp án chấp nhận và khoảng sai số cho phép $\pm \text{tolerance}$.

---

## 🛡️ 6. TRẢI NGHIỆM PHÒNG THI & CHỐNG GIAN LẬN

- **Đồng hồ đếm ngược:** Hiển thị thời gian thực, đổi màu khi còn dưới 5 phút và tự động nộp bài khi hết giờ.
- **Tự động lưu liên tục:** Mỗi cú click chuột đều được lưu vào LocalStorage và cơ sở dữ liệu. Mất điện, rớt mạng hoặc tắt trình duyệt khi mở lại vẫn giữ nguyên bài làm.
- **Bảng điều hướng câu hỏi:** Phân biệt 3 màu sắc: *Đã làm (Xanh lá)*, *Chưa làm (Xám)*, *Đánh dấu xem lại (Vàng có cờ)*.
- **Giám sát chuyển tab:** Khi học sinh rời cửa sổ làm bài hoặc mở tab mới, hệ thống tự động ghi nhận số lần vi phạm kèm thời điểm chính xác. Nếu bật tùy chọn thu bài tự động khi vượt quá giới hạn, bài làm sẽ tự động nộp ngay lập tức.
- **Khóa sao chép & chuột phải:** Vô hiệu hóa copy/cut và menu ngữ cảnh chuột phải trong thời gian thi.

---

## ☁️ 7. HƯỚNG DẪN TRIỂN KHAI ONLINE (CHO NGƯỜI KHÔNG RÀNH KỸ THUẬT)

Bạn có thể đưa trang web lên mạng Internet hoàn toàn miễn phí bằng một trong hai cách sau:

### Cách 1: Triển khai lên Vercel (Cực kỳ đơn giản - 2 phút)
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub hoặc Google.
2. Kéo thả thư mục `azota-toan` vào trang chủ Vercel (hoặc đẩy lên kho GitHub rồi bấm Import).
3. Nhấn **Deploy**. Sau 30 giây, bạn sẽ nhận được một đường link miễn phí (ví dụ `https://azota-toan.vercel.app`) để gửi cho học sinh toàn trường truy cập làm bài!

### Cách 2: Triển khai lên Firebase Hosting
1. Đăng nhập [Firebase Console](https://console.firebase.google.com/) và tạo một dự án mới (ví dụ: `azota-toan-online`).
2. Vào mục **Build > Firestore Database** > Tạo cơ sở dữ liệu và dán nội dung file `firestore.rules` có sẵn trong thư mục dự án vào tab Rules.
3. Vào **Project Settings**, sao chép đoạn cấu hình `firebaseConfig`.
4. Mở giao diện Quản trị viên trên web > Bấm **"🔥 Cài Đặt Firebase"** > Dán đoạn mã vào là hệ thống tự động đồng bộ dữ liệu lên Cloud trên toàn bộ máy tính và điện thoại học sinh!

---

## 🔒 8. PHÂN QUYỀN BẢO MẬT VÀ CHẤM ĐIỂM SERVER-SIDE

- **Không lộ đáp án đúng:** Khi học sinh tải đề thi, hệ thống tự động loại bỏ trường `correctAnswer`, `subItems.correct`, `acceptedAnswers` và `explanation`. Học sinh không thể F12 DevTools để xem trước đáp án.
- **Chấm điểm độc lập:** Quá trình chấm điểm được thực thi đối chiếu với đề thi gốc lưu trữ phía quản trị viên.
- **Quy tắc Firestore Rules (`firestore.rules`):** Phân chia quyền đọc/ghi nghiêm ngặt: Học sinh chỉ xem và nộp bài của chính mình; Đáp án đúng và thống kê chỉ Quản trị viên có thiết bị hợp lệ mới được truy xuất.
