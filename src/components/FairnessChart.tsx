import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { GroupAuditResult } from '@/api/types';

interface FairnessChartProps {
  data: GroupAuditResult[];
  mode?: 'baseline' | 'mitigated';
  title?: string;
  description?: string;
}

export function FairnessChart({
  data,
  mode = 'baseline',
  title = 'Error Rates by Group',
  description = 'False match (FPR) and false non-match (FNR) rates at the chosen threshold',
}: FairnessChartProps) {
  const chartData = useMemo(() =>
    data.map((item) => {
      const metrics = mode === 'mitigated' ? item.mitigation : item.metrics;
      return {
        name: item.group,
        fpr: metrics?.fpr ?? 0,
        fnr: metrics?.fnr ?? 0,
        accuracy: metrics?.accuracy ?? 0,
        balanced: metrics?.balancedAccuracy ?? 0,
        samples: item.sampleCount,
        identities: item.identityCount,
      };
    }),
    [data, mode]
  );

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass rounded-lg p-3 shadow-lg border border-border">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            FPR: <span className="text-foreground font-medium">{(item.fpr * 100).toFixed(2)}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            FNR: <span className="text-foreground font-medium">{(item.fnr * 100).toFixed(2)}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Accuracy: <span className="text-foreground font-medium">{(item.accuracy * 100).toFixed(1)}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Balanced Accuracy: <span className="text-foreground font-medium">{(item.balanced * 100).toFixed(1)}%</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Samples: {item.samples} | Identities: {item.identities}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="gradient-text">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 1]}
                tickFormatter={(value) => `${Math.round(value * 100)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="fpr" fill="hsl(var(--status-danger))" name="FPR" radius={[6, 6, 0, 0]} />
              <Bar dataKey="fnr" fill="hsl(var(--status-warning))" name="FNR" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
