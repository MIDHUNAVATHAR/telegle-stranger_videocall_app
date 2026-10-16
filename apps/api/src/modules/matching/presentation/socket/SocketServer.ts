import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Redis from 'ioredis';
import { env } from '../../../../config/env';
import { logger } from '../../../../common/logger';
import { getRedisClient } from '../../../../config/redis';
import { JwtTokenService } from '../../../auth/infrastructure/services/JwtTokenService';
import { PresenceService } from '../../infrastructure/services/PresenceService';
import { MatchmakingService } from '../../infrastructure/services/MatchmakingService';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { MongooseUserRepository } from '../../../users/infrastructure/persistence/repositories/MongooseUserRepository';
import { ConversationRepository } from '../../../conversations/domain/repositories/ConversationRepository';
import { MongooseConversationRepository } from '../../../conversations/infrastructure/persistence/repositories/MongooseConversationRepository';
import { Conversation } from '../../../conversations/domain/entities/Conversation';
import { IModerationRepository } from '../../../moderation/domain/repositories/ModerationRepository';
import { MongooseModerationRepository } from '../../../moderation/infrastructure/persistence/repositories/MongooseModerationRepository';

export interface SocketServerOptions {
  tokenService?: JwtTokenService;
  presenceService?: PresenceService;
  matchmakingService?: MatchmakingService;
  userRepository?: UserRepository;
  conversationRepository?: ConversationRepository;
  moderationRepository?: IModerationRepository;
}

function parseCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

export class SocketServer {
  private io: SocketIOServer;
  private readonly tokenService: JwtTokenService;
  private readonly presenceService: PresenceService;
  private readonly matchmakingService: MatchmakingService;
  private readonly userRepository: UserRepository;
  private readonly conversationRepository: ConversationRepository;
  private readonly moderationRepository: IModerationRepository;
  private presenceInterval: NodeJS.Timeout | null = null;
  private redisSubscriber: Redis | null = null;
  private callDisconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(httpServer: HttpServer, options: SocketServerOptions = {}) {
    this.tokenService = options.tokenService ?? new JwtTokenService();
    this.presenceService = options.presenceService ?? new PresenceService();
    this.matchmakingService = options.matchmakingService ?? new MatchmakingService();
    this.userRepository = options.userRepository ?? new MongooseUserRepository();
    this.conversationRepository = options.conversationRepository ?? new MongooseConversationRepository();
    this.moderationRepository = options.moderationRepository ?? new MongooseModerationRepository();

    const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'test') {
            callback(null, true);
          } else {
            callback(new Error(`CORS origin not allowed: ${origin}`));
          }
        },
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    this.setupAuthMiddleware();
    this.setupMatchmakingNamespace();
    this.setupSignalingNamespace();
    this.setupMatchEventListener();
    this.startPresenceBroadcaster();
  }

  private setupAuthMiddleware(): void {
    const authMiddleware = (socket: Socket, next: (err?: Error) => void) => {
      try {
        const cookieToken = parseCookieValue(socket.handshake.headers?.cookie, 'dp_access_token');
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
          cookieToken;

        let userId: string | null = null;
        let role: string = 'USER';

        if (token) {
          try {
            const payload = this.tokenService.verifyAccessToken(token);
            if (payload.isBanned) {
              return next(new Error('ACCOUNT_BANNED'));
            }
            userId = payload.sub;
            role = payload.role;
          } catch {
            // Access token expired, check refresh token fallback below
          }
        }

        if (!userId) {
          const cookieRefreshToken = parseCookieValue(socket.handshake.headers?.cookie, 'dp_refresh_token');
          const refreshToken = (socket.handshake.auth?.refreshToken as string | undefined) || cookieRefreshToken;
          if (refreshToken) {
            try {
              const refreshPayload = this.tokenService.verifyRefreshToken(refreshToken);
              userId = refreshPayload.sub;
              role = 'USER';
            } catch {
              // Refresh token invalid
            }
          }
        }

        if (!userId) {
          // Allow anonymous socket for presence view, but tag as guest
          socket.data.isGuest = true;
          socket.data.userId = `guest_${socket.id.substring(0, 8)}`;
          return next();
        }

        socket.data.userId = userId;
        socket.data.role = role;
        socket.data.isGuest = false;
        next();
      } catch {
        // Fall back to guest connection
        socket.data.isGuest = true;
        socket.data.userId = `guest_${socket.id.substring(0, 8)}`;
        next();
      }
    };

    this.io.use(authMiddleware);
    this.io.of('/matchmaking').use(authMiddleware);
    this.io.of('/signaling').use(authMiddleware);
  }

  private async handleMatchFoundEvent(sessionId: string, userAId: string, userBId: string): Promise<void> {
    const nsp = this.io.of('/matchmaking');

    nsp.to(`user_${userAId}`).socketsJoin(`session_${sessionId}`);
    nsp.to(`user_${userBId}`).socketsJoin(`session_${sessionId}`);

    const [userA, userB] = await Promise.all([
      this.userRepository.findById(userAId),
      this.userRepository.findById(userBId),
    ]);

    // Notify User A with User B's profile (User A is initiator)
    nsp.to(`user_${userAId}`).emit('match_found', {
      sessionId,
      partnerId: userBId,
      isInitiator: true,
      partner: {
        id: userB?.id || userBId,
        username: userB?.username || 'Stranger',
        displayName: userB?.username || 'Stranger',
        avatarUrl: userB?.avatarUrl,
        age: userB?.age || 22,
        gender: userB?.gender || 'OTHER',
      },
      timeoutSeconds: 10,
    });

    // Notify User B with User A's profile (User B is callee)
    nsp.to(`user_${userBId}`).emit('match_found', {
      sessionId,
      partnerId: userAId,
      isInitiator: false,
      partner: {
        id: userA?.id || userAId,
        username: userA?.username || 'Stranger',
        displayName: userA?.username || 'Stranger',
        avatarUrl: userA?.avatarUrl,
        age: userA?.age || 22,
        gender: userA?.gender || 'OTHER',
      },
      timeoutSeconds: 10,
    });
  }

  private setupMatchEventListener(): void {
    // 1. Direct EventEmitter listener on matchmaking service
    this.matchmakingService.on('match_found', async (data: { sessionId: string; userA: string; userB: string }) => {
      try {
        await this.handleMatchFoundEvent(data.sessionId, data.userA, data.userB);
      } catch (err) {
        logger.error('Error in local match_found listener', { err });
      }
    });

    // 2. Redis Pub/Sub subscriber for cross-process/multi-worker matching notifications
    try {
      const client = getRedisClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.redisSubscriber = typeof client.duplicate === 'function' ? client.duplicate() : new (client.constructor as any)();
      if (this.redisSubscriber) {
        this.redisSubscriber.subscribe('match:events', (err) => {
          if (err) logger.error('Failed to subscribe to Redis match:events', { err });
        });

        this.redisSubscriber.on('message', async (channel: string, message: string) => {
          if (channel === 'match:events') {
            try {
              const data = JSON.parse(message);
              if (data.event === 'MATCH_FOUND' && data.sessionId && data.userA && data.userB) {
                await this.handleMatchFoundEvent(data.sessionId, data.userA, data.userB);
              }
            } catch (e) {
              logger.error('Error handling Redis match:events message', { e });
            }
          }
        });
      }
    } catch {
      // In SSR or mock environments without pub/sub support, local EventEmitter handles it
    }
  }

  private setupMatchmakingNamespace(): void {
    const nsp = this.io.of('/matchmaking');

    nsp.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      socket.join(`user_${userId}`);

      logger.info(`Socket connected to /matchmaking: socketId=${socket.id}, userId=${userId}`);

      // Record presence lease and broadcast update
      this.presenceService
        .recordHeartbeat(userId)
        .then(async () => {
          const count = await this.presenceService.getOnlineCount();
          this.io.emit('presence_update', { onlineCount: count });
          this.io.of('/matchmaking').emit('presence_update', { onlineCount: count });
        })
        .catch(() => {});

      // Sync active ringing direct call if user reloaded during ringing
      this.syncUserDirectCallState(socket, userId);

      // Check direct call status on demand
      socket.on('check_direct_call_status', async () => {
        await this.syncUserDirectCallState(socket, userId);
      });

      // Heartbeat ping
      socket.on('heartbeat_ping', async () => {
        await this.presenceService.recordHeartbeat(userId);
      });

      // Join Queue
      socket.on('join_queue', async (data: { filter?: 'ANY' | 'MALE' | 'FEMALE' }) => {
        try {
          if (socket.data.isGuest) {
            socket.emit('error', { code: 'UNAUTHORIZED', message: 'Authentication required to match' });
            return;
          }

          const filter = data?.filter || 'ANY';
          const user = await this.userRepository.findById(userId);
          const userGender = user?.gender || 'OTHER';
          const coinBalance = 100;

          const result = await this.matchmakingService.joinQueue(
            userId,
            filter,
            userGender,
            coinBalance
          );

          if (result.status === 'PAIRED' && result.sessionId && result.partnerId) {
            await this.handleMatchFoundEvent(result.sessionId, userId, result.partnerId);
          } else {
            socket.emit('queue_joined', {
              status: 'SEARCHING',
              queue: result.queue,
            });
          }
        } catch (error: unknown) {
          const errObj = error as Error & { code?: string };
          if (errObj?.code === 'ALREADY_IN_QUEUE' || errObj?.message?.includes('already searching')) {
            socket.emit('queue_joined', {
              status: 'SEARCHING',
              queue: `match:queue:${(data?.filter || 'ANY').toLowerCase()}`,
            });
            return;
          }
          socket.emit('error', {
            code: errObj.code || 'MATCHMAKING_ERROR',
            message: errObj.message || 'Failed to join queue',
          });
        }
      });

      // Leave Queue
      socket.on('leave_queue', async () => {
        try {
          if (!socket.data.isGuest) {
            await this.matchmakingService.leaveQueue(userId);
          }
          socket.emit('queue_left', { success: true });
        } catch (error) {
          logger.error(`Error leaving queue for user ${userId}`, { error });
        }
      });

      // Accept Match
      socket.on('accept_match', async (data: { sessionId: string }) => {
        try {
          const session = await this.matchmakingService.getCallSession(data.sessionId);
          if (session && (session.userA === userId || session.userB === userId)) {
            await this.matchmakingService.acceptMatch(data.sessionId, userId);
            nsp.to(`session_${data.sessionId}`).emit('match_accepted', {
              sessionId: data.sessionId,
              acceptedBy: userId,
            });
            if (session.userA) {
              nsp.to(`user_${session.userA}`).emit('call_ready', {
                sessionId: data.sessionId,
                isInitiator: true,
              });
            }
            if (session.userB) {
              nsp.to(`user_${session.userB}`).emit('call_ready', {
                sessionId: data.sessionId,
                isInitiator: false,
              });
            }
          }
        } catch (error) {
          logger.error(`Error accepting match ${data?.sessionId}`, { error });
        }
      });

      // Reject Match
      socket.on('reject_match', async (data: { sessionId: string }) => {
        try {
          const session = await this.matchmakingService.getCallSession(data.sessionId);
          if (session && (session.userA === userId || session.userB === userId)) {
            await this.matchmakingService.rejectMatch(data.sessionId, userId);
            const payload = {
              sessionId: data.sessionId,
              rejectedBy: userId,
              reason: 'REJECTED_BY_USER',
            };
            nsp.to(`session_${data.sessionId}`).emit('match_rejected', payload);
            if (session.userA) nsp.to(`user_${session.userA}`).emit('match_rejected', payload);
            if (session.userB) nsp.to(`user_${session.userB}`).emit('match_rejected', payload);
          }
        } catch (error) {
          logger.error(`Error rejecting match ${data?.sessionId}`, { error });
        }
      });

      // Cancel Match / Timeout
      socket.on('cancel_match', async (data: { sessionId: string }) => {
        try {
          const session = await this.matchmakingService.getCallSession(data.sessionId);
          if (session && (session.userA === userId || session.userB === userId)) {
            await this.matchmakingService.cancelMatch(data.sessionId, userId);
            const payload = {
              sessionId: data.sessionId,
              cancelledBy: userId,
              reason: 'TIMEOUT',
            };
            nsp.to(`session_${data.sessionId}`).emit('match_cancelled', payload);
            if (session.userA) nsp.to(`user_${session.userA}`).emit('match_cancelled', payload);
            if (session.userB) nsp.to(`user_${session.userB}`).emit('match_cancelled', payload);
          }
        } catch (error) {
          logger.error(`Error cancelling match ${data?.sessionId}`, { error });
        }
      });

      // Direct message between connections from Messages page
      socket.on('direct_message', async (data: { conversationId: string; partnerId: string; text: string }) => {
        try {
          if (!userId || !data?.partnerId || !data?.text) return;

          // Check if blocked
          const blockStatus = await this.moderationRepository.checkBlockStatus(userId, data.partnerId);
          if (blockStatus.isBlockedByA || blockStatus.isBlockedByB) {
            socket.emit('direct_message_error', {
              code: 'USER_BLOCKED',
              message: blockStatus.isBlockedByB ? 'User blocked you' : 'You have blocked this user',
            });
            return;
          }

          nsp.to(`user_${data.partnerId}`).emit('direct_message', {
            conversationId: data.conversationId,
            senderId: userId,
            text: data.text,
            timestamp: new Date().toISOString(),
          });

          // Ensure conversation is persisted and updated
          let conv = await this.conversationRepository.findByParticipants(userId, data.partnerId);
          if (!conv) {
            conv = Conversation.create(userId, data.partnerId, undefined, data.text, userId);
          } else {
            conv.recordNewCall(undefined, data.text, userId);
          }
          await this.conversationRepository.save(conv);
        } catch (error) {
          logger.error('Error handling direct_message', { error });
        }
      });

      // Mark messages as read by recipient
      socket.on('mark_messages_read', (data: { conversationId?: string; partnerId: string }) => {
        try {
          if (!userId || !data?.partnerId) return;
          nsp.to(`user_${data.partnerId}`).emit('messages_read', {
            conversationId: data.conversationId,
            readBy: userId,
          });
        } catch (error) {
          logger.error('Error handling mark_messages_read', { error });
        }
      });

      // Real-time block notifications
      socket.on('block_user', async (data: { targetUserId: string }) => {
        try {
          if (!userId || !data?.targetUserId) return;
          nsp.to(`user_${data.targetUserId}`).emit('user_blocked_you', {
            blockerId: userId,
          });
        } catch (error) {
          logger.error('Error handling block_user socket event', { error });
        }
      });

      socket.on('unblock_user', async (data: { targetUserId: string }) => {
        try {
          if (!userId || !data?.targetUserId) return;
          nsp.to(`user_${data.targetUserId}`).emit('user_unblocked_you', {
            unblockerId: userId,
          });
        } catch (error) {
          logger.error('Error handling unblock_user socket event', { error });
        }
      });

      // Direct Video Call: Initiate
      socket.on('initiate_direct_call', async (data: { conversationId?: string; partnerId: string }) => {
        try {
          if (!userId || socket.data.isGuest) {
            socket.emit('direct_call_error', {
              code: 'UNAUTHORIZED',
              message: 'Authentication required to start a video call',
            });
            return;
          }

          const partnerId = data?.partnerId;
          const conversationId = data?.conversationId;
          if (!partnerId) {
            socket.emit('direct_call_error', {
              code: 'INVALID_PARAMS',
              message: 'Partner ID is required',
            });
            return;
          }

          // Check if blocked
          const blockStatus = await this.moderationRepository.checkBlockStatus(userId, partnerId);
          if (blockStatus.isBlockedByA || blockStatus.isBlockedByB) {
            socket.emit('direct_call_error', {
              code: 'USER_BLOCKED',
              message: blockStatus.isBlockedByB ? 'User blocked you' : 'You have blocked this user',
            });
            return;
          }

          // 1. Check if caller is already in an active video call
          let callerActiveSession = await this.matchmakingService.getActiveSessionId(userId);
          if (callerActiveSession) {
            const signalingRoom = this.io.of('/signaling').adapter.rooms.get(`call_${callerActiveSession}`);
            const peerCount = signalingRoom ? signalingRoom.size : 0;
            if (peerCount <= 1) {
              try {
                await this.matchmakingService.endCallSession(callerActiveSession, userId, true);
              } catch {
                await this.matchmakingService.cancelDirectCallSession(callerActiveSession, userId, partnerId);
              }
              callerActiveSession = null;
            } else {
              socket.emit('direct_call_error', {
                code: 'USER_BUSY',
                message: 'You are already in an active video call',
              });
              return;
            }
          }

          // 2. Check if partner is already in an active video call
          let partnerActiveSession = await this.matchmakingService.getActiveSessionId(partnerId);
          if (partnerActiveSession) {
            const signalingRoom = this.io.of('/signaling').adapter.rooms.get(`call_${partnerActiveSession}`);
            const peerCount = signalingRoom ? signalingRoom.size : 0;
            if (peerCount <= 1) {
              try {
                await this.matchmakingService.endCallSession(partnerActiveSession, partnerId, true);
              } catch {
                await this.matchmakingService.cancelDirectCallSession(partnerActiveSession, userId, partnerId);
              }
              partnerActiveSession = null;
            } else {
              socket.emit('direct_call_error', {
                code: 'USER_BUSY',
                message: 'User is already on another call',
              });
              return;
            }
          }

          // 3. Check conversation permission if conversationId provided
          let conv = conversationId ? await this.conversationRepository.findById(conversationId) : null;
          if (!conv) {
            conv = await this.conversationRepository.findByParticipants(userId, partnerId);
          }

          if (conv && !conv.isVideoCallEnabledBy(partnerId)) {
            socket.emit('direct_call_error', {
              code: 'CALL_NOT_ALLOWED',
              message: 'User has not enabled video calls for this chat',
            });
            return;
          }

          // 4. Create direct call session
          const sessionData = await this.matchmakingService.createDirectCallSession(
            userId,
            partnerId,
            conv?.id || conversationId,
          );
          const sessionId = (sessionData.id as string) || `call_direct_${Date.now()}`;

          // Join sockets to session room
          socket.join(`session_${sessionId}`);
          nsp.to(`user_${partnerId}`).socketsJoin(`session_${sessionId}`);

          // Fetch caller and partner user profiles
          const [callerUser, partnerUser] = await Promise.all([
            this.userRepository.findById(userId),
            this.userRepository.findById(partnerId),
          ]);

          const callerProfile = {
            id: callerUser?.id || userId,
            username: callerUser?.username || 'Stranger',
            displayName: callerUser?.username || 'Stranger',
            avatarUrl: callerUser?.avatarUrl,
            age: callerUser?.age || 20,
            gender: callerUser?.gender || 'OTHER',
          };

          const partnerProfile = {
            id: partnerUser?.id || partnerId,
            username: partnerUser?.username || 'Stranger',
            displayName: partnerUser?.username || 'Stranger',
            avatarUrl: partnerUser?.avatarUrl,
            age: partnerUser?.age || 20,
            gender: partnerUser?.gender || 'OTHER',
          };

          // Ring the partner
          nsp.to(`user_${partnerId}`).emit('incoming_direct_call', {
            sessionId,
            conversationId: conv?.id || conversationId,
            caller: callerProfile,
          });

          // Inform caller that ringing has started
          socket.emit('outgoing_direct_call_started', {
            sessionId,
            conversationId: conv?.id || conversationId,
            partner: partnerProfile,
          });
        } catch (error: unknown) {
          logger.error('Error initiating direct call', { error });
          socket.emit('direct_call_error', {
            code: 'DIRECT_CALL_FAILED',
            message: (error as Error)?.message || 'Failed to initiate video call',
          });
        }
      });

      // Direct Video Call: Accept
      socket.on('accept_direct_call', async (data: { sessionId: string; callerId: string; conversationId?: string }) => {
        try {
          const { sessionId, callerId } = data;
          if (!sessionId || !callerId) return;

          // Check if session exists or already ended
          const session = await this.matchmakingService.getCallSession(sessionId);
          if (!session) {
            socket.emit('direct_call_error', {
              code: 'CALL_NOT_FOUND',
              message: 'Call has expired or was cancelled',
            });
            return;
          }

          // Activate direct call session in Redis
          await this.matchmakingService.activateDirectCallSession(sessionId, callerId, userId);

          const [callerUser, calleeUser] = await Promise.all([
            this.userRepository.findById(callerId),
            this.userRepository.findById(userId),
          ]);

          const callerPartner = {
            id: calleeUser?.id || userId,
            name: calleeUser?.displayName || calleeUser?.username || 'Stranger',
            avatar: calleeUser?.avatarUrl || '',
            age: calleeUser?.age || 20,
            gender: calleeUser?.gender || 'OTHER',
            country: 'Global',
            countryFlag: '🌐',
            interests: ['Social'],
            status: 'Direct call connected',
            distanceKm: 0,
          };

          const calleePartner = {
            id: callerUser?.id || callerId,
            name: callerUser?.displayName || callerUser?.username || 'Stranger',
            avatar: callerUser?.avatarUrl || '',
            age: callerUser?.age || 20,
            gender: callerUser?.gender || 'OTHER',
            country: 'Global',
            countryFlag: '🌐',
            interests: ['Social'],
            status: 'Direct call connected',
            distanceKm: 0,
          };

          // Notify caller (initiator in WebRTC)
          nsp.to(`user_${callerId}`).emit('direct_call_connected', {
            sessionId,
            isInitiator: true,
            partner: callerPartner,
          });

          // Notify callee (receiver in WebRTC)
          nsp.to(`user_${userId}`).emit('direct_call_connected', {
            sessionId,
            isInitiator: false,
            partner: calleePartner,
          });
        } catch (error) {
          logger.error('Error accepting direct call', { error });
        }
      });

      // Direct Video Call: Reject
      socket.on('reject_direct_call', async (data: { sessionId: string; callerId: string }) => {
        try {
          const { sessionId, callerId } = data;
          if (!sessionId) return;

          await this.matchmakingService.cancelDirectCallSession(sessionId, callerId, userId);

          if (callerId) {
            nsp.to(`user_${callerId}`).emit('direct_call_rejected', {
              sessionId,
              rejectedBy: userId,
              message: 'You are rejected',
            });
          }
          nsp.to(`session_${sessionId}`).emit('direct_call_rejected', {
            sessionId,
            rejectedBy: userId,
            message: 'You are rejected',
          });

          socket.emit('direct_call_ended', { sessionId });
        } catch (error) {
          logger.error('Error rejecting direct call', { error });
        }
      });

      // Direct Video Call: Cancel (caller hangs up while ringing)
      socket.on('cancel_direct_call', async (data: { sessionId: string; partnerId: string }) => {
        try {
          const { sessionId, partnerId } = data;
          if (!sessionId) return;

          await this.matchmakingService.cancelDirectCallSession(sessionId, userId, partnerId);

          if (partnerId) {
            nsp.to(`user_${partnerId}`).emit('direct_call_cancelled', {
              sessionId,
              cancelledBy: userId,
              message: 'Call was cancelled by the caller',
            });
          }
          nsp.to(`session_${sessionId}`).emit('direct_call_cancelled', {
            sessionId,
            cancelledBy: userId,
            message: 'Call was cancelled by the caller',
          });

          socket.emit('direct_call_ended', { sessionId });
        } catch (error) {
          logger.error('Error cancelling direct call', { error });
        }
      });

      // Online status check for conversation partners
      socket.on('check_online_status', async (data: { userIds: string[] }, callback?: (res: Record<string, boolean>) => void) => {
        try {
          const uids = data?.userIds || [];
          const statusMap: Record<string, boolean> = {};
          for (const uid of uids) {
            statusMap[uid] = await this.presenceService.isUserOnline(uid);
          }
          if (typeof callback === 'function') {
            callback(statusMap);
          } else {
            socket.emit('online_status_result', statusMap);
          }
        } catch (err) {
          logger.warn('Error checking online status', { err });
        }
      });

      // Direct message reaction
      socket.on('direct_message_reaction', (data: { conversationId: string; partnerId: string; messageId: string; reaction: string }) => {
        try {
          if (data?.partnerId) {
            nsp.to(`user_${data.partnerId}`).emit('direct_message_reaction', {
              conversationId: data.conversationId,
              messageId: data.messageId,
              reaction: data.reaction,
              senderId: userId,
            });
          }
        } catch (err) {
          logger.warn('Error relaying message reaction', { err });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        logger.info(`Socket disconnected from /matchmaking: socketId=${socket.id}, userId=${userId}`);
        if (!socket.data.isGuest) {
          await this.matchmakingService.leaveQueue(userId);
        }
        try {
          await this.presenceService.removeHeartbeat(userId);
          const count = await this.presenceService.getOnlineCount();
          this.io.emit('presence_update', { onlineCount: count });
          this.io.of('/matchmaking').emit('presence_update', { onlineCount: count });
        } catch {
          // Silent cleanup failure
        }
      });
    });
  }

  private setupSignalingNamespace(): void {
    const nsp = this.io.of('/signaling');

    nsp.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      if (userId) {
        socket.join(`user_${userId}`);
      }

      socket.on('join_call', async (data: { sessionId: string }) => {
        try {
          const session = await this.matchmakingService.getCallSession(data.sessionId);
          if (session && (session.status === 'ENDED' || session.status === 'CANCELLED' || session.status === 'REJECTED')) {
            socket.emit('peer_left', { sessionId: data.sessionId, reason: 'Call session has ended' });
            return;
          }

          const roomName = `call_${data.sessionId}`;
          const existingRoom = nsp.adapter.rooms.get(roomName);
          const hasExistingPeers = Boolean(existingRoom && existingRoom.size > 0);

          // Clear any pending disconnect grace-period timer for this user/session
          const timerKey = `${data.sessionId}_${userId}`;
          const pendingTimer = this.callDisconnectTimers.get(timerKey);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            this.callDisconnectTimers.delete(timerKey);
            logger.info(`Cleared disconnect timer for user ${userId} on session ${data.sessionId} (reconnected)`);
            socket.to(roomName).emit('peer_reconnected', {
              sessionId: data.sessionId,
              userId,
            });
          }

          socket.join(roomName);
          logger.info(`User ${userId} joined call room ${roomName}`);

          // Notify existing peer(s) in room that a new peer joined (if not already handled via peer_reconnected)
          if (!pendingTimer) {
            socket.to(roomName).emit('peer_joined', {
              sessionId: data.sessionId,
              userId,
            });
          }

          // If another peer was already in the room waiting, notify this joining socket too
          if (hasExistingPeers) {
            socket.emit('peer_joined', {
              sessionId: data.sessionId,
              isExistingPeer: true,
            });
          }
        } catch (err) {
          logger.warn('Error in join_call handler', { err });
        }
      });

      // WebRTC SDP Offer relay
      socket.on('webrtc_offer', (data: { sessionId: string; sdp: unknown }) => {
        socket.to(`call_${data.sessionId}`).emit('webrtc_offer', {
          sessionId: data.sessionId,
          sdp: data.sdp,
        });
      });

      // WebRTC SDP Answer relay
      socket.on('webrtc_answer', (data: { sessionId: string; sdp: unknown }) => {
        socket.to(`call_${data.sessionId}`).emit('webrtc_answer', {
          sessionId: data.sessionId,
          sdp: data.sdp,
        });
      });

      // ICE Candidate relay
      socket.on('ice_candidate', (data: { sessionId: string; candidate: unknown }) => {
        socket.to(`call_${data.sessionId}`).emit('ice_candidate', {
          sessionId: data.sessionId,
          candidate: data.candidate,
        });
      });

      // In-call ephemeral message relay and ensure conversation added to message page
      socket.on('in_call_message', async (data: { sessionId: string; text: string; partnerId?: string }) => {
        socket.to(`call_${data.sessionId}`).emit('in_call_message', {
          sessionId: data.sessionId,
          senderId: userId,
          text: data.text,
          timestamp: new Date().toISOString(),
        });

        if (data.partnerId) {
          socket.to(`user_${data.partnerId}`).emit('in_call_message', {
            sessionId: data.sessionId,
            senderId: userId,
            text: data.text,
            timestamp: new Date().toISOString(),
          });
        }

        // Add each user to their message page
        try {
          const sessionData = await this.matchmakingService.getCallSession(data.sessionId);
          let userAId: string | undefined;
          let userBId: string | undefined;

          if (sessionData && sessionData.userA && sessionData.userB) {
            userAId = String(sessionData.userA);
            userBId = String(sessionData.userB);
          } else if (userId && data.partnerId) {
            userAId = userId;
            userBId = data.partnerId;
          }

          if (userAId && userBId) {
            let conv = await this.conversationRepository.findByParticipants(userAId, userBId);
            if (!conv) {
              conv = Conversation.create(userAId, userBId, data.sessionId, data.text, userId);
            } else {
              conv.recordNewCall(data.sessionId, data.text, userId);
            }
            await this.conversationRepository.save(conv);

            // Notify both users so message page syncs immediately
            this.io.of('/matchmaking').to(`user_${userAId}`).emit('conversation_updated', {
              conversationId: conv.id,
              partnerId: userBId,
              lastMessageText: data.text,
            });
            this.io.of('/matchmaking').to(`user_${userBId}`).emit('conversation_updated', {
              conversationId: conv.id,
              partnerId: userAId,
              lastMessageText: data.text,
            });
          }
        } catch (err) {
          logger.warn('Failed to ensure conversation on in_call_message', { err });
        }
      });

      // Leave Call
      socket.on('leave_call', async (data: { sessionId: string }) => {
        const timerKey = `${data.sessionId}_${userId}`;
        const pendingTimer = this.callDisconnectTimers.get(timerKey);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          this.callDisconnectTimers.delete(timerKey);
        }
        try {
          await this.matchmakingService.endCallSession(data.sessionId, userId, true);
        } catch {
          // Proceed with notification regardless
        }
        socket.to(`call_${data.sessionId}`).emit('peer_left', {
          sessionId: data.sessionId,
          reason: 'Peer disconnected',
        });
        socket.leave(`call_${data.sessionId}`);
      });

      socket.on('disconnect', async () => {
        logger.info(`Socket disconnected from /signaling: socketId=${socket.id}, userId=${userId}`);
        if (userId) {
          try {
            const activeSessionId = await this.matchmakingService.getActiveSessionId(userId);
            if (activeSessionId) {
              const timerKey = `${activeSessionId}_${userId}`;
              const existingTimer = this.callDisconnectTimers.get(timerKey);
              if (existingTimer) {
                clearTimeout(existingTimer);
              }

              // Notify remaining peer that partner is temporarily reconnecting
              socket.to(`call_${activeSessionId}`).emit('peer_reconnecting', {
                sessionId: activeSessionId,
                userId,
              });

              // 15-second grace period for page reloads / network reconnection
              const timer = setTimeout(async () => {
                this.callDisconnectTimers.delete(timerKey);
                try {
                  await this.matchmakingService.endCallSession(activeSessionId, userId, true);
                  nsp.to(`call_${activeSessionId}`).emit('peer_left', {
                    sessionId: activeSessionId,
                    reason: 'Peer disconnected',
                  });
                  this.io.of('/matchmaking').to(`session_${activeSessionId}`).emit('direct_call_ended', {
                    sessionId: activeSessionId,
                  });
                } catch {
                  // Ignored
                }
              }, 15000);
              this.callDisconnectTimers.set(timerKey, timer);
            }
          } catch {
            // Ignored
          }
        }
      });
    });
  }

  private async syncUserDirectCallState(socket: Socket, userId: string): Promise<void> {
    try {
      if (!userId || socket.data.isGuest) return;
      const session = await this.matchmakingService.getRingingDirectCallSession(userId);
      if (!session) {
        socket.emit('direct_call_cleared');
        return;
      }

      const sessionId = session.id as string;
      socket.join(`session_${sessionId}`);
      const userAId = String(session.userA);
      const userBId = String(session.userB);
      const conversationId = (session.conversationId as string) || undefined;

      if (userId === userAId) {
        const partnerUser = await this.userRepository.findById(userBId);
        socket.emit('outgoing_direct_call_started', {
          sessionId,
          conversationId,
          partner: {
            id: partnerUser?.id || userBId,
            username: partnerUser?.username || 'Stranger',
            displayName: partnerUser?.username || 'Stranger',
            avatarUrl: partnerUser?.avatarUrl,
            age: partnerUser?.age || 20,
            gender: partnerUser?.gender || 'OTHER',
          },
        });
      } else if (userId === userBId) {
        const callerUser = await this.userRepository.findById(userAId);
        socket.emit('incoming_direct_call', {
          sessionId,
          conversationId,
          caller: {
            id: callerUser?.id || userAId,
            username: callerUser?.username || 'Stranger',
            displayName: callerUser?.username || 'Stranger',
            avatarUrl: callerUser?.avatarUrl,
            age: callerUser?.age || 20,
            gender: callerUser?.gender || 'OTHER',
          },
        });
      }
    } catch (err) {
      logger.warn('Error syncing direct call state on connection', { err });
    }
  }

  private startPresenceBroadcaster(): void {
    // Broadcast active presence count every 15 seconds
    this.presenceInterval = setInterval(async () => {
      try {
        await this.presenceService.sweepInactive();
        const count = await this.presenceService.getOnlineCount();
        this.io.emit('presence_update', { onlineCount: count });
        this.io.of('/matchmaking').emit('presence_update', { onlineCount: count });
      } catch (error) {
        logger.error('Failed to broadcast presence update', { error });
      }
    }, 15000);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public close(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    if (this.redisSubscriber) {
      try {
        this.redisSubscriber.disconnect();
      } catch {
        // Ignored
      }
      this.redisSubscriber = null;
    }
    for (const timer of this.callDisconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.callDisconnectTimers.clear();
    this.io.close();
  }
}
