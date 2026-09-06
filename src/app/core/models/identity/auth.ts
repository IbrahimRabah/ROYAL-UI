import { Language } from '../../enums/language';
import { UserResponse } from './user';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}

export interface RegisterRequest {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  password: string;
  locale?: Language;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  deviceInfo?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}
