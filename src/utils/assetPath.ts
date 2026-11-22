export function resolveAssetPath(assetPath: string): string {
  if (!assetPath) return assetPath;
  if (/^(https?:|data:|blob:)/.test(assetPath)) {
    return assetPath;
  }

  let base = '/';
  try {
    const metaEnv = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
    if (metaEnv?.BASE_URL) {
      base = metaEnv.BASE_URL;
    }
  } catch {
    base = '/';
  }

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${normalizedBase}${cleanPath}`;
}
