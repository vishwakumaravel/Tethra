export type AuthMethod = 'apple' | 'email' | 'phone';

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
      [_ in never]: never;
    };
    Tables: {
      couples: {
        Insert: {
          created_at?: string;
          id?: string;
          invite_code?: string | null;
          status?: Database['public']['Enums']['couple_status'];
          updated_at?: string;
          user_1_id?: string | null;
          user_2_id?: string | null;
        };
        Row: {
          created_at: string;
          id: string;
          invite_code: string | null;
          status: Database['public']['Enums']['couple_status'];
          updated_at: string;
          user_1_id: string | null;
          user_2_id: string | null;
        };
        Relationships: [];
        Update: {
          created_at?: string;
          id?: string;
          invite_code?: string | null;
          status?: Database['public']['Enums']['couple_status'];
          updated_at?: string;
          user_1_id?: string | null;
          user_2_id?: string | null;
        };
      };
      profiles: {
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
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
