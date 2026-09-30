# Báo cáo tính năng và lỗi FE–BE — 29/09/2026

## Kết luận

**Chưa thể xác nhận hệ thống đã đầy đủ hoặc hoạt động bình thường toàn bộ.** Có các luồng cơ bản chạy được, nhưng còn lỗi phân quyền catalog, tạo nguyên liệu, kết nối AI, lưu ảnh và thiếu dữ liệu chi tiết thực đơn. Frontend cũng còn các phần chưa tích hợp hoàn chỉnh.

Đây là kiểm tra môi trường local, không phải chứng nhận production hay toàn bộ giao diện Android/iOS.

## Phạm vi và bằng chứng

- FE: `D:/EXE101/Meal_Planner`; BE: `D:/EXE101/ZPantry-java-BackEnd`.
- Java chạy profile `dev`, API `http://localhost:8080`; PostgreSQL local `zpantry_dev`; AI container `zpantry-ai-dev`.
- `npm run typecheck`: PASS.
- `npm run test:api`: **24/24 PASS**. Đây là test client/contract với mock; không thay thế kiểm tra server.
- `npm run build`: PASS, export web thành công.
- Lần chạy API cuối lúc khoảng **18:22 giờ Việt Nam**: **61 kiểm tra, 43 đạt, 18 không đạt**. Bao gồm cả các bước setup/cleanup; không phải 61 tính năng độc lập hay tỷ lệ hoàn thiện sản phẩm.
- [Kết quả API có status, response và nhãn kiểm tra](../work/audit-fe-be-2026-09-29.json).
- [Script tái hiện kiểm tra local](../work/audit-fe-be-2026-09-29.cjs). Script có tạo tài khoản/dữ liệu kiểm thử, chỉ chạy với backend local dev tương ứng.
- [Trích log lỗi backend đã loại OTP](../work/audit-backend-errors-2026-09-29.log).
- Mở được trang giới thiệu trên web local; thao tác BẮT ĐẦU qua phiên browser kiểm tra chưa chuyển được màn hình. Chưa kết luận nguyên nhân ở ứng dụng hay công cụ; **chưa nghiệm thu tương tác UI toàn bộ**.
- Chưa chạy trên thiết bị Android/iOS, chưa chạy toàn bộ Maven test suite, chưa kiểm chứng OAuth thật, gửi Gmail thật, Cloudinary thật, hay tài khoản admin/super-admin thật.

### Dữ liệu kiểm thử

Không thay đổi hồ sơ/pantry của tài khoản người dùng. Dùng tài khoản `audit-...@example.invalid` riêng, sau kiểm tra đã logout, vô hiệu hóa và soft-delete tài khoản kiểm thử. Recipe, menu và pantry kiểm thử đã được xóa mềm qua API.

Catalog nguyên liệu ban đầu rỗng, API tạo nguyên liệu lỗi. Để kiểm tra độc lập pantry, đã chèn **một nguyên liệu tổng hợp** vào database dev rồi xóa mềm sau khi kiểm tra. Vì vậy pantry PASS có điều kiện đã có ingredient hợp lệ; **không có nghĩa luồng tạo nguyên liệu → pantry chạy được từ đầu đến cuối**.

## Những tính năng hiện có

| Nhóm | Đã có trong sản phẩm/source | Kết quả hiện tại |
|---|---|---|
| Giới thiệu/hướng dẫn | Splash, onboarding, hướng dẫn tương tác, xem lại hướng dẫn | Có UI; chưa nghiệm thu toàn bộ thao tác lần này |
| Đăng ký/email OTP | Đăng ký, nhập OTP, báo sai mã | API tạo tài khoản → OTP demo → xác thực → login PASS. Dev chỉ ghi OTP ra log, không gửi Gmail |
| Phiên đăng nhập | Login, logout, API refresh token | API PASS; refresh cũ bị từ chối, access token logout bị từ chối. FE chưa tự refresh |
| Google/Facebook | Nút OAuth và đọc profile từ provider | Chưa nối với xác thực Java, chưa dùng được như phiên backend hoàn chỉnh |
| Hồ sơ ăn uống | Tuổi, giới tính, chiều cao, cân nặng, mục tiêu, chế độ ăn, dị ứng | Lưu/đọc lại qua API PASS, gồm dị ứng PEANUT. Cross-user bị chặn nhưng trả sai HTTP 500 |
| Thông tin tài khoản | API sửa tên/avatar/password chủ tài khoản, màn hình cá nhân/logout | Owner PUT PASS; user sửa người khác nhận 403. Chưa có form đầy đủ cho khách hàng đổi tên/avatar/password |
| Trang hôm nay | Danh sách công thức, pantry, tìm trong dữ liệu đã tải, nhắc hạn dùng | Có UI/API đọc; catalog local trống. Calories hiển thị đang tính giả định theo khẩu phần |
| Danh mục nguyên liệu | List/search; form admin thêm/sửa/xóa; allergens | List/search PASS; tạo mới lỗi 500. Update/allergens PASS với fixture; thiếu phân quyền write |
| Danh mục công thức | List/detail, form thêm/sửa/xóa, thành phần, cách nấu, allergens | API CRUD không ảnh chạy được với fixture; nhưng anonymous cũng sửa/xóa được, nên chưa đạt |
| Tủ nguyên liệu | Thêm/sửa/xóa, số lượng, đơn vị, hạn dùng, vị trí, ghi chú | API CRUD PASS có ingredient fixture; lỗi lượng âm và không xóa được expiry |
| Nhập từ ảnh/hóa đơn | Chọn ảnh, preview, ghép nguyên liệu và xác nhận | Analyze food/receipt đều 503; confirm dữ liệu hợp lệ PASS; lượng âm trong confirm bị 400 |
| Gợi ý món AI | FE gọi V2 bằng topK; BE có V1/V2 | Cả V1/V2 trả 500, chưa chạy được luồng gợi ý thật |
| Chi tiết công thức/thêm thực đơn | Đọc recipe, thêm món theo recipeId | API recipe detail và thêm món PASS với fixture |
| Thực đơn hôm nay | List/get/add/delete theo ngày | API cơ bản PASS; GET detail thiếu recipe/requiredIngredients/pantryItems mà FE cần |
| Hoàn thành món | Ảnh thành phẩm, rating/note, dự kiến trừ kho và lưu log | Bị chặn ở media storage, HTTP 500; chưa xác minh trừ kho thật |
| Nhật ký nấu ăn | BE có GET cooking-logs, FE có client | API đọc trả 200 danh sách rỗng; chưa có màn hình lịch sử riêng, chưa chứng minh đọc log mới sau hoàn thành |
| Quản trị | Màn hình users/recipes/ingredients, BE API đổi role | User thường bị chặn users/role API đúng 403. Chưa test happy path admin; role SUPER_ADMIN chưa khớp FE |
| Nhập bằng ngôn ngữ tự nhiên | BE POST `/api/me/pantry/parse` | `2 carrots` trả preview 200, quantity=2/unit=piece nhưng chưa ghép được ingredient. FE chưa có luồng dùng API này |
| Feedback gợi ý | BE có endpoint feedback/get recommendation | Chưa có FE gọi; chưa kiểm thử thực tế |

## Lỗi backend cần xử lý

### BE-01 — P0: catalog write không yêu cầu đăng nhập

**Đã tái hiện trên dữ liệu tổng hợp:** không gửi Authorization vẫn tạo/sửa/xóa recipe được (HTTP 200, success=true); sửa/xóa ingredient fixture cũng được.

- Routes: POST `/api/recipes`, PUT/DELETE `/api/recipes/{id}`, PUT/DELETE `/api/ingredients/{id}`.
- `UserSecurityConfiguration.java` chỉ ràng buộc auth/users/admin/me/recommendations rồi `.anyRequest().permitAll()`. Controller catalog không kiểm tra role.
- Cùng cấu hình để mở `/api/v2/ingredients`, `/api/v2/recipes`, `/api/media/**`; media chưa kiểm chứng mutation thành công vì thiếu storage.
- Cần xác định quyền ADMIN/MANAGER phù hợp, bắt buộc xác thực và phân quyền mọi route write ở cả JSON/v2/media, không chỉ ẩn nút FE.
- Nghiệm thu: anonymous 401, role không đủ quyền 403, admin hợp lệ thành công; kiểm tra cả upload/delete media.

### BE-02 — P1: tạo nguyên liệu luôn lỗi với payload hợp lệ đã thử

POST `/api/ingredients` với name/category/unit/nutrition/allergens hợp lệ trả **500 `No message available`**.

Log chỉ ra `NullPointerException` tại `HttpAiClient.embedIngredient:54`, gọi từ `IngredientService.create:55`. Service lấy `e.getId()` để tạo `Map.of(...)` trước `repo.save(e)`; ID mới chỉ được tạo trong `BaseEntity.@PrePersist`, nên còn null. `Map.of` không nhận null.

- Cần cấp UUID trước khi gọi embedding hoặc persist/flush theo thứ tự phù hợp; lỗi AI embedding phải có fallback rõ ràng.
- Nghiệm thu: tạo từ form admin thành công, đọc lại đủ nutrition/allergens; AI unavailable không gây NPE.

### BE-03 — P1: Java → AI không truyền được request như AI mong đợi

POST `/api/recommendations/v2/meals` với `{ "topK": 5 }` và V1 đều trả **500 `AI service request failed`**.

- Java log có upstream **422**, `loc:["body"]`, `Field required`, `input:null`.
- AI container ghi 422 ở `/ai/recommend-meals`, `/ai/embed-ingredient`, `/ai/embed-recipe` và có cảnh báo `Unsupported upgrade request`/`Invalid HTTP request received` quanh các request.
- Cần kiểm tra request thực tế, HTTP transport/protocol và JSON serialization giữa Java RestClient và AI; không kết luận chỉ sai DTO hay chỉ HTTP/2 khi chưa đo request wire.
- Recipe update có thể trả 200 dù embedding thất bại và chỉ ghi warning, nên CRUD PASS không chứng minh search/recommendation AI đã sẵn sàng.
- Nghiệm thu: gọi V2 từ FE trả danh sách hợp lệ với recipeId truy xuất được, có fallback/lỗi 502/503 rõ ràng khi AI lỗi; kiểm thử diet/allergy filter và dữ liệu rỗng.

### BE-04 — P1: media chưa cấu hình, chặn nhiều luồng

POST `/api/media/upload` và POST `/api/me/today-menu/items/{id}/complete` với ảnh PNG multipart đều trả **500 `Media storage is not configured`**.

- Cần cấu hình Cloudinary ở BE (`ZPANTRY_MEDIA_CLOUDINARY_CLOUD_NAME`, `...API_KEY`, `...API_SECRET`) hoặc adapter local riêng cho dev. Không đưa secret vào FE.
- Ảnh catalog, hoàn thành món, tạo cooking log/trừ kho chưa thể nghiệm thu.
- Nghiệm thu: upload trả URL dùng được; hoàn thành món chỉ một lần, lưu ảnh/log và trừ kho đúng; retry không tạo log/trừ kho lặp.

### BE-05 — P1: nhận diện ảnh/hóa đơn bị chặn

POST `/api/me/pantry-import/food-image/analyze` và `/receipt/analyze` với trường multipart `image` trả **503 `Image analysis is currently unavailable.`**. AI log ghi 422 ở `/ai/recognize-food-image` và `/ai/analyze-receipt`.

- Cần sửa hợp đồng multipart Java → AI, kiểm tra field/header/file truyền thực tế. `HttpAiClient.postImage` nhận contentType nhưng chưa dùng để đặt content type cho part.
- `PantryImportService.analyze` bắt mọi Exception rồi thay bằng thông báo chung, mất cause; cần giữ cause và correlation ID trong log server.
- Ảnh thử là PNG nhỏ tổng hợp: kiểm tra được đường truyền nhưng không chứng minh chất lượng OCR/nhận diện thực phẩm. Sau sửa cần ảnh hóa đơn và món ăn thực tế.

### BE-06 — P1: detail thực đơn không khớp dữ liệu FE cần

GET `/api/me/today-menu/items/{id}` trả 200 nhưng chỉ có metadata `TodayMenuItemResponse`. Không có `recipe`, `requiredIngredients`, `pantryItems`, `pantryUsageLogs`.

`TodayMenuItemDetailScreen.tsx` đọc trực tiếp các field này để hiển thị cách nấu/nguyên liệu/tủ. Kết quả là các vùng thiếu dữ liệu mặc dù đã có recipeId hợp lệ.

- Cần DTO detail đầy đủ, hoặc thống nhất FE gọi thêm recipe/pantry rồi ghép. Ghi rõ lựa chọn vào contract.
- Nghiệm thu: màn chi tiết hiện đúng nguyên liệu/cách nấu/tồn kho của món đã thêm.

### BE-07 — P1: pantry nhận số lượng âm

PUT `/api/me/pantry/items/{id}` với `quantity: -1` trả **200, success=true, quantity=-1**. `PantryService.apply` không validate lượng; luồng CRUD khác với import-confirm (confirm đã chặn lượng âm).

- Cần validation nhất quán create/update/import: ingredient tồn tại, quantity hợp lệ, unit hợp lệ.
- Nghiệm thu: lượng âm/không hợp lệ trả 400 và dữ liệu trước đó không đổi.

### BE-08 — P2: không xóa được hạn sử dụng

Tạo pantry có expiry, rồi PUT `expiredAt:null` vẫn trả ngày cũ. `PantryService.apply` chỉ gán khi `ex != null`.

- Cần thống nhất semantics omitted/null, hỗ trợ xóa expiry có chủ đích.
- Nghiệm thu: null xóa ngày, trường không gửi xử lý theo contract đã thống nhất.

### BE-09 — P1: OTP email và khôi phục tài khoản còn thiếu

- `dev` dùng `DevResendEmailVerficationAdapter`, chỉ println OTP. API lại báo người dùng kiểm tra Gmail.
- OTP hạn 5 phút; register lại email đã có trả 500. Không thấy route resend OTP/forgot password/reset password trong AuthController.
- Cần email thật ở môi trường phù hợp, resend có cooldown/giới hạn số lần và giới hạn thử OTP; bổ sung forgot/reset nếu thuộc phạm vi sản phẩm.
- Nghiệm thu: người dùng hết hạn OTP có đường xác thực lại trong ứng dụng, không cần sửa DB; thông báo dev không nói đã gửi Gmail thật.

### BE-10 — P2: HTTP error mapping chưa đúng

- Đăng ký email trùng trả **500**, nên trả 409/400 theo contract.
- GET/PUT profile của người khác bị chặn nhưng trả **500 OwnerAuthorizationException**, nên trả 403. Không thấy lộ hay thay đổi profile ở phép thử này.
- Cần handler dùng chung và traceId nhất quán; nhiều response hiện traceId rỗng.
- Nghiệm thu: lỗi input/quyền không biến thành server error; FE hiển thị thông báo đúng.

### BE-11 — P2: hoàn thành món và history cần kiểm tra thêm sau khi sửa media

**Phát hiện từ source, chưa chạy được nhánh hoàn thành thành công:**

- Trừ kho dùng thẳng `needed.quantity`; chưa thấy nhân tỷ lệ `menu.servingSize / recipe.servingSize`.
- GET cooking-logs luôn đưa `pantryUsageLogs = List.of()` dù có repository usage.
- Danh sách updatedPantryItems khi complete chỉ chứa id/ingredientId/quantity, ít field hơn FE type.
- Chưa thấy bỏ qua nguyên liệu hết hạn hoặc xử lý đồng thời/lặp request trong luồng trừ kho.

Cần chốt quy tắc khẩu phần/hạn dùng và test transaction/idempotency, đọc lại history sau reload; không đánh dấu hoàn thành tính năng chỉ vì endpoint đã tồn tại.

## Lỗi và thiếu sót phía frontend/integration

| ID | Mức | Bằng chứng từ source | Cần làm |
|---|---|---|---|
| FE-01 | P1 | `LoginScreen.tsx` lưu access token Google/Facebook trực tiếp vào `signIn`, refreshToken rỗng; Java chỉ chấp nhận JWT riêng | BE endpoint exchange/verify provider token, trả JWT + UUID user + refresh; FE dùng phiên đó |
| FE-02 | P1 | `refreshStoredSession()` được định nghĩa nhưng không có nơi gọi; client 401 chỉ throw; getSession không kiểm tra expiresAt | Refresh tự động hoặc lúc khôi phục, xử lý rotation/concurrency và clear session khi refresh thất bại |
| FE-03 | P2 | `authStorage.ts` dùng Map trong RAM trên native; checkbox rememberMe không tham gia saveSession | Lưu token native bằng secure storage, thống nhất ý nghĩa rememberMe, test khởi động lại app |
| FE-04 | P1 | `AppNavigator` chỉ nhận admin/administrator; BE có SUPER_ADMIN, ADMIN, MANAGER, USER; `/api/users` chỉ hasRole ADMIN | Thống nhất role hierarchy, màn hình và API quyền super-admin/manager; cần test bằng các tài khoản role thật |
| FE-05 | P2 | Plan chỉ tải ngày hôm nay, trang 1/20; Pantry trang 1/50, catalog/admin tối đa 100; không thấy load-more tương ứng | Hoàn thiện phân trang và chọn ngày nếu yêu cầu thực đơn nhiều ngày; dữ liệu vượt trang đầu chưa được kiểm thử |
| FE-06 | P2 | `HomeScreen.recipeToMeal`: calories = servingSize * 160 hoặc 320 | Dùng nutrition thật/giá trị tính từ nguyên liệu hoặc ghi rõ chưa có dữ liệu, không hiển thị số giả như dữ liệu thật |
| FE-07 | P2 | Có API cookingLogs nhưng không có nơi gọi trong screen; parse/feedback BE chưa có client/luồng FE | Ghi rõ chưa tích hợp; thêm UI nếu nằm trong phạm vi sản phẩm |

Không thấy luồng quên mật khẩu, gửi lại OTP, lịch sử nấu độc lập, kế hoạch tuần/chọn ngày hoàn chỉnh hoặc thông báo push được nối end-to-end. Đây là các khoảng trống tính năng, không khẳng định tất cả đều là yêu cầu bắt buộc khi chưa có đặc tả sản phẩm.

## Đối chiếu contract

- Các API client đang sử dụng có route/method tương ứng trong controller Java: auth, user/profile, ingredient/recipe JSON, pantry, import, recommendations, today-menu, media.
- Create ingredient hiện FE đã gửi đúng tên field BE viết nhầm `protenPerUnit`; lỗi 500 không phải vì FE gửi `proteinPerUnit` sai.
- FE catalog hiện upload ảnh trước rồi gửi JSON để bảo toàn allergens. Các helper/registry v2 multipart còn tồn tại nhưng không phải luồng create/update đang gọi.
- Ingredient v2 create ở BE dùng `@RequestBody`, update dùng `@ModelAttribute`: không thể áp dụng mô tả cũ rằng tất cả v2 đều multipart. Cần dọn tài liệu/helper nếu dùng lại.
- FE xử lý envelope `success=false` trong HTTP 200; các lỗi not-found qua envelope ở phép thử không bị coi là thành công chức năng.
- Sai khác dữ liệu quan trọng nhất đã xác nhận: today-menu detail. Những endpoint 200 nhưng thiếu dữ liệu, thiếu quyền hoặc chỉ chạy phần stub không được tính là hoàn thiện.

## Thứ tự xử lý đề xuất và điều kiện nghiệm thu

1. Đóng lỗ hổng write catalog/media (BE-01).
2. Sửa tạo nguyên liệu, kết nối Java–AI, media storage (BE-02/03/04/05).
3. Hoàn thiện detail thực đơn, pantry validation, email/resend OTP (BE-06/07/08/09/10).
4. Kiểm tra hoàn thành món → trừ kho → lịch sử, đúng khẩu phần và retry (BE-11).
5. Nối OAuth, refresh/session native, role hierarchy, dữ liệu dinh dưỡng thật và phân trang FE.
6. Chạy lại API audit; sau đó kiểm thử UI thật trên web và Android/iOS: đăng ký → nhận email → profile → nguyên liệu → pantry → gợi ý AI → recipe → thực đơn → upload ảnh hoàn thành → history → logout/restart.

Báo cáo này ghi nhận lỗi và yêu cầu bổ sung; **chưa sửa code nghiệp vụ FE/BE trong lần audit**. Không cấp quyền admin hay thay đổi cấu hình production để làm cho test vượt qua.
