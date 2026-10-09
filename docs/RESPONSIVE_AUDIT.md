# BÁO CÁO AUDIT GIAO DIỆN RESPONSIVE & ADAPTIVE TRÊN ANDROID
**Dự án:** Z-Pantry Mobile  
**Phiên bản RN / Expo:** React Native 0.85.3 (New Architecture: Enabled) / Expo SDK 56.0.22 / React 19.2.3  
**Mục tiêu:** Tối ưu hiển thị cho thiết bị Android từ màn hình nhỏ (~320dp), màn hình thông thường (360–412dp), màn hình lớn / tablet (600–1200dp), foldable gập/mở, split-screen và đa cửa sổ, xoay ngang (landscape), cỡ chữ phóng to (font scaling), bàn phím mở và edge-to-edge Android 15+.

---

## 1. TỔNG QUAN HIỆN TRẠNG KIẾN TRÚC & STACK

| Tiêu chí | Hiện trạng phát hiện | Đánh giá |
| :--- | :--- | :--- |
| **Framework & Engine** | Expo SDK 56.0.22, React Native 0.85.3, Hermes enabled, New Architecture enabled | Hiện đại, tương thích tốt với Android 15+. |
| **TypeScript** | Strict mode enabled, TypeScript ~6.0.3, path alias `@/*` -> `./src/*` | Rõ ràng, an toàn về kiểu. |
| **Orientation** | Đang bị khóa `portrait` tại `app.json` và `AndroidManifest.xml` | **Critical:** Cần mở khóa để hỗ trợ xoay, foldable, tablet. |
| **Edge-to-Edge** | `edgeToEdgeEnabled=true` trong `android/gradle.properties` | Đã bật, nhưng một số màn hình và floating component chưa tính insets chuẩn. |
| **Window Dimensions** | Dùng rải rác `useWindowDimensions()` với mốc ad-hoc `width >= 900` | **Major:** Cần chuẩn hóa theo Window Size Classes chuẩn (Compact < 600, Medium 600-840, Expanded > 840). |
| **Danh sách & Grid** | Hầu hết là FlatList/ScrollView 1 cột kéo dài trên màn hình rộng | **Major:** Cần adaptive grid (2-3 cột trên tablet/foldable unfolded). |
| **Font scaling** | Dùng `AppText` có tải custom font, nhưng thiếu `maxFontSizeMultiplier` | **Major:** Chữ dễ tràn/vỡ khi người dùng bật font scale 1.3x–1.5x+ trong Cài đặt Android. |
| **Vùng chạm (Touch Target)** | Nhiều nút/icon có kích thước 32–46dp thiếu `hitSlop` | **Minor:** Chưa đạt chuẩn tiếp cận 48x48dp của Android Material Design. |
| **Hình ảnh** | Dùng lẫn lộn `react-native.Image` và `expo-image`, nhiều ảnh thiếu `aspectRatio` | **Major:** Dễ méo hoặc tốn bộ nhớ trên máy Android cấu hình thấp. |

---

## 2. DANH SÁCH VẤN ĐỀ THEO MỨC ĐỘ

### MỨC CRITICAL (Ảnh hưởng nghiêm trọng đến trải nghiệm gập/xoay/đa cửa sổ/nhập liệu)

1. **Khóa cứng hướng màn hình `portrait` (File: `app.json:7`, `android/app/src/main/AndroidManifest.xml:20`)**
   - *Hiện trạng:* `app.json` đặt `"orientation": "portrait"` và `AndroidManifest.xml` đặt `android:screenOrientation="portrait"`.
   - *Hậu quả:* Người dùng tablet Android hoặc foldable (Galaxy Z Fold, Pixel Fold) khi mở máy ngang, gập/mở hoặc chia đôi màn hình (Split-Screen / Multi-Window) sẽ bị ép cố định góc dọc hoặc đen viền letterbox, vi phạm nguyên tắc responsive Android.
   - *Giải pháp:* Đổi orientation trong `app.json` thành `"default"`, xóa `android:screenOrientation="portrait"` trong `AndroidManifest.xml` hoặc cấu hình orientation động theo hướng dẫn Expo.

2. **KeyboardAvoidingView sai behavior trên Android gây vỡ layout / che input (File: `src/components/AiChefChat.tsx:56`, `src/screens/ForgotPasswordScreen.tsx:69`)**
   - *Hiện trạng:* Đặt `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` trong khi `AndroidManifest.xml` đã bật `android:windowSoftInputMode="adjustResize"`.
   - *Hậu quả:* Trên Android, `adjustResize` đã tự động co kích thước viewport khi bàn phím nổi lên. Việc thêm `behavior="height"` khiến layout bị tính toán chiều cao hai lần, giật khựng hoặc ép che input trên máy nhỏ và chế độ xoay ngang.
   - *Giải pháp:* Sử dụng wrapper bàn phím responsive: trên Android khi có `adjustResize`, behavior nên là `undefined` hoặc dùng padding an toàn có kiểm tra chiều cao còn lại.

3. **Nút Floating Action Button và Bottom Bar tính toán vị trí tuyệt đối cứng nhắc (File: `src/screens/HomeScreen.tsx:225`, `src/screens/AdminManagementScreen.tsx:252-256`)**
   - *Hiện trạng:* Nút AI Chef FAB trên Home đặt cứng `position: "absolute", right: 18, bottom: 128`. Thanh Admin bottom bar đặt cứng `bottom: 34`, tính `tabWidth = (width - 36 - 16) / tabs.length`.
   - *Hậu quả:* Khi xoay ngang hoặc trên màn hình tablet rộng 800–1200dp, Admin bottom bar kéo dãn bất thường 1200dp chiếm hết màn hình; trên máy có thanh điều hướng 3 nút hoặc gesture bar Android 15 edge-to-edge, `bottom: 34` không bù đúng `insets.bottom` gây chạm đè hoặc quá sát mép.

---

### MỨC MAJOR (Bố cục vỡ hoặc xấu trên màn hình nhỏ/lớn/tablet/font to)

1. **Thiếu hệ thống Window Size Class chuẩn & Form/Đọc bị giãn quá mức trên tablet**
   - *File liên quan:*
     - `src/navigation/AppNavigator.tsx:60,94` (đang hardcode `width >= 900`)
     - `src/screens/HomeScreen.tsx:72` (có `const wide = width >= 900` nhưng không dùng)
     - `src/screens/AccountSettingsScreen.tsx:37` (form co dãn 100% full screen trên tablet)
     - `src/screens/AdminIngredientFormScreen.tsx:165`
     - `src/screens/AdminRecipeFormScreen.tsx:173`
     - `src/screens/AdminUserFormScreen.tsx:102`
     - `src/screens/CreateRecipeScreen.tsx:189`
     - `src/components/ScreenScrollView.tsx:12` (mặc định `maxWidth: 1080` quá rộng cho form/reading content)
   - *Hậu quả:* Trên tablet 10" (chiều rộng 800–1200dp), các ô input, label kéo dài từ cạnh trái sang cạnh phải, mất tính tập trung thị giác, gõ phím rất khó khăn.
   - *Giải pháp:* Tạo hook `useSizeClass()` (compact < 600dp, medium 600-840dp, expanded > 840dp). Xây dựng `ResponsiveContainer` giới hạn `maxWidth` (form ~600dp, danh mục/lưới ~960-1200dp) căn giữa.

2. **Danh sách dạng đơn cột không thích ứng trên màn hình rộng**
   - *File liên quan:*
     - `src/screens/MealRecommendationResultsScreen.tsx:45` (FlatList 1 cột trên `maxWidth: 900`)
     - `src/screens/PantryScreen.tsx:188` (FlatList/list card thực phẩm dãn toàn màn hình)
     - `src/screens/CookingHistoryScreen.tsx:32` (Lịch sử nấu 1 cột dãn hết tablet)
   - *Hậu quả:* Trên máy tính bảng và foldable mở rộng, card hiển thị đơn độc, khoảng trống thừa quá lớn, lãng phí diện tích màn hình.
   - *Giải pháp:* Xây dựng `AdaptiveGrid` hoặc `numColumns` linh hoạt theo Window Size Class: compact = 1 cột, medium = 2 cột, expanded = 3 cột (với key thay đổi theo numColumns để FlatList không crash).

3. **Chưa khống chế `maxFontSizeMultiplier` khi người dùng phóng to font chữ hệ thống**
   - *File liên quan:*
     - `src/components/AppText.tsx:11`
     - `src/navigation/AppNavigator.tsx:84` (BrandTabBar tab label)
     - `src/components/CategoryChip.tsx:33`
     - `src/components/PantryItemCard.tsx:60-78`
     - `src/screens/OnboardingScreen.tsx:18,21` (tiêu đề 23px, nút 32px)
   - *Hậu quả:* Người lớn tuổi hoặc người kích hoạt cỡ chữ to (130%–150% trên Android Accessibility) sẽ gặp hiện tượng chữ trong tab bar, badge, pill, chip nhảy dòng làm xô lệch icon hoặc bị cắt cụt.
   - *Giải pháp:* Cấu hình `maxFontSizeMultiplier` (1.3–1.5) trong `AppText` cho các component nhỏ, badge, nút, tab bar; giữ nguyên `allowFontScaling: true` để đảm bảo chuẩn trợ năng.

4. **Xử lý hình ảnh chưa tối ưu theo tỷ lệ màn hình (Aspect Ratio & Resize Mode)**
   - *File liên quan:*
     - `src/components/MealCard.tsx:32` (Dùng `Image` RN với fixed `height: 144/200`, không có `resizeMode="cover"` hay `aspectRatio`)
     - `src/screens/RecipeDetailScreen.tsx:165` (Fixed `height: 280`, `width: "100%"`, kéo dãn trên tablet)
     - `src/screens/PantryItemDetailScreen.tsx:190` (Hero header fixed `height: 312`)
     - `src/screens/TodayMenuItemDetailScreen.tsx:225` (Fixed `height: 160`)
   - *Hậu quả:* Ảnh bị kéo méo tỉ lệ trên màn hình ngang hoặc máy tính bảng; dùng component `Image` của React Native thay vì `expo-image` làm giảm hiệu năng render và tốn RAM trên thiết bị Android yếu.
   - *Giải pháp:* Chuyển sang `expo-image` đồng nhất, đặt `aspectRatio: 16/9` hoặc `4/3` kết hợp `contentFit="cover"`, chiều cao linh hoạt theo kích thước container.

---

### MỨC MINOR (Vùng chạm, chuẩn RTL/LTR và vi điều chỉnh)

1. **Vùng chạm tương tác nhỏ hơn chuẩn 48x48dp của Android**
   - *File: `src/components/PrimaryButton.tsx:10`* (`minHeight: 46` < 48dp)
   - *File: `src/components/AppBackButton.tsx:27`* (`height: 46, minWidth: 46` < 48dp, có `hitSlop={8}` nhưng nên đạt `minHeight: 48`)
   - *File: `src/components/CategoryChip.tsx:19`* (`minHeight: 40` cần bổ sung `hitSlop`)
   - *File: `src/components/PantryItemCard.tsx:91`* (Nút tăng giảm số lượng `32x32dp` thiếu `hitSlop`)
   - *File: `src/screens/AddIngredientScreen.tsx:162`* (`QuantityButton` `46x46dp` < 48dp)
   - *File: `src/screens/TodayMenuItemDetailScreen.tsx:240`* (Đánh giá sao `42x42dp` < 48dp)
   - *File: `src/components/MeasurementSlider.tsx:26,28`* (Nút `+ / −` `44x44dp` < 48dp)
   - *File: `src/components/LogoutConfirmModal.tsx:30,35`* (Nút modal `minHeight: 44` < 48dp)
   - *File: `src/screens/PantryImportScreen.tsx:198`* (`minHeight: 44` < 48dp)

2. **Sử dụng thuộc tính phương hướng cứng nhắc `left / right` thay vì `marginStart / marginEnd`, `paddingStart / paddingEnd`**
   - *File liên quan:* Rải rác trong `src/screens/HomeScreen.tsx`, `src/navigation/AppNavigator.tsx`, `src/screens/LoginScreen.tsx`.
   - *Khắc phục:* Thay thế bằng start/end để chuẩn hóa layout tương thích đa hướng.

3. **Cố định `height` cứng thay vì `minHeight` cho container chứa văn bản**
   - *File: `src/components/AppBackButton.tsx:27`* (`height: 46` -> nên là `minHeight: 48`).
   - *File: `src/screens/AdminManagementScreen.tsx:256`* (`height: 66` -> nên là `minHeight: 64`).

---

## 3. LỘ TRÌNH THỰC HIỆN TIẾP THEO

- **PHASE 2 - KIẾN TRÚC:**
  1. Tạo `src/hooks/useSizeClass.ts`: Phân loại compact (<600dp), medium (600–840dp), expanded (>840dp), cung cấp cờ `isCompact`, `isMedium`, `isExpanded`, `isLandscape`.
  2. Tạo `src/components/ResponsiveContainer.tsx`: Giới hạn `maxWidth` (mặc định 600dp cho form, 960dp cho content rộng) và tự động căn giữa.
  3. Tạo `src/components/AdaptiveGrid.tsx`: Bọc lưới chia 1/2/3 cột linh hoạt theo size class.
  4. Tạo `src/components/KeyboardSafeView.tsx`: Xử lý bàn phím an toàn cho Android (`adjustResize`) và iOS.
  5. Cập nhật `src/components/AppText.tsx`: Hỗ trợ `maxFontSizeMultiplier` linh hoạt.
  6. Mở khóa orientation trong `app.json` và `AndroidManifest.xml`.
- **PHASE 3 - REFACTOR:**
  - Nhóm 1: Navigation (`AppNavigator`, `BrandTabBar`, `FixedBackHeader`, `AiChefChat`).
  - Nhóm 2: Màn hình chính (`HomeScreen`, `PantryScreen`, `MealSuggestionScreen`, `PlanScreen`, `ProfileScreen`).
  - Nhóm 3: Màn hình chi tiết & luồng AI (`RecipeDetailScreen`, `TodayMenuItemDetailScreen`, `PantryItemDetailScreen`, `MealRecommendationResultsScreen`).
  - Nhóm 4: Màn hình Form & Quản trị (`AddIngredientScreen`, `QuickAddScreen`, `PantryImportScreen`, `ManualMealSuggestionScreen`, `AccountSettingsScreen`, `ProfileSetupScreen`, `AdminManagementScreen`, các form Admin).
  - Nhóm 5: Onboarding & Auth (`SplashScreen`, `OnboardingScreen`, `LoginScreen`, `ForgotPasswordScreen`).
- **PHASE 4 - KIỂM CHỨNG & CHECKLIST:**
  - Typecheck, API test, chạy kiểm thử các size class, viết tài liệu checklist test thủ công và test tự động.
