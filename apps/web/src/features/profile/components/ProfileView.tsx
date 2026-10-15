'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { IconShield } from '../../../shared/components/Icons';
import { UserProfile as SharedUserProfile } from '../../../shared/types';
import { EditProfileModal } from './EditProfileModal';
import { profileApi } from '../apis/profileApi';

interface ProfileViewProps {
  user: SharedUserProfile;
  onUpdateBio?: (newBio: string) => void;
  onOpenSettings?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [localProfile, setLocalProfile] = useState({
    name: user.name,
    avatar: user.avatar,
    age: 22,
    gender: 'MALE',
  });

  useEffect(() => {
    // Attempt to fetch profile from API
    profileApi
      .getMyProfile()
      .then((data) => {
        if (data && data.user) {
          setLocalProfile({
            name: data.user.display_name || data.user.username || user.name,
            avatar: data.user.avatar_url || user.avatar,
            age: data.user.age || 22,
            gender: data.user.gender || 'MALE',
          });
        }
      })
      .catch(() => {
        // Guest user or offline, fall back to props
      });
  }, [user.name, user.avatar]);

  return (
    <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
      {/* Profile Main Card */}
      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-16)',
          padding: 'var(--space-32) var(--space-24)',
          backgroundColor: 'var(--surface-raised)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={localProfile.avatar}
            alt={localProfile.name}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--accent)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              border: '2px solid var(--surface-raised)',
            }}
          />
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--step-title)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {localProfile.name}, {localProfile.age}
          </h1>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)', marginTop: '4px', display: 'block' }}>
            {user.tag}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          <Badge variant="success">Karma 100%</Badge>
          <Badge variant="default">Strictly No Nudity</Badge>
        </div>

        {/* Edit Profile Button */}
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => setIsEditModalOpen(true)}
          style={{ marginTop: 'var(--space-8)' }}
        >
          Edit Profile & Photo
        </Button>
      </Card>

      {/* Safety Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: 'var(--space-16)',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid var(--accent)',
        }}
      >
        <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
          <IconShield size={24} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 'var(--step-small)', color: 'var(--ink)' }}>
            Respect Others · Strictly No Nudity
          </strong>
          <span style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Zero tolerance for harassment, recording peers, or explicit content.
          </span>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialProfile={{
          displayName: localProfile.name,
          bio: '',
          gender: localProfile.gender,
          age: localProfile.age,
          avatarUrl: localProfile.avatar,
        }}
        onProfileUpdated={(updated) => {
          setLocalProfile({
            name: updated.displayName,
            gender: updated.gender,
            age: updated.age,
            avatar: updated.avatarUrl || localProfile.avatar,
          });
        }}
      />
    </div>
  );
};
