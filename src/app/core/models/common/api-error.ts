import { ErrorCode } from '../../enums/error-code';

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: FieldError[];
}

export const isApiError = (value: unknown): value is ApiError => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ApiError>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.status === 'number' &&
    typeof candidate.detail === 'string'
  );
};
