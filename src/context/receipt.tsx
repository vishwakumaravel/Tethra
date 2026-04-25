import * as React from 'react';

import { useAuth } from '@/context/auth';
import { useRelationship } from '@/context/relationship';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { ReceiptStatus, WeeklyReceipt } from '@/types/database';

type ReceiptRpcRow = {
  created: boolean;
  message: string | null;
  ok: boolean;
  receipt_attachment_balance_score: number | null;
  receipt_communication_score: number | null;
  receipt_compatibility_score: number | null;
  receipt_confidence_label: WeeklyReceipt['confidence_label'] | null;
  receipt_conflict_risk_score: number | null;
  receipt_couple_id: string | null;
  receipt_created_at: string | null;
  receipt_emotional_alignment_score: number | null;
  receipt_fun_insight: string | null;
  receipt_generation_version: number | null;
  receipt_green_flag: string | null;
  receipt_id: string | null;
  receipt_paired_days_count: number | null;
  receipt_period_end_local: string | null;
  receipt_period_start_local: string | null;
  receipt_red_flag: string | null;
  receipt_summary: string | null;
  receipt_updated_at: string | null;
  status: ReceiptStatus;
};

type ReceiptRpcJsonResult = {
  created?: boolean;
  message?: string | null;
  ok?: boolean;
  receipt?: Partial<WeeklyReceipt> | null;
  status?: ReceiptStatus;
};

type ReceiptContextValue = {
  error: string | null;
  generateReceipt: () => Promise<void>;
  isLoading: boolean;
  latestReceipt: WeeklyReceipt | null;
  receiptStatus: ReceiptStatus;
  refreshReceipt: () => Promise<void>;
  viewReceipt: () => void;
};

const ReceiptContext = React.createContext<ReceiptContextValue | null>(null);

export function ReceiptProvider({ children }: { children: React.ReactNode }) {
  const { hasCompletedProfile, session } = useAuth();
  const { couple, relationshipState } = useRelationship();
  const [latestReceipt, setLatestReceipt] = React.useState<WeeklyReceipt | null>(null);
  const [receiptStatus, setReceiptStatus] = React.useState<ReceiptStatus>('not_ready');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const viewedReceiptId = React.useRef<string | null>(null);

  const refreshReceipt = React.useCallback(async () => {
    if (!session?.user.id || !couple?.id || relationshipState !== 'linked' || !hasCompletedProfile) {
      setLatestReceipt(null);
      setReceiptStatus('not_ready');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReceiptStatus('loading');

    const { data, error: rpcError } = await supabase.rpc('get_or_create_weekly_receipt_v2', {
      target_period_start_local: null,
    });
    const result = toReceiptRpcRow(data as ReceiptRpcJsonResult | null);

    if (rpcError || !result) {
      setReceiptStatus('error');
      setError(rpcError?.message ?? 'Could not load this week’s receipt.');
      setIsLoading(false);
      return;
    }

    setReceiptStatus(result.status);

    if (!result.ok) {
      setLatestReceipt(toWeeklyReceipt(result));
      setError(result.message);
      setIsLoading(false);
      return;
    }

    const receipt = toWeeklyReceipt(result);
    setLatestReceipt(receipt);
    setIsLoading(false);

    if (receipt && result.created) {
      void trackEvent('receipt_generated', {
        confidence: receipt.confidence_label,
        couple_id: receipt.couple_id,
        generation_version: receipt.generation_version,
        paired_days: receipt.paired_days_count,
        period_start: receipt.period_start_local,
        surface: 'receipt_tab',
      });
    }
  }, [couple?.id, hasCompletedProfile, relationshipState, session?.user.id]);

  React.useEffect(() => {
    void refreshReceipt();
  }, [refreshReceipt]);

  React.useEffect(() => {
    if (!session?.user.id || !couple?.id || relationshipState !== 'linked' || !hasCompletedProfile) {
      return;
    }

    const channel = supabase
      .channel(`receipts:${couple.id}`)
      .on('postgres_changes', { event: '*', filter: `couple_id=eq.${couple.id}`, schema: 'public', table: 'receipts' }, () => {
        void refreshReceipt();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [couple?.id, hasCompletedProfile, refreshReceipt, relationshipState, session?.user.id]);

  const viewReceipt = React.useCallback(() => {
    if (!latestReceipt || viewedReceiptId.current === latestReceipt.id) {
      return;
    }

    viewedReceiptId.current = latestReceipt.id;
    void trackEvent('receipt_viewed', {
      confidence: latestReceipt.confidence_label,
      couple_id: latestReceipt.couple_id,
      generation_version: latestReceipt.generation_version,
      paired_days: latestReceipt.paired_days_count,
      period_start: latestReceipt.period_start_local,
      surface: 'receipt_tab',
    });
  }, [latestReceipt]);

  const value = React.useMemo<ReceiptContextValue>(
    () => ({
      error,
      generateReceipt: refreshReceipt,
      isLoading,
      latestReceipt,
      receiptStatus,
      refreshReceipt,
      viewReceipt,
    }),
    [error, isLoading, latestReceipt, receiptStatus, refreshReceipt, viewReceipt],
  );

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
}

export function useReceipt() {
  const context = React.useContext(ReceiptContext);

  if (!context) {
    throw new Error('useReceipt must be used inside ReceiptProvider');
  }

  return context;
}

function toWeeklyReceipt(row: ReceiptRpcRow | null): WeeklyReceipt | null {
  if (
    !row?.receipt_id ||
    !row.receipt_couple_id ||
    !row.receipt_period_start_local ||
    !row.receipt_period_end_local ||
    !row.receipt_confidence_label
  ) {
    return null;
  }

  return {
    attachment_balance_score: row.receipt_attachment_balance_score ?? 0,
    communication_score: row.receipt_communication_score ?? 0,
    compatibility_score: row.receipt_compatibility_score ?? 0,
    confidence_label: row.receipt_confidence_label,
    conflict_risk_score: row.receipt_conflict_risk_score ?? 0,
    couple_id: row.receipt_couple_id,
    created_at: row.receipt_created_at ?? new Date().toISOString(),
    emotional_alignment_score: row.receipt_emotional_alignment_score ?? 0,
    fun_insight: row.receipt_fun_insight ?? 'Come back after more paired days.',
    generation_version: row.receipt_generation_version ?? 1,
    green_flag: row.receipt_green_flag,
    id: row.receipt_id,
    paired_days_count: row.receipt_paired_days_count ?? 0,
    period_end_local: row.receipt_period_end_local,
    period_start_local: row.receipt_period_start_local,
    red_flag: row.receipt_red_flag,
    summary: row.receipt_summary ?? 'This receipt needs more signal.',
    updated_at: row.receipt_updated_at ?? new Date().toISOString(),
  };
}

function toReceiptRpcRow(data: ReceiptRpcJsonResult | null): ReceiptRpcRow | null {
  if (!data) {
    return null;
  }

  const receipt = data.receipt ?? {};

  return {
    created: Boolean(data.created),
    message: data.message ?? null,
    ok: Boolean(data.ok),
    receipt_attachment_balance_score: receipt.attachment_balance_score ?? null,
    receipt_communication_score: receipt.communication_score ?? null,
    receipt_compatibility_score: receipt.compatibility_score ?? null,
    receipt_confidence_label: receipt.confidence_label ?? null,
    receipt_conflict_risk_score: receipt.conflict_risk_score ?? null,
    receipt_couple_id: receipt.couple_id ?? null,
    receipt_created_at: receipt.created_at ?? null,
    receipt_emotional_alignment_score: receipt.emotional_alignment_score ?? null,
    receipt_fun_insight: receipt.fun_insight ?? null,
    receipt_generation_version: receipt.generation_version ?? null,
    receipt_green_flag: receipt.green_flag ?? null,
    receipt_id: receipt.id ?? null,
    receipt_paired_days_count: receipt.paired_days_count ?? null,
    receipt_period_end_local: receipt.period_end_local ?? null,
    receipt_period_start_local: receipt.period_start_local ?? null,
    receipt_red_flag: receipt.red_flag ?? null,
    receipt_summary: receipt.summary ?? null,
    receipt_updated_at: receipt.updated_at ?? null,
    status: data.status ?? 'error',
  };
}
