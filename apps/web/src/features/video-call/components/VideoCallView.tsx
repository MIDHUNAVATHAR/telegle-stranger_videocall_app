'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../shared/components/Button';
import {
  IconMic,
  IconMicOff,
  IconVideo,
  IconVideoOff,
  IconGift,
  IconChat,
  IconBolt,
  IconShield,
  IconClose,
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
    lockCountdown,
    toggleMute,
    toggleVideo,
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

  const handleLeaveCall = async () => {
    await endCall(false);
    onNextStranger();
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
      data-ui="fullscreen-video-call"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        overflow: 'hidden',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Fullscreen Remote Stranger Video (No auto-blur shield) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#000000',
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
            }}
          />
        ) : (
          <img
            src={stranger.avatar || '/logo.png'}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />
        )}
      </div>

      {/* 2. Top-Left: Clean Call Duration Timer (No WebRTC P2P text) */}
      <div
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: '16px',
          zIndex: 60,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
          }}
        />
        <span>{formatDuration(callDurationSeconds)}</span>
      </div>

      {/* 3. Top-Right: Report & Block Button */}
      <button
        type="button"
        onClick={onOpenReportModal}
        aria-label="Report or block user"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          right: '16px',
          zIndex: 60,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'rgba(239, 68, 68, 0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          color: '#ff6b6b',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
      >
        <IconShield size={16} />
        <span>Report & Block</span>
      </button>

      {/* 4. Local Picture-in-Picture Preview (Bottom-Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '96px',
          right: '16px',
          width: '96px',
          height: '136px',
          borderRadius: '16px',
          backgroundColor: isVideoOff ? 'var(--surface-raised)' : '#111111',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
          zIndex: 60,
        }}
      >
        {isVideoOff ? (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--ink-secondary)',
              textAlign: 'center',
              padding: '4px',
            }}
          >
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
            src="/logo.png"
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
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#ffffff',
          }}
        >
          You
        </span>
      </div>

      {/* 5. Floating Bottom Controls: Left Leave Button, Center Tools, Right Next */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          left: '16px',
          right: '16px',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          maxWidth: '520px',
          margin: '0 auto',
        }}
      >
        {/* Left: Prominent Leave Button */}
        <button
          type="button"
          onClick={handleLeaveCall}
          aria-label="Leave call"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
            transition: 'transform 0.15s ease, background-color 0.2s ease',
            flexShrink: 0,
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <IconClose size={18} />
          <span>Leave</span>
        </button>

        {/* Center: Controls Dock (Mute, Video, Gift, Chat) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(12, 14, 18, 0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              color: isMuted ? '#ef4444' : '#ffffff',
              border: isMuted ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
              cursor: 'pointer',
            }}
          >
            {isMuted ? <IconMicOff size={18} /> : <IconMic size={18} />}
          </button>

          {/* Video Toggle Button */}
          <button
            type="button"
            onClick={toggleVideo}
            aria-label={isVideoOff ? 'Turn video on' : 'Turn video off'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isVideoOff ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              color: isVideoOff ? '#ef4444' : '#ffffff',
              border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
              cursor: 'pointer',
            }}
          >
            {isVideoOff ? <IconVideoOff size={18} /> : <IconVideo size={18} />}
          </button>

          {/* Gift Button */}
          <button
            type="button"
            onClick={onOpenGiftModal}
            aria-label="Send gift"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <IconGift size={18} />
          </button>

          {/* Chat Toggle Button */}
          <button
            type="button"
            onClick={onToggleChat}
            aria-label="Toggle chat"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isChatOpen ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
              color: isChatOpen ? '#ffffff' : '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <IconChat size={18} />
          </button>
        </div>

        {/* Right: Next Stranger Button */}
        <button
          type="button"
          onClick={handleSkipToNext}
          disabled={lockCountdown > 0}
          aria-label={lockCountdown > 0 ? `Wait ${lockCountdown}s` : 'Next stranger'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: lockCountdown > 0 ? 'rgba(255, 255, 255, 0.1)' : 'var(--accent)',
            color: lockCountdown > 0 ? 'var(--ink-secondary)' : '#ffffff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: lockCountdown > 0 ? 'not-allowed' : 'pointer',
            opacity: lockCountdown > 0 ? 0.7 : 1,
            boxShadow: lockCountdown > 0 ? 'none' : '0 4px 20px rgba(255, 90, 31, 0.5)',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <IconBolt size={16} />
          <span>{lockCountdown > 0 ? `${lockCountdown}s` : 'Next'}</span>
        </button>
      </div>
    </div>
  );
};

