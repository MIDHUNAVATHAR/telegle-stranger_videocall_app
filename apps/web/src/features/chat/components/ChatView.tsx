'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { IconChat, IconVideo } from '../../../shared/components/Icons';
import { ChatMessage, Stranger } from '../../../shared/types';
import { chatApi, ConversationItem } from '../apis/chatApi';
import { moderationApi } from '../../moderation/moderationApi';

interface ChatViewProps {
  stranger: Stranger | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDirectCall?: (stranger: Stranger) => void;
}

const ICEBREAKERS = [
  'Where are you connecting from?',
  'What games or shows do you follow?',
  'Favorite song or playlist right now?',
  'What is your dream travel destination?',
];

export const ChatView: React.FC<ChatViewProps> = ({
  stranger,
  messages,
  onSendMessage,
  onReact,
  onDirectCall,
}) => {
  const [activeView, setActiveView] = useState<'chat' | 'inbox'>(stranger ? 'chat' : 'inbox');
  const [inputText, setInputText] = useState('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);

  // Load conversations inbox from REST API
  useEffect(() => {
    setIsLoadingInbox(true);
    chatApi
      .listConversations()
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data);
        }
      })
      .catch(() => {
        // Fallback for guest or offline mode
      })
      .finally(() => {
        setIsLoadingInbox(false);
      });
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id && c._id !== id));
      if (selectedConversation?.id === id || selectedConversation?._id === id) {
        setSelectedConversation(null);
      }
    } catch (err) {
      console.warn('Failed to delete conversation:', err);
      setConversations((prev) => prev.filter((c) => c.id !== id && c._id !== id));
    }
  };

  const handleBlockUser = async (partnerId: string, partnerName: string, convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Block ${partnerName}? You will not match or connect again.`)) return;
    try {
      await moderationApi.blockUser({
        targetUserId: partnerId,
      });
      await chatApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId && c._id !== convId));
    } catch (err) {
      console.warn('Failed to block user:', err);
    }
  };

  const handleDirectCallClick = async (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.directCall(conv.id || conv._id);
    } catch {
      // Handled via fallback
    }

    if (onDirectCall) {
      onDirectCall({
        id: conv.partner.id,
        name: conv.partner.display_name,
        country: 'Global',
        countryFlag: '🌐',
        avatar: conv.partner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80',
        interests: ['Social'],
        age: conv.partner.age,
        status: 'Direct call connected',
        distanceKm: 12,
      });
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* View Switcher: In-Call Chat vs Messages Inbox */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          backgroundColor: 'var(--surface)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <button
          onClick={() => setActiveView('chat')}
          style={{
            minHeight: '40px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontWeight: 700,
            fontSize: '13px',
            backgroundColor: activeView === 'chat' ? 'var(--surface-raised)' : 'transparent',
            color: activeView === 'chat' ? 'var(--accent)' : 'var(--ink-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {stranger ? `Chat (${stranger.name})` : 'Active Chat'}
        </button>

        <button
          onClick={() => setActiveView('inbox')}
          style={{
            minHeight: '40px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontWeight: 700,
            fontSize: '13px',
            backgroundColor: activeView === 'inbox' ? 'var(--surface-raised)' : 'transparent',
            color: activeView === 'inbox' ? 'var(--accent)' : 'var(--ink-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Past Connections {conversations.length > 0 && `(${conversations.length})`}
        </button>
      </div>

      {activeView === 'inbox' ? (
        /* ================= Messages Inbox View ================= */
        <Card
          data-ui
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '420px',
            backgroundColor: 'var(--surface)',
            padding: '16px',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Previous Video Connections</h3>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
              Met in Video Roulette
            </span>
          </div>

          {isLoadingInbox ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-secondary)' }}>
              Loading past connections...
            </div>
          ) : conversations.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 16px',
                textAlign: 'center',
                gap: '12px',
              }}
            >
              <IconChat size={40} color="var(--ink-secondary)" />
              <strong style={{ fontSize: '15px' }}>No previous connections yet</strong>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', maxWidth: '32ch' }}>
                People you connect with in video chat will automatically appear here so you can re-connect!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id || conv._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'var(--surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #232838',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={
                        conv.partner.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
                      }
                      alt={conv.partner.display_name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--accent)',
                      }}
                    />
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>
                        {conv.partner.display_name}, {conv.partner.age}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                        Met {formatTimeAgo(conv.last_interaction_at)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => handleDirectCallClick(conv, e)}
                    >
                      <IconVideo size={14} /> Call (1🪙)
                    </Button>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleBlockUser(
                          conv.partner.id,
                          conv.partner.display_name,
                          conv.id || conv._id,
                          e
                        )
                      }
                      title="Block user"
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Block
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conv.id || conv._id, e)}
                      title="Remove from inbox"
                      style={{
                        padding: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--ink-secondary)',
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        /* ================= In-Call Ephemeral Chat View ================= */
        <Card
          data-ui
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '480px',
            maxHeight: '70dvh',
            backgroundColor: 'var(--surface)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-16)',
              backgroundColor: 'var(--surface-raised)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={
                  stranger
                    ? stranger.avatar
                    : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80'
                }
                alt="Stranger"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ fontSize: 'var(--step-body)', fontWeight: 700 }}>
                  {stranger ? stranger.name : 'Stranger'}
                </h3>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--success)' }}>
                  Connected in room
                </span>
              </div>
            </div>
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
              Ephemeral · Not saved in DB
            </span>
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 'var(--space-16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '32px' }}>💬</span>
                <strong style={{ fontSize: 'var(--step-body)' }}>Say hello!</strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  Pick a conversation starter below to break the ice:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '280px' }}>
                  {ICEBREAKERS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => onSendMessage(prompt)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--surface-raised)',
                        border: '1px solid #2a3042',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--ink)',
                        fontSize: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.isSelf ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    alignItems: msg.isSelf ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '16px',
                      backgroundColor: msg.isSelf ? 'var(--accent)' : 'var(--surface-raised)',
                      color: msg.isSelf ? 'var(--accent-ink)' : 'var(--ink)',
                      fontSize: '14px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--ink-tertiary)' }}>
                      {msg.timestamp}
                    </span>
                    {msg.reaction && <span style={{ fontSize: '12px' }}>{msg.reaction}</span>}
                    {!msg.isSelf && !msg.reaction && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {['👍', '❤️', '🔥'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => onReact(msg.id, emoji)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '0 2px',
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '12px',
              backgroundColor: 'var(--surface-raised)',
              display: 'flex',
              gap: '8px',
              borderTop: '1px solid #232838',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type an ephemeral message..."
              maxLength={200}
              style={{
                flex: 1,
                padding: '10px 14px',
                backgroundColor: 'var(--surface)',
                border: '1px solid #2a3042',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '14px',
              }}
            />
            <Button type="submit" variant="primary" size="sm">
              Send
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
