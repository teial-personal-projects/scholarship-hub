import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Select,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  Tag,
  TagCloseButton,
  TagLabel,
  Wrap,
} from '@chakra-ui/react';
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
      <Container maxW="4xl" py={{ base: '8', md: '12' }}>
        <Text>Loading profile...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={{ base: '8', md: '12' }}>
      <Stack spacing="8">
        <Heading size="lg">Profile & Preferences</Heading>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <Heading size="md">Personal Information</Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing="6">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="6">
                <FormControl>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={emailAddress} isReadOnly bg="gray.50" />
                <Text fontSize="sm" color="gray.500" mt="1">
                  Email cannot be changed
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                />
              </FormControl>
            </Stack>
          </CardBody>
        </Card>

        {/* Search Preferences */}
        <Card>
          <CardHeader>
            <Heading size="md">Search Preferences</Heading>
            <Text fontSize="sm" color="gray.500" mt="1">
              Customize your scholarship search criteria
            </Text>
          </CardHeader>
          <CardBody>
            <Stack spacing="6">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="6">
                <FormControl>
                  <FormLabel>Target Type</FormLabel>
                  <Select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    placeholder="Select target type"
                  >
                    {TARGET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Academic Level</FormLabel>
                  <Select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    placeholder="Select academic level"
                  >
                    {ACADEMIC_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="6">
                <FormControl>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder="Select gender"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Ethnicity</FormLabel>
                  <Select
                    value={ethnicity}
                    onChange={(e) => setEthnicity(e.target.value)}
                    placeholder="Select ethnicity"
                  >
                    {ETHNICITY_OPTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Minimum Award Amount ($)</FormLabel>
                <NumberInput
                  value={minAward}
                  onChange={(_, value) => setMinAward(value)}
                  min={0}
                >
                  <NumberInputField placeholder="Minimum award amount" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Subject Areas</FormLabel>
                <Wrap spacing="2" mb="3">
                  {subjectAreas.map((area) => (
                    <Tag key={area} size="md" colorScheme="blue">
                      <TagLabel>{area}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveSubjectArea(area)} />
                    </Tag>
                  ))}
                </Wrap>
                <Box display="flex" gap="2">
                  <Select
                    value={newSubjectArea}
                    onChange={(e) => setNewSubjectArea(e.target.value)}
                    placeholder="Select subject area to add"
                    flex="1"
                  >
                    {SUBJECT_AREAS.filter((area) => !subjectAreas.includes(area)).map(
                      (area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      )
                    )}
                  </Select>
                  <Button onClick={handleAddSubjectArea} isDisabled={!newSubjectArea}>
                    Add
                  </Button>
                </Box>
              </FormControl>

              <FormControl>
                <FormLabel>Geographic Restrictions</FormLabel>
                <Input
                  value={geographicRestrictions}
                  onChange={(e) => setGeographicRestrictions(e.target.value)}
                  placeholder="e.g., United States, California only"
                />
              </FormControl>

              <Stack>
                <Checkbox
                  isChecked={essayRequired}
                  onChange={(e) => setEssayRequired(e.target.checked)}
                >
                  Essay Required
                </Checkbox>
                <Checkbox
                  isChecked={recommendationRequired}
                  onChange={(e) => setRecommendationRequired(e.target.checked)}
                >
                  Recommendation Required
                </Checkbox>
              </Stack>
            </Stack>
          </CardBody>
        </Card>

        {/* Save Button */}
        <Box>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleSave}
            isLoading={saving}
            loadingText="Saving..."
          >
            Save Changes
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default Profile;

