import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { dismissToast, subscribeToasts, type ToastItem } from '@/lib/toast';
import { cn } from '@/lib/utils';

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur-md',
            item.tone === 'error'
              ? 'border-destructive/40 bg-destructive/15 text-destructive'
              : 'border-primary/40 bg-primary/15 text-primary',
          )}
        >
          <p className="min-w-0 flex-1 leading-relaxed">{item.message}</p>
          <button
            type="button"
            className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar aviso"
            onClick={() => dismissToast(item.id)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
