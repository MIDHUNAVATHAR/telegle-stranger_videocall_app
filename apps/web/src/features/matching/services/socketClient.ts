import { io, Socket } from 'socket.io-client';
import { getClientAccessToken } from '../../../shared/api/client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private matchmakingSocket: Socket | null = null;
  private signalingSocket: Socket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public getMatchmakingSocket(token?: string): Socket {
    const activeToken = token || getClientAccessToken() || undefined;

    if (!this.matchmakingSocket) {
      this.matchmakingSocket = io(`${SOCKET_URL}/matchmaking`, {
        auth: { token: activeToken },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.startHeartbeat();
    } else {
      const currentToken = (this.matchmakingSocket.auth as { token?: string })?.token;
      if (activeToken !== currentToken) {
        this.matchmakingSocket.auth = { token: activeToken };
        if (!this.matchmakingSocket.connected) {
          this.matchmakingSocket.connect();
        }
      }
    }
    return this.matchmakingSocket;
  }

  public getSignalingSocket(token?: string): Socket {
    const activeToken = token || getClientAccessToken() || undefined;

    if (!this.signalingSocket) {
      this.signalingSocket = io(`${SOCKET_URL}/signaling`, {
        auth: { token: activeToken },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
    } else {
      const currentToken = (this.signalingSocket.auth as { token?: string })?.token;
      if (activeToken !== currentToken) {
        this.signalingSocket.auth = { token: activeToken };
        if (!this.signalingSocket.connected) {
          this.signalingSocket.connect();
        }
      }
    }
    return this.signalingSocket;
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.matchmakingSocket?.connected) {
        this.matchmakingSocket.emit('heartbeat_ping');
      }
    }, 25000);
  }

  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.matchmakingSocket?.disconnect();
    this.signalingSocket?.disconnect();
    this.matchmakingSocket = null;
    this.signalingSocket = null;
  }
}

export const socketService = new SocketService();
