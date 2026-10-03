import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
  chakra,
} from '@chakra-ui/react';
import { AnimatedInput } from '../ui/AnimatedInput';
import { GradientButton } from '../ui/GradientButton';
import { enquiryService } from '../../services/enquiryService';
import { getErrorMessage } from '../../lib/errors';
import { getFieldErrors } from '../../lib/fieldErrors';
import { buildLanguages, normalizeMobile } from '../../lib/validation';
import { PassengerFields } from './PassengerFields';
import {
  EMPTY_PASSENGER_VALUES,
  INITIAL_ENQUIRY_VALUES,
  MAX_EMPLOYEES,
  VEHICLE_OPTIONS,
  hasOrganizationErrors,
  parseAdditional,
  todayIso,
  totalTravellers,
  validateEnquiry,
  validateOrganizationEnquiry,
} from './enquiryValidation';
import type {
  EnquiryFormErrors,
  EnquiryFormValues,
  OrganizationEnquiryErrors,
  PassengerFormValues,
} from './enquiryValidation';
import type {
  AccountType,
  Enquiry,
  EnquiryCreatePayload,
  PassengerPayload,
} from '../../types';

interface EnquiryFormProps {
  onCreated: (enquiry: Enquiry) => void;
  /** Organisation accounts list employees instead of adults/kids counts. */
  accountType?: AccountType;
}

interface PassengerEntry {
  key: number;
  values: PassengerFormValues;
}

const EMPTY_ORGANIZATION_ERRORS: OrganizationEnquiryErrors = { base: {}, passengers: [] };

export function EnquiryForm({ onCreated, accountType = 'personal' }: EnquiryFormProps) {
  const isOrganization = accountType === 'organization';
  const nextKey = useRef<number>(1);
  const [values, setValues] = useState<EnquiryFormValues>(INITIAL_ENQUIRY_VALUES);
  const [passengers, setPassengers] = useState<PassengerEntry[]>([
    { key: 0, values: EMPTY_PASSENGER_VALUES },
  ]);
  const [additional, setAdditional] = useState<string>('0');
  const [orgErrors, setOrgErrors] = useState<OrganizationEnquiryErrors>(EMPTY_ORGANIZATION_ERRORS);
  const [errors, setErrors] = useState<EnquiryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const setField =
    (field: keyof EnquiryFormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const updatePassenger = (key: number, patch: Partial<PassengerFormValues>): void => {
    setPassengers((prev) =>
      prev.map((entry) =>
        entry.key === key ? { ...entry, values: { ...entry.values, ...patch } } : entry,
      ),
    );
    const index = passengers.findIndex((entry) => entry.key === key);
    if (index < 0) return;
    setOrgErrors((prev) => {
      const existing = prev.passengers[index];
      if (!existing) return prev;
      const current = { ...existing };
      if ('name' in patch) delete current.name;
      if ('mobile' in patch) delete current.mobile;
      if ('gender' in patch) delete current.gender;
      if ('languages' in patch || 'otherLanguages' in patch) delete current.spoken_languages;
      if ('communicationMediums' in patch) delete current.communication_mediums;
      const nextPassengers = prev.passengers.slice();
      nextPassengers[index] = current;
      return { ...prev, passengers: nextPassengers };
    });
  };

  const addPassenger = (): void => {
    if (passengers.length >= MAX_EMPLOYEES) return;
    const key = nextKey.current;
    nextKey.current += 1;
    setPassengers((prev) => [...prev, { key, values: EMPTY_PASSENGER_VALUES }]);
    setOrgErrors((prev) => ({ ...prev, total: undefined }));
  };

  const removePassenger = (key: number): void => {
    const index = passengers.findIndex((entry) => entry.key === key);
    if (index <= 0) return;
    setPassengers((prev) => prev.filter((entry) => entry.key !== key));
    setOrgErrors((prev) => ({
      ...prev,
      total: undefined,
      passengers: prev.passengers.filter((_, i) => i !== index),
    }));
  };

  const handleOrganizationSubmit = async (): Promise<void> => {
    const found = validateOrganizationEnquiry(
      values,
      passengers.map((entry) => entry.values),
      additional,
    );
    setErrors(found.base);
    setOrgErrors(found);
    if (hasOrganizationErrors(found)) return;

    const passengerPayload: PassengerPayload[] = [];
    for (const entry of passengers) {
      const gender = entry.values.gender;
      // validatePassenger guarantees a gender is selected.
      if (gender === '') return;
      passengerPayload.push({
        name: entry.values.name.trim(),
        mobile: normalizeMobile(entry.values.mobile),
        gender,
        spoken_languages: buildLanguages(entry.values.languages, entry.values.otherLanguages),
        communication_mediums: entry.values.communicationMediums,
      });
    }

    const payload: EnquiryCreatePayload = {
      start_date: values.start_date,
      end_date: values.end_date,
      pickup_location: values.pickup_location.trim(),
      drop_location: values.drop_location.trim(),
      travel_routes: values.travel_routes.trim(),
      vehicle_preference: values.vehicle_preference,
      passengers: passengerPayload,
      additional_travellers_count: parseAdditional(additional),
    };
    const others = values.others.trim();
    if (others) payload.others = others;

    setSubmitting(true);
    try {
      const created = await enquiryService.create(payload);
      onCreated(created);
    } catch (err: unknown) {
      const fieldErrors = getFieldErrors(err);
      const mapped: EnquiryFormErrors = {};
      (Object.keys(values) as Array<keyof EnquiryFormValues>).forEach((key) => {
        if (key === 'adults_count' || key === 'kids_count') return;
        const message = fieldErrors[key];
        if (message) mapped[key] = message;
      });
      const additionalError = fieldErrors.additional_travellers_count;
      const totalError = fieldErrors.passengers ?? fieldErrors.adults_count;
      if (Object.keys(mapped).length > 0 || additionalError || totalError) {
        setErrors(mapped);
        setOrgErrors({
          base: mapped,
          passengers: [],
          additional_travellers_count: additionalError,
          total: totalError,
        });
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);

    if (isOrganization) {
      await handleOrganizationSubmit();
      return;
    }

    const found = validateEnquiry(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload: EnquiryCreatePayload = {
      start_date: values.start_date,
      end_date: values.end_date,
      pickup_location: values.pickup_location.trim(),
      drop_location: values.drop_location.trim(),
      travel_routes: values.travel_routes.trim(),
      adults_count: Number(values.adults_count),
      kids_count: Number(values.kids_count),
      vehicle_preference: values.vehicle_preference,
    };
    const others = values.others.trim();
    if (others) payload.others = others;

    setSubmitting(true);
    try {
      const created = await enquiryService.create(payload);
      onCreated(created);
    } catch (err: unknown) {
      const fieldErrors = getFieldErrors(err);
      const mapped: EnquiryFormErrors = {};
      (Object.keys(values) as Array<keyof EnquiryFormValues>).forEach((key) => {
        const message = fieldErrors[key];
        if (message) mapped[key] = message;
      });
      if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const today = todayIso();
  const total = totalTravellers(passengers.length, additional);

  return (
    <chakra.form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        void handleSubmit(e);
      }}
      noValidate
      aria-label="New enquiry form"
    >
      <VStack spacing={5} align="stretch">
        {formError && (
          <Alert status="error" rounded="xl" role="alert">
            <AlertIcon />
            {formError}
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <AnimatedInput
            label="Start date"
            type="date"
            min={today}
            value={values.start_date}
            onChange={setField('start_date')}
            error={errors.start_date}
          />
          <AnimatedInput
            label="End date"
            type="date"
            min={values.start_date || today}
            value={values.end_date}
            onChange={setField('end_date')}
            error={errors.end_date}
          />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <AnimatedInput
            label="Pickup location"
            value={values.pickup_location}
            onChange={setField('pickup_location')}
            error={errors.pickup_location}
            maxLength={255}
          />
          <AnimatedInput
            label="Drop location"
            value={values.drop_location}
            onChange={setField('drop_location')}
            error={errors.drop_location}
            maxLength={255}
          />
        </SimpleGrid>

        <FormControl isInvalid={Boolean(errors.travel_routes)}>
          <FormLabel fontSize="sm">Travel routes</FormLabel>
          <Textarea
            value={values.travel_routes}
            onChange={setField('travel_routes')}
            rounded="xl"
            border="2px solid"
            borderColor="gray.200"
            bg="white"
            rows={4}
            placeholder="Cities or places you plan to visit, in order"
          />
          <FormErrorMessage>{errors.travel_routes}</FormErrorMessage>
        </FormControl>

        {isOrganization ? (
          <chakra.section aria-label="Travellers">
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Travellers
            </Text>
            <VStack spacing={4} align="stretch">
              {passengers.map((entry, index) => (
                <PassengerFields
                  key={entry.key}
                  index={index}
                  values={entry.values}
                  errors={orgErrors.passengers[index] ?? {}}
                  onChange={(patch) => updatePassenger(entry.key, patch)}
                  onRemove={index > 0 ? () => removePassenger(entry.key) : undefined}
                  disabled={submitting}
                />
              ))}
              <Box>
                <Button
                  type="button"
                  variant="outline"
                  rounded="full"
                  onClick={addPassenger}
                  isDisabled={submitting || passengers.length >= MAX_EMPLOYEES}
                >
                  Add another employee
                </Button>
              </Box>
              <Box>
                <AnimatedInput
                  label="Additional travellers (count only)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={additional}
                  onChange={(e) => {
                    setAdditional(e.target.value);
                    setOrgErrors((prev) => ({
                      ...prev,
                      additional_travellers_count: undefined,
                      total: undefined,
                    }));
                  }}
                  error={orgErrors.additional_travellers_count}
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Travellers whose details you are not entering above. Do not include the employees
                  listed above.
                </Text>
              </Box>
              <Text fontWeight="semibold" aria-live="polite">{`Total travellers: ${total}`}</Text>
              {orgErrors.total && (
                <Text role="alert" color="red.500" fontSize="sm">
                  {orgErrors.total}
                </Text>
              )}
            </VStack>
          </chakra.section>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            <AnimatedInput
              label="Adults"
              type="number"
              min={0}
              step={1}
              value={values.adults_count}
              onChange={setField('adults_count')}
              error={errors.adults_count}
            />
            <AnimatedInput
              label="Kids"
              type="number"
              min={0}
              step={1}
              value={values.kids_count}
              onChange={setField('kids_count')}
              error={errors.kids_count}
            />
          </SimpleGrid>
        )}

        <FormControl isInvalid={Boolean(errors.vehicle_preference)}>
          <FormLabel fontSize="sm">Vehicle preference</FormLabel>
          <Select
            value={values.vehicle_preference}
            onChange={setField('vehicle_preference')}
            rounded="xl"
            border="2px solid"
            borderColor="gray.200"
            bg="white"
          >
            {VEHICLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <FormErrorMessage>{errors.vehicle_preference}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={Boolean(errors.others)}>
          <FormLabel fontSize="sm">Others (optional)</FormLabel>
          <Textarea
            value={values.others}
            onChange={setField('others')}
            rounded="xl"
            border="2px solid"
            borderColor="gray.200"
            bg="white"
            rows={3}
            placeholder="Anything else we should know"
          />
          <FormErrorMessage>{errors.others}</FormErrorMessage>
        </FormControl>

        <GradientButton type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit enquiry'}
        </GradientButton>
      </VStack>
    </chakra.form>
  );
}
