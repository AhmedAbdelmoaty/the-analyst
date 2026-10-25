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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_flags: {
        Row: {
          is_test: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          is_test?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          is_test?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_export_log: {
        Row: {
          admin_id: string
          created_at: string
          filters: Json
          format: string
          id: string
          kind: string
          row_count: number | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          filters?: Json
          format: string
          id?: string
          kind: string
          row_count?: number | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          kind?: string
          row_count?: number | null
        }
        Relationships: []
      }
      analytics_meta: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      annual_entitlements: {
        Row: {
          environment: string
          expires_at: string
          id: string
          order_id: string
          revocation_reason: string | null
          revoked_at: string | null
          starts_at: string
          transaction_id: number
          user_id: string
        }
        Insert: {
          environment: string
          expires_at: string
          id?: string
          order_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          starts_at: string
          transaction_id: number
          user_id: string
        }
        Update: {
          environment?: string
          expires_at?: string
          id?: string
          order_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          starts_at?: string
          transaction_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      app_flags: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      completed_players: {
        Row: {
          completed_at: string
          duration_ms: number | null
          first_name: string
          framing_correct: number | null
          id: string
          last_name: string
          outcome: string | null
          qualified: boolean
          round_id: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string
          duration_ms?: number | null
          first_name: string
          framing_correct?: number | null
          id?: string
          last_name: string
          outcome?: string | null
          qualified?: boolean
          round_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string
          duration_ms?: number | null
          first_name?: string
          framing_correct?: number | null
          id?: string
          last_name?: string
          outcome?: string | null
          qualified?: boolean
          round_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          active_ms: number | null
          completed_at: string | null
          content_version: string | null
          details: Json
          first_seen_at: string
          game: string
          id: string
          last_activity_at: string
          last_stage: string | null
          legacy_ref: string | null
          outcome: string | null
          round_id: string
          server_outcome: string | null
          server_reason: string | null
          source: string
          stage_revision: number
          started_at: string | null
          submitted_at: string | null
          timed_out_at: string | null
          user_id: string | null
        }
        Insert: {
          active_ms?: number | null
          completed_at?: string | null
          content_version?: string | null
          details?: Json
          first_seen_at?: string
          game: string
          id?: string
          last_activity_at?: string
          last_stage?: string | null
          legacy_ref?: string | null
          outcome?: string | null
          round_id: string
          server_outcome?: string | null
          server_reason?: string | null
          source?: string
          stage_revision?: number
          started_at?: string | null
          submitted_at?: string | null
          timed_out_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_ms?: number | null
          completed_at?: string | null
          content_version?: string | null
          details?: Json
          first_seen_at?: string
          game?: string
          id?: string
          last_activity_at?: string
          last_stage?: string | null
          legacy_ref?: string | null
          outcome?: string | null
          round_id?: string
          server_outcome?: string | null
          server_reason?: string | null
          source?: string
          stage_revision?: number
          started_at?: string | null
          submitted_at?: string | null
          timed_out_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      otp_challenges: {
        Row: {
          attempts: number
          code_hmac: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          invalidated_at: string | null
          max_attempts: number
          phone: string
          purpose: string
          reset_expires_at: string | null
          reset_token_hmac: string | null
          reset_used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hmac: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invalidated_at?: string | null
          max_attempts?: number
          phone: string
          purpose: string
          reset_expires_at?: string | null
          reset_token_hmac?: string | null
          reset_used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hmac?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          max_attempts?: number
          phone?: string
          purpose?: string
          reset_expires_at?: string | null
          reset_token_hmac?: string | null
          reset_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      otp_rate_events: {
        Row: {
          created_at: string
          id: number
          ip: string | null
          kind: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          ip?: string | null
          kind: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          ip?: string | null
          kind?: string
          phone?: string | null
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          created_at: string
          environment: string
          id: string
          integration_ids: number[]
          last_reconciled_at: string | null
          order_id: string
          provider_intention_id: string | null
          provider_order_id: number | null
          request_key: string
          status: string
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          integration_ids: number[]
          last_reconciled_at?: string | null
          order_id: string
          provider_intention_id?: string | null
          provider_order_id?: number | null
          request_key: string
          status?: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          integration_ids?: number[]
          last_reconciled_at?: string | null
          order_id?: string
          provider_intention_id?: string | null
          provider_order_id?: number | null
          request_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_environment_fkey"
            columns: ["order_id", "environment"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id", "environment"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          environment: string
          id: string
          paid_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          environment: string
          id?: string
          paid_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          paid_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_status_audit: {
        Row: {
          created_at: string
          event_id: string | null
          from_status: string
          id: string
          order_id: string
          reason: string
          to_status: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          from_status: string
          id?: string
          order_id: string
          reason: string
          to_status: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          from_status?: string
          id?: string
          order_id?: string
          reason?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_webhook_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          environment: string
          fingerprint: string
          id: string
          order_id: string | null
          received_at: string
          state: string
          transaction_id: number
        }
        Insert: {
          environment: string
          fingerprint: string
          id?: string
          order_id?: string | null
          received_at?: string
          state: string
          transaction_id: number
        }
        Update: {
          environment?: string
          fingerprint?: string
          id?: string
          order_id?: string | null
          received_at?: string
          state?: string
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_choice: string | null
          created_at: string
          department: string | null
          department_other: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          industry: string | null
          industry_other: string | null
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          work_details_prompt_dismissed_at: string | null
        }
        Insert: {
          avatar_choice?: string | null
          created_at?: string
          department?: string | null
          department_other?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          industry?: string | null
          industry_other?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          work_details_prompt_dismissed_at?: string | null
        }
        Update: {
          avatar_choice?: string | null
          created_at?: string
          department?: string | null
          department_other?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          industry?: string | null
          industry_other?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          work_details_prompt_dismissed_at?: string | null
        }
        Relationships: []
      }
      round_events: {
        Row: {
          event_id: string
          game: string
          received_at: string
          round_id: string
          type: string
          user_id: string
        }
        Insert: {
          event_id: string
          game: string
          received_at?: string
          round_id: string
          type: string
          user_id: string
        }
        Update: {
          event_id?: string
          game?: string
          received_at?: string
          round_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_segments: {
        Row: {
          hits: number
          id: string
          ip_hash: string | null
          last_seen_at: string
          secret_hash: string | null
          started_at: string
          user_id: string | null
          visit_id: string
        }
        Insert: {
          hits?: number
          id: string
          ip_hash?: string | null
          last_seen_at?: string
          secret_hash?: string | null
          started_at?: string
          user_id?: string | null
          visit_id: string
        }
        Update: {
          hits?: number
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          secret_hash?: string | null
          started_at?: string
          user_id?: string | null
          visit_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activity_summary: {
        Args: { _from: string; _game?: string; _include?: boolean; _to: string }
        Returns: Json
      }
      admin_entitlements: {
        Args: { _limit?: number; _offset?: number }
        Returns: Json
      }
      admin_export_rounds: {
        Args: {
          _from: string
          _game?: string
          _include?: boolean
          _status?: string
          _to: string
        }
        Returns: {
          active_ms: number
          completed_at: string
          content_version: string
          details: Json
          first_name: string
          game: string
          last_activity_at: string
          last_name: string
          last_stage: string
          outcome: string
          phone: string
          round_id: string
          server_outcome: string
          server_reason: string
          source: string
          started_at: string
          submitted_at: string
          timed_out_at: string
        }[]
      }
      admin_games: {
        Args: {
          _from: string
          _include?: boolean
          _status?: string
          _to: string
        }
        Returns: Json
      }
      admin_log_export: {
        Args: { _filters: Json; _format: string; _kind: string; _rows: number }
        Returns: undefined
      }
      admin_overview: {
        Args: {
          _from: string
          _game?: string
          _include?: boolean
          _status?: string
          _to: string
        }
        Returns: Json
      }
      admin_payment_orders: {
        Args: {
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
        }
        Returns: Json
      }
      admin_payments_overview: { Args: never; Returns: Json }
      admin_set_test_flag: {
        Args: { _is_test: boolean; _user_id: string }
        Returns: undefined
      }
      admin_user_detail: { Args: { _user_id: string }; Returns: Json }
      admin_users: {
        Args: {
          _country?: string
          _department?: string
          _dir?: string
          _from: string
          _game?: string
          _gender?: string
          _include?: boolean
          _industry?: string
          _limit?: number
          _offset?: number
          _search?: string
          _sort?: string
          _status?: string
          _to: string
        }
        Returns: Json
      }
      analytics_excluded: { Args: { _uid: string }; Returns: boolean }
      analytics_round_matches: {
        Args: {
          _game: string
          _status: string
          r: Database["public"]["Tables"]["game_rounds"]["Row"]
        }
        Returns: boolean
      }
      auth_user_by_phone: {
        Args: { _phone: string }
        Returns: {
          id: string
          phone_confirmed: boolean
        }[]
      }
      backfill_legacy_results: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_game_access: { Args: never; Returns: Json }
      otp_attempt: {
        Args: { _challenge_id: string; _code_hmac: string }
        Returns: {
          remaining: number
          status: string
          user_id: string
        }[]
      }
      paid_game_enforcement: { Args: never; Returns: boolean }
      payment_apply_event: {
        Args: {
          _amount: number
          _confirmed_at: string
          _currency: string
          _environment: string
          _fingerprint: string
          _integration: number
          _provider_order: number
          _state: string
          _transaction: number
        }
        Returns: string
      }
      payment_begin: {
        Args: {
          _amount: number
          _environment: string
          _integrations: number[]
          _request: string
          _uid: string
        }
        Returns: Json
      }
      pf_evaluate: {
        Args: { _framing: Json; _history: string[]; _track_entered: boolean }
        Returns: {
          correct_count: number
          full_spine: boolean
          outcome: string
        }[]
      }
      profile_country_from_phone: { Args: { _phone: string }; Returns: string }
      rd_argument_check: {
        Args: { _arg: string; _docs: string[]; _tools: string[] }
        Returns: {
          kind: string
          ok: boolean
        }[]
      }
      rd_evaluate: {
        Args: {
          _args: string[]
          _doc: string
          _docs: string[]
          _team: string
          _tools: string[]
        }
        Returns: {
          outcome: string
          reason: string
        }[]
      }
      track_round_event: {
        Args: {
          _active_ms?: number
          _event_id: string
          _game: string
          _payload?: Json
          _revision?: number
          _round_id: string
          _stage?: string
          _type: string
        }
        Returns: string
      }
      track_visit: {
        Args: { _secret?: string; _segment_id: string; _visit_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
