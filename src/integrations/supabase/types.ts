export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      buyer_profiles: {
        Row: {
          account_id: string
          confirmed_deliveries: number
          created_at: string
          id: string
          missed_returned_count: number
          pending_count: number
          phone_hash: string
          risk_factor: string
          trust_score: number
        }
        Insert: {
          account_id?: string
          confirmed_deliveries?: number
          created_at?: string
          id?: string
          missed_returned_count?: number
          pending_count?: number
          phone_hash: string
          risk_factor?: string
          trust_score?: number
        }
        Update: {
          account_id?: string
          confirmed_deliveries?: number
          created_at?: string
          id?: string
          missed_returned_count?: number
          pending_count?: number
          phone_hash?: string
          risk_factor?: string
          trust_score?: number
        }
        Relationships: []
      }
      parcel_records: {
        Row: {
          account_id: string
          created_at: string
          id: string
          order_id: string
          parcel_status: string
          phone_hash: string
          reason: string
          score_impact: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          order_id?: string
          parcel_status?: string
          phone_hash: string
          reason?: string
          score_impact?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          order_id?: string
          parcel_status?: string
          phone_hash?: string
          reason?: string
          score_impact?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcel_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "parcel_records_phone_hash_fkey"
            columns: ["phone_hash"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["phone_hash"]
          },
        ]
      }
      appeals: {
        Row: {
          account_id: string
          category: string
          checks: Json
          created_at: string
          evidence: string
          explanation: string
          id: string
          order_id: string
          restored_points: number
          summary: string
          verdict: string
        }
        Insert: {
          account_id: string
          category: string
          checks?: Json
          created_at?: string
          evidence: string
          explanation?: string
          id?: string
          order_id: string
          restored_points?: number
          summary?: string
          verdict: string
        }
        Update: {
          account_id?: string
          category?: string
          checks?: Json
          created_at?: string
          evidence?: string
          explanation?: string
          id?: string
          order_id?: string
          restored_points?: number
          summary?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "parcel_records"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "appeals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["account_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_appeal: {
        Args: {
          _category: string
          _checks: Json
          _evidence: string
          _explanation: string
          _order_id: string
          _restored: number
          _summary: string
          _verdict: string
        }
        Returns: {
          account_id: string
          confirmed_deliveries: number
          created_at: string
          id: string
          missed_returned_count: number
          pending_count: number
          phone_hash: string
          risk_factor: string
          trust_score: number
        }
        SetofOptions: {
          from: "*"
          to: "buyer_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_risk_factor: {
        Args: { _resolved: number; _score: number }
        Returns: string
      }
      place_order: {
        Args: { _phone_hash: string }
        Returns: {
          account_id: string
          created_at: string
          id: string
          order_id: string
          parcel_status: string
          phone_hash: string
          reason: string
          score_impact: number | null
        }
        SetofOptions: {
          from: "*"
          to: "parcel_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_parcel: {
        Args: { _order_id: string; _reason: string }
        Returns: {
          account_id: string
          confirmed_deliveries: number
          created_at: string
          id: string
          missed_returned_count: number
          pending_count: number
          phone_hash: string
          risk_factor: string
          trust_score: number
        }
        SetofOptions: {
          from: "*"
          to: "buyer_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
