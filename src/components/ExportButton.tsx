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

export function ExportButton({ data, filename = 'fairness-audit' }: ExportButtonProps) {
  const exportAsCSV = () => {
    const headers = ['Demographic Group', 'Average Distance', 'Sample Count', 'Above Threshold', 'Status', 'Interpretation'];
    
    const rows = data.demographicDistances.map((d) => {
      const interpretation = data.interpretation.find((i) => i.group === d.group);
      return [
        d.group,
        d.averageDistance.toFixed(4),
        d.sampleCount,
        d.isAboveThreshold ? 'Yes' : 'No',
        interpretation?.status || 'N/A',
        `"${interpretation?.message || 'N/A'}"`,
      ].join(',');
    });

    const csv = [
      `Fairness Audit Report - ${new Date().toLocaleDateString()}`,
      `Overall Fairness Score: ${data.overallFairnessScore}%`,
      `Threshold: ${data.threshold}`,
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
    // Create a printable HTML version
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fairness Audit Report</title>
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
        <h1>Fairness Audit Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Overall Fairness Score: <span class="score">${data.overallFairnessScore}%</span></p>
        <p>Threshold: ${data.threshold}</p>
        
        <h2>Demographic Analysis</h2>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Avg Distance</th>
              <th>Samples</th>
              <th>Status</th>
              <th>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            ${data.demographicDistances.map((d) => {
              const interpretation = data.interpretation.find((i) => i.group === d.group);
              return `
                <tr>
                  <td>${d.group}</td>
                  <td>${d.averageDistance.toFixed(4)}</td>
                  <td>${d.sampleCount}</td>
                  <td class="${d.isAboveThreshold ? 'success' : 'warning'}">
                    ${d.isAboveThreshold ? '✓ Above' : '⚠ Below'} threshold
                  </td>
                  <td>${interpretation?.message || 'N/A'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <h2>Important Notes</h2>
        <ul>
          <li>Cosine distance interpretation applies primarily to same-demographic comparisons.</li>
          <li>Cross-demographic distances do not directly imply bias.</li>
          <li>Higher distance values indicate better distinguishability within a demographic group.</li>
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
