'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { IconLock, IconShield } from '../../../shared/components/Icons';
import { profileApi } from '../../profile/apis/profileApi';
import { useAuth } from '../../auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { logout, isAuthenticated } = useAuth();
  const [blurPreview, setBlurPreview] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [allowIncomingCalls, setAllowIncomingCalls] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      profileApi
        .getMyProfile()
        .then((data) => {
          if (data?.preferences) {
            setSoundEnabled(data.preferences.soundEnabled ?? true);
            setAllowIncomingCalls(data.preferences.allowIncomingCalls ?? true);
          }
        })
        .catch(() => {
          // Keep defaults
        });
    }
  }, [isOpen, isAuthenticated]);

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      if (isAuthenticated) {
        await profileApi.updatePreferences({
          sound_enabled: soundEnabled,
          allow_incoming_calls: allowIncomingCalls,
        });
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings & Safety">
      <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
        {/* Community Safety & Legal Notice */}
        <div
          style={{
            backgroundColor: '#1f1510',
            border: '1px solid #FF5A1F',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
            <IconShield size={20} />
            <strong style={{ fontSize: 'var(--step-small)', textTransform: 'uppercase' }}>
              Safety & Community Standards
            </strong>
          </div>
          <ul
            style={{
              margin: '4px 0 0 16px',
              padding: 0,
              fontSize: '12px',
              color: 'var(--ink-secondary)',
              lineHeight: 1.5,
            }}
          >
            <li><strong>Strictly No Nudity:</strong> Zero tolerance for sexually explicit content or lewd behavior.</li>
            <li><strong>Respect Others:</strong> Harassment, hate speech, bullying, and recording peers is strictly forbidden.</li>
            <li><strong>18+ Adults Only:</strong> Community is restricted to adults aged 18 and older.</li>
          </ul>
        </div>

        {/* Safety & Privacy Section */}
        <div>
          <h3
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Safety & Privacy
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--surface-raised)',
              padding: 'var(--space-16)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
                  Auto-Blur Incoming Feeds
                </strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  Protects you by blurring video until you tap to reveal
                </span>
              </div>
              <button
                onClick={() => setBlurPreview(!blurPreview)}
                aria-label="Toggle auto-blur strangers"
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: blurPreview ? 'var(--accent)' : 'var(--surface)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--t-quick) ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: blurPreview ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: blurPreview ? '#fff' : 'var(--ink-secondary)',
                    transition: 'left var(--t-quick) ease',
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
                  Allow Direct Incoming Calls
                </strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  Allow matched connections to call you from messages inbox
                </span>
              </div>
              <button
                onClick={() => setAllowIncomingCalls(!allowIncomingCalls)}
                aria-label="Toggle direct incoming calls"
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: allowIncomingCalls ? 'var(--accent)' : 'var(--surface)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--t-quick) ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: allowIncomingCalls ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: allowIncomingCalls ? '#fff' : 'var(--ink-secondary)',
                    transition: 'left var(--t-quick) ease',
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
                  AI Inappropriate Content Guard
                </strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--success)' }}>
                  Active (Real-time stream shield)
                </span>
              </div>
              <IconLock size={20} color="var(--success)" />
            </div>
          </div>
        </div>

        {/* Media & Audio Section */}
        <div>
          <h3
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Media & Sound
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--surface-raised)',
              padding: 'var(--space-16)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
                  HD 1080p Video Call
                </strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  WebRTC P2P direct streaming
                </span>
              </div>
              <button
                onClick={() => setHdVideo(!hdVideo)}
                aria-label="Toggle HD video call"
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: hdVideo ? 'var(--accent)' : 'var(--surface)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--t-quick) ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: hdVideo ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: hdVideo ? '#fff' : 'var(--ink-secondary)',
                    transition: 'left var(--t-quick) ease',
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
                  Sound Effects
                </strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  Connect chimes & gift animations
                </span>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                aria-label="Toggle sound effects"
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: soundEnabled ? 'var(--accent)' : 'var(--surface)',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--t-quick) ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: soundEnabled ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: soundEnabled ? '#fff' : 'var(--ink-secondary)',
                    transition: 'left var(--t-quick) ease',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => {
              logout();
              onClose();
            }}
          >
            Sign Out of Telegle
          </Button>
        )}

        <Button variant="primary" size="md" fullWidth onClick={handleSaveAndClose} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save & Close'}
        </Button>
      </div>
    </Modal>
  );
};
