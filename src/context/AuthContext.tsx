import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LoginResponse } from "@/api/auth";
import { logoutStoredSession } from "@/utils/authSession";
import { authStorage, type StoredUser } from "@/utils/authStorage";
import { restoreSession } from "@/api/client";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: StoredUser | null;
  onboardingStep: "profile_setup" | "interactive_guide" | "done";
  completeOnboardingStep: (step: "interactive_guide" | "done") => Promise<void>;
  signIn: (session: LoginResponse, remember?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<"profile_setup" | "interactive_guide" | "done">("done");

  useEffect(() => {
    let isMounted = true;

    restoreSession()
      .then(async (session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          if (session?.user?.userId) {
            const step = await authStorage.getOnboardingStep(session.user.userId);
            if (isMounted) setOnboardingStep(step);
          }
        }
      })
      .catch(() => { if (isMounted) setUser(null); })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = authStorage.subscribe(() => {
      authStorage.getUser().then(async value => {
        const step = value ? await authStorage.getOnboardingStep(value.userId) : "done";
        if (isMounted) { setOnboardingStep(step); setUser(value); }
      }).catch(() => { if (isMounted) setUser(null); });
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(user),
      user,
      onboardingStep,
      async signIn(session, remember = true) {
        await authStorage.saveSession(session, remember);
        
        // Retrieve the fully constructed user (which will now have userId extracted from JWT if missing)
        const storedUser = await authStorage.getUser();
        if (!storedUser) throw new Error("Failed to save session");
        
        const step = await authStorage.getOnboardingStep(storedUser.userId);
        
        // Update both states together to avoid race condition where
        // isAuthenticated becomes true but onboardingStep is not yet updated
        setOnboardingStep(step);
        setUser(storedUser);
      },
      async completeOnboardingStep(step) {
        if (!user) return;
        await authStorage.setOnboardingStep(user.userId, step);
        setOnboardingStep(step);
      },
      async signOut() {
        setUser(null);
        setOnboardingStep("done");
        try {
          await logoutStoredSession();
        } catch {
          await authStorage.clearSession();
        }
      }
    }),
    [isLoading, user, onboardingStep]
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
