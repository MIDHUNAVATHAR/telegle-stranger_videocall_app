'use client';

import { useState } from 'react';
import '../shared/styles/tokens.css';
import { TabType, Stranger, ChatMessage, VirtualGift } from '../shared/types';
import { INITIAL_USER, SAMPLE_STRANGERS } from '../shared/constants';
import { MatchingView } from '../features/matching/components/MatchingView';
import { VideoCallView } from '../features/video-call/components/VideoCallView';
import { ChatView } from '../features/chat/components/ChatView';
import { WalletView } from '../features/wallet/components/WalletView';
import { ProfileView } from '../features/profile/components/ProfileView';
import { GiftModal } from '../features/gifts/components/GiftModal';
import { SettingsModal } from '../features/settings/components/SettingsModal';
import { ReportModal } from '../features/matching/components/ReportModal';
import { AuthProvider, useAuth, AuthModal } from '../features/auth';
import { walletApi } from '../features/wallet/walletApi';
import { useEffect } from 'react';
import {
  IconBolt,
  IconSettings,
  IconCompass,
  IconVideo,
  IconChat,
  IconWallet,
  IconUser,
} from '../shared/components/Icons';

function AppContent() {
  const { user: authUser, isAuthenticated, isAuthModalOpen, openAuthModal, closeAuthModal, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('matching');
  const [user, setUser] = useState(INITIAL_USER);

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
  const [activeStranger, setActiveStranger] = useState<Stranger | null>(SAMPLE_STRANGERS[0]);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Match event
  const handleMatchFound = (stranger: Stranger) => {
    setActiveStranger(stranger);
    setActiveTab('video-call');
    setMessages([
      {
        id: `m_${Date.now()}`,
        senderId: stranger.id,
        text: `Connected with ${stranger.name} from ${stranger.country} (${stranger.countryFlag})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: false,
      },
    ]);
  };

  const handleNextStranger = () => {
    const currentIndex = SAMPLE_STRANGERS.findIndex((s) => s.id === activeStranger?.id);
    const nextStranger = SAMPLE_STRANGERS[(currentIndex + 1) % SAMPLE_STRANGERS.length];
    handleMatchFound(nextStranger);
  };

  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };
    setMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      const responses = [
        'Awesome to meet you! Same here.',
        'That is cool! Where is that located?',
        'I was just talking about that earlier today.',
        'Sounds good, let us chat more.',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_reply_${Date.now()}`,
          senderId: activeStranger?.id || 'stranger',
          text: randomResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
        },
      ]);
    }, 1200);
  };

  const handleReact = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reaction: emoji } : m))
    );
  };

  const handleSendGift = (gift: VirtualGift) => {
    if (user.coins >= gift.cost) {
      setUser((prev) => ({
        ...prev,
        coins: prev.coins - gift.cost,
      }));
      setMessages((prev) => [
        ...prev,
        {
          id: `gift_${Date.now()}`,
          senderId: user.id,
          text: `Sent a ${gift.name} ${gift.icon}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
        },
      ]);
      setIsGiftOpen(false);
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
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
      }}
    >
      {/* Top Header Bar */}
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
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '15px',
            }}
          >
            DP
          </div>
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
              Donkey Play
            </span>
            <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>
              Social Discovery
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAuthenticated ? (
            <>
              <button
                onClick={() => setActiveTab('wallet')}
                aria-label="View coins balance"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-raised)',
                  color: 'var(--accent)',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <IconBolt size={16} />
                <span>{user.coins}</span>
              </button>

              <button
                onClick={logout}
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

          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--ink-secondary)',
            }}
          >
            <IconSettings size={18} />
          </button>
        </div>
      </header>

      {/* Main Tab Area */}
      <main style={{ flex: 1, paddingBottom: '76px', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'matching' && (
          <MatchingView
            onMatchFound={handleMatchFound}
            userCoins={user.coins}
            onOpenWallet={() => setActiveTab('wallet')}
          />
        )}

        {activeTab === 'video-call' && activeStranger && (
          <VideoCallView
            stranger={activeStranger}
            isChatOpen={isChatOpen}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onNextStranger={handleNextStranger}
            onOpenGiftModal={() => setIsGiftOpen(true)}
            onOpenReportModal={() => setIsReportOpen(true)}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            stranger={activeStranger}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReact={handleReact}
            onDirectCall={handleMatchFound}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            coins={user.coins}
            onAddCoins={(amount: number) => {
              setUser((prev) => ({
                ...prev,
                coins: prev.coins + amount,
              }));
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={{
              ...user,
              name: authUser?.display_name || user.name,
            }}
            onUpdateBio={(newBio: string) => {
              setUser((prev) => ({
                ...prev,
                bio: newBio,
              }));
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
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
          gridTemplateColumns: 'repeat(5, 1fr)',
          padding: '6px 8px',
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setActiveTab('matching')}
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
          onClick={() => setActiveTab('video-call')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minHeight: '48px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'video-call' ? 'var(--surface-raised)' : 'transparent',
            color: activeTab === 'video-call' ? 'var(--accent)' : 'var(--ink-secondary)',
            fontWeight: activeTab === 'video-call' ? 700 : 500,
            fontSize: '13px',
          }}
        >
          <IconVideo size={18} />
          <span>Call</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
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
          onClick={() => setActiveTab('wallet')}
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
          onClick={() => setActiveTab('profile')}
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

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      <GiftModal
        isOpen={isGiftOpen}
        onClose={() => setIsGiftOpen(false)}
        coins={user.coins}
        recipientUserId={activeStranger?.id}
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
