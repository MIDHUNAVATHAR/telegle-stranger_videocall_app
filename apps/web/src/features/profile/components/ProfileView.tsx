'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { IconSettings, IconStar } from '../../../shared/components/Icons';
import { UserProfile as SharedUserProfile } from '../../../shared/types';
import { EditProfileModal } from './EditProfileModal';
import { PreferencesModal } from './PreferencesModal';
import { profileApi, UserPreferences } from '../apis/profileApi';

interface ProfileViewProps {
  user: SharedUserProfile;
  onUpdateBio: (newBio: string) => void;
  onOpenSettings: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateBio,
  onOpenSettings,
}) => {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferredGender: 'ANY',
    allowIncomingCalls: true,
    soundEnabled: true,
  });

  const [localProfile, setLocalProfile] = useState({
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    age: 22,
    gender: 'MALE',
  });

  useEffect(() => {
    // Attempt to fetch profile & preferences from API
    profileApi.getMyProfile()
      .then((data) => {
        if (data && data.user) {
          setLocalProfile({
            name: data.user.display_name || data.user.username || user.name,
            bio: data.user.bio || user.bio,
            avatar: data.user.avatar_url || user.avatar,
            age: data.user.age || 22,
            gender: data.user.gender || 'MALE',
          });
          setBioText(data.user.bio || user.bio);
        }
        if (data && data.preferences) {
          setPreferences(data.preferences);
        }
      })
      .catch(() => {
        // Guest user or offline, fall back to props
      });
  }, [user.name, user.bio, user.avatar]);

  const handleSaveBio = async () => {
    onUpdateBio(bioText);
    setIsEditingBio(false);
    try {
      await profileApi.updateProfile({ bio: bioText });
      setLocalProfile((prev) => ({ ...prev, bio: bioText }));
    } catch {
      // Local fallback already applied
    }
  };

  return (
    <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
      {/* Profile Header Card */}
      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-12)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--surface-raised)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={localProfile.avatar}
            alt={localProfile.name}
            style={{
              width: '88px',
              height: '88px',
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
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              border: '2px solid var(--surface-raised)',
            }}
          />
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--step-lead)', fontWeight: 800 }}>
            {localProfile.name}, {localProfile.age}
          </h1>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            {user.tag} · {user.country}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          <Badge variant="accent">18+ Verified Human</Badge>
          <Badge variant="success">Karma 100%</Badge>
          <Badge variant="default">Strictly No Nudity</Badge>
        </div>

        {/* Bio Section */}
        <div style={{ width: '100%', marginTop: 'var(--space-8)' }}>
          {isEditingBio ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={300}
                style={{
                  width: '100%',
                  minHeight: '70px',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--ink)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  border: '1px solid #2a3042',
                  fontSize: 'var(--step-body)',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingBio(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveBio}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingBio(true)}
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--step-body)',
                color: 'var(--ink)',
              }}
            >
              {localProfile.bio || 'No bio yet. Tap to add your bio!'}
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--accent)',
                  marginTop: '4px',
                }}
              >
                Tap to edit bio
              </span>
            </div>
          )}
        </div>

        {/* Edit Profile Button */}
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => setIsEditModalOpen(true)}
        >
          Edit Profile & Photo
        </Button>
      </Card>

      {/* Stats Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        <Card style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <strong
            style={{
              fontSize: 'var(--step-lead)',
              color: 'var(--accent)',
              display: 'block',
            }}
          >
            142
          </strong>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            Chats Met
          </span>
        </Card>
        <Card style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <strong
            style={{
              fontSize: 'var(--step-lead)',
              color: 'var(--ink)',
              display: 'block',
            }}
          >
            48
          </strong>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            Gifts Sent
          </span>
        </Card>
        <Card style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: 'var(--step-lead)',
              color: 'var(--success)',
            }}
          >
            <IconStar size={18} /> 5.0
          </strong>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            Community Score
          </span>
        </Card>
      </div>

      {/* Matching Preferences Quick Card */}
      <Card
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsPreferencesModalOpen(true)}
      >
        <div>
          <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
            Match Gender Filter
          </strong>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            Current: {preferences.preferredGender === 'ANY' ? 'Anyone (Free)' : preferences.preferredGender}
          </span>
        </div>
        <Button variant="ghost" size="sm">
          Change
        </Button>
      </Card>

      {/* Interests */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 style={{ fontSize: 'var(--step-body)', fontWeight: 700 }}>My Interests</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {user.interests.map((interest) => (
            <Badge key={interest} variant="default">
              #{interest}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Settings Action Button */}
      <Button variant="secondary" size="md" fullWidth onClick={onOpenSettings}>
        <IconSettings size={18} /> App & Safety Settings
      </Button>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialProfile={{
          displayName: localProfile.name,
          bio: localProfile.bio,
          gender: localProfile.gender,
          age: localProfile.age,
          avatarUrl: localProfile.avatar,
        }}
        onProfileUpdated={(updated) => {
          setLocalProfile({
            name: updated.displayName,
            bio: updated.bio,
            gender: updated.gender,
            age: updated.age,
            avatar: updated.avatarUrl || localProfile.avatar,
          });
          setBioText(updated.bio);
          onUpdateBio(updated.bio);
        }}
      />

      <PreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        initialPreferences={preferences}
        onPreferencesUpdated={(updated) => setPreferences(updated)}
      />
    </div>
  );
};
