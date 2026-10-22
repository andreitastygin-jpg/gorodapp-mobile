import { SITE_URL, siteUrlForIncoming } from './linkPolicy';

// Which page of the site the app shows. Every opening from outside - a link
// (gorodapp://, a QR code), a notification tap - is a new request with its own
// id, so the same address opened twice is shown twice (the customer may have
// gone elsewhere on the site in between).

export interface PageRequest {
  url: string;
  id: number;
}

/** The page the app starts with: the address it was opened with, or the home page. */
export function firstPage(launchUrl: string | null | undefined): PageRequest {
  return { url: siteUrlForIncoming(launchUrl) ?? SITE_URL, id: 0 };
}

/** The page for an address from outside; addresses that are not the site keep the current page. */
export function nextPage(current: PageRequest, incoming: string | null | undefined): PageRequest {
  const url = siteUrlForIncoming(incoming);
  return url ? { url, id: current.id + 1 } : current;
}

interface TappedNotification {
  actionIdentifier?: string;
  notification?: { request?: { identifier?: string; content?: { data?: Record<string, unknown> | null } } };
}

export interface NotificationOpen {
  url: string;
  /** Notification id: two notifications with the same page are two openings. */
  key: string;
}

/** Page to open for a tapped notification with { url } in its data; null for anything else. */
export function notificationOpen(
  response: TappedNotification | null | undefined,
  defaultAction: string,
): NotificationOpen | null {
  if (!response || response.actionIdentifier !== defaultAction) return null;
  const request = response.notification?.request;
  const url = request?.content?.data?.url;
  if (typeof url !== 'string' || !siteUrlForIncoming(url)) return null;
  return { url, key: request?.identifier ?? url };
}
