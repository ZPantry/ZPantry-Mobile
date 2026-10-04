# Hạn dùng, FullName và tạm ẩn nhập văn bản

- Màn hình thêm và sửa nguyên liệu dùng số ngày còn lại, ví dụ `7`. Ngày hết hạn được tính theo ngày lịch của thiết bị và hiển thị để kiểm tra. `0` là hôm nay; để trống là chưa biết hạn dùng. API vẫn nhận `expiredAt` dạng ISO thông qua bộ chuẩn hóa pantry hiện có.
- Khi sửa số lượng/ghi chú mà không sửa hạn dùng, giữ nguyên hạn dùng đã lưu, kể cả nguyên liệu đã hết hạn. Xóa hạn dùng gửi `null`.
- AuthContext tải `GET /api/users/{userId}` khi mở phiên để đồng bộ FullName vào dữ liệu người dùng. Có kiểm tra userId khi cập nhật để phản hồi của tài khoản cũ không ghi sang tài khoản mới. Trang chủ, kho và cá nhân dùng chung tên hiển thị; nếu thiếu tên hoặc tên chứa email, hiển thị “bạn”.
- Tạm bỏ lựa chọn thêm bằng văn bản ở Thêm nhanh và Kho. Route cũ với `TEXT` chuyển sang thêm bằng ảnh; màn hình không còn gọi API parse text. Giữ API helper để có thể bật lại sau. Hướng dẫn trong Cá nhân đã cập nhật theo các lựa chọn còn hoạt động.

## Kiểm tra

- `npm run typecheck`, `npm run build`: đạt.
- `npm run test:api`: 54 bài đạt, gồm ngày qua tháng/năm, năm nhuận, giá trị không hợp lệ và tên hiển thị.
- `tests/swagger-flows.web.cjs`: đạt trên Chrome với phản hồi API giả lập; kiểm tra FullName thay email cũ, nhập 7 ngày và payload ISO, sửa/xóa hạn dùng, không có lựa chọn văn bản và không gọi parse text. Các luồng UX/API trước đó vẫn đạt; không có lỗi runtime trình duyệt.
- Chưa deploy và chưa kiểm tra trực tiếp trên thiết bị iOS/Android.
