import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Text,
} from '@chakra-ui/react';
import { GradientButton } from '../ui/GradientButton';

interface SessionTimeoutDialogProps {
  secondsLeft: number;
  onStay: () => void;
  onSignOut: () => void;
}

/** Inactivity warning. Mount it only while the warning applies; only its buttons dismiss it. */
export function SessionTimeoutDialog({ secondsLeft, onStay, onSignOut }: SessionTimeoutDialogProps) {
  const signOutRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      isOpen
      isCentered
      leastDestructiveRef={signOutRef}
      onClose={onStay}
      closeOnEsc={false}
      closeOnOverlayClick={false}
    >
      <AlertDialogOverlay>
        <AlertDialogContent mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Are you still there?
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text role="timer" aria-live="polite">
              You will be signed out in {secondsLeft} {secondsLeft === 1 ? 'second' : 'seconds'}{' '}
              due to inactivity.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={signOutRef} variant="ghost" onClick={onSignOut}>
              Sign out now
            </Button>
            <GradientButton type="button" onClick={onStay}>
              Stay signed in
            </GradientButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
