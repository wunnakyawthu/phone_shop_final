export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database['public']['Enums']['audit_action']
          actor_user_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: Database['public']['Enums']['audit_action']
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: Database['public']['Enums']['audit_action']
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      brands: {
        Row: {
          category: Database['public']['Enums']['product_category'] | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: Database['public']['Enums']['product_category'] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: Database['public']['Enums']['product_category'] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'brands_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brands_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      computer_brands: {
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
      computer_inventory_items: {
        Row: {
          brand: string | null
          brand_id: string | null
          color: string | null
          computer_type: Database['public']['Enums']['computer_type']
          condition: Database['public']['Enums']['computer_condition']
          cpu: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          gpu: string | null
          id: string
          internal_notes: string | null
          is_deleted: boolean
          is_publicly_visible: boolean
          model_id: string | null
          model_name: string | null
          primary_storage_size: string | null
          primary_storage_type: string | null
          purchase_date: string | null
          purchase_from: string | null
          purchase_notes: string | null
          purchase_number: string
          purchase_price: number
          purchased_by_user_id: string | null
          ram: string | null
          seller_phone: string | null
          sale_price: number
          screen_size: string | null
          secondary_storage_size: string | null
          secondary_storage_type: string | null
          serial_number: string | null
          status: string
          storage: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          brand_id?: string | null
          color?: string | null
          computer_type: Database['public']['Enums']['computer_type']
          condition?: Database['public']['Enums']['computer_condition']
          cpu?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          gpu?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          is_publicly_visible?: boolean
          model_id?: string | null
          model_name?: string | null
          primary_storage_size?: string | null
          primary_storage_type?: string | null
          purchase_date?: string | null
          purchase_from?: string | null
          purchase_notes?: string | null
          purchase_number: string
          purchase_price?: number
          purchased_by_user_id?: string | null
          ram?: string | null
          seller_phone?: string | null
          sale_price?: number
          screen_size?: string | null
          secondary_storage_size?: string | null
          secondary_storage_type?: string | null
          serial_number?: string | null
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          brand_id?: string | null
          color?: string | null
          computer_type?: Database['public']['Enums']['computer_type']
          condition?: Database['public']['Enums']['computer_condition']
          cpu?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          gpu?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          is_publicly_visible?: boolean
          model_id?: string | null
          model_name?: string | null
          primary_storage_size?: string | null
          primary_storage_type?: string | null
          purchase_date?: string | null
          purchase_from?: string | null
          purchase_notes?: string | null
          purchase_number?: string
          purchase_price?: number
          purchased_by_user_id?: string | null
          ram?: string | null
          seller_phone?: string | null
          sale_price?: number
          screen_size?: string | null
          secondary_storage_size?: string | null
          secondary_storage_type?: string | null
          serial_number?: string | null
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'computer_inventory_items_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'computer_brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'computer_inventory_items_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'computer_inventory_items_model_id_fkey'
            columns: ['model_id']
            isOneToOne: false
            referencedRelation: 'computer_models'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'computer_inventory_items_purchased_by_user_id_fkey'
            columns: ['purchased_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      computer_inventory_photos: {
        Row: {
          computer_id: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          computer_id: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          computer_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'computer_inventory_photos_computer_id_fkey'
            columns: ['computer_id']
            isOneToOne: false
            referencedRelation: 'computer_inventory_items'
            referencedColumns: ['id']
          },
        ]
      }
      computer_models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'computer_models_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'computer_brands'
            referencedColumns: ['id']
          },
        ]
      }
      computer_photos: {
        Row: {
          computer_id: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          computer_id: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          computer_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'computer_photos_computer_id_fkey'
            columns: ['computer_id']
            isOneToOne: false
            referencedRelation: 'computer_inventory_items'
            referencedColumns: ['id']
          },
        ]
      }
      contacts: {
        Row: {
          contact_type: Database['public']['Enums']['contact_type']
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone_number: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_type: Database['public']['Enums']['contact_type']
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone_number: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_type?: Database['public']['Enums']['contact_type']
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone_number?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contacts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contacts_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      deleted_computer_inventory_items: {
        Row: {
          computer_id: string
          deleted_at: string
          deleted_by: string | null
          id: string
          photo_paths: Json
          snapshot: Json
        }
        Insert: {
          computer_id: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          photo_paths?: Json
          snapshot?: Json
        }
        Update: {
          computer_id?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          photo_paths?: Json
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'deleted_computer_inventory_items_computer_id_fkey'
            columns: ['computer_id']
            isOneToOne: true
            referencedRelation: 'computer_inventory_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deleted_computer_inventory_items_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      deleted_inventory_items: {
        Row: {
          brand_name: string
          category: Database['public']['Enums']['product_category']
          deleted_at: string
          deleted_by: string | null
          device_id: string
          id: string
          identifier: string | null
          model_name: string
          photo_paths: Json
          snapshot: Json
        }
        Insert: {
          brand_name: string
          category: Database['public']['Enums']['product_category']
          deleted_at?: string
          deleted_by?: string | null
          device_id: string
          id?: string
          identifier?: string | null
          model_name: string
          photo_paths?: Json
          snapshot?: Json
        }
        Update: {
          brand_name?: string
          category?: Database['public']['Enums']['product_category']
          deleted_at?: string
          deleted_by?: string | null
          device_id?: string
          id?: string
          identifier?: string | null
          model_name?: string
          photo_paths?: Json
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'deleted_inventory_items_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      device_costs: {
        Row: {
          amount_mmk: number
          cost_type: string
          created_at: string
          created_by: string
          device_unit_id: string
          id: string
          incurred_at: string
          notes: string | null
        }
        Insert: {
          amount_mmk: number
          cost_type: string
          created_at?: string
          created_by: string
          device_unit_id: string
          id?: string
          incurred_at?: string
          notes?: string | null
        }
        Update: {
          amount_mmk?: number
          cost_type?: string
          created_at?: string
          created_by?: string
          device_unit_id?: string
          id?: string
          incurred_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'device_costs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'device_costs_device_unit_id_fkey'
            columns: ['device_unit_id']
            isOneToOne: false
            referencedRelation: 'device_units'
            referencedColumns: ['id']
          },
        ]
      }
      device_photos: {
        Row: {
          created_at: string
          created_by: string
          device_unit_id: string
          id: string
          is_public: boolean
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by: string
          device_unit_id: string
          id?: string
          is_public?: boolean
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string
          device_unit_id?: string
          id?: string
          is_public?: boolean
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'device_photos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'device_photos_device_unit_id_fkey'
            columns: ['device_unit_id']
            isOneToOne: false
            referencedRelation: 'device_units'
            referencedColumns: ['id']
          },
        ]
      }
      device_units: {
        Row: {
          battery_cycle_count: number | null
          battery_health_percent: number | null
          category: Database['public']['Enums']['product_category']
          color: string | null
          condition: Database['public']['Enums']['device_condition'] | null
          cpu_processor: string | null
          created_at: string
          created_by: string
          device_state: Database['public']['Enums']['device_state']
          gpu_graphics: string | null
          id: string
          imei_1: string | null
          imei_2: string | null
          important_message_other: string | null
          important_message_type:
            Database['public']['Enums']['important_message_type'] | null
          internal_notes: string | null
          iphone_region_code: string | null
          is_publicly_visible: boolean
          product_model_id: string
          public_title_override: string | null
          public_token: string
          ram_gb: number | null
          sale_price_mmk: number
          screen_size_inches: number | null
          serial_number: string | null
          status: Database['public']['Enums']['inventory_status']
          storage_capacity_gb: number | null
          storage_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          battery_cycle_count?: number | null
          battery_health_percent?: number | null
          category: Database['public']['Enums']['product_category']
          color?: string | null
          condition?: Database['public']['Enums']['device_condition'] | null
          cpu_processor?: string | null
          created_at?: string
          created_by: string
          device_state: Database['public']['Enums']['device_state']
          gpu_graphics?: string | null
          id?: string
          imei_1?: string | null
          imei_2?: string | null
          important_message_other?: string | null
          important_message_type?:
            Database['public']['Enums']['important_message_type'] | null
          internal_notes?: string | null
          iphone_region_code?: string | null
          is_publicly_visible?: boolean
          product_model_id: string
          public_title_override?: string | null
          public_token?: string
          ram_gb?: number | null
          sale_price_mmk: number
          screen_size_inches?: number | null
          serial_number?: string | null
          status?: Database['public']['Enums']['inventory_status']
          storage_capacity_gb?: number | null
          storage_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          battery_cycle_count?: number | null
          battery_health_percent?: number | null
          category?: Database['public']['Enums']['product_category']
          color?: string | null
          condition?: Database['public']['Enums']['device_condition'] | null
          cpu_processor?: string | null
          created_at?: string
          created_by?: string
          device_state?: Database['public']['Enums']['device_state']
          gpu_graphics?: string | null
          id?: string
          imei_1?: string | null
          imei_2?: string | null
          important_message_other?: string | null
          important_message_type?:
            Database['public']['Enums']['important_message_type'] | null
          internal_notes?: string | null
          iphone_region_code?: string | null
          is_publicly_visible?: boolean
          product_model_id?: string
          public_title_override?: string | null
          public_token?: string
          ram_gb?: number | null
          sale_price_mmk?: number
          screen_size_inches?: number | null
          serial_number?: string | null
          status?: Database['public']['Enums']['inventory_status']
          storage_capacity_gb?: number | null
          storage_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'device_units_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'device_units_product_model_id_fkey'
            columns: ['product_model_id']
            isOneToOne: false
            referencedRelation: 'product_models'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'device_units_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      export_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          expires_at: string | null
          export_type: string
          id: string
          parameters: Json
          requested_by: string
          status: Database['public']['Enums']['export_status']
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          id?: string
          parameters?: Json
          requested_by: string
          status?: Database['public']['Enums']['export_status']
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          id?: string
          parameters?: Json
          requested_by?: string
          status?: Database['public']['Enums']['export_status']
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'export_jobs_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          device_unit_id: string
          id: string
          performed_by: string
          purchase_id: string | null
          reason: string | null
          sale_id: string | null
          status_after: Database['public']['Enums']['inventory_status']
          status_before: Database['public']['Enums']['inventory_status'] | null
          transaction_type: Database['public']['Enums']['inventory_transaction_type']
        }
        Insert: {
          created_at?: string
          device_unit_id: string
          id?: string
          performed_by: string
          purchase_id?: string | null
          reason?: string | null
          sale_id?: string | null
          status_after: Database['public']['Enums']['inventory_status']
          status_before?: Database['public']['Enums']['inventory_status'] | null
          transaction_type: Database['public']['Enums']['inventory_transaction_type']
        }
        Update: {
          created_at?: string
          device_unit_id?: string
          id?: string
          performed_by?: string
          purchase_id?: string | null
          reason?: string | null
          sale_id?: string | null
          status_after?: Database['public']['Enums']['inventory_status']
          status_before?: Database['public']['Enums']['inventory_status'] | null
          transaction_type?: Database['public']['Enums']['inventory_transaction_type']
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_transactions_device_unit_id_fkey'
            columns: ['device_unit_id']
            isOneToOne: false
            referencedRelation: 'device_units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_transactions_performed_by_fkey'
            columns: ['performed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_transactions_purchase_id_fkey'
            columns: ['purchase_id']
            isOneToOne: false
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_transactions_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
        ]
      }
      payment_methods: {
        Row: {
          code: Database['public']['Enums']['payment_method_code']
          display_name: string
          is_enabled: boolean
          sort_order: number
        }
        Insert: {
          code: Database['public']['Enums']['payment_method_code']
          display_name: string
          is_enabled?: boolean
          sort_order: number
        }
        Update: {
          code?: Database['public']['Enums']['payment_method_code']
          display_name?: string
          is_enabled?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      phone_model_specs: {
        Row: {
          colors: string[]
          created_at: string
          imei_count: number
          product_model_id: string
          storage_options_gb: number[]
          updated_at: string
        }
        Insert: {
          colors?: string[]
          created_at?: string
          imei_count?: number
          product_model_id: string
          storage_options_gb?: number[]
          updated_at?: string
        }
        Update: {
          colors?: string[]
          created_at?: string
          imei_count?: number
          product_model_id?: string
          storage_options_gb?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'phone_model_specs_product_model_id_fkey'
            columns: ['product_model_id']
            isOneToOne: true
            referencedRelation: 'product_models'
            referencedColumns: ['id']
          },
        ]
      }
      product_models: {
        Row: {
          brand_id: string
          category: Database['public']['Enums']['product_category']
          computer_type: Database['public']['Enums']['computer_type'] | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          phone_platform: Database['public']['Enums']['phone_platform'] | null
          public_description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_id: string
          category: Database['public']['Enums']['product_category']
          computer_type?: Database['public']['Enums']['computer_type'] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone_platform?: Database['public']['Enums']['phone_platform'] | null
          public_description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_id?: string
          category?: Database['public']['Enums']['product_category']
          computer_type?: Database['public']['Enums']['computer_type'] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone_platform?: Database['public']['Enums']['phone_platform'] | null
          public_description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_models_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_models_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_models_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          device_unit_id: string
          id: string
          notes: string | null
          purchase_id: string
          purchase_price_mmk: number
        }
        Insert: {
          created_at?: string
          device_unit_id: string
          id?: string
          notes?: string | null
          purchase_id: string
          purchase_price_mmk: number
        }
        Update: {
          created_at?: string
          device_unit_id?: string
          id?: string
          notes?: string | null
          purchase_id?: string
          purchase_price_mmk?: number
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_items_device_unit_id_fkey'
            columns: ['device_unit_id']
            isOneToOne: true
            referencedRelation: 'device_units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_items_purchase_id_fkey'
            columns: ['purchase_id']
            isOneToOne: false
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
        ]
      }
      purchases: {
        Row: {
          category: Database['public']['Enums']['product_category']
          checked_by_user_id: string
          created_at: string
          created_by: string
          device_state: Database['public']['Enums']['device_state']
          id: string
          notes: string | null
          purchase_date: string
          purchase_number: string
          purchased_by_user_id: string
          seller_contact_id: string | null
          seller_name_snapshot: string | null
          seller_phone_snapshot: string | null
          status: Database['public']['Enums']['financial_status']
        }
        Insert: {
          category: Database['public']['Enums']['product_category']
          checked_by_user_id: string
          created_at?: string
          created_by: string
          device_state: Database['public']['Enums']['device_state']
          id?: string
          notes?: string | null
          purchase_date?: string
          purchase_number: string
          purchased_by_user_id: string
          seller_contact_id?: string | null
          seller_name_snapshot?: string | null
          seller_phone_snapshot?: string | null
          status?: Database['public']['Enums']['financial_status']
        }
        Update: {
          category?: Database['public']['Enums']['product_category']
          checked_by_user_id?: string
          created_at?: string
          created_by?: string
          device_state?: Database['public']['Enums']['device_state']
          id?: string
          notes?: string | null
          purchase_date?: string
          purchase_number?: string
          purchased_by_user_id?: string
          seller_contact_id?: string | null
          seller_name_snapshot?: string | null
          seller_phone_snapshot?: string | null
          status?: Database['public']['Enums']['financial_status']
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_checked_by_user_id_fkey'
            columns: ['checked_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_purchased_by_user_id_fkey'
            columns: ['purchased_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_seller_contact_id_fkey'
            columns: ['seller_contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          device_unit_id: string
          discount_mmk: number
          id: string
          net_sale_mmk: number
          purchase_cost_snapshot_mmk: number
          sale_id: string
          unit_sale_price_mmk: number
          warranty_duration_days_snapshot: number | null
          warranty_plan_id: string | null
          warranty_terms_snapshot: string | null
        }
        Insert: {
          created_at?: string
          device_unit_id: string
          discount_mmk?: number
          id?: string
          net_sale_mmk: number
          purchase_cost_snapshot_mmk: number
          sale_id: string
          unit_sale_price_mmk: number
          warranty_duration_days_snapshot?: number | null
          warranty_plan_id?: string | null
          warranty_terms_snapshot?: string | null
        }
        Update: {
          created_at?: string
          device_unit_id?: string
          discount_mmk?: number
          id?: string
          net_sale_mmk?: number
          purchase_cost_snapshot_mmk?: number
          sale_id?: string
          unit_sale_price_mmk?: number
          warranty_duration_days_snapshot?: number | null
          warranty_plan_id?: string | null
          warranty_terms_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sale_items_device_unit_id_fkey'
            columns: ['device_unit_id']
            isOneToOne: true
            referencedRelation: 'device_units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_warranty_plan_id_fkey'
            columns: ['warranty_plan_id']
            isOneToOne: false
            referencedRelation: 'warranty_plans'
            referencedColumns: ['id']
          },
        ]
      }
      sale_payments: {
        Row: {
          amount_mmk: number
          created_at: string
          id: string
          method: Database['public']['Enums']['payment_method_code']
          sale_id: string
        }
        Insert: {
          amount_mmk: number
          created_at?: string
          id?: string
          method: Database['public']['Enums']['payment_method_code']
          sale_id: string
        }
        Update: {
          amount_mmk?: number
          created_at?: string
          id?: string
          method?: Database['public']['Enums']['payment_method_code']
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sale_payments_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: true
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
        ]
      }
      sales: {
        Row: {
          change_amount_mmk: number
          created_at: string
          created_by: string
          customer_contact_id: string | null
          discount_total_mmk: number
          id: string
          invoice_number: string
          net_sale_mmk: number
          notes: string | null
          payment_amount_mmk: number
          sale_date: string
          sold_by_user_id: string
          status: Database['public']['Enums']['financial_status']
          subtotal_mmk: number
        }
        Insert: {
          change_amount_mmk?: number
          created_at?: string
          created_by: string
          customer_contact_id?: string | null
          discount_total_mmk?: number
          id?: string
          invoice_number: string
          net_sale_mmk: number
          notes?: string | null
          payment_amount_mmk: number
          sale_date?: string
          sold_by_user_id: string
          status?: Database['public']['Enums']['financial_status']
          subtotal_mmk: number
        }
        Update: {
          change_amount_mmk?: number
          created_at?: string
          created_by?: string
          customer_contact_id?: string | null
          discount_total_mmk?: number
          id?: string
          invoice_number?: string
          net_sale_mmk?: number
          notes?: string | null
          payment_amount_mmk?: number
          sale_date?: string
          sold_by_user_id?: string
          status?: Database['public']['Enums']['financial_status']
          subtotal_mmk?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sales_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_customer_contact_id_fkey'
            columns: ['customer_contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_sold_by_user_id_fkey'
            columns: ['sold_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      store_settings: {
        Row: {
          created_at: string
          discount_settings: Json
          facebook_url: string | null
          id: boolean
          logo_path: string | null
          phone: string | null
          store_name: string
          tiktok_url: string | null
          telegram_url: string | null
          updated_at: string
          updated_by: string | null
          viber_url: string | null
        }
        Insert: {
          created_at?: string
          discount_settings?: Json
          facebook_url?: string | null
          id?: boolean
          logo_path?: string | null
          phone?: string | null
          store_name?: string
          tiktok_url?: string | null
          telegram_url?: string | null
          updated_at?: string
          updated_by?: string | null
          viber_url?: string | null
        }
        Update: {
          created_at?: string
          discount_settings?: Json
          facebook_url?: string | null
          id?: boolean
          logo_path?: string | null
          phone?: string | null
          store_name?: string
          tiktok_url?: string | null
          telegram_url?: string | null
          updated_at?: string
          updated_by?: string | null
          viber_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'store_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role: Database['public']['Enums']['app_role']
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role: Database['public']['Enums']['app_role']
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role?: Database['public']['Enums']['app_role']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      void_records: {
        Row: {
          created_at: string
          id: string
          purchase_id: string | null
          reason: string
          sale_id: string | null
          target_type: Database['public']['Enums']['void_target_type']
          voided_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          purchase_id?: string | null
          reason: string
          sale_id?: string | null
          target_type: Database['public']['Enums']['void_target_type']
          voided_by: string
        }
        Update: {
          created_at?: string
          id?: string
          purchase_id?: string | null
          reason?: string
          sale_id?: string | null
          target_type?: Database['public']['Enums']['void_target_type']
          voided_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'void_records_purchase_id_fkey'
            columns: ['purchase_id']
            isOneToOne: true
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'void_records_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: true
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'void_records_voided_by_fkey'
            columns: ['voided_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      warranty_plans: {
        Row: {
          created_at: string
          created_by: string | null
          customer_terms: string
          duration_days: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_terms?: string
          duration_days: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_terms?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'warranty_plans_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'warranty_plans_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_event: {
        Args: {
          p_action: Database['public']['Enums']['audit_action']
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      can_access_category: {
        Args: { p_category: Database['public']['Enums']['product_category'] }
        Returns: boolean
      }
      can_access_device: { Args: { p_device_id: string }; Returns: boolean }
      can_access_purchase: { Args: { p_purchase_id: string }; Returns: boolean }
      can_access_sale: { Args: { p_sale_id: string }; Returns: boolean }
      correct_inventory_status: {
        Args: {
          p_device_id: string
          p_new_status: Database['public']['Enums']['inventory_status']
          p_reason: string
        }
        Returns: undefined
      }
      create_computer_inventory_with_photos: {
        Args: {
          p_brand: string
          p_color: string
          p_computer_type: string
          p_condition: string
          p_cpu: string
          p_gpu: string
          p_internal_notes: string
          p_model_name: string
          p_photo_paths: string[]
          p_primary_storage_size: string
          p_primary_storage_type: string
          p_purchase_date: string
          p_purchase_from: string
          p_purchase_notes: string
          p_purchase_price: number
          p_ram: string
          p_sale_price: number
          p_screen_size: string
          p_seller_phone: string
          p_secondary_storage_size: string
          p_secondary_storage_type: string
          p_serial_number: string
        }
        Returns: string
      }
      create_purchase_with_devices: {
        Args: { p_items: Json; p_purchase: Json }
        Returns: string
      }
      create_purchase_with_devices_and_photos: {
        Args: { p_items: Json; p_purchase: Json }
        Returns: string
      }
      resolve_purchase_supplier: {
        Args: { p_full_name: string; p_phone: string }
        Returns: string
      }
      create_sale_with_items: {
        Args: { p_items: Json; p_sale: Json }
        Returns: string
      }
      current_app_role: {
        Args: never
        Returns: Database['public']['Enums']['app_role']
      }
      delete_computer_inventory_item: {
        Args: { p_computer_id: string }
        Returns: undefined
      }
      delete_phone_inventory_device: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      get_authorized_sale_items: {
        Args: { p_sale_id: string }
        Returns: {
          category: Database['public']['Enums']['product_category']
          device_id: string
          discount_mmk: number
          net_sale_mmk: number
          sale_id: string
          unit_sale_price_mmk: number
          warranty_duration_days: number
          warranty_terms: string
        }[]
      }
      get_deleted_computer_inventory: {
        Args: never
        Returns: {
          brand: string
          computer_id: string
          computer_type: string
          condition: string
          deleted_at: string
          deleted_by_name: string
          history_id: string
          model_name: string
          serial_number: string
          snapshot: Json
        }[]
      }
      get_deleted_phone_inventory: {
        Args: never
        Returns: {
          brand_name: string
          deleted_at: string
          deleted_by_name: string
          device_id: string
          history_id: string
          identifier: string
          model_name: string
          photo_paths: Json
          snapshot: Json
        }[]
      }
      get_public_catalog_device: {
        Args: { p_public_id: string }
        Returns: {
          battery_health_percent: number
          brand_name: string
          category: Database['public']['Enums']['product_category']
          color: string
          condition: Database['public']['Enums']['device_condition']
          cpu_processor: string
          device_state: Database['public']['Enums']['device_state']
          gpu_graphics: string
          iphone_region_code: string
          model_name: string
          photo_paths: Json
          public_id: string
          public_title: string
          ram_gb: number
          sale_price_mmk: number
          screen_size_inches: number
          storage_capacity_gb: number
          storage_type: string
        }[]
      }
      get_public_catalog_devices: {
        Args: {
          p_category?: Database['public']['Enums']['product_category']
          p_device_state?: Database['public']['Enums']['device_state']
          p_search?: string
        }
        Returns: {
          battery_health_percent: number
          brand_name: string
          category: Database['public']['Enums']['product_category']
          color: string
          condition: Database['public']['Enums']['device_condition']
          cpu_processor: string
          device_state: Database['public']['Enums']['device_state']
          gpu_graphics: string
          iphone_region_code: string
          model_name: string
          photo_paths: Json
          public_id: string
          public_title: string
          ram_gb: number
          sale_price_mmk: number
          screen_size_inches: number
          storage_capacity_gb: number
          storage_type: string
        }[]
      }
      get_public_computer_catalog: {
        Args: never
        Returns: {
          brand_name: string
          color: string
          computer_type: string
          condition: string
          cpu: string
          gpu: string
          id: string
          model_name: string
          photo_path: string
          primary_storage_size: string
          primary_storage_type: string
          ram: string
          sale_price: number
          screen_size: string
        }[]
      }
      get_public_computer_device: {
        Args: { p_public_id: string }
        Returns: {
          brand_name: string
          color: string
          computer_type: string
          condition: string
          cpu: string
          gpu: string
          id: string
          model_name: string
          photo_paths: Json
          primary_storage_size: string
          primary_storage_type: string
          ram: string
          sale_price: number
          screen_size: string
          secondary_storage_size: string
          secondary_storage_type: string
          serial_number: string
        }[]
      }
      get_public_store_branding: {
        Args: never
        Returns: {
          address: string | null
          facebook_url: string | null
          google_maps_url: string | null
          logo_path: string | null
          phone: string | null
          store_name: string
          tiktok_url: string | null
          telegram_url: string | null
          viber_url: string | null
          workspace_label: string
        }[]
      }
      is_active_staff: { Args: never; Returns: boolean }
      is_manager_or_owner: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      permanently_delete_computer_inventory_item: {
        Args: { p_history_id: string }
        Returns: undefined
      }
      permanently_delete_computer_inventory_item_with_photos: {
        Args: { p_history_id: string }
        Returns: string[]
      }
      permanently_delete_phone_inventory_item: {
        Args: { p_history_id: string }
        Returns: string[]
      }
      profile_can_access_category: {
        Args: {
          p_category: Database['public']['Enums']['product_category']
          p_user_id: string
        }
        Returns: boolean
      }
      restore_deleted_computer_inventory_item: {
        Args: { p_history_id: string }
        Returns: undefined
      }
      restore_deleted_phone_inventory_item: {
        Args: { p_history_id: string }
        Returns: undefined
      }
      set_device_publication: {
        Args: { p_device_id: string; p_is_public: boolean }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      update_phone_inventory_device: {
        Args: { p_device_id: string; p_patch: Json; p_photo_paths: Json }
        Returns: undefined
      }
      upsert_phone_model_with_specs: {
        Args: {
          p_brand_id: string
          p_colors: string[]
          p_imei_count?: number
          p_name: string
          p_phone_platform: Database['public']['Enums']['phone_platform']
          p_storage_options_gb: number[]
        }
        Returns: string
      }
      void_purchase: {
        Args: { p_purchase_id: string; p_reason: string }
        Returns: undefined
      }
      void_sale: {
        Args: { p_reason: string; p_sale_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: 'owner' | 'phone_staff' | 'computer_staff' | 'manager'
      audit_action:
        | 'user_created'
        | 'user_deactivated'
        | 'role_changed'
        | 'brand_created'
        | 'brand_updated'
        | 'model_created'
        | 'model_updated'
        | 'purchase_created'
        | 'purchase_voided'
        | 'device_created'
        | 'device_updated'
        | 'device_published'
        | 'sale_created'
        | 'sale_voided'
        | 'inventory_corrected'
        | 'settings_updated'
        | 'export_requested'
        | 'export_completed'
        | 'export_failed'
      computer_condition: 'new' | 'used'
      computer_type: 'macbook' | 'windows_laptop' | 'all_in_one' | 'desktop_system_unit'
      contact_type: 'seller' | 'customer' | 'both'
      device_condition: 'excellent' | 'very_good' | 'good' | 'fair'
      device_state: 'new' | 'used'
      export_status: 'requested' | 'processing' | 'completed' | 'failed' | 'expired'
      financial_status: 'completed' | 'voided'
      important_message_type:
        'none' | 'battery' | 'display' | 'camera' | 'face_id' | 'other'
      inventory_status: 'in_stock' | 'sold' | 'voided'
      inventory_transaction_type:
        | 'purchase_received'
        | 'sale_completed'
        | 'void_purchase'
        | 'void_sale'
        | 'correction'
      payment_method_code: 'cash' | 'kbz_pay' | 'aya_pay' | 'wave_pay' | 'bank_transfer'
      phone_platform: 'iphone' | 'android' | 'other'
      product_category: 'phone' | 'computer'
      void_target_type: 'purchase' | 'sale'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ['owner', 'phone_staff', 'computer_staff', 'manager'],
      audit_action: [
        'user_created',
        'user_deactivated',
        'role_changed',
        'brand_created',
        'brand_updated',
        'model_created',
        'model_updated',
        'purchase_created',
        'purchase_voided',
        'device_created',
        'device_updated',
        'device_published',
        'sale_created',
        'sale_voided',
        'inventory_corrected',
        'settings_updated',
        'export_requested',
        'export_completed',
        'export_failed',
      ],
      computer_condition: ['new', 'used'],
      computer_type: ['macbook', 'windows_laptop', 'all_in_one', 'desktop_system_unit'],
      contact_type: ['seller', 'customer', 'both'],
      device_condition: ['excellent', 'very_good', 'good', 'fair'],
      device_state: ['new', 'used'],
      export_status: ['requested', 'processing', 'completed', 'failed', 'expired'],
      financial_status: ['completed', 'voided'],
      important_message_type: [
        'none',
        'battery',
        'display',
        'camera',
        'face_id',
        'other',
      ],
      inventory_status: ['in_stock', 'sold', 'voided'],
      inventory_transaction_type: [
        'purchase_received',
        'sale_completed',
        'void_purchase',
        'void_sale',
        'correction',
      ],
      payment_method_code: ['cash', 'kbz_pay', 'aya_pay', 'wave_pay', 'bank_transfer'],
      phone_platform: ['iphone', 'android', 'other'],
      product_category: ['phone', 'computer'],
      void_target_type: ['purchase', 'sale'],
    },
  },
} as const
