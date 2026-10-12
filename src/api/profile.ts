import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";

export const goals = [
  { value: "WEIGHT_LOSS", label: "Giảm cân" }, { value: "WEIGHT_GAIN", label: "Tăng cân" },
  { value: "MUSCLE_GAIN", label: "Tăng cơ" }, { value: "MAINTAIN_WEIGHT", label: "Giữ cân" },
  { value: "HEALTHY_EATING", label: "Ăn uống lành mạnh" },
  { value: "HIGH_PROTEIN", label: "Bổ sung đạm" }, { value: "VITAMIN_BALANCE", label: "Cân bằng vitamin" },
  { value: "QUICK_COOKING", label: "Nấu nhanh" }, { value: "WASTE_REDUCTION", label: "Giảm lãng phí" }
] as const;
export const diets = [
  { value: "NONE", label: "Không kiêng" }, { value: "VEGETARIAN", label: "Ăn chay" },
  { value: "VEGAN", label: "Thuần chay" }, { value: "KETO", label: "Keto" },
  { value: "LOW_CARB", label: "Ít tinh bột" }, { value: "HIGH_PROTEIN", label: "Giàu đạm" },
  { value: "EAT_CLEAN", label: "Ăn sạch" }, { value: "DIVERSE", label: "Đa dạng" }
] as const;
export const activityLevels = [
  { value: "SEDENTARY", label: "Ít vận động" }, { value: "LIGHT", label: "Vận động nhẹ" },
  { value: "MODERATE", label: "Vận động vừa" }, { value: "HIGH", label: "Vận động nhiều" }
] as const;
export const allergens = [
  { value: "PEANUT", label: "Đậu phộng" }, { value: "TREE_NUT", label: "Hạt cây" },
  { value: "MILK", label: "Sữa" }, { value: "EGG", label: "Trứng" },
  { value: "SOY", label: "Đậu nành" }, { value: "WHEAT", label: "Lúa mì" },
  { value: "GLUTEN", label: "Gluten" }, { value: "FISH", label: "Cá" },
  { value: "SHELLFISH", label: "Giáp xác, nhuyễn thể" }, { value: "SESAME", label: "Mè / vừng" }
] as const;
export type FoodAllergen = typeof allergens[number]["value"];
type LegacyProfilePayload = {
  age: number | null; gender: string | null; height: number | null; weight: number | null;
  goal: typeof goals[number]["value"] | null;
  dietPreference: typeof diets[number]["value"] | null;
  allergies: FoodAllergen[];
};
type LegacyHealthProfile = LegacyProfilePayload & { id: string | null; userId: string };
export type ProfilePayload = {
  birthDate: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  heightCm: number;
  weightKg: number;
  activityLevel: typeof activityLevels[number]["value"];
  goals: typeof goals[number]["value"][];
  dietPreference: typeof diets[number]["value"];
  allergies: (FoodAllergen | "NO_ALLERGIES")[];
};
export type HealthProfile = { [K in keyof ProfilePayload]: ProfilePayload[K] | null } & {
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  perMealCalorieTarget: number | null;
  perMealProteinTarget: number | null;
  weightLossAllowed: boolean | null;
  healthWarning: string | null;
};
export const profileApi = {
  get(userId: string) { return apiRequest<LegacyHealthProfile>(endpoints.profile(userId), { auth: true }); },
  save(userId: string, payload: LegacyProfilePayload) {
    return apiRequest<LegacyHealthProfile>(endpoints.profile(userId), { method: "PUT", auth: true, body: JSON.stringify(payload) });
  },
  getCurrent() { return apiRequest<HealthProfile>(endpoints.profileV2, { auth: true }); },
  saveCurrent(payload: ProfilePayload) {
    return apiRequest<HealthProfile>(endpoints.profileV2, { method: "PUT", auth: true, body: JSON.stringify(payload) });
  }
};
