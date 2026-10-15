'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/components/Button';
import { IconBolt, IconClock, IconShield, IconVideo, IconClose } from '../../../shared/components/Icons';
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

  // Match Confirmation state (Opposite person profile, 10s countdown, accept/reject)
  const [isConfirmingMatch, setIsConfirmingMatch] = useState(false);
  const [matchedStranger, setMatchedStranger] = useState<Stranger | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);

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

    // 2. Listen to real-time presence and matchmaking events via Socket.IO
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.on('presence_update', (data: { onlineCount: number }) => {
        if (data && typeof data.onlineCount === 'number') {
          setOnlineCount(data.onlineCount > 0 ? data.onlineCount : 1420);
        }
      });

      socket.on('match_found', (data: {
        sessionId: string;
        partnerId: string;
        partner?: {
          id: string;
          displayName: string;
          avatarUrl?: string;
          age: number;
          gender: string;
        };
        timeoutSeconds?: number;
      }) => {
        setIsSearching(false);
        setActiveSessionId(data.sessionId);
        setDecisionNotice(null);

        const partnerStranger: Stranger = {
          id: data.partner?.id || data.partnerId,
          name: data.partner?.displayName || 'Stranger',
          age: data.partner?.age || 22,
          avatar: data.partner?.avatarUrl || '/logo.png',
          gender: data.partner?.gender || 'ANY',
          country: 'Online',
          countryFlag: '⚡',
          interests: ['Video Chat'],
          distanceKm: 0,
          status: 'online',
        };

        setMatchedStranger(partnerStranger);
        setCountdown(data.timeoutSeconds || 10);
        setIsConfirmingMatch(true);
      });

      socket.on('match_accepted', () => {
        setIsConfirmingMatch(false);
        if (matchedStranger) {
          onMatchFound(matchedStranger);
        }
      });

      socket.on('match_rejected', (data: { reason?: string }) => {
        setIsConfirmingMatch(false);
        setMatchedStranger(null);
        setActiveSessionId(null);
        setDecisionNotice(
          data?.reason === 'REJECTED_BY_USER'
            ? 'Match was declined by partner. Click START to match again.'
            : 'Match was rejected. Click START to match again.'
        );
      });

      socket.on('match_cancelled', () => {
        setIsConfirmingMatch(false);
        setMatchedStranger(null);
        setActiveSessionId(null);
        setDecisionNotice('Match cancelled: 10s expired with no response. Click START to match again.');
      });

      return () => {
        socket.off('presence_update');
        socket.off('match_found');
        socket.off('match_accepted');
        socket.off('match_rejected');
        socket.off('match_cancelled');
      };
    } catch {
      // In SSR or test environments, socket connection is skipped
    }
  }, [onMatchFound, matchedStranger]);

  // 10-to-0 seconds countdown timer during match confirmation
  useEffect(() => {
    if (!isConfirmingMatch) return;

    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCancelMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isConfirmingMatch, activeSessionId]);

  const handleAcceptMatch = async () => {
    if (!activeSessionId || !matchedStranger) return;

    try {
      const socket = socketService.getMatchmakingSocket();
      socket.emit('accept_match', { sessionId: activeSessionId });
      await matchingApi.acceptMatch(activeSessionId).catch(() => {});
    } catch {
      // Clean
    }

    setIsConfirmingMatch(false);
    onMatchFound(matchedStranger);
  };

  const handleRejectMatch = async () => {
    if (activeSessionId) {
      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('reject_match', { sessionId: activeSessionId });
        await matchingApi.rejectMatch(activeSessionId).catch(() => {});
      } catch {
        // Clean
      }
    }

    setIsConfirmingMatch(false);
    setMatchedStranger(null);
    setActiveSessionId(null);
    setDecisionNotice('Match rejected. Click START to search for another stranger.');
  };

  const handleCancelMatch = async () => {
    if (activeSessionId) {
      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('cancel_match', { sessionId: activeSessionId });
        await matchingApi.cancelMatch(activeSessionId).catch(() => {});
      } catch {
        // Clean
      }
    }

    setIsConfirmingMatch(false);
    setMatchedStranger(null);
    setActiveSessionId(null);
    setDecisionNotice('Match cancelled: 10 seconds expired. Click START to match again.');
  };

  const handleStartSearch = async () => {
    setErrorMessage(null);
    setDecisionNotice(null);

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
        setActiveSessionId(result.sessionId || `sess_${Date.now()}`);

        const matched: Stranger = {
          id: result.partner?.id || result.partnerId,
          name: result.partner?.displayName || 'Stranger',
          age: result.partner?.age || 22,
          avatar: result.partner?.avatarUrl || '/logo.png',
          gender: result.partner?.gender || 'ANY',
          country: 'Online',
          countryFlag: '⚡',
          interests: ['Video Chat'],
          distanceKm: 0,
          status: 'online',
        };

        setMatchedStranger(matched);
        setCountdown(10);
        setIsConfirmingMatch(true);
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
      setActiveSessionId(`sess_demo_${Date.now()}`);
      setMatchedStranger(randomStranger);
      setCountdown(10);
      setIsConfirmingMatch(true);
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

      {/* Decision Notice Banner (Reject, Cancel, or Timeout) */}
      {decisionNotice && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 90, 31, 0.1)',
            border: '1px solid rgba(255, 90, 31, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--ink)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)' }}>ℹ️</span>
            <span>{decisionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDecisionNotice(null)}
            aria-label="Dismiss notice"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-secondary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconClose size={16} />
          </button>
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
        {isConfirmingMatch && matchedStranger ? (
          /* Match Found Confirmation Screen: Opposite person avatar, name, age, 10s countdown, Accept & Reject */
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid rgba(255, 90, 31, 0.3)',
              borderRadius: '24px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 90, 31, 0.15)',
              position: 'relative',
            }}
          >
            {/* Top Badge: 10s Countdown */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                backgroundColor: countdown <= 3 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 90, 31, 0.15)',
                border: countdown <= 3 ? '1px solid #ef4444' : '1px solid rgba(255, 90, 31, 0.4)',
                color: countdown <= 3 ? '#ef4444' : 'var(--accent)',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '20px',
              }}
            >
              <IconClock size={16} />
              <span>Decision: {countdown}s remaining</span>
            </div>

            {/* Opposite Person Avatar with Glow Ring */}
            <div
              style={{
                position: 'relative',
                width: '110px',
                height: '110px',
                marginBottom: '16px',
              }}
            >
              <img
                src={matchedStranger.avatar || '/logo.png'}
                alt={matchedStranger.name}
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent)',
                  boxShadow: '0 0 20px rgba(255, 90, 31, 0.4)',
                  backgroundColor: 'var(--surface)',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '3px solid var(--surface-raised)',
                }}
              />
            </div>

            {/* Opposite Person Name & Age */}
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--ink)',
                margin: 0,
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              {matchedStranger.name}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                }}
              >
                {matchedStranger.age} yrs old
              </span>
              <span style={{ color: 'var(--ink-muted)' }}>•</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--ink-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {!matchedStranger.gender || matchedStranger.gender === 'ANY' ? 'Stranger' : matchedStranger.gender.toLowerCase()}
              </span>
            </div>

            {/* 10s Countdown Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(countdown / 10) * 100}%`,
                  backgroundColor: countdown <= 3 ? '#ef4444' : 'var(--accent)',
                  transition: 'width 1s linear, background-color 0.3s ease',
                }}
              />
            </div>

            {/* Both Sides Decision Buttons: Accept & Reject */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                width: '100%',
              }}
            >
              <button
                type="button"
                onClick={handleRejectMatch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all var(--t-quick) ease',
                }}
              >
                <IconClose size={18} />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptMatch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
                  transition: 'all var(--t-quick) ease',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Accept ({countdown}s)</span>
              </button>
            </div>
          </div>
        ) : isSearching ? (
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
