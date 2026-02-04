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

interface DistanceDistributionChartProps {
  group: GroupAuditResult;
  baselineThreshold: number;
  adaptiveThreshold?: number;
}

const formatMetric = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return value.toFixed(3);
};

export function DistanceDistributionChart({
  group,
  baselineThreshold,
  adaptiveThreshold,
}: DistanceDistributionChartProps) {
  const chartData = useMemo(() => {
    const genuineBins = group.genuine.histogram.bins;
    const impostorBins = group.impostor.histogram.bins;
    const bins = genuineBins.length > 1 ? genuineBins : impostorBins;

    const genuineCounts = group.genuine.histogram.counts || [];
    const impostorCounts = group.impostor.histogram.counts || [];

    if (!bins || bins.length < 2) return [];

    return bins.slice(0, -1).map((start, idx) => {
      const end = bins[idx + 1];
      return {
        bin: `${start.toFixed(2)}-${end.toFixed(2)}`,
        genuine: genuineCounts[idx] ?? 0,
        impostor: impostorCounts[idx] ?? 0,
      };
    });
  }, [group]);

  if (chartData.length === 0) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="gradient-text">{group.group} Distance Distributions</CardTitle>
          <CardDescription>No distance data available for this group.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass rounded-lg p-3 shadow-lg border border-border">
          <p className="font-semibold text-foreground">Distance Bin</p>
          <p className="text-sm text-muted-foreground">{item.bin}</p>
          <p className="text-sm text-muted-foreground">
            Genuine: <span className="text-foreground font-medium">{item.genuine}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Impostor: <span className="text-foreground font-medium">{item.impostor}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="gradient-text">{group.group} Distance Distributions</CardTitle>
        <CardDescription>
          Genuine vs impostor cosine distance histograms (lower distance = higher similarity)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          <span>Baseline threshold: {baselineThreshold.toFixed(2)}</span>
          {adaptiveThreshold !== undefined && (
            <span>Adaptive threshold: {adaptiveThreshold.toFixed(2)}</span>
          )}
        </div>
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
                dataKey="bin"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                interval={3}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="genuine" fill="hsl(var(--status-success))" name="Genuine" radius={[4, 4, 0, 0]} />
              <Bar dataKey="impostor" fill="hsl(var(--status-warning))" name="Impostor" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-muted-foreground flex flex-wrap gap-4">
          <span>Overlap: {formatMetric(group.lookAlikeRisk?.overlap)}</span>
          <span>d' separation: {formatMetric(group.lookAlikeRisk?.dPrime)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
