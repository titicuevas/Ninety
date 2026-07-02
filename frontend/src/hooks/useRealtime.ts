import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type PostgresChange = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T extends object> {
  table: string;
  event?: PostgresChange;
  filter?: string;
  enabled?: boolean;
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export function useRealtime<T extends object>({
  table,
  event = '*',
  filter,
  enabled = true,
  onPayload,
}: UseRealtimeOptions<T>) {
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, filter },
        (payload) => onPayloadRef.current(payload as RealtimePostgresChangesPayload<T>),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, event, filter, enabled]);
}
