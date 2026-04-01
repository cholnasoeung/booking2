import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import type { AuthUser } from "@/types/booking";

const STORAGE_KEY = "bookingapp-auth-session";
const SESSION_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${STORAGE_KEY}.json`
  : null;

export type StoredSession = {
  token: string;
  user: AuthUser;
};

export async function readStoredSession() {
  if (Platform.OS === "web") {
    const rawValue = globalThis.localStorage?.getItem(STORAGE_KEY);
    return parseStoredSession(rawValue);
  }

  if (!SESSION_FILE) {
    return null;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE);

    if (!fileInfo.exists) {
      return null;
    }

    const rawValue = await FileSystem.readAsStringAsync(SESSION_FILE);
    return parseStoredSession(rawValue);
  } catch {
    return null;
  }
}

export async function writeStoredSession(session: StoredSession) {
  const serialized = JSON.stringify(session);

  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(STORAGE_KEY, serialized);
    return;
  }

  if (!SESSION_FILE) {
    return;
  }

  await FileSystem.writeAsStringAsync(SESSION_FILE, serialized);
}

export async function clearStoredSession() {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return;
  }

  if (!SESSION_FILE) {
    return;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(SESSION_FILE);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
    }
  } catch {
    // Ignore storage cleanup failures and fall back to in-memory sign-out.
  }
}

function parseStoredSession(rawValue: string | null | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredSession>;

    if (
      typeof parsed?.token !== "string" ||
      typeof parsed?.user?.id !== "string" ||
      typeof parsed.user?.email !== "string"
    ) {
      return null;
    }

    return parsed as StoredSession;
  } catch {
    return null;
  }
}
