const viteBaseUrl = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;

export function appUrl(path: string): string {
  return `${viteBaseUrl}${path.replace(/^\/+/, '')}`;
}
