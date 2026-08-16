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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          payload: Json | null
          result: Json | null
          reverted_at: string | null
          reverted_by: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          result?: Json | null
          reverted_at?: string | null
          reverted_by?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          result?: Json | null
          reverted_at?: string | null
          reverted_by?: string | null
        }
        Relationships: []
      }
      admin_wallets: {
        Row: {
          archived_balance: number
          balance: number
          created_at: string
          id: string
          kind: string
          updated_at: string
        }
        Insert: {
          archived_balance?: number
          balance?: number
          created_at?: string
          id?: string
          kind: string
          updated_at?: string
        }
        Update: {
          archived_balance?: number
          balance?: number
          created_at?: string
          id?: string
          kind?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      archive_snapshots: {
        Row: {
          admin_wallet_totals: Json | null
          archived_at: string
          created_by: string | null
          endpoint_totals: Json | null
          id: string
          note: string | null
          report_totals: Json | null
          restored_at: string | null
          tx_count: number
          wallet_totals: Json | null
        }
        Insert: {
          admin_wallet_totals?: Json | null
          archived_at?: string
          created_by?: string | null
          endpoint_totals?: Json | null
          id?: string
          note?: string | null
          report_totals?: Json | null
          restored_at?: string | null
          tx_count?: number
          wallet_totals?: Json | null
        }
        Update: {
          admin_wallet_totals?: Json | null
          archived_at?: string
          created_by?: string | null
          endpoint_totals?: Json | null
          id?: string
          note?: string | null
          report_totals?: Json | null
          restored_at?: string | null
          tx_count?: number
          wallet_totals?: Json | null
        }
        Relationships: []
      }
      card_transactions: {
        Row: {
          amount_kes: number
          amount_usd: number
          card_id: string
          created_at: string
          description: string | null
          flw_reference: string | null
          fx_rate: number | null
          id: string
          kind: string
          merchant: string | null
          raw: Json | null
          status: string
          user_id: string
        }
        Insert: {
          amount_kes?: number
          amount_usd?: number
          card_id: string
          created_at?: string
          description?: string | null
          flw_reference?: string | null
          fx_rate?: number | null
          id?: string
          kind: string
          merchant?: string | null
          raw?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          amount_usd?: number
          card_id?: string
          created_at?: string
          description?: string | null
          flw_reference?: string | null
          fx_rate?: number | null
          id?: string
          kind?: string
          merchant?: string | null
          raw?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "virtual_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          account_number: string | null
          admin_notes: string | null
          bank_code: string | null
          bank_name: string | null
          business_number: string | null
          channel_type: string
          created_at: string
          id: string
          is_default: boolean
          makamesco_settlement_id: string | null
          mpay_payment_id: string | null
          name: string
          reviewed_by: string | null
          status: string
          swiftwallet_channel_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          admin_notes?: string | null
          bank_code?: string | null
          bank_name?: string | null
          business_number?: string | null
          channel_type?: string
          created_at?: string
          id?: string
          is_default?: boolean
          makamesco_settlement_id?: string | null
          mpay_payment_id?: string | null
          name: string
          reviewed_by?: string | null
          status?: string
          swiftwallet_channel_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          admin_notes?: string | null
          bank_code?: string | null
          bank_name?: string | null
          business_number?: string | null
          channel_type?: string
          created_at?: string
          id?: string
          is_default?: boolean
          makamesco_settlement_id?: string | null
          mpay_payment_id?: string | null
          name?: string
          reviewed_by?: string | null
          status?: string
          swiftwallet_channel_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      endpoints: {
        Row: {
          api_key: string
          callback_url: string
          created_at: string
          expose_account_info: boolean
          id: string
          integration_type: string
          name: string
          status: string
          successful_transactions: number
          total_collected: number
          total_transactions: number
          updated_at: string
          user_id: string
          withdrawal_daily_limit: number
          withdrawal_phone_whitelist: string[]
          withdrawal_secret: string
          withdrawals_enabled: boolean
        }
        Insert: {
          api_key?: string
          callback_url: string
          created_at?: string
          expose_account_info?: boolean
          id?: string
          integration_type?: string
          name: string
          status?: string
          successful_transactions?: number
          total_collected?: number
          total_transactions?: number
          updated_at?: string
          user_id: string
          withdrawal_daily_limit?: number
          withdrawal_phone_whitelist?: string[]
          withdrawal_secret?: string
          withdrawals_enabled?: boolean
        }
        Update: {
          api_key?: string
          callback_url?: string
          created_at?: string
          expose_account_info?: boolean
          id?: string
          integration_type?: string
          name?: string
          status?: string
          successful_transactions?: number
          total_collected?: number
          total_transactions?: number
          updated_at?: string
          user_id?: string
          withdrawal_daily_limit?: number
          withdrawal_phone_whitelist?: string[]
          withdrawal_secret?: string
          withdrawals_enabled?: boolean
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          votes: number
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          votes?: number
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          votes?: number
        }
        Relationships: []
      }
      fees: {
        Row: {
          cost_per_transaction: number
          created_at: string
          id: string
          max_amount: number
          min_amount: number
          service_cost: number
          service_fee: number
          withdrawal_cost: number
          withdrawal_fee: number
        }
        Insert: {
          cost_per_transaction?: number
          created_at?: string
          id?: string
          max_amount: number
          min_amount: number
          service_cost?: number
          service_fee: number
          withdrawal_cost?: number
          withdrawal_fee: number
        }
        Update: {
          cost_per_transaction?: number
          created_at?: string
          id?: string
          max_amount?: number
          min_amount?: number
          service_cost?: number
          service_fee?: number
          withdrawal_cost?: number
          withdrawal_fee?: number
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          file_url: string
          id: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          description: string
          endpoint_limit: number
          features: Json
          id: string
          is_popular: boolean
          name: string
          price: number
          tx_limit: number
        }
        Insert: {
          created_at?: string
          description?: string
          endpoint_limit?: number
          features?: Json
          id?: string
          is_popular?: boolean
          name: string
          price?: number
          tx_limit?: number
        }
        Update: {
          created_at?: string
          description?: string
          endpoint_limit?: number
          features?: Json
          id?: string
          is_popular?: boolean
          name?: string
          price?: number
          tx_limit?: number
        }
        Relationships: []
      }
      platform_settings: {
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
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          activation_paid: boolean
          banned: boolean
          can_create_endpoints: boolean
          can_deposit: boolean
          can_withdraw: boolean
          created_at: string
          current_package_id: string | null
          disabled_providers: string[]
          flagged: boolean
          full_name: string
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          package_expires_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          withdrawal_review_required: boolean
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          activation_paid?: boolean
          banned?: boolean
          can_create_endpoints?: boolean
          can_deposit?: boolean
          can_withdraw?: boolean
          created_at?: string
          current_package_id?: string | null
          disabled_providers?: string[]
          flagged?: boolean
          full_name?: string
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          package_expires_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          withdrawal_review_required?: boolean
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          activation_paid?: boolean
          banned?: boolean
          can_create_endpoints?: boolean
          can_deposit?: boolean
          can_withdraw?: boolean
          created_at?: string
          current_package_id?: string | null
          disabled_providers?: string[]
          flagged?: boolean
          full_name?: string
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          package_expires_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          withdrawal_review_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_package_id_fkey"
            columns: ["current_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_fee_tiers: {
        Row: {
          cost_amount: number
          created_at: string
          direction: string
          enabled: boolean
          fee_amount: number
          id: string
          max_amount: number
          min_amount: number
          provider: string
          updated_at: string
        }
        Insert: {
          cost_amount?: number
          created_at?: string
          direction: string
          enabled?: boolean
          fee_amount?: number
          id?: string
          max_amount: number
          min_amount: number
          provider: string
          updated_at?: string
        }
        Update: {
          cost_amount?: number
          created_at?: string
          direction?: string
          enabled?: boolean
          fee_amount?: number
          id?: string
          max_amount?: number
          min_amount?: number
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_fees: {
        Row: {
          deposit_cost_pct: number
          deposit_fee_pct: number
          enabled: boolean
          provider: string
          updated_at: string
          withdrawal_cost_pct: number
          withdrawal_fee_pct: number
        }
        Insert: {
          deposit_cost_pct?: number
          deposit_fee_pct?: number
          enabled?: boolean
          provider: string
          updated_at?: string
          withdrawal_cost_pct?: number
          withdrawal_fee_pct?: number
        }
        Update: {
          deposit_cost_pct?: number
          deposit_fee_pct?: number
          enabled?: boolean
          provider?: string
          updated_at?: string
          withdrawal_cost_pct?: number
          withdrawal_fee_pct?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_review_notes: string | null
          amount: number
          archive_snapshot_id: string | null
          archived_at: string | null
          callback_data: Json | null
          created_at: string
          endpoint_id: string | null
          error_message: string | null
          external_reference: string | null
          fee: number
          flagged: boolean
          id: string
          mpesa_receipt: string | null
          phone: string | null
          profit_allocated: boolean
          provider: string | null
          status: Database["public"]["Enums"]["tx_status"]
          swiftwallet_checkout_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          user_id: string
          verified_via: string | null
          wallet_type: Database["public"]["Enums"]["wallet_type"] | null
        }
        Insert: {
          admin_review_notes?: string | null
          amount: number
          archive_snapshot_id?: string | null
          archived_at?: string | null
          callback_data?: Json | null
          created_at?: string
          endpoint_id?: string | null
          error_message?: string | null
          external_reference?: string | null
          fee?: number
          flagged?: boolean
          id?: string
          mpesa_receipt?: string | null
          phone?: string | null
          profit_allocated?: boolean
          provider?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          swiftwallet_checkout_id?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id: string
          verified_via?: string | null
          wallet_type?: Database["public"]["Enums"]["wallet_type"] | null
        }
        Update: {
          admin_review_notes?: string | null
          amount?: number
          archive_snapshot_id?: string | null
          archived_at?: string | null
          callback_data?: Json | null
          created_at?: string
          endpoint_id?: string | null
          error_message?: string | null
          external_reference?: string | null
          fee?: number
          flagged?: boolean
          id?: string
          mpesa_receipt?: string | null
          phone?: string | null
          profit_allocated?: boolean
          provider?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          swiftwallet_checkout_id?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string
          verified_via?: string | null
          wallet_type?: Database["public"]["Enums"]["wallet_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_archive_snapshot_id_fkey"
            columns: ["archive_snapshot_id"]
            isOneToOne: false
            referencedRelation: "archive_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daraja_credentials: {
        Row: {
          b2c_enabled: boolean
          b2c_initiator_name: string | null
          b2c_security_credential_enc: string | null
          b2c_short_code: string | null
          business_short_code: string | null
          c2b_enabled: boolean
          consumer_key_enc: string | null
          consumer_secret_enc: string | null
          created_at: string
          environment: string
          id: string
          last_test_result: Json | null
          last_tested_at: string | null
          party_b: string | null
          passkey_enc: string | null
          stk_enabled: boolean
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          b2c_enabled?: boolean
          b2c_initiator_name?: string | null
          b2c_security_credential_enc?: string | null
          b2c_short_code?: string | null
          business_short_code?: string | null
          c2b_enabled?: boolean
          consumer_key_enc?: string | null
          consumer_secret_enc?: string | null
          created_at?: string
          environment?: string
          id?: string
          last_test_result?: Json | null
          last_tested_at?: string | null
          party_b?: string | null
          passkey_enc?: string | null
          stk_enabled?: boolean
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          b2c_enabled?: boolean
          b2c_initiator_name?: string | null
          b2c_security_credential_enc?: string | null
          b2c_short_code?: string | null
          business_short_code?: string | null
          c2b_enabled?: boolean
          consumer_key_enc?: string | null
          consumer_secret_enc?: string | null
          created_at?: string
          environment?: string
          id?: string
          last_test_result?: Json | null
          last_tested_at?: string | null
          party_b?: string | null
          passkey_enc?: string | null
          stk_enabled?: boolean
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      virtual_cards: {
        Row: {
          balance_usd: number
          brand: string
          cardholder_name: string
          created_at: string
          credit_limit_usd: number
          credit_used_usd: number
          currency: string
          design: string
          expiry_month: string | null
          expiry_year: string | null
          flw_card_hash: string | null
          flw_card_id: string | null
          id: string
          last4: string | null
          masked_pan: string | null
          metadata: Json | null
          status: Database["public"]["Enums"]["card_status"]
          type: Database["public"]["Enums"]["card_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          brand?: string
          cardholder_name: string
          created_at?: string
          credit_limit_usd?: number
          credit_used_usd?: number
          currency?: string
          design?: string
          expiry_month?: string | null
          expiry_year?: string | null
          flw_card_hash?: string | null
          flw_card_id?: string | null
          id?: string
          last4?: string | null
          masked_pan?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["card_status"]
          type?: Database["public"]["Enums"]["card_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          brand?: string
          cardholder_name?: string
          created_at?: string
          credit_limit_usd?: number
          credit_used_usd?: number
          currency?: string
          design?: string
          expiry_month?: string | null
          expiry_year?: string | null
          flw_card_hash?: string | null
          flw_card_id?: string | null
          id?: string
          last4?: string | null
          masked_pan?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["card_status"]
          type?: Database["public"]["Enums"]["card_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          type: Database["public"]["Enums"]["wallet_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          type: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_daraja_credentials_public: {
        Row: {
          b2c_enabled: boolean | null
          b2c_initiator_name: string | null
          b2c_short_code: string | null
          business_short_code: string | null
          c2b_enabled: boolean | null
          created_at: string | null
          environment: string | null
          has_b2c_security_credential: boolean | null
          has_consumer_key: boolean | null
          has_consumer_secret: boolean | null
          has_passkey: boolean | null
          id: string | null
          last_test_result: Json | null
          last_tested_at: string | null
          party_b: string | null
          stk_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          b2c_enabled?: boolean | null
          b2c_initiator_name?: string | null
          b2c_short_code?: string | null
          business_short_code?: string | null
          c2b_enabled?: boolean | null
          created_at?: string | null
          environment?: string | null
          has_b2c_security_credential?: never
          has_consumer_key?: never
          has_consumer_secret?: never
          has_passkey?: never
          id?: string | null
          last_test_result?: Json | null
          last_tested_at?: string | null
          party_b?: string | null
          stk_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          b2c_enabled?: boolean | null
          b2c_initiator_name?: string | null
          b2c_short_code?: string | null
          business_short_code?: string | null
          c2b_enabled?: boolean | null
          created_at?: string | null
          environment?: string | null
          has_b2c_security_credential?: never
          has_consumer_key?: never
          has_consumer_secret?: never
          has_passkey?: never
          id?: string | null
          last_test_result?: Json | null
          last_tested_at?: string | null
          party_b?: string | null
          stk_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_account: { Args: { p_user_id: string }; Returns: undefined }
      active_provider_for_direction: {
        Args: { p_direction: string; p_flow?: string }
        Returns: string
      }
      admin_allocate_profit: { Args: { p_tx_id: string }; Returns: undefined }
      admin_archive_all: { Args: { p_note?: string }; Returns: string }
      admin_reconcile_withdrawal: {
        Args: {
          p_announce?: boolean
          p_note?: string
          p_receipt?: string
          p_tx_id: string
        }
        Returns: Json
      }
      admin_revert_audit: { Args: { p_audit_id: string }; Returns: undefined }
      admin_set_card_limit: {
        Args: { p_card_id: string; p_limit_usd: number }
        Returns: undefined
      }
      admin_unarchive: { Args: { p_snapshot_id: string }; Returns: undefined }
      admin_withdraw_profit: {
        Args: { p_amount: number; p_kind: string; p_note?: string }
        Returns: string
      }
      card_fund_from_wallet: {
        Args: { p_amount_usd: number; p_card_id: string }
        Returns: Json
      }
      card_settle_charge: {
        Args: {
          p_amount_usd: number
          p_card_id: string
          p_merchant: string
          p_ref: string
        }
        Returns: Json
      }
      decrement_wallet: {
        Args: {
          p_amount: number
          p_type: Database["public"]["Enums"]["wallet_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      endpoint_withdrawn_today: {
        Args: { p_endpoint_id: string }
        Returns: number
      }
      get_fee: {
        Args: { p_amount: number; p_fee_type?: string }
        Returns: number
      }
      get_my_archived_balances: {
        Args: never
        Returns: {
          archived_at: string
          balance: number
          note: string
          snapshot_id: string
          wallet_type: string
        }[]
      }
      get_provider_fee_amount: {
        Args: { p_amount: number; p_fee_type?: string; p_flow?: string }
        Returns: number
      }
      get_provider_fee_cost: {
        Args: { p_amount: number; p_fee_type?: string; p_flow?: string }
        Returns: number
      }
      get_public_pricing: {
        Args: { p_direction?: string }
        Returns: {
          direction: string
          fee_amount: number
          max_amount: number
          min_amount: number
        }[]
      }
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["account_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_wallet: {
        Args: {
          p_amount: number
          p_type: Database["public"]["Enums"]["wallet_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      resubmit_kyc: { Args: { p_user_id: string }; Returns: undefined }
      submit_kyc: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      account_status: "idle" | "beginner" | "active"
      app_role: "admin" | "user" | "grand_admin"
      card_status: "active" | "frozen" | "terminated" | "pending"
      card_type: "prepaid" | "postpaid"
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected"
      tx_status: "pending" | "completed" | "failed"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "endpoint"
        | "transfer"
        | "activation_fee"
      wallet_type: "income" | "service"
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
      account_status: ["idle", "beginner", "active"],
      app_role: ["admin", "user", "grand_admin"],
      card_status: ["active", "frozen", "terminated", "pending"],
      card_type: ["prepaid", "postpaid"],
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      tx_status: ["pending", "completed", "failed"],
      tx_type: [
        "deposit",
        "withdrawal",
        "endpoint",
        "transfer",
        "activation_fee",
      ],
      wallet_type: ["income", "service"],
    },
  },
} as const
