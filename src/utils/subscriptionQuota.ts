import type { Quota } from "@/api/subscription";

export function quotaSummary(quota?: Quota) {
  if (!quota) return "Chưa có dữ liệu";
  if (quota.remaining === null || quota.limit === null) return "Không giới hạn";
  return `Còn ${quota.remaining}/${quota.limit}`;
}

export function quotaUsageDetail(quota?: Quota) {
  if (!quota) return "Đang đồng bộ lượt dùng";
  if (quota.remaining === null || quota.limit === null) return "Không áp dụng giới hạn lượt";
  const parts = quota.resetsOn.split("-");
  const resetLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : quota.resetsOn;
  return `Đã dùng ${quota.used} · đặt lại ${resetLabel}`;
}
