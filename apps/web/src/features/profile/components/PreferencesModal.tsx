'use client';

import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { profileApi, UserPreferences } from '../apis/profileApi';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreferences?: UserPreferences;
  onPreferencesUpdated: (updated: UserPreferences) => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  initialPreferences = {
    preferredGender: 'ANY',
    allowIncomingCalls: true,
    soundEnabled: true,
  },
  onPreferencesUpdated,
}) => {
  const [preferredGender, setPreferredGender] = useState<'ANY' | 'MALE' | 'FEMALE'>(
    initialPreferences.preferredGender || 'ANY'
  );
  const [allowIncomingCalls, setAllowIncomingCalls] = useState(
    initialPreferences.allowIncomingCalls ?? true
  );
  const [soundEnabled, setSoundEnabled] = useState(
    initialPreferences.soundEnabled ?? true
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await profileApi.updatePreferences({
        preferred_gender: preferredGender,
        allow_incoming_calls: allowIncomingCalls,
        sound_enabled: soundEnabled,
      });
      onPreferencesUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Failed to save preferences:', err);
      // Fallback local update
      onPreferencesUpdated({
        preferredGender,
        allowIncomingCalls,
        soundEnabled,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Matching & Call Preferences">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Match Gender Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Preferred Match Gender
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['ANY', 'MALE', 'FEMALE'] as const).map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => setPreferredGender(gender)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: preferredGender === gender ? '2px solid var(--accent)' : '1px solid #2a3042',
                  backgroundColor: preferredGender === gender ? 'rgba(255, 90, 31, 0.12)' : 'var(--surface-raised)',
                  color: preferredGender === gender ? 'var(--accent)' : 'var(--ink)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {gender === 'ANY' ? 'Anyone (Free)' : gender === 'MALE' ? 'Men (1 Coin)' : 'Women (1 Coin)'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '6px' }}>
            {preferredGender === 'ANY'
              ? 'Free matching with all members in the queue.'
              : 'Gender-targeted matching reserves 1 coin, charged only upon connecting.'}
          </p>
        </div>

        {/* Toggles */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: 'var(--surface-raised)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '14px', display: 'block' }}>Allow Direct Calls</strong>
              <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                Let previous chat connections call you directly
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAllowIncomingCalls(!allowIncomingCalls)}
              style={{
                width: '48px',
                height: '28px',
                borderRadius: '9999px',
                backgroundColor: allowIncomingCalls ? 'var(--accent)' : 'var(--surface)',
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
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
                  backgroundColor: allowIncomingCalls ? '#ffffff' : 'var(--ink-secondary)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '14px', display: 'block' }}>Sound Effects</strong>
              <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                Play tones on match found and gifts
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                width: '48px',
                height: '28px',
                borderRadius: '9999px',
                backgroundColor: soundEnabled ? 'var(--accent)' : 'var(--surface)',
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
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
                  backgroundColor: soundEnabled ? '#ffffff' : 'var(--ink-secondary)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" fullWidth onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
