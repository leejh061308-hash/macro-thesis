export const WATCHLIST_UPDATED_EVENT = "macrolens:watchlist-updated";

export function notifyWatchlistUpdated() {
  window.dispatchEvent(new CustomEvent(WATCHLIST_UPDATED_EVENT));
}
