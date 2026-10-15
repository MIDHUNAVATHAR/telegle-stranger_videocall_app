'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../../matching/services/socketClient';
import { matchingApi } from '../../matching/apis/matchingApi';

// Strict Architectural Invariant: STUN-only, NO TURN server configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export interface UseWebRTCOptions {
  sessionId?: string;
  isInitiator?: boolean;
  onCallEnded?: () => void;
}

export function useWebRTC({ sessionId, isInitiator = false, onCallEnded }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [lockCountdown, setLockCountdown] = useState<number>(10);
  const [isBlurred, setIsBlurred] = useState<boolean>(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  // 1. Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current && localStreamRef.current.active) {
      return localStreamRef.current;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      }
    } catch (err) {
      console.warn('Unable to access camera or microphone:', err);
    }
    return null;
  }, []);

  // 2. 10-Second Countdown Lock Timer
  useEffect(() => {
    if (!sessionId) return;
    setLockCountdown(10);

    const interval = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // 3. WebRTC Peer Connection & Signaling Setup
  useEffect(() => {
    if (!sessionId) return;

    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
    } catch {
      return;
    }

    const signalingSocket = socketService.getSignalingSocket();
    signalingSocket.emit('join_call', { sessionId });

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream((prev) => {
          if (prev?.id === event.streams[0].id) return prev;
          return event.streams[0];
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingSocket.emit('ice_candidate', {
          sessionId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        onCallEndedRef.current?.();
      }
    };

    // Socket signaling listeners
    signalingSocket.on('webrtc_offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingSocket.emit('webrtc_answer', { sessionId, sdp: answer });
      } catch (e) {
        console.error('Error handling WebRTC offer:', e);
      }
    });

    signalingSocket.on('webrtc_answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch (e) {
        console.error('Error handling WebRTC answer:', e);
      }
    });

    signalingSocket.on('ice_candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    });

    signalingSocket.on('peer_left', () => {
      onCallEndedRef.current?.();
    });

    // Start local tracks and initiate call if caller
    initLocalStream().then((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            signalingSocket.emit('webrtc_offer', {
              sessionId,
              sdp: pc.localDescription,
            });
          })
          .catch((err) => console.error('Error creating offer:', err));
      }
    });

    return () => {
      signalingSocket.off('webrtc_offer');
      signalingSocket.off('webrtc_answer');
      signalingSocket.off('ice_candidate');
      signalingSocket.off('peer_left');

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      pc.close();
      pcRef.current = null;
    };
  }, [sessionId, isInitiator, initLocalStream]);

  // Controls
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  const unblurRemote = () => {
    setIsBlurred(false);
  };

  const endCall = async (emergencyReport = false) => {
    if (sessionId) {
      try {
        await matchingApi.endCallSession(sessionId, emergencyReport);
      } catch (e) {
        console.warn('Failed to end call session on server:', e);
      }
      const signalingSocket = socketService.getSignalingSocket();
      signalingSocket.emit('leave_call', { sessionId });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    pcRef.current?.close();
    pcRef.current = null;
    onCallEnded?.();
  };

  return {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isBlurred,
    lockCountdown,
    connectionState,
    toggleMute,
    toggleVideo,
    unblurRemote,
    endCall,
  };
}
