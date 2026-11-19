import { GITHUB_PUBLIC, GITHUB_REPO } from './config';

export const fetchGithubStars = async (): Promise<number | null> => {
  if (!GITHUB_PUBLIC) return null;
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'seoforagent-web' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const count = ((await response.json()) as { stargazers_count?: unknown }).stargazers_count;
    return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
};

export const formatStars = (count: number): string => {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  return `${thousands >= 100 ? Math.round(thousands) : Number(thousands.toFixed(1))}k`;
};
