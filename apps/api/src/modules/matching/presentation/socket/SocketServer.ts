import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../../../../config/env';
import { logger } from '../../../../common/logger';
import { JwtTokenService } from '../../../auth/infrastructure/services/JwtTokenService';
import { PresenceService } from '../../infrastructure/services/PresenceService';
import { MatchmakingService } from '../../infrastructure/services/MatchmakingService';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { MongooseUserRepository } from '../../../users/infrastructure/persistence/repositories/MongooseUserRepository';

export interface SocketServerOptions {
  tokenService?: JwtTokenService;
  presenceService?: PresenceService;
  matchmakingService?: MatchmakingService;
  userRepository?: UserRepository;
}

export class SocketServer {
  private io: SocketIOServer;
  private readonly tokenService: JwtTokenService;
  private readonly presenceService: PresenceService;
  private readonly matchmakingService: MatchmakingService;
  private readonly userRepository: UserRepository;
  private presenceInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer, options: SocketServerOptions = {}) {
    this.tokenService = options.tokenService ?? new JwtTokenService();
    this.presenceService = options.presenceService ?? new PresenceService();
    this.matchmakingService = options.matchmakingService ?? new MatchmakingService();
    this.userRepository = options.userRepository ?? new MongooseUserRepository();

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
    this.startPresenceBroadcaster();
  }

  private setupAuthMiddleware(): void {
    const authMiddleware = (socket: Socket, next: (err?: Error) => void) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          // Allow anonymous socket for presence view, but tag as guest
          socket.data.isGuest = true;
          socket.data.userId = `guest_${socket.id.substring(0, 8)}`;
          return next();
        }

        const payload = this.tokenService.verifyAccessToken(token);
        if (payload.isBanned) {
          return next(new Error('ACCOUNT_BANNED'));
        }

        socket.data.userId = payload.sub;
        socket.data.role = payload.role;
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

  private setupMatchmakingNamespace(): void {
    const nsp = this.io.of('/matchmaking');

    nsp.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      socket.join(`user_${userId}`);

      logger.info(`Socket connected to /matchmaking: socketId=${socket.id}, userId=${userId}`);

      // Record presence lease
      if (!socket.data.isGuest) {
        this.presenceService.recordHeartbeat(userId);
      }

      // Heartbeat ping
      socket.on('heartbeat_ping', async () => {
        if (!socket.data.isGuest) {
          await this.presenceService.recordHeartbeat(userId);
        }
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
          const coinBalance = 100; // Wallet check will be linked in Phase 7

          const result = await this.matchmakingService.joinQueue(
            userId,
            filter,
            userGender,
            coinBalance
          );

          if (result.status === 'PAIRED' && result.sessionId && result.partnerId) {
            // Found a match! Join room and notify both users
            socket.join(`session_${result.sessionId}`);
            nsp.to(`user_${result.partnerId}`).socketsJoin(`session_${result.sessionId}`);

            const [userA, userB] = await Promise.all([
              this.userRepository.findById(userId),
              this.userRepository.findById(result.partnerId),
            ]);

            // Notify User A with User B's profile
            socket.emit('match_found', {
              sessionId: result.sessionId,
              partnerId: result.partnerId,
              partner: {
                id: userB?.id || result.partnerId,
                displayName: userB?.displayName || userB?.username || 'Stranger',
                avatarUrl: userB?.avatarUrl,
                age: userB?.age || 22,
                gender: userB?.gender || 'OTHER',
              },
              timeoutSeconds: 10,
            });

            // Notify User B with User A's profile
            nsp.to(`user_${result.partnerId}`).emit('match_found', {
              sessionId: result.sessionId,
              partnerId: userId,
              partner: {
                id: userA?.id || userId,
                displayName: userA?.displayName || userA?.username || 'Stranger',
                avatarUrl: userA?.avatarUrl,
                age: userA?.age || 22,
                gender: userA?.gender || 'OTHER',
              },
              timeoutSeconds: 10,
            });
          } else {
            socket.emit('queue_joined', {
              status: 'SEARCHING',
              queue: result.queue,
            });
          }
        } catch (error: unknown) {
          const errObj = error as Error & { code?: string };
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
          await this.matchmakingService.acceptMatch(data.sessionId, userId);
          nsp.to(`session_${data.sessionId}`).emit('match_accepted', {
            sessionId: data.sessionId,
            acceptedBy: userId,
          });
          nsp.to(`session_${data.sessionId}`).emit('call_ready', {
            sessionId: data.sessionId,
            isCaller: true,
          });
        } catch (error) {
          logger.error(`Error accepting match ${data?.sessionId}`, { error });
        }
      });

      // Reject Match
      socket.on('reject_match', async (data: { sessionId: string }) => {
        try {
          await this.matchmakingService.rejectMatch(data.sessionId, userId);
          nsp.to(`session_${data.sessionId}`).emit('match_rejected', {
            sessionId: data.sessionId,
            rejectedBy: userId,
            reason: 'REJECTED_BY_USER',
          });
        } catch (error) {
          logger.error(`Error rejecting match ${data?.sessionId}`, { error });
        }
      });

      // Cancel Match / Timeout
      socket.on('cancel_match', async (data: { sessionId: string }) => {
        try {
          await this.matchmakingService.cancelMatch(data.sessionId, userId);
          nsp.to(`session_${data.sessionId}`).emit('match_cancelled', {
            sessionId: data.sessionId,
            reason: 'TIMEOUT',
          });
        } catch (error) {
          logger.error(`Error cancelling match ${data?.sessionId}`, { error });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        logger.info(`Socket disconnected from /matchmaking: socketId=${socket.id}, userId=${userId}`);
        if (!socket.data.isGuest) {
          await this.matchmakingService.leaveQueue(userId);
        }
      });
    });
  }

  private setupSignalingNamespace(): void {
    const nsp = this.io.of('/signaling');

    nsp.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;

      socket.on('join_call', (data: { sessionId: string }) => {
        socket.join(`call_${data.sessionId}`);
        logger.info(`User ${userId} joined call room call_${data.sessionId}`);
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

      // In-call ephemeral message relay (STRICT REQUIREMENT: ephemeral, not saved to MongoDB)
      socket.on('in_call_message', (data: { sessionId: string; text: string }) => {
        socket.to(`call_${data.sessionId}`).emit('in_call_message', {
          sessionId: data.sessionId,
          senderId: userId,
          text: data.text,
          timestamp: new Date().toISOString(),
        });
      });

      // Leave Call
      socket.on('leave_call', async (data: { sessionId: string }) => {
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

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected from /signaling: socketId=${socket.id}, userId=${userId}`);
      });
    });
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
    this.io.close();
  }
}
