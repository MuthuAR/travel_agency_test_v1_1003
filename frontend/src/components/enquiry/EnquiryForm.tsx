import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Alert,
  AlertIcon,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Select,
  SimpleGrid,
  Textarea,
  VStack,
  chakra,
} from '@chakra-ui/react';
import { AnimatedInput } from '../ui/AnimatedInput';
import { GradientButton } from '../ui/GradientButton';
import { enquiryService } from '../../services/enquiryService';
import { getErrorMessage } from '../../lib/errors';
import { getFieldErrors } from '../../lib/fieldErrors';
import {
  INITIAL_ENQUIRY_VALUES,
  VEHICLE_OPTIONS,
  todayIso,
  validateEnquiry,
} from './enquiryValidation';
import type { EnquiryFormErrors, EnquiryFormValues } from './enquiryValidation';
import type { Enquiry, EnquiryCreatePayload } from '../../types';

interface EnquiryFormProps {
  onCreated: (enquiry: Enquiry) => void;
}

export function EnquiryForm({ onCreated }: EnquiryFormProps) {
  const [values, setValues] = useState<EnquiryFormValues>(INITIAL_ENQUIRY_VALUES);
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);

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
