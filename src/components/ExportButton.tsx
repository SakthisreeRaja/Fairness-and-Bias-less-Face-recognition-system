import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FairnessAuditResult } from '@/api/types';

interface ExportButtonProps {
  data: FairnessAuditResult;
  filename?: string;
}

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
};

const formatNumber = (value?: number | null, digits = 3) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
};

export function ExportButton({ data, filename = 'bias-audit' }: ExportButtonProps) {
  const exportAsCSV = () => {
    const headers = [
      'Demographic Group',
      'Samples',
      'Identities',
      'Detection Rate',
      'Baseline FPR',
      'Baseline FNR',
      'Baseline Accuracy',
      'Adaptive FPR',
      'Adaptive FNR',
      'Adaptive Accuracy',
      'Adaptive Threshold',
      'Look-Alike Risk Rate',
    ];

    const rows = data.groups.map((g) => [
      g.group,
      g.sampleCount,
      g.identityCount,
      formatPercent(g.detectionRate),
      formatPercent(g.metrics?.fpr),
      formatPercent(g.metrics?.fnr),
      formatPercent(g.metrics?.accuracy),
      formatPercent(g.mitigation?.fpr),
      formatPercent(g.mitigation?.fnr),
      formatPercent(g.mitigation?.accuracy),
      formatNumber(g.mitigation?.threshold),
      formatPercent(g.lookAlikeRisk?.rate),
    ].join(','));

    const csv = [
      `Bias Audit Report - ${new Date().toLocaleDateString()}`,
      `Baseline Fairness Score: ${data.overall?.baselineScore ?? data.overallFairnessScore ?? 0}%`,
      `Mitigated Fairness Score: ${data.overall?.mitigatedScore ?? 0}%`,
      `Standard Threshold: ${data.thresholds.standard}`,
      `Adaptive Strategy: ${data.thresholds.adaptiveStrategy}`,
      '',
      headers.join(','),
      ...rows,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportAsPDF = () => {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bias Audit Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #3B82F6; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f5f5f5; }
          .score { font-size: 24px; font-weight: bold; color: #10b981; }
          .warning { color: #f59e0b; }
          .success { color: #10b981; }
        </style>
      </head>
      <body>
        <h1>Bias Audit Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Baseline Fairness Score: <span class="score">${data.overall?.baselineScore ?? data.overallFairnessScore ?? 0}%</span></p>
        <p>Mitigated Fairness Score: <span class="score">${data.overall?.mitigatedScore ?? 0}%</span></p>
        <p>Threshold: ${data.thresholds.standard}</p>
        <p>Adaptive Strategy: ${data.thresholds.adaptiveStrategy}</p>

        <h2>Per-Group Metrics</h2>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Samples</th>
              <th>Detection Rate</th>
              <th>Baseline FPR</th>
              <th>Baseline FNR</th>
              <th>Baseline Accuracy</th>
              <th>Adaptive FPR</th>
              <th>Adaptive FNR</th>
              <th>Adaptive Accuracy</th>
              <th>Adaptive Threshold</th>
            </tr>
          </thead>
          <tbody>
            ${data.groups.map((g) => `
                <tr>
                  <td>${g.group}</td>
                  <td>${g.sampleCount}</td>
                  <td>${formatPercent(g.detectionRate)}</td>
                  <td>${formatPercent(g.metrics?.fpr)}</td>
                  <td>${formatPercent(g.metrics?.fnr)}</td>
                  <td>${formatPercent(g.metrics?.accuracy)}</td>
                  <td>${formatPercent(g.mitigation?.fpr)}</td>
                  <td>${formatPercent(g.mitigation?.fnr)}</td>
                  <td>${formatPercent(g.mitigation?.accuracy)}</td>
                  <td>${formatNumber(g.mitigation?.threshold)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <h2>Important Notes</h2>
        <ul>
          ${(data.notes || []).map((note) => `<li>${note}</li>`).join('')}
        </ul>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
