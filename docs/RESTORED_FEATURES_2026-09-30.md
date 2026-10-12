# Khôi phục chức năng cũ vào develop — 30/09/2026

Nguồn đối chiếu: `origin/master` tại `f0351ea`, nền hiện tại `develop` tại `e623585`.
Chuyển các màn hình còn thiếu và điều chỉnh theo API Java hiện tại; không thay toàn bộ develop bằng master vì sẽ mất các cập nhật profile, pantry, thực đơn, quản trị, refresh token và SecureStore.

## Đã khôi phục

- **Công thức → Tự chọn / nhập nguyên liệu:** tìm nguyên liệu, thêm/bỏ, chỉnh số lượng/đơn vị, nhập văn bản, chọn 5/10 kết quả, xem gợi ý và chi tiết công thức. Danh sách này không ghi vào tủ. Luồng V2 theo tủ vẫn tồn tại độc lập.
- V1 gửi `candidateRecipes` dạng object đúng `RecommendationDtos.RecommendMealCandidateRecipeRequest`, gồm ID, tên, nguyên liệu và cách nấu. Tải đủ các trang catalog. Đọc envelope AI lồng trong Java, báo lỗi response thiếu dữ liệu và không dùng recipe ID làm persisted meal ID để gọi missing-ingredients.
- **Tạo công thức:** khôi phục form cũ với tìm kiếm nguyên liệu, định lượng, đơn vị, ghi chú, mô tả, thời gian, khẩu phần, độ khó, nguồn, URL ảnh và cách nấu. Bổ sung dị ứng theo API mới, chặn gửi lặp, giữ bản nháp khi lỗi, sửa điều hướng sau khi lưu.
- Quản trị: Công thức → Tạo mới → Tạo bằng tìm kiếm nguyên liệu. Form quản trị hiện hành có upload ảnh vẫn được giữ.
- Các màn hình khôi phục dùng tiếng Việt và các API/client/session hiện hành.

## Giới hạn còn lại

- Backend hiện chỉ cho `SUPER_ADMIN`, `ADMIN`, `MANAGER` tạo catalog recipe. Form được phục hồi cho khách hàng xem nhưng báo thiếu quyền và khóa lưu; không đổi role, không nới quyền backend. Muốn khách hàng tạo công thức thật cần bổ sung chính sách/API công thức người dùng ở backend.
- Không đưa lại cách đăng nhập Google/Facebook cũ dùng provider access token làm JWT Java. Backend được kiểm tra chưa có endpoint exchange/verify tương ứng. OAuth chưa hoạt động end-to-end.
- Chưa chạy kiểm thử backend/AI thật, Android hoặc iOS trong lần này. Kết quả mock không khẳng định các lỗi tích hợp cũ đã được sửa.
- `origin/master` được chuyển chức năng có chọn lọc, không merge toàn bộ lịch sử. Stash cũ không bị áp dụng hay xóa.

## Kiểm tra

- TypeScript: `npm run typecheck`.
- Contract: `npm run test:api` — 33 bài kiểm tra, gồm request V1, nested AI response và lỗi response.
- Web export: `npm run build`.
- Giao diện web: `tests/restored-flows.web.cjs`, Chrome headless, API mô phỏng. Bao phủ chọn/nhập nguyên liệu, phân trang catalog, AI lỗi/thử lại/chi tiết, quyền tạo công thức, admin lưu lỗi/thử lại/dị ứng và V2.

Chạy UI test sau khi export web bằng `node tests/restored-flows.web.cjs`. Cần Playwright và Chrome; nếu Playwright không nằm trong Node module path, đặt `PLAYWRIGHT_MODULE` thành đường dẫn module đã cài. Test chỉ gọi API mô phỏng, không thay đổi dữ liệu server.
