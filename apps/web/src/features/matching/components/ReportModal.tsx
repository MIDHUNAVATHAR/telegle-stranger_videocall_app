'use client';

import React, { useState } from 'react';
import { ReportReason } from '@donkey-play/shared-types';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { moderationApi } from '../../moderation/moderationApi';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  strangerName: string;
  targetUserId?: string;
  matchSessionId?: string;
  onConfirmReport: (reason: string) => void;
}

const REPORT_OPTIONS: Array<{ label: string; reason: ReportReason }> = [
  { label: 'Harassment or hate speech', reason: 'HARASSMENT' },
  { label: 'Inappropriate or nudity violation', reason: 'NUDITY_INAPPROPRIATE' },
  { label: 'Underage user suspected', reason: 'UNDERAGE' },
  { label: 'Spam, bot, or commercial advertising', reason: 'SPAM' },
  { label: 'Other community guideline violation', reason: 'OTHER' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  strangerName,
  targetUserId,
  matchSessionId,
  onConfirmReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('HARASSMENT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (targetUserId) {
        await moderationApi.reportUser({
          targetUserId,
          matchSessionId,
          reason: selectedReason,
          details: `Reported via video chat modal: ${selectedReason}`,
        });
      }
    } catch {
      // Allow proceeding to disconnect user even if network/offline
    } finally {
      setIsSubmitting(false);
      onConfirmReport(selectedReason);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report & Disconnect">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--step-body)' }}>
          Please select the reason for reporting <strong>{strangerName}</strong>. You will be immediately disconnected, and a 24-hour mutual block will prevent you from being matched again.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.reason}
              onClick={() => setSelectedReason(opt.reason)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor:
                  selectedReason === opt.reason ? 'var(--surface-hover)' : 'var(--surface-raised)',
                color: selectedReason === opt.reason ? 'var(--accent)' : 'var(--ink)',
                fontSize: 'var(--step-small)',
                textAlign: 'left',
                fontWeight: selectedReason === opt.reason ? 700 : 400,
                border: '1px solid #1e2230',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid currentColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectedReason === opt.reason && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'currentColor',
                    }}
                  />
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'var(--space-8)' }}>
          <Button variant="ghost" size="md" fullWidth onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="danger" size="md" fullWidth onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Reporting...' : 'Report & Block'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
