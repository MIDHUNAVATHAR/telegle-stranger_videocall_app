'use client';

import React, { useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { IconSettings, IconStar } from '../../../shared/components/Icons';
import { UserProfile } from '../../../shared/types';

interface ProfileViewProps {
  user: UserProfile;
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

  const handleSaveBio = () => {
    onUpdateBio(bioText);
    setIsEditingBio(false);
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
            src={user.avatar}
            alt={user.name}
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
          <h1 style={{ fontSize: 'var(--step-lead)', fontWeight: 800 }}>{user.name}</h1>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            {user.tag} · {user.country}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Badge variant="accent">Verified Human</Badge>
          <Badge variant="success">Karma 99%</Badge>
        </div>

        {/* Bio Section */}
        <div style={{ width: '100%', marginTop: 'var(--space-8)' }}>
          {isEditingBio ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '70px',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--ink)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  border: 'none',
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
              {user.bio}
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
        <IconSettings size={18} /> App & Privacy Settings
      </Button>
    </div>
  );
};
