import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { DemographicDistance } from '@/api/types';

interface FairnessChartProps {
  data: DemographicDistance[];
  threshold?: number;
  title?: string;
  description?: string;
}

const groupColors = {
  African: 'hsl(25, 95%, 53%)',
  Asian: 'hsl(45, 93%, 47%)',
  Caucasian: 'hsl(199, 89%, 48%)',
  Indian: 'hsl(142, 71%, 45%)',
};

export function FairnessChart({
  data,
  threshold = 0.68,
  title = 'Demographic Fairness Analysis',
  description = 'Average cosine distance per demographic group',
}: FairnessChartProps) {
  const chartData = useMemo(() => 
    data.map((item) => ({
      name: item.group,
      distance: item.averageDistance,
      samples: item.sampleCount,
      isAboveThreshold: item.isAboveThreshold,
    })),
    [data]
  );

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass rounded-lg p-3 shadow-lg border border-border">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            Distance: <span className="text-foreground font-medium">{item.distance.toFixed(4)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Samples: <span className="text-foreground font-medium">{item.samples}</span>
          </p>
          <p className={`text-xs mt-1 ${item.isAboveThreshold ? 'text-status-success' : 'text-status-warning'}`}>
            {item.isAboveThreshold ? '✓ Above threshold' : '⚠ Below threshold'}
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
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={threshold} 
                stroke="hsl(var(--status-danger))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Threshold (${threshold})`,
                  position: 'right',
                  fill: 'hsl(var(--status-danger))',
                  fontSize: 11,
                }}
              />
              <Bar 
                dataKey="distance" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={groupColors[entry.name as keyof typeof groupColors]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {Object.entries(groupColors).map(([group, color]) => (
            <div key={group} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">{group}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
