export function getApiBaseUrl(): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env;
    return (metaEnv?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function apiUrl(endpointPath: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
