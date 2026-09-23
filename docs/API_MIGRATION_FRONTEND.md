# Đối chiếu API frontend — 2026-09-23

Nguồn: `API_MIGRATION (1).md` do người dùng cung cấp. Đây là báo cáo thay đổi
frontend, không phải chứng nhận backend Java đã tương thích hoặc đã triển khai production.

## Cách áp dụng tài liệu

- MIG-001–003 là ví dụ: không áp dụng `/api/v1`, numeric ID, `username` hay đổi DTO đăng ký.
- MIG-004: giữ UUID và `/api/users`; áp dụng owner-only PUT theo cập nhật được chấp thuận ngày 19/09.
  Phần ghi chú cũ về owner PUT luôn 403 là bằng chứng lỗi legacy, không phải hành vi đích của Java.
- MIG-005: giữ nguyên `/api/Auth` và request fields hiện tại. Trạng thái backend là
  `IMPLEMENTED_NOT_VERIFIED`, chưa phải chứng nhận production.
- MIG-006: file nguồn chỉ tham chiếu `docs/ENDPOINT_COVERAGE.md`, không chứa bảng route/DTO.
  Các API liên quan được gom vào registry nhưng giữ nguyên contract đang dùng.

## Các đường dẫn frontend đang gọi

Nguồn tập trung: `src/api/endpoints.ts`. Query phân trang vẫn là `pageIndex`/`pageSize`, bắt đầu từ 1.

| Nhóm | Method và route | Mức đối chiếu |
|---|---|---|
| Auth | POST `/api/Auth/register`, `/api/Auth/verify-otp`, `/api/Auth/login`, `/api/Auth/refresh-token`, `/api/Auth/logout` | Đường dẫn khớp MIG-005; chưa kiểm tra backend trực tiếp |
| User | GET `/api/users`; GET/PUT/DELETE `/api/users/{id}` | Khớp MIG-004; PUT chỉ dành cho chủ tài khoản |
| Ingredient | GET `/api/ingredients`, GET/DELETE `/api/ingredients/{id}`; POST `/api/v2/ingredients`; PUT `/api/v2/ingredients/{id}` | Giữ contract frontend; chờ coverage của MIG-006 |
| Recipe | GET `/api/recipes`, GET/DELETE `/api/recipes/{id}`; POST `/api/v2/recipes`; PUT `/api/v2/recipes/{id}` | Giữ contract frontend; chờ coverage của MIG-006 |
| Pantry | GET `/api/me/pantry`; POST `/api/me/pantry/items`; PUT/DELETE `/api/me/pantry/items/{id}` | Giữ contract frontend; chờ coverage của MIG-006 |
| Recommendation | POST `/api/recommendations/meals`; GET `/api/recommendations/meals/{id}/missing-ingredients` | Giữ contract frontend; chờ coverage của MIG-006 |
| Today menu | GET `/api/me/today-menu?date=...`; POST `/api/me/today-menu/items`; GET/DELETE `/api/me/today-menu/items/{id}`; POST `/api/me/today-menu/items/{id}/complete` | Giữ contract frontend; chờ coverage của MIG-006 |
| Cooking log | GET `/api/me/cooking-logs` | Giữ contract frontend; chờ coverage của MIG-006 |

Không thêm API media riêng: ảnh vẫn gửi multipart qua các API hiện có.

## Thay đổi đã thực hiện

- Gom đường dẫn vào `endpoints.ts`; encode ID khi tạo path.
- Tách transport (`client.ts`), response mapping (`response.ts`) và cấu hình host (`baseUrl.ts`).
- Sửa URL localhost Android bị mất scheme khi biến môi trường không có `http://`.
- User response cho phép `fullName`, `avatarUrl`, `updatedAt` nullable.
- User update chỉ gửi `fullName`, `avatarUrl`, `password`; hỗ trợ omitted/null.
- Form chỉ gửi trường thay đổi, không trim tên/avatar/password, không biến null chưa sửa thành chuỗi rỗng.
- Ẩn sửa user khác trong quản trị; kiểm tra chủ tài khoản lần nữa trước khi lưu.
  Đây chỉ là bảo vệ giao diện, backend vẫn phải xác thực và phân quyền.
- Giữ xử lý HTTP 200 với `success=false` thành lỗi, kể cả detail thiếu hoặc delete lặp lại.
- Giữ thông điệp của command success có `data=null`; không ép response HTTP rỗng thành đối tượng.
- Pagination hỗ trợ `totalPages=0` và giữ metadata của trang ngoài phạm vi; `items`/`totalCount`
  là alias nội bộ tương thích frontend, không phải field backend mới.
- Hiển thị thông báo khi HTTP 401/403 không có body; hỗ trợ lỗi validation dạng mảng hoặc object.
- Logout tự gắn bearer đang lưu nếu không truyền token tường minh.
- Timeout bao gồm đọc response body; dọn listener hủy request; hỗ trợ Headers đầu vào.

## Kiểm tra

Chạy `npm run test:api`, `npm run typecheck`, `npm run build`.

Các test dùng dữ liệu tổng hợp và fetch giả lập. Chúng kiểm tra client, không phải fixture
thu thập từ legacy hay bằng chứng parity của backend Java. Chưa thực hiện đăng nhập,
PUT/DELETE hoặc upload vào backend đang triển khai.

## Phần cần dữ liệu backend để tiếp tục

- Cung cấp `docs/ENDPOINT_COVERAGE.md` và OpenAPI/DTO của MIG-006 để xác nhận toàn bộ route và multipart fields.
- Cung cấp URL môi trường Java thử nghiệm trước khi đổi `EXPO_PUBLIC_API_BASE_URL`.
  Biến này là host/base deployment path, không tự thêm `/api` hay `/api/v1`.
- Kiểm thử với tài khoản thử nghiệm: owner PUT thành công, admin-other PUT 403,
  missing-user envelope, refresh token rotation và toàn bộ flow pantry → hoàn thành món.
- Tài liệu vẫn ghi production cutover bị chặn bởi catalog/revocation liên backend.
  Refactor frontend này không giải quyết hoặc chứng nhận các điều kiện phía server đó.
