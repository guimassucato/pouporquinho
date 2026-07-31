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
      budgets: {
        Row: {
          amount_limit: number
          category_id: string
          created_at: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount_limit: number
          category_id: string
          created_at?: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_archived: boolean
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_archived?: boolean
          kind?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          description: string
          expense_date: string
          generated_for_month: string | null
          id: string
          notes: string | null
          payment_method_id: string
          recurring_expense_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          description: string
          expense_date: string
          generated_for_month?: string | null
          id?: string
          notes?: string | null
          payment_method_id: string
          recurring_expense_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          generated_for_month?: string | null
          id?: string
          notes?: string | null
          payment_method_id?: string
          recurring_expense_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          id: string
          income_date: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          income_date: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          income_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      index_rates: {
        Row: {
          annual_rate_percent: number
          created_at: string
          effective_from: string
          id: string
          indexador: string
          user_id: string
        }
        Insert: {
          annual_rate_percent: number
          created_at?: string
          effective_from: string
          id?: string
          indexador: string
          user_id: string
        }
        Update: {
          annual_rate_percent?: number
          created_at?: string
          effective_from?: string
          id?: string
          indexador?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          amount: number
          created_at: string
          generated_for_month: string | null
          id: string
          investment_id: string
          notes: string | null
          recurring_investment_contribution_id: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          generated_for_month?: string | null
          id?: string
          investment_id: string
          notes?: string | null
          recurring_investment_contribution_id?: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          generated_for_month?: string | null
          id?: string
          investment_id?: string
          notes?: string | null
          recurring_investment_contribution_id?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_recurring_investment_contribution__fkey"
            columns: ["recurring_investment_contribution_id"]
            isOneToOne: false
            referencedRelation: "recurring_investment_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_valuations: {
        Row: {
          created_at: string
          id: string
          investment_id: string
          notes: string | null
          total_value: number
          user_id: string
          valuation_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          investment_id: string
          notes?: string | null
          total_value: number
          user_id: string
          valuation_date: string
        }
        Update: {
          created_at?: string
          id?: string
          investment_id?: string
          notes?: string | null
          total_value?: number
          user_id?: string
          valuation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_valuations_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          created_at: string
          id: string
          indexador: string | null
          institution: string | null
          is_archived: boolean
          name: string
          notes: string | null
          rate_percent: number | null
          start_date: string
          ticker: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indexador?: string | null
          institution?: string | null
          is_archived?: boolean
          name: string
          notes?: string | null
          rate_percent?: number | null
          start_date: string
          ticker?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indexador?: string | null
          institution?: string | null
          is_archived?: boolean
          name?: string
          notes?: string | null
          rate_percent?: number | null
          start_date?: string
          ticker?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          closing_day: number | null
          color: string
          created_at: string
          credit_limit: number | null
          due_day: number | null
          icon: string
          id: string
          is_archived: boolean
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          closing_day?: number | null
          color: string
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          icon: string
          id?: string
          is_archived?: boolean
          kind: string
          name: string
          user_id: string
        }
        Update: {
          closing_day?: number | null
          color?: string
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          day_of_month: number
          description: string
          end_date: string | null
          id: string
          is_active: boolean
          payment_method_id: string
          start_date: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          day_of_month: number
          description: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          payment_method_id: string
          start_date: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          day_of_month?: number
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          payment_method_id?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_investment_contributions: {
        Row: {
          amount: number
          created_at: string
          day_of_month: number
          end_date: string | null
          id: string
          investment_id: string
          is_active: boolean
          start_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_of_month: number
          end_date?: string | null
          id?: string
          investment_id: string
          is_active?: boolean
          start_date: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_of_month?: number
          end_date?: string | null
          id?: string
          investment_id?: string
          is_active?: boolean
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_investment_contributions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      expenses_by_category_month: {
        Row: {
          category_id: string | null
          month: string | null
          total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_by_payment_method_month: {
        Row: {
          month: string | null
          payment_method_id: string | null
          total: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_cashflow: {
        Row: {
          expense_total: number | null
          income_total: number | null
          month: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
