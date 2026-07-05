import { create } from 'zustand';
import { signOut as apiSignOut } from '@/lib/auth';
import type { AuthSession, AuthUser } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await apiSignOut(get().session?.access_token);
    set({ user: null, session: null });
  },
}));
