# Google Auth Integration Documentation

Tài liệu này ghi chú lại các thay đổi và cài đặt mới nhất liên quan đến việc tích hợp tính năng Đăng nhập bằng Google (Google Authentication) vào ứng dụng ZPantry Mobile.

## 1. Cập nhật biến môi trường (`.env`)

Cập nhật các mã Client ID của Google để phù hợp với dự án trên Google Cloud Console:
- Thêm mới `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` để sử dụng chung cho Web và cấu hình Native.
- Cập nhật `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` với Client ID mới dành riêng cho Android.
- Loại bỏ các Client ID không dùng đến của iOS để dọn dẹp file cấu hình.

## 2. Thêm thư viện mới (`package.json`)

Do `expo-auth-session` có một số giới hạn trên môi trường Native khi cần lấy `idToken` để gửi xuống Server (Spring Boot), dự án đã bổ sung thư viện Native Google Sign-In:
- **Thư viện:** `@react-native-google-signin/google-signin` (phiên bản `^16.1.5`).

## 3. Cấu hình App (`app.json`)

Để thư viện Google Sign-in có thể hoạt động đúng với luồng build của Expo, plugin của nó đã được thêm vào cấu hình `app.json`:
- Bổ sung `["@react-native-google-signin/google-signin/app.plugin.js"]` vào mảng `plugins`.

## 4. Tách biệt luồng xử lý Web và Native (`src/screens/LoginScreen.tsx`)

File màn hình đăng nhập đã được nâng cấp đáng kể để xử lý luồng Google Login trên đa nền tảng một cách trơn tru:

### 4.1. Khởi tạo cấu hình (Native)
Sử dụng `useEffect` để chạy `GoogleSignin.configure()` ngay khi load màn hình (chỉ áp dụng cho Native).
- **Lưu ý quan trọng**: Thuộc tính `webClientId` ở đây bắt buộc phải dùng Client ID của Web App (không dùng của Android) và bật `offlineAccess: true` để lấy được `idToken` dùng xác thực với phía Backend.

### 4.2. Cập nhật hàm `handleGoogleLogin`
Hàm xử lý sự kiện đăng nhập được chia làm 2 nhánh chính sử dụng `Platform.OS`:
- **Trên Web**: Tiếp tục sử dụng hook `useAuthRequest` (`promptGoogleAsync`) của `expo-auth-session`.
- **Trên Native (Android/iOS)**: Sử dụng phương thức `GoogleSignin.signIn()` để mở modal đăng nhập native. 
  - Đã thêm khối `try...catch` để bắt chi tiết các mã lỗi (Người dùng huỷ, Đang xử lý, Thiếu Play Services, v.v.).
  - Khi đăng nhập thành công, hệ thống sẽ trích xuất thành công `idToken` để truyền vào quá trình Login nội bộ.

### 4.3. Xử lý sau đăng nhập (Web)
Cập nhật `useEffect` xử lý kết quả trả về từ `googleResponse` của môi trường Web:
- Trích xuất thêm tham số `idToken` (nếu có) bên cạnh `accessToken`.
- Phục vụ cho bước tiếp theo là gửi thông tin token này xuống hệ thống API Spring Boot.
