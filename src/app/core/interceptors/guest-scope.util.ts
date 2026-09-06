import { API_ROUTES } from '../constants/api-routes';
const GUEST_SCOPE_EXACT_URLS: readonly string[] = [API_ROUTES.orders.place(), API_ROUTES.shipping.quote()];

export function isGuestTokenScopeUrl(url: string): boolean {
  return url.startsWith(API_ROUTES.cart.cart()) || GUEST_SCOPE_EXACT_URLS.includes(url);
}
