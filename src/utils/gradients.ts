const palette = [
  ["#F4A21C", "#FDE3A4"],
  ["#16A34A", "#B7F7D0"],
  ["#0EA5E9", "#B8E9FF"],
  ["#EF4444", "#FFD0D0"],
  ["#8B5CF6", "#E6D8FF"],
  ["#14B8A6", "#C8FFF7"]
] as const;

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getGradient(seedParts: Array<string | undefined | null>) {
  const seed = seedParts.filter(Boolean).join("|").toLowerCase() || "zpantry";
  const paletteIndex = hashText(seed) % palette.length;
  const [start, end] = palette[paletteIndex];
  return { start, end };
}

export function getGradientPair(item: { id?: string; recipeId?: string; ingredientId?: string; name?: string; recipeName?: string; gradientFrom?: string | null; gradientTo?: string | null }) {
  const fallback = getGradient([item.id, item.recipeId, item.ingredientId, item.name, item.recipeName]);
  return {
    start: item.gradientFrom || fallback.start,
    end: item.gradientTo || fallback.end
  };
}
