export const HANZI_DATA_VERSION = '2.0.1';
const CACHE_NAME = `scofield-zh-hanzi-${HANZI_DATA_VERSION}`;
const memory = new Map();
const pending = new Map();
const LIMIT = 128;

export const extractHanCharacters = (text) => Array.from(String(text || '')).filter((char) => /\p{Script=Han}/u.test(char));
export const hanziDataUrl = (char) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${HANZI_DATA_VERSION}/${encodeURIComponent(char)}.json`;
export const isHanziData = (data) => Array.isArray(data?.strokes) && data.strokes.length > 0
  && data.strokes.every((path) => typeof path === 'string' && path.length > 0)
  && Array.isArray(data.medians) && data.medians.length === data.strokes.length
  && data.medians.every((points) => Array.isArray(points) && points.length > 1
    && points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)));

export function loadHanziData(char) {
  const url = hanziDataUrl(char);
  if (memory.has(url)) return Promise.resolve(memory.get(url));
  if (pending.has(url)) return pending.get(url);
  const request = (async () => {
    let cache;
    try {
      if (globalThis.caches) {
        cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url);
        if (cached) {
          const data = await cached.json();
          if (isHanziData(data)) return data;
          await cache.delete(url);
        }
      }
    } catch { /* Private browsing / quota: network and memory cache still work. */ }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 404 ? 'missing' : 'network');
      const data = await response.json();
      if (!isHanziData(data)) throw new Error('invalid-data');
      if (cache) {
        try {
          await cache.put(url, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }));
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - LIMIT)).map((key) => cache.delete(key)));
        } catch { /* A cache write must not prevent a successful animation. */ }
      }
      return data;
    } finally { clearTimeout(timeout); }
  })().then((data) => {
    memory.set(url, data);
    if (memory.size > LIMIT) memory.delete(memory.keys().next().value);
    return data;
  }).finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}
