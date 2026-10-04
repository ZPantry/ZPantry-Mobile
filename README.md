# Z-Pantry Meal Planner

Frontend Expo SDK 56 (React Native + React Navigation), chạy trên Android, iOS và web.

## Chạy dự án

```powershell
npm install
Copy-Item .env.example .env
npm run web
```

Nếu đã có `.env`, giữ lại cấu hình Google OAuth. Backend mặc định: `https://zpantry-java-backend.onrender.com`. Để dùng Java local, đổi `EXPO_PUBLIC_API_BASE_URL` thành `http://localhost:8080` và `EXPO_PUBLIC_ANDROID_API_BASE_URL` thành `http://10.0.2.2:8080` cho Android emulator.

`npm run start` mở Metro. Google Sign-In trên native cần development build và cấu hình client ID theo `app.config.js`.

## Luồng chính

- Đăng ký → xác thực email → đăng nhập; quên mật khẩu → OTP → đặt mật khẩu mới.
- Hồ sơ ăn uống v2 → gợi ý theo hồ sơ, tủ hoặc tự chọn nguyên liệu.
- Kho thực phẩm → thêm thủ công, văn bản, ảnh/hóa đơn tự nhận diện hoặc nguyên liệu từ thực đơn → kiểm tra → xác nhận lưu.
- Công thức → đối chiếu lượng trong tủ → chọn ngày, bữa, khẩu phần, ghi chú → thực đơn → ảnh thành phẩm, đánh giá → nhật ký nấu ăn.
- Quản trị theo vai trò → danh mục nguyên liệu/công thức, dị ứng, tên gọi khác; Admin/Super Admin quản lý người dùng và vai trò theo cấp quyền.

## Kiểm tra

```powershell
npm run typecheck
npm run test:api
npm run build
# Cần Playwright và Chrome; có thể đặt PLAYWRIGHT_MODULE thành đường dẫn module.
node tests/swagger-flows.web.cjs
```

Browser tests dùng phản hồi API giả lập, không thay đổi backend Render. Ảnh kiểm tra và kết quả nằm trong `work/swagger-review-2026-10-04/`.

Xem [đối chiếu API và giới hạn kiểm chứng](docs/api-sync-2026-10-04.md). Swagger là nguồn contract; API có dữ liệu dạng mở vẫn cần kiểm tra bằng tài khoản thật và dữ liệu thực tế.
