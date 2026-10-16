'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { IconCopy, IconCheck } from '../../../shared/components/Icons';
import { UserProfile as SharedUserProfile } from '../../../shared/types';
import { EditProfileModal } from './EditProfileModal';
import { profileApi } from '../apis/profileApi';
import { useAuth } from '../../auth';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

interface ProfileViewProps {
  user: SharedUserProfile;
  onUpdateBio?: (newBio: string) => void;
  onOpenSettings?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const { user: authUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [origin, setOrigin] = useState('');

  const [localProfile, setLocalProfile] = useState({
    name: user.name,
    email: user.email || authUser?.email || '',
    avatar: user.avatar,
    age: 22,
    gender: 'MALE',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const referralCode = authUser?.username || authUser?.id || '';
  const referralUrl = origin && referralCode ? `${origin}/?ref=${referralCode}` : '';

  const handleCopyReferral = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2500);
    } catch {
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2500);
    }
  };

  useEffect(() => {
    // Attempt to fetch profile from API
    profileApi
      .getMyProfile()
      .then((data) => {
        if (data && data.user) {
          setLocalProfile({
            name: data.user.username || data.user.display_name || user.name,
            email: data.user.email || authUser?.email || user.email || '',
            avatar: data.user.avatar_url || user.avatar,
            age: data.user.age || 22,
            gender: data.user.gender || 'MALE',
          });
        }
      })
      .catch(() => {
        // Guest user or offline, fall back to props
      });
  }, [user.name, user.avatar, user.email, authUser?.email]);

  return (
    <div
      data-ui
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-20)',
        paddingTop: '16px',
        paddingBottom: '24px',
        width: '100%',
      }}
    >
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
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: '1px solid #1e2230',
          borderBottom: '1px solid #1e2230',
        }}
      >
        {/* Profile Avatar: Strictly round circle */}
        <div
          style={{
            position: 'relative',
            width: '96px',
            height: '96px',
            minWidth: '96px',
            minHeight: '96px',
            maxWidth: '96px',
            maxHeight: '96px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '96px',
              height: '96px',
              minWidth: '96px',
              minHeight: '96px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid var(--accent)',
              backgroundColor: 'var(--surface)',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={localProfile.avatar || DEFAULT_AVATAR}
              alt={localProfile.name}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
              style={{
                width: '100%',
                height: '100%',
                minWidth: '100%',
                minHeight: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              border: '2px solid var(--surface-raised)',
              zIndex: 2,
            }}
          />
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--step-title)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            @{localProfile.name.replace(/^@/, '')}{localProfile.age ? `, ${localProfile.age}` : ''}
          </h1>
          {(localProfile.email || authUser?.email || user.email) ? (
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)', marginTop: '4px', display: 'block' }}>
              {localProfile.email || authUser?.email || user.email}
            </span>
          ) : null}
        </div>

        {/* Edit Profile & Photo Button with vibrant Telegle theme color */}
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          style={{
            width: '100%',
            marginTop: 'var(--space-8)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, #ff7a3d 0%, #ff5a1f 60%, #e44910 100%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.01em',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(255, 90, 31, 0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Edit Profile & Photo</span>
        </button>
      </Card>

      {/* Free 10 Coins Referral Section (Moved from Wallet) */}
      <Card
        style={{
          padding: '16px 18px',
          backgroundColor: 'var(--surface-raised)',
          borderTop: '1px solid #283044',
          borderBottom: '1px solid #283044',
          borderLeft: 'none',
          borderRight: 'none',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                fontWeight: 800,
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              +10
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: 'var(--step-body)', color: 'var(--ink)' }}>Free Coins: 10 Coins</strong>
                <Badge variant="accent">Invite & Earn</Badge>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                Share your referral link with friends. When they sign up for the first time, you get 10 free coins!
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            readOnly
            value={referralUrl || 'Log in to view your referral link'}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            placeholder="Your referral link will appear here"
            style={{
              flex: '1 1 200px',
              backgroundColor: '#11141c',
              border: '1px solid #2a3144',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: '#f3f4f6',
              fontSize: '12px',
              fontFamily: 'monospace',
              outline: 'none',
              cursor: 'text',
            }}
          />
          <Button
            variant={copiedReferral ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleCopyReferral}
            disabled={!referralUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              backgroundColor: copiedReferral ? '#10b981' : undefined,
              borderColor: copiedReferral ? '#10b981' : undefined,
              color: '#fff',
            }}
          >
            {copiedReferral ? (
              <>
                <IconCheck size={14} /> Copied!
              </>
            ) : (
              <>
                <IconCopy size={14} /> Copy Link
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialProfile={{
          username: localProfile.name,
          displayName: localProfile.name,
          bio: '',
          gender: localProfile.gender,
          age: localProfile.age,
          avatarUrl: localProfile.avatar,
        }}
        onProfileUpdated={(updated) => {
          setLocalProfile((prev) => ({
            ...prev,
            name: updated.username || updated.displayName || prev.name,
            gender: updated.gender,
            age: updated.age,
            avatar: updated.avatarUrl || prev.avatar,
          }));
        }}
      />
    </div>
  );
};
