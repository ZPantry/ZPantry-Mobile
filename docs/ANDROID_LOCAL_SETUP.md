# Chạy Android trên Windows

`npm run android` kiểm tra JDK rồi build/cài development client lên thiết bị kết nối.
Máy cần JDK 17 trở lên (có cả `java` và `javac`), Android SDK và thiết bị được `adb devices` nhận.

Có thể đặt `JAVA_HOME`/`ANDROID_HOME` trong môi trường. Nếu máy đang dùng Java 8 cho
dự án khác, tạo `.android.local.json` ở thư mục gốc để cấu hình riêng:

```json
{
  "javaHome": "C:/duong-dan-thuc-te/toi/jdk-17",
  "androidHome": "C:/Users/ten-user/AppData/Local/Android/Sdk"
}
```

Các đường dẫn phải tồn tại. File này được bỏ qua trong Git. Script chỉ đặt biến môi
trường cho quá trình build hiện tại, không sửa Java mặc định toàn máy.

```powershell
npm run android
```

Sau khi development client đã được cài, những lần chỉ thay đổi JavaScript/API có thể
chạy Metro mà không biên dịch lại native:

```powershell
npx expo start --dev-client --android
```

Các lỗi khác nhau:

- `No Android connected device`: kết nối thiết bị/bật giả lập, kiểm tra ADB.
- `No development build ... installed`: cần chạy `npm run android` một lần để build và cài app.
- `Gradle requires JVM 17 ... JVM 8`: sửa đường dẫn JDK, không chỉ nâng package Expo.
- Build lần đầu có thể tải Gradle, Maven dependencies, Android platform/build-tools/NDK còn thiếu.

Script chuyển nguyên các tham số cho `expo run:android`, ví dụ
`npm run android -- --device` hoặc `npm run android -- --no-bundler`.
