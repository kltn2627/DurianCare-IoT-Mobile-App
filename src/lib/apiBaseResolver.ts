export function resolveApiBaseUrl(configured: string | undefined, dev: boolean, hostUri?: string | null,
  gatewayPort = "8080", native = false): string {
  const base = configured?.trim();
  const loopback = (host: string) => ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(host.toLowerCase());
  if (base && base !== "auto") {
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Địa chỉ API phải dùng HTTP hoặc HTTPS.");
    if (native && loopback(url.hostname)) throw new Error("Điện thoại cần địa chỉ LAN của Gateway, không dùng localhost.");
    return base.replace(/\/+$/, "");
  }
  if (dev && base === "auto") {
    if (!hostUri) throw new Error("Không xác định được Gateway. Chạy Expo ở chế độ LAN rồi tải lại ứng dụng.");
    const metro = new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`);
    if (native && loopback(metro.hostname)) throw new Error("Chạy Expo ở chế độ LAN để điện thoại kết nối Gateway.");
    if (!/^\d+$/.test(gatewayPort) || Number(gatewayPort) < 1 || Number(gatewayPort) > 65535) throw new Error("Cổng Gateway không hợp lệ.");
    metro.protocol = "http:";
    metro.port = gatewayPort;
    return metro.origin;
  }
  throw new Error("Thiếu EXPO_PUBLIC_API_BASE_URL để kết nối dịch vụ.");
}
