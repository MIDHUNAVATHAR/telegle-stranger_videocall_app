'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import {
  IconMic,
  IconMicOff,
  IconVideo,
  IconVideoOff,
  IconGift,
  IconChat,
  IconBolt,
  IconShield,
} from '../../../shared/components/Icons';
import { Stranger } from '../../../shared/types';
import { useWebRTC } from '../hooks/useWebRTC';

interface VideoCallViewProps {
  stranger: Stranger | null;
  sessionId?: string;
  isInitiator?: boolean;
  onNextStranger: () => void;
  onOpenGiftModal: () => void;
  onOpenReportModal: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
}

export const VideoCallView: React.FC<VideoCallViewProps> = ({
  stranger,
  sessionId = 'sess_demo_live',
  isInitiator = true,
  onNextStranger,
  onOpenGiftModal,
  onOpenReportModal,
  onToggleChat,
  isChatOpen,
}) => {
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isBlurred,
    lockCountdown,
    toggleMute,
    toggleVideo,
    unblurRemote,
    endCall,
  } = useWebRTC({
    sessionId,
    isInitiator,
    onCallEnded: onNextStranger,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local and remote streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Live call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSkipToNext = async () => {
    if (lockCountdown > 0) return;
    await endCall(false);
    onNextStranger();
  };

  if (!stranger) {
    return (
      <div
        data-ui
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-24)',
          textAlign: 'center',
          gap: 'var(--space-16)',
        }}
      >
        <IconVideo size={48} color="var(--ink-secondary)" />
        <h2 style={{ fontSize: 'var(--step-lead)', fontWeight: 700 }}>
          No active call session
        </h2>
        <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--step-body)' }}>
          Hop into Discovery to connect with an active stranger in seconds.
        </p>
        <Button variant="primary" size="lg" onClick={onNextStranger}>
          Find Stranger
        </Button>
      </div>
    );
  }

  return (
    <div
      data-ui
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-16)',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Remote Video Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/10',
          minHeight: '320px',
          backgroundColor: '#000000',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isBlurred ? 'blur(28px)' : 'none',
              transition: 'filter 0.3s ease',
            }}
          />
        ) : (
          <img
            src={stranger.avatar}
            alt={stranger.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isBlurred ? 'blur(28px)' : 'none',
              transition: 'filter 0.3s ease',
            }}
          />
        )}

        {/* Auto-Blur Shield Overlay */}
        {isBlurred && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 90, 31, 0.2)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconShield size={28} />
            </div>
            <div>
              <strong style={{ fontSize: '15px', color: '#ffffff', display: 'block' }}>
                Auto-Blur Shield Active
              </strong>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)' }}>
                Protected against surprise content · Respect Others
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={unblurRemote}>
              Tap to Reveal Stream
            </Button>
          </div>
        )}

        {/* Top Info Overlay */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              pointerEvents: 'auto',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: 'var(--surface-raised)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: 'var(--ink)',
              }}
            >
              {stranger.countryFlag}
            </span>
            <span style={{ fontSize: 'var(--step-small)', fontWeight: 700, color: '#ffffff' }}>
              {stranger.name}, {stranger.age}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent)',
              fontSize: 'var(--step-small)',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
              }}
            />
            {formatDuration(callDurationSeconds)} · WebRTC P2P
          </div>
        </div>

        {/* Local PIP Video */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '100px',
            height: '135px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isVideoOff ? 'var(--surface-raised)' : '#111',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            zIndex: 15,
          }}
        >
          {isVideoOff ? (
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
              Camera Off
            </span>
          ) : localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"
              alt="You"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <span
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '6px',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#fff',
            }}
          >
            You
          </span>
        </div>

        {/* Interests Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            maxWidth: '60%',
            zIndex: 15,
          }}
        >
          {stranger.interests.map((i) => (
            <Badge key={i} variant="default">
              #{i}
            </Badge>
          ))}
        </div>
      </div>

      {/* Primary Video Call Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          backgroundColor: 'var(--surface)',
          padding: 'var(--space-12)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          style={{
            minHeight: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isMuted ? 'var(--danger-surface)' : 'var(--surface-raised)',
            color: isMuted ? 'var(--danger)' : 'var(--ink)',
            fontSize: 'var(--step-small)',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          {isMuted ? <IconMicOff size={18} /> : <IconMic size={18} />}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          onClick={toggleVideo}
          aria-label={isVideoOff ? 'Turn video on' : 'Turn video off'}
          style={{
            minHeight: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isVideoOff ? 'var(--danger-surface)' : 'var(--surface-raised)',
            color: isVideoOff ? 'var(--danger)' : 'var(--ink)',
            fontSize: 'var(--step-small)',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          {isVideoOff ? <IconVideoOff size={18} /> : <IconVideo size={18} />}
          <span>{isVideoOff ? 'No Video' : 'Video'}</span>
        </button>

        <button
          onClick={onOpenGiftModal}
          aria-label="Send gift to stranger"
          style={{
            minHeight: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--accent)',
            fontSize: 'var(--step-small)',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <IconGift size={18} />
          <span>Gift</span>
        </button>

        <button
          onClick={onToggleChat}
          aria-label="Toggle text chat"
          style={{
            minHeight: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isChatOpen ? 'var(--accent)' : 'var(--surface-raised)',
            color: isChatOpen ? 'var(--accent-ink)' : 'var(--ink)',
            fontSize: 'var(--step-small)',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <IconChat size={18} />
          <span>Chat</span>
        </button>

        {/* Next / Skip button with 5-Second Countdown Lock */}
        <button
          onClick={handleSkipToNext}
          disabled={lockCountdown > 0}
          aria-label={lockCountdown > 0 ? `Please wait ${lockCountdown} seconds` : 'Skip to next stranger'}
          style={{
            minHeight: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: lockCountdown > 0 ? 'var(--surface-raised)' : 'var(--accent)',
            color: lockCountdown > 0 ? 'var(--ink-secondary)' : 'var(--accent-ink)',
            fontSize: 'var(--step-small)',
            fontWeight: 800,
            cursor: lockCountdown > 0 ? 'not-allowed' : 'pointer',
            border: 'none',
            opacity: lockCountdown > 0 ? 0.65 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <IconBolt size={18} />
          <span>{lockCountdown > 0 ? `${lockCountdown}s` : 'Next'}</span>
        </button>
      </div>

      {/* Safety / Report Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 var(--space-8)',
        }}
      >
        <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-tertiary)' }}>
          Status: {stranger.status}
        </span>
        <button
          onClick={onOpenReportModal}
          style={{
            fontSize: 'var(--step-small)',
            color: 'var(--danger)',
            fontWeight: 600,
            padding: '6px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Report or Block
        </button>
      </div>
    </div>
  );
};
