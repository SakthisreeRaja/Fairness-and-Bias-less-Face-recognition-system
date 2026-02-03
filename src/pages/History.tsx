import { useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { HistoryTable } from '@/components/HistoryTable';
import { useHistory } from '@/hooks/useHistory';
import { Skeleton } from '@/components/ui/skeleton';
import type { HistoryEntry } from '@/api/types';
import { toast } from 'sonner';

export default function History() {
  const { history, isLoading, removeEntry, clearHistory } = useHistory();

  const handleViewEntry = useCallback((entry: HistoryEntry) => {
    // For now, just show a toast with the entry details
    // In a full implementation, this could open a modal with full details
    toast.info(`Viewing: ${entry.summary}`, {
      description: `Type: ${entry.type} | Date: ${new Date(entry.timestamp).toLocaleString()}`,
    });
  }, []);

  const handleDeleteEntry = useCallback((id: string) => {
    removeEntry(id);
    toast.success('Entry deleted');
  }, [removeEntry]);

  const handleClearAll = useCallback(() => {
    clearHistory();
    toast.success('History cleared');
  }, [clearHistory]);

  return (
    <AppLayout title="History Log">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">History Log</h1>
          <p className="text-muted-foreground">
            View and manage your past face analyses and audits
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* History Table */}
        {!isLoading && (
          <HistoryTable
            entries={history}
            onViewEntry={handleViewEntry}
            onDeleteEntry={handleDeleteEntry}
            onClearAll={handleClearAll}
          />
        )}
      </div>
    </AppLayout>
  );
}
