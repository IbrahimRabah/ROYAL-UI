import { Language } from '../../enums/language';
export interface UserResponse {
  id: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  locale: Language;
  roles: string[];
}
