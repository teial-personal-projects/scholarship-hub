import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Stack,
  Heading,
  useToast,
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
} from '@chakra-ui/react';
import { apiGet, apiPost, apiPatch } from '../services/api';
import type { ApplicationResponse } from '@scholarship-hub/shared';
import { APPLICATION_STATUSES, TARGET_TYPES } from '@scholarship-hub/shared';

function ApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
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
  const [documentInfoLink, setDocumentInfoLink] = useState('');
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
        setDocumentInfoLink(data.documentInfoLink || '');
        setCurrentAction(data.currentAction || '');
        setStatus(data.status);
        setTargetType(data.targetType || '');
        setSubmissionDate(data.submissionDate ? data.submissionDate.split('T')[0] : '');
        setOpenDate(data.openDate ? data.openDate.split('T')[0] : '');
        setDueDate(data.dueDate ? data.dueDate.split('T')[0] : '');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load application';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [id, isEditMode, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!scholarshipName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Scholarship name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Due date is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
        documentInfoLink: documentInfoLink.trim() || null,
        currentAction: currentAction.trim() || null,
        status,
        targetType: targetType || null,
        submissionDate: submissionDate || null,
        openDate: openDate || null,
        dueDate,
      };

      if (isEditMode) {
        await apiPatch(`/applications/${id}`, payload);
        toast({
          title: 'Success',
          description: 'Application updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate(`/applications/${id}`);
      } else {
        const created = await apiPost<ApplicationResponse>('/applications', payload);
        toast({
          title: 'Success',
          description: 'Application created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate(`/applications/${created.id}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save application';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
        <CardHeader>
          <Heading size="lg">
            {isEditMode ? 'Edit Application' : 'New Application'}
          </Heading>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <Stack spacing="6">
              {/* Scholarship Name - Required */}
              <FormControl isRequired>
                <FormLabel>Scholarship Name</FormLabel>
                <Input
                  value={scholarshipName}
                  onChange={(e) => setScholarshipName(e.target.value)}
                  placeholder="Enter scholarship name"
                />
              </FormControl>

              {/* Organization */}
              <FormControl>
                <FormLabel>Organization</FormLabel>
                <Input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g., Gates Foundation"
                />
              </FormControl>

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

              {/* Award Amounts */}
              <HStack spacing="4" align="start">
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
              </HStack>

              {/* Dates */}
              <HStack spacing="4" align="start">
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
              </HStack>

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

              {/* Links */}
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
                <FormLabel>Application Link</FormLabel>
                <Input
                  type="url"
                  value={applicationLink}
                  onChange={(e) => setApplicationLink(e.target.value)}
                  placeholder="https://apply.example.com"
                />
                <FormHelperText>Link to the application portal or form</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Platform</FormLabel>
                <Input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g., Common App, ScholarshipOwl"
                />
              </FormControl>

              {/* Theme/Focus */}
              <FormControl>
                <FormLabel>Theme/Focus Area</FormLabel>
                <Input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., STEM, Community Service, Leadership"
                />
              </FormControl>

              {/* Requirements */}
              <FormControl>
                <FormLabel>Requirements</FormLabel>
                <Textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="List any specific requirements (GPA, major, etc.)"
                  rows={4}
                />
              </FormControl>

              {/* Current Action */}
              <FormControl>
                <FormLabel>Current Action Needed</FormLabel>
                <Input
                  value={currentAction}
                  onChange={(e) => setCurrentAction(e.target.value)}
                  placeholder="e.g., Waiting for recommendations, Writing essay"
                />
              </FormControl>

              {/* Renewable */}
              <FormControl>
                <Checkbox
                  isChecked={renewable}
                  onChange={(e) => setRenewable(e.target.checked)}
                >
                  Renewable Scholarship
                </Checkbox>
              </FormControl>

              {renewable && (
                <FormControl>
                  <FormLabel>Renewable Terms</FormLabel>
                  <Textarea
                    value={renewableTerms}
                    onChange={(e) => setRenewableTerms(e.target.value)}
                    placeholder="Describe renewal requirements"
                    rows={3}
                  />
                </FormControl>
              )}

              {/* Document Info Link */}
              <FormControl>
                <FormLabel>Document Info Link</FormLabel>
                <Input
                  type="url"
                  value={documentInfoLink}
                  onChange={(e) => setDocumentInfoLink(e.target.value)}
                  placeholder="https://link-to-required-documents"
                />
                <FormHelperText>Link to information about required documents</FormHelperText>
              </FormControl>

              {/* Action Buttons */}
              <HStack spacing="4" pt="4">
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={submitting}
                  loadingText={isEditMode ? 'Updating...' : 'Creating...'}
                >
                  {isEditMode ? 'Update Application' : 'Create Application'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(isEditMode ? `/applications/${id}` : '/applications')}
                  isDisabled={submitting}
                >
                  Cancel
                </Button>
              </HStack>
            </Stack>
          </form>
        </CardBody>
      </Card>
    </Container>
  );
}

export default ApplicationForm;
