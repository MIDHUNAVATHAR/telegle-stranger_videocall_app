import { describe, it, expect } from 'vitest';
import { chatApi } from './apis/chatApi';
import { ChatView } from './components/ChatView';

describe('Frontend Chat & Messages Module', () => {
  it('exports ChatView component', () => {
    expect(ChatView).toBeDefined();
  });

  it('exposes conversation inbox REST endpoints', () => {
    expect(typeof chatApi.listConversations).toBe('function');
    expect(typeof chatApi.getConversationById).toBe('function');
    expect(typeof chatApi.deleteConversation).toBe('function');
    expect(typeof chatApi.directCall).toBe('function');
  });
});
