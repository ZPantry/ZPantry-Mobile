import type { Recipe } from "@/api/recipes";
import type { PantryApiItem } from "@/api/pantry";
import type { MealIngredientCheckResponse } from "@/api/recommendations";

// Compare real pantry quantities; only convert between units with known ratios.
const units: Record<string, { family: string; factor: number }> = {
  g: { family: "mass", factor: 1 }, kg: { family: "mass", factor: 1000 },
  ml: { family: "volume", factor: 1 }, l: { family: "volume", factor: 1000 },
  piece: { family: "count", factor: 1 }, "cái": { family: "count", factor: 1 }
};
export function compareRecipePantry(recipe: Recipe, pantry: PantryApiItem[], servings = recipe.servingSize, now = new Date()): MealIngredientCheckResponse {
  const availableIngredients: MealIngredientCheckResponse["availableIngredients"] = [];
  const missingIngredients: MealIngredientCheckResponse["missingIngredients"] = [];
  const notes = new Set<string>();
  for (const required of recipe.ingredients || []) {
    const unit = required.unit.trim().toLowerCase();
    const target = units[unit];
    const needed = required.quantity * servings / (recipe.servingSize || 1);
    let available = 0;
    for (const row of pantry.filter(p => p.ingredientId === required.ingredientId)) {
      if (row.expiredAt && (Number.isNaN(Date.parse(row.expiredAt)) || Date.parse(row.expiredAt) <= now.getTime())) {
        notes.add("Nguyên liệu hết hạn hoặc có hạn dùng không hợp lệ không được tính vào lượng có thể sử dụng."); continue;
      }
      const sourceUnit = row.unit.trim().toLowerCase(), source = units[sourceUnit];
      if (sourceUnit === unit) available += Math.max(0, row.quantity);
      else if (source && target && source.family === target.family) available += Math.max(0, row.quantity) * source.factor / target.factor;
      else notes.add("Có nguyên liệu khác đơn vị; cần kiểm tra và quy đổi thủ công.");
    }
    const item = { ingredientId: required.ingredientId, name: required.ingredientName, unit: required.unit };
    if (available > 0) availableIngredients.push({ ...item, quantity: Number(available.toFixed(4)) });
    if (needed > available) missingIngredients.push({ ...item, requiredQuantity: Number((needed - available).toFixed(4)) });
  }
  if (!recipe.ingredients?.length) notes.add("Công thức chưa có định lượng nguyên liệu để đối chiếu với tủ.");
  return { availableIngredients, missingIngredients, note: [...notes].join(" ") || undefined };
}
