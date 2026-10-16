import { ChatMessage } from '../../../shared/types';

const STORAGE_PREFIX = 'sc_chat_';

export function getStoredChatMessages(key?: string | null): ChatMessage[] {
  if (typeof window === 'undefined' || !key) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredChatMessage(key: string | null | undefined, message: ChatMessage): void {
  if (typeof window === 'undefined' || !key || !message) return;
  try {
    const current = getStoredChatMessages(key);
    const existingIndex = current.findIndex((m) => m.id === message.id);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...message };
    } else {
      current.push(message);
    }
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(current));
  } catch {
    // Quota or storage access error
  }
}

export function markStoredMessagesAsRead(key?: string | null): ChatMessage[] {
  if (typeof window === 'undefined' || !key) return [];
  try {
    const current = getStoredChatMessages(key);
    let changed = false;
    const updated = current.map((m) => {
      if (m.isSelf && !m.isRead) {
        changed = true;
        return { ...m, isRead: true };
      }
      return m;
    });
    if (changed) {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return [];
  }
}

export function syncStoredChatBetweenKeys(key1?: string | null, key2?: string | null): void {
  if (typeof window === 'undefined' || !key1 || !key2 || key1 === key2) return;
  try {
    const list1 = getStoredChatMessages(key1);
    const list2 = getStoredChatMessages(key2);

    const mergedMap = new Map<string, ChatMessage>();
    [...list1, ...list2].forEach((m) => {
      if (m && m.id) {
        const existing = mergedMap.get(m.id);
        if (existing) {
          mergedMap.set(m.id, { ...existing, ...m, isRead: existing.isRead || m.isRead });
        } else {
          mergedMap.set(m.id, m);
        }
      }
    });

    const merged = Array.from(mergedMap.values());
    localStorage.setItem(`${STORAGE_PREFIX}${key1}`, JSON.stringify(merged));
    localStorage.setItem(`${STORAGE_PREFIX}${key2}`, JSON.stringify(merged));
  } catch {
    // Ignore
  }
}
