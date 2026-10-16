'use client';

import { useState, useEffect, useCallback } from 'react';
import '../shared/styles/tokens.css';
import { TabType, Stranger, ChatMessage, VirtualGift } from '../shared/types';
import { INITIAL_USER, getSafeAvatarUrl } from '../shared/constants';
import { MatchingView } from '../features/matching/components/MatchingView';
import { VideoCallView } from '../features/video-call/components/VideoCallView';
import { ChatView } from '../features/chat/components/ChatView';
import { WalletView } from '../features/wallet/components/WalletView';
import { ProfileView } from '../features/profile/components/ProfileView';
import { GiftModal } from '../features/gifts/components/GiftModal';
import { SettingsModal } from '../features/settings/components/SettingsModal';
import { ReportModal } from '../features/matching/components/ReportModal';
import { Toast } from '../shared/components/Toast';
import { AuthProvider, useAuth, AuthModal } from '../features/auth';
import { walletApi } from '../features/wallet/walletApi';
import { chatApi } from '../features/chat/apis/chatApi';
import { matchingApi } from '../features/matching/apis/matchingApi';
import { saveStoredChatMessage, syncStoredChatBetweenKeys, getStoredChatMessages } from '../features/chat/utils/chatStorage';
import { socketService } from '../features/matching/services/socketClient';
import {
  IconDollar,
  IconCompass,
  IconChat,
  IconWallet,
  IconUser,
} from '../shared/components/Icons';

interface IncomingCallData {
  sessionId: string;
  conversationId?: string;
  caller: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    age: number;
    gender: string;
  };
}

interface OutgoingCallData {
  sessionId: string;
  conversationId?: string;
  partner: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    age: number;
    gender: string;
  };
}

interface ToastNotificationData {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
}

function AppContent() {
  const { user: authUser, isAuthenticated, isLoading, isAuthModalOpen, openAuthModal, closeAuthModal, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('matching');
  const [user, setUser] = useState(INITIAL_USER);
  const [activeCallSession, setActiveCallSession] = useState<{ sessionId: string; isInitiator: boolean } | null>(null);

  // Authenticated route/tab guard: restrict access to protected tabs
  const handleTabChange = useCallback((tab: TabType) => {
    if (tab !== 'matching' && !isAuthenticated) {
      openAuthModal();
      return;
    }
    setActiveTab(tab);
  }, [isAuthenticated, openAuthModal]);

  // Automatic redirect safeguard: if user is not authenticated and attempts to stay on a protected tab
  useEffect(() => {
    if (!isLoading && !isAuthenticated && activeTab !== 'matching') {
      setActiveTab('matching');
      openAuthModal();
    }
  }, [isLoading, isAuthenticated, activeTab, openAuthModal]);

  useEffect(() => {
    if (authUser) {
      setUser((prev) => ({
        ...prev,
        id: authUser.id || authUser._id || prev.id,
        name: authUser.display_name || authUser.username || prev.name,
        avatar: authUser.avatar_url || prev.avatar,
      }));
    }
  }, [authUser]);

  useEffect(() => {
    if (isAuthenticated) {
      walletApi
        .getBalance()
        .then((bal) => {
          if (bal) {
            setUser((prev) => ({ ...prev, coins: bal.purchasedCoinsBalance }));
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);
  const [activeStranger, setActiveStranger] = useState<Stranger | null>(null);
  const isLiveCallActive = activeTab === 'video-call' && !!activeStranger;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      senderId: 'st_01',
      text: 'Hey there! Where are you connecting from?',
      timestamp: '22:42',
      isSelf: false,
    },
  ]);

  // Modals state
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<{ id?: string; name?: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Direct Video Call Ringing & Outgoing state
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallData | null>(null);
  const [toast, setToast] = useState<ToastNotificationData | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Restore state from sessionStorage only after client-side mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setHasHydrated(true);
    try {
      const savedCallSession = sessionStorage.getItem('active_call_session');
      const savedStranger = sessionStorage.getItem('active_call_stranger');
      if (savedCallSession && savedStranger) {
        try {
          const parsedSession = JSON.parse(savedCallSession);
          const parsedStranger = JSON.parse(savedStranger);
          setActiveCallSession(parsedSession);
          setActiveStranger(parsedStranger);
          setActiveTab('video-call');
          if (parsedStranger?.id) {
            const chatHistory = getStoredChatMessages(parsedStranger.id);
            if (chatHistory.length > 0) {
              setMessages(chatHistory);
            }
          }
        } catch (err) {
          void err;
        }
      } else {
        const savedTab = sessionStorage.getItem('active_tab');
        if (savedTab && ['matching', 'chat', 'profile', 'wallet'].includes(savedTab)) {
          setActiveTab(savedTab as TabType);
        }
      }

      const savedIncoming = sessionStorage.getItem('direct_call_incoming');
      if (savedIncoming) {
        setIncomingCall(JSON.parse(savedIncoming));
      }
      const savedOutgoing = sessionStorage.getItem('direct_call_outgoing');
      if (savedOutgoing) {
        setOutgoingCall(JSON.parse(savedOutgoing));
      }
    } catch (err) {
      void err;
    }
  }, []);

  // Sync state to sessionStorage once client has hydrated
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      sessionStorage.setItem('active_tab', activeTab);
    } catch (err) {
      void err;
    }
  }, [activeTab, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      if (activeCallSession && activeStranger && activeTab === 'video-call') {
        sessionStorage.setItem('active_call_session', JSON.stringify(activeCallSession));
        sessionStorage.setItem('active_call_stranger', JSON.stringify(activeStranger));
      } else if (!activeCallSession || !activeStranger || activeTab !== 'video-call') {
        sessionStorage.removeItem('active_call_session');
        sessionStorage.removeItem('active_call_stranger');
      }
    } catch (err) {
      void err;
    }
  }, [activeCallSession, activeStranger, activeTab, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      if (incomingCall) {
        sessionStorage.setItem('direct_call_incoming', JSON.stringify(incomingCall));
      } else {
        sessionStorage.removeItem('direct_call_incoming');
      }
    } catch (err) {
      void err;
    }
  }, [incomingCall, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      if (outgoingCall) {
        sessionStorage.setItem('direct_call_outgoing', JSON.stringify(outgoingCall));
      } else {
        sessionStorage.removeItem('direct_call_outgoing');
      }
    } catch (err) {
      void err;
    }
  }, [outgoingCall, hasHydrated]);

  // Match event with sessionId and initiator propagation
  const handleMatchFound = useCallback(
    (stranger: Stranger, sessionId?: string, isInitiator = true) => {
      setActiveStranger(stranger);
      if (sessionId) {
        setActiveCallSession({ sessionId, isInitiator });
      }
      setActiveTab('video-call');
      setMessages([
        {
          id: `m_${Date.now()}`,
          senderId: stranger.id,
          text: `Connected with ${stranger.name}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
        },
      ]);
    },
    []
  );

  const handleNextStranger = useCallback((reason?: string) => {
    const prevStranger = activeStranger;
    const currentSession = activeCallSession;

    try {
      sessionStorage.removeItem('active_call_session');
      sessionStorage.removeItem('active_call_stranger');
    } catch (err) {
      void err;
    }

    if (currentSession?.sessionId) {
      matchingApi.endCallSession(currentSession.sessionId, true).catch(() => {});
      try {
        const signalingSocket = socketService.getSignalingSocket();
        signalingSocket.emit('leave_call', { sessionId: currentSession.sessionId });
      } catch {
        // ignore
      }
    }

    setActiveStranger(null);
    setActiveCallSession(null);

    // If direct video call, automatically return to message chat
    if (currentSession?.sessionId && currentSession.sessionId.startsWith('call_direct_')) {
      setActiveTab('chat');
    } else {
      setActiveTab('matching');
    }

    if (reason) {
      setToast({
        type: 'warning',
        title: 'User Left The Chat',
        message: `${prevStranger?.name || 'Partner'} has disconnected and left the video call.`,
      });
    }
  }, [activeStranger, activeCallSession]);

  // Accept incoming direct video call
  const handleAcceptDirectCall = useCallback(() => {
    if (!incomingCall) return;
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.emit('accept_direct_call', {
        sessionId: incomingCall.sessionId,
        callerId: incomingCall.caller.id,
        conversationId: incomingCall.conversationId,
      });
    } catch (err) {
      console.error('Failed to accept direct call', err);
    }
  }, [incomingCall]);

  // Reject / Decline incoming direct video call
  const handleRejectDirectCall = useCallback(() => {
    if (!incomingCall) return;
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.emit('reject_direct_call', {
        sessionId: incomingCall.sessionId,
        callerId: incomingCall.caller.id,
      });
    } catch (err) {
      console.error('Failed to reject direct call', err);
    }
    setIncomingCall(null);
  }, [incomingCall]);

  // Cancel outgoing direct video call
  const handleCancelDirectCall = useCallback(() => {
    if (!outgoingCall) return;
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.emit('cancel_direct_call', {
        sessionId: outgoingCall.sessionId,
        partnerId: outgoingCall.partner.id,
      });
    } catch (err) {
      console.error('Failed to cancel direct call', err);
    }
    setOutgoingCall(null);
    setActiveCallSession(null);
    setActiveStranger(null);
    setActiveTab('chat');
  }, [outgoingCall]);

  // 45-second auto-timeout for outgoing direct call (no answer from partner)
  useEffect(() => {
    if (!outgoingCall) return;
    const timer = setTimeout(() => {
      handleCancelDirectCall();
      setToast({
        type: 'warning',
        title: 'No Answer',
        message: 'The user did not answer your video call.',
      });
    }, 45000);
    return () => clearTimeout(timer);
  }, [outgoingCall, handleCancelDirectCall]);

  // 45-second auto-timeout for incoming direct call (caller abandoned or unhandled)
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      setIncomingCall(null);
    }, 45000);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  // Web Audio Ringing Chime while incomingCall is ringing
  useEffect(() => {
    if (!incomingCall) return;

    let audioCtx: AudioContext | null = null;
    const playChime = () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch {
        // Audio playback policy or unsupported
      }
    };

    playChime();
    const interval = setInterval(playChime, 2500);

    return () => {
      clearInterval(interval);
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch {
          // ignore
        }
      }
    };
  }, [incomingCall]);

  // Listen for direct video call signaling events on /matchmaking
  useEffect(() => {
    try {
      const matchmakingSocket = socketService.getMatchmakingSocket();

      const onIncomingCall = (data: IncomingCallData) => {
        setIncomingCall(data);
      };

      const onOutgoingStarted = (data: OutgoingCallData) => {
        setOutgoingCall(data);
      };

      const onConnected = (data: {
        sessionId: string;
        isInitiator: boolean;
        partner: Stranger;
      }) => {
        setIncomingCall(null);
        setOutgoingCall(null);
        handleMatchFound(data.partner, data.sessionId, data.isInitiator);
      };

      const onRejected = (data: { sessionId: string; rejectedBy?: string; message?: string }) => {
        setOutgoingCall(null);
        setActiveCallSession(null);
        setActiveStranger(null);
        setActiveTab('chat');
        setToast({
          type: 'error',
          title: 'Call Declined',
          message: data?.message || 'You are rejected',
        });
      };

      const onCancelled = (data: { sessionId: string; message?: string }) => {
        setIncomingCall(null);
        setOutgoingCall(null);
        setActiveCallSession(null);
        setActiveStranger(null);
        setActiveTab('chat');
        setToast({
          type: 'info',
          title: 'Call Cancelled',
          message: data?.message || 'Call was cancelled by the caller',
        });
      };

      const onError = (data: { code?: string; message?: string }) => {
        setOutgoingCall(null);
        setActiveCallSession(null);
        setActiveStranger(null);
        setActiveTab('chat');
        setToast({
          type: data?.code === 'USER_BUSY' ? 'warning' : 'error',
          title: data?.code === 'USER_BUSY' ? 'User Busy' : 'Call Failed',
          message: data?.message || 'User is already on another call',
        });
      };

      const onCallEnded = () => {
        setIncomingCall(null);
        setOutgoingCall(null);
        setActiveCallSession(null);
        setActiveStranger(null);
        setActiveTab('chat');
      };

      const onDirectCallCleared = () => {
        setIncomingCall(null);
        setOutgoingCall(null);
      };

      const onConnect = () => {
        matchmakingSocket.emit('check_direct_call_status');
      };

      matchmakingSocket.on('connect', onConnect);
      if (matchmakingSocket.connected) {
        matchmakingSocket.emit('check_direct_call_status');
      }

      matchmakingSocket.on('incoming_direct_call', onIncomingCall);
      matchmakingSocket.on('outgoing_direct_call_started', onOutgoingStarted);
      matchmakingSocket.on('direct_call_connected', onConnected);
      matchmakingSocket.on('direct_call_rejected', onRejected);
      matchmakingSocket.on('direct_call_cancelled', onCancelled);
      matchmakingSocket.on('direct_call_error', onError);
      matchmakingSocket.on('direct_call_ended', onCallEnded);
      matchmakingSocket.on('direct_call_cleared', onDirectCallCleared);

      return () => {
        matchmakingSocket.off('connect', onConnect);
        matchmakingSocket.off('incoming_direct_call', onIncomingCall);
        matchmakingSocket.off('outgoing_direct_call_started', onOutgoingStarted);
        matchmakingSocket.off('direct_call_connected', onConnected);
        matchmakingSocket.off('direct_call_rejected', onRejected);
        matchmakingSocket.off('direct_call_cancelled', onCancelled);
        matchmakingSocket.off('direct_call_error', onError);
        matchmakingSocket.off('direct_call_ended', onCallEnded);
        matchmakingSocket.off('direct_call_cleared', onDirectCallCleared);
      };
    } catch {
      // Ignored in SSR
    }
  }, [handleMatchFound]);

  // Ensure signaling socket is in the call room for reliable in-call messaging
  useEffect(() => {
    if (!activeCallSession?.sessionId) return;
    try {
      const signalingSocket = socketService.getSignalingSocket();
      const joinRoom = () => {
        if (activeCallSession?.sessionId) {
          signalingSocket.emit('join_call', { sessionId: activeCallSession.sessionId });
        }
      };
      joinRoom();
      signalingSocket.on('connect', joinRoom);
      return () => {
        signalingSocket.off('connect', joinRoom);
      };
    } catch {
      // Ignored in SSR
    }
  }, [activeCallSession?.sessionId]);

  // Listen for real-time ephemeral in-call messages from the remote peer
  useEffect(() => {
    try {
      const signalingSocket = socketService.getSignalingSocket();
      const onInCallMessage = (data: {
        sessionId: string;
        senderId: string;
        text: string;
        timestamp?: string;
      }) => {
        setMessages((prev) => {
          const isDuplicate = prev.some(
            (m) =>
              !m.isSelf &&
              m.senderId === data.senderId &&
              m.text === data.text &&
              Math.abs(Date.now() - (m.createdAt || 0)) < 3000
          );
          if (isDuplicate) return prev;

          const remoteMsg: ChatMessage = {
            id: `msg_remote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            senderId: data.senderId,
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSelf: false,
            createdAt: Date.now(),
          };

          const partnerId = activeStranger?.id || data.senderId;
          if (partnerId) {
            saveStoredChatMessage(partnerId, remoteMsg);
          }

          if (partnerId && isAuthenticated) {
            chatApi
              .createOrEnsureConversation(partnerId, data.sessionId, data.text)
              .then((res) => {
                if (res?.id) {
                  saveStoredChatMessage(res.id, remoteMsg);
                  syncStoredChatBetweenKeys(partnerId, res.id);
                }
              })
              .catch(() => {});
          }

          return [...prev, remoteMsg];
        });
      };

      signalingSocket.on('in_call_message', onInCallMessage);
      return () => {
        signalingSocket.off('in_call_message', onInCallMessage);
      };
    } catch {
      // Ignored in SSR
    }
  }, [activeStranger?.id, isAuthenticated]);

  const handleSendMessage = useCallback(
    (text: string) => {
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: user.id,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
        isRead: false,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);

      if (activeStranger?.id) {
        saveStoredChatMessage(activeStranger.id, newMsg);
      }

      // Emit real-time message through signaling socket if in active video call session
      if (activeCallSession?.sessionId) {
        try {
          const signalingSocket = socketService.getSignalingSocket();
          signalingSocket.emit('in_call_message', {
            sessionId: activeCallSession.sessionId,
            text,
            partnerId: activeStranger?.id,
          });
        } catch (err) {
          console.error('Failed to emit in_call_message', err);
        }

        if (activeStranger?.id && isAuthenticated) {
          chatApi
            .createOrEnsureConversation(activeStranger.id, activeCallSession.sessionId, text)
            .then((res) => {
              if (res?.id) {
                saveStoredChatMessage(res.id, newMsg);
                syncStoredChatBetweenKeys(activeStranger.id, res.id);
              }
            })
            .catch(() => {});
        }
      }
    },
    [user.id, activeCallSession?.sessionId, activeStranger?.id, isAuthenticated]
  );

  const handleReact = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reaction: emoji } : m))
    );
  };

  const handleOpenGiftModal = (recipient?: { id?: string; name?: string }) => {
    setGiftRecipient(recipient || (activeStranger ? { id: activeStranger.id, name: activeStranger.name } : null));
    setIsGiftOpen(true);
  };

  const handleSendGift = (gift: VirtualGift) => {
    if (user.coins >= gift.cost) {
      setUser((prev) => ({
        ...prev,
        coins: prev.coins - gift.cost,
      }));
      const recipientName = giftRecipient?.name || activeStranger?.name;
      setMessages((prev) => [
        ...prev,
        {
          id: `gift_${Date.now()}`,
          senderId: user.id,
          text: recipientName ? `Sent ${gift.name} ${gift.icon} to ${recipientName}!` : `Sent a ${gift.name} ${gift.icon}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
        },
      ]);
      setIsGiftOpen(false);
      setGiftRecipient(null);
    }
  };

  const handleConfirmReport = () => {
    setIsReportOpen(false);
    handleNextStranger();
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isLiveCallActive ? '100%' : '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
      }}
    >
      {/* Top Header Bar (Hidden during active fullscreen video call) */}
      {!isLiveCallActive && (
        <header
          style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--surface)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e2230',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="Telegle Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              objectFit: 'cover',
            }}
          />
          <div>
            <span
              style={{
                fontSize: 'var(--step-lead)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                display: 'block',
              }}
            >
              Telegle
            </span>
            <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>
              Meet Strangers. Make Connections
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAuthenticated ? (
            <>
              <button
                onClick={() => handleTabChange('wallet')}
                aria-label="View coins balance"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <IconDollar size={16} color="#22c55e" />
                <span>{user.coins}</span>
              </button>

              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                title={`Signed in as ${authUser?.display_name || authUser?.email}. Click to Logout`}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#1e2230',
                  color: '#9ea4b4',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #262c3e',
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={openAuthModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>
      )}

      {/* Main Tab Area */}
      <main
        style={{
          flex: 1,
          paddingBottom: isLiveCallActive ? 0 : activeTab === 'chat' ? '68px' : '76px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTab === 'matching' && (
          <MatchingView
            onMatchFound={handleMatchFound}
            userCoins={user.coins}
            onOpenWallet={() => handleTabChange('wallet')}
            isAuthenticated={isAuthenticated}
            onRequireAuth={openAuthModal}
            currentUserId={user.id}
          />
        )}

        {activeTab === 'video-call' && (activeStranger ? (
          <VideoCallView
            stranger={activeStranger}
            sessionId={activeCallSession?.sessionId}
            isInitiator={activeCallSession?.isInitiator}
            isChatOpen={isChatOpen}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onNextStranger={handleNextStranger}
            onOpenGiftModal={() => handleOpenGiftModal()}
            onOpenReportModal={() => setIsReportOpen(true)}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <MatchingView
            onMatchFound={handleMatchFound}
            userCoins={user.coins}
            onOpenWallet={() => handleTabChange('wallet')}
            isAuthenticated={isAuthenticated}
            onRequireAuth={openAuthModal}
            currentUserId={user.id}
          />
        ))}

        {activeTab === 'chat' && (
          isAuthenticated ? (
            <ChatView
              stranger={activeStranger}
              messages={messages}
              onSendMessage={handleSendMessage}
              onReact={handleReact}
              onDirectCall={handleMatchFound}
              onOpenGiftModal={handleOpenGiftModal}
            />
          ) : (
            <div style={{ padding: '48px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '14px' }}>
                Please sign in to access your messages
              </p>
              <button
                onClick={openAuthModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>
          )
        )}

        {activeTab === 'wallet' && (
          isAuthenticated ? (
            <WalletView
              coins={user.coins}
              onAddCoins={(amount: number) => {
                setUser((prev) => ({
                  ...prev,
                  coins: prev.coins + amount,
                }));
              }}
            />
          ) : (
            <div style={{ padding: '48px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '14px' }}>
                Please sign in to access your wallet
              </p>
              <button
                onClick={openAuthModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>
          )
        )}

        {activeTab === 'profile' && (
          isAuthenticated ? (
            <ProfileView
              user={{
                ...user,
                name: authUser?.display_name || authUser?.username || user.name,
                email: authUser?.email,
                tag: authUser?.email || (authUser?.username ? `@${authUser.username}` : ''),
              }}
              onUpdateBio={(newBio: string) => {
                setUser((prev) => ({
                  ...prev,
                  bio: newBio,
                }));
              }}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <div style={{ padding: '48px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '14px' }}>
                Please sign in to access your profile
              </p>
              <button
                onClick={openAuthModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>
          )
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden during active video call) */}
      {!isLiveCallActive && (
        <nav
          aria-label="Bottom primary navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid #1e2230',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            padding: '6px 8px',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => handleTabChange('matching')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeTab === 'matching' ? 'var(--surface-raised)' : 'transparent',
              color: activeTab === 'matching' ? 'var(--accent)' : 'var(--ink-secondary)',
              fontWeight: activeTab === 'matching' ? 700 : 500,
              fontSize: '13px',
            }}
          >
            <IconCompass size={18} />
            <span>Match</span>
          </button>

          <button
            onClick={() => handleTabChange('chat')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeTab === 'chat' ? 'var(--surface-raised)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--accent)' : 'var(--ink-secondary)',
              fontWeight: activeTab === 'chat' ? 700 : 500,
              fontSize: '13px',
            }}
          >
            <IconChat size={18} />
            <span>Messages</span>
          </button>

          <button
            onClick={() => handleTabChange('wallet')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeTab === 'wallet' ? 'var(--surface-raised)' : 'transparent',
              color: activeTab === 'wallet' ? 'var(--accent)' : 'var(--ink-secondary)',
              fontWeight: activeTab === 'wallet' ? 700 : 500,
              fontSize: '13px',
            }}
          >
            <IconWallet size={18} />
            <span>Wallet</span>
          </button>

          <button
            onClick={() => handleTabChange('profile')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeTab === 'profile' ? 'var(--surface-raised)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--accent)' : 'var(--ink-secondary)',
              fontWeight: activeTab === 'profile' ? 700 : 500,
              fontSize: '13px',
            }}
          >
            <IconUser size={18} />
            <span>Profile</span>
          </button>
        </nav>
      )}

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      <GiftModal
        isOpen={isGiftOpen}
        onClose={() => {
          setIsGiftOpen(false);
          setGiftRecipient(null);
        }}
        coins={user.coins}
        recipientUserId={giftRecipient?.id || activeStranger?.id}
        onSendGift={handleSendGift}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {activeStranger && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          strangerName={activeStranger.name}
          targetUserId={activeStranger.id}
          onConfirmReport={handleConfirmReport}
        />
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Logout"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(5, 7, 15, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#151926',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 24px rgba(239, 68, 68, 0.15)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'callModalPop 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '16px',
              }}
            >
              🚪
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Confirm Logout
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: 'var(--ink-secondary)',
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to sign out from
            </p>
            <div
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: 'var(--ink)',
                fontSize: '14px',
                fontWeight: 600,
                wordBreak: 'break-all',
                marginBottom: '24px',
              }}
            >
              {authUser?.email || authUser?.display_name || 'your account'}
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--ink-secondary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  logout();
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={4000}
          onClose={() => setToast(null)}
        />
      )}

      {/* Incoming Direct Video Call Ringing Modal */}
      {incomingCall && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Incoming Video Call"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(5, 7, 15, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#151926',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 32px rgba(34, 197, 94, 0.25)',
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'callModalPop 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Pulsing Avatar Container */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-14px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.25)',
                  animation: 'callRingPulse 1.8s infinite ease-out',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '-7px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.4)',
                  animation: 'callRingPulse 1.8s infinite ease-out 0.4s',
                }}
              />
              <img
                src={getSafeAvatarUrl(incomingCall.caller.avatarUrl, incomingCall.caller.gender)}
                alt={incomingCall.caller.displayName}
                style={{
                  position: 'relative',
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #22c55e',
                  backgroundColor: '#1f2438',
                }}
              />
            </div>

            <h3
              style={{
                margin: '0 0 6px 0',
                fontSize: '20px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              {incomingCall.caller.displayName}
            </h3>
            <p
              style={{
                margin: '0 0 28px 0',
                fontSize: '14px',
                color: 'var(--ink-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  animation: 'callBlinkDot 1.2s infinite',
                }}
              />
              Incoming video call...
            </p>

            {/* Action Buttons: Decline & Accept */}
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
                onClick={handleRejectDirectCall}
                style={{
                  padding: '13px 18px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1.5px solid rgba(239, 68, 68, 0.5)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Decline
              </button>

              <button
                type="button"
                onClick={handleAcceptDirectCall}
                style={{
                  padding: '13px 18px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#22c55e',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Direct Video Call Ringing Modal */}
      {outgoingCall && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Calling Partner"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(5, 7, 15, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#151926',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 32px rgba(255, 90, 31, 0.25)',
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'callModalPop 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Pulsing Avatar Container */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-14px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 90, 31, 0.25)',
                  animation: 'callRingPulse 1.8s infinite ease-out',
                }}
              />
              <img
                src={getSafeAvatarUrl(outgoingCall.partner.avatarUrl, outgoingCall.partner.gender)}
                alt={outgoingCall.partner.displayName}
                style={{
                  position: 'relative',
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent)',
                  backgroundColor: '#1f2438',
                }}
              />
            </div>

            <h3
              style={{
                margin: '0 0 6px 0',
                fontSize: '20px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              {outgoingCall.partner.displayName}
            </h3>
            <p
              style={{
                margin: '0 0 28px 0',
                fontSize: '14px',
                color: 'var(--ink-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  animation: 'callBlinkDot 1.2s infinite',
                }}
              />
              Ringing...
            </p>

            <button
              type="button"
              onClick={handleCancelDirectCall}
              style={{
                width: '100%',
                padding: '13px 18px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#ef4444',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
              }}
            >
              Cancel Call
            </button>
          </div>
        </div>
      )}

      {/* Global Call Keyframe Animations */}
      <style>{`
        @keyframes callRingPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.18); opacity: 0.3; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes callBlinkDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes callModalPop {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
