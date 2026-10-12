import type { PaginatedResponse } from "@/api/response";

// Read every page for pickers and small local catalogs, instead of silently
// truncating results at the server's 100-row cap.
export async function collectPages<T>(fetchPage: (page: number) => Promise<PaginatedResponse<T>>) {
  const data: T[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    data.push(...result.data);
    if (!result.hasNextPage || !result.data.length) return data;
    if (page >= 1000) throw new Error("Danh sách quá lớn. Vui lòng thu hẹp phạm vi tìm kiếm.");
  }
}
