import { ApiError } from "./response";

// Configuration chooses the host; the migration does not add /api/v1.
export function resolveApiBaseUrl(baseUrl: string | undefined, androidUrl: string | undefined, platform: string) {
  if (!baseUrl?.trim()) throw new ApiError("Chưa kết nối được nguồn dữ liệu.", 0);

  const parse = (value: string) => {
    const normalized = value.trim().replace(/\/+$/, "");
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `http://${normalized}`);
    if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
      throw new Error("Invalid API base URL");
    }
    if (url.protocol === "http:" && url.hostname.endsWith(".onrender.com")) url.protocol = "https:";
    return url;
  };

  try {
    let url = parse(baseUrl);
    if (platform === "android" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      if (androidUrl?.trim()) url = parse(androidUrl);
      else url.hostname = "10.0.2.2";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new ApiError("Nguồn dữ liệu chưa sẵn sàng.", 0);
  }
}
