'use client';

import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { Card } from '../../../shared/components/Card';
import { IconBolt, IconShield, IconVideo, IconMic, IconChat } from '../../../shared/components/Icons';
import { POPULAR_INTERESTS, SAMPLE_STRANGERS } from '../../../shared/constants';
import { MatchFilter, Stranger } from '../../../shared/types';

interface MatchingViewProps {
  onMatchFound: (stranger: Stranger) => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({ onMatchFound }) => {
  const [filter, setFilter] = useState<MatchFilter>({
    region: 'global',
    mode: 'video',
    selectedInterests: ['Gaming', 'Music'],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);

  const toggleInterest = (interest: string) => {
    setFilter((prev) => {
      const exists = prev.selectedInterests.includes(interest);
      if (exists) {
        return {
          ...prev,
          selectedInterests: prev.selectedInterests.filter((i) => i !== interest),
        };
      }
      return {
        ...prev,
        selectedInterests: [...prev.selectedInterests, interest],
      };
    });
  };

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchSeconds(0);

    const timer = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    setTimeout(() => {
      clearInterval(timer);
      setIsSearching(false);
      const randomStranger =
        SAMPLE_STRANGERS[Math.floor(Math.random() * SAMPLE_STRANGERS.length)];
      onMatchFound(randomStranger);
    }, 2200);
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchSeconds(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
      {/* Hero Headline & Direct Lead Statement */}
      <div data-rise style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 1.6rem + 3.8vw, 4.1rem)',
            fontWeight: 800,
            lineHeight: 0.98,
            letterSpacing: '-0.04em',
            textWrap: 'balance',
          }}
        >
          Spontaneous chats with strangers
        </h1>

        <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--step-lead)', maxWidth: '42ch' }}>
          Over 2,840 people are online right now. Connect instantly for live video roulette and real conversation.
        </p>
      </div>

      {/* Main Interactive Stage */}
      <Card data-rise data-delay-1 style={{ padding: 'var(--space-24)', backgroundColor: 'var(--surface-raised)' }}>
        {isSearching ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-32) var(--space-16)',
              textAlign: 'center',
              gap: 'var(--space-16)',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconBolt size={36} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--step-lead)', fontWeight: 700 }}>
                Finding your stranger...
              </h2>
              <p
                style={{
                  color: 'var(--ink-secondary)',
                  fontSize: 'var(--step-small)',
                  marginTop: '4px',
                }}
              >
                Filtering for matching interests ({searchSeconds}s)
              </p>
            </div>
            <Button variant="danger" size="md" onClick={handleCancelSearch}>
              Cancel Search
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
            {/* Mode Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: 'var(--step-small)',
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                }}
              >
                Connection Mode
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  backgroundColor: 'var(--surface)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {(['video', 'audio', 'text'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter((f) => ({ ...f, mode }))}
                    style={{
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      fontSize: 'var(--step-small)',
                      backgroundColor:
                        filter.mode === mode ? 'var(--surface-hover)' : 'transparent',
                      color: filter.mode === mode ? 'var(--accent)' : 'var(--ink-secondary)',
                      textTransform: 'capitalize',
                      transition: 'all var(--t-quick) ease',
                    }}
                  >
                    {mode === 'video' && <IconVideo size={16} />}
                    {mode === 'audio' && <IconMic size={16} />}
                    {mode === 'text' && <IconChat size={16} />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Region Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: 'var(--step-small)',
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                }}
              >
                Matching Region
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(['global', 'asia', 'europe', 'americas'] as const).map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setFilter((f) => ({ ...f, region: reg }))}
                    style={{
                      minHeight: '40px',
                      padding: '0 16px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--step-small)',
                      fontWeight: 600,
                      backgroundColor: filter.region === reg ? 'var(--accent)' : 'var(--surface)',
                      color: filter.region === reg ? 'var(--accent-ink)' : 'var(--ink-secondary)',
                      textTransform: 'capitalize',
                      transition: 'all var(--t-quick) ease',
                    }}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Tags */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: 'var(--step-small)',
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                }}
              >
                Filter by Interests
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {POPULAR_INTERESTS.map((interest) => {
                  const isSelected = filter.selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      style={{
                        minHeight: '38px',
                        padding: '0 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--step-small)',
                        fontWeight: isSelected ? 700 : 500,
                        backgroundColor: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
                        color: isSelected ? 'var(--accent)' : 'var(--ink-secondary)',
                        transition: 'all var(--t-quick) ease',
                      }}
                    >
                      #{interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action CTA */}
            <Button variant="primary" size="lg" fullWidth onClick={handleStartSearch}>
              Start Instant Match
            </Button>
          </div>
        )}
      </Card>

      {/* Active Community Members Strip (Real Photographs) */}
      <div data-rise data-delay-2 style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--step-lead)', fontWeight: 700 }}>
            Active in Discovery
          </h2>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            Tap to connect directly
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
          }}
        >
          {SAMPLE_STRANGERS.map((stranger, idx) => (
            <div
              key={stranger.id}
              data-rise
              data-delay-3
              onClick={() => onMatchFound(stranger)}
              style={{
                cursor: 'pointer',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                animationDelay: `${idx * 60 + 100}ms`,
                transition: 'transform var(--t-quick) ease, background-color var(--t-quick) ease',
              }}
            >
              <div style={{ width: '100%', height: '150px', position: 'relative' }}>
                <img
                  src={stranger.avatar}
                  alt={stranger.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {stranger.countryFlag}
                </span>
              </div>
              <div style={{ padding: '12px' }}>
                <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
                  {stranger.name}, {stranger.age}
                </strong>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                  {stranger.status}
                </p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {stranger.interests.slice(0, 2).map((i) => (
                    <Badge key={i} variant="default">
                      #{i}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Moderation Trust Banner */}
      <div
        data-rise
        data-delay-4
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: 'var(--space-16)',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>
          <IconShield size={24} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 'var(--step-small)', color: 'var(--ink)' }}>
            Safe & Moderated Platform
          </strong>
          <span style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Zero tolerance for harassment. Real-time report and instant skip enabled.
          </span>
        </div>
      </div>
    </div>
  );
};
