'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../shared/components/Button';
import { IconChat, IconVideo, IconGift, IconLock } from '../../../shared/components/Icons';
import { ChatMessage, Stranger } from '../../../shared/types';
import { chatApi, ConversationItem } from '../apis/chatApi';
import { moderationApi } from '../../moderation/moderationApi';
import { socketService } from '../../matching/services/socketClient';
import { DEFAULT_AVATAR, getSafeAvatarUrl } from '../../../shared/constants';
import { useAuth } from '../../auth';
import { profileApi } from '../../profile/apis/profileApi';
import {
  getStoredChatMessages,
  saveStoredChatMessage,
  markStoredMessagesAsRead,
  syncStoredChatBetweenKeys,
} from '../utils/chatStorage';

interface ChatViewProps {
  stranger: Stranger | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDirectCall?: (stranger: Stranger) => void;
  onOpenGiftModal?: (recipient?: { id?: string; name?: string }) => void;
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
  onOpenGiftModal,
}) => {
  let authUser: { id?: string; _id?: string } | null = null;
  try {
    const auth = useAuth();
    authUser = auth?.user || null;
  } catch {
    // Rendered outside AuthProvider
  }

  const [activeView, setActiveView] = useState<'chat' | 'inbox'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const selectedConversationRef = useRef<ConversationItem | null>(null);
  selectedConversationRef.current = selectedConversation;
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [isTogglingPermission, setIsTogglingPermission] = useState(false);
  const [convMessages, setConvMessages] = useState<Record<string, ChatMessage[]>>({});
  const [onlineStatusMap, setOnlineStatusMap] = useState<Record<string, boolean>>({});
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isUnblockConfirmOpen, setIsUnblockConfirmOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<
    Array<{ id: string; username: string; display_name: string; avatar_url?: string; age?: number; gender?: string }>
  >([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Fallback state for ephemeral stranger rooms without persistent conv ID
  const [strangerCallEnabledByMe, setStrangerCallEnabledByMe] = useState(false);
  const [strangerCallEnabledByPartner] = useState(false);

  // Load conversations inbox from REST API
  const refreshConversations = useCallback(() => {
    chatApi
      .listConversations()
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data);
          // If a conversation is selected, sync its permission status
          setSelectedConversation((prev) => {
            if (!prev) return null;
            const updated = data.find((c) => (c.id === prev.id || c._id === prev.id || c.id === prev._id || c._id === prev._id));
            return updated ? { ...prev, ...updated } : prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoadingInbox(true);
    chatApi
      .listConversations()
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data);
        }
      })
      .catch(() => {
        // Fallback for guest or offline mode
      })
      .finally(() => {
        setIsLoadingInbox(false);
      });
  }, []);

  // Poll conversation state every 4 seconds when a conversation is open to detect
  // when the opposite user enables video calls in real-time
  useEffect(() => {
    if (!selectedConversation) return;
    const convId = selectedConversation.id || selectedConversation._id;

    const interval = setInterval(() => {
      chatApi
        .getConversationById(convId)
        .then((updated) => {
          if (updated) {
            setSelectedConversation((prev) =>
              prev && (prev.id === convId || prev._id === convId)
                ? { ...prev, ...updated }
                : prev
            );
            setConversations((prev) =>
              prev.map((c) => (c.id === convId || c._id === convId ? { ...c, ...updated } : c))
            );
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConversation?.id, selectedConversation?._id]);

  // Real-time synchronization for new conversation connections, direct messages, and reactions
  useEffect(() => {
    try {
      const socket = socketService.getMatchmakingSocket();
      const onConvUpdate = () => {
        refreshConversations();
      };

      const onDirectMsg = (data: { conversationId: string; senderId: string; text: string; timestamp?: string }) => {
        if (!data?.conversationId || !data?.text) return;
        const newRemoteMsg: ChatMessage = {
          id: `msg_remote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          senderId: data.senderId,
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
        };

        saveStoredChatMessage(data.conversationId, newRemoteMsg);
        saveStoredChatMessage(data.senderId, newRemoteMsg);

        setConvMessages((prev) => {
          const list = prev[data.conversationId] || getStoredChatMessages(data.conversationId) || [];
          return {
            ...prev,
            [data.conversationId]: [...list, newRemoteMsg],
          };
        });
        refreshConversations();

        // If the recipient currently has this conversation open, acknowledge read receipt to sender
        const currentConv = selectedConversationRef.current;
        if (
          currentConv &&
          (currentConv.id === data.conversationId ||
            currentConv._id === data.conversationId ||
            currentConv.partner?.id === data.senderId)
        ) {
          try {
            socket.emit('mark_messages_read', {
              conversationId: data.conversationId,
              partnerId: data.senderId,
            });
          } catch {
            // Ignored
          }
        }
      };

      const onMessagesRead = (data: { conversationId?: string; readBy?: string }) => {
        const convId = data?.conversationId;
        const partnerId = data?.readBy;
        if (convId) markStoredMessagesAsRead(convId);
        if (partnerId) markStoredMessagesAsRead(partnerId);

        setConvMessages((prev) => {
          const updated = { ...prev };
          if (convId && updated[convId]) {
            updated[convId] = updated[convId].map((m) =>
              m.isSelf ? { ...m, isRead: true } : m
            );
          }
          if (partnerId && updated[partnerId]) {
            updated[partnerId] = updated[partnerId].map((m) =>
              m.isSelf ? { ...m, isRead: true } : m
            );
          }
          return updated;
        });
      };

      const onOnlineStatusResult = (statusMap: Record<string, boolean>) => {
        if (statusMap) {
          setOnlineStatusMap((prev) => ({ ...prev, ...statusMap }));
        }
      };

      const onUserBlockedYou = (data: { blockerId: string }) => {
        const currentConv = selectedConversationRef.current;
        if (currentConv?.partner?.id === data?.blockerId) {
          setIsBlockedByThem(true);
        }
      };

      const onUserUnblockedYou = (data: { unblockerId: string }) => {
        const currentConv = selectedConversationRef.current;
        if (currentConv?.partner?.id === data?.unblockerId) {
          setIsBlockedByThem(false);
        }
      };

      socket.on('conversation_updated', onConvUpdate);
      socket.on('conversation_created', onConvUpdate);
      socket.on('direct_message', onDirectMsg);
      socket.on('messages_read', onMessagesRead);
      socket.on('online_status_result', onOnlineStatusResult);
      socket.on('user_blocked_you', onUserBlockedYou);
      socket.on('user_unblocked_you', onUserUnblockedYou);

      return () => {
        socket.off('conversation_updated', onConvUpdate);
        socket.off('conversation_created', onConvUpdate);
        socket.off('direct_message', onDirectMsg);
        socket.off('messages_read', onMessagesRead);
        socket.off('online_status_result', onOnlineStatusResult);
        socket.off('user_blocked_you', onUserBlockedYou);
        socket.off('user_unblocked_you', onUserUnblockedYou);
      };
    } catch {
      // Ignored in SSR
    }
  }, [refreshConversations]);

  // Periodic online presence check for conversations
  useEffect(() => {
    if (!conversations.length) return;
    const partnerIds = conversations.map((c) => c.partner.id).filter(Boolean);
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.emit('check_online_status', { userIds: partnerIds }, (statusMap: Record<string, boolean>) => {
        if (statusMap) {
          setOnlineStatusMap((prev) => ({ ...prev, ...statusMap }));
        }
      });

      const interval = setInterval(() => {
        socket.emit('check_online_status', { userIds: partnerIds });
      }, 8000);

      return () => clearInterval(interval);
    } catch {
      // Ignored
    }
  }, [conversations]);

  const handleOpenConversationChat = (conv: ConversationItem) => {
    const convId = conv.id || conv._id;
    const partnerId = conv.partner.id;
    syncStoredChatBetweenKeys(convId, partnerId);

    const stored =
      getStoredChatMessages(convId).length > 0
        ? getStoredChatMessages(convId)
        : getStoredChatMessages(partnerId);

    if (stored.length > 0) {
      setConvMessages((prev) => ({
        ...prev,
        [convId]: stored,
      }));
    } else if (conv.last_message_text) {
      const isSelfMsg =
        conv.last_message_sender_id === authUser?.id ||
        conv.last_message_sender_id === authUser?._id ||
        conv.last_message_sender_id === 'me';
      const initialMsg: ChatMessage = {
        id: `msg_init_${convId}`,
        senderId: conv.last_message_sender_id || partnerId,
        text: conv.last_message_text,
        timestamp: formatTimeAgo(conv.last_interaction_at),
        isSelf: isSelfMsg,
      };
      saveStoredChatMessage(convId, initialMsg);
      saveStoredChatMessage(partnerId, initialMsg);
      setConvMessages((prev) => ({
        ...prev,
        [convId]: [initialMsg],
      }));
    }

    setSelectedConversation(conv);
    setActiveView('chat');

    // Check block status between me and partner
    moderationApi
      .checkBlockStatus(partnerId)
      .then((res) => {
        setIsBlockedByMe(Boolean(res?.isBlockedByMe));
        setIsBlockedByThem(Boolean(res?.isBlockedByThem));
      })
      .catch(() => {
        setIsBlockedByMe(false);
        setIsBlockedByThem(false);
      });

    // Notify partner that I opened this chat and read their messages
    try {
      const socket = socketService.getMatchmakingSocket();
      socket.emit('mark_messages_read', {
        conversationId: convId,
        partnerId,
      });
    } catch {
      // Ignored
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlockedByThem || isBlockedByMe) return;
    if (!inputText.trim()) return;
    const text = inputText.trim();

    if (selectedConversation) {
      const convId = selectedConversation.id || selectedConversation._id;
      const partnerId = selectedConversation.partner.id;
      const myId = authUser?.id || authUser?._id || 'me';
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: myId,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true,
        isRead: false,
      };

      saveStoredChatMessage(convId, newMsg);
      saveStoredChatMessage(partnerId, newMsg);

      setConvMessages((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || getStoredChatMessages(convId) || []), newMsg],
      }));

      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('direct_message', {
          conversationId: convId,
          partnerId,
          text,
        });
      } catch (err) {
        console.warn('Failed to emit direct_message', err);
      }

      setInputText('');
    } else {
      onSendMessage(text);
      setInputText('');
    }
  };

  // Toggle my permission allowing the other person to video call me
  const handleToggleMyVideoCallPermission = async () => {
    if (isTogglingPermission) return;
    setIsTogglingPermission(true);

    try {
      if (selectedConversation) {
        const convId = selectedConversation.id || selectedConversation._id;
        const nextState = !selectedConversation.video_call_enabled_by_me;
        const res = await chatApi.toggleVideoCallPermission(convId, nextState);

        const updatedByMe = res?.video_call_enabled_by_me ?? nextState;
        const updatedByPartner =
          res?.video_call_enabled_by_partner ?? selectedConversation.video_call_enabled_by_partner;

        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                video_call_enabled_by_me: updatedByMe,
                video_call_enabled_by_partner: updatedByPartner,
              }
            : null
        );

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId || c._id === convId) {
              return {
                ...c,
                video_call_enabled_by_me: updatedByMe,
                video_call_enabled_by_partner: updatedByPartner,
              };
            }
            return c;
          })
        );
      } else {
        // Stranger live chat mode
        setStrangerCallEnabledByMe((prev) => !prev);
      }
    } catch (err) {
      console.warn('Failed to toggle video call permission:', err);
    } finally {
      setIsTogglingPermission(false);
    }
  };

  // Initiate direct video call with partner
  const handleStartVideoCall = async (targetConv?: ConversationItem) => {
    const conv = targetConv || selectedConversation;
    if (conv) {
      if (!conv.video_call_enabled_by_partner) {
        alert(
          `${conv.partner.username ? `@${conv.partner.username.replace(/^@/, '')}` : conv.partner.display_name} has not enabled video calls yet. Ask them to turn on "Allow Call" in this chat.`
        );
        return;
      }
      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('initiate_direct_call', {
          conversationId: conv.id || conv._id,
          partnerId: conv.partner.id,
        });
      } catch (err) {
        console.warn('Direct call socket emit error:', err);
      }
    } else if (stranger) {
      if (!strangerCallEnabledByPartner) return;
      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('initiate_direct_call', {
          partnerId: stranger.id,
        });
      } catch (err) {
        console.warn('Direct call socket emit error:', err);
      }
    }
  };

  const handleDirectCallClick = async (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!conv.video_call_enabled_by_partner) {
      // If disabled, open the chat with user so they can view info and enable permission
      handleOpenConversationChat(conv);
      return;
    }
    await handleStartVideoCall(conv);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // Determine current partner details for active chat box
  const currentPartnerName = selectedConversation
    ? selectedConversation.partner.username
      ? `@${selectedConversation.partner.username.replace(/^@/, '')}`
      : selectedConversation.partner.display_name
    : stranger
    ? stranger.name
    : 'Stranger';

  const currentPartnerAvatar = selectedConversation
    ? getSafeAvatarUrl(selectedConversation.partner.avatar_url, selectedConversation.partner.gender)
    : stranger
    ? getSafeAvatarUrl(stranger.avatar, stranger.gender)
    : DEFAULT_AVATAR;

  const currentPartnerAge = selectedConversation
    ? selectedConversation.partner.age
    : stranger
    ? stranger.age
    : null;

  const currentPartnerId = selectedConversation
    ? selectedConversation.partner.id
    : stranger
    ? stranger.id
    : undefined;

  const isCurrentPartnerOnline = currentPartnerId
    ? Boolean(onlineStatusMap[currentPartnerId] ?? selectedConversation?.partner.is_online)
    : true;

  const isPartnerCallEnabled = selectedConversation
    ? Boolean(selectedConversation.video_call_enabled_by_partner)
    : strangerCallEnabledByPartner;

  const isMyCallEnabled = selectedConversation
    ? Boolean(selectedConversation.video_call_enabled_by_me)
    : strangerCallEnabledByMe;

  const handleBlockUser = () => {
    if (!currentPartnerId) return;
    setIsBlockConfirmOpen(true);
  };

  const handleConfirmBlock = async () => {
    if (!currentPartnerId) return;
    setIsBlocking(true);
    try {
      await moderationApi.blockUser({ targetUserId: currentPartnerId });
      setIsBlockedByMe(true);
      setIsBlockConfirmOpen(false);
      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('block_user', { targetUserId: currentPartnerId });
      } catch {
        // Ignored
      }
    } catch (err) {
      console.warn('Failed to block user:', err);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleConfirmUnblock = async () => {
    if (!currentPartnerId) return;
    setIsBlocking(true);
    try {
      await moderationApi.unblockUser(currentPartnerId);
      setIsBlockedByMe(false);
      setIsUnblockConfirmOpen(false);
      try {
        const socket = socketService.getMatchmakingSocket();
        socket.emit('unblock_user', { targetUserId: currentPartnerId });
      } catch {
        // Ignored
      }
    } catch (err) {
      console.warn('Failed to unblock user:', err);
    } finally {
      setIsBlocking(false);
    }
  };

  const getLastMessage = (conv: ConversationItem) => {
    const convId = conv.id || conv._id;
    const partnerId = conv.partner.id;
    const localList =
      (convMessages[convId]?.length ? convMessages[convId] : null) ||
      (getStoredChatMessages(convId).length ? getStoredChatMessages(convId) : null) ||
      (getStoredChatMessages(partnerId).length ? getStoredChatMessages(partnerId) : null);

    if (localList && localList.length > 0) {
      const last = localList[localList.length - 1];
      return {
        text: last.text,
        time: last.timestamp || formatTimeAgo(conv.last_interaction_at),
        isSelf: last.isSelf,
      };
    }
    if (conv.last_message_text) {
      const isSelf =
        conv.last_message_sender_id === authUser?.id ||
        conv.last_message_sender_id === authUser?._id ||
        conv.last_message_sender_id === 'me';
      return {
        text: conv.last_message_text,
        time: formatTimeAgo(conv.last_interaction_at),
        isSelf,
      };
    }
    return {
      text: 'Connected via video call',
      time: formatTimeAgo(conv.last_interaction_at),
      isSelf: false,
    };
  };

  // Real-time username database search when user searches
  useEffect(() => {
    const query = searchQuery.trim().replace(/^@/, '');
    if (!query || query.length < 2) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const results = await profileApi.searchUsers(query);
        if (!isCancelled) {
          const existingPartnerIds = new Set(conversations.map((c) => c.partner.id));
          const myId = authUser?.id || authUser?._id;
          const filtered = (results || []).filter(
            (u) => u.id !== myId && !existingPartnerIds.has(u.id)
          );
          setGlobalSearchResults(filtered);
        }
      } catch (err) {
        console.warn('Failed to search users:', err);
        if (!isCancelled) setGlobalSearchResults([]);
      } finally {
        if (!isCancelled) setIsSearchingGlobal(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, conversations, authUser]);

  const handleSelectGlobalUser = (user: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    age?: number;
    gender?: string;
  }) => {
    // Check if user already exists in conversations
    const existing = conversations.find(
      (c) =>
        c.partner.id === user.id ||
        (c.partner.username && c.partner.username.toLowerCase() === user.username.toLowerCase())
    );
    if (existing) {
      handleOpenConversationChat(existing);
      return;
    }

    const cleanUsername = user.username ? user.username.replace(/^@/, '') : '';
    const newConv: ConversationItem = {
      _id: `conv_${user.id}`,
      id: `conv_${user.id}`,
      partner: {
        id: user.id,
        username: cleanUsername,
        display_name: cleanUsername ? `@${cleanUsername}` : user.display_name || 'User',
        avatar_url: user.avatar_url,
        gender: user.gender || 'OTHER',
        age: user.age || 20,
        karmaScore: 100,
        is_online: Boolean(onlineStatusMap[user.id]),
      },
      last_interaction_at: new Date().toISOString(),
      video_call_enabled_by_me: true,
      video_call_enabled_by_partner: false,
    };

    setConversations((prev) => [
      newConv,
      ...prev.filter((c) => (c.id || c._id) !== newConv.id && c.partner.id !== user.id),
    ]);
    handleOpenConversationChat(newConv);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase().replace(/^@/, '');
    return (
      (c.partner.display_name && c.partner.display_name.toLowerCase().includes(q)) ||
      (c.partner.username && c.partner.username.toLowerCase().includes(q))
    );
  });

  const activeMessages = selectedConversation
    ? (() => {
        const convId = selectedConversation.id || selectedConversation._id;
        const partnerId = selectedConversation.partner.id;
        if (convMessages[convId]?.length) {
          return convMessages[convId];
        }
        const stored =
          getStoredChatMessages(convId).length > 0
            ? getStoredChatMessages(convId)
            : getStoredChatMessages(partnerId);
        if (stored.length > 0) {
          return stored;
        }
        if (stranger?.id === partnerId && messages?.length) {
          return messages;
        }
        if (selectedConversation.last_message_text) {
          const isSelf =
            selectedConversation.last_message_sender_id === authUser?.id ||
            selectedConversation.last_message_sender_id === authUser?._id ||
            selectedConversation.last_message_sender_id === 'me';
          return [
            {
              id: `msg_init_${convId}`,
              senderId: selectedConversation.last_message_sender_id || partnerId,
              text: selectedConversation.last_message_text,
              timestamp: formatTimeAgo(selectedConversation.last_interaction_at),
              isSelf,
            },
          ];
        }
        return [];
      })()
    : messages;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeView !== 'inbox' && activeMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, activeView, selectedConversation?.partner?.id]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        height: 'calc(100dvh - 132px)',
        maxHeight: 'calc(100dvh - 132px)',
        padding: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {activeView === 'inbox' ? (
        /* ================= WhatsApp Chat List View ================= */
        <div
          data-ui
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%',
            maxHeight: '100%',
            backgroundColor: 'var(--surface)',
            overflow: 'hidden',
          }}
        >
          {/* WhatsApp Header */}
          <div
            style={{
              padding: '16px 16px 12px 16px',
              backgroundColor: 'var(--surface-raised)',
              borderBottom: '1px solid #1e2230',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>Messages</h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 90, 31, 0.15)',
                    color: 'var(--accent)',
                  }}
                >
                  {conversations.length} {conversations.length === 1 ? 'connection' : 'connections'}
                </span>
              </div>
            </div>

            {/* WhatsApp Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '13px',
                  color: 'var(--ink-secondary)',
                  pointerEvents: 'none',
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '9px 32px 9px 34px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #232838',
                  borderRadius: 'var(--radius-full)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-secondary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Active Live Match Banner (if user matched in video call) */}
          {stranger && (
            <div
              onClick={() => {
                setSelectedConversation(null);
                setActiveView('chat');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                gap: '12px',
                backgroundColor: 'rgba(255, 90, 31, 0.08)',
                borderBottom: '1px solid rgba(255, 90, 31, 0.25)',
                cursor: 'pointer',
              }}
            >
              <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                <img
                  src={getSafeAvatarUrl(stranger.avatar, stranger.gender)}
                  alt={stranger.name}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    border: '2px solid var(--surface)',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>Live Call: {stranger.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Active Now</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>Tap to open chat with {stranger.name}</span>
              </div>
            </div>
          )}

          {/* WhatsApp Chat List Items */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {isLoadingInbox ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--ink-secondary)', fontSize: '14px' }}>
                Loading past connections...
              </div>
            ) : (
              <>
                {/* 1. Existing matching connections */}
                {filteredConversations.map((conv) => {
                  const lastMsg = getLastMessage(conv);
                  const isPartnerOnline = Boolean(onlineStatusMap[conv.partner.id] ?? conv.partner.is_online);
                  const usernameDisplay = conv.partner.username
                    ? `@${conv.partner.username.replace(/^@/, '')}`
                    : conv.partner.display_name;

                  return (
                    <div
                      key={conv.id || conv._id}
                      onClick={() => handleOpenConversationChat(conv)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        gap: '14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Rounded Avatar with Green/Red online status indicator */}
                      <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                        <img
                          src={getSafeAvatarUrl(conv.partner.avatar_url, conv.partner.gender)}
                          alt={usernameDisplay}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: 'var(--surface-raised)',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '1px',
                            right: '1px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: isPartnerOnline ? '#22c55e' : '#ef4444',
                            border: '2px solid var(--surface, #171b26)',
                            boxShadow: isPartnerOnline ? '0 0 6px rgba(34, 197, 94, 0.7)' : 'none',
                          }}
                          title={isPartnerOnline ? 'Online' : 'Offline'}
                        />
                      </div>

                      {/* Middle: Name & Last Message Preview */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: 600,
                              color: '#ffffff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {usernameDisplay} {conv.partner.age ? `, ${conv.partner.age}` : ''}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--ink-secondary)',
                              flexShrink: 0,
                              marginLeft: '8px',
                            }}
                          >
                            {lastMsg.time}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                          {lastMsg.isSelf && (
                            <span style={{ color: '#53bdeb', fontSize: '13px', lineHeight: 1 }}>✓✓</span>
                          )}
                          <span
                            style={{
                              fontSize: '13px',
                              color: 'var(--ink-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {lastMsg.text}
                          </span>
                        </div>
                      </div>

                      {/* Right: Call icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {conv.video_call_enabled_by_partner && (
                          <button
                            type="button"
                            onClick={(e) => handleDirectCallClick(conv, e)}
                            title={`Video call enabled! Click to call (1🪙)`}
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#22c55e',
                              cursor: 'pointer',
                            }}
                          >
                            <IconVideo size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Direct Username Search Results from Database */}
                {searchQuery.trim().length >= 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {isSearchingGlobal && (
                      <div
                        style={{
                          padding: '12px 16px',
                          fontSize: '13px',
                          color: 'var(--ink-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '15px' }}>🔍</span>
                        <span>Searching database for user "@{searchQuery.trim().replace(/^@/, '')}"...</span>
                      </div>
                    )}

                    {!isSearchingGlobal && globalSearchResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                          style={{
                            padding: '12px 16px 6px 16px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--accent)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 90, 31, 0.05)',
                            borderTop: '1px solid rgba(255, 90, 31, 0.15)',
                            borderBottom: '1px solid rgba(255, 90, 31, 0.15)',
                          }}
                        >
                          <span>Discover New Users</span>
                          <span style={{ fontSize: '10px', color: 'var(--ink-secondary)' }}>Click to start chat</span>
                        </div>

                        {globalSearchResults.map((user) => {
                          const isOnline = Boolean(onlineStatusMap[user.id]);
                          return (
                            <div
                              key={user.id}
                              onClick={() => handleSelectGlobalUser(user)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                gap: '14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 90, 31, 0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                            >
                              <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                                <img
                                  src={getSafeAvatarUrl(user.avatar_url, user.gender)}
                                  alt={user.username}
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid rgba(255, 90, 31, 0.4)',
                                    backgroundColor: 'var(--surface-raised)',
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                                  }}
                                />
                                {isOnline && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: '1px',
                                      right: '1px',
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: '#22c55e',
                                      border: '2px solid var(--surface, #171b26)',
                                      boxShadow: '0 0 6px rgba(34, 197, 94, 0.7)',
                                    }}
                                    title="Online"
                                  />
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                                    @{user.username.replace(/^@/, '')}
                                  </span>
                                  {user.age ? (
                                    <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                                      , {user.age}
                                    </span>
                                  ) : null}
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--accent)' }}>
                                  Found in database · Click to start chat
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectGlobalUser(user);
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 'var(--radius-full)',
                                  background: 'linear-gradient(135deg, #ff7a3d 0%, #ff5a1f 100%)',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 10px rgba(255, 90, 31, 0.35)',
                                }}
                              >
                                Message
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Empty States */}
                {filteredConversations.length === 0 && (
                  <>
                    {searchQuery.trim() ? (
                      !isSearchingGlobal && globalSearchResults.length === 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '48px 20px',
                            textAlign: 'center',
                            gap: '12px',
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px',
                            }}
                          >
                            🔍
                          </div>
                          <strong style={{ fontSize: '15px', color: '#ffffff' }}>
                            No users found for "@{searchQuery.trim().replace(/^@/, '')}"
                          </strong>
                          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', maxWidth: '32ch', margin: 0 }}>
                            Only registered users matching this username will appear here.
                          </p>
                        </div>
                      )
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '48px 20px',
                          textAlign: 'center',
                          gap: '14px',
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconChat size={32} color="var(--accent)" />
                        </div>
                        <strong style={{ fontSize: '16px', color: '#ffffff' }}>No past connections yet</strong>
                        <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', maxWidth: '34ch', lineHeight: 1.5, margin: 0 }}>
                          Search any user by @username above to start a chat, or match via video call!
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* ================= Message Chat Box View ================= */
        <div
          data-ui
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%',
            maxHeight: '100%',
            backgroundColor: 'var(--surface)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {/* Chat Header (Fixed at Top) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'linear-gradient(180deg, #161a27 0%, #111420 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
              gap: '10px',
              zIndex: 10,
            }}
          >
            {/* Left: Avatar + Back Button + Partner Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedConversation(null);
                  setActiveView('inbox');
                  setIsBlockedByMe(false);
                  setIsBlockedByThem(false);
                }}
                title="Back to Chats"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
                <img
                  src={getSafeAvatarUrl(currentPartnerAvatar)}
                  alt={currentPartnerName}
                  style={{
                    width: '38px',
                    height: '38px',
                    minWidth: '38px',
                    minHeight: '38px',
                    flexShrink: 0,
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    backgroundColor: 'var(--surface-raised)',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isCurrentPartnerOnline ? '#22c55e' : '#ef4444',
                    border: '2px solid #111420',
                    boxShadow: isCurrentPartnerOnline ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none',
                  }}
                  title={isCurrentPartnerOnline ? 'Online' : 'Offline'}
                />
              </div>

              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    margin: 0,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                >
                  {currentPartnerName} {currentPartnerAge ? `, ${currentPartnerAge}` : ''}
                </h3>
              </div>
            </div>

            {/* Right: Actions Toolbar (Allow Call, Video Call, Block/Unblock) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Allow Call Toggle Pill */}
              <button
                type="button"
                onClick={handleToggleMyVideoCallPermission}
                disabled={isTogglingPermission || isBlockedByMe || isBlockedByThem}
                title={
                  isBlockedByThem
                    ? `${currentPartnerName} blocked you`
                    : isBlockedByMe
                    ? `You have blocked ${currentPartnerName}`
                    : isMyCallEnabled
                    ? `You enabled video calls for ${currentPartnerName}. Click to turn OFF.`
                    : `Click to enable video calls for ${currentPartnerName} so they can video call you.`
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 11px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: isTogglingPermission || isBlockedByMe || isBlockedByThem ? 'not-allowed' : 'pointer',
                  opacity: isBlockedByMe || isBlockedByThem ? 0.45 : 1,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  backgroundColor: isMyCallEnabled
                    ? 'rgba(34, 197, 94, 0.14)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isMyCallEnabled
                    ? '1px solid rgba(34, 197, 94, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isMyCallEnabled ? '#4ade80' : 'var(--ink-secondary)',
                  backdropFilter: 'blur(6px)',
                }}
                onMouseEnter={(e) => {
                  if (!isTogglingPermission && !isBlockedByMe && !isBlockedByThem) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.backgroundColor = isMyCallEnabled
                      ? 'rgba(34, 197, 94, 0.22)'
                      : 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.backgroundColor = isMyCallEnabled
                    ? 'rgba(34, 197, 94, 0.14)'
                    : 'rgba(255, 255, 255, 0.05)';
                }}
              >
                {isMyCallEnabled && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                      transition: 'all 0.2s ease',
                    }}
                  />
                )}
                <span>Allow Call: <strong>{isMyCallEnabled ? 'ON' : 'OFF'}</strong></span>
              </button>

              {/* Video Call Button (Icon Symbol Only) */}
              <button
                type="button"
                disabled={!isPartnerCallEnabled || isBlockedByMe || isBlockedByThem}
                onClick={() => handleStartVideoCall(selectedConversation || undefined)}
                aria-label={
                  isBlockedByThem
                    ? `${currentPartnerName} blocked you`
                    : isBlockedByMe
                    ? `You have blocked ${currentPartnerName}`
                    : isPartnerCallEnabled
                    ? `Start video call with ${currentPartnerName} (1🪙)`
                    : `Video call disabled. Waiting for ${currentPartnerName} to open chat and enable video calls.`
                }
                title={
                  isBlockedByThem
                    ? `${currentPartnerName} blocked you`
                    : isBlockedByMe
                    ? `You have blocked ${currentPartnerName}`
                    : isPartnerCallEnabled
                    ? `Start video call with ${currentPartnerName} (1🪙)`
                    : `Video call disabled. Waiting for ${currentPartnerName} to open chat and enable video calls.`
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  cursor: !isPartnerCallEnabled || isBlockedByMe || isBlockedByThem ? 'not-allowed' : 'pointer',
                  opacity: !isPartnerCallEnabled || isBlockedByMe || isBlockedByThem ? 0.45 : 1,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  background: isPartnerCallEnabled && !isBlockedByMe && !isBlockedByThem
                    ? 'linear-gradient(135deg, #ff5a1f 0%, #ff7a45 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isPartnerCallEnabled && !isBlockedByMe && !isBlockedByThem
                    ? '1px solid rgba(255, 122, 69, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  boxShadow: isPartnerCallEnabled && !isBlockedByMe && !isBlockedByThem
                    ? '0 2px 14px rgba(255, 90, 31, 0.45)'
                    : 'none',
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (isPartnerCallEnabled && !isBlockedByMe && !isBlockedByThem) {
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.06)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(255, 90, 31, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = isPartnerCallEnabled && !isBlockedByMe && !isBlockedByThem
                    ? '0 2px 14px rgba(255, 90, 31, 0.45)'
                    : 'none';
                }}
              >
                {isPartnerCallEnabled && !isBlockedByMe && !isBlockedByThem ? (
                  <IconVideo size={16} />
                ) : (
                  <IconLock size={15} />
                )}
              </button>

              {/* Block / Unblock Action Button (Symbol Only) */}
              {isBlockedByMe ? (
                <button
                  type="button"
                  onClick={() => setIsUnblockConfirmOpen(true)}
                  aria-label={`Unblock ${currentPartnerName}`}
                  title={`Unblock ${currentPartnerName}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#f87171',
                    padding: 0,
                    flexShrink: 0,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.24)';
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBlockUser}
                  disabled={isBlocking || isBlockedByThem}
                  aria-label={isBlockedByThem ? 'User blocked you' : `Block ${currentPartnerName}`}
                  title={isBlockedByThem ? 'User blocked you' : `Block ${currentPartnerName}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    cursor: isBlocking || isBlockedByThem ? 'not-allowed' : 'pointer',
                    opacity: isBlockedByThem ? 0.4 : 1,
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    padding: 0,
                    flexShrink: 0,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isBlocking && !isBlockedByThem) {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                      e.currentTarget.style.transform = 'translateY(-1px) scale(1.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Block Status or Video Call Permission Status Banner (Fixed Directly Below Header) */}
          {isBlockedByThem ? (
            <div
              style={{
                flexShrink: 0,
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0.08) 100%)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
              }}
            >
              <span style={{ fontSize: '15px' }}>🚫</span>
              <span><strong>{currentPartnerName}</strong> blocked you. You cannot message or initiate calls.</span>
            </div>
          ) : isBlockedByMe ? (
            <div
              style={{
                flexShrink: 0,
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.16) 0%, rgba(234, 179, 8, 0.08) 100%)',
                borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
                color: '#fde047',
              }}
            >
              <span>You have blocked <strong>{currentPartnerName}</strong>.</span>
              <button
                type="button"
                onClick={() => setIsUnblockConfirmOpen(true)}
                style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.5)',
                  borderRadius: '12px',
                  color: '#fef08a',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Unblock
              </button>
            </div>
          ) : (
            <div
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isPartnerCallEnabled
                  ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)'
                  : 'linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.03) 100%)',
                borderBottom: isPartnerCallEnabled
                  ? '1px solid rgba(34, 197, 94, 0.2)'
                  : '1px solid rgba(234, 179, 8, 0.18)',
                color: isPartnerCallEnabled ? '#4ade80' : '#facc15',
              }}
            >
              {isPartnerCallEnabled ? (
                <span>
                  ✓ <strong>{currentPartnerName}</strong> has enabled video calls. Your Video Call button is active!
                </span>
              ) : (
                <>
                  <IconLock size={13} style={{ flexShrink: 0 }} />
                  <span>
                    Video call button activates once <strong>{currentPartnerName}</strong> enables video calls.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Messages Stream (ONLY THIS AREA IS SCROLLABLE) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: 'var(--space-16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {activeMessages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '32px' }}>💬</span>
                <strong style={{ fontSize: 'var(--step-body)' }}>Say hello!</strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  Pick a conversation starter below to break the ice:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '280px' }}>
                  {ICEBREAKERS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInputText(prompt);
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--surface-raised)',
                        border: '1px solid #2a3042',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--ink)',
                        fontSize: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.isSelf ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    alignItems: msg.isSelf ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '16px',
                      backgroundColor: msg.isSelf ? 'var(--accent)' : 'var(--surface-raised)',
                      color: msg.isSelf ? 'var(--accent-ink)' : 'var(--ink)',
                      fontSize: '14px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--ink-tertiary)',
                    }}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.isSelf && (
                      <span
                        title={msg.isRead ? 'Read' : 'Sent'}
                        aria-label={msg.isRead ? 'Read' : 'Sent'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: msg.isRead ? '#53bdeb' : '#94a3b8',
                        }}
                      >
                        <svg
                          width="15"
                          height="10"
                          viewBox="0 0 16 11"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ display: 'inline-block' }}
                        >
                          <path
                            d="M1 5.5L4.5 9L11.5 2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 5.5L8.5 9L15.5 2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form (Fixed at Bottom) */}
          <form
            onSubmit={(e) => {
              setIsEmojiPickerOpen(false);
              handleSend(e);
            }}
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(180deg, #131722 0%, #10131d 100%)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
              position: 'relative',
              zIndex: 10,
            }}
          >
            {onOpenGiftModal && (
              <button
                type="button"
                disabled={isBlockedByThem || isBlockedByMe}
                onClick={() =>
                  onOpenGiftModal(
                    currentPartnerId
                      ? { id: currentPartnerId, name: currentPartnerName }
                      : undefined
                  )
                }
                title={
                  isBlockedByThem
                    ? `${currentPartnerName} blocked you`
                    : isBlockedByMe
                    ? `You have blocked ${currentPartnerName}`
                    : 'Send Gift'
                }
                aria-label="Send gift"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 90, 31, 0.12)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(255, 90, 31, 0.3)',
                  cursor: isBlockedByThem || isBlockedByMe ? 'not-allowed' : 'pointer',
                  opacity: isBlockedByThem || isBlockedByMe ? 0.4 : 1,
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease',
                }}
              >
                <IconGift size={18} />
              </button>
            )}

            {/* Emoji Picker Button & Floating Popover */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                disabled={isBlockedByThem || isBlockedByMe}
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                title={
                  isBlockedByThem
                    ? `${currentPartnerName} blocked you`
                    : isBlockedByMe
                    ? `You have blocked ${currentPartnerName}`
                    : 'Insert emoji'
                }
                aria-label="Insert emoji"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isEmojiPickerOpen ? 'rgba(255, 90, 31, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isEmojiPickerOpen ? 'var(--accent)' : 'var(--ink-secondary)',
                  border: isEmojiPickerOpen ? '1px solid var(--accent)' : '1px solid #2a3042',
                  cursor: isBlockedByThem || isBlockedByMe ? 'not-allowed' : 'pointer',
                  opacity: isBlockedByThem || isBlockedByMe ? 0.4 : 1,
                  flexShrink: 0,
                  fontSize: '18px',
                  transition: 'all 0.2s ease',
                }}
              >
                😊
              </button>

              {isEmojiPickerOpen && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '48px',
                    left: 0,
                    zIndex: 999,
                    width: '280px',
                    backgroundColor: '#151926',
                    border: '1px solid #2a3042',
                    borderRadius: '16px',
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 90, 31, 0.15)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    animation: 'callModalPop 150ms ease-out',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: '6px',
                      borderBottom: '1px solid #232838',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--ink-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Pick Emoji
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEmojiPickerOpen(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ink-secondary)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {[
                      '😀', '😃', '😄', '😁', '😆', '😅', '😂',
                      '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰',
                      '😘', '😋', '😜', '😎', '🥳', '😏', '🥺',
                      '😭', '😤', '😡', '👍', '👎', '👏', '🙌',
                      '🔥', '❤️', '💔', '💖', '✨', '🎉', '🍕',
                      '☕', '🚀', '💯', '👋', '🤝', '🙈', '⭐',
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInputText((prev) => prev + emoji);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 100ms ease, transform 100ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              value={inputText}
              disabled={isBlockedByThem || isBlockedByMe}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isBlockedByThem
                  ? `${currentPartnerName} blocked you`
                  : isBlockedByMe
                  ? `You blocked ${currentPartnerName}. Unblock to message.`
                  : `Message ${currentPartnerName}...`
              }
              maxLength={200}
              style={{
                flex: 1,
                padding: '10px 14px',
                backgroundColor: isBlockedByThem || isBlockedByMe ? 'rgba(255, 255, 255, 0.03)' : 'var(--surface)',
                border: isBlockedByThem || isBlockedByMe ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #2a3042',
                borderRadius: 'var(--radius-sm)',
                color: isBlockedByThem || isBlockedByMe ? 'var(--ink-tertiary)' : 'var(--ink)',
                fontSize: '14px',
                cursor: isBlockedByThem || isBlockedByMe ? 'not-allowed' : 'text',
              }}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isBlockedByThem || isBlockedByMe || !inputText.trim()}
              style={{
                opacity: isBlockedByThem || isBlockedByMe || !inputText.trim() ? 0.45 : 1,
                cursor: isBlockedByThem || isBlockedByMe || !inputText.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </Button>
          </form>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {isBlockConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 150ms ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isBlocking) {
              setIsBlockConfirmOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#151926',
              border: '1px solid #2a3042',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(239, 68, 68, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                🚫
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                  Block {currentPartnerName}?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  They will not be able to send you messages or initiate video calls. You can unblock them at any time.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsBlockConfirmOpen(false)}
                disabled={isBlocking}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  border: '1px solid #2a3042',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isBlocking ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                disabled={isBlocking}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isBlocking ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)',
                  transition: 'opacity 0.15s ease',
                  opacity: isBlocking ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '90px',
                }}
              >
                {isBlocking ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Confirmation Modal */}
      {isUnblockConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 150ms ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isBlocking) {
              setIsUnblockConfirmOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#151926',
              border: '1px solid #2a3042',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 90, 31, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                🔓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                  Unblock {currentPartnerName}?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  They will be able to send you messages and initiate video calls again.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsUnblockConfirmOpen(false)}
                disabled={isBlocking}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  border: '1px solid #2a3042',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isBlocking ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmUnblock}
                disabled={isBlocking}
                style={{
                  minWidth: '90px',
                }}
              >
                {isBlocking ? 'Unblocking...' : 'Unblock'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


