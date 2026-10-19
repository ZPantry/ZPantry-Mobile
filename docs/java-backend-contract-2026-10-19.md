# Đối chiếu frontend với Java backend — 2026-10-19

Nguồn kiểm tra: `D:/EXE101/ZPantry-java-BackEnd`, commit `d7bbdee`. Đọc controller, DTO, security và các service liên quan; không sửa hoặc chạy mutation vào backend. Đây là báo cáo kiểm tra frontend theo source local, không thay thế đặc tả API của backend.

## Các điểm đã sửa trên frontend

| Luồng | Contract thực tế của Java | Điều chỉnh FE |
| --- | --- | --- |
| Đầu bếp AI | `POST /api/recommendations/meals`, `inputIngredientText`, `topK`; không có `/api/recommendations/chat` | Chuyển câu nhập sang API gợi ý món có thật. Lời dẫn trong UI chỉ tóm tắt số kết quả, không giả lập câu trả lời chat của BE. |
| Nhận diện ảnh | `expectedType`: `AUTO`, `RECEIPT`, `FOOD_IMAGE` | Giữ nguyên lựa chọn AUTO thay vì đổi thành FOOD_IMAGE. Multipart có trường `image`. |
| Phân tích văn bản | `/api/me/pantry/parse` trả về `PantryImportPreviewItem`: `rawName`, `canonicalIngredientName`, `ingredientId`, `resolverStatus`, `reviewRequired`, `candidates`; text tối đa 2000 ký tự | Dùng trực tiếp preview của BE, giữ mã nguyên liệu và trạng thái cần kiểm tra; bỏ mapper cũ `name/matched`. Thay đổi API client không bật lại mục nhập văn bản đang ẩn trong UI. |
| Định lượng nguyên liệu | `IngredientResponse.defaultQuantity` | Dùng định lượng mặc định của BE cho thao tác tăng/giảm. Tiếp tục nhận `quantityStep` cũ và fallback theo đơn vị nếu không có giá trị hợp lệ. |
| Thực đơn cũ | `TodayMenuService.resolvedRecipeId`: dùng `recipeId`, nếu thiếu dùng `mealId` | Áp dụng cùng fallback khi FE tải chi tiết và khi tổng hợp nguyên liệu từ thực đơn; tính định lượng theo khẩu phần. |
| Hoàn thành món ăn | Java có thể trả success kèm warnings, ví dụ ảnh không tải lên được; `consumedIngredients` có thể không có `id`, `updatedPantryItems` chỉ gồm id/ingredientId/quantity | Giữ màn hình sau thành công có cảnh báo để người dùng đọc, khóa gửi lại, dịch cảnh báo ảnh, sửa React key và kiểu dữ liệu. Chỉ tự chuyển về thực đơn khi không có cảnh báo. |

## Các nhóm API đã đối chiếu

- Auth: register, verify OTP, login/Google, refresh, logout, forgot/reset password — đường dẫn, method, JSON và envelope khớp controller/DTO.
- Hồ sơ legacy và V2, quản lý user/role — khớp tên trường và enum; cập nhật hồ sơ cá nhân chỉ cho chính chủ theo BE. Không dùng verify OTP đăng ký để kiểm tra OTP quên mật khẩu.
- Nguyên liệu/công thức — GET/pagination, JSON create/update/delete, aliases khớp. Giữ cách viết `protenPerUnit` riêng cho JSON tạo nguyên liệu vì Java DTO hiện dùng tên này; cập nhật dùng `proteinPerUnit`. Upload ảnh trước qua `/api/media/upload`, sau đó ghi JSON để giữ được danh sách allergens, kể cả `[]`.
- Media — upload dùng `file`, xóa dùng query `publicId`; không suy diễn publicId từ URL ảnh.
- Pantry — danh sách và batch dùng các route hiện có, body `{items: [...]}`, hạn sử dụng chuyển thành timestamp; confirm import có `analysisId`, `items`, và header `Idempotency-Key`.
- Recommendations V1/V2, nguyên liệu thiếu và feedback — khớp route/method; frontend hỗ trợ nested envelope của dịch vụ AI và chỉ gửi feedback khi có recommendation ID thật.
- Thực đơn/nhật ký/dinh dưỡng — `plannedDate` là ngày ISO; complete dùng `POST multipart/form-data`, trường `imageFile`, `cookedAt` (Instant có Z/offset), `rating`, `note`. Tất cả trường complete đều tùy chọn ở BE; UI gửi thời gian từ `new Date().toISOString()`.
- Subscription — current/plans/checkout/cancel khớp controller; checkout gửi `{provider: "PAYOS"}`.
- Envelope phân trang của Java dùng `data`, `pageIndex`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage`; FE xử lý đúng dạng này.

Các kiểu upload ảnh được chuyển thành Blob chứa bytes trước khi gọi `expo/fetch`, giữ filename/MIME. Không đặt thủ công multipart boundary.

## Kiểm chứng và giới hạn

- TypeScript: `npm run typecheck`.
- 66 bài kiểm tra API/UI handler qua `npm run test:api`, gồm fixture theo DTO Java cho parse text, AUTO, multipart hoàn thành có/không ảnh, recipe fallback, cảnh báo completion và khóa gửi lặp.
- Export web: `npm run build` thành công.
- Browser tests ở chế độ `LOGIC_FIXES_ONLY=1` đã qua: quyền USER, ngày thực đơn đã chọn, upload completion lỗi/giữ draft/thử lại, xác nhận nhập ảnh; không có runtime error. Kết quả local ở `scratch/release-backend-browser/results.json`. Bộ test được cập nhật theo nhãn UI hiện tại và response ingredient-availability của Java; bỏ kiểm tra chat nổi vì component này hiện không được mount. API client gợi ý từ câu nhập được kiểm tra riêng bằng unit tests.
- Browser tests dùng API giả lập; không xác minh dịch vụ AI, Cloudinary, PayOS hoặc database triển khai.
- Chưa chạy end-to-end có tài khoản thật với backend này; source local có thể khác bản Render đang triển khai. Chưa tạo APK release mới trong lượt kiểm tra này.
- Backend giữ nguyên trạng thái Git sạch tại commit `d7bbdee`.
