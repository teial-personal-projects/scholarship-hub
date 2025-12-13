/**
 * CollaboratorForm Component
 * Modal form for creating/editing collaborators
 */

import React, { useState, useEffect } from 'react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  Button,
  Field,
  Input,
  VStack,
  HStack,
  Flex,
} from '@chakra-ui/react';
import { apiPost, apiPatch } from '../services/api';
import type { CollaboratorResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface CollaboratorFormProps {
  isOpen: boolean;
  onClose: () => void;
  collaborator?: CollaboratorResponse | null;
  onSuccess?: () => void;
}

const CollaboratorForm: React.FC<CollaboratorFormProps> = ({
  isOpen,
  onClose,
  collaborator,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const isEditMode = !!collaborator;

  useEffect(() => {
    if (isOpen) {
      if (collaborator) {
        // Editing existing collaborator
        setFirstName(collaborator.firstName || '');
        setLastName(collaborator.lastName || '');
        setEmailAddress(collaborator.emailAddress || '');
        setRelationship(collaborator.relationship || '');
        setPhoneNumber(collaborator.phoneNumber || '');
      } else {
        // Creating new collaborator
        setFirstName('');
        setLastName('');
        setEmailAddress('');
        setRelationship('');
        setPhoneNumber('');
      }
    }
  }, [isOpen, collaborator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim() || !emailAddress.trim()) {
      showError('Validation Error', 'First name, last name, and email are required', 3000);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      showError('Validation Error', 'Please enter a valid email address', 3000);
      return;
    }

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailAddress: emailAddress.trim(),
      relationship: relationship.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
    };

    try {
      setIsLoading(true);

      if (isEditMode && collaborator) {
        await apiPatch(`/collaborators/${collaborator.id}`, payload);
        showSuccess('Success', 'Collaborator updated successfully', 3000);
      } else {
        await apiPost('/collaborators', payload);
        showSuccess('Success', 'Collaborator created successfully', 3000);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save collaborator';
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent
          mx={{ base: 0, md: 'auto' }}
          my={{ base: 0, md: 'auto' }}
          maxH={{ base: '100vh', md: '90vh' }}
          overflowY="auto"
          w={{ base: '100vw', md: 'auto' }}
          maxW={{ base: '100vw', md: 'md' }}
        >
        <form id="collaborator-form" onSubmit={handleSubmit}>
          <DialogHeader
            position="sticky"
            top="0"
            zIndex={10}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
          >
            <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
              <span>{isEditMode ? 'Edit' : 'Add'} Collaborator</span>
              <HStack gap="3">
                <Button
                  type="submit"
                  form="collaborator-form"
                  colorPalette="accent"
                  size="sm"
                  loading={isLoading}
                  loadingText={isEditMode ? 'Updating...' : 'Creating...'}
                >
                  {isEditMode ? 'Update' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  colorPalette="brand"
                  size="sm"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </HStack>
            </Flex>
          </DialogHeader>
          <DialogCloseTrigger disabled={isLoading} />

          <DialogBody>
            <VStack gap={4}>
              <Field.Root required>
                <Field.Label>First Name</Field.Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Last Name</Field.Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Email Address</Field.Label>
                <Input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="collaborator@example.com"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Relationship</Field.Label>
                <Input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g., Teacher, Professor, Counselor, Mentor"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Phone Number</Field.Label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </Field.Root>
            </VStack>
          </DialogBody>
        </form>
      </DialogContent>
    </DialogPositioner>
  </DialogRoot>
  );
};

export default CollaboratorForm;
