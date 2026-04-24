export type AuthMethod = 'apple' | 'email' | 'phone';
export type RelationshipErrorCode =
  | 'already_linked'
  | 'expired_code'
  | 'invalid_code'
  | 'invite_exists'
  | 'removed_code'
  | 'reused_code'
  | 'self_join'
  | 'unknown';
export type RelationshipState = 'invite_received' | 'invite_sent' | 'linked' | 'link_error' | 'unlinked';
export type DailyLoopErrorCode =
  | 'duplicate_check_in'
  | 'duplicate_prediction'
  | 'invalid_scores'
  | 'invalid_text'
  | 'not_linked'
  | 'reveal_missing'
  | 'unknown';
export type DailyStatus = 'complete' | 'needs_check_in' | 'needs_prediction' | 'reveal_ready' | 'waiting_for_partner';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    CompositeTypes: {
      [_ in never]: never;
    };
    Enums: {
      couple_status: 'linked' | 'pending';
      partner_status: 'invited' | 'linked' | 'unlinked';
    };
    Functions: {
      cancel_pending_couple: {
        Args: Record<PropertyKey, never>;
        Returns: {
          couple_id: string | null;
          error_code: RelationshipErrorCode | null;
          error_message: string | null;
          invite_code: string | null;
          invite_expires_at: string | null;
          ok: boolean;
          status: CoupleStatus | null;
          timezone: string | null;
        }[];
      };
      create_couple_invite: {
        Args: {
          regenerate?: boolean | null;
          requested_timezone?: string | null;
        };
        Returns: {
          couple_id: string | null;
          error_code: RelationshipErrorCode | null;
          error_message: string | null;
          invite_code: string | null;
          invite_expires_at: string | null;
          ok: boolean;
          status: CoupleStatus | null;
          timezone: string | null;
        }[];
      };
      join_couple_by_code: {
        Args: {
          code: string;
        };
        Returns: {
          couple_id: string | null;
          error_code: RelationshipErrorCode | null;
          error_message: string | null;
          invite_code: string | null;
          invite_expires_at: string | null;
          ok: boolean;
          status: CoupleStatus | null;
          timezone: string | null;
        }[];
      };
      mark_daily_reveal_viewed: {
        Args: {
          local_day: string;
        };
        Returns: {
          error_code: DailyLoopErrorCode | null;
          error_message: string | null;
          ok: boolean;
        }[];
      };
      submit_daily_check_in: {
        Args: {
          local_day: string;
          mood_score: number;
          optional_text?: string | null;
          relationship_feeling_score: number;
          stress_level: number;
        };
        Returns: {
          current_streak: number;
          error_code: DailyLoopErrorCode | null;
          error_message: string | null;
          longest_streak: number;
          ok: boolean;
          reveal_created: boolean;
          submitted_local_day: string;
        }[];
      };
      submit_daily_prediction: {
        Args: {
          local_day: string;
          predicted_mood_score: number;
          predicted_relationship_feeling_score: number;
        };
        Returns: {
          current_streak: number;
          error_code: DailyLoopErrorCode | null;
          error_message: string | null;
          longest_streak: number;
          ok: boolean;
          reveal_created: boolean;
          submitted_local_day: string;
        }[];
      };
    };
    Tables: {
      couples: {
        Insert: {
          created_at?: string;
          current_streak?: number;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          last_paired_local_day?: string | null;
          linked_at?: string | null;
          longest_streak?: number;
          status?: Database['public']['Enums']['couple_status'];
          timezone?: string;
          updated_at?: string;
          user_1_id?: string | null;
          user_2_id?: string | null;
        };
        Row: {
          created_at: string;
          current_streak: number;
          id: string;
          invite_code: string | null;
          invite_expires_at: string | null;
          last_paired_local_day: string | null;
          linked_at: string | null;
          longest_streak: number;
          status: Database['public']['Enums']['couple_status'];
          timezone: string;
          updated_at: string;
          user_1_id: string | null;
          user_2_id: string | null;
        };
        Relationships: [];
        Update: {
          created_at?: string;
          current_streak?: number;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          last_paired_local_day?: string | null;
          linked_at?: string | null;
          longest_streak?: number;
          status?: Database['public']['Enums']['couple_status'];
          timezone?: string;
          updated_at?: string;
          user_1_id?: string | null;
          user_2_id?: string | null;
        };
      };
      daily_check_ins: {
        Insert: {
          couple_id: string;
          created_at?: string;
          id?: string;
          local_day: string;
          mood_score: number;
          optional_text?: string | null;
          relationship_feeling_score: number;
          stress_level: number;
          updated_at?: string;
          user_id: string;
        };
        Row: {
          couple_id: string;
          created_at: string;
          id: string;
          local_day: string;
          mood_score: number;
          optional_text: string | null;
          relationship_feeling_score: number;
          stress_level: number;
          updated_at: string;
          user_id: string;
        };
        Relationships: [];
        Update: {
          couple_id?: string;
          created_at?: string;
          id?: string;
          local_day?: string;
          mood_score?: number;
          optional_text?: string | null;
          relationship_feeling_score?: number;
          stress_level?: number;
          updated_at?: string;
          user_id?: string;
        };
      };
      daily_predictions: {
        Insert: {
          couple_id: string;
          created_at?: string;
          id?: string;
          local_day: string;
          predicted_mood_score: number;
          predicted_relationship_feeling_score: number;
          predictor_user_id: string;
          updated_at?: string;
        };
        Row: {
          couple_id: string;
          created_at: string;
          id: string;
          local_day: string;
          predicted_mood_score: number;
          predicted_relationship_feeling_score: number;
          predictor_user_id: string;
          updated_at: string;
        };
        Relationships: [];
        Update: {
          couple_id?: string;
          created_at?: string;
          id?: string;
          local_day?: string;
          predicted_mood_score?: number;
          predicted_relationship_feeling_score?: number;
          predictor_user_id?: string;
          updated_at?: string;
        };
      };
      daily_reveals: {
        Insert: {
          couple_id: string;
          created_at?: string;
          id?: string;
          local_day: string;
          revealed_at?: string;
          user_1_viewed_at?: string | null;
          user_2_viewed_at?: string | null;
        };
        Row: {
          couple_id: string;
          created_at: string;
          id: string;
          local_day: string;
          revealed_at: string;
          user_1_viewed_at: string | null;
          user_2_viewed_at: string | null;
        };
        Relationships: [];
        Update: {
          couple_id?: string;
          created_at?: string;
          id?: string;
          local_day?: string;
          revealed_at?: string;
          user_1_viewed_at?: string | null;
          user_2_viewed_at?: string | null;
        };
      };
      profiles: {
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_couple_id?: string | null;
          display_name?: string | null;
          email?: string | null;
          id: string;
          partner_status?: Database['public']['Enums']['partner_status'];
          phone?: string | null;
          updated_at?: string;
        };
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_couple_id: string | null;
          display_name: string | null;
          email: string | null;
          id: string;
          partner_status: Database['public']['Enums']['partner_status'];
          phone: string | null;
          updated_at: string;
        };
        Relationships: [];
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_couple_id?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          partner_status?: Database['public']['Enums']['partner_status'];
          phone?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
  };
}

export type Couple = Database['public']['Tables']['couples']['Row'];
export type CoupleStatus = Database['public']['Enums']['couple_status'];
export type DailyCheckIn = Database['public']['Tables']['daily_check_ins']['Row'];
export type DailyPrediction = Database['public']['Tables']['daily_predictions']['Row'];
export type DailyReveal = Database['public']['Tables']['daily_reveals']['Row'];
export type PartnerStatus = Database['public']['Enums']['partner_status'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
