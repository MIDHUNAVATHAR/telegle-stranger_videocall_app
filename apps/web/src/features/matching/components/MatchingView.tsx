'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { Card } from '../../../shared/components/Card';
import { IconBolt, IconShield, IconVideo, IconMic, IconChat } from '../../../shared/components/Icons';
import { POPULAR_INTERESTS, SAMPLE_STRANGERS } from '../../../shared/constants';
import { MatchFilter, Stranger } from '../../../shared/types';
import { matchingApi } from '../apis/matchingApi';
import { socketService } from '../services/socketClient';

interface MatchingViewProps {
  onMatchFound: (stranger: Stranger) => void;
  userCoins?: number;
  onOpenWallet?: () => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  onMatchFound,
  userCoins = 100,
  onOpenWallet,
}) => {
  const [filter, setFilter] = useState<MatchFilter>({
    region: 'global',
    mode: 'video',
    selectedInterests: ['Gaming', 'Music'],
  });
  const [genderFilter, setGenderFilter] = useState<'ANY' | 'MALE' | 'FEMALE'>('ANY');
  const [onlineCount, setOnlineCount] = useState<number>(1420);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch real online presence count from REST API
    matchingApi
      .getOnlinePresence()
      .then((data) => {
        if (data && typeof data.online_count === 'number') {
          // If server returns count > 0 use it, otherwise keep default benchmark
          setOnlineCount(data.online_count > 0 ? data.online_count : 1420);
        }
      })
      .catch(() => {
        // Fallback to initial benchmark
      });

    // 2. Listen to real-time presence updates via Socket.IO
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.on('presence_update', (data: { onlineCount: number }) => {
        if (data && typeof data.onlineCount === 'number') {
          setOnlineCount(data.onlineCount > 0 ? data.onlineCount : 1420);
        }
      });

      socket.on('match_found', (data: { sessionId: string; partnerId: string }) => {
        setIsSearching(false);
        const randomStranger =
          SAMPLE_STRANGERS[Math.floor(Math.random() * SAMPLE_STRANGERS.length)];
        onMatchFound({
          ...randomStranger,
          id: data.partnerId || randomStranger.id,
        });
      });

      return () => {
        socket.off('presence_update');
        socket.off('match_found');
      };
    } catch {
      // In SSR or test environments, socket connection is skipped
    }
  }, [onMatchFound]);

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

  const handleStartSearch = async () => {
    setErrorMessage(null);

    // If gender filter is selected, check coin balance
    if (genderFilter !== 'ANY' && userCoins < 1) {
      setErrorMessage('You need at least 1 coin to use gender-filtered matching.');
      if (onOpenWallet) {
        onOpenWallet();
      }
      return;
    }

    setIsSearching(true);
    setSearchSeconds(0);

    const timer = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    try {
      // Join server queue via REST API
      const result = await matchingApi.joinQueue(genderFilter);

      if (result && result.status === 'PAIRED' && result.partnerId) {
        clearInterval(timer);
        setIsSearching(false);
        const randomStranger =
          SAMPLE_STRANGERS[Math.floor(Math.random() * SAMPLE_STRANGERS.length)];
        onMatchFound({
          ...randomStranger,
          id: result.partnerId,
        });
        return;
      }
    } catch {
      // Offline fallback: simulate match finding within 2.5 seconds
    }

    // Fallback simulation timer for standalone demo or demo strangers
    const fallbackTimer = setTimeout(() => {
      clearInterval(timer);
      setIsSearching(false);
      const randomStranger =
        SAMPLE_STRANGERS[Math.floor(Math.random() * SAMPLE_STRANGERS.length)];
      onMatchFound(randomStranger);
    }, 2800);

    return () => {
      clearInterval(timer);
      clearTimeout(fallbackTimer);
    };
  };

  const handleCancelSearch = async () => {
    setIsSearching(false);
    setSearchSeconds(0);
    try {
      await matchingApi.leaveQueue();
    } catch {
      // Cleaned locally
    }
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
          Over {onlineCount.toLocaleString()} people are online right now. Connect instantly for live video roulette and real conversation.
        </p>

        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              color: '#ef4444',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{errorMessage}</span>
            {onOpenWallet && (
              <Button variant="primary" size="sm" onClick={onOpenWallet}>
                Get Coins
              </Button>
            )}
          </div>
        )}
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
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(255, 90, 31, 0.45)',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <IconBolt size={38} />
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
                Searching {genderFilter === 'ANY' ? 'everyone' : genderFilter.toLowerCase()} in queue ({searchSeconds}s)
              </p>
            </div>
            <Button variant="danger" size="md" onClick={handleCancelSearch}>
              Cancel Search
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
            {/* Gender Preference Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 'var(--step-small)',
                    fontWeight: 600,
                    color: 'var(--ink-secondary)',
                  }}
                >
                  Match Preference
                </span>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                  {genderFilter === 'ANY' ? 'Free matching' : '1 Coin on connection'}
                </span>
              </div>
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
                {(['ANY', 'FEMALE', 'MALE'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    style={{
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      fontSize: '13px',
                      backgroundColor:
                        genderFilter === g ? 'var(--surface-hover)' : 'transparent',
                      color: genderFilter === g ? 'var(--accent)' : 'var(--ink-secondary)',
                      border: genderFilter === g ? '1px solid var(--accent)' : 'none',
                      transition: 'all var(--t-quick) ease',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{g === 'ANY' ? 'Anyone' : g === 'FEMALE' ? 'Women' : 'Men'}</span>
                    {g !== 'ANY' && <span style={{ fontSize: '10px', opacity: 0.8 }}>(1🪙)</span>}
                  </button>
                ))}
              </div>
            </div>

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
          borderLeft: '4px solid var(--accent)',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>
          <IconShield size={24} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 'var(--step-small)', color: 'var(--ink)' }}>
            Respect Others · Strictly No Nudity
          </strong>
          <span style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
            18+ community with zero tolerance for harassment. 5-report automated ban enabled.
          </span>
        </div>
      </div>
    </div>
  );
};
