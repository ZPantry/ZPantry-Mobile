# Cập nhật FE và kiểm thử tích hợp — 29/09/2026

Đối chiếu tài liệu `ZPantry-java-BackEnd/docs`, controller/DTO thực tế tại commit `cf5583e` và Expo SDK 56. Chỉ sửa mã nguồn FE; không sửa mã nguồn hoặc cấu hình lưu trên đĩa của BE/AI.

## Những phần đã đồng bộ

| Tính năng | Hợp đồng hiện hành và hành vi FE |
| --- | --- |
| Đăng ký, OTP, đăng nhập | Giữ đúng `/api/Auth/*`, tên trường DTO và JWT. FE web gọi BE cổng 8080; cổng 8081 là Expo. |
| Hồ sơ ăn uống | GET/PUT `/api/users/{userId}/profile`; enum chuẩn cho mục tiêu, chế độ ăn, mảng dị ứng; đọc lại khi chỉnh sửa, giữ bản nháp khi lưu lỗi. |
| Gợi ý V2 | POST `/api/recommendations/v2/meals` với `topK`; BE tự đọc tủ và hồ sơ. Xử lý response AI lồng trong response Java; không tạo mealId giả hoặc âm thầm chuyển V1 khi lỗi. |
| Nhập tủ từ ảnh | Receipt/food-image analyze bằng multipart `image`; hiển thị bản xem trước, sửa số lượng/đơn vị, tìm nguyên liệu chưa nhận diện, bỏ dòng. Chỉ lưu sau nút xác nhận. Chặn số lượng không hợp lệ và trùng nguyên liệu. |
| Xác nhận nhập tủ | POST `/api/me/pantry-import/confirm`. Giải thích rõ số lượng thay thế giá trị đang có, không cộng dồn. Không tự gán hạn dùng hôm nay cho dữ liệu thiếu hạn. |
| Dị ứng catalog | Recipe/ingredient ghi JSON giữ được mảng allergens, kể cả `[]` để xóa. Ingredient create dùng trường BE `protenPerUnit`; update dùng `proteinPerUnit`. Upload ảnh trước rồi gửi URL trong JSON. |
| Chi tiết món | Đọc recipe thực, thành phần/dị ứng thực; không hiển thị kcal giả. Bỏ kiểm tra meal đã lưu đối với kết quả V2 không có mealId. |

UI bổ sung trạng thái tải, rỗng, lỗi/thử lại và khóa thao tác đang gửi. Đã kiểm tra bố cục web ở 390×844 và 1280px. Các trường dị ứng có trạng thái checkbox rõ ràng; lỗi lưu hồ sơ nằm gần nút lưu.

## Kết quả kiểm thử

- `npm run typecheck`: đạt.
- `npm run test:api`: 24/24 đạt, bao gồm profile, V2, import, allergens, upload, phân biệt lỗi dịch vụ ảnh và hạn dùng rỗng.
- `npm run build`: xuất web; kiểm tra UI tự động qua `work/verify-update.cjs` sử dụng API mô phỏng để kiểm tra cả nhánh thành công/thất bại.
- `work/verify-live.cjs`: Chrome thật → Expo `http://localhost:8081` → Java `http://localhost:8080` → PostgreSQL/AI. Không mock HTTP trong bài này. Kết quả từng bước ở `work/live-flow-report.txt`; có BLOCKED nên việc script hoàn tất không đồng nghĩa toàn hệ thống đạt.
- Đạt trên BE thật: đăng ký → OTP dev → đăng nhập, CORS, lưu/đọc hồ sơ, xác nhận/đọc tủ, tạo/hiển thị thực đơn độc lập, cập nhật/xóa danh sách dị ứng recipe, đăng xuất. Không có lỗi JavaScript pageerror trong luồng đã chạy.
- OTP dùng email adapter của profile dev ghi log local, chưa xác minh gửi email thật. Log bị gitignore để không đưa OTP vào Git.

## Các lỗi phía BE/AI còn chặn luồng

1. **Tạo ingredient trả 500:** `IngredientService.create` gọi `HttpAiClient.embedIngredient` trước `repo.save`; ID còn null và `Map.of` ném NullPointerException. FE đã gửi đúng DTO. Cần BE kiểm tra thứ tự lưu/embed.
2. **Gợi ý V2 trả 500:** trace Java ghi AI trả 422 `body missing`. Gọi trực tiếp AI `/ai/recommend-meals` với JSON hợp lệ trả 200. Cần kiểm tra truyền request body BE → AI; chưa kết luận nguyên nhân transport cụ thể. Chưa thể xác nhận luồng V2 hoàn chỉnh bằng dữ liệu thật.
3. **Nhận diện ảnh trả 503:** thử multipart PNG qua Java và trực tiếp AI đều lỗi; AI trả `Image analysis provider is unavailable`. Đã xác nhận biến GEMINI_API_KEY có giá trị, nên không kết luận là thiếu key. Cần kiểm tra provider/cấu hình/quota bằng log an toàn. Chưa xác minh chất lượng nhận diện ảnh thực phẩm/hoá đơn.
4. **Upload media trả 500:** Java báo `Media storage is not configured` tại Cloudinary adapter. Cần cấu hình dịch vụ media phía server để kiểm thử upload/hoàn thành món có ảnh. FE phân biệt lỗi server với lỗi định dạng ảnh, tránh yêu cầu người dùng đổi ảnh khi server chưa sẵn sàng.

Không che các lỗi này bằng dữ liệu giả trong ứng dụng. Người dùng vẫn có thể nhập nguyên liệu thủ công và thử lại khi dịch vụ phục hồi. V2 hiện chưa áp dụng bộ lọc goal/diet từ profile; dị ứng phụ thuộc dữ liệu khai báo của công thức. FE giải thích giới hạn này.

## Môi trường test và dữ liệu

Java được chạy với profile dev, DB Docker đang có và AI `localhost:8000`; secret JWT chỉ đặt trong process. Expo chạy cổng 8081, `.env` FE trỏ API8080 (Android emulator: `10.0.2.2:8080`). Các process cần còn chạy để test; `ERR_CONNECTION_REFUSED` xuất hiện khi không có BE lắng nghe cổng này, trước cả bước kiểm tra endpoint.

Bài live tạo tài khoản `example.invalid`. Do API tạo ingredient lỗi, bài test thêm đúng một ingredient UUID mới vào DB dev để kiểm tra độc lập các luồng sau; không thay schema hay sửa dữ liệu có sẵn. Pantry/menu/recipe/ingredient của lần test được xóa qua API trong finally (theo cơ chế xóa của BE); tài khoản test còn trong DB local. Không dùng script này với DB production/shared. Playwright script hiện tham chiếu runtime có sẵn trên máy này; máy khác cần điều chỉnh đường dẫn package.

Chưa kiểm thử native Android/iOS, gửi email production hoặc hoàn tất món có ảnh trên dịch vụ media. Upload ảnh thành công nhưng catalog mutation thất bại có thể để lại ảnh chưa được dùng trên provider; chưa có endpoint rollback media trong luồng FE.
