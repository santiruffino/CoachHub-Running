'use client';
import { appLogger } from '@/lib/app-logger';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auditLogsService, AdminAuditLogItem } from '@/features/settings/services/audit-logs.service';

interface AuditLogsListProps {
    initialLogs: AdminAuditLogItem[];
    initialTotal: number;
}

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Admin Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Append-only history of critical admin writes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="Filter by action (e.g. group.updated)"
            value={actionFilter}
            onChange={handleFilterChange}
            className="rounded-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Events ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit events found.</TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{item.action}</span></TableCell>
                      <TableCell className="text-xs">{item.actor_id.split('-')[0]}...</TableCell>
                      <TableCell className="text-xs">{item.target_type || '-'}:{item.target_id ? `${item.target_id.split('-')[0]}...` : '-'}</TableCell>
                      <TableCell className="max-w-[380px] truncate text-[10px] font-mono">{JSON.stringify(item.metadata)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="sm" className="rounded-full px-5" disabled={page <= 1 || loading} onClick={handlePrev}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="rounded-full px-5" disabled={logs.length < 25 || loading} onClick={handleNext}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
