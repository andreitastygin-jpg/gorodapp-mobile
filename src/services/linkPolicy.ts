// Which addresses open inside the app (gorodapp.ru) and which leave it for the
// phone's browser or apps (other sites, Instagram, maps, tel:, mailto:...).

export const SITE_URL = 'https://gorodapp.ru/?tab=event';

const hostOf = (url: string): string => {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].split(':')[0].toLowerCase() : '';
};

export const isSiteUrl = (url: string): boolean => {
  const host = hostOf(url);
  return host === 'gorodapp.ru' || host === 'www.gorodapp.ru';
};

export function linkDecision(url: string): 'load' | 'external' {
  if (!url || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:')) return 'load';
  if (/^https:\/\//i.test(url) && isSiteUrl(url)) return 'load';
  // Other sites (the seller cabinet included), other apps and schemes.
  return 'external';
}

/**
 * Page of the site for an address the app was opened with: a link to
 * gorodapp.ru (QR code, message) as it is, gorodapp://market and similar as the
 * matching tab. Anything else - null (the app stays where it is).
 */
export function siteUrlForIncoming(incoming: string | null | undefined): string | null {
  if (!incoming) return null;
  if (/^https:\/\//i.test(incoming)) return isSiteUrl(incoming) ? incoming : null;
  const m = /^gorodapp:\/\/\/?([a-z]+)?/i.exec(incoming);
  if (!m) return null;
  const tab = (m[1] || '').toLowerCase();
  const tabs: Record<string, string> = { home: 'event', event: 'event', market: 'market', food: 'food', cart: 'cart', profile: 'profile' };
  return tabs[tab] ? `https://gorodapp.ru/?tab=${tabs[tab]}` : SITE_URL;
}
