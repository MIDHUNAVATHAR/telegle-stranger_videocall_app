import { describe, it, expect, beforeEach } from 'vitest';
import { chatApi } from './apis/chatApi';
import { ChatView } from './components/ChatView';
import {
  getStoredChatMessages,
  saveStoredChatMessage,
  syncStoredChatBetweenKeys,
} from './utils/chatStorage';

describe('Frontend Chat & Messages Module', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    // Polyfill global localStorage for Node test environment
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      },
    };
    (globalThis as unknown as { window: unknown }).window = globalThis;
  });

  it('exports ChatView component', () => {
    expect(ChatView).toBeDefined();
  });

  it('exposes conversation inbox REST endpoints', () => {
    expect(typeof chatApi.listConversations).toBe('function');
    expect(typeof chatApi.getConversationById).toBe('function');
    expect(typeof chatApi.deleteConversation).toBe('function');
    expect(typeof chatApi.directCall).toBe('function');
  });

  it('persists and retrieves messages by partner or conversation key in localStorage', () => {
    saveStoredChatMessage('user_123', {
      id: 'msg_1',
      senderId: 'user_123',
      text: 'Hey during video call',
      timestamp: '12:00',
      isSelf: false,
    });

    const msgs = getStoredChatMessages('user_123');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('Hey during video call');

    // Sync to conversation ID
    syncStoredChatBetweenKeys('user_123', 'conv_abc');
    const convMsgs = getStoredChatMessages('conv_abc');
    expect(convMsgs).toHaveLength(1);
    expect(convMsgs[0].id).toBe('msg_1');
  });
});
