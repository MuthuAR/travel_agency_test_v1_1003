import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Text,
  chakra,
} from '@chakra-ui/react';
import { GradientButton } from '../ui/GradientButton';
import { STATUS_LABELS, STATUS_ORDER, isStatus } from '../../lib/status';
import type { EnquiryFilters, EnquiryStatus } from '../../types';

const MONTH_NAMES: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface FilterFormValues {
  status: EnquiryStatus | '';
  year: string;
  month: string;
  date: string;
}

const EMPTY_VALUES: FilterFormValues = { status: '', year: '', month: '', date: '' };

/** Current year and the 3 before it, newest first. */
function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2, current - 3];
}

interface EnquiryFilterBarProps {
  onApply: (filters: EnquiryFilters) => void;
}

export function EnquiryFilterBar({ onApply }: EnquiryFilterBarProps) {
  const [values, setValues] = useState<FilterFormValues>(EMPTY_VALUES);
  const dateSelected = values.date !== '';

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const filters: EnquiryFilters = {};
    if (values.status) filters.status = values.status;
    if (values.date) {
      filters.date = values.date;
    } else {
      if (values.year) filters.year = Number(values.year);
      if (values.month) filters.month = Number(values.month);
    }
    onApply(filters);
  };

  const handleReset = (): void => {
    setValues(EMPTY_VALUES);
    onApply({});
  };

  const handleYear = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, year: value }));
  };

  const handleMonth = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, month: value }));
  };

  const handleDate = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setValues((prev) =>
      value ? { ...prev, date: value, year: '', month: '' } : { ...prev, date: '' },
    );
  };

  const handleStatus = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, status: isStatus(value) ? value : '' }));
  };

  return (
    <chakra.form onSubmit={handleSubmit} role="search" aria-label="Filter my enquiries" mb={6}>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4} alignItems="end">
        <FormControl>
          <FormLabel fontSize="sm">Year</FormLabel>
          <Select
            value={values.year}
            onChange={handleYear}
            isDisabled={dateSelected}
            bg="white"
            rounded="xl"
          >
            <option value="">All years</option>
            {yearOptions().map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Month</FormLabel>
          <Select
            value={values.month}
            onChange={handleMonth}
            isDisabled={dateSelected}
            bg="white"
            rounded="xl"
          >
            <option value="">All months</option>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={String(index + 1)}>
                {name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Date</FormLabel>
          <Input type="date" value={values.date} onChange={handleDate} bg="white" rounded="xl" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Status</FormLabel>
          <Select value={values.status} onChange={handleStatus} bg="white" rounded="xl">
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormControl>
        <SimpleGrid columns={2} spacing={2} gridColumn={{ base: 'auto', lg: 'span 2' }}>
          <GradientButton type="submit">Apply</GradientButton>
          <Button variant="outline" rounded="full" onClick={handleReset}>
            Reset
          </Button>
        </SimpleGrid>
      </SimpleGrid>
      <Text fontSize="sm" color="gray.600" mt={3}>
        Filters use the date you submitted the enquiry.
      </Text>
      {dateSelected && (
        <Text fontSize="sm" color="gray.600" mt={1}>
          A specific date overrides the year and month.
        </Text>
      )}
    </chakra.form>
  );
}
