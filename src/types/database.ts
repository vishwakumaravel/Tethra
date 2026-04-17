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
    };
    Tables: {
      couples: {
        Insert: {
          created_at?: string;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          linked_at?: string | null;
          status?: Database['public']['Enums']['couple_status'];
          timezone?: string;
          updated_at?: string;
          user_1_id?: string | null;
          user_2_id?: string | null;
        };
        Row: {
          created_at: string;
          id: string;
          invite_code: string | null;
          invite_expires_at: string | null;
          linked_at: string | null;
          status: Database['public']['Enums']['couple_status'];
          timezone: string;
          updated_at: string;
          user_1_id: string | null;
          user_2_id: string | null;
        };
        Relationships: [];
        Update: {
          created_at?: string;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          linked_at?: string | null;
          status?: Database['public']['Enums']['couple_status'];
          timezone?: string;
          updated_at?: string;
          user_1_id?: string | null;
          user_2_id?: string | null;
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
export type PartnerStatus = Database['public']['Enums']['partner_status'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
