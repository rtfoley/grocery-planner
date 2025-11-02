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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adhoc_items: {
        Row: {
          amount: string | null
          item_id: string
          planning_session_id: string
        }
        Insert: {
          amount?: string | null
          item_id: string
          planning_session_id: string
        }
        Update: {
          amount?: string | null
          item_id?: string
          planning_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adhoc_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adhoc_items_planning_session_id_fkey"
            columns: ["planning_session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_exclusions: {
        Row: {
          item_id: string
          planning_session_id: string
        }
        Insert: {
          item_id: string
          planning_session_id: string
        }
        Update: {
          item_id?: string
          planning_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_exclusions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_exclusions_planning_session_id_fkey"
            columns: ["planning_session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          id: string
          is_staple: boolean
          name: string
          shopping_group_id: string
          staple_amount: string | null
          store_order_index: number | null
        }
        Insert: {
          id?: string
          is_staple?: boolean
          name: string
          shopping_group_id: string
          staple_amount?: string | null
          store_order_index?: number | null
        }
        Update: {
          id?: string
          is_staple?: boolean
          name?: string
          shopping_group_id?: string
          staple_amount?: string | null
          store_order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_shopping_group_id_fkey"
            columns: ["shopping_group_id"]
            isOneToOne: false
            referencedRelation: "shopping_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_items: {
        Row: {
          amount: string | null
          id: string
          item_id: string
          meal_id: string
        }
        Insert: {
          amount?: string | null
          id?: string
          item_id: string
          meal_id: string
        }
        Update: {
          amount?: string | null
          id?: string
          item_id?: string
          meal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_recipes: {
        Row: {
          id: string
          meal_id: string
          recipe_id: string
        }
        Insert: {
          id?: string
          meal_id: string
          recipe_id: string
        }
        Update: {
          id?: string
          meal_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_recipes_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          date: string | null
          id: string
          name: string | null
          planning_session_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string | null
          planning_session_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string | null
          planning_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_planning_session_id_fkey"
            columns: ["planning_session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          shopping_group_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          shopping_group_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          shopping_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_shopping_group_id_fkey"
            columns: ["shopping_group_id"]
            isOneToOne: false
            referencedRelation: "shopping_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_sessions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          shopping_group_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          shopping_group_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          shopping_group_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_sessions_shopping_group_id_fkey"
            columns: ["shopping_group_id"]
            isOneToOne: false
            referencedRelation: "shopping_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          amount: string | null
          item_id: string
          recipe_id: string
        }
        Insert: {
          amount?: string | null
          item_id: string
          recipe_id: string
        }
        Update: {
          amount?: string | null
          item_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          id: string
          name: string
          shopping_group_id: string
        }
        Insert: {
          id?: string
          name: string
          shopping_group_id: string
        }
        Update: {
          id?: string
          name?: string
          shopping_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_shopping_group_id_fkey"
            columns: ["shopping_group_id"]
            isOneToOne: false
            referencedRelation: "shopping_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_group_members: {
        Row: {
          joined_at: string
          role: string
          shopping_group_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role: string
          shopping_group_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          shopping_group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_group_members_shopping_group_id_fkey"
            columns: ["shopping_group_id"]
            isOneToOne: false
            referencedRelation: "shopping_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_groups: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      shopping_item_status: {
        Row: {
          item_id: string
          planning_session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          item_id: string
          planning_session_id: string
          status: string
          updated_at?: string
        }
        Update: {
          item_id?: string
          planning_session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_item_status_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_item_status_planning_session_id_fkey"
            columns: ["planning_session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          checked: boolean
          created_at: string
          id: string
          item_id: string
          planning_session_id: string
          updated_at: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          id?: string
          item_id: string
          planning_session_id: string
          updated_at?: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          id?: string
          item_id?: string
          planning_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_planning_session_id_fkey"
            columns: ["planning_session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staple_selections: {
        Row: {
          item_id: string
          planning_session_id: string
          status: Database["public"]["Enums"]["staple_status"]
        }
        Insert: {
          item_id: string
          planning_session_id: string
          status?: Database["public"]["Enums"]["staple_status"]
        }
        Update: {
          item_id?: string
          planning_session_id?: string
          status?: Database["public"]["Enums"]["staple_status"]
        }
        Relationships: [
          {
            foreignKeyName: "staple_selections_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staple_selections_planning_session_id_fkey"
            columns: ["planning_session_id"]
            isOneToOne: false
            referencedRelation: "planning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_is_group_member: { Args: { group_id: string }; Returns: boolean }
    }
    Enums: {
      staple_status: "PENDING" | "INCLUDED" | "EXCLUDED"
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
    Enums: {
      staple_status: ["PENDING", "INCLUDED", "EXCLUDED"],
    },
  },
} as const
