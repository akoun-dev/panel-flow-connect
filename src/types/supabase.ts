export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      panel_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_read: boolean | null
          panel_id: string
          panelist_email: string
          status: string
          unique_token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_read?: boolean | null
          panel_id: string
          panelist_email: string
          status?: string
          unique_token: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_read?: boolean | null
          panel_id?: string
          panelist_email?: string
          status?: string
          unique_token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_invitations_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      panels: {
        Row: {
          allocated_time: number | null
          category: string | null
          created_at: string
          date: string
          description: string
          duration: number
          end_time: string | null
          id: string
          moderator_email: string | null
          moderator_name: string | null
          panelists: Json | null
          participants_limit: number
          qr_code_url: string | null
          start_time: string | null
          status: string
          tags: string[] | null
          theme: string | null
          time: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allocated_time?: number | null
          category?: string | null
          created_at?: string
          date: string
          description: string
          duration: number
          end_time?: string | null
          id?: string
          moderator_email?: string | null
          moderator_name?: string | null
          panelists?: Json | null
          participants_limit: number
          qr_code_url?: string | null
          start_time?: string | null
          status?: string
          tags?: string[] | null
          theme?: string | null
          time: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allocated_time?: number | null
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          duration?: number
          end_time?: string | null
          id?: string
          moderator_email?: string | null
          moderator_name?: string | null
          panelists?: Json | null
          participants_limit?: number
          qr_code_url?: string | null
          start_time?: string | null
          status?: string
          tags?: string[] | null
          theme?: string | null
          time?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panels_user_id_users_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          id: string
          content: string
          panel_id: string
          is_anonymous: boolean | null
          is_answered: boolean | null
          created_at: string
          panelist_email: string | null
          author_name: string | null
        }
        Insert: {
          id?: string
          content: string
          panel_id: string
          is_anonymous?: boolean | null
          is_answered?: boolean | null
          created_at?: string
          panelist_email?: string | null
          author_name?: string | null
        }
        Update: {
          id?: string
          content?: string
          panel_id?: string
          is_anonymous?: boolean | null
          is_answered?: boolean | null
          created_at?: string
          panelist_email?: string | null
          author_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          id: string
          panel_id: string
          question: string
          created_at: string | null
        }
        Insert: {
          id?: string
          panel_id: string
          question: string
          created_at?: string | null
        }
        Update: {
          id?: string
          panel_id?: string
          question?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          text: string
        }
        Insert: {
          id?: string
          poll_id: string
          text: string
        }
        Update: {
          id?: string
          poll_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          poll_id: string
          option_id: string
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          poll_id?: string
          option_id?: string
          user_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_invitations: {
        Args: { user_email: string }
        Returns: {
          id: string
          panel_id: string
          panelist_email: string
          status: string
          expires_at: string
          created_at: string
          panel_title: string
          panel_description: string
          panel_date: string
          panel_time: string
          panel_duration: number
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
