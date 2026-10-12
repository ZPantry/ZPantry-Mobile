# Quyền User, thực đơn, ảnh hoàn thành và chat — 07/10/2026

## Các thay đổi

- User không còn nút hoặc route tạo công thức. Tạo/sửa/xóa catalog nguyên liệu và công thức dành cho ADMIN/SUPER_ADMIN ở cả UI và Java security. MANAGER không còn quyền catalog theo yêu cầu này; quyền thêm nguyên liệu có sẵn vào pantry vẫn giữ nguyên.
- Sau khi thêm món, mở màn stack `Plan` đúng ngày `plannedDate` và tải lại danh sách. Trước đây món được lưu cho một ngày nhưng màn thực đơn giữ ngày đang xem; `Plan` không phải tab. Màn thực đơn tiếp tục chặn phản hồi cũ khi đổi ngày.
- Hoàn thành món thành công được cập nhật ngay trên UI; nếu tải lại detail thất bại, không xóa món đã hoàn thành khỏi màn. Ảnh/ghi chú được giữ khi gửi thất bại. Cloudinary dùng multipart rõ ràng, timestamp dạng text, timeout hữu hạn và kiểm tra URL trả về. Thiếu storage trả 503 với thông báo riêng.
- Chat trước đây gọi `/api/recommendations/meals`, chỉ là xếp hạng theo nguyên liệu. Nay gọi endpoint hỏi đáp mới `/api/recommendations/chat` → AI `/ai/chat` → Gemini. Java lấy ba công thức từ ngữ cảnh của người dùng và giữ ID/cards từ catalog; model chỉ cung cấp câu trả lời. Mỗi request gồm một câu hỏi, chưa có lịch sử hội thoại gửi lên model.
- Chuẩn hóa thêm `matchingIngredients` từ V2 để kết quả hiển thị nguyên liệu khớp. HTTP 503 AI được diễn giải rõ hơn thay vì thông báo server chung.

## Kiểm chứng

- TypeScript: đạt. Frontend API tests: 59/59 đạt. Web export: đạt.
- Browser kiểm thử có phản hồi giả lập: User không thấy nút tạo công thức; thêm món ngày 05/10 rồi hiển thị đúng ngày; upload giữ dữ liệu khi lỗi và hoàn thành khi retry; chat dùng endpoint mới. Không có lỗi runtime. Chạy với `LOGIC_FIXES_ONLY=1` và `PLAYWRIGHT_MODULE` trỏ thư viện Playwright; script `tests/swagger-flows.web.cjs`. Kết quả: `work/logic-fixes-2026-10-07/results.json`.
- Java unit/wire/security: đạt (26 tests), gồm gửi multipart thật tới HTTP stub và kiểm tra USER/MANAGER bị 403 nhưng User thêm pantry được.
- AI service: 3/3 tests đạt với provider giả lập, gồm thiếu key, trả lời hợp lệ và upstream 429.
- `mvnw clean verify` không đạt vì Docker engine không khả dụng, 24 integration tests database không khởi động được. Chưa kiểm thử Android/iOS thật.
- Bộ browser cũ chạy rộng hơn tới lỗi selector `Nhập tay nguyên liệu`, trong khi UI hiện dùng `Chọn nguyên liệu thủ công`. Đây là nhánh ngoài phạm vi lần sửa; các luồng liên quan được chạy riêng và đạt.

## Triển khai để sử dụng thật

1. Deploy `D:/EXE101/ZPantry-AIService`, cấu hình `GEMINI_API_KEY`, tùy chọn `GEMINI_MODEL`.
2. Deploy `D:/EXE101/ZPantry-java-BackEnd`, cấu hình `AI_SERVICE_URL` là base URL AI không kèm `/ai`; cấu hình đủ `ZPANTRY_MEDIA_CLOUDINARY_CLOUD_NAME`, `ZPANTRY_MEDIA_CLOUDINARY_API_KEY`, `ZPANTRY_MEDIA_CLOUDINARY_API_SECRET`.
3. Deploy/restart frontend đã sửa. Không đưa secret vào `EXPO_PUBLIC_*`.
4. Dùng tài khoản kiểm thử xác minh chat trả lời, ảnh Cloudinary truy cập được, hoàn thành chỉ một lần và nhật ký/kho đúng.

Render public OpenAPI đã phản hồi 200 trong phiên này nhưng chưa gọi API có xác thực hoặc deploy lên Render. Bản sửa mã không xác nhận production đã hết HTTP 500; còn phụ thuộc cấu hình, deployment và kiểm thử thật.

Tài liệu API Gemini đã đối chiếu: https://ai.google.dev/api/generate-content và https://ai.google.dev/api. Multipart đối chiếu tài liệu Spring REST clients; Expo ImagePicker đối chiếu SDK 56.
