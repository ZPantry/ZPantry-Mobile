# Nhật ký thay đổi: Hành trình khách hàng (Customer Journey)

## Phần 1: Thiết lập thông tin cá nhân lần đầu (First-time Profile Setup)

### 1. Cập nhật API và Endpoints (`src/api/endpoints.ts`, `src/api/users.ts`)
- Thêm endpoint `users.profile(id)` vào cấu hình chung.
- Bổ sung các kiểu dữ liệu `UserProfileResponse` và `UserProfileUpdateRequest`.
- Thêm hàm gọi API `getProfile` và `updateProfile` vào `usersApi` để giao tiếp với Backend lưu thông tin thiết lập.

### 2. Tạo màn hình mới (`src/screens/ProfileSetupScreen.tsx`)
- Xây dựng giao diện nhập thông tin bắt buộc: Tuổi, Giới tính, Chiều cao, Cân nặng.
- Xây dựng giao diện chọn thông tin tuỳ chọn (hiển thị dạng các Chip đa chọn): Mục tiêu, Chế độ ăn / Khẩu vị, Dị ứng thực phẩm.
- Bổ sung tuỳ chọn **"Khác"**: Khi người dùng nhấn chọn "Khác" ở bất kỳ nhóm tuỳ chọn nào, hệ thống tự động hiển thị thêm một ô nhập liệu (`TextInput`) bên dưới để nhập nội dung tự do.
- Thêm logic kiểm tra (Validation): Nút "Hoàn thành" chỉ nổi màu và cho phép bấm khi người dùng đã điền/chọn đủ các trường bắt buộc. Khi nhấn hoàn thành sẽ gọi `usersApi.updateProfile` để lưu lên server.
- Bố trí nút "Bỏ qua" ở góc trên cùng bên phải để người dùng có thể lướt qua nhanh bước này.
- **UI/UX**: Giao diện được thiết kế đồng bộ với hệ thống hiện tại, sử dụng chung biến màu (`colors`), typography, và các component chuẩn của hệ sinh thái (`SafeAreaView`, `ScrollView`).

### 3. Cập nhật Type (`src/types/index.ts`)
- Định nghĩa và đăng ký thêm `ProfileSetup` và `InteractiveGuide` vào `RootStackParamList` để hỗ trợ hệ thống type-safe của React Navigation.

### 4. Cập nhật Điều hướng (`src/navigation/AppNavigator.tsx`)
- Đăng ký màn hình `ProfileSetupScreen` và cấu hình luồng khởi tạo (initial route).
- Thiết lập luồng kiểm tra `onboardingStep` để mở đúng màn hình ban đầu nếu người dùng mới đăng nhập hoặc chưa hoàn thành thiết lập (`ProfileSetup`).

## Phần 2 & 3: Hướng dẫn người dùng mới (Interactive Guide)

### 1. Tạo màn hình hướng dẫn và tương tác giả lập (`src/screens/InteractiveGuideScreen.tsx`)
- Lên luồng các bước (Welcome -> Nhập món -> AI Analyzing -> Hiển thị kết quả nguyên liệu -> Lưu vào Tủ -> Hoàn thành).
- Xây dựng layout mô phỏng giao diện trang chủ kèm hiệu ứng chuyển động (`Animated.timing`, `Animated.sequence`).
- Bổ sung tuỳ chọn **isReplay**: Khi xem lại từ mục Cài đặt, có thêm nút "Đóng" (X) góc phải trên để thoát bất kỳ lúc nào. Nếu không phải là isReplay, khi kết thúc sẽ gọi `completeOnboardingStep("done")`.

### 2. Quản lý trạng thái Onboarding và Sửa lỗi Token (`src/utils/authStorage.ts`, `src/context/AuthContext.tsx`)
- **Giải mã Token**: Bổ sung hàm `decodeBase64` thay thế tạm thời cho `atob` để đảm bảo có thể decode phần payload của JWT an toàn hơn trên di động, khắc phục lỗi mất `userId`.
- **Lưu trữ tiến trình**: Thêm phương thức `getOnboardingStep` và `setOnboardingStep` để lưu trạng thái của người dùng (`profile_setup`, `interactive_guide`, `done`).
- **Context**: Tích hợp biến trạng thái `onboardingStep` vào AuthContext và viết hàm `completeOnboardingStep` để cung cấp cho toàn bộ app sử dụng.

### 3. Cập nhật giao diện Tooltip trong App (HomeScreen, PantryScreen, PlanScreen, vv)
- **Cập nhật Layout chung**: Các màn hình Home, Pantry, Plan, Profile, MealSuggestion được chỉnh lại `ScrollView` có `position: absolute`, kéo dài toàn trang và đẩy padding cho thanh điều hướng. Tránh tình trạng các thành phần cuối trang bị che mất.
- **HomeScreen**: Hiển thị popup (chứa nội dung "Chào bạn mới!", mũi tên trỏ xuống thanh điều hướng Tab "Tủ") kèm hiệu ứng bay bồng bềnh (`floatAnim`) khi `onboardingStep === "interactive_guide"`.
- **PantryScreen**: Hiển thị popup hướng dẫn (chứa nội dung "Thêm thực phẩm", mũi tên hướng lên nút thêm vào Tủ) khi `onboardingStep === "interactive_guide"`. Có nút "Hoàn thành" để kết thúc toàn bộ luồng onboarding.

### 4. Bổ sung tính năng xem lại hướng dẫn (`src/screens/ProfileScreen.tsx`)
- Bổ sung nút **"Hướng dẫn sử dụng Z-Pantry"** trong nhóm Cài đặt.
- Khi bấm sẽ mở màn hình InteractiveGuide với tham số `{ isReplay: true }` để người cũ có thể xem lại hướng dẫn mà không bị ghi đè trạng thái khởi tạo.
