'use client';
import { appLogger } from '@/lib/app-logger';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auditLogsService, AdminAuditLogItem } from '@/features/settings/services/audit-logs.service';
import { SectionHeader, DashboardCardHeaderDots } from '@/components/dashboard';
import { BackButton } from '@/components/ui/BackButton';

interface AuditLogsListProps {
    initialLogs: AdminAuditLogItem[];
    initialTotal: number;
}

const PAPER_BG = 'bg-endurix-paper dark:bg-card';

export function AuditLogsList({ initialLogs, initialTotal }: AuditLogsListProps) {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>(initialLogs);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number, filter: string) => {
    try {
      setLoading(true);
      const response = await auditLogsService.list({ page: p, limit: 25, action: filter || undefined });
      setLogs(response.data.items);
      setTotal(response.data.pagination.total);
    } catch (error) {
      appLogger.error('audit_logs.load_failed', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setActionFilter(val);
    setPage(1);
    void load(1, val);
  };

  const handlePrev = () => {
    const nextP = page - 1;
    setPage(nextP);
    void load(nextP, actionFilter);
  };

  const handleNext = () => {
    const nextP = page + 1;
    setPage(nextP);
    void load(nextP, actionFilter);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="mb-4">
        <BackButton href="/settings" />
      </div>
      <SectionHeader
        eyebrow="Auditoría"
        title="Admin Audit Logs"
        description="Append-only history of critical admin writes."
      />

      <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Filters</CardTitle>
          <DashboardCardHeaderDots />
        </CardHeader>
        <CardContent className="flex gap-3 p-6">
          <Input
            placeholder="Filter by action (e.g. group.updated)"
            value={actionFilter}
            onChange={handleFilterChange}
            variant="boxed"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Events ({total})</CardTitle>
          <DashboardCardHeaderDots />
        </CardHeader>
        <CardContent className="p-6">
          <div className="border border-endurix-black/10 dark:border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Time</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Action</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Actor</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Target</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Loading...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit events found.</TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs whitespace-nowrap" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell><span className="font-mono text-[10px] uppercase tracking-wider bg-endurix-black/8 dark:bg-white/8 text-endurix-orange px-1.5 py-0.5">{item.action}</span></TableCell>
                      <TableCell className="text-xs font-mono">{item.actor_id.split('-')[0]}...</TableCell>
                      <TableCell className="text-xs font-mono">{item.target_type || '-'}:{item.target_id ? `${item.target_id.split('-')[0]}...` : '-'}</TableCell>
                      <TableCell className="max-w-[380px] truncate text-[10px] font-mono text-endurix-black/60 dark:text-muted-foreground">{JSON.stringify(item.metadata)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline-brand" size="sm" className="px-5 uppercase tracking-widest text-[10px]" disabled={page <= 1 || loading} onClick={handlePrev}>
              Previous
            </Button>
            <Button variant="outline-brand" size="sm" className="px-5 uppercase tracking-widest text-[10px]" disabled={logs.length < 25 || loading} onClick={handleNext}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
