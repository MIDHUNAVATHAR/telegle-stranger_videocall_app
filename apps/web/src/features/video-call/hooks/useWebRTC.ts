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

function isPcClosed(pc: RTCPeerConnection | null | undefined): boolean {
  if (!pc) return true;
  return (pc.signalingState as string) === 'closed';
}

export interface UseWebRTCOptions {
  sessionId?: string;
  isInitiator?: boolean;
  onCallEnded?: (reason?: string) => void;
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
  const mediaStreamPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  // 1. Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current && localStreamRef.current.active) {
      return localStreamRef.current;
    }
    if (mediaStreamPromiseRef.current) {
      return mediaStreamPromiseRef.current;
    }

    const promise = (async () => {
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
      } finally {
        mediaStreamPromiseRef.current = null;
      }
      return null;
    })();

    mediaStreamPromiseRef.current = promise;
    return promise;
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

    let isCancelled = false;
    let isMakingOffer = false;
    let failTimeout: NodeJS.Timeout | null = null;
    const pendingCandidates: RTCIceCandidateInit[] = [];

    const flushCandidates = async (targetPc: RTCPeerConnection) => {
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift();
        if (candidate && !isCancelled && !isPcClosed(targetPc)) {
          try {
            await targetPc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('Error applying pending ICE candidate:', e);
          }
        }
      }
    };

    const attachTracks = (targetPc: RTCPeerConnection, stream: MediaStream) => {
      if (isCancelled || isPcClosed(targetPc)) return;
      const senders = targetPc.getSenders();
      const existingTrackIds = new Set(senders.map((s) => s.track?.id).filter(Boolean));

      // Deterministic order: audio first, video second (locks SDP m-line order to audio, then video)
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(audioTrack).catch((err) => {
            console.warn('Unable to replace audio track:', err);
          });
        } else if (!existingTrackIds.has(audioTrack.id)) {
          try {
            targetPc.addTrack(audioTrack, stream);
          } catch (err) {
            console.warn('Unable to add audio track:', err);
          }
        }
      }

      if (videoTrack) {
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack).catch((err) => {
            console.warn('Unable to replace video track:', err);
          });
        } else if (!existingTrackIds.has(videoTrack.id)) {
          try {
            targetPc.addTrack(videoTrack, stream);
          } catch (err) {
            console.warn('Unable to add video track:', err);
          }
        }
      }
    };

    const signalingSocket = socketService.getSignalingSocket();

    const createPeerConnection = (): RTCPeerConnection => {
      if (pcRef.current && !isPcClosed(pcRef.current)) {
        try {
          pcRef.current.close();
        } catch {
          // ignore
        }
      }

      // Reset pending candidates for the fresh PC
      pendingCandidates.length = 0;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Handle remote tracks with guaranteed fresh MediaStream references
      pc.ontrack = (event) => {
        if (isCancelled || isPcClosed(pc)) return;

        if (event.streams && event.streams[0]) {
          const incomingStream = event.streams[0];
          setRemoteStream(incomingStream);

          incomingStream.onaddtrack = () => {
            if (!isCancelled) {
              setRemoteStream(new MediaStream(incomingStream.getTracks()));
            }
          };
        } else if (event.track) {
          setRemoteStream((prev) => {
            const tracks = prev ? prev.getTracks() : [];
            if (tracks.some((t) => t.id === event.track.id)) {
              return prev;
            }
            return new MediaStream([...tracks, event.track]);
          });
        }

        event.track.onunmute = () => {
          if (!isCancelled) {
            setRemoteStream((prev) => {
              if (prev) return new MediaStream(prev.getTracks());
              if (event.streams && event.streams[0]) return event.streams[0];
              return new MediaStream([event.track]);
            });
          }
        };
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (isCancelled || isPcClosed(pc)) return;
        if (event.candidate) {
          signalingSocket.emit('ice_candidate', {
            sessionId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (isCancelled) return;
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'failed') {
          if (!failTimeout) {
            failTimeout = setTimeout(() => {
              if (!isCancelled && pc.connectionState === 'failed') {
                onCallEndedRef.current?.('CONNECTION_FAILED');
              }
            }, 15000);
          }
        } else if (pc.connectionState === 'connected' && failTimeout) {
          clearTimeout(failTimeout);
          failTimeout = null;
        }
      };

      if (localStreamRef.current && localStreamRef.current.active) {
        attachTracks(pc, localStreamRef.current);
      }

      return pc;
    };

    // Initialize first peer connection
    createPeerConnection();

    const makeOffer = async () => {
      if (!isInitiator || isCancelled || isMakingOffer) return;
      let currentPc = pcRef.current;
      if (!currentPc || isPcClosed(currentPc)) {
        currentPc = createPeerConnection();
      }

      isMakingOffer = true;
      try {
        const stream = await initLocalStream();
        if (stream && currentPc && !isPcClosed(currentPc)) {
          attachTracks(currentPc, stream);
        }
        if (isCancelled || isPcClosed(currentPc)) return;

        if (currentPc.signalingState !== 'stable') {
          try {
            await currentPc.setLocalDescription({ type: 'rollback' });
          } catch {
            currentPc = createPeerConnection();
            if (stream) {
              attachTracks(currentPc, stream);
            }
          }
        }

        const shouldRestartIce = Boolean(currentPc.remoteDescription);
        const offer = await currentPc.createOffer(shouldRestartIce ? { iceRestart: true } : undefined);
        if (isCancelled || isPcClosed(currentPc)) return;

        await currentPc.setLocalDescription(offer);
        if (isCancelled || isPcClosed(currentPc) || !currentPc.localDescription) return;

        signalingSocket.emit('webrtc_offer', {
          sessionId,
          sdp: currentPc.localDescription,
        });
      } catch (err) {
        if (!isCancelled && currentPc && !isPcClosed(currentPc)) {
          console.error('Error creating WebRTC offer:', err);
        }
      } finally {
        isMakingOffer = false;
      }
    };

    // Emit join_call and re-emit if socket reconnects
    const emitJoinCall = () => {
      signalingSocket.emit('join_call', { sessionId });
    };
    emitJoinCall();
    signalingSocket.on('connect', emitJoinCall);

    // Socket signaling listeners
    signalingSocket.on('webrtc_offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      try {
        if (isCancelled) return;

        let currentPc = pcRef.current;
        if (!currentPc || isPcClosed(currentPc) || currentPc.connectionState === 'disconnected' || currentPc.connectionState === 'failed') {
          currentPc = createPeerConnection();
        }

        const stream = await initLocalStream();
        if (stream) {
          attachTracks(currentPc, stream);
        }
        if (isCancelled || isPcClosed(currentPc)) return;

        try {
          if (currentPc.signalingState !== 'stable') {
            await currentPc.setLocalDescription({ type: 'rollback' });
          }
          await currentPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (setRemoteErr) {
          // If remote fingerprint changed or state is invalid (caller reloaded), recreate fresh PC!
          console.info('Recreating RTCPeerConnection to apply new remote offer after reload...', setRemoteErr);
          currentPc = createPeerConnection();
          if (stream) {
            attachTracks(currentPc, stream);
          }
          await currentPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }

        await flushCandidates(currentPc);
        if (isCancelled || isPcClosed(currentPc)) return;

        const answer = await currentPc.createAnswer();
        if (isCancelled || isPcClosed(currentPc)) return;

        await currentPc.setLocalDescription(answer);
        if (isCancelled || isPcClosed(currentPc) || !currentPc.localDescription) return;

        signalingSocket.emit('webrtc_answer', {
          sessionId,
          sdp: currentPc.localDescription,
        });
      } catch (e) {
        if (!isCancelled) {
          console.error('Error handling WebRTC offer:', e);
        }
      }
    });

    signalingSocket.on('webrtc_answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      try {
        const currentPc = pcRef.current;
        if (isCancelled || !currentPc || isPcClosed(currentPc)) return;
        if (currentPc.signalingState !== 'have-local-offer') return;

        await currentPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushCandidates(currentPc);
      } catch (e) {
        if (!isCancelled) {
          console.error('Error handling WebRTC answer:', e);
        }
      }
    });

    const handlePeerRejoin = () => {
      if (isCancelled) return;
      if (isInitiator) {
        makeOffer();
      }
    };

    signalingSocket.on('peer_joined', handlePeerRejoin);
    signalingSocket.on('peer_reconnected', handlePeerRejoin);

    signalingSocket.on('ice_candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        const currentPc = pcRef.current;
        if (isCancelled || !currentPc || isPcClosed(currentPc)) return;
        if (currentPc.remoteDescription && currentPc.remoteDescription.type) {
          await currentPc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingCandidates.push(data.candidate);
        }
      } catch (e) {
        if (!isCancelled) {
          console.warn('Error adding ICE candidate:', e);
        }
      }
    });

    signalingSocket.on('peer_left', (data?: { reason?: string }) => {
      if (!isCancelled) {
        onCallEndedRef.current?.(data?.reason || 'PEER_LEFT');
      }
    });

    // Start local tracks and attach to connection
    initLocalStream()
      .then((stream) => {
        if (isCancelled) return;
        const currentPc = pcRef.current;
        if (stream && currentPc && !isPcClosed(currentPc)) {
          attachTracks(currentPc, stream);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Error in initLocalStream during call setup:', err);
        }
      });

    // Fallback safety timer: if initiator joined after peer was already in the room
    const fallbackTimer = setTimeout(() => {
      if (isInitiator && !isCancelled && pcRef.current && !isPcClosed(pcRef.current) && pcRef.current.signalingState === 'stable') {
        makeOffer();
      }
    }, 1500);

    return () => {
      isCancelled = true;
      clearTimeout(fallbackTimer);
      if (failTimeout) {
        clearTimeout(failTimeout);
      }
      signalingSocket.off('connect', emitJoinCall);
      signalingSocket.off('webrtc_offer');
      signalingSocket.off('webrtc_answer');
      signalingSocket.off('peer_joined', handlePeerRejoin);
      signalingSocket.off('peer_reconnected', handlePeerRejoin);
      signalingSocket.off('ice_candidate');
      signalingSocket.off('peer_left');

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (pcRef.current && !isPcClosed(pcRef.current)) {
        try {
          pcRef.current.close();
        } catch {
          // ignore
        }
      }
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
      localStreamRef.current = null;
    }
    if (!isPcClosed(pcRef.current)) {
      try {
        pcRef.current?.close();
      } catch {
        // ignore
      }
    }
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
