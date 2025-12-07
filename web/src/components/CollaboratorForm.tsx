/**
 * CollaboratorForm Component
 * Modal form for creating/editing collaborators
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
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
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }} isCentered>
      <ModalOverlay />
      <ModalContent mx={{ base: 0, md: 'auto' }} my={{ base: 0, md: 'auto' }} maxH={{ base: '100vh', md: '90vh' }} overflowY="auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>{isEditMode ? 'Edit' : 'Add'} Collaborator</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="collaborator@example.com"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Relationship</FormLabel>
                <Input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g., Teacher, Professor, Counselor, Mentor"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isLoading}
              loadingText={isEditMode ? 'Updating...' : 'Creating...'}
            >
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default CollaboratorForm;
