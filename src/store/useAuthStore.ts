import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  isNewUser: boolean | null;
  lastLoginAt: string | null;
  pendingWebViewAccessToken: string | null;
  accessToken: string | null;
  setMobileAuthSession: (session: { userId: string; isNewUser: boolean; lastLoginAt: string }) => void;
  setPendingWebViewAccessToken: (token: string | null) => void;
  setAccessToken: (token: string | null) => void;
  clearMobileAuthSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  isNewUser: null,
  lastLoginAt: null,
  pendingWebViewAccessToken: null,
  accessToken: null,
  setMobileAuthSession: (session) => set({ 
    userId: session.userId, 
    isNewUser: session.isNewUser,
    lastLoginAt: session.lastLoginAt
  }),
  setPendingWebViewAccessToken: (token) => set({ pendingWebViewAccessToken: token }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearMobileAuthSession: () => set({ 
    userId: null, 
    isNewUser: null,
    lastLoginAt: null,
    pendingWebViewAccessToken: null,
    accessToken: null,
  }),
}));
