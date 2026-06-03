"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { resolveAccessFromUser, type AccessState } from "@/lib/access";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type AuthContextValue = {
  user: User | null;
  access: AccessState;
  ready: boolean;
  getAccessToken: () => Promise<string | null>;
};

const defaultAccess = resolveAccessFromUser(null);

const AuthContext = createContext<AuthContextValue>({
  user: null,
  access: defaultAccess,
  ready: false,
  getAccessToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const getAccessToken = useCallback(async () => {
    if (!supabaseBrowser) return null;
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (!supabaseBrowser) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const applySessionUser = (nextUser: User | null) => {
      if (!cancelled) {
        setUser(nextUser);
        setReady(true);
      }
    };

    void (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      applySessionUser(data.session?.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      applySessionUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const access = useMemo(() => resolveAccessFromUser(user), [user]);

  const value = useMemo(
    () => ({ user, access, ready, getAccessToken }),
    [user, access, ready, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
