import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { IDLE_NOTICE, setLoginNotice } from '../../lib/sessionNotice';
import { SessionTimeoutDialog } from './SessionTimeoutDialog';

/**
 * Applies the idle-timeout policy for customers. Renders nothing for admins
 * (idle_timeout_minutes null/undefined) or when nobody is signed in.
 */
export function SessionTimeoutManager() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const idleMinutes = user?.idle_timeout_minutes ?? null;

  const signOut = useCallback(
    async (notice?: string): Promise<void> => {
      if (notice) setLoginNotice(notice);
      await logout();
      navigate('/login', { replace: true });
    },
    [logout, navigate],
  );

  const handleIdleExpire = useCallback((): void => {
    void signOut(IDLE_NOTICE);
  }, [signOut]);

  const handleTokensRemoved = useCallback((): void => {
    void signOut();
  }, [signOut]);

  const { secondsLeft, stayActive } = useSessionTimeout({
    idleMinutes,
    onIdleExpire: handleIdleExpire,
    onKeepAlive: refresh,
    onTokensRemoved: handleTokensRemoved,
  });

  if (idleMinutes === null || secondsLeft === null) return null;

  return (
    <SessionTimeoutDialog
      secondsLeft={secondsLeft}
      onStay={stayActive}
      onSignOut={() => void signOut()}
    />
  );
}
