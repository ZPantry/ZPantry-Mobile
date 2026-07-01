import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LoginResponse } from "@/api/auth";
import { logoutStoredSession } from "@/utils/authSession";
import { authStorage, type StoredUser } from "@/utils/authStorage";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: StoredUser | null;
  signIn: (session: LoginResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    authStorage
      .getSession()
      .then((session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(user),
      user,
      async signIn(session) {
        await authStorage.saveSession(session);
        setUser({
          userId: session.userId,
          fullName: session.fullName,
          email: session.email,
          role: session.role,
          expiresAt: session.expiresAt
        });
      },
      async signOut() {
        await logoutStoredSession();
        setUser(null);
      }
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
