
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activities": {
                  Row: {
                    "created_at": string,"deal_value": number | null,"id": string,"industry": string | null,"lead_id": string | null,"local_date": string,"local_hour": number,"note": string | null,"objection_id": string | null,"offer": Database["public"]['Enums']["offer_type"] | null,"player_id": string,"points": number,"script_id": string | null,"type": Database["public"]['Enums']["activity_type"],"void_kind": string | null,"voided_at": string | null,"week_start": string
                  }
                  Insert: {
                    "created_at"?: string,"deal_value"?: number | null,"id"?: string,"industry"?: string | null,"lead_id"?: string | null,"local_date"?: string,"local_hour"?: number,"note"?: string | null,"objection_id"?: string | null,"offer"?: Database["public"]['Enums']["offer_type"] | null,"player_id"?: string,"points"?: number,"script_id"?: string | null,"type": Database["public"]['Enums']["activity_type"],"void_kind"?: string | null,"voided_at"?: string | null,"week_start"?: string
                  }
                  Update: {
                    "created_at"?: string,"deal_value"?: number | null,"id"?: string,"industry"?: string | null,"lead_id"?: string | null,"local_date"?: string,"local_hour"?: number,"note"?: string | null,"objection_id"?: string | null,"offer"?: Database["public"]['Enums']["offer_type"] | null,"player_id"?: string,"points"?: number,"script_id"?: string | null,"type"?: Database["public"]['Enums']["activity_type"],"void_kind"?: string | null,"voided_at"?: string | null,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_objection_id_fkey"
      columns: ["objection_id"]
isOneToOne: false
      referencedRelation: "objections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_script_id_fkey"
      columns: ["script_id"]
isOneToOne: false
      referencedRelation: "scripts"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "blitz_multiplier": number,"id": boolean,"quest_bonus": number,"script_bonus": number,"streak_min_calls": number,"undo_window_minutes": number,"updated_at": string
                  }
                  Insert: {
                    "blitz_multiplier"?: number,"id"?: boolean,"quest_bonus"?: number,"script_bonus"?: number,"streak_min_calls"?: number,"undo_window_minutes"?: number,"updated_at"?: string
                  }
                  Update: {
                    "blitz_multiplier"?: number,"id"?: boolean,"quest_bonus"?: number,"script_bonus"?: number,"streak_min_calls"?: number,"undo_window_minutes"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"leads": {
                  Row: {
                    "city": string | null,"company": string,"contact_name": string | null,"created_at": string,"id": string,"import_batch": string | null,"industry": string | null,"last_activity_at": string | null,"notes": string | null,"owner_id": string,"phone": string | null,"status": Database["public"]['Enums']["lead_status"],"updated_at": string
                  }
                  Insert: {
                    "city"?: string | null,"company": string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"import_batch"?: string | null,"industry"?: string | null,"last_activity_at"?: string | null,"notes"?: string | null,"owner_id"?: string,"phone"?: string | null,"status"?: Database["public"]['Enums']["lead_status"],"updated_at"?: string
                  }
                  Update: {
                    "city"?: string | null,"company"?: string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"import_batch"?: string | null,"industry"?: string | null,"last_activity_at"?: string | null,"notes"?: string | null,"owner_id"?: string,"phone"?: string | null,"status"?: Database["public"]['Enums']["lead_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"month_goals": {
                  Row: {
                    "metric": string,"month": string,"target": number,"updated_at": string
                  }
                  Insert: {
                    "metric"?: string,"month": string,"target": number,"updated_at"?: string
                  }
                  Update: {
                    "metric"?: string,"month"?: string,"target"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"objections": {
                  Row: {
                    "author_id": string,"created_at": string,"id": string,"text": string
                  }
                  Insert: {
                    "author_id"?: string,"created_at"?: string,"id"?: string,"text": string
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "objections_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "avatar_color": string,"created_at": string,"email": string,"id": string,"name": string,"off_days": (number)[],"region_label": string,"telegram_chat_id": number | null,"timezone": string,"user_id": string | null
                  }
                  Insert: {
                    "avatar_color"?: string,"created_at"?: string,"email": string,"id"?: string,"name": string,"off_days"?: (number)[],"region_label"?: string,"telegram_chat_id"?: number | null,"timezone"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "avatar_color"?: string,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"off_days"?: (number)[],"region_label"?: string,"telegram_chat_id"?: number | null,"timezone"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"score_ledger": {
                  Row: {
                    "activity_id": string | null,"created_at": string,"id": number,"local_date": string,"meta": NonNullable<Json>,"player_id": string,"points": number,"source": string,"voided": boolean,"week_start": string
                  }
                  Insert: {
                    "activity_id"?: string | null,"created_at"?: string,"id"?: number,"local_date": string,"meta"?: NonNullable<Json>,"player_id": string,"points": number,"source": string,"voided"?: boolean,"week_start": string
                  }
                  Update: {
                    "activity_id"?: string | null,"created_at"?: string,"id"?: number,"local_date"?: string,"meta"?: NonNullable<Json>,"player_id"?: string,"points"?: number,"source"?: string,"voided"?: boolean,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "score_ledger_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "score_ledger_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"scoring_rules": {
                  Row: {
                    "label": string,"points": number,"sort": number,"step_points": number,"type": Database["public"]['Enums']["activity_type"],"updated_at": string,"usd_step": number | null
                  }
                  Insert: {
                    "label": string,"points": number,"sort"?: number,"step_points"?: number,"type": Database["public"]['Enums']["activity_type"],"updated_at"?: string,"usd_step"?: number | null
                  }
                  Update: {
                    "label"?: string,"points"?: number,"sort"?: number,"step_points"?: number,"type"?: Database["public"]['Enums']["activity_type"],"updated_at"?: string,"usd_step"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"scripts": {
                  Row: {
                    "author_id": string,"created_at": string,"id": string,"objection_id": string,"text": string
                  }
                  Insert: {
                    "author_id"?: string,"created_at"?: string,"id"?: string,"objection_id": string,"text": string
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"id"?: string,"objection_id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scripts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scripts_objection_id_fkey"
      columns: ["objection_id"]
isOneToOne: false
      referencedRelation: "objections"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_daily_stats": {
                  Row: {
                    "deal_sum": number | null,"deals": number | null,"dials": number | null,"local_date": string | null,"meetings_held": number | null,"meetings_set": number | null,"player_id": string | null,"points": number | null,"proposals": number | null,"rejections": number | null,"talks": number | null,"week_start": string | null
                  }
                  Relationships: [
                    
                  ]
                },"v_weekly_scores": {
                  Row: {
                    "player_id": string | null,"points": number | null,"week_start": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "score_ledger_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "calc_points":
{ Args: { "p_deal_value": number,"p_type": Database["public"]['Enums']["activity_type"] }; Returns: number
                           },
"current_player_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_player":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lead_status_rank":
{ Args: { "s": Database["public"]['Enums']["lead_status"] }; Returns: number
                           },
"month_progress":
{ Args: { "p_month": string }; Returns: {
              "metric": string,"per_player": Json,"target": number,"total": number
            }[]
                           },
"next_lead_status":
{ Args: { "cur": Database["public"]['Enums']["lead_status"],"t": Database["public"]['Enums']["activity_type"] }; Returns: Database["public"]['Enums']["lead_status"]
                           },
"player_local":
{ Args: { "p_at": string,"p_player": string }; Returns: Record<string, unknown>
                           },
"player_today":
{ Args: { "p_player": string }; Returns: {
              "local_date": string,"week_start": string
            }[]
                           },
"recompute_lead_status":
{ Args: { "p_lead": string }; Returns: undefined
                           },
"undo_activity":
{ Args: { "p_id": string }; Returns: string
                           },
"week_summary":
{ Args: { "p_week": string }; Returns: {
              "avatar_color": string,"calibrating": boolean,"growth": number,"growth_winner": boolean,"name": string,"player_id": string,"points": number,"prev_avg": number,"prev_weeks": number,"region_label": string,"volume_winner": boolean,"week_closed": boolean
            }[]
                           }
          }
          Enums: {
            "activity_type": "call"|"conversation"|"rejection"|"meeting_set"|"meeting_held"|"proposal"|"deal"|"followup","lead_status": "new"|"contacted"|"meeting_set"|"meeting_held"|"proposal"|"won"|"lost","offer_type": "website"|"automation"|"ai"|"mixed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_type": ["call", "conversation", "rejection", "meeting_set", "meeting_held", "proposal", "deal", "followup"],"lead_status": ["new", "contacted", "meeting_set", "meeting_held", "proposal", "won", "lost"],"offer_type": ["website", "automation", "ai", "mixed"]
          }
        }
} as const

