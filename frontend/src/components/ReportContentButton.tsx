import { useEffect, useId, useState, type FormEvent, type MouseEvent } from 'react';
import { Flag } from 'lucide-react';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useCreateContentReport, useReportStatus } from '@/hooks/useReportContent';
import { dismissModal } from '@/lib/modalDismiss';
import {
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_REPORT_REASONS,
  isContentReportReason,
  reportContentButtonLabel,
  type ContentReportReason,
  type ContentReportTargetType,
} from '@/lib/reportContent';
import { cn } from '@/lib/utils';

type ReportContentButtonProps = {
  targetType: ContentReportTargetType;
  /** UUID del usuario o de la Capsule. */
  targetId: string;
  /** Solo para targetType=user: envía username al API (más legible en logs). */
  username?: string;
  className?: string;
  size?: 'default' | 'compact';
};

export function ReportContentButton({
  targetType,
  targetId,
  username,
  className,
  size = 'default',
}: ReportContentButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ContentReportReason | ''>('');
  const [note, setNote] = useState('');
  const [localReported, setLocalReported] = useState(false);
  const reasonFieldId = useId();
  const noteFieldId = useId();

  const status = useReportStatus(targetType, targetId, true);
  const createReport = useCreateContentReport();

  const reported = localReported || !!status.data?.reported;
  const reporting = createReport.isPending;
  const label = reportContentButtonLabel({ reported, reporting });

  useEffect(() => {
    setLocalReported(false);
    setReason('');
    setNote('');
  }, [targetType, targetId]);

  const close = () => {
    dismissModal({
      busy: reporting,
      onClose: () => {
        setOpen(false);
        setReason('');
        setNote('');
      },
    });
  };

  const openModal = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (reported || reporting) return;
    setOpen(true);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isContentReportReason(reason)) return;

    createReport.mutate(
      {
        target_type: targetType,
        target_id: targetId,
        ...(targetType === 'user' && username ? { username } : {}),
        reason,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          setLocalReported(true);
          setOpen(false);
          setReason('');
          setNote('');
        },
      },
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={reported || reporting || status.isLoading}
        aria-label={label}
        title={label}
        data-testid="report-content-button"
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-70',
          size === 'default' && 'min-h-11 w-full gap-2 px-4 py-2 sm:w-auto',
          size === 'compact' && 'whitespace-nowrap px-3 py-1.5',
          reported
            ? 'border border-border bg-secondary text-muted-foreground'
            : 'border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground',
          className,
        )}
      >
        <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </button>

      <Modal open={open} title="Reportar" onClose={close}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Cuéntanos qué ocurre. El reporte es confidencial y ayuda a mantener Ninety seguro.
          </p>

          <FormField label="Motivo" hint="Obligatorio">
            <select
              id={reasonFieldId}
              value={reason}
              onChange={(e) =>
                setReason(isContentReportReason(e.target.value) ? e.target.value : '')
              }
              required
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              data-testid="report-reason-select"
            >
              <option value="" disabled>
                Elige un motivo
              </option>
              {CONTENT_REPORT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {CONTENT_REPORT_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Detalles (opcional)" hint="Máx. 500 caracteres">
            <Textarea
              id={noteFieldId}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              placeholder="Contexto adicional para moderación"
              data-testid="report-note-input"
            />
          </FormField>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason || reporting}
              data-testid="report-submit-button"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70"
            >
              {reporting ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
