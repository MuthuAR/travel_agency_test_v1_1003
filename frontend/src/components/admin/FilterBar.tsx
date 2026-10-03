import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button, FormControl, FormLabel, Input, Select, SimpleGrid, chakra } from '@chakra-ui/react';
import { GradientButton } from '../ui/GradientButton';
import type { EnquiryStatus } from '../../types';

export interface EnquiryFilterValues {
  status: EnquiryStatus | '';
  search: string;
  start_date_from: string;
  start_date_to: string;
}

export const EMPTY_FILTERS: EnquiryFilterValues = {
  status: '',
  search: '',
  start_date_from: '',
  start_date_to: '',
};

const STATUS_OPTIONS: EnquiryStatus[] = ['new', 'contacted', 'confirmed', 'cancelled', 'closed'];

function isStatus(value: string): value is EnquiryStatus {
  return STATUS_OPTIONS.some((s) => s === value);
}

interface FilterBarProps {
  initial: EnquiryFilterValues;
  onApply: (filters: EnquiryFilterValues) => void;
}

export function FilterBar({ initial, onApply }: FilterBarProps) {
  const [values, setValues] = useState<EnquiryFilterValues>(initial);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onApply({ ...values, search: values.search.trim() });
  };

  const handleReset = (): void => {
    setValues(EMPTY_FILTERS);
    onApply(EMPTY_FILTERS);
  };

  const setText =
    (field: 'search' | 'start_date_from' | 'start_date_to') =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleStatus = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, status: isStatus(value) ? value : '' }));
  };

  return (
    <chakra.form onSubmit={handleSubmit} role="search" aria-label="Filter enquiries" mb={6}>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={4} alignItems="end">
        <FormControl>
          <FormLabel fontSize="sm">Status</FormLabel>
          <Select value={values.status} onChange={handleStatus} bg="white" rounded="xl">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Search</FormLabel>
          <Input
            value={values.search}
            onChange={setText('search')}
            placeholder="Name, organization, mobile, location"
            bg="white"
            rounded="xl"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Start date from</FormLabel>
          <Input
            type="date"
            value={values.start_date_from}
            onChange={setText('start_date_from')}
            bg="white"
            rounded="xl"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Start date to</FormLabel>
          <Input
            type="date"
            value={values.start_date_to}
            onChange={setText('start_date_to')}
            bg="white"
            rounded="xl"
          />
        </FormControl>
        <SimpleGrid columns={2} spacing={2}>
          <GradientButton type="submit">Apply</GradientButton>
          <Button variant="outline" rounded="full" onClick={handleReset}>
            Reset
          </Button>
        </SimpleGrid>
      </SimpleGrid>
    </chakra.form>
  );
}
