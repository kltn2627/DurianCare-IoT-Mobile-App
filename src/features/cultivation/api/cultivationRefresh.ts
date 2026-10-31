let revision = 0;
const listeners = new Set<() => void>();
export const getCultivationRevision = () => revision;
export function subscribeCultivation(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyCultivationChanged() { revision++; listeners.forEach(listener => listener()); }

/** Screen-scoped cache, never persisted or shared across users. */
export function createHistoryCache<T>(fetchHistory: (seasonId: string) => Promise<T>) {
  const cache = new Map<string, T>();
  const pending = new Map<string, Promise<T>>();
  return {
    invalidate(seasonId: string) { cache.delete(seasonId); pending.delete(seasonId); },
    get(seasonId: string): Promise<T> {
      if (cache.has(seasonId)) return Promise.resolve(cache.get(seasonId)!);
      if (pending.has(seasonId)) return pending.get(seasonId)!;
      const request = fetchHistory(seasonId).then(data => {
        if (pending.get(seasonId) === request) cache.set(seasonId, data);
        return data;
      }).finally(() => { if (pending.get(seasonId) === request) pending.delete(seasonId); });
      pending.set(seasonId, request);
      return request;
    },
  };
}
export async function saveCompletionAndRefresh(save: () => Promise<unknown>, invalidate: () => void,
  refreshers: (() => Promise<unknown>)[]) {
  await save();
  invalidate();
  // A refresh failure after saving must not invite a duplicate completion submission.
  return Promise.allSettled(refreshers.map(refresh => Promise.resolve().then(refresh)));
}
