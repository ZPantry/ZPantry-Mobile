# Thêm nhiều nguyên liệu cùng lúc

Đã đọc OpenAPI trực tiếp từ `/v3/api-docs`, lưu tại `work/openapi-bulk-live.json`. API mới: `POST /api/me/pantry/items/batch`, body `{ items: UpsertPantryItemRequest[] }`, danh sách ít nhất một phần tử, trả về danh sách `PantryItemResponse` trong envelope hiện có.

- Thêm thực phẩm cho phép tìm không dấu và chọn nhiều nguyên liệu; mỗi nguyên liệu chỉ có một dòng trong danh sách.
- Số lượng bắt đầu ở 100, cộng/trừ mỗi lần 100 theo đơn vị danh mục; mức tối thiểu 100. Có nút bỏ nguyên liệu riêng.
- Dùng `unit` của nguyên liệu, dự phòng `defaultUnit` nếu có. Không có ô nhập đơn vị. Nguyên liệu thiếu đơn vị bị vô hiệu hóa và có giải thích, không tự gán đơn vị.
- Hạn dùng theo số ngày, nơi cất và ghi chú được giữ riêng cho từng nguyên liệu. API pantry vẫn chuẩn hóa ngày sang ISO trước khi gửi.
- Nút lưu cố định dưới màn hình; gửi một request batch, khóa gửi trùng. Khi lỗi, giữ toàn bộ danh sách và hiện thông báo cạnh nút lưu để thử lại.
- Giữ nguyên chức năng sửa một nguyên liệu và các API single-item đang dùng ở màn hình khác.

Kiểm tra: TypeScript, export web, 55 bài kiểm tra API và luồng Chrome giả lập. Kiểm tra chọn hai nguyên liệu đơn vị g/ml, tìm kiếm, bỏ/chọn lại, bước 100, mức tối thiểu, thiếu đơn vị, payload batch, hạn dùng riêng và lỗi lưu rồi thử lại. Không dùng request ghi dữ liệu lên backend thật; chưa deploy hoặc thử trực tiếp trên thiết bị native.
