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
| Hoàn thành món ăn | Java có thể trả success kèm warnings, ví dụ ảnh không tải lên được; `consumedIngredients` có thể không có `id`, `updatedPantryItems` chỉ gồm id/ingredientId/quantity | Sau khi lưu, chuyển về thực đơn và khóa gửi lại. Theo yêu cầu UI mới, bỏ phần liệt kê trừ/thiếu nguyên liệu; chỉ thông báo ngắn khi ảnh chưa tải lên được. Kiểu dữ liệu vẫn giữ đúng contract. |

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

Upload ảnh native dùng part có `name`, `type`, `bytes()` đọc từ `expo-file-system.File` theo bộ mã hóa multipart của Expo, giữ filename/MIME. Không dùng `File.slice()` hoặc tạo RN Blob từ ArrayBuffer vì React Native không hỗ trợ. Ảnh web giữ nguyên browser File. Không đặt thủ công multipart boundary.

## Kiểm chứng và giới hạn

- TypeScript: `npm run typecheck`.
- 69 bài kiểm tra API/UI handler qua `npm run test:api`, gồm fixture theo DTO Java cho parse text, AUTO, multipart hoàn thành có/không ảnh, recipe fallback, hiển thị nhật ký đã lưu và khóa gửi lặp. Kiểm tra upload native dùng FormData patch và encoder thật từ Expo SDK đang cài; mock File không kế thừa Blob và từ chối slice như giới hạn RN, thay cho mock Node Blob trước đây.
- Export web: `npm run build` thành công.
- Browser tests ở chế độ `LOGIC_FIXES_ONLY=1` đã qua: quyền USER, ngày thực đơn đã chọn, upload completion lỗi/giữ draft/thử lại, xác nhận nhập ảnh; không có runtime error. Kết quả local ở `scratch/release-backend-browser/results.json`. Bộ test được cập nhật theo nhãn UI hiện tại và response ingredient-availability của Java; bỏ kiểm tra chat nổi vì component này hiện không được mount. API client gợi ý từ câu nhập được kiểm tra riêng bằng unit tests.
- Browser tests dùng API giả lập; không xác minh dịch vụ AI, Cloudinary, PayOS hoặc database triển khai.
- Chưa chạy end-to-end có tài khoản thật với backend này; source local có thể khác bản Render đang triển khai. Chưa tạo APK release mới trong lượt kiểm tra này.
- Backend giữ nguyên trạng thái Git sạch tại commit `d7bbdee`.

## Chẩn đoán thông báo mất kết nối khi hoàn thành món

Kiểm tra read-only ngày 2026-10-19: host trong `.env` là `https://zpantry-java-backend.onrender.com`; `/health` và GET `/api/ingredients?pageIndex=1&pageSize=1` đều trả HTTP 200 từ máy phát triển. Điều này xác nhận host truy cập được tại thời điểm kiểm tra, không chứng minh toàn bộ đường truyền Android luôn hoạt động.

Phát hiện FE dùng `File.slice()` tạo Blob từ bytes trước khi gửi request; mã RN BlobManager từ chối ArrayBuffer/ArrayBufferView. Lỗi JavaScript này lại bị UI coi là lỗi mạng vì Error không có HTTP status cũng bị quy về status 0. Đã bỏ bước slice, thêm lỗi đọc/chuẩn bị ảnh riêng và chỉ coi status 0 rõ ràng hoặc thông báo network đã biết là lỗi kết nối. Chưa xác nhận thao tác hoàn thành thật trên tài khoản người dùng sau bản sửa.

## Mở lại món đã hoàn thành

GET chi tiết thực đơn không có rating hoặc ghi chú sau khi nấu; `note` của menu là ghi chú lúc lên thực đơn. FE đọc thêm `/api/me/cooking-logs`, dò theo `todayMenuItemId` qua từng trang và dừng khi tìm thấy. Không ghép bằng recipeId vì một công thức có thể được nấu nhiều lần. Món đã hoàn thành không cần tải công thức/pantry/ingredient-availability để xem nhật ký.

Hiển thị rating và note của cooking log ở chế độ chỉ đọc, ưu tiên ảnh thành phẩm đã lưu. Nếu không có log/rating/note, hiển thị trạng thái thiếu dữ liệu thay vì tự đặt 5 sao hay lấy ghi chú lên thực đơn. Khi gửi note rỗng, FE vẫn gửi trường rỗng để Java không tự dùng lại ghi chú lên thực đơn. Không hiển thị danh sách nguyên liệu đã trừ hoặc cảnh báo không đủ để trừ sau khi hoàn thành.

Kiểm tra trình duyệt đã qua với dữ liệu giả lập: lưu 3 sao và ghi chú, mở lại món, nạp lại toàn bộ app rồi mở lại món; vẫn hiển thị đúng `3/5 sao` và ghi chú đã lưu, không hiện phần trừ/thiếu nguyên liệu hoặc nút hoàn thành lần nữa. Unit tests kiểm tra tìm log ở trang sau theo đúng todayMenuItemId và trạng thái thiếu lịch sử.
