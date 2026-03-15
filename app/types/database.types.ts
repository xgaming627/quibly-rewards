export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    display_name: string
                    avatar_emoji: string | null
                    is_admin: boolean
                    current_streak: number
                    last_streak_date: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    display_name?: string
                    avatar_emoji?: string | null
                    is_admin?: boolean
                    current_streak?: number
                    last_streak_date?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    display_name?: string
                    avatar_emoji?: string | null
                    is_admin?: boolean
                    current_streak?: number
                    last_streak_date?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            site_config: {
                Row: {
                    id: number
                    streak_bonus_multiplier: number
                    updated_at: string
                }
                Insert: {
                    id?: number
                    streak_bonus_multiplier?: number
                    updated_at?: string
                }
                Update: {
                    id?: number
                    streak_bonus_multiplier?: number
                    updated_at?: string
                }
                Relationships: []
            }
            tasks: {
                Row: {
                    id: string
                    created_by: string
                    assigned_to: string | null
                    title: string
                    description: string | null
                    emoji: string | null
                    point_value: number
                    time_limit_minutes: number | null
                    time_limit_bonus: number
                    recurrence: 'daily' | 'weekly' | 'all_time'
                    state: 'unlocked' | 'locked'
                    is_active: boolean
                    due_date: string | null
                    preset_id: string | null
                    time_of_day: 'morning' | 'afternoon' | 'night'
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    created_by: string
                    assigned_to?: string | null
                    title: string
                    description?: string | null
                    emoji?: string | null
                    point_value?: number
                    time_limit_minutes?: number | null
                    time_limit_bonus?: number
                    recurrence?: 'daily' | 'weekly' | 'all_time'
                    state?: 'unlocked' | 'locked'
                    is_active?: boolean
                    due_date?: string | null
                    preset_id?: string | null
                    time_of_day?: 'morning' | 'afternoon' | 'night'
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    created_by?: string
                    assigned_to?: string | null
                    title?: string
                    description?: string | null
                    emoji?: string | null
                    point_value?: number
                    time_limit_minutes?: number | null
                    time_limit_bonus?: number
                    recurrence?: 'daily' | 'weekly' | 'all_time'
                    state?: 'unlocked' | 'locked'
                    is_active?: boolean
                    due_date?: string | null
                    preset_id?: string | null
                    time_of_day?: 'morning' | 'afternoon' | 'night'
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            task_presets: {
                Row: {
                    id: string
                    parent_id: string
                    title: string
                    description: string | null
                    point_value: number
                    emoji: string | null
                    is_active: boolean
                    schedule_type: 'daily' | 'range' | 'days'
                    schedule_data: Json
                    day_lock: boolean
                    time_limit_minutes: number | null
                    time_limit_bonus: number
                    time_of_day: 'morning' | 'afternoon' | 'night'
                    sort_order: number
                    weekly_persistence: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    parent_id: string
                    title: string
                    description?: string | null
                    point_value?: number
                    emoji?: string | null
                    is_active?: boolean
                    schedule_type: 'daily' | 'range' | 'days'
                    schedule_data: Json
                    day_lock?: boolean
                    time_limit_minutes?: number | null
                    time_limit_bonus?: number
                    time_of_day?: 'morning' | 'afternoon' | 'night'
                    sort_order?: number
                    weekly_persistence?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    parent_id?: string
                    title?: string
                    description?: string | null
                    point_value?: number
                    emoji?: string | null
                    is_active?: boolean
                    schedule_type?: 'daily' | 'range' | 'days'
                    schedule_data?: Json
                    day_lock?: boolean
                    time_limit_minutes?: number | null
                    time_limit_bonus?: number
                    time_of_day?: 'morning' | 'afternoon' | 'night'
                    sort_order?: number
                    weekly_persistence?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "task_presets_parent_id_fkey"
                        columns: ["parent_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rewards: {
                Row: {
                    id: string
                    created_by: string
                    title: string
                    description: string | null
                    image_url: string | null
                    point_cost: number
                    stock: number | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    created_by: string
                    title: string
                    description?: string | null
                    image_url?: string | null
                    point_cost?: number
                    stock?: number | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    created_by?: string
                    title?: string
                    description?: string | null
                    image_url?: string | null
                    point_cost?: number
                    stock?: number | null
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            point_ledger: {
                Row: {
                    id: string
                    child_id: string
                    task_id: string | null
                    reward_id: string | null
                    transaction_type: 'task_completion' | 'reward_purchase' | 'parent_adjustment' | 'undo'
                    point_delta: number
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    child_id: string
                    task_id?: string | null
                    reward_id?: string | null
                    transaction_type: 'task_completion' | 'reward_purchase' | 'parent_adjustment' | 'undo'
                    point_delta: number
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    child_id?: string
                    task_id?: string | null
                    reward_id?: string | null
                    transaction_type?: 'task_completion' | 'reward_purchase' | 'parent_adjustment' | 'undo'
                    point_delta?: number
                    notes?: string | null
                    created_at?: string
                }
                Relationships: any[]
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    body: string
                    is_read: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    body: string
                    is_read?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    body?: string
                    is_read?: boolean
                    created_at?: string
                }
                Relationships: any[]
            }
        }
        Views: {
            child_balances: {
                Row: {
                    child_id: string
                    child_name: string
                    current_points: number
                }
                Insert: {
                    child_id?: string
                    child_name?: string
                    current_points?: number
                }
                Update: {
                    child_id?: string
                    child_name?: string
                    current_points?: number
                }
                Relationships: any[]
            }
        }
        Functions: {
            purchase_reward: {
                Args: {
                    p_child_id: string
                    p_reward_id: string
                }
                Returns: Json
            }
        }
        Enums: {
            task_recurrence: 'daily' | 'weekly' | 'all_time'
            task_state: 'unlocked' | 'locked'
            ledger_transaction_type: 'task_completion' | 'reward_purchase' | 'parent_adjustment' | 'undo'
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
