export async function loadManifest<T>(path: string): Promise<T> {
  const dev = process.env.NODE_ENV === 'development';
  const url = dev ? `${path}?v=${Date.now()}` : path;
  const res = await fetch(url, { cache: dev ? 'no-store' : 'default' });
  if (!res.ok) throw new Error(`Manifest fetch failed: ${path} ${res.status}`);
  return res.json() as Promise<T>;
}
