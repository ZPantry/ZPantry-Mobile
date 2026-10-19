# Android 1.0.5 — kiểm tra phát hành

Ngày: 19/10/2026. Package: `com.zpantry.app`. Version code: `6`.

## Nội dung bản phát hành

- Giữ Expo 56.0.23 / React Native 0.85.3 và API production `https://zpantry-java-backend.onrender.com`; không sửa backend.
- Bao gồm các sửa multipart tải ảnh trên Android, đọc lại đánh giá/ghi chú từ nhật ký nấu ăn, và đơn giản hóa màn hình sau khi hoàn thành món.
- Đồng bộ màu, viền và chiều rộng các ô chọn, gồm cá nhân hóa bữa ăn, ngày xem thực đơn và form lên thực đơn.
- Đóng gói sẵn font và icon, JavaScript và tài nguyên để APK release chạy độc lập với Metro.
- Dùng lại khóa ký release hiện có, không dùng khóa debug; tăng version để phân biệt với APK 1.0.4.

## Kiểm tra mã nguồn

- `npm run typecheck`: đạt.
- `npm run test:api`: 69/69 đạt.
- `npx expo install --check`: dependency khớp SDK hiện tại.
- `npm run build`: export web đạt.
- `tests/mobile-layout.web.cjs`: đạt ở 320/390/430/740/1024 px, nội dung dài, bố cục lưới, vùng chạm và các form.
- `LOGIC_FIXES_ONLY=1 node tests/swagger-flows.web.cjs`: đạt, bao gồm quyền USER, ngày thực đơn, tải ảnh thất bại/thử lại, lưu và đọc lại đánh giá/ghi chú, xác nhận nhập ảnh. API dùng dữ liệu giả lập, không ghi dữ liệu production.
- API production `/health`: HTTP 200 tại thời điểm kiểm tra.

## APK và kiểm tra cài đặt

- `npm run build:apk`: Gradle `assembleRelease` thành công; APK 124.212.387 byte, gồm arm64-v8a/armeabi-v7a/x86/x86_64.
- Manifest đúng `com.zpantry.app`, version 1.0.5/code 6, min SDK 24/target SDK 36, không debuggable.
- `apksigner verify` và `zipalign -c -P 16 4`: đạt. Chứng chỉ SHA-256 `6ee1e01427443b582b5a635afbd6131b7c7531f34b0d449ba1511feda1f7d3c0`, khớp 1.0.4.
- SHA-256 APK: `dac9f08cfde991d11e710a9832ef88389800bb833a733f87a7bb931d2ca53483`.
- APK chứa bundle Hermes, font/icon và URL API production; source map của bản release có các file sửa upload, nhật ký và `SelectControl.android.tsx`.
- `adb install -r` cập nhật từ 1.0.4 lên 1.0.5 thành công trên Android emulator, không xóa dữ liệu.
- Khởi động lạnh thành công, mở giới thiệu và đăng nhập, font/ảnh hiển thị; gửi form rỗng hiện “Vui lòng nhập email.”. Không thấy lỗi JavaScript hoặc crash của app trong log; chỉ có cảnh báo OpenGLRenderer của emulator. Bản release không cần kết nối Metro; không có reverse port 8081, giữ nguyên Metro 8082 của bản dev.

## Giới hạn

Không coi kết quả này là bảo đảm mọi thiết bị hoặc mọi tình huống không còn lỗi. Không thử các giao dịch ghi dữ liệu thật, không phát hành iOS/Google Play. Giữ nguyên SDK hiện tại; giới hạn về Hermes V1 đã ghi trong báo cáo 1.0.4 vẫn áp dụng.
