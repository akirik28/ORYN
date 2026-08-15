export type ProviderErrorType =
  | "not_configured"
  | "auth_failed"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "malformed_response";

export interface ProviderError {
  type: ProviderErrorType;
  message: string;
}

export type ProviderResult<T> = { success: true; data: T } | { success: false; error: ProviderError };
