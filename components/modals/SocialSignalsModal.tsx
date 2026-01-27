/**
 * SocialSignalsModal
 *
 * Modal wrapper for SocialSignalsPanel to track social signals for Knowledge Panel building.
 * Based on Kalicube methodology and Google's entity verification signals.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import SocialSignalsPanel from '../dashboard/SocialSignalsPanel';
import type { SocialProfile } from '../../services/socialSignalsService';

interface SocialSignalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityType?: string;
  existingProfiles?: SocialProfile[];
  onSaveProfiles?: (profiles: SocialProfile[]) => void;
}

const SocialSignalsModal: React.FC<SocialSignalsModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityType,
  existingProfiles = [],
  onSaveProfiles,
}) => {
  const [profiles, setProfiles] = useState<SocialProfile[]>(existingProfiles);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset profiles when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setProfiles(existingProfiles);
      setHasChanges(false);
    }
  }, [isOpen, existingProfiles]);

  const handleProfilesChange = (newProfiles: SocialProfile[]) => {
    setProfiles(newProfiles);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSaveProfiles) {
      onSaveProfiles(profiles);
    }
    setHasChanges(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Social Signals Tracker"
      description="Track social profiles to build Knowledge Panel eligibility. Based on Kalicube methodology."
      maxWidth="max-w-4xl"
      footer={
        <div className="flex gap-3">
          <Button onClick={onClose} variant="secondary">
            {hasChanges ? 'Cancel' : 'Close'}
          </Button>
          {onSaveProfiles && hasChanges && (
            <Button onClick={handleSave} variant="primary">
              Save Profiles
            </Button>
          )}
        </div>
      }
    >
      {!entityName ? (
        <div className="text-center py-10">
          <p className="text-gray-400">
            Define your Central Entity in SEO Pillars first to track social signals.
          </p>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto">
          <SocialSignalsPanel
            entityName={entityName}
            entityType={entityType}
            existingProfiles={profiles}
            onProfilesChange={handleProfilesChange}
          />
        </div>
      )}
    </Modal>
  );
};

export default SocialSignalsModal;
