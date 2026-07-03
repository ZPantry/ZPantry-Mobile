export function translateMealType(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "Bữa ăn";
  if (normalized.includes("breakfast") || normalized.includes("sáng")) return "Bữa sáng";
  if (normalized.includes("lunch") || normalized.includes("trưa")) return "Bữa trưa";
  if (normalized.includes("dinner") || normalized.includes("tối")) return "Bữa tối";
  return value || "Bữa ăn";
}

export function getCurrentMealType() {
  const hour = new Date().getHours();
  if (hour < 10) return "Bữa sáng";
  if (hour < 15) return "Bữa trưa";
  return "Bữa tối";
}

export function translateDifficulty(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "easy") return "Dễ";
  if (normalized === "medium") return "Vừa";
  if (normalized === "hard" || normalized === "difficult") return "Khó";
  return value || "Dễ nấu";
}

export function translateStatus(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "cooked" || normalized === "completed") return "Đã hoàn thành";
  if (normalized === "cancelled" || normalized === "canceled") return "Đã hủy";
  if (normalized === "cooking") return "Đang nấu";
  return "Đang lên kế hoạch";
}

export function translateApiMessage(message: string) {
  const value = message.trim();
  const lower = value.toLowerCase();

  if (!value) return value;
  if (lower.includes("this meal already exists in today's menu")) return "Món này đã có trong thực đơn hôm nay.";
  if (lower.includes("recipe not found")) return "Không tìm thấy công thức.";
  if (lower.includes("today menu item not found")) return "Không tìm thấy món trong thực đơn hôm nay.";
  if (lower.includes("imagefile is required")) return "Vui lòng chọn ảnh thành phẩm.";
  if (lower.includes("this meal has already been completed")) return "Món này đã được hoàn thành trước đó.";
  if (lower.includes("cooked menu items cannot be deleted")) return "Không thể xóa món đã hoàn thành.";
  if (lower.includes("mealid or recipeid is required")) return "Thiếu mã món ăn hoặc mã công thức.";
  if (lower.includes("mealid and recipeid must match")) return "Mã món ăn và mã công thức không khớp.";
  if (lower.includes("does not have a resolved recipe")) return "Món này chưa liên kết với công thức hợp lệ.";
  if (lower.includes("unable to complete today menu item")) return "Chưa thể hoàn thành món. Vui lòng thử lại.";
  if (lower.includes("request failed")) return "Yêu cầu thất bại. Vui lòng thử lại.";
  if (lower.includes("network error")) return "Không thể kết nối mạng. Vui lòng thử lại.";

  return value;
}

export function translatePantryWarning(message: string) {
  const value = message.trim();
  const missingMatch = value.match(/^Missing pantry item for (.+)\.$/i);
  if (missingMatch) return `Thiếu nguyên liệu trong tủ: ${missingMatch[1]}.`;

  const unusableMatch = value.match(/^Ingredient (.+) does not have a usable quantity\.$/i);
  if (unusableMatch) return `Nguyên liệu ${unusableMatch[1]} chưa có định lượng hợp lệ.`;

  const quantityMissingMatch = value.match(/^Pantry quantity is missing for (.+)\.$/i);
  if (quantityMissingMatch) return `Nguyên liệu ${quantityMissingMatch[1]} trong tủ chưa có số lượng.`;

  const notEnoughMatch = value.match(/^Not enough pantry quantity for (.+)\.$/i);
  if (notEnoughMatch) return `Không đủ số lượng trong tủ cho ${notEnoughMatch[1]}.`;

  const unitMismatchMatch = value.match(/^Unit mismatch for (.+): pantry='(.+)', recipe='(.+)'\.$/i);
  if (unitMismatchMatch) {
    return `Đơn vị của ${unitMismatchMatch[1]} chưa khớp: trong tủ là ${unitMismatchMatch[2]}, công thức cần ${unitMismatchMatch[3]}.`;
  }

  return translateApiMessage(value);
}

export function translateRecommendationText(message?: string | null) {
  const value = (message || "").trim();
  if (!value) return "";

  const missingMatch = value.match(/^You are missing (\d+) ingredient\(s\) for this meal\.$/i);
  if (missingMatch) return `Bạn còn thiếu ${missingMatch[1]} nguyên liệu cho món này.`;

  if (value.toLowerCase() === "you have all ingredients for this meal.") {
    return "Bạn đã có đủ nguyên liệu cho món này.";
  }

  if (value.toLowerCase().includes("suitable") || value.toLowerCase().includes("recommended")) {
    return "Món phù hợp với nguyên liệu bạn đang có.";
  }

  return value;
}
