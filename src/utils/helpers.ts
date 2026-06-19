import { colors } from "@/constants/colors";
import type { PantryStatus } from "@/types";

export function statusColor(status: PantryStatus) {
  if (status === "danger") return colors.danger;
  if (status === "warning") return colors.warning;
  return colors.success;
}

export function progressPercent(value: number, target: number) {
  return Math.min(100, Math.round((value / target) * 100));
}
