
-- Add soft delete column to clientes
ALTER TABLE public.clientes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for performance on non-deleted queries
CREATE INDEX idx_clientes_deleted_at ON public.clientes (deleted_at) WHERE deleted_at IS NULL;

-- Drop existing RLS policies that need updating to filter deleted records
-- We need to update SELECT policies to exclude soft-deleted records for normal users
-- but allow admins to see them for recovery

-- Create a function to check if a client is not deleted
CREATE OR REPLACE FUNCTION public.is_not_deleted(p_deleted_at timestamptz)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_deleted_at IS NULL
$$;
