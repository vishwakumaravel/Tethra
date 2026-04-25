import * as React from 'react';

import { useAuth } from '@/context/auth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Couple, Profile, RelationshipErrorCode, RelationshipState } from '@/types/database';

type RelationshipActionResult = {
  code?: RelationshipErrorCode;
  message?: string;
  ok: boolean;
};

type RelationshipError = {
  code: RelationshipErrorCode;
  message: string;
};

type RpcResult = {
  couple_id: string | null;
  error_code: RelationshipErrorCode | null;
  error_message: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
  ok: boolean;
  status: Couple['status'] | null;
  timezone: string | null;
};

type RelationshipContextValue = {
  cancelInvite: () => Promise<RelationshipActionResult>;
  couple: Couple | null;
  createInvite: (options?: { regenerate?: boolean }) => Promise<RelationshipActionResult>;
  endRelationship: () => Promise<RelationshipActionResult>;
  isLoading: boolean;
  lastError: RelationshipError | null;
  partnerProfile: Profile | null;
  refreshRelationship: () => Promise<void>;
  relationshipState: RelationshipState;
  joinByCode: (code: string) => Promise<RelationshipActionResult>;
};

const RelationshipContext = React.createContext<RelationshipContextValue | null>(null);

export function RelationshipProvider({ children }: { children: React.ReactNode }) {
  const { hasCompletedProfile, isReady, profile, refreshProfile, session } = useAuth();
  const [couple, setCouple] = React.useState<Couple | null>(null);
  const [partnerProfile, setPartnerProfile] = React.useState<Profile | null>(null);
  const [relationshipState, setRelationshipState] = React.useState<RelationshipState>('unlinked');
  const [lastError, setLastError] = React.useState<RelationshipError | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const resetRelationship = React.useCallback(() => {
    setCouple(null);
    setPartnerProfile(null);
    setRelationshipState('unlinked');
    setLastError(null);
    setIsLoading(false);
  }, []);

  const refreshRelationship = React.useCallback(async () => {
    if (!session?.user || !hasCompletedProfile) {
      resetRelationship();
      return;
    }

    setIsLoading(true);

    const userId = session.user.id;

    const { data: linkedCouple, error: linkedError } = await supabase
      .from('couples')
      .select('*')
      .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
      .eq('status', 'linked')
      .maybeSingle();

    if (linkedError) {
      setCouple(null);
      setPartnerProfile(null);
      setLastError({
        code: 'unknown',
        message: 'We could not refresh your relationship right now.',
      });
      setRelationshipState('link_error');
      setIsLoading(false);
      return;
    }

    if (linkedCouple) {
      const partnerId = linkedCouple.user_1_id === userId ? linkedCouple.user_2_id : linkedCouple.user_1_id;

      let nextPartner: Profile | null = null;

      if (partnerId) {
        const { data: partner, error: partnerError } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle();

        if (partnerError) {
          setLastError({
            code: 'unknown',
            message: 'Your relationship is linked, but your partner profile could not be loaded yet.',
          });
          setRelationshipState('link_error');
        } else {
          setLastError(null);
          setRelationshipState('linked');
          nextPartner = partner;
        }
      } else {
        setLastError({
          code: 'unknown',
          message: 'Your relationship data is incomplete. Refresh and try again.',
        });
        setRelationshipState('link_error');
      }

      setCouple(linkedCouple);
      setPartnerProfile(nextPartner);
      setIsLoading(false);
      return;
    }

    const { data: pendingCouple, error: pendingError } = await supabase
      .from('couples')
      .select('*')
      .eq('user_1_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingError) {
      setCouple(null);
      setPartnerProfile(null);
      setLastError({
        code: 'unknown',
        message: 'We could not refresh your invite state right now.',
      });
      setRelationshipState('link_error');
      setIsLoading(false);
      return;
    }

    setPartnerProfile(null);

    if (pendingCouple) {
      setCouple(pendingCouple);

      const isExpired =
        !pendingCouple.invite_code ||
        !pendingCouple.invite_expires_at ||
        new Date(pendingCouple.invite_expires_at).getTime() <= Date.now();

      if (isExpired) {
        setLastError({
          code: 'expired_code',
          message: 'Your last invite expired. Regenerate a new one when you are ready.',
        });
        setRelationshipState('link_error');
      } else {
        setLastError(null);
        setRelationshipState('invite_sent');
      }

      setIsLoading(false);
      return;
    }

    setCouple(null);
    setLastError(null);
    setRelationshipState('unlinked');
    setIsLoading(false);
  }, [hasCompletedProfile, resetRelationship, session?.user]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    void refreshRelationship();
  }, [isReady, profile?.current_couple_id, profile?.partner_status, refreshRelationship, session?.user?.id]);

  React.useEffect(() => {
    const userId = session?.user?.id;

    if (!userId || !hasCompletedProfile) {
      return;
    }

    const refreshLinkedState = () => {
      void refreshProfile();
      void refreshRelationship();
    };

    const channel = supabase
      .channel(`relationship:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', filter: `user_1_id=eq.${userId}`, schema: 'public', table: 'couples' },
        refreshLinkedState,
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `user_2_id=eq.${userId}`, schema: 'public', table: 'couples' },
        refreshLinkedState,
      )
      .on('postgres_changes', { event: '*', filter: `id=eq.${userId}`, schema: 'public', table: 'profiles' }, refreshLinkedState)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hasCompletedProfile, refreshProfile, refreshRelationship, session?.user?.id]);

  const createInvite = async ({ regenerate = false }: { regenerate?: boolean } = {}): Promise<RelationshipActionResult> => {
    const requestedTimezone = getDeviceTimezone();

    const { data, error } = await supabase.rpc('create_couple_invite', {
      regenerate,
      requested_timezone: requestedTimezone,
    });

    if (error) {
      const fallback = {
        code: 'unknown' as RelationshipErrorCode,
        message: 'We could not create an invite right now.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    const result = getRpcRow(data);

    if (!result) {
      const fallback = {
        code: 'unknown' as RelationshipErrorCode,
        message: 'We did not receive invite details back from the server.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    await refreshProfile();
    await refreshRelationship();

    if (!result.ok && result.error_code) {
      const nextError = {
        code: result.error_code,
        message: result.error_message ?? relationshipErrorMessage(result.error_code),
      };

      setLastError(nextError);
      setRelationshipState('link_error');
      return { ok: false, ...nextError };
    }

    void trackEvent('invite_created', {
      couple_id: result.couple_id,
      relationship_state: regenerate ? 'invite_regenerated' : 'invite_sent',
      timezone: result.timezone,
    });

    return {
      ok: true,
      code: result.error_code ?? undefined,
      message: result.error_message ?? (regenerate ? 'Invite regenerated.' : 'Invite created.'),
    };
  };

  const joinByCode = async (code: string): Promise<RelationshipActionResult> => {
    const normalizedCode = code.trim().toUpperCase();

    const { data, error } = await supabase.rpc('join_couple_by_code', {
      code: normalizedCode,
    });

    if (error) {
      const fallback = {
        code: 'unknown' as RelationshipErrorCode,
        message: 'We could not join that invite right now.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    const result = getRpcRow(data);

    if (!result) {
      const fallback = {
        code: 'unknown' as RelationshipErrorCode,
        message: 'We did not receive a join result back from the server.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    if (!result.ok || result.error_code) {
      const nextError = {
        code: result.error_code ?? 'unknown',
        message: result.error_message ?? relationshipErrorMessage(result.error_code ?? 'unknown'),
      };

      setLastError(nextError);
      setRelationshipState('link_error');
      return { ok: false, ...nextError };
    }

    await refreshProfile();
    await refreshRelationship();

    void trackEvent('invite_joined', {
      couple_id: result.couple_id,
      relationship_state: 'linked',
    });
    void trackEvent('couple_linked', {
      couple_id: result.couple_id,
      relationship_state: 'linked',
    });

    return {
      ok: true,
      message: 'You are linked. Your shared space is ready.',
    };
  };

  const cancelInvite = async (): Promise<RelationshipActionResult> => {
    const { data, error } = await supabase.rpc('cancel_pending_couple');

    if (error) {
      const fallback = {
        code: 'unknown' as RelationshipErrorCode,
        message: 'We could not cancel that invite right now.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    const result = getRpcRow(data);

    await refreshProfile();
    await refreshRelationship();

    if (!result || !result.ok) {
      const fallback = {
        code: result?.error_code ?? 'unknown',
        message: result?.error_message ?? 'There was no pending invite to cancel.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    return {
      ok: true,
      message: 'Invite canceled.',
    };
  };

  const endRelationship = async (): Promise<RelationshipActionResult> => {
    setIsLoading(true);

    const { data, error } = await supabase.rpc('end_current_relationship');

    if (error) {
      const fallback = {
        code: 'unknown' as RelationshipErrorCode,
        message: 'We could not reset this relationship right now.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      setIsLoading(false);
      return { ok: false, ...fallback };
    }

    const result = getEndRelationshipRpcRow(data);

    await refreshProfile();
    await refreshRelationship();
    setIsLoading(false);

    if (!result || !result.ok) {
      const fallback = {
        code: result?.error_code ?? 'unknown',
        message: result?.error_message ?? 'We could not reset this relationship right now.',
      };

      setLastError(fallback);
      setRelationshipState('link_error');
      return { ok: false, ...fallback };
    }

    return {
      ok: true,
      message: 'Relationship reset. Both accounts are unlinked.',
    };
  };

  const value = React.useMemo<RelationshipContextValue>(
    () => ({
      cancelInvite,
      couple,
      createInvite,
      endRelationship,
      isLoading,
      joinByCode,
      lastError,
      partnerProfile,
      refreshRelationship,
      relationshipState,
    }),
    [couple, isLoading, lastError, partnerProfile, refreshRelationship, relationshipState],
  );

  return <RelationshipContext.Provider value={value}>{children}</RelationshipContext.Provider>;
}

export function useRelationship() {
  const context = React.useContext(RelationshipContext);

  if (!context) {
    throw new Error('useRelationship must be used inside RelationshipProvider');
  }

  return context;
}

function getRpcRow(data: RpcResult[] | null) {
  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

function getEndRelationshipRpcRow(data: Array<{ error_code: RelationshipErrorCode | null; error_message: string | null; ok: boolean }> | null) {
  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function relationshipErrorMessage(code: RelationshipErrorCode) {
  switch (code) {
    case 'already_linked':
      return 'This account is already linked to a partner.';
    case 'expired_code':
      return 'That invite code has expired.';
    case 'invalid_code':
      return 'That invite code is not valid.';
    case 'invite_exists':
      return 'You already have an active invite.';
    case 'removed_code':
      return 'That invite code is no longer active.';
    case 'reused_code':
      return 'That invite code has already been used.';
    case 'self_join':
      return 'You cannot join your own invite code.';
    default:
      return 'We hit an unexpected relationship error.';
  }
}
