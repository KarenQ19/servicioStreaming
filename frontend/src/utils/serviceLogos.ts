// Mapa centralizado de logos para servicios conocidos
const LOGOS: Array<{ match: string; url: string }> = [
  { match: 'netflix', url: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Netflix_logo.svg' },
  { match: 'spotify', url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg' },
  { match: 'disney', url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Logo_Disney%2B.png' },
  { match: 'prime video', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_video.png' },
  { match: 'amazon prime', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_video.png' },
  { match: 'hbo', url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg' },
  { match: 'max', url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg' },
  { match: 'apple tv', url: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Apple_TV%2B_logo.svg' },
  { match: 'apple music', url: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Apple_Music_logo.svg' },
  { match: 'youtube', url: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png' },
  { match: 'hulu', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg' },
  { match: 'paramount', url: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Paramount_Plus_logo.svg' },
  { match: 'starz', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Starz_2016_logo.svg' },
  { match: 'star+', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Star_Plus.png' },
  { match: 'peacock', url: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Peacock_logo.svg' },
  { match: 'crunchyroll', url: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Crunchyroll_Logo.svg' },
  { match: 'discovery', url: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Discovery%2B_logo.svg' },
  { match: 'espn', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg' },
  { match: 'deezer', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Deezer_Logo_2023.svg' },
  { match: 'tidal', url: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Tidal_logo.png' },
  { match: 'google play', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Google_Play_Music_logo.svg' },
  { match: 'napster', url: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Napster_logo_2018.svg' },
  { match: 'pandora', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Pandora_Logo_2019.svg' },
  { match: 'roku', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Roku_logo.svg' },
  { match: 'pluto', url: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Pluto_TV_2020.png' },
  { match: 'movistar', url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Movistar%2B_2022_logo.svg' },
  { match: 'clarovideo', url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Claro_Video_logo.svg' },
  { match: 'fox', url: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Fox_Broadcasting_Company_logo.svg' },
  { match: 'televisa', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Logo_televisa_univision.svg' },
  { match: 'blim', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Blim_logo.svg' },
];

export function getServicioLogo(nombre: string, imagen?: string, logoUrl?: string) {
  if (imagen) return imagen;
  if (logoUrl) return logoUrl;

  const name = nombre.toLowerCase();
  const found = LOGOS.find(entry => name.includes(entry.match));
  if (found) return found.url;

  const safeName = encodeURIComponent(nombre || 'Servicio');
  // Fallback a un avatar legible con iniciales
  return `https://ui-avatars.com/api/?name=${safeName}&background=E5E7EB&color=111827&bold=true`;
}
