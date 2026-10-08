# Kiểm tra gợi ý món và hoàn thành món — 06/10/2026

## Kết quả xác minh hiện tại

Frontend đang cấu hình cả web/native tới `https://zpantry-java-backend.onrender.com` trong `.env`. Gọi public OpenAPI `/v3/api-docs` từ máy kiểm tra không nhận được phản hồi: PowerShell timeout sau 45 giây; curl timeout sau 20 giây, nhận 0 byte, HTTP 000 (không phải mã lỗi HTTP do server trả). Vì vậy chưa kiểm chứng được hai endpoint có xác thực trên deployment hiện tại. Điều này chứng minh đường truy cập backend thất bại trong phiên kiểm tra, chưa đủ để phân biệt server ngừng hoạt động, cold start hay sự cố mạng.

- `npm run typecheck`: đạt.
- `npm run test:api`: 57/57 đạt. Các test dùng phản hồi giả lập, không chứng minh deployment hoạt động.
- Không đăng nhập hoặc thay đổi pantry/thực đơn của người dùng; không thay cấu hình hay triển khai backend.

## Gợi ý món ăn

`src/screens/MealSuggestionScreen.tsx` nối nút **Tìm món cho tôi** tới `suggest`, gọi `recommendationsApi.personalized` ở `src/api/recommendations.ts`. Request là POST `/api/recommendations/v2/meals`, có bearer token, timeout 60 giây. Các field gửi lên khớp bản OpenAPI lưu ngày 03/10/2026.

Nút chỉ bị chặn khi đang gửi hoặc chế độ `PANTRY_BASED` chưa tải được tủ/tủ trống. `AUTO` và `PROFILE_BASED` không yêu cầu tủ có nguyên liệu.

Trong backend checkout `D:/EXE101/ZPantry-java-BackEnd`, `RecommendationController.personalized` gọi `PersonalizedRecommendationService.recommend`, rồi gọi dịch vụ riêng `/ai/recommend-meals` qua `HttpAiClient`. URL dịch vụ lấy từ `AI_SERVICE_URL`, mặc định `http://localhost:8000` nếu không có cấu hình. `HttpAiClient` hiện không đặt connect/read timeout cho kết nối upstream; nếu AI không phản hồi, frontend có thể hết thời gian chờ trước backend.

Báo cáo local ngày 29/09 ghi nhận HTTP 500 `AI service request failed`, upstream 422 thiếu request body. Đây là bằng chứng lịch sử, không phải kết quả live hôm nay. `HttpAiClient` hiện đã dùng `HttpURLConnection` và ghi JSON body theo độ dài byte; không nên mặc định lỗi transport cũ vẫn tồn tại.

Checkout backend hiện chỉ đọc `topK` ở controller và gửi hợp đồng V1 `/ai/recommend-meals`; các bộ lọc `mode`, `mealType`, `maxCookTimeMinutes`, `servings` không được chuyển vào service. Bản OpenAPI lưu từ deployment lại có những field này. Cần xác minh branch/commit đang triển khai trước khi sửa backend local; chưa thể coi checkout này là mã production hiện tại.

## Hoàn thành món

`src/screens/TodayMenuItemDetailScreen.tsx:78` có handler `completeMeal`; nút tại dòng 234 đã nối handler. Chưa chọn **ảnh thành phẩm** thì handler chỉ thông báo và không gửi API. Ảnh công thức đang hiển thị không thay cho ảnh thành phẩm người dùng chọn.

`src/api/todayMenu.ts` gửi POST `/api/me/today-menu/items/{id}/complete` bằng multipart với `imageFile`, `cookedAt`, `rating`, `note`. Các tên field khớp DTO Java và OpenAPI đã lưu. Client không tự đặt Content-Type JSON cho FormData.

Backend `TodayMenuService.complete` bắt buộc `imageFile`, sau đó gọi `media.upload` trước khi lưu trạng thái và nhật ký. `CloudinaryMediaStorageAdapter.configured` ném `Media storage is not configured` nếu thiếu một trong ba biến:

- `ZPANTRY_MEDIA_CLOUDINARY_CLOUD_NAME`
- `ZPANTRY_MEDIA_CLOUDINARY_API_KEY`
- `ZPANTRY_MEDIA_CLOUDINARY_API_SECRET`

Báo cáo local ngày 29/09 đã tái hiện đúng lỗi này với ảnh multipart. Chưa xác minh được các biến trong Render hôm nay. Frontend hiện gom lỗi upload HTTP 500 thành thông báo dịch vụ tải ảnh gặp sự cố, nên người dùng không thấy nguyên nhân cấu hình cụ thể.

## Thứ tự xử lý phía vận hành

1. Kiểm tra Render backend có chạy và `/v3/api-docs` có phản hồi từ mạng của thiết bị; kiểm tra log/restart/cold start và commit đang deploy.
2. Khi backend truy cập được, lấy log của một request gợi ý thật để kiểm tra `AI_SERVICE_URL`, khả năng Java truy cập dịch vụ AI và response upstream. Đặt timeout upstream phù hợp; không sửa request FE chỉ dựa vào lỗi transport lịch sử.
3. Kiểm tra ba biến Cloudinary trên backend và thử upload ảnh. Không đưa API secret vào biến `EXPO_PUBLIC_*`.
4. Dùng tài khoản kiểm thử để thử gợi ý → thêm thực đơn → chọn ảnh thành phẩm → hoàn thành → đọc lại nhật ký và lượng kho. Chỉ kết luận đã sửa sau khi luồng thật đạt.

Không thay mã nghiệp vụ trong lần chẩn đoán này: chưa có bằng chứng live xác định lỗi deployment, còn cấu hình dịch vụ phải kiểm tra ở môi trường backend.
