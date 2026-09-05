import { create } from 'zustand';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * Session status, kept explicit rather than derived from `user === null`.
 *
 * `unknown` and `anonymous` are NOT the same thing and collapsing them is what
 * makes an auth UI flash the login form to a signed-in user on every reload:
 * the access token lives in memory only, so immediately after a refresh of the
 * page we genuinely do not know yet whether the httpOnly cookie will restore a
 * session. Guards must wait out `unknown`, never redirect on it.
 */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
  markAnonymous: () => void;
}

/**
 * ai/rules/working-rules.md § Auth Rules: "Access token stored in Zustand
 * (memory only, never localStorage)". No `persist` middleware here, deliberately
 * — a token in localStorage is readable by any script that gets injected into
 * the page, and it survives long after the tab that earned it is gone. Losing
 * the token on reload is the intended cost; the refresh cookie pays it back
 * (see restoreSession in api-client).
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'unknown',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ accessToken: null, user: null, status: 'anonymous' }),
  markAnonymous: () => set({ accessToken: null, user: null, status: 'anonymous' }),
}));

/** Read the token outside React — the fetch wrapper is not a component. */
export function readAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
