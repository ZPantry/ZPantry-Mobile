# Android 1.0.4 — kiểm tra trước phát hành

Ngày: 19/10/2026. Package: `com.zpantry.app`. Version code: `5`.

## Thay đổi

- Bao gồm các sửa UI/UX điện thoại trong `mobile-ui-audit.md` và ba commit mới nhất trên remote main tại thời điểm đồng bộ: `ab1505d`, `f7906c7`, `361f9c9`.
- Expo 56.0.23; thêm expo-system-ui để cấu hình giao diện sáng được áp dụng trên Android.
- Cập nhật các dependency có bản vá tương thích, gồm shell-quote, browserslist, baseline-browser-mapping và source-map-js. npm audit không còn cảnh báo critical, còn 10 moderate và 21 high trong cây dependency; không hạ hoặc nâng major React Native/Expo theo đề xuất audit tự động.
- Thêm script build local có chữ ký EAS hiện tại và template `expo-template-bare-minimum@56.0.37`. Không dùng debug signing cho bản release.
- Loại APK 1.0.2/1.0.3 khỏi lịch sử local chưa push; giữ nguyên file trên máy và các GitHub Releases cũ. Lịch sử local ban đầu được giữ tại nhánh `codex/pre-apk-release-backup-20261019`. Không viết lại lịch sử remote.

## Kiểm tra trước build

- TypeScript đạt.
- 62/62 API/chat tests đạt.
- `expo install --check` đạt, dependency khớp SDK 56.
- Export web đạt.
- Kiểm thử Chrome bằng dữ liệu giả lập: 320/390/430/740/1024 px, bốn tab chính, tám màn hình phụ, tên dài, lưới thẻ, vùng chạm 48px, hộp thoại thấp, picker ngày và form đăng nhập/đăng ký đạt.
- Expo Doctor: 21/22 đạt. Còn cảnh báo memory regression của Hermes V1 250829098.0.10 trong React Native 0.85.3. Doctor khuyến nghị SDK 57 với Expo >=57.0.9 / React Native >=0.86.2; bản này vẫn giữ SDK 56. Xem [thông tin chính thức](https://expo.dev/changelog/sdk-57#known-regressions).

## APK đã build

- Gradle `assembleRelease` thành công, APK 122.781.769 byte, có bundle JavaScript và tài nguyên bên trong.
- Manifest: `com.zpantry.app`, version `1.0.4`, code `5`, min SDK 24, target SDK 36; không có cờ debuggable.
- Bao gồm `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`.
- `apksigner verify` đạt; SHA-256 chứng chỉ: `6ee1e01427443b582b5a635afbd6131b7c7531f34b0d449ba1511feda1f7d3c0`, khớp APK 1.0.3.
- `zipalign -c -P 16 4` đạt, kiểm tra căn chỉnh thư viện native 16 KB.
- SHA-256 APK: `0e29f620d3cb07433fb9017caffafe3425e04c993470d324480517211451f298`.
- Lượt build đầu hết dung lượng ổ D khi ghi file native; đã chuyển riêng các thư mục build tự sinh sang cache ổ C bằng junction, giữ nguyên đường dẫn mã nguồn. Lượt build tiếp theo hoàn tất; đây là thiết lập local, không đưa cache lên Git.

## Kiểm tra trên APK release

- Cài APK 1.0.3 rồi cập nhật bằng `adb install -r` lên 1.0.4 thành công.
- Tắt Metro, bỏ reverse port 8081; APK tự khởi động, tải font/ảnh và mở đăng nhập bình thường.
- Gửi form rỗng hiển thị “Vui lòng nhập email.”, không gửi thông tin tài khoản thật.
- Mở bàn phím ở ô mật khẩu và cuộn: nút đăng nhập có bounds `[88,921][992,1064]`, nằm trên bàn phím; đã kiểm tra ảnh chụp.
- Emulator 320 dp: cuộn qua giới thiệu tới Bắt đầu, mở đăng nhập, chuyển sang đăng ký và cuộn tới điều khoản/nút đăng ký. Các trường và nút còn truy cập được. Đã trả emulator về kích thước ban đầu.
- Kiểm tra trực tiếp bằng UI hierarchy và ảnh `scratch/release-smoke/`. Script tự động đổi kích thước có lỗi thời điểm đọc tọa độ; các bước 320 dp được xác minh lại trực tiếp sau khi bố cục ổn định, không tính các lượt script đó là đạt.

## Giới hạn

Không coi bản này là không còn lỗi hoặc đã qua kiểm thử tải/bộ nhớ dài hạn. Các luồng sau đăng nhập dùng dữ liệu API giả lập trong Chrome; chưa kiểm chứng đầy đủ với tài khoản thật trên Android. Không phát hành iOS hoặc gửi lên Google Play trong đợt này.
