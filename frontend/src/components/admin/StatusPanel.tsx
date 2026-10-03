import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  List,
  ListItem,
  Select,
  Text,
  useToast,
} from '@chakra-ui/react';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { StatusBadge } from '../enquiry/StatusBadge';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../lib/errors';
import { formatDate, formatDateTime } from '../../lib/format';
import {
  ADMIN_SETTABLE_STATUSES,
  STATUS_LABELS,
  isSettableStatus,
  statusLabel,
} from '../../lib/status';
import type { AdminEnquiry, AdminSettableStatus, StatusHistoryEntry } from '../../types';

interface StatusPanelProps {
  enquiry: AdminEnquiry;
  /** Called with the full enquiry returned by the status update. */
  onUpdated: (enquiry: AdminEnquiry) => void;
}

function historyLine(entry: StatusHistoryEntry): string {
  const from = entry.from_status ? statusLabel(entry.from_status) : STATUS_LABELS.new;
  const by = entry.changed_by_email ?? 'staff';
  return `${from} to ${statusLabel(entry.to_status)}, ${formatDateTime(entry.changed_at)}, by ${by}`;
}

export function StatusPanel({ enquiry, onUpdated }: StatusPanelProps) {
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<AdminSettableStatus | ''>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const options: AdminSettableStatus[] = ADMIN_SETTABLE_STATUSES.filter(
    (s) => s !== enquiry.status,
  );
  const history: StatusHistoryEntry[] = [...(enquiry.status_history ?? [])].reverse();

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setSelected(isSettableStatus(value) ? value : '');
  };

  const submit = async (status: AdminSettableStatus): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminService.updateStatus(enquiry.id, status);
      onUpdated(updated);
      setSelected('');
      toast({
        title: `Status updated to ${STATUS_LABELS[status]}`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = (): void => {
    if (selected === '') return;
    if (selected === 'cancelled') {
      setConfirmOpen(true);
      return;
    }
    void submit(selected);
  };

  const handleConfirmCancel = (): void => {
    setConfirmOpen(false);
    void submit('cancelled');
  };

  return (
    <GlassCard whileHover={{ scale: 1.0, y: 0 }} aria-label="Status">
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Status
      </Text>
      <Flex align="center" gap={3} mb={4} wrap="wrap">
        <Text color="gray.600">Current status</Text>
        <StatusBadge status={enquiry.status} />
      </Flex>
      {error && (
        <Alert status="error" rounded="xl" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      <Flex gap={4} align="end" wrap="wrap">
        <FormControl maxW="xs">
          <FormLabel fontSize="sm">Change status to</FormLabel>
          <Select value={selected} onChange={handleChange} bg="white" rounded="xl">
            <option value="">Select a status</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormControl>
        <GradientButton type="button" onClick={handleUpdate} disabled={selected === '' || submitting}>
          {submitting ? 'Updating...' : 'Update status'}
        </GradientButton>
      </Flex>

      <Divider my={6} />
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          Status history
        </Text>
        <List spacing={1}>
          {history.map((entry) => (
            <ListItem key={entry.id}>{historyLine(entry)}</ListItem>
          ))}
          <ListItem>{`Submitted, ${formatDate(enquiry.created_at)}`}</ListItem>
        </List>
      </Box>

      <AlertDialog
        isOpen={confirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setConfirmOpen(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Cancel this enquiry?
            </AlertDialogHeader>
            <AlertDialogBody>
              The customer will see this enquiry as Cancelled. You can change the status again
              later.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={() => setConfirmOpen(false)}>
                Go back
              </Button>
              <Button colorScheme="red" onClick={handleConfirmCancel}>
                Yes, cancel enquiry
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </GlassCard>
  );
}
