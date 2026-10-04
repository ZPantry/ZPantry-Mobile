import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { LoginResponse } from "@/api/auth";

const ACCESS_TOKEN_KEY = "zpantry.accessToken";
const REFRESH_TOKEN_KEY = "zpantry.refreshToken";
const USER_KEY = "zpantry.user";
const memoryStore = new Map<string, string>();
const REMEMBER_KEY = "zpantry.remember";
let rememberSession = false;
let revision = 0;
const listeners = new Set<() => void>();
let writes: Promise<unknown> = Promise.resolve();
function mutate<T>(action: () => Promise<T>): Promise<T> {
  const next = writes.then(action, action);
  writes = next.catch(() => undefined);
  return next;
}
const newAccountKey = (email: string) => `new_account_${Array.from(email.trim().toLowerCase()).map(c => c.charCodeAt(0).toString(16)).join('_')}`;
const sessionKeys = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY];

// The login DTO omits userId; saveSession resolves it from the JWT for storage.
export type StoredUser = Pick<LoginResponse, "fullName" | "email" | "role" | "expiresAt"> & { userId: string };
export type NutritionProfile = {
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal?: string;
  dietPreference?: string;
  allergies?: string;
};
type StoredSession = {
  accessToken?: string;
  refreshToken?: string;
  user?: StoredUser;
};

type JwtPayload = {
  userId?: string;
  fullName?: string;
  email?: string;
  role?: string;
  exp?: number;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
};

function readSessionFile(): StoredSession {
  return {};
}

function writeSessionFile(session: StoredSession) {
  void session;
}

function deleteSessionFile() {
  return;
}

function decodeBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer, i = 0;
    (buffer = str.charAt(i++));
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function decodeJwtPayload(token?: string | null): JwtPayload | null {
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = typeof atob !== "undefined" ? atob(padded) : decodeBase64(padded);
    
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromToken(token?: string | null): StoredUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.userId || !payload.email) return null;

  return {
    userId: payload.userId,
    fullName: payload.fullName || payload.email,
    email: payload.email,
    role: payload.role || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "user",
    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : ""
  };
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    if (sessionKeys.includes(key)) {
      const target = rememberSession ? localStorage : sessionStorage;
      const other = rememberSession ? sessionStorage : localStorage;
      other.removeItem(key);
      target.setItem(key, value);
    } else localStorage.setItem(key, value);
    return;
  }
  if (sessionKeys.includes(key) && !rememberSession) memoryStore.set(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function getStoredValue(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return sessionKeys.includes(key) ? sessionStorage.getItem(key) ?? localStorage.getItem(key) : localStorage.getItem(key);
  }
  return memoryStore.get(key) ?? await SecureStore.getItemAsync(key);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
  await SecureStore.deleteItemAsync(key);
}

export const authStorage = {
  getRevision() { return revision; },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  async saveSession(session: LoginResponse, remember = true) {
    const tokenUser = userFromToken(session.accessToken);
    const user: StoredUser = {
      userId: session.userId || tokenUser?.userId || "",
      fullName: session.fullName || tokenUser?.fullName || "",
      email: session.email || tokenUser?.email || "",
      role: session.role || tokenUser?.role || "user",
      expiresAt: session.expiresAt || tokenUser?.expiresAt || ""
    };

    if (!tokenUser?.userId || !session.refreshToken) throw new Error("Phiên đăng nhập máy chủ không hợp lệ.");
    revision++;
    await mutate(async () => {
    rememberSession = remember;
    await Promise.all(sessionKeys.map(deleteStoredValue));
    await setStoredValue(REMEMBER_KEY, String(remember));
    await Promise.all([
      setStoredValue(ACCESS_TOKEN_KEY, session.accessToken),
      setStoredValue(REFRESH_TOKEN_KEY, session.refreshToken),
      setStoredValue(USER_KEY, JSON.stringify(user))
    ]);
    writeSessionFile({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user
    });
    });
    // Only a successfully verified registration can request the first survey.
    const pendingKey = newAccountKey(user.email);
    if (await getStoredValue(pendingKey) === 'true') {
      const current = await getStoredValue(`onboarding_step_${user.userId}`);
      if (!current) await setStoredValue(`onboarding_step_${user.userId}`, 'profile_setup');
      await deleteStoredValue(pendingKey);
    }
    listeners.forEach(listener => listener());
  },

  async markNewAccount(email: string) { await setStoredValue(newAccountKey(email), 'true'); },

  async getAccessToken() {
    return (await getStoredValue(ACCESS_TOKEN_KEY)) ?? readSessionFile().accessToken ?? null;
  },

  async getRefreshToken() {
    return (await getStoredValue(REFRESH_TOKEN_KEY)) ?? readSessionFile().refreshToken ?? null;
  },

  async getUser() {
    const storedUser = await getStoredValue(USER_KEY);
    if (storedUser) {
      try { return JSON.parse(storedUser) as StoredUser; } catch { return null; }
    }

    return readSessionFile().user ?? null;
  },

  async getSession() {
    rememberSession = (await getStoredValue(REMEMBER_KEY)) !== "false";
    const [accessToken, refreshToken, storedUser] = await Promise.all([this.getAccessToken(), this.getRefreshToken(), this.getUser()]);
    if (!accessToken || !refreshToken) return null;

    const tokenUser = userFromToken(accessToken);
    const user = storedUser || tokenUser;
    if (!user) return null;

    if (tokenUser && (!storedUser || tokenUser.userId !== storedUser.userId || tokenUser.email !== storedUser.email)) {
      await setStoredValue(USER_KEY, JSON.stringify(tokenUser));
    }

    return { accessToken, refreshToken, user };
  },

  async updateTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt?: string }, expectedRevision = revision) {
    return mutate(async () => {
    if (revision !== expectedRevision) return false;
    rememberSession = (await getStoredValue(REMEMBER_KEY)) !== "false";
    const updates = [setStoredValue(ACCESS_TOKEN_KEY, tokens.accessToken)];
    if (tokens.refreshToken) {
      updates.push(setStoredValue(REFRESH_TOKEN_KEY, tokens.refreshToken));
    }

    if (tokens.expiresAt) {
      const currentUser = await getStoredValue(USER_KEY);
      if (currentUser) {
        const user = JSON.parse(currentUser) as StoredUser;
        updates.push(setStoredValue(USER_KEY, JSON.stringify({ ...user, expiresAt: tokens.expiresAt })));
        const session = readSessionFile();
        writeSessionFile({ ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? session.refreshToken, user: { ...user, expiresAt: tokens.expiresAt } });
      }
    } else {
      const session = readSessionFile();
      writeSessionFile({ ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? session.refreshToken });
    }

    await Promise.all(updates);
    return true;
    });
  },

  async updateUser(values: Partial<Pick<StoredUser, "fullName">>) {
    await mutate(async () => {
      const user = await this.getUser();
      if (user) await setStoredValue(USER_KEY, JSON.stringify({ ...user, ...values }));
    });
    listeners.forEach(listener => listener());
  },

  async clearSession() {
    revision++;
    await mutate(async () => {
    await Promise.all([
      deleteStoredValue(ACCESS_TOKEN_KEY),
      deleteStoredValue(REFRESH_TOKEN_KEY),
      deleteStoredValue(USER_KEY)
    ]);
    deleteSessionFile();
    });
    listeners.forEach(listener => listener());
  },

  async getOnboardingStep(userId: string): Promise<"profile_setup" | "done"> {
    const val = await getStoredValue(`onboarding_step_${userId}`);
    return val === 'profile_setup' ? 'profile_setup' : 'done';
  },

  async setOnboardingStep(userId: string, step: "interactive_guide" | "done") {
    await setStoredValue(`onboarding_step_${userId}`, step === 'interactive_guide' ? 'done' : step);
  },

  async saveNutritionProfile(userId: string, profile: NutritionProfile) {
    await setStoredValue(`nutrition_profile_${userId}`, JSON.stringify(profile));
  },

  async getNutritionProfile(userId: string): Promise<NutritionProfile | null> {
    const value = await getStoredValue(`nutrition_profile_${userId}`);
    if (!value) return null;
    try {
      return JSON.parse(value) as NutritionProfile;
    } catch {
      return null;
    }
  },

  async getHasSeenAddIngredientTooltip(userId: string): Promise<boolean> {
    const val = await getStoredValue(`has_seen_add_ingredient_tooltip_${userId}`);
    return val === "true";
  },

  async setHasSeenAddIngredientTooltip(userId: string) {
    await setStoredValue(`has_seen_add_ingredient_tooltip_${userId}`, "true");
  }
};
