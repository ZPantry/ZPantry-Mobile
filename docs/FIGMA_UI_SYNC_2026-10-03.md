# Đồng bộ giao diện Z Pantry — 03/10/2026

Đã cập nhật các màn hình hiện có theo [Figma Z Pantry](https://www.figma.com/design/GnukHGzE3ozMiYBoFGYSwj/Z-Pantry?node-id=0-1), giữ React Navigation, API client, phiên đăng nhập, token refresh và các chức năng sẵn có. Không sửa backend.

| Màn hình | Frame tham chiếu |
| --- | --- |
| Giới thiệu | 622:1229 |
| Đăng nhập | 649:1149 |
| Đăng ký | 649:1365 |
| Khẩu vị và thể trạng | 649:1449 |
| Trang chủ | 651:2144 |
| Kho thực phẩm | 652:3007 |
| Khám phá | 666:1180 |
| Cá nhân | 649:933 |

180 file PNG/SVG gốc được lưu trong `assets/figma`. `manifest.json` ghi frame, node, tên và kích thước; `src/constants/figmaAssets.ts` cung cấp các asset cục bộ. Logo, ảnh đĩa thức ăn giới thiệu, mascot, avatar mặc định, icon Google, các icon form, khảo sát và tab bar sử dụng bản xuất từ Figma. SVG được hiển thị bằng `expo-image`, không vẽ lại hoặc đổi màu. Phông Inter, Be Vietnam Pro và Plus Jakarta Sans được đóng gói cục bộ.

## Đăng nhập

- Bỏ đường dẫn “đã đăng ký, nhập mã xác thực” khỏi login. Xác thực OTP sau đăng ký vẫn được giữ theo API.
- Chỉ còn nút Google; gỡ `react-native-fbsdk-next`, plugin, biến cấu hình Facebook và các khai báo Facebook còn sót trong Android manifest/resources.
- Bổ sung xác nhận mật khẩu; điều khoản đăng ký mặc định chưa được chọn. Login không bị chặn bởi checkbox điều khoản đang ẩn.
- Google Android dùng SDK native; chỉ gửi `idToken` tới API Java `/api/Auth/google`, sau đó dùng phiên do backend trả về. Hủy đăng nhập không tạo lỗi; lỗi Play Services và cấu hình Android có thông báo riêng.

## Google Android: cấu hình và cách chạy

`.env` đã có `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=230462808538-af67j59ul5bg1jb8ipk6tv0ui2lronk6.apps.googleusercontent.com`. Client ID này đã xuất hiện trong bundle web mới; đây là Client ID công khai, không phải client secret.

Google Cloud cần có OAuth client Android trong cùng project, với:

- Package: `com.zpantry.app`.
- SHA-1 của bản debug hiện tại: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Backend Java phải chấp nhận audience của Web Client ID trên. Chữ ký release/Google Play có SHA-1 riêng.

Android Client ID hiện có trong `.env` bắt đầu `639422518700`, trong khi Web Client ID mới bắt đầu `230462808538`. Người dùng đã xác nhận tạo OAuth client Android cho package/SHA-1 trên trong project mới và sẽ gửi Android Client ID để đồng bộ thông tin tham chiếu trong `.env`. Chưa kiểm tra trực tiếp Google Cloud hoặc đăng nhập trên thiết bị. SDK native dùng Web Client ID và package/chữ ký của bản cài, không truyền biến Android Client ID vào `configure`. Tham khảo [hướng dẫn xử lý lỗi cấu hình của SDK](https://react-native-google-signin.github.io/docs/troubleshooting#developer_error-or-code-10-or-developer-console-is-not-set-up-correctly-error-message).

Bản APK development arm64 đã build thành công tại `android/app/build/outputs/apk/debug/app-debug.apk`. Bản này cần Metro: chạy `npx expo start --dev-client --clear`, rồi mở ứng dụng đã cài trên Android. Google SDK không chạy trong Expo Go. Không có thiết bị Android được kết nối trong lần kiểm tra này, nên chưa xác minh chọn tài khoản Google và trao đổi token thực tế với backend.

## Kiểm tra

- TypeScript: đạt.
- 43/43 kiểm thử API/auth/profile: đạt.
- Export web và bundle Android/Hermes: đạt.
- Gradle `assembleDebug` cho arm64: đạt; Google native package có trong autolinking.
- QA trình duyệt với API giả lập chỉ trên loopback: login, bốn tab, đăng xuất, mật khẩu xác nhận sai, Google được bật, chọn mục tiêu/dị ứng, lỗi lưu rồi thử lại thành công; tăng rồi giảm số lượng kho xác nhận dữ liệu 200 → 201 → 200 từ API.
- Kiểm tra chiều rộng 440px và 320px: không tràn ngang; không có ảnh tải lỗi trên trang chủ. Ảnh QA trong `docs/ui-figma-2026-10-03` dùng dữ liệu giả, không phải dữ liệu backend thật.

## Những khác biệt được giữ theo chức năng thực tế

Đây chưa phải bản sao từng pixel của mọi frame. Các màn hình phụ chưa có frame tương ứng giữ bố cục và chức năng hiện có, cùng phông/màu chung. Kho có nút tăng/giảm số lượng dùng API PUT hiện có, khóa thao tác khi lưu, giữ nguyên đơn vị/vị trí/hạn dùng/ghi chú và chỉ cập nhật màn hình sau khi server xác nhận; trang chi tiết vẫn dùng để nhập số lượng bất kỳ. Chiều cao/cân nặng dùng ô nhập để giữ phạm vi dữ liệu API. Khảo sát giữ thêm các enum backend hỗ trợ. Nội dung và ảnh món/nguyên liệu tiếp tục lấy từ API; không thay bằng các món, số lượng, lượng kcal, tên hay số điện thoại giả trong prototype.

**MISSING BACKEND API:** các quyền lợi và thanh toán VIP, công thức đã lưu, kết nối thiết bị, cấu hình thông báo, hỗ trợ và quên mật khẩu chưa có hợp đồng API khả dụng trong audit hiện tại. Các mục tương ứng báo chưa khả dụng; không hiển thị mức phí, ưu đãi hoặc thống kê giả từ Figma. Xem `IMPLEMENTATION_AUDIT_2026-10-03.md` để đối chiếu API.

Build đầu tiên hết dung lượng ổ D. Cache build sinh tự động của Worklets đã được chuyển và giữ nguyên tại `C:/Users/ontri/.codex/build-backups/meal-planner-worklets-2026-10-03`; không xóa mã nguồn hoặc tài liệu của dự án.
