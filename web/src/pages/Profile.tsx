import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
  CardRoot,
  CardBody,
  CardHeader,
  SimpleGrid,
  CheckboxRoot,
  CheckboxControl,
  CheckboxHiddenInput,
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
  AccordionItemBody,
  AccordionItemIndicator,
} from '@chakra-ui/react';
import { Global } from '@emotion/react';
import { apiGet, apiPatch } from '../services/api';
import type { UserProfile } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';


function Profile() {
  const { showSuccess, showError } = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Notification preferences
  const [applicationRemindersEnabled, setApplicationRemindersEnabled] = useState(true);
  const [collaborationRemindersEnabled, setCollaborationRemindersEnabled] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const profileData = await apiGet<UserProfile>('/users/me');

        // Set profile fields
        setEmailAddress(profileData.emailAddress || '');
        setFirstName(profileData.firstName || '');
        setLastName(profileData.lastName || '');
        setPhoneNumber(profileData.phoneNumber || '');

        // Set notification preferences
        setApplicationRemindersEnabled(profileData.applicationRemindersEnabled ?? true);
        setCollaborationRemindersEnabled(profileData.collaborationRemindersEnabled ?? true);
      } catch (error) {
        showError('Error', error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [showError]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update profile
      await apiPatch('/users/me', {
        firstName: firstName || null,
        lastName: lastName || null,
        phoneNumber: phoneNumber || null,
        applicationRemindersEnabled,
        collaborationRemindersEnabled,
      });

      showSuccess('Profile updated', 'Your profile has been saved successfully.', 3000);
    } catch (error) {
      showError('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="4xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Text>Loading profile...</Text>
      </Container>
    );
  }

  return (
    <>
      <Global
        styles={{
          'select, option': {
            fontSize: '18px !important',
            '@media (max-width: 768px)': {
              fontSize: '18px !important',
            },
          },
        }}
      />
      <Container maxW="4xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Stack gap={{ base: '4', md: '8' }}>
          <Heading size={{ base: 'md', md: 'lg' }}>Profile & Preferences</Heading>

        <AccordionRoot multiple defaultValue={['personal', 'notifications']}>
          {/* Profile Information */}
          <AccordionItem value="personal" border="none" mb="4">
            <CardRoot>
              <CardHeader p="0" _hover={{ bg: 'gray.50' }}>
                <AccordionItemTrigger
                  px={{ base: 4, md: 6 }}
                  py="4"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  w="full"
                >
                  <Heading size="md" flex="1" textAlign="left">
                    Personal Information
                  </Heading>
                  <AccordionItemIndicator fontSize="2xl" color="brand.700" />
                </AccordionItemTrigger>
              </CardHeader>
              <AccordionItemContent>
                <AccordionItemBody p="0">
                  <CardBody>
            <Stack gap="6">
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
                <Field.Root>
                  <Field.Label fontSize={{ base: 'md', md: 'sm' }}>First Name</Field.Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    size={{ base: 'lg', md: 'md' }}
                    fontSize={{ base: 'md', md: 'sm' }}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize={{ base: 'md', md: 'sm' }}>Last Name</Field.Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    size={{ base: 'lg', md: 'md' }}
                    fontSize={{ base: 'md', md: 'sm' }}
                  />
                </Field.Root>
              </SimpleGrid>

              <Field.Root>
                <Field.Label fontSize={{ base: 'md', md: 'sm' }}>Email</Field.Label>
                <Input 
                  value={emailAddress} 
                  readOnly
                  bg="gray.50"
                  size={{ base: 'lg', md: 'md' }}
                  fontSize={{ base: 'md', md: 'sm' }}
                />
                <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500" mt="1">
                  Email cannot be changed
                </Text>
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize={{ base: 'md', md: 'sm' }}>Phone Number</Field.Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  size={{ base: 'lg', md: 'md' }}
                  fontSize={{ base: 'md', md: 'sm' }}
                />
              </Field.Root>
            </Stack>
                  </CardBody>
                </AccordionItemBody>
              </AccordionItemContent>
            </CardRoot>
          </AccordionItem>

          {/* Notification Preferences */}
          <AccordionItem value="notifications" border="none" mb="4">
            <CardRoot>
              <CardHeader p="0" _hover={{ bg: 'gray.50' }}>
                <AccordionItemTrigger
                  px={{ base: 4, md: 6 }}
                  py="4"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  w="full"
                >
                <Box flex="1" textAlign="left">
                  <Heading size="md">Notification Preferences</Heading>
                  <Text fontSize="sm" color="gray.500" mt="1">
                    Control when you receive reminder emails
                  </Text>
                </Box>
                <AccordionItemIndicator fontSize="2xl" color="brand.700" />
                </AccordionItemTrigger>
              </CardHeader>
              <AccordionItemContent>
                <AccordionItemBody p="0">
                  <CardBody>
            <Stack gap="4">
              <Field.Root display="flex" alignItems="center" flexDirection={{ base: 'column', md: 'row' }}>
                <Box flex="1" mb={{ base: 2, md: 0 }}>
                  <Field.Label mb="0" fontSize={{ base: 'md', md: 'sm' }}>Application Reminders</Field.Label>
                  <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500">
                    Receive email reminders for upcoming scholarship application deadlines
                  </Text>
                </Box>
                <CheckboxRoot
                  checked={applicationRemindersEnabled}
                  onCheckedChange={(details) => setApplicationRemindersEnabled(Boolean(details.checked))}
                  size={{ base: 'lg', md: 'lg' }}
                >
                  <CheckboxHiddenInput />
                  <CheckboxControl />
                </CheckboxRoot>
              </Field.Root>

              <Field.Root display="flex" alignItems="center" flexDirection={{ base: 'column', md: 'row' }}>
                <Box flex="1" mb={{ base: 2, md: 0 }}>
                  <Field.Label mb="0" fontSize={{ base: 'md', md: 'sm' }}>Collaboration Reminders</Field.Label>
                  <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500">
                    Receive email reminders for collaboration tasks and deadlines
                  </Text>
                </Box>
                <CheckboxRoot
                  checked={collaborationRemindersEnabled}
                  onCheckedChange={(details) => setCollaborationRemindersEnabled(Boolean(details.checked))}
                  size={{ base: 'lg', md: 'lg' }}
                >
                  <CheckboxHiddenInput />
                  <CheckboxControl />
                </CheckboxRoot>
              </Field.Root>
            </Stack>
                  </CardBody>
                </AccordionItemBody>
              </AccordionItemContent>
            </CardRoot>
          </AccordionItem>
        </AccordionRoot>

        {/* Save Button */}
        <Box>
          <Button
            colorPalette="blue"
            size={{ base: 'md', md: 'lg' }}
            onClick={handleSave}
            loading={saving}
            loadingText="Saving..."
            width={{ base: '100%', md: 'auto' }}
          >
            Save Changes
          </Button>
        </Box>
      </Stack>
      </Container>
    </>
  );
}

export default Profile;

