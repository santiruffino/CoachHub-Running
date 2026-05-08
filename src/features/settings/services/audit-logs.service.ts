import api from '@/lib/axios';

export interface AdminAuditLogItem {
  id: string;
  actor_id: string;
  actor_role: string;
  team_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminAuditLogResponse {
  items: AdminAuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
}

export const auditLogsService = {
  list: async (params?: { page?: number; limit?: number; action?: string; actorId?: string; from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.action) searchParams.set('action', params.action);
    if (params?.actorId) searchParams.set('actorId', params.actorId);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);

    const suffix = searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';
    return api.get<AdminAuditLogResponse>(`/v2/admin/audit-logs${suffix}`);
  },
};
