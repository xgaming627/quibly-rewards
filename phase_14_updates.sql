-- ============================================================
-- Quibly Rewards — Phase 14 Schema Updates
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Add new transaction types to the existing enum for better Activity Logging
ALTER TYPE public.ledger_transaction_type ADD VALUE IF NOT EXISTS 'reward_request';
ALTER TYPE public.ledger_transaction_type ADD VALUE IF NOT EXISTS 'streak_break';
