import {
  Box,
  Checkbox,
  CheckboxGroup,
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
import type { FieldErrors } from '../../lib/errors';
import {
  COMMON_LANGUAGES,
  GENDER_OPTIONS,
  MEDIUM_OPTIONS,
  isCommunicationMedium,
  isGender,
} from '../../lib/validation';
import type { ProfileFieldValues } from '../../lib/validation';

interface ProfileFieldsProps {
  values: ProfileFieldValues;
  errors: FieldErrors;
  onChange: (patch: Partial<ProfileFieldValues>) => void;
  disabled?: boolean;
}

/** Name, gender, languages, communication medium and address, shared by register and profile. */
export function ProfileFields({ values, errors, onChange, disabled = false }: ProfileFieldsProps) {
  return (
    <VStack spacing={4} align="stretch">
      <AnimatedInput
        label="Full name"
        autoComplete="name"
        value={values.name}
        disabled={disabled}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
      />

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

      <FormControl isInvalid={Boolean(errors.communication_medium)} isDisabled={disabled}>
        <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
          Preferred communication medium
        </FormLabel>
        <Select
          placeholder="Select medium"
          rounded="xl"
          bg="white"
          value={values.communicationMedium}
          onChange={(e) =>
            onChange({
              communicationMedium: isCommunicationMedium(e.target.value) ? e.target.value : '',
            })
          }
        >
          {MEDIUM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <FormErrorMessage>{errors.communication_medium}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={Boolean(errors.address)} isDisabled={disabled}>
        <FormLabel fontSize="sm" fontWeight="medium" mb={1}>
          Address
        </FormLabel>
        <Textarea
          rounded="xl"
          bg="white"
          autoComplete="street-address"
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
        <FormErrorMessage>{errors.address}</FormErrorMessage>
      </FormControl>
    </VStack>
  );
}
