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
  Wrap,
  TagRoot,
  TagLabel,
  TagCloseTrigger,
  NativeSelectRoot,
  NativeSelectField,
  CheckboxRoot,
  CheckboxLabel,
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

// Constants
const TARGET_TYPES = ['Merit', 'Need', 'Both'];
const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary'];
const ETHNICITY_OPTIONS = [
  'Asian/Pacific Islander',
  'Black/African American',
  'Hispanic/Latino',
  'White/Caucasian',
  'Native American/Alaska Native',
  'Native Hawaiian/Pacific Islander',
  'Middle Eastern/North African',
  'South Asian',
  'East Asian',
  'Southeast Asian',
  'Other',
];
const ACADEMIC_LEVELS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'High School Junior',
  'High School Senior',
  'College Freshman',
  'College Sophomore',
  'College Junior',
  'College Senior',
  'Graduate Student',
];
const SUBJECT_AREAS = [
  'Agriculture',
  'Arts',
  'Architecture',
  'Athletics',
  'Aviation',
  'Biology',
  'Business',
  'Chemistry',
  'Communication',
  'Community Service',
  'Criminal Justice',
  'Culinary Arts',
  'Computer Science',
  'Dance',
  'Dentistry',
  'Disablity',
  'Design',
  'Drama',
  'Economics',
  'Education',
  'Engineering',
  'Environmental Science',
  'Healthcare',
  'Humanities',
  'Journalism',
  'Law',
  'Mathematics',
  'Medicine',
  'Music',
  'Military',
  'Nursing',
  'Physics',
  'Psychology',
  'Public Policy',
  'Religion',
  'Science',
  'Social Sciences',
  'STEM',
  'Writing',
];

function Profile() {
  const { showSuccess, showError } = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Search preferences
  const [targetType, setTargetType] = useState<string>('');
  const [subjectAreas, setSubjectAreas] = useState<string[]>([]);
  const [newSubjectArea, setNewSubjectArea] = useState('');
  const [gender, setGender] = useState<string>('');
  const [ethnicity, setEthnicity] = useState<string>('');
  const [minAward, setMinAward] = useState<number | undefined>(undefined);
  const [geographicRestrictions, setGeographicRestrictions] = useState('');
  const [essayRequired, setEssayRequired] = useState(false);
  const [recommendationRequired, setRecommendationRequired] = useState(false);
  const [academicLevel, setAcademicLevel] = useState<string>('');

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

        // Set search preferences if they exist
        if (profileData.searchPreferences) {
          const prefs = profileData.searchPreferences;
          setTargetType(prefs.targetType || '');
          setSubjectAreas(prefs.subjectAreas || []);
          setGender(prefs.gender || '');
          setEthnicity(prefs.ethnicity || '');
          setMinAward(prefs.minAward || undefined);
          setGeographicRestrictions(prefs.geographicRestrictions || '');
          setEssayRequired(prefs.essayRequired || false);
          setRecommendationRequired(prefs.recommendationRequired || false);
          setAcademicLevel(prefs.academicLevel || '');
        }

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

  const handleAddSubjectArea = () => {
    if (newSubjectArea && !subjectAreas.includes(newSubjectArea)) {
      setSubjectAreas([...subjectAreas, newSubjectArea]);
      setNewSubjectArea('');
    }
  };

  const handleRemoveSubjectArea = (area: string) => {
    setSubjectAreas(subjectAreas.filter((a) => a !== area));
  };

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

      // Update search preferences
      await apiPatch('/users/me/search-preferences', {
        targetType: targetType || null,
        subjectAreas: subjectAreas.length > 0 ? subjectAreas : null,
        gender: gender || null,
        ethnicity: ethnicity || null,
        minAward: minAward || null,
        geographicRestrictions: geographicRestrictions || null,
        essayRequired: essayRequired,
        recommendationRequired: recommendationRequired,
        academicLevel: academicLevel || null,
      });

      showSuccess('Profile updated', 'Your profile and preferences have been saved successfully.', 3000);
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

        <AccordionRoot multiple defaultValue={['personal', 'search', 'notifications']}>
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

          {/* Search Preferences */}
          <AccordionItem value="search" border="none" mb="4">
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
                  <Heading size="md">Search Preferences</Heading>
                  <Text fontSize="sm" color="gray.500" mt="1">
                    Customize your scholarship search criteria
                  </Text>
                </Box>
                <AccordionItemIndicator fontSize="2xl" color="brand.700" />
                </AccordionItemTrigger>
              </CardHeader>
              <AccordionItemContent>
                <AccordionItemBody p="0">
                  <CardBody>
            <Stack gap="6">
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
                <Field.Root>
                  <Field.Label fontSize={{ base: 'lg', md: 'sm' }} fontWeight={{ base: 'semibold', md: 'normal' }}>Target Type</Field.Label>
                  <NativeSelectRoot size={{ base: 'lg', md: 'md' }}>
                    <NativeSelectField
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value)}
                      fontSize={{ base: 'lg', md: 'sm' }}
                      height={{ base: '48px', md: 'auto' }}
                    >
                      <option value="">Select target type</option>
                      {TARGET_TYPES.map((type) => (
                        <option key={type} value={type} style={{ fontSize: '18px', padding: '12px' }}>
                          {type}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize={{ base: 'lg', md: 'sm' }} fontWeight={{ base: 'semibold', md: 'normal' }}>Academic Level</Field.Label>
                  <NativeSelectRoot size={{ base: 'lg', md: 'md' }}>
                    <NativeSelectField
                      value={academicLevel}
                      onChange={(e) => setAcademicLevel(e.target.value)}
                      fontSize={{ base: 'lg', md: 'sm' }}
                      height={{ base: '48px', md: 'auto' }}
                    >
                      <option value="">Select academic level</option>
                      {ACADEMIC_LEVELS.map((level) => (
                        <option key={level} value={level} style={{ fontSize: '18px', padding: '12px' }}>
                          {level}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Field.Root>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
                <Field.Root>
                  <Field.Label fontSize={{ base: 'lg', md: 'sm' }} fontWeight={{ base: 'semibold', md: 'normal' }}>Gender</Field.Label>
                  <NativeSelectRoot size={{ base: 'lg', md: 'md' }}>
                    <NativeSelectField
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      fontSize={{ base: 'lg', md: 'sm' }}
                      height={{ base: '48px', md: 'auto' }}
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g} style={{ fontSize: '18px', padding: '12px' }}>
                          {g}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize={{ base: 'lg', md: 'sm' }} fontWeight={{ base: 'semibold', md: 'normal' }}>Ethnicity</Field.Label>
                  <NativeSelectRoot size={{ base: 'lg', md: 'md' }}>
                    <NativeSelectField
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                      fontSize={{ base: 'lg', md: 'sm' }}
                      height={{ base: '48px', md: 'auto' }}
                    >
                      <option value="">Select ethnicity</option>
                      {ETHNICITY_OPTIONS.map((eth) => (
                        <option key={eth} value={eth} style={{ fontSize: '18px', padding: '12px' }}>
                          {eth}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Field.Root>
              </SimpleGrid>

              <Field.Root>
                <Field.Label fontSize={{ base: 'md', md: 'sm' }}>Minimum Award Amount ($)</Field.Label>
                <Input
                  type="number"
                  min={0}
                  value={minAward ?? ''}
                  onChange={(e) => setMinAward(e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="Minimum award amount"
                  size={{ base: 'lg', md: 'md' }}
                  fontSize={{ base: 'md', md: 'sm' }}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize={{ base: 'md', md: 'sm' }}>Subject Areas</Field.Label>
                <Wrap gap="2" mb="3">
                  {subjectAreas.map((area) => (
                    <TagRoot key={area} size={{ base: 'lg', md: 'md' }} colorPalette="blue" fontSize={{ base: 'sm', md: 'xs' }}>
                      <TagLabel>{area}</TagLabel>
                      <TagCloseTrigger onClick={() => handleRemoveSubjectArea(area)} />
                    </TagRoot>
                  ))}
                </Wrap>
                <Box display="flex" gap="2" flexDirection={{ base: 'column', md: 'row' }}>
                  <NativeSelectRoot size={{ base: 'lg', md: 'md' }} flex="1">
                    <NativeSelectField
                      value={newSubjectArea}
                      onChange={(e) => setNewSubjectArea(e.target.value)}
                      fontSize={{ base: 'lg', md: 'sm' }}
                      height={{ base: '48px', md: 'auto' }}
                    >
                      <option value="">Select subject area to add</option>
                      {SUBJECT_AREAS.filter((area) => !subjectAreas.includes(area)).map((area) => (
                        <option key={area} value={area} style={{ fontSize: '18px', padding: '12px' }}>
                          {area}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                  <Button 
                    onClick={handleAddSubjectArea} 
                    disabled={!newSubjectArea}
                    size={{ base: 'lg', md: 'md' }}
                    width={{ base: '100%', md: 'auto' }}
                    fontSize={{ base: 'lg', md: 'md' }}
                  >
                    Add
                  </Button>
                </Box>
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize={{ base: 'md', md: 'sm' }}>Geographic Restrictions</Field.Label>
                <Input
                  value={geographicRestrictions}
                  onChange={(e) => setGeographicRestrictions(e.target.value)}
                  placeholder="e.g., United States, California only"
                  size={{ base: 'lg', md: 'md' }}
                  fontSize={{ base: 'md', md: 'sm' }}
                />
              </Field.Root>

              <Stack>
                <CheckboxRoot
                  checked={essayRequired}
                  onCheckedChange={(details) => setEssayRequired(Boolean(details.checked))}
                  size={{ base: 'lg', md: 'md' }}
                >
                  <CheckboxHiddenInput />
                  <CheckboxControl />
                  <CheckboxLabel>
                    <Text fontSize={{ base: 'md', md: 'sm' }}>Essay Required</Text>
                  </CheckboxLabel>
                </CheckboxRoot>
                <CheckboxRoot
                  checked={recommendationRequired}
                  onCheckedChange={(details) => setRecommendationRequired(Boolean(details.checked))}
                  size={{ base: 'lg', md: 'md' }}
                >
                  <CheckboxHiddenInput />
                  <CheckboxControl />
                  <CheckboxLabel>
                    <Text fontSize={{ base: 'md', md: 'sm' }}>Recommendation Required</Text>
                  </CheckboxLabel>
                </CheckboxRoot>
              </Stack>
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

