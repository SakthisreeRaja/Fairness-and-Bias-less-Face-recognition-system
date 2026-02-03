import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Trash2, Eye, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { HistoryEntry } from '@/api/types';

interface HistoryTableProps {
  entries: HistoryEntry[];
  onViewEntry?: (entry: HistoryEntry) => void;
  onDeleteEntry?: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

const typeLabels = {
  analysis: 'Face Analysis',
  audit: 'Fairness Audit',
  affinity: 'Demographic Affinity',
  comparison: 'Face Comparison',
};

const typeColors = {
  analysis: 'bg-primary/20 text-primary',
  audit: 'bg-secondary/20 text-secondary',
  affinity: 'bg-demographic-asian/20 text-demographic-asian',
  comparison: 'bg-demographic-caucasian/20 text-demographic-caucasian',
};

export function HistoryTable({
  entries,
  onViewEntry,
  onDeleteEntry,
  onClearAll,
  className,
}: HistoryTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.summary.toLowerCase().includes(search.toLowerCase()) ||
      typeLabels[entry.type].toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="analysis">Face Analysis</SelectItem>
            <SelectItem value="audit">Fairness Audit</SelectItem>
            <SelectItem value="affinity">Demographic Affinity</SelectItem>
            <SelectItem value="comparison">Face Comparison</SelectItem>
          </SelectContent>
        </Select>

        {onClearAll && entries.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {entries.length} history entries. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll}>
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No history entries found</p>
        </div>
      ) : (
        <div className="rounded-lg border glass overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Date</TableHead>
                <TableHead className="w-40">Type</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      typeColors[entry.type]
                    )}>
                      {typeLabels[entry.type]}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {entry.summary}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onViewEntry && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewEntry(entry)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteEntry && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        LocalStorage for demo purposes, upgradeable to Firebase Firestore for production.
      </p>
    </div>
  );
}
