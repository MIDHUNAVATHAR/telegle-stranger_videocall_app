'use client';

import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { IconLock } from '../../../shared/components/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [blurPreview, setBlurPreview] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hdVideo, setHdVideo] = useState(true);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings & Safety">
      <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
        {/* Safety Section */}
        <div>
          <h3
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Safety & Moderation
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
                  Auto-Blur Strangers
                </strong>
                <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                  Blurs incoming camera feed until you tap to reveal
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
                    backgroundColor: blurPreview ? 'var(--accent-ink)' : 'var(--ink-secondary)',
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

        {/* Media Section */}
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
                  Enable highest fidelity streaming
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
                    backgroundColor: hdVideo ? 'var(--accent-ink)' : 'var(--ink-secondary)',
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
                  Connect chimes & gift audio
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
                    backgroundColor: soundEnabled ? 'var(--accent-ink)' : 'var(--ink-secondary)',
                    transition: 'left var(--t-quick) ease',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        <Button variant="secondary" size="md" fullWidth onClick={onClose}>
          Save & Close
        </Button>
      </div>
    </Modal>
  );
};
