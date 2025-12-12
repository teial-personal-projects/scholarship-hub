import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Stack,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Text,
  HStack,
  Checkbox,
  NumberInput,
  NumberInputField,
  FormHelperText,
  Flex,
  Box,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { apiGet, apiPost, apiPatch } from '../services/api';
import type { ApplicationResponse } from '@scholarship-hub/shared';
import { APPLICATION_STATUSES, TARGET_TYPES } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function ApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToastHelpers();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [scholarshipName, setScholarshipName] = useState('');
  const [organization, setOrganization] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [platform, setPlatform] = useState('');
  const [applicationLink, setApplicationLink] = useState('');
  const [theme, setTheme] = useState('');
  const [minAward, setMinAward] = useState<number | undefined>();
  const [maxAward, setMaxAward] = useState<number | undefined>();
  const [requirements, setRequirements] = useState('');
  const [renewable, setRenewable] = useState(false);
  const [renewableTerms, setRenewableTerms] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [status, setStatus] = useState<string>('Not Started');
  const [targetType, setTargetType] = useState<string>('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    async function fetchApplication() {
      if (!isEditMode) return;

      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ApplicationResponse>(`/applications/${id}`);

        // Populate form fields
        setScholarshipName(data.scholarshipName);
        setOrganization(data.organization || '');
        setOrgWebsite(data.orgWebsite || '');
        setPlatform(data.platform || '');
        setApplicationLink(data.applicationLink || '');
        setTheme(data.theme || '');
        setMinAward(data.minAward || undefined);
        setMaxAward(data.maxAward || undefined);
        setRequirements(data.requirements || '');
        setRenewable(data.renewable || false);
        setRenewableTerms(data.renewableTerms || '');
        setCurrentAction(data.currentAction || '');
        setStatus(data.status);
        setTargetType(data.targetType || '');
        setSubmissionDate(data.submissionDate ? data.submissionDate.split('T')[0] : '');
        setOpenDate(data.openDate ? data.openDate.split('T')[0] : '');
        setDueDate(data.dueDate ? data.dueDate.split('T')[0] : '');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load application';
        setError(errorMessage);
        showError('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [id, isEditMode, showError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!scholarshipName.trim()) {
      showError('Validation Error', 'Scholarship name is required', 3000);
      return;
    }

    if (!dueDate) {
      showError('Validation Error', 'Due date is required', 3000);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        scholarshipName: scholarshipName.trim(),
        organization: organization.trim() || null,
        orgWebsite: orgWebsite.trim() || null,
        platform: platform.trim() || null,
        applicationLink: applicationLink.trim() || null,
        theme: theme.trim() || null,
        minAward: minAward || null,
        maxAward: maxAward || null,
        requirements: requirements.trim() || null,
        renewable: renewable || null,
        renewableTerms: renewable ? renewableTerms.trim() || null : null,
        currentAction: currentAction.trim() || null,
        status,
        targetType: targetType || null,
        submissionDate: submissionDate || null,
        openDate: openDate || null,
        dueDate,
      };

      if (isEditMode) {
        await apiPatch(`/applications/${id}`, payload);
        showSuccess('Success', 'Application updated successfully', 3000);
        navigate(`/applications/${id}`);
      } else {
        const created = await apiPost<ApplicationResponse>('/applications', payload);
        showSuccess('Success', 'Application created successfully', 3000);
        navigate(`/applications/${created.id}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save application';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="4xl" py={{ base: '8', md: '12' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading application...</Text>
        </Stack>
      </Container>
    );
  }

  if (error && isEditMode) {
    return (
      <Container maxW="4xl" py={{ base: '8', md: '12' }}>
        <Card>
          <CardBody>
            <Text color="red.500">{error}</Text>
            <Button mt="4" onClick={() => navigate('/applications')}>
              Back to Applications
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={{ base: '8', md: '12' }}>
      <Card>
        <CardHeader
          position="sticky"
          top="64px"
          zIndex={10}
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          boxShadow="sm"
        >
          <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
            <Heading size="lg">
              {isEditMode ? 'Edit Application' : 'New Application'}
            </Heading>
            {/* Action Buttons at Top */}
            <HStack spacing="4">
              <Button
                type="submit"
                form="application-form"
                colorScheme="accent"
                isLoading={submitting}
                loadingText={isEditMode ? 'Updating...' : 'Creating...'}
              >
                {isEditMode ? 'Update' : 'Save'}
              </Button>
              <Button
                variant="outline"
                colorScheme="brand"
                onClick={() => navigate(isEditMode ? `/applications/${id}` : '/applications')}
                isDisabled={submitting}
              >
                Cancel
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <form id="application-form" onSubmit={handleSubmit}>
            <Accordion defaultIndex={[0, 1, 2, 3, 4]} allowMultiple>
              {/* Basic Information Section */}
              <AccordionItem border="none">
                <AccordionButton px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Basic Information
                  </Heading>
                  <AccordionIcon fontSize="xl" color="brand.700" />
                </AccordionButton>
                <AccordionPanel pb="8" px="0">
                <Stack spacing="4">
                  {/* Scholarship Name - Required */}
                  <FormControl isRequired>
                    <FormLabel>Scholarship Name</FormLabel>
                    <Input
                      value={scholarshipName}
                      onChange={(e) => setScholarshipName(e.target.value)}
                      placeholder="Enter scholarship name"
                    />
                  </FormControl>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                    {/* Organization */}
                    <FormControl>
                      <FormLabel>Organization</FormLabel>
                      <Input
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g., Gates Foundation"
                      />
                    </FormControl>

                    {/* Platform */}
                    <FormControl>
                      <FormLabel>Platform</FormLabel>
                      <Input
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        placeholder="e.g., Common App, ScholarshipOwl"
                      />
                    </FormControl>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                    {/* Target Type */}
                    <FormControl>
                      <FormLabel>Scholarship Type</FormLabel>
                      <Select
                        value={targetType}
                        onChange={(e) => setTargetType(e.target.value)}
                        placeholder="Select type"
                      >
                        {TARGET_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Theme/Focus */}
                    <FormControl>
                      <FormLabel>Theme/Focus Area</FormLabel>
                      <Input
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="e.g., STEM, Community Service"
                      />
                    </FormControl>
                  </SimpleGrid>
                </Stack>
                </AccordionPanel>
              </AccordionItem>

              {/* Status & Tracking Section */}
              <AccordionItem border="none">
                <AccordionButton px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Status & Tracking
                  </Heading>
                  <AccordionIcon fontSize="xl" color="brand.700" />
                </AccordionButton>
                <AccordionPanel pb="8" px="0">
                <Stack spacing="4">
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                    {/* Status - Required */}
                    <FormControl isRequired>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {APPLICATION_STATUSES.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Current Action */}
                    <FormControl>
                      <FormLabel>Current Action Needed</FormLabel>
                      <Input
                        value={currentAction}
                        onChange={(e) => setCurrentAction(e.target.value)}
                        placeholder="e.g., Writing essay"
                      />
                    </FormControl>
                  </SimpleGrid>
                </Stack>
                </AccordionPanel>
              </AccordionItem>

              {/* Award & Dates Section */}
              <AccordionItem border="none">
                <AccordionButton px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Award & Important Dates
                  </Heading>
                  <AccordionIcon fontSize="xl" color="brand.700" />
                </AccordionButton>
                <AccordionPanel pb="8" px="0">
                <Stack spacing="4">
                  {/* Award Amounts */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                    <FormControl>
                      <FormLabel>Min Award ($)</FormLabel>
                      <NumberInput
                        value={minAward}
                        onChange={(_, value) => setMinAward(isNaN(value) ? undefined : value)}
                        min={0}
                      >
                        <NumberInputField placeholder="0" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Max Award ($)</FormLabel>
                      <NumberInput
                        value={maxAward}
                        onChange={(_, value) => setMaxAward(isNaN(value) ? undefined : value)}
                        min={0}
                      >
                        <NumberInputField placeholder="0" />
                      </NumberInput>
                    </FormControl>
                  </SimpleGrid>

                  {/* Dates */}
                  <SimpleGrid columns={{ base: 1, md: status === 'Submitted' ? 3 : 2 }} spacing="4">
                    <FormControl>
                      <FormLabel>Open Date</FormLabel>
                      <Input
                        type="date"
                        value={openDate}
                        onChange={(e) => setOpenDate(e.target.value)}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Due Date</FormLabel>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </FormControl>
                    {/* Submission Date (if submitted) */}
                    {status === 'Submitted' && (
                      <FormControl>
                        <FormLabel>Submission Date</FormLabel>
                        <Input
                          type="date"
                          value={submissionDate}
                          onChange={(e) => setSubmissionDate(e.target.value)}
                        />
                      </FormControl>
                    )}
                  </SimpleGrid>
                </Stack>
                </AccordionPanel>
              </AccordionItem>

              {/* Requirements & Renewable Section */}
              <AccordionItem border="none">
                <AccordionButton px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Requirements & Eligibility
                  </Heading>
                  <AccordionIcon fontSize="xl" color="brand.700" />
                </AccordionButton>
                <AccordionPanel pb="8" px="0">
                <Stack spacing="4">
                  {/* Requirements */}
                  <FormControl>
                    <FormLabel>Requirements</FormLabel>
                    <Textarea
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="List any specific requirements (GPA, major, citizenship, etc.)"
                      rows={2}
                    />
                  </FormControl>

                  {/* Renewable Information */}
                  <Box
                    p="4"
                    borderRadius="md"
                    bg="highlight.50"
                    border="1px solid"
                    borderColor="brand.200"
                  >
                    <Stack spacing="3">
                      <FormControl>
                        <Checkbox
                          isChecked={renewable}
                          onChange={(e) => setRenewable(e.target.checked)}
                          fontWeight="semibold"
                        >
                          Renewable Scholarship
                        </Checkbox>
                      </FormControl>

                      {renewable && (
                        <FormControl>
                          <FormLabel>Renewal Terms</FormLabel>
                          <Input
                            value={renewableTerms}
                            onChange={(e) => setRenewableTerms(e.target.value)}
                            placeholder="Describe renewal requirements (GPA maintenance, continued enrollment, etc.)"
                            bg="white"
                          />
                        </FormControl>
                      )}
                    </Stack>
                  </Box>
                </Stack>
                </AccordionPanel>
              </AccordionItem>

              {/* Links & Resources Section */}
              <AccordionItem border="none">
                <AccordionButton px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Links & Resources
                  </Heading>
                  <AccordionIcon fontSize="xl" color="brand.700" />
                </AccordionButton>
                <AccordionPanel pb="8" px="0">
                <Stack spacing="4">
                  <FormControl>
                    <FormLabel>Organization Website</FormLabel>
                    <Input
                      type="url"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Application Portal Link</FormLabel>
                    <Input
                      type="url"
                      value={applicationLink}
                      onChange={(e) => setApplicationLink(e.target.value)}
                      placeholder="https://apply.example.com"
                    />
                    <FormHelperText>Direct link to the application portal or form</FormHelperText>
                  </FormControl>
                </Stack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </form>
        </CardBody>
      </Card>
    </Container>
  );
}

export default ApplicationForm;
