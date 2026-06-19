import { colors } from "./colors";
import type { Meal, MealPlan, NutritionMetric, PantryItem, UserProfile } from "@/types";

export const categories = ["Ngăn mát", "Ngăn đông", "Thêm thực phẩm"];

export const meals: Meal[] = [
  {
    id: "1",
    name: "Salad ức gà",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    calories: 320,
    time: "15 phút",
    matchPercent: 80,
    difficulty: "Dễ",
    availableIngredients: ["Ức gà", "Xà lách", "Cà chua"],
    missingIngredients: ["Sốt mè rang"],
    steps: [
      "Rửa sạch rau củ và để ráo nước.",
      "Áp chảo ức gà với ít dầu và một nhúm muối.",
      "Cắt nhỏ rau, cà chua và thịt gà.",
      "Trộn cùng sốt mè rang.",
      "Dọn ra đĩa và thưởng thức khi còn tươi."
    ]
  },
  {
    id: "2",
    name: "Rau củ xào",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    calories: 250,
    time: "10 phút",
    matchPercent: 90,
    difficulty: "Dễ",
    availableIngredients: ["Cà rốt", "Bông cải", "Hành tây"],
    missingIngredients: ["Dầu hào"],
    steps: ["Sơ chế rau củ.", "Làm nóng chảo.", "Xào nhanh với lửa lớn.", "Nêm nhẹ và dùng ngay."]
  },
  {
    id: "3",
    name: "Canh bí đỏ thịt bằm",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
    calories: 420,
    time: "25 phút",
    matchPercent: 70,
    difficulty: "Vừa",
    availableIngredients: ["Bí đỏ", "Thịt bằm", "Hành lá"],
    missingIngredients: ["Ngò rí"],
    steps: ["Ướp thịt bằm.", "Cắt bí đỏ.", "Nấu thịt với nước dùng.", "Cho bí vào hầm mềm.", "Rắc hành lá."]
  },
  {
    id: "4",
    name: "Cơm gà áp chảo",
    image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
    calories: 550,
    time: "30 phút",
    matchPercent: 60,
    difficulty: "Vừa",
    availableIngredients: ["Gạo", "Ức gà", "Trứng"],
    missingIngredients: ["Dưa leo", "Nước sốt"],
    steps: ["Nấu cơm.", "Ướp gà.", "Áp chảo gà vàng đều.", "Chiên trứng.", "Bày cơm cùng rau ăn kèm."]
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
    steps: ["Thấm khô cá.", "Áp chảo mặt da trước.", "Thêm bơ.", "Vắt chanh và dùng cùng rau."]
  }
];

export const pantryItems: PantryItem[] = [
  { id: "1", name: "Trứng gà ta", quantity: "10 quả", location: "Ngan mat", expiryLabel: "Hết hạn sau 5 ngày", status: "safe", icon: "egg", progress: 78 },
  { id: "2", name: "Sữa tươi", quantity: "500ml", location: "Ngan mat", expiryLabel: "Hết hạn hôm nay", status: "danger", icon: "cup-water", progress: 14 },
  { id: "3", name: "Xà lách", quantity: "2 cây", location: "Ngan mat", expiryLabel: "Hết hạn sau 3 ngày", status: "warning", icon: "leaf", progress: 46 },
  { id: "4", name: "Cá hồi phi lê", quantity: "400g", location: "Ngan mat", expiryLabel: "Tốt trong 1 ngày", status: "warning", icon: "fish", progress: 30 },
  { id: "5", name: "Thịt bò Mỹ", quantity: "1kg", location: "Ngan dong", expiryLabel: "Tốt trong 30 ngày", status: "safe", icon: "food-steak", progress: 95 }
];

export const todayNutrition: NutritionMetric[] = [
  { label: "Calories", value: 1200, target: 1800, unit: "KCAL", color: colors.primary },
  { label: "Protein", value: 45, target: 60, unit: "g", color: colors.success },
  { label: "Carb", value: 150, target: 220, unit: "g", color: "#38BDF8" },
  { label: "Fat", value: 35, target: 50, unit: "g", color: colors.warning }
];

export const mealPlans: MealPlan[] = [
  { id: "1", time: "Sang", title: "Trứng ốp la + sữa", note: "Nhẹ bụng, đủ protein", icon: "sunny" },
  { id: "2", time: "Trua", title: "Salad ức gà", note: "Dùng xà lách trước khi héo", icon: "restaurant" },
  { id: "3", time: "Toi", title: "Cá hồi áp chảo", note: "Ưu tiên cá hồi còn tươi", icon: "moon" }
];

export const weeklyPlan = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, index) => ({
  day,
  meal: ["Salad gà", "Rau củ xào", "Canh bí đỏ", "Cơm gà", "Cá hồi", "Bò áp chảo", "Bún rau"][index],
  kcal: [320, 250, 420, 550, 480, 610, 390][index]
}));

export const userProfile: UserProfile = {
  name: "Khang",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  goals: ["Tiết kiệm chi phí", "Giảm lãng phí", "Ăn uống lành mạnh"],
  preferences: ["Món Việt", "Ít dầu mỡ", "Không quá cay"]
};
