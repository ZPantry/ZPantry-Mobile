import { colors } from "./colors";
import type { Meal, MealPlan, NutritionMetric, PantryItem, UserProfile } from "@/types";

export const categories = ["Ngăn mát", "Ngăn đông", "Thêm thực phẩm"];

export const meals: Meal[] = [
  {
    id: "1",
    name: "Bánh sandwich kẹp trứng",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80",
    calories: 320,
    time: "15 phút",
    matchPercent: 85,
    difficulty: "Dễ",
    availableIngredients: ["Trứng", "Rau xanh", "Bánh mì"],
    missingIngredients: ["Sốt mayonnaise"],
    steps: ["Áp chảo trứng.", "Nướng nhẹ bánh mì.", "Xếp rau và trứng vào bánh.", "Dùng nóng cùng sốt."]
  },
  {
    id: "2",
    name: "Salad ức gà",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    calories: 340,
    time: "25 phút",
    matchPercent: 80,
    difficulty: "Dễ",
    availableIngredients: ["Ức gà", "Xà lách", "Cà chua"],
    missingIngredients: ["Sốt mè rang"],
    steps: ["Rửa sạch rau củ.", "Áp chảo ức gà.", "Cắt nhỏ rau và thịt.", "Trộn cùng sốt mè rang."]
  },
  {
    id: "3",
    name: "Canh chua cá lóc",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
    calories: 220,
    time: "35 phút",
    matchPercent: 72,
    difficulty: "Vừa",
    availableIngredients: ["Cá", "Cà chua", "Rau thơm"],
    missingIngredients: ["Me chua"],
    steps: ["Sơ chế cá.", "Nấu nước dùng chua.", "Cho cá vào nấu chín.", "Thêm rau thơm trước khi dùng."]
  },
  {
    id: "4",
    name: "Đậu hũ kho nấm",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
    calories: 180,
    time: "20 phút",
    matchPercent: 78,
    difficulty: "Dễ",
    availableIngredients: ["Đậu hũ", "Nấm", "Hành lá"],
    missingIngredients: ["Nước tương"],
    steps: ["Chiên sơ đậu hũ.", "Xào nấm.", "Kho cùng nước tương.", "Rắc hành lá."]
  },
  {
    id: "5",
    name: "Cá hồi áp chảo",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80",
    calories: 480,
    time: "20 phút",
    matchPercent: 75,
    difficulty: "Vừa",
    availableIngredients: ["Cá hồi", "Bơ", "Xà lách"],
    missingIngredients: ["Chanh vàng"],
    steps: ["Thấm khô cá.", "Áp chảo mặt da trước.", "Thêm bơ.", "Dùng cùng rau và chanh."]
  }
];

export const pantryItems: PantryItem[] = [
  { id: "1", name: "Trứng gà ta", quantity: "10 quả", location: "Ngan mat", expiryLabel: "Hết hạn sau 5 ngày", status: "safe", icon: "egg", progress: 78 },
  { id: "2", name: "Sữa tươi", quantity: "1000ml", location: "Ngan mat", expiryLabel: "Hết hạn ngày mai", status: "danger", icon: "cup-water", progress: 14 },
  { id: "3", name: "Xà lách", quantity: "2 cây", location: "Ngan mat", expiryLabel: "Hết hạn sau 1 ngày", status: "warning", icon: "leaf", progress: 46 },
  { id: "4", name: "Cá hồi phi lê", quantity: "400g", location: "Ngan dong", expiryLabel: "Tốt trong 15 ngày", status: "warning", icon: "fish", progress: 30 },
  { id: "5", name: "Thịt bò Mỹ", quantity: "1kg", location: "Ngan dong", expiryLabel: "Tốt trong 30 ngày", status: "safe", icon: "food-steak", progress: 95 }
];

export const todayNutrition: NutritionMetric[] = [
  { label: "Calories", value: 1200, target: 2000, unit: "KCAL", color: colors.primary },
  { label: "Protein", value: 45, target: 60, unit: "g", color: colors.success },
  { label: "Carb", value: 150, target: 220, unit: "g", color: "#FF7A1A" },
  { label: "Fat", value: 35, target: 50, unit: "g", color: "#DDE7E0" }
];

export const mealPlans: MealPlan[] = [
  { id: "1", time: "Sang", title: "Bánh sandwich kẹp trứng", note: "Protein cao, nhanh gọn", icon: "sunny" },
  { id: "2", time: "Trua", title: "Salad ức gà", note: "Dùng xà lách trước khi héo", icon: "restaurant" },
  { id: "3", time: "Toi", title: "Cá hồi áp chảo", note: "Ưu tiên cá hồi còn tươi", icon: "moon" }
];

export const weeklyPlan = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"].map((day, index) => ({
  day,
  meal: ["Salad gà", "Rau củ xào", "Canh chua", "Cơm gà", "Cá hồi"][index],
  kcal: [320, 250, 420, 550, 480][index]
}));

export const userProfile: UserProfile = {
  name: "Khang",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  goals: ["Tiết kiệm chi phí", "Giảm lãng phí", "Ăn uống lành mạnh"],
  preferences: ["Món Việt", "Ít dầu mỡ", "Không quá cay"]
};
