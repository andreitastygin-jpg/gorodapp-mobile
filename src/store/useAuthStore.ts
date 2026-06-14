import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  isNewUser: boolean | null;
  lastLoginAt: string | null;
  pendingWebViewCustomToken: string | null;
  setMobileAuthSession: (session: { userId: string; isNewUser: boolean; lastLoginAt: string }) => void;
  setPendingWebViewCustomToken: (token: string | null) => void;
  clearMobileAuthSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  isNewUser: null,
  lastLoginAt: null,
  pendingWebViewCustomToken: null,
  setMobileAuthSession: (session) => set({ 
    userId: session.userId, 
    isNewUser: session.isNewUser,
    lastLoginAt: session.lastLoginAt
  }),
  setPendingWebViewCustomToken: (token) => set({ pendingWebViewCustomToken: token }),
  clearMobileAuthSession: () => set({ 
    userId: null, 
    isNewUser: null,
    lastLoginAt: null,
    pendingWebViewCustomToken: null,
  }),
}));
