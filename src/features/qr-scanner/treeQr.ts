// Tree QR payload printed by the Web app: <web base>/dashboard/client/trees/{treeId}.
// It carries only the tree id; the backend still checks farm ownership on every request.
const TREE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Returns the tree id from a DurianCare tree QR, otherwise null. */
export function parseTreeQr(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("trees");
  if (idx < 0 || idx !== parts.length - 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(parts[idx + 1]);
  } catch {
    return null;
  }
  return TREE_ID_PATTERN.test(id) ? id : null;
}
