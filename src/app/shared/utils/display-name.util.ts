import { UserResponse } from '../../core/models';

export function getDisplayName(user: UserResponse | null): string {
  if (!user) return '';
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone || user.email || '';
}
