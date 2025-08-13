export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          available_shares: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_price: number | null
          full_name: string | null
          id: string
          is_tradeable: boolean | null
          market_cap: number | null
          total_shares: number | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          available_shares?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_price?: number | null
          full_name?: string | null
          id?: string
          is_tradeable?: boolean | null
          market_cap?: number | null
          total_shares?: number | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          available_shares?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_price?: number | null
          full_name?: string | null
          id?: string
          is_tradeable?: boolean | null
          market_cap?: number | null
          total_shares?: number | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          created_at: string
          description: string
          ends_at: string
          id: string
          options: Json
          proposer_id: string
          status: string
          title: string
          tradeable_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          ends_at: string
          id?: string
          options?: Json
          proposer_id: string
          status?: string
          title: string
          tradeable_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_at?: string
          id?: string
          options?: Json
          proposer_id?: string
          status?: string
          title?: string
          tradeable_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shares: {
        Row: {
          average_price: number
          created_at: string
          id: string
          owner_id: string
          quantity: number
          tradeable_user_id: string
          updated_at: string
        }
        Insert: {
          average_price?: number
          created_at?: string
          id?: string
          owner_id: string
          quantity?: number
          tradeable_user_id: string
          updated_at?: string
        }
        Update: {
          average_price?: number
          created_at?: string
          id?: string
          owner_id?: string
          quantity?: number
          tradeable_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          price_per_share: number
          quantity: number
          seller_id: string | null
          total_amount: number
          tradeable_user_id: string
          transaction_type: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          price_per_share: number
          quantity: number
          seller_id?: string | null
          total_amount: number
          tradeable_user_id: string
          transaction_type: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          price_per_share?: number
          quantity?: number
          seller_id?: string | null
          total_amount?: number
          tradeable_user_id?: string
          transaction_type?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          total_portfolio_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          total_portfolio_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          total_portfolio_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          proposal_id: string
          voter_id: string
          voting_power: number
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          proposal_id: string
          voter_id: string
          voting_power?: number
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          proposal_id?: string
          voter_id?: string
          voting_power?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
