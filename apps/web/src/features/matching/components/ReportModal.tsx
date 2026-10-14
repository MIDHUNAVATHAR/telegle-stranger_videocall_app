import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  strangerName: string;
  onConfirmReport: (reason: string) => void;
}

const REPORT_REASONS = [
  'Inappropriate or offensive behavior',
  'Spam or advertising',
  'Underage user',
  'Harassment or hate speech',
  'Fake camera / video loop',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  strangerName,
  onConfirmReport,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);

  const handleSubmit = () => {
    onConfirmReport(selectedReason);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report & Disconnect">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--step-body)' }}>
          Please tell us why you are reporting <strong>{strangerName}</strong>. You will be immediately disconnected and this user will be blocked from matching with you again.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor:
                  selectedReason === reason ? 'var(--surface-hover)' : 'var(--surface-raised)',
                color: selectedReason === reason ? 'var(--accent)' : 'var(--ink)',
                fontSize: 'var(--step-small)',
                textAlign: 'left',
                fontWeight: selectedReason === reason ? 700 : 400,
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
                {selectedReason === reason && (
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
              {reason}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'var(--space-8)' }}>
          <Button variant="ghost" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="md" fullWidth onClick={handleSubmit}>
            Report & Block
          </Button>
        </div>
      </div>
    </Modal>
  );
};
