import type { Ingredient } from '@/api/ingredients';

/** Normalize for quantity logic and display; keep the API unit on the draft. */
export function normalizeIngredientUnit(unit: string): string {
  const normalized = unit.trim().toLowerCase();
  switch (normalized) {
    case 'g':
    case 'gram':
      return 'g';
    case 'ml':
    case 'milliliter':
      return 'ml';
    case 'piece':
    case 'pieces':
    case 'quả':
      return 'piece';
    default:
      return normalized;
  }
}

export function getQuantityStep(unit: string): number {
  const normalized = normalizeIngredientUnit(unit);
  return normalized === 'g' || normalized === 'ml' ? 100 : 1;
}

export function getIngredientQuantityStep(ingredient: Pick<Ingredient, 'quantityStep'>, unit: string): number {
  const step = ingredient.quantityStep;
  return typeof step === 'number' && Number.isFinite(step) && step > 0 ? step : getQuantityStep(unit);
}

export function formatIngredientQuantity(quantity: number, unit: string): string {
  const normalized = normalizeIngredientUnit(unit);
  if (normalized === 'g') return quantity >= 1000 ? `${quantity / 1000} kg` : `${quantity} g`;
  if (normalized === 'ml') return quantity >= 1000 ? `${quantity / 1000} L` : `${quantity} ml`;
  if (normalized === 'piece') return `${quantity} quả`;
  return `${quantity} ${unit.trim()}`;
}
