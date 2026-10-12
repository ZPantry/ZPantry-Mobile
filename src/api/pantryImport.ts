import { apiRequest, ApiError, type ApiMessageResponse } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { recipesApi, type Recipe, type UploadFile } from "@/api/recipes";
import type { TodayMenuItem } from "@/api/todayMenu";

export type ImportSource = "RECEIPT" | "FOOD_IMAGE" | "AUTO";
export type ImportMethod = ImportSource | "TEXT" | "MENU";
export type ImportPreviewItem = {
  rawName: string; normalizedName: string; ingredientId: string | null;
  canonicalIngredientName: string | null; quantity: number | null; unit: string | null;
  price: number | null; confidence: number | null;
  resolverStatus: "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED";
  reviewRequired?: boolean;
  sourceUnit?: string | null;
};
export type ImportPreview = { sourceType: ImportMethod; items: ImportPreviewItem[]; warnings: string[] };
export type ImportItem = { ingredientId: string; quantity: number; unit: string };

export function buildMenuPreview(meals: Array<{ recipe: Recipe; servingSize: number }>): ImportPreview {
  if (!meals.length) throw new ApiError("Chọn ít nhất một món trong thực đơn.", 400);
  const items = new Map<string, ImportPreviewItem>();
  for (const { recipe, servingSize } of meals) {
    if (!Number.isFinite(servingSize) || servingSize <= 0 || !Number.isFinite(recipe.servingSize) || recipe.servingSize <= 0)
      throw new ApiError("Món " + recipe.name + " chưa có khẩu phần hợp lệ.", 400);
    if (!recipe.ingredients?.length) throw new ApiError("Món " + recipe.name + " chưa có nguyên liệu. Chọn món khác hoặc thêm thủ công.", 400);
    for (const ingredient of recipe.ingredients) {
      const quantity = ingredient.quantity * servingSize / recipe.servingSize;
      const unit = ingredient.unit?.trim() || "";
      if (!ingredient.ingredientId || !Number.isFinite(quantity) || quantity <= 0 || !unit)
        throw new ApiError("Món " + recipe.name + " có nguyên liệu thiếu định lượng. Vui lòng kiểm tra công thức.", 400);
      const existing = items.get(ingredient.ingredientId);
      if (existing && existing.unit?.toLowerCase() !== unit.toLowerCase())
        throw new ApiError("Nguyên liệu " + ingredient.ingredientName + " dùng đơn vị khác nhau giữa các món. Hãy chọn từng món để kiểm tra và quy đổi trước khi lưu.", 400);
      if (existing) existing.quantity = (existing.quantity || 0) + quantity;
      else items.set(ingredient.ingredientId, {
        rawName: ingredient.ingredientName || "Nguyên liệu", normalizedName: ingredient.ingredientName || "",
        ingredientId: ingredient.ingredientId, canonicalIngredientName: ingredient.ingredientName,
        quantity, unit, price: null, confidence: null, resolverStatus: "RESOLVED"
      });
    }
  }
  return { sourceType: "MENU", items: [...items.values()].map(item => ({ ...item, quantity: Number(item.quantity!.toFixed(4)) })), warnings: [] };
}

export function validateImportItems(items: ImportItem[]) {
  if (!items.length) throw new ApiError("Chọn ít nhất một nguyên liệu để thêm vào tủ.", 400);
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.ingredientId || !Number.isFinite(item.quantity) || item.quantity < 0.0001 || !item.unit.trim() || item.unit.length > 50)
      throw new ApiError("Mỗi dòng cần nguyên liệu, số lượng lớn hơn 0 và đơn vị hợp lệ.", 400);
    if (ids.has(item.ingredientId)) throw new ApiError("Có nguyên liệu bị trùng. Hãy gộp số lượng vào một dòng trước khi lưu.", 400);
    ids.add(item.ingredientId);
  }
}
export const pantryImportApi = {
  async parseText(text: string): Promise<ImportPreview> {
    if (!text.trim()) throw new ApiError("Nhập tên và số lượng thực phẩm trước khi phân tích.", 400);
    const result = await apiRequest<Array<{ name: string; quantity: number | null; unit: string | null; ingredientId: string | null; ingredientName: string | null; matched: boolean }>>(
      endpoints.pantryImport.text, { method: "POST", auth: true, body: JSON.stringify({ text: text.trim() }), timeoutMs: 90000 }
    );
    if (!Array.isArray(result)) throw new ApiError("Kết quả phân tích văn bản không hợp lệ.", 502);
    return { sourceType: "TEXT", warnings: [], items: result.map(item => ({
      rawName: item.name, normalizedName: item.name, quantity: item.quantity, unit: item.unit,
      ingredientId: item.matched ? item.ingredientId : null, canonicalIngredientName: item.ingredientName,
      resolverStatus: item.matched && item.ingredientId ? "RESOLVED" : "UNRESOLVED", price: null, confidence: null
    })) };
  },
  async fromMenu(meals: TodayMenuItem[]): Promise<ImportPreview> {
    if (!meals.length) throw new ApiError("Chọn ít nhất một món trong thực đơn.", 400);
    if (meals.some(meal => !meal.recipeId)) throw new ApiError("Có món chưa liên kết với công thức. Hãy chọn món khác.", 400);
    const recipes = new Map(await Promise.all([...new Set(meals.map(meal => meal.recipeId!))].map(async id => [id, await recipesApi.get(id)] as const)));
    return buildMenuPreview(meals.map(meal => ({ recipe: recipes.get(meal.recipeId!)!, servingSize: meal.servingSize })));
  },
  async analyze(source: ImportSource, file: UploadFile): Promise<ImportPreview> {
    const body = new FormData();
    body.append("image", file as Blob);
    const result = await apiRequest<ImportPreview & { imageType?: string; ingredients?: ImportPreviewItem[] }>(source === "AUTO" ? endpoints.pantryImport.autoImage : source === "RECEIPT" ? endpoints.pantryImport.receipt : endpoints.pantryImport.food, {
      method: "POST", auth: true, body, timeoutMs: 90000
    });
    const items = source === "AUTO" ? result.ingredients : result.items;
    if (!Array.isArray(items)) throw new ApiError("Kết quả phân tích ảnh không hợp lệ. Vui lòng thử lại.", 502);
    if (source === "AUTO" && result.imageType === "UNKNOWN")
      return { sourceType: "AUTO", items: [], warnings: [...(result.warnings || []), "Chưa xác định được loại ảnh. Hãy chọn ảnh thực phẩm hoặc hóa đơn rõ hơn."] };
    return { sourceType: source === "AUTO" ? (result.imageType === "RECEIPT" ? "RECEIPT" : "FOOD_IMAGE") : source, items, warnings: result.warnings || [] };
  },
  confirm(items: ImportItem[]) {
    validateImportItems(items);
    return apiRequest<ApiMessageResponse>(endpoints.pantryImport.confirm, { method: "POST", auth: true, body: JSON.stringify({ items }) });
  }
};
