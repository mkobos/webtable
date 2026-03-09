import { createClient } from '@supabase/supabase-js';

export type CellRow = {
  table_id: string;
  row: number;
  col: number;
  value: string;
  updated_at: string;
};

export type TableRow = {
  id: string;
  title: string;
  created_at: string;
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
