import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Select,
  SimpleGrid,
  Text,
  VStack,
  chakra,
} from '@chakra-ui/react';
import { AnimatedInput } from '../ui/AnimatedInput';
import { GlassCard } from '../ui/GlassCard';
import {
  COMMON_LANGUAGES,
  GENDER_OPTIONS,
  MEDIUM_OPTIONS,
  isCommunicationMedium,
  isGender,
  normalizeMediums,
} from '../../lib/validation';
import type { PassengerErrors, PassengerFormValues } from './enquiryValidation';

interface PassengerFieldsProps {
  /** Zero-based position of the employee in the list. */
  index: number;
  values: PassengerFormValues;
  errors: PassengerErrors;
  onChange: (patch: Partial<PassengerFormValues>) => void;
  /** Provided for every card except the first (the booking contact). */
  onRemove?: () => void;
  disabled?: boolean;
}

/** One employee card: name, mobile, gender, spoken languages and communication preference. */
export function PassengerFields({
  index,
  values,
  errors,
  onChange,
  onRemove,
  disabled = false,
}: PassengerFieldsProps) {
  const position = index + 1;

  return (
    <GlassCard
      whileHover={{ scale: 1.0, y: 0 }}
      p={4}
      role="group"
      aria-label={`Employee ${position}`}
    >
      <Flex justify="space-between" align="center" gap={3} mb={3}>
        <Text fontWeight="semibold">
          Employee {position}
          {index === 0 ? ' (booking contact)' : ''}
        </Text>
        {onRemove && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            colorScheme="red"
            rounded="full"
            onClick={onRemove}
            isDisabled={disabled}
            aria-label={`Remove employee ${position}`}
          >
            Remove
          </Button>
        )}
      </Flex>

      <VStack spacing={4} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <AnimatedInput
            label="Name"
            autoComplete="off"
            maxLength={100}
            value={values.name}
            disabled={disabled}
            onChange={(e) => onChange({ name: e.target.value })}
            error={errors.name}
          />
          <AnimatedInput
            label="Mobile number"
            type="tel"
            autoComplete="off"
            value={values.mobile}
            disabled={disabled}
            onChange={(e) => onChange({ mobile: e.target.value })}
            error={errors.mobile}
          />
        </SimpleGrid>

        <FormControl isInvalid={Boolean(errors.gender)} isDisabled={disabled}>
          <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
            Gender
          </FormLabel>
          <Select
            placeholder="Select gender"
            rounded="xl"
            bg="white"
            value={values.gender}
            onChange={(e) => onChange({ gender: isGender(e.target.value) ? e.target.value : '' })}
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FormErrorMessage>{errors.gender}</FormErrorMessage>
        </FormControl>

        <chakra.fieldset border="none" p={0} m={0} minW={0} disabled={disabled}>
          <chakra.legend fontSize="sm" fontWeight="medium" mb={2}>
            Spoken languages
          </chakra.legend>
          <CheckboxGroup
            value={values.languages}
            onChange={(selected) => onChange({ languages: selected.map(String) })}
          >
            <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={2}>
              {COMMON_LANGUAGES.map((language) => (
                <Checkbox key={language} value={language} isDisabled={disabled}>
                  {language}
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
          <Box mt={3}>
            <AnimatedInput
              label="Other languages (comma separated)"
              value={values.otherLanguages}
              disabled={disabled}
              onChange={(e) => onChange({ otherLanguages: e.target.value })}
            />
          </Box>
          {errors.spoken_languages && (
            <Text role="alert" color="red.500" fontSize="sm" mt={1}>
              {errors.spoken_languages}
            </Text>
          )}
        </chakra.fieldset>

        <chakra.fieldset border="none" p={0} m={0} minW={0} disabled={disabled}>
          <chakra.legend fontSize="sm" fontWeight="medium" mb={2}>
            Communication preference
          </chakra.legend>
          <CheckboxGroup
            value={values.communicationMediums}
            onChange={(selected) =>
              onChange({
                communicationMediums: normalizeMediums(
                  selected.map(String).filter(isCommunicationMedium),
                ),
              })
            }
          >
            <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={2}>
              {MEDIUM_OPTIONS.map((option) => (
                <Checkbox key={option.value} value={option.value} isDisabled={disabled}>
                  {option.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
          {errors.communication_mediums && (
            <Text role="alert" color="red.500" fontSize="sm" mt={1}>
              {errors.communication_mediums}
            </Text>
          )}
        </chakra.fieldset>
      </VStack>
    </GlassCard>
  );
}
