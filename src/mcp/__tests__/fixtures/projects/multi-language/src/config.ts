export const API_URL = 'https://api.example.com';
export const TIMEOUT = 5000;

export function getConfig(): { apiUrl: string; timeout: number } {
  return { apiUrl: API_URL, timeout: TIMEOUT };
}
