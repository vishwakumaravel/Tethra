import * as React from 'react';

import { useAuth } from '@/context/auth';
import { useRelationship } from '@/context/relationship';
import { getCoupleLocalDay } from '@/logic/coupleDay';
import { getTodayStatus } from '@/logic/dailyLoop';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import {
  DailyCheckIn,
  DailyLoopErrorCode,
  DailyPrediction,
  DailyReaction,
  DailyReactionErrorCode,
  DailyReveal,
  DailyStatus,
} from '@/types/database';
import { DailyCheckInFormValues, DailyPredictionFormValues, DailyReactionFormValues } from '@/validation/forms';

type DailyLoopActionResult = {
  ok: boolean;
  code?: DailyLoopErrorCode | DailyReactionErrorCode;
  message?: string;
};

type TodayReveal = DailyReveal & {
  viewedByCurrentUser: boolean;
};

type PartnerActivity = {
  detail: string;
  label: string;
};

type DailyLoopContextValue = {
  currentUserCheckIn: DailyCheckIn | null;
  currentUserPrediction: DailyPrediction | null;
  currentUserReaction: DailyReaction | null;
  currentTier: string;
  error: string | null;
  isLoading: boolean;
  localDay: string | null;
  markRevealViewed: () => Promise<DailyLoopActionResult>;
  pairedDaysCount: number;
  partnerActivity: PartnerActivity[];
  partnerCheckIn: DailyCheckIn | null;
  partnerPrediction: DailyPrediction | null;
  partnerReaction: DailyReaction | null;
  relationshipScore: number;
  refreshToday: () => Promise<void>;
  saveCheckIn: (values: DailyCheckInFormValues) => Promise<DailyLoopActionResult>;
  savePrediction: (values: DailyPredictionFormValues) => Promise<DailyLoopActionResult>;
  saveReaction: (values: DailyReactionFormValues) => Promise<DailyLoopActionResult>;
  streak: {
    current: number;
    longest: number;
  };
  todayCheckIns: DailyCheckIn[];
  todayPredictions: DailyPrediction[];
  todayReactions: DailyReaction[];
  todayReveal: TodayReveal | null;
  todayStatus: DailyStatus;
  xp: number;
};

type DailyLoopRpcResult = {
  current_streak: number;
  error_code: DailyLoopErrorCode | null;
  error_message: string | null;
  longest_streak: number;
  ok: boolean;
  reveal_created: boolean;
  submitted_local_day: string;
};

type MarkRevealRpcResult = {
  error_code: DailyLoopErrorCode | null;
  error_message: string | null;
  ok: boolean;
};

type DailyReactionRpcResult = {
  current_tier: string;
  error_code: DailyReactionErrorCode | null;
  error_message: string | null;
  note_saved: boolean;
  ok: boolean;
  relationship_score: number;
  total_xp: number;
  xp_awarded: number;
};

const DailyLoopContext = React.createContext<DailyLoopContextValue | null>(null);

export function DailyLoopProvider({ children }: { children: React.ReactNode }) {
  const { hasCompletedProfile, session } = useAuth();
  const { couple, partnerProfile, relationshipState, refreshRelationship } = useRelationship();
  const [todayCheckIns, setTodayCheckIns] = React.useState<DailyCheckIn[]>([]);
  const [todayPredictions, setTodayPredictions] = React.useState<DailyPrediction[]>([]);
  const [todayReactions, setTodayReactions] = React.useState<DailyReaction[]>([]);
  const [todayReveal, setTodayReveal] = React.useState<TodayReveal | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const localDay = React.useMemo(() => {
    if (!couple || relationshipState !== 'linked') {
      return null;
    }

    return getCoupleLocalDay(new Date(), couple.timezone);
  }, [couple, relationshipState]);

  const currentUserId = session?.user.id ?? null;
  const currentUserCheckIn = currentUserId ? todayCheckIns.find((checkIn) => checkIn.user_id === currentUserId) ?? null : null;
  const partnerCheckIn = partnerProfile ? todayCheckIns.find((checkIn) => checkIn.user_id === partnerProfile.id) ?? null : null;
  const currentUserPrediction = currentUserId
    ? todayPredictions.find((prediction) => prediction.predictor_user_id === currentUserId) ?? null
    : null;
  const partnerPrediction = partnerProfile
    ? todayPredictions.find((prediction) => prediction.predictor_user_id === partnerProfile.id) ?? null
    : null;
  const currentUserReaction = currentUserId ? todayReactions.find((reaction) => reaction.sender_id === currentUserId) ?? null : null;
  const partnerReaction = partnerProfile ? todayReactions.find((reaction) => reaction.sender_id === partnerProfile.id) ?? null : null;

  const todayStatus = currentUserId
    ? getTodayStatus({
        checkIns: todayCheckIns.map((checkIn) => ({ localDay: checkIn.local_day, userId: checkIn.user_id })),
        currentUserId,
        predictions: todayPredictions.map((prediction) => ({
          localDay: prediction.local_day,
          predictorUserId: prediction.predictor_user_id,
        })),
        reveal: todayReveal ? { id: todayReveal.id, localDay: todayReveal.local_day, viewedByCurrentUser: todayReveal.viewedByCurrentUser } : null,
      })
    : 'needs_check_in';

  const refreshToday = React.useCallback(async () => {
    if (!currentUserId || !couple || !localDay || relationshipState !== 'linked' || !hasCompletedProfile) {
      setTodayCheckIns([]);
      setTodayPredictions([]);
      setTodayReactions([]);
      setTodayReveal(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [checkInsResult, predictionsResult, revealsResult, reactionsResult] = await Promise.all([
      supabase.from('daily_check_ins').select('*').eq('couple_id', couple.id).eq('local_day', localDay),
      supabase.from('daily_predictions').select('*').eq('couple_id', couple.id).eq('local_day', localDay),
      supabase.from('daily_reveals').select('*').eq('couple_id', couple.id).eq('local_day', localDay).maybeSingle(),
      supabase.from('daily_reactions').select('*').eq('couple_id', couple.id).eq('local_day', localDay),
    ]);

    if (checkInsResult.error || predictionsResult.error || revealsResult.error || reactionsResult.error) {
      setError(
        checkInsResult.error?.message ??
          predictionsResult.error?.message ??
          revealsResult.error?.message ??
          reactionsResult.error?.message ??
          'Could not load today.',
      );
      setIsLoading(false);
      return;
    }

    setTodayCheckIns(checkInsResult.data ?? []);
    setTodayPredictions(predictionsResult.data ?? []);
    setTodayReactions(reactionsResult.data ?? []);
    setTodayReveal(toTodayReveal(revealsResult.data, currentUserId, couple.user_1_id, couple.user_2_id));
    setIsLoading(false);
  }, [couple, currentUserId, hasCompletedProfile, localDay, relationshipState]);

  React.useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  React.useEffect(() => {
    if (!currentUserId || !couple?.id || !localDay || relationshipState !== 'linked' || !hasCompletedProfile) {
      return;
    }

    const refreshSharedDay = () => {
      void refreshRelationship();
      void refreshToday();
    };

    const channel = supabase
      .channel(`daily-loop:${couple.id}:${localDay}`)
      .on(
        'postgres_changes',
        { event: '*', filter: `id=eq.${couple.id}`, schema: 'public', table: 'couples' },
        refreshSharedDay,
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `couple_id=eq.${couple.id}`, schema: 'public', table: 'daily_check_ins' },
        refreshSharedDay,
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `couple_id=eq.${couple.id}`, schema: 'public', table: 'daily_predictions' },
        refreshSharedDay,
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `couple_id=eq.${couple.id}`, schema: 'public', table: 'daily_reveals' },
        refreshSharedDay,
      )
      .on(
        'postgres_changes',
        { event: '*', filter: `couple_id=eq.${couple.id}`, schema: 'public', table: 'daily_reactions' },
        refreshSharedDay,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [couple?.id, currentUserId, hasCompletedProfile, localDay, refreshRelationship, refreshToday, relationshipState]);

  const saveCheckIn = async (values: DailyCheckInFormValues): Promise<DailyLoopActionResult> => {
    if (!localDay) {
      return { ok: false, message: 'Link with your partner before checking in.' };
    }

    const { data, error: rpcError } = await supabase.rpc('submit_daily_check_in', {
      local_day: localDay,
      mood_score: values.moodScore,
      optional_text: values.optionalText?.trim() ? values.optionalText.trim() : null,
      relationship_feeling_score: values.relationshipFeelingScore,
      stress_level: values.stressLevel,
    });

    const result = getRpcRow<DailyLoopRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not save your check-in right now.' };
    }

    await refreshRelationship();
    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyLoopErrorMessage(result.error_code) };
    }

    void trackEvent('daily_check_in_completed', {
      couple_id: couple?.id ?? null,
      local_day: localDay,
      relationship_state: relationshipState,
      surface: 'daily_check_in',
    });

    if (result.reveal_created) {
      trackPairedDayEvents({
        coupleId: couple?.id ?? null,
        currentStreak: result.current_streak,
        localDay,
      });
    }

    return { ok: true, message: result.reveal_created ? 'Reveal unlocked.' : 'Check-in saved.' };
  };

  const savePrediction = async (values: DailyPredictionFormValues): Promise<DailyLoopActionResult> => {
    if (!localDay) {
      return { ok: false, message: 'Link with your partner before predicting.' };
    }

    const { data, error: rpcError } = await supabase.rpc('submit_daily_prediction', {
      local_day: localDay,
      predicted_mood_score: values.predictedMoodScore,
      predicted_relationship_feeling_score: values.predictedRelationshipFeelingScore,
    });

    const result = getRpcRow<DailyLoopRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not save your prediction right now.' };
    }

    await refreshRelationship();
    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyLoopErrorMessage(result.error_code) };
    }

    void trackEvent('daily_prediction_completed', {
      couple_id: couple?.id ?? null,
      local_day: localDay,
      relationship_state: relationshipState,
      surface: 'daily_prediction',
    });

    if (result.reveal_created) {
      trackPairedDayEvents({
        coupleId: couple?.id ?? null,
        currentStreak: result.current_streak,
        localDay,
      });
    }

    return { ok: true, message: result.reveal_created ? 'Reveal unlocked.' : 'Prediction saved.' };
  };

  const markRevealViewed = async (): Promise<DailyLoopActionResult> => {
    if (!localDay || !todayReveal) {
      return { ok: false, message: 'The reveal is not ready yet.' };
    }

    const { data, error: rpcError } = await supabase.rpc('mark_daily_reveal_viewed', {
      local_day: localDay,
    });

    const result = getRpcRow<MarkRevealRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not update the reveal right now.' };
    }

    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyLoopErrorMessage(result.error_code) };
    }

    void trackEvent('daily_reveal_viewed', {
      couple_id: couple?.id ?? null,
      local_day: localDay,
      relationship_state: relationshipState,
      surface: 'daily_reveal',
    });

    return { ok: true };
  };

  const saveReaction = async (values: DailyReactionFormValues): Promise<DailyLoopActionResult> => {
    if (!todayReveal) {
      return { ok: false, message: 'The reveal is not ready yet.' };
    }

    const { data, error: rpcError } = await supabase.rpc('submit_daily_reaction', {
      note: values.note?.trim() ? values.note.trim() : null,
      reaction_type: values.reactionType,
      reveal_id: todayReveal.id,
    });

    const result = getRpcRow<DailyReactionRpcResult>(data);

    if (rpcError || !result) {
      return { ok: false, message: 'We could not save your reaction right now.' };
    }

    await refreshRelationship();
    await refreshToday();

    if (!result.ok && result.error_code) {
      return { ok: false, code: result.error_code, message: result.error_message ?? dailyReactionErrorMessage(result.error_code) };
    }

    void trackEvent('reaction_sent', {
      couple_id: couple?.id ?? null,
      local_day: localDay,
      reaction_type: values.reactionType,
      surface: 'daily_reveal',
      xp_awarded: result.xp_awarded,
    });

    if (result.note_saved) {
      void trackEvent('note_sent', {
        couple_id: couple?.id ?? null,
        local_day: localDay,
        surface: 'daily_reveal',
      });
    }

    if (result.current_tier && result.current_tier !== couple?.current_tier) {
      void trackEvent('tier_updated', {
        couple_id: couple?.id ?? null,
        local_day: localDay,
        tier: result.current_tier,
      });
    }

    return { ok: true, message: result.note_saved ? 'Reaction and note saved.' : 'Reaction saved.' };
  };

  const partnerActivity = React.useMemo<PartnerActivity[]>(() => {
    const activity: PartnerActivity[] = [];

    if (partnerReaction) {
      activity.push({
        detail: partnerReaction.note ? 'Reacted and left a reveal note.' : "Reacted to today's reveal.",
        label: `${partnerProfile?.display_name ?? 'Your partner'} reacted`,
      });
    }

    if (partnerCheckIn) {
      activity.push({
        detail: "Their check-in is part of today's read.",
        label: `${partnerProfile?.display_name ?? 'Your partner'} checked in`,
      });
    }

    if (partnerPrediction) {
      activity.push({
        detail: 'Their prediction is ready for the reveal.',
        label: `${partnerProfile?.display_name ?? 'Your partner'} predicted`,
      });
    }

    return activity;
  }, [partnerCheckIn, partnerPrediction, partnerProfile?.display_name, partnerReaction]);

  const value = React.useMemo<DailyLoopContextValue>(
    () => ({
      currentUserCheckIn,
      currentUserPrediction,
      currentUserReaction,
      currentTier: couple?.current_tier ?? 'Who Even Are You',
      error,
      isLoading,
      localDay,
      markRevealViewed,
      pairedDaysCount: couple?.paired_days_count ?? 0,
      partnerActivity,
      partnerCheckIn,
      partnerPrediction,
      partnerReaction,
      relationshipScore: couple?.relationship_score ?? 0,
      refreshToday,
      saveCheckIn,
      savePrediction,
      saveReaction,
      streak: {
        current: couple?.current_streak ?? 0,
        longest: couple?.longest_streak ?? 0,
      },
      todayCheckIns,
      todayPredictions,
      todayReactions,
      todayReveal,
      todayStatus,
      xp: couple?.xp_points ?? 0,
    }),
    [
      couple?.current_streak,
      couple?.current_tier,
      couple?.longest_streak,
      couple?.paired_days_count,
      couple?.relationship_score,
      couple?.xp_points,
      currentUserCheckIn,
      currentUserPrediction,
      currentUserReaction,
      error,
      isLoading,
      localDay,
      partnerActivity,
      partnerCheckIn,
      partnerPrediction,
      partnerReaction,
      todayCheckIns,
      todayPredictions,
      todayReactions,
      todayReveal,
      todayStatus,
    ],
  );

  return <DailyLoopContext.Provider value={value}>{children}</DailyLoopContext.Provider>;
}

export function useDailyLoop() {
  const context = React.useContext(DailyLoopContext);

  if (!context) {
    throw new Error('useDailyLoop must be used inside DailyLoopProvider');
  }

  return context;
}

function toTodayReveal(
  reveal: DailyReveal | null,
  currentUserId: string,
  user1Id: string | null,
  user2Id: string | null,
): TodayReveal | null {
  if (!reveal) {
    return null;
  }

  const viewedByCurrentUser =
    (currentUserId === user1Id && Boolean(reveal.user_1_viewed_at)) ||
    (currentUserId === user2Id && Boolean(reveal.user_2_viewed_at));

  return {
    ...reveal,
    viewedByCurrentUser,
  };
}

function getRpcRow<T>(data: T[] | null) {
  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

function trackPairedDayEvents({
  coupleId,
  currentStreak,
  localDay,
}: {
  coupleId: string | null;
  currentStreak: number;
  localDay: string;
}) {
  void trackEvent('paired_day_completed', {
    couple_id: coupleId,
    local_day: localDay,
    streak: currentStreak,
  });
  void trackEvent('streak_updated', {
    couple_id: coupleId,
    local_day: localDay,
    streak: currentStreak,
  });
}

function dailyLoopErrorMessage(code: DailyLoopErrorCode) {
  switch (code) {
    case 'duplicate_check_in':
      return 'You already checked in today.';
    case 'duplicate_prediction':
      return 'You already predicted today.';
    case 'invalid_scores':
      return 'Scores must be between 1 and 5.';
    case 'invalid_text':
      return 'Keep the check-in note shorter.';
    case 'not_linked':
      return 'Link with your partner first.';
    case 'reveal_missing':
      return 'The reveal is not ready yet.';
    default:
      return 'We hit an unexpected daily loop error.';
  }
}

function dailyReactionErrorMessage(code: DailyReactionErrorCode) {
  switch (code) {
    case 'duplicate_reaction':
      return 'You already reacted to this reveal.';
    case 'invalid_note':
      return 'Keep reveal notes between 12 and 160 characters.';
    case 'invalid_reaction':
      return 'Choose one of the reveal reactions.';
    case 'not_linked':
      return 'Link with your partner first.';
    case 'repeated_note':
      return 'Try writing something a little more specific for today.';
    case 'reveal_missing':
      return 'The reveal is not ready yet.';
    default:
      return 'We hit an unexpected reaction error.';
  }
}
