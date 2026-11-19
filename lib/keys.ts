import { ACTIVE_KEY_STORAGE, KEY_PATTERN, KEY_PREFIX, PENDING_KEY_STORAGE } from './config';

export const CHECKOUT_STARTED_STORAGE = 'sfa_checkout_started';

const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const generateKey = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${KEY_PREFIX}${base64Url(bytes)}`;
};

export const isSfaKey = (value: string | null | undefined): value is string => !!value && KEY_PATTERN.test(value);

export const keySuffix = (key: string | null | undefined): string => (key ? `${KEY_PREFIX}...${key.slice(-4)}` : '');

export const storageAvailable = (): boolean => {
  try {
    const probe = '__sfa_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

export const readStorage = (name: string): string | null => {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
};

export const writeStorage = (name: string, value: string): boolean => {
  try {
    window.localStorage.setItem(name, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStorage = (name: string): void => {
  try {
    window.localStorage.removeItem(name);
  } catch {
    return;
  }
};

export const getActiveKey = (): string | null => readStorage(ACTIVE_KEY_STORAGE);
export const getPendingKey = (): string | null => readStorage(PENDING_KEY_STORAGE);

export const setActiveKey = (key: string): boolean => writeStorage(ACTIVE_KEY_STORAGE, key);

export const promotePendingKey = (key: string): void => {
  setActiveKey(key);
  removeStorage(PENDING_KEY_STORAGE);
  removeStorage(CHECKOUT_STARTED_STORAGE);
};

export const signOut = (): void => removeStorage(ACTIVE_KEY_STORAGE);

export const ensurePendingKey = (): { key: string; persisted: boolean } => {
  const existing = getPendingKey();
  if (isSfaKey(existing)) return { key: existing, persisted: true };
  const key = generateKey();
  return { key, persisted: writeStorage(PENDING_KEY_STORAGE, key) };
};
