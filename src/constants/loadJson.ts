export async function loadJson<T>(path: string): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");
  const response = await fetch(`${import.meta.env.BASE_URL}${normalizedPath}`);
  return response.json() as Promise<T>;
}
