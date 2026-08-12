import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { ContentReportReason, ContentReportTargetType } from '@/lib/reportContent';
import { useAuthStore } from '@/stores/authStore';

type ReportStatusResponse = { reported: boolean };

type CreateReportBody = {
  target_type: ContentReportTargetType;
  target_id?: string;
  username?: string;
  reason: ContentReportReason;
  note?: string | null;
};

type CreateReportResponse = {
  report: {
    id: string;
    target_type: ContentReportTargetType;
    target_id: string;
    reason: ContentReportReason;
    created_at: string;
  };
};

function reportStatusKey(targetType: ContentReportTargetType, targetKey: string) {
  return ['reports', 'status', targetType, targetKey] as const;
}

export function useReportStatus(
  targetType: ContentReportTargetType,
  targetId: string | undefined,
  enabled: boolean,
) {
  const session = useAuthStore((s) => s.session);
  const canQuery = enabled && !!session?.access_token && !!targetId;

  return useQuery({
    queryKey: reportStatusKey(targetType, targetId ?? ''),
    enabled: canQuery,
    staleTime: 60_000,
    queryFn: () =>
      apiFetch<ReportStatusResponse>(
        `/api/reports/status?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId!)}`,
        {},
        session?.access_token,
      ),
  });
}

export function useCreateContentReport() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateReportBody) =>
      apiFetch<CreateReportResponse>(
        '/api/reports',
        { method: 'POST', body: JSON.stringify(body) },
        session?.access_token,
      ),
    onSuccess: (data) => {
      toast.success('Gracias. Revisaremos el reporte.');
      const key = reportStatusKey(data.report.target_type, data.report.target_id);
      queryClient.setQueryData<ReportStatusResponse>(key, { reported: true });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el reporte');
    },
  });
}
