'use client';

import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { IconChat } from '../../../shared/components/Icons';
import { ChatMessage, Stranger } from '../../../shared/types';

interface ChatViewProps {
  stranger: Stranger | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
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
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handlePickIcebreaker = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
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
            src={stranger ? stranger.avatar : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80'}
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
          Disappears after session
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
              gap: '8px',
            }}
          >
            <IconChat size={32} color="var(--ink-secondary)" />
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--step-small)' }}>
              Break the ice! Say hello or tap a quick prompt below.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isSelf ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: msg.isSelf ? 'var(--accent)' : 'var(--surface-raised)',
                  color: msg.isSelf ? 'var(--accent-ink)' : 'var(--ink)',
                  fontWeight: msg.isSelf ? 600 : 400,
                  fontSize: 'var(--step-body)',
                  wordBreak: 'break-word',
                  position: 'relative',
                }}
              >
                {msg.text}
                {msg.reaction && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-10px',
                      right: '6px',
                      backgroundColor: 'var(--surface)',
                      borderRadius: 'var(--radius-full)',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                    }}
                  >
                    {msg.reaction}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-tertiary)' }}>
                  {msg.timestamp}
                </span>
                {!msg.isSelf && !msg.reaction && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['LIKE', 'VIBE', 'COOL'].map((rx) => (
                      <button
                        key={rx}
                        onClick={() => onReact(msg.id, rx)}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--surface-raised)',
                          color: 'var(--ink-secondary)',
                        }}
                      >
                        +{rx}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Icebreaker prompts */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '6px var(--space-16)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {ICEBREAKERS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handlePickIcebreaker(prompt)}
            style={{
              whiteSpace: 'nowrap',
              fontSize: 'var(--step-small)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--ink-secondary)',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: '8px',
          padding: 'var(--space-12) var(--space-16)',
          backgroundColor: 'var(--surface-raised)',
        }}
      >
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message to stranger..."
          style={{
            flex: 1,
            minHeight: '44px',
            backgroundColor: 'var(--surface)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '0 14px',
            color: 'var(--ink)',
            fontSize: 'var(--step-body)',
          }}
        />
        <Button variant="primary" size="md" type="submit" disabled={!inputText.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
};
