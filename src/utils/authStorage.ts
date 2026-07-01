import { Platform } from "react-native";
import type { LoginResponse } from "@/api/auth";

const ACCESS_TOKEN_KEY = "zpantry.accessToken";
const REFRESH_TOKEN_KEY = "zpantry.refreshToken";
const USER_KEY = "zpantry.user";
const memoryStore = new Map<string, string>();

export type StoredUser = Pick<LoginResponse, "userId" | "fullName" | "email" | "role" | "expiresAt">;
type StoredSession = {
  accessToken?: string;
  refreshToken?: string;
  user?: StoredUser;
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

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
}

async function getStoredValue(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }

  return memoryStore.get(key) ?? null;
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
}

export const authStorage = {
  async saveSession(session: LoginResponse) {
    const user: StoredUser = {
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
      role: session.role,
      expiresAt: session.expiresAt
    };

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
  },

  async getAccessToken() {
    return (await getStoredValue(ACCESS_TOKEN_KEY)) ?? readSessionFile().accessToken ?? null;
  },

  async getRefreshToken() {
    return (await getStoredValue(REFRESH_TOKEN_KEY)) ?? readSessionFile().refreshToken ?? null;
  },

  async getUser() {
    const storedUser = await getStoredValue(USER_KEY);
    if (storedUser) {
      return JSON.parse(storedUser) as StoredUser;
    }

    return readSessionFile().user ?? null;
  },

  async getSession() {
    const [accessToken, refreshToken, user] = await Promise.all([this.getAccessToken(), this.getRefreshToken(), this.getUser()]);
    if (!accessToken || !refreshToken || !user) return null;
    return { accessToken, refreshToken, user };
  },

  async updateTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt?: string }) {
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
  },

  async clearSession() {
    await Promise.all([
      deleteStoredValue(ACCESS_TOKEN_KEY),
      deleteStoredValue(REFRESH_TOKEN_KEY),
      deleteStoredValue(USER_KEY)
    ]);
    deleteSessionFile();
  }
};
