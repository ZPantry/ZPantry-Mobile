import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";

export const goals = [
  { value: "WEIGHT_LOSS", label: "Giảm cân" }, { value: "WEIGHT_GAIN", label: "Tăng cân" },
  { value: "MUSCLE_GAIN", label: "Tăng cơ" }, { value: "MAINTAIN_WEIGHT", label: "Giữ cân" },
  { value: "HEALTHY_EATING", label: "Ăn uống lành mạnh" }
] as const;
export const diets = [
  { value: "NONE", label: "Không kiêng" }, { value: "VEGETARIAN", label: "Ăn chay" },
  { value: "VEGAN", label: "Thuần chay" }, { value: "KETO", label: "Keto" },
  { value: "LOW_CARB", label: "Ít tinh bột" }, { value: "HIGH_PROTEIN", label: "Giàu đạm" }
] as const;
export const allergens = [
  { value: "PEANUT", label: "Đậu phộng" }, { value: "TREE_NUT", label: "Hạt cây" },
  { value: "MILK", label: "Sữa" }, { value: "EGG", label: "Trứng" },
  { value: "SOY", label: "Đậu nành" }, { value: "WHEAT", label: "Lúa mì" },
  { value: "GLUTEN", label: "Gluten" }, { value: "FISH", label: "Cá" },
  { value: "SHELLFISH", label: "Giáp xác, nhuyễn thể" }, { value: "SESAME", label: "Mè / vừng" }
] as const;
export type FoodAllergen = typeof allergens[number]["value"];
export type ProfilePayload = {
  age: number | null; gender: string | null; height: number | null; weight: number | null;
  goal: typeof goals[number]["value"] | null;
  dietPreference: typeof diets[number]["value"] | null;
  allergies: FoodAllergen[];
};
export type HealthProfile = ProfilePayload & { id: string | null; userId: string };
export const profileApi = {
  get(userId: string) { return apiRequest<HealthProfile>(endpoints.profile(userId), { auth: true }); },
  save(userId: string, payload: ProfilePayload) {
    return apiRequest<HealthProfile>(endpoints.profile(userId), { method: "PUT", auth: true, body: JSON.stringify(payload) });
  }
};
