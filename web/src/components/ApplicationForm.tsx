import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Container,
  Field,
  Input,
  Textarea,
  Stack,
  Heading,
  CardRoot,
  CardBody,
  CardHeader,
  Spinner,
  Text,
  HStack,
  Flex,
  Box,
  SimpleGrid,
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
  AccordionItemBody,
  AccordionItemIndicator,
  NativeSelectRoot,
  NativeSelectField,
  CheckboxRoot,
  CheckboxLabel,
  CheckboxControl,
  CheckboxHiddenInput,
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
        <Stack gap="8" align="center">
          <Spinner size="xl" />
          <Text>Loading application...</Text>
        </Stack>
      </Container>
    );
  }

  if (error && isEditMode) {
    return (
      <Container maxW="4xl" py={{ base: '8', md: '12' }}>
        <CardRoot>
          <CardBody>
            <Text color="red.500">{error}</Text>
            <Button mt="4" onClick={() => navigate('/applications')}>
              Back to Applications
            </Button>
          </CardBody>
        </CardRoot>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={{ base: '8', md: '12' }}>
      <CardRoot>
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
            <HStack gap="4">
              <Button
                type="submit"
                form="application-form"
                colorScheme="accent"
                loading={submitting}
                loadingText={isEditMode ? 'Updating...' : 'Creating...'}
              >
                {isEditMode ? 'Update' : 'Save'}
              </Button>
              <Button
                variant="outline"
                colorScheme="brand"
                onClick={() => navigate(isEditMode ? `/applications/${id}` : '/applications')}
                disabled={submitting}
              >
                Cancel
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <form id="application-form" onSubmit={handleSubmit}>
            <AccordionRoot
              multiple
              defaultValue={['basic', 'status', 'award', 'requirements', 'links']}
            >
              {/* Basic Information Section */}
              <AccordionItem value="basic" border="none">
                <AccordionItemTrigger px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Basic Information
                  </Heading>
                  <AccordionItemIndicator fontSize="xl" color="brand.700" />
                </AccordionItemTrigger>
                <AccordionItemContent>
                <AccordionItemBody pb="8" px="0">
                <Stack gap="4">
                  {/* Scholarship Name - Required */}
                  <Field.Root required>
                    <Field.Label>Scholarship Name</Field.Label>
                    <Input
                      value={scholarshipName}
                      onChange={(e) => setScholarshipName(e.target.value)}
                      placeholder="Enter scholarship name"
                    />
                  </Field.Root>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    {/* Organization */}
                    <Field.Root>
                      <Field.Label>Organization</Field.Label>
                      <Input
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g., Gates Foundation"
                      />
                    </Field.Root>

                    {/* Platform */}
                    <Field.Root>
                      <Field.Label>Platform</Field.Label>
                      <Input
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        placeholder="e.g., Common App, ScholarshipOwl"
                      />
                    </Field.Root>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    {/* Target Type */}
                    <Field.Root>
                      <Field.Label>Scholarship Type</Field.Label>
                      <NativeSelectRoot>
                      <NativeSelectField
                        value={targetType}
                        onChange={(e) => setTargetType(e.currentTarget.value)}
                        placeholder="Select type"
                      >
                        {TARGET_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </NativeSelectField>
                      </NativeSelectRoot>
                    </Field.Root>

                    {/* Theme/Focus */}
                    <Field.Root>
                      <Field.Label>Theme/Focus Area</Field.Label>
                      <Input
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="e.g., STEM, Community Service"
                      />
                    </Field.Root>
                  </SimpleGrid>
                </Stack>
                </AccordionItemBody>
                </AccordionItemContent>
              </AccordionItem>

              {/* Status & Tracking Section */}
              <AccordionItem value="status" border="none">
                <AccordionItemTrigger px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Status & Tracking
                  </Heading>
                  <AccordionItemIndicator fontSize="xl" color="brand.700" />
                </AccordionItemTrigger>
                <AccordionItemContent>
                <AccordionItemBody pb="8" px="0">
                <Stack gap="4">
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    {/* Status - Required */}
                    <Field.Root required>
                      <Field.Label>Status</Field.Label>
                      <NativeSelectRoot>
                      <NativeSelectField
                        value={status}
                        onChange={(e) => setStatus(e.currentTarget.value)}
                      >
                        {APPLICATION_STATUSES.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </NativeSelectField>
                      </NativeSelectRoot>
                    </Field.Root>

                    {/* Current Action */}
                    <Field.Root>
                      <Field.Label>Current Action Needed</Field.Label>
                      <Input
                        value={currentAction}
                        onChange={(e) => setCurrentAction(e.target.value)}
                        placeholder="e.g., Writing essay"
                      />
                    </Field.Root>
                  </SimpleGrid>
                </Stack>
                </AccordionItemBody>
                </AccordionItemContent>
              </AccordionItem>

              {/* Award & Dates Section */}
              <AccordionItem value="award" border="none">
                <AccordionItemTrigger px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Award & Important Dates
                  </Heading>
                  <AccordionItemIndicator fontSize="xl" color="brand.700" />
                </AccordionItemTrigger>
                <AccordionItemContent>
                <AccordionItemBody pb="8" px="0">
                <Stack gap="4">
                  {/* Award Amounts */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    <Field.Root>
                      <Field.Label>Min Award ($)</Field.Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={minAward ?? ''}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          setMinAward(v === '' ? undefined : Number(v));
                        }}
                        placeholder="0"
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Max Award ($)</Field.Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={maxAward ?? ''}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          setMaxAward(v === '' ? undefined : Number(v));
                        }}
                        placeholder="0"
                      />
                    </Field.Root>
                  </SimpleGrid>

                  {/* Dates */}
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                    <Field.Root>
                      <Field.Label>Open Date</Field.Label>
                      <Input
                        type="date"
                        value={openDate}
                        onChange={(e) => setOpenDate(e.target.value)}
                      />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label>Due Date</Field.Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Submission Date (Optional)</Field.Label>
                      <Input
                        type="date"
                        value={submissionDate}
                        onChange={(e) => setSubmissionDate(e.target.value)}
                      />
                    </Field.Root>
                  </SimpleGrid>
                </Stack>
                </AccordionItemBody>
                </AccordionItemContent>
              </AccordionItem>

              {/* Requirements & Renewable Section */}
              <AccordionItem value="requirements" border="none">
                <AccordionItemTrigger px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Requirements & Eligibility
                  </Heading>
                  <AccordionItemIndicator fontSize="xl" color="brand.700" />
                </AccordionItemTrigger>
                <AccordionItemContent>
                <AccordionItemBody pb="8" px="0">
                <Stack gap="4">
                  {/* Requirements */}
                  <Field.Root>
                    <Field.Label>Requirements</Field.Label>
                    <Textarea
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="List any specific requirements (GPA, major, citizenship, etc.)"
                      rows={2}
                    />
                  </Field.Root>

                  {/* Renewable Information */}
                  <Box
                    p="4"
                    borderRadius="md"
                    bg="highlight.50"
                    border="1px solid"
                    borderColor="brand.200"
                  >
                    <Stack gap="3">
                      <CheckboxRoot
                        checked={renewable}
                        onCheckedChange={(details) => setRenewable(Boolean(details.checked))}
                      >
                        <CheckboxHiddenInput />
                        <CheckboxControl />
                        <CheckboxLabel fontWeight="semibold">
                          Renewable Scholarship
                        </CheckboxLabel>
                      </CheckboxRoot>

                      {renewable && (
                        <Field.Root>
                          <Field.Label>Renewal Terms</Field.Label>
                          <Input
                            value={renewableTerms}
                            onChange={(e) => setRenewableTerms(e.target.value)}
                            placeholder="Describe renewal requirements (GPA maintenance, continued enrollment, etc.)"
                            bg="white"
                          />
                        </Field.Root>
                      )}
                    </Stack>
                  </Box>
                </Stack>
                </AccordionItemBody>
                </AccordionItemContent>
              </AccordionItem>

              {/* Links & Resources Section */}
              <AccordionItem value="links" border="none">
                <AccordionItemTrigger px="0" py="4" _hover={{ bg: 'transparent' }}>
                  <Heading size="sm" flex="1" textAlign="left" color="brand.700">
                    Links & Resources
                  </Heading>
                  <AccordionItemIndicator fontSize="xl" color="brand.700" />
                </AccordionItemTrigger>
                <AccordionItemContent>
                <AccordionItemBody pb="8" px="0">
                <Stack gap="4">
                  <Field.Root>
                    <Field.Label>Organization Website</Field.Label>
                    <Input
                      type="url"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Application Portal Link</Field.Label>
                    <Input
                      type="url"
                      value={applicationLink}
                      onChange={(e) => setApplicationLink(e.target.value)}
                      placeholder="https://apply.example.com"
                    />
                    <Field.HelperText>Direct link to the application portal or form</Field.HelperText>
                  </Field.Root>
                </Stack>
                </AccordionItemBody>
                </AccordionItemContent>
              </AccordionItem>
            </AccordionRoot>
          </form>
        </CardBody>
      </CardRoot>
    </Container>
  );
}

export default ApplicationForm;
