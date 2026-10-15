'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { profileApi, UpdateProfilePayload } from '../apis/profileApi';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile: {
    displayName: string;
    bio?: string;
    gender?: string;
    age?: number;
    avatarUrl?: string;
  };
  onProfileUpdated: (updated: {
    displayName: string;
    gender: string;
    age: number;
    avatarUrl?: string;
  }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  initialProfile,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(initialProfile.displayName || '');
  const [gender, setGender] = useState(initialProfile.gender || 'OTHER');
  const [age, setAge] = useState<number>(initialProfile.age || 18);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const url = await profileApi.uploadAvatarToCloudinary(file);
      setAvatarUrl(url);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(errObj.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim()) {
      setErrorMessage('Display name is required');
      return;
    }

    if (age < 18) {
      setErrorMessage('You must be 18 or older to use Donkey Play');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UpdateProfilePayload = {
        display_name: displayName.trim(),
        gender,
        age: Number(age),
        avatar_url: avatarUrl || undefined,
      };

      await profileApi.updateProfile(payload);
      onProfileUpdated({
        displayName: displayName.trim(),
        gender,
        age: Number(age),
        avatarUrl,
      });
      onClose();
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(errObj.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              color: '#ef4444',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Avatar Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '84px', height: '84px' }}>
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt="Avatar preview"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--accent)',
              }}
            />
            {isUploading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '11px',
                }}
              >
                Uploading...
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? 'Uploading...' : 'Change Photo'}
          </Button>
        </div>

        {/* Display Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid #2a3042',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Age and Gender */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Age (18+)
            </label>
            <input
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 18)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid #2a3042',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid #2a3042',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '14px',
              }}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Non-Binary / Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <Button type="button" variant="ghost" fullWidth onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
