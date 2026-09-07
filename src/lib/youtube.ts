/**
 * Extrae el ID de un video de YouTube desde una URL.
 * Soporta formatos: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Devuelve la URL del thumbnail de YouTube para un video.
 * Calidades: default, mqdefault, hqdefault, sddefault, maxresdefault
 */
export function getYoutubeThumbnail(url: string, quality: "mq" | "hq" | "sd" = "hq"): string | null {
  const id = extractYoutubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}default.jpg`;
}
