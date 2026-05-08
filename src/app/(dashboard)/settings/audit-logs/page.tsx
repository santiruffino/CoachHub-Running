'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auditLogsService, AdminAuditLogItem } from '@/features/settings/services/audit-logs.service';
import { appLogger } from '@/lib/app-logger';

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await auditLogsService.list({ page, limit: 25, action: actionFilter || undefined });
        setLogs(response.data.items);
        setTotal(response.data.pagination.total);
      } catch (error) {
        appLogger.error('audit_logs.load_failed', { error });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'ADMIN') {
      void load();
    }
  }, [page, actionFilter, user?.role]);

  if (authLoading || user?.role !== 'ADMIN') return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">Admin Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Append-only history of critical admin writes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="Filter by action (e.g. group.updated)"
            value={actionFilter}
            onChange={(e) => {
              setPage(1);
              setActionFilter(e.target.value);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events ({total})</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No audit events found.</TableCell>
                </TableRow>
              ) : (
                logs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>{item.action}</TableCell>
                    <TableCell>{item.actor_id}</TableCell>
                    <TableCell>{item.target_type || '-'}:{item.target_id || '-'}</TableCell>
                    <TableCell className="max-w-[380px] truncate">{JSON.stringify(item.metadata)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={logs.length < 25} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
