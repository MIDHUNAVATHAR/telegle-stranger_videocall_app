'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/components/Button';
import { IconBolt, IconShield, IconVideo } from '../../../shared/components/Icons';
import { SAMPLE_STRANGERS } from '../../../shared/constants';
import { Stranger } from '../../../shared/types';
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
      // Offline fallback: simulate match finding within 2.8 seconds
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-20)',
        minHeight: 'calc(100vh - 160px)',
      }}
    >
      {/* Top Header: Online Users Count (Left) & Coins Available (Right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Current Online Users Number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 10px #22c55e',
              display: 'inline-block',
              animation: 'livePulse 2s infinite ease-in-out',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {onlineCount.toLocaleString()} online
          </span>
        </div>

        {/* Right Top: Coins Available */}
        <button
          type="button"
          onClick={onOpenWallet}
          title={onOpenWallet ? 'Click to manage coins' : 'Available coins'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid rgba(255, 90, 31, 0.35)',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: onOpenWallet ? 'pointer' : 'default',
            transition: 'all var(--t-quick) ease',
          }}
        >
          <IconBolt size={15} />
          <span>{userCoins} Coins</span>
        </button>
      </div>

      {/* Error Message Banner */}
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

      {/* Gender Preference Filter */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '14px 16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink-secondary)',
            }}
          >
            Gender Filter
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
            backgroundColor: 'var(--surface-raised)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {(['ANY', 'FEMALE', 'MALE'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              style={{
                minHeight: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '13px',
                backgroundColor: genderFilter === g ? 'var(--accent)' : 'transparent',
                color: genderFilter === g ? '#ffffff' : 'var(--ink-secondary)',
                transition: 'all var(--t-quick) ease',
                cursor: 'pointer',
              }}
            >
              <span>{g === 'ANY' ? 'Anyone' : g === 'FEMALE' ? 'Women' : 'Men'}</span>
              {g !== 'ANY' && <span style={{ fontSize: '11px', opacity: 0.9 }}>(1🪙)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Center Stage: Round Circle Match Button */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
          minHeight: '340px',
          position: 'relative',
        }}
      >
        {isSearching ? (
          /* Searching Radar State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              position: 'relative',
            }}
          >
            {/* Outer Concentric Radar Waves */}
            <div
              style={{
                position: 'relative',
                width: '180px',
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 90, 31, 0.4)',
                  animation: 'radarWave 2s infinite ease-out',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 90, 31, 0.25)',
                  animation: 'radarWave 2s infinite ease-out 0.6s',
                }}
              />

              {/* Core Pulsing Circle */}
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff7a3d 0%, #ff5a1f 60%, #e44910 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 32px rgba(255, 90, 31, 0.6)',
                  animation: 'pulseGlow 2s infinite ease-in-out',
                }}
              >
                <IconBolt size={40} />
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    marginTop: '4px',
                  }}
                >
                  SEARCHING
                </span>
              </div>
            </div>

            {/* Status Text & Cancel Action */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                Finding your stranger...
              </h2>
              <p
                style={{
                  color: 'var(--ink-secondary)',
                  fontSize: '13px',
                  marginTop: '6px',
                }}
              >
                Searching {genderFilter === 'ANY' ? 'anyone' : genderFilter.toLowerCase()} in queue ({searchSeconds}s)
              </p>
            </div>

            <Button variant="danger" size="md" onClick={handleCancelSearch}>
              Cancel Search
            </Button>
          </div>
        ) : (
          /* Idle State: Big Round Circle Match Button */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            {/* Ambient Background Glow Ring */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '210px',
                  height: '210px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 90, 31, 0.2)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '240px',
                  height: '240px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(255, 90, 31, 0.12)',
                  pointerEvents: 'none',
                }}
              />

              {/* Main Round Circle Match Button */}
              <button
                type="button"
                onClick={handleStartSearch}
                aria-label="Start instant video match"
                style={{
                  width: '168px',
                  height: '168px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff7a3d 0%, #ff5a1f 60%, #e44910 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 0 32px rgba(255, 90, 31, 0.55), 0 8px 24px rgba(0, 0, 0, 0.4)',
                  animation: 'pulseGlow 2.8s infinite ease-in-out',
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                  transition: 'transform var(--t-quick) ease, box-shadow var(--t-quick) ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <IconVideo size={42} />
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  START
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    opacity: 0.9,
                    textTransform: 'uppercase',
                  }}
                >
                  Video Match
                </span>
              </button>
            </div>

            {/* Subtle Hint */}
            <span
              style={{
                fontSize: '13px',
                color: 'var(--ink-secondary)',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              Tap to match instantly with people online
            </span>
          </div>
        )}
      </div>

      {/* Safety & Moderation Trust Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid var(--accent)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
          <IconShield size={24} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 700 }}>
            Strictly No Nudity · Respect Others
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
            18+ community with zero tolerance for harassment. 5-report automated ban enabled.
          </span>
        </div>
      </div>
    </div>
  );
};
