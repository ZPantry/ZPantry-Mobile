import { apiRequest, ApiError, type ApiMessageResponse } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import type { UploadFile } from "@/api/recipes";

export type ImportSource = "RECEIPT" | "FOOD_IMAGE";
export type ImportPreviewItem = {
  rawName: string; normalizedName: string; ingredientId: string | null;
  canonicalIngredientName: string | null; quantity: number | null; unit: string | null;
  price: number | null; confidence: number | null;
  resolverStatus: "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED";
};
export type ImportPreview = { sourceType: ImportSource; items: ImportPreviewItem[]; warnings: string[] };
export type ImportItem = { ingredientId: string; quantity: number; unit: string };

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
  analyze(source: ImportSource, file: UploadFile) {
    const body = new FormData();
    body.append("image", file as Blob);
    return apiRequest<ImportPreview>(source === "RECEIPT" ? endpoints.pantryImport.receipt : endpoints.pantryImport.food, {
      method: "POST", auth: true, body, timeoutMs: 90000
    });
  },
  confirm(items: ImportItem[]) {
    validateImportItems(items);
    return apiRequest<ApiMessageResponse>(endpoints.pantryImport.confirm, { method: "POST", auth: true, body: JSON.stringify({ items }) });
  }
};
