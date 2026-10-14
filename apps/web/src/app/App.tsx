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
import {
  IconBolt,
  IconSettings,
  IconCompass,
  IconVideo,
  IconChat,
  IconWallet,
  IconUser,
} from '../shared/components/Icons';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('matching');
  const [user, setUser] = useState(INITIAL_USER);
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
      setUser((prev) => ({ ...prev, coins: prev.coins - gift.cost }));
      setMessages((prev) => [
        ...prev,
        {
          id: `gift_${Date.now()}`,
          senderId: user.id,
          text: `Sent a virtual gift: ${gift.name}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
        },
      ]);
    }
  };

  const handleAddCoins = (amount: number) => {
    setUser((prev) => ({ ...prev, coins: prev.coins + amount }));
  };

  const handleUpdateBio = (newBio: string) => {
    setUser((prev) => ({ ...prev, bio: newBio }));
  };

  const handleConfirmReport = (reason: string) => {
    setActiveStranger(null);
    setActiveTab('matching');
    alert(`Stranger reported for: "${reason}". Session terminated.`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
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
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--ink-secondary)',
            }}
          >
            <IconSettings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
          padding: 'var(--space-16) var(--space-16) 96px var(--space-16)',
        }}
      >
        {activeTab === 'matching' && (
          <MatchingView onMatchFound={handleMatchFound} />
        )}

        {activeTab === 'video-call' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
            <VideoCallView
              stranger={activeStranger}
              onNextStranger={handleNextStranger}
              onOpenGiftModal={() => setIsGiftOpen(true)}
              onOpenReportModal={() => setIsReportOpen(true)}
              onToggleChat={() => setIsChatOpen(!isChatOpen)}
              isChatOpen={isChatOpen}
            />

            {isChatOpen && (
              <ChatView
                stranger={activeStranger}
                messages={messages}
                onSendMessage={handleSendMessage}
                onReact={handleReact}
              />
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatView
            stranger={activeStranger}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReact={handleReact}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView coins={user.coins} onAddCoins={handleAddCoins} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            onUpdateBio={handleUpdateBio}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Bottom Mobile-First Navigation Bar */}
      <nav
        aria-label="Main Navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'var(--surface)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          padding: '6px 8px 12px 8px',
          borderTop: 'none',
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
          <span>Discover</span>
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
          <span>Live Call</span>
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
          <span>Chat</span>
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
      <GiftModal
        isOpen={isGiftOpen}
        onClose={() => setIsGiftOpen(false)}
        coins={user.coins}
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
          onConfirmReport={handleConfirmReport}
        />
      )}
    </div>
  );
}

export default App;
