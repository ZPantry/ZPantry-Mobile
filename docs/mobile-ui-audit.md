# Kiểm tra UI/UX điện thoại — 19/10/2026

## Các lỗi đã sửa

- Lưới dùng chiều rộng cửa sổ và phần trăm cột nhưng không trừ gap: đo container thật, trừ gap và giảm số cột nếu thiếu chỗ. Thẻ cuối không tự giãn thành toàn hàng.
- Thẻ kho thực phẩm bị bó tên bởi ảnh, nhãn hạn dùng và cụm số lượng: trên thẻ hẹp, đặt nhãn dưới tên và đưa thao tác số lượng xuống hàng riêng. Vùng chạm tăng/giảm/xóa là 48 × 48.
- Form đăng nhập có quá nhiều lớp lề trên điện thoại: giảm lề và padding; cho hàng tùy chọn/đăng ký xuống dòng; ô nhập dùng cỡ chữ 16.
- AppInput ghi đè style của nơi sử dụng: giữ style riêng cho ô nhiều dòng, kích thước và bề mặt; vẫn có viền focus.
- Một số form thiếu tránh bàn phím: thêm KeyboardSafeView cho form tài khoản, hồ sơ, nguyên liệu, nhập kho, gợi ý thủ công và quản trị/công thức.
- Android edge-to-edge che nút dù manifest có adjustResize: KeyboardSafeView dùng height trên Android, padding trên iOS và đo vị trí phía trên của container để tính offset.
- Hộp thoại xác nhận vượt màn hình thấp: backdrop có safe area và vùng cuộn. Áp dụng cho đăng xuất, xóa kho, xóa chi tiết, xóa quản trị và thông báo tính năng.
- Safe area bị lặp dưới thanh tab hoặc trên màn hình đã có header: loại bỏ inset thừa, bổ sung bảo vệ hai bên cho màn hình chính/header.
- Thanh điều hướng quá chật ở chiều rộng trung bình: giữ thanh dưới cho chiều rộng dưới 840; nhãn tab cho phép hai dòng; ẩn thanh dưới khi bàn phím native mở.
- Nhãn tháng bị cắt trong ba ô ngày/tháng/năm: giá trị tháng dùng số hai chữ số; đồng bộ khi xóa ngày từ bên ngoài.
- Nút AI nổi trên trang chủ che nội dung khi màn hình hẹp: chuyển thành nút có nhãn rõ trong luồng cuộn, ngay dưới khối khám phá món.
- SearchBar hiển thị nút tìm nhưng không có handler: chỉ hiện nút khi có hành động; tìm trực tiếp khi gõ vẫn hoạt động.

## Đã kiểm tra

- Đọc tài liệu Expo SDK 56 trước khi sửa: https://docs.expo.dev/versions/v56.0.0/.
- TypeScript: `npm run typecheck`.
- API và chat: `npm run test:api`, 62/62 đạt.
- Xuất bản web cục bộ: `npm run build`.
- `tests/mobile-layout.web.cjs`: Chrome với API giả lập, không dùng tài khoản hay ghi dữ liệu thật. Chiều rộng 320/390/430/740/1024; bốn tab chính; tên và email dài; hình học hai cột; nút số lượng 48px; hộp thoại đăng xuất màn hình ngang thấp; tám màn hình phụ; chọn tháng; form đăng nhập/đăng ký 320px. Ảnh ở `scratch/mobile-ui/`.
- Android emulator, bản development SDK 56: mở giới thiệu và đăng nhập; focus mật khẩu với bàn phím thật; cuộn đến nút đăng nhập; chạm khi bàn phím mở hiển thị “Vui lòng nhập email.”. Ảnh sau sửa: `scratch/mobile-ui/android-keyboard-fixed.png`.

Chạy kiểm tra bố cục sau `npm run build`: `node tests/mobile-layout.web.cjs`. Nếu Playwright không có trên NODE_PATH, đặt PLAYWRIGHT_MODULE tới thư mục package Playwright đã cài.

## Giới hạn xác minh

Chưa chạy iOS, chưa kiểm tra mọi mức cỡ chữ hệ thống hoặc mọi thiết bị. Các màn hình sau đăng nhập được kiểm tra trong Chrome bằng dữ liệu giả lập; chưa đi qua chúng trên Android với tài khoản thật. Kết quả này không phải cam kết toàn bộ ứng dụng không còn lỗi.

Bộ `tests/restored-flows.web.cjs` cũ dừng ở selector nhãn tab “Công thức”, trong khi giao diện hiện dùng “Khám phá”. Không tính bộ này là đạt; kiểm tra bố cục mới dùng vai trò tab và tên route hiện tại.
