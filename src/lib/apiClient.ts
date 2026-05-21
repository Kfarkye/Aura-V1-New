/**
 * apiClient — Authenticated API helper for Firebase-protected endpoints
 * Contract: AURA.CONTRACT.AUTH.FIREBASE_CLIENT_WIRING_V1.002
 *
 * Attaches Authorization: Bearer <Firebase ID token> to protected API calls.
 * Handles 401/403 gracefully. Never persists tokens in browser storage.
 */

import { getFirebaseAuth } from './firebase';

interface ApiClientOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Skip Firebase ID token — use for public endpoints */
  skipAuth?: boolean;
}

interface ApiError extends Error {
  status: number;
  statusText: string;
}

function createApiError(message: string, status: number, statusText: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.statusText = statusText;
  return error;
}

/**
 * Fetch wrapper that attaches Firebase ID token as Authorization: Bearer header.
 * Returns parsed JSON or throws an ApiError with status info.
 */
export async function apiFetch<T = any>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...fetchOptions } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Attach Firebase ID token if authenticated and not skipped
  if (!skipAuth) {
    try {
      const firebaseAuth = await getFirebaseAuth();
      if (firebaseAuth.currentUser) {
        const idToken = await firebaseAuth.currentUser.getIdToken();
        finalHeaders['Authorization'] = `Bearer ${idToken}`;
      }
    } catch {
      // Token retrieval failed — proceed without auth header
      // Server will return 401 if auth is required
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: finalHeaders,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch {
      // Response wasn't JSON
    }

    if (response.status === 401) {
      throw createApiError('Session expired. Please sign in again.', 401, 'Unauthorized');
    }
    if (response.status === 403) {
      throw createApiError('Access denied. Please reconnect your account.', 403, 'Forbidden');
    }
    throw createApiError(message, response.status, response.statusText);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json();
}

/**
 * POST helper with JSON body and Firebase ID token.
 */
export async function apiPost<T = any>(
  url: string,
  body: Record<string, any>,
  options: ApiClientOptions = {}
): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}
