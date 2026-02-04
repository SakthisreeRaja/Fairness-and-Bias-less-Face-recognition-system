import { useState, useCallback, useMemo } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Info, SlidersHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { FairnessChart } from '@/components/FairnessChart';
import { DistanceDistributionChart } from '@/components/DistanceDistributionChart';
import { ExportButton } from '@/components/ExportButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { runFairnessAudit } from '@/api';
import type { FairnessAuditResult } from '@/api/types';
import { useHistory } from '@/hooks/useHistory';
import { cn } from '@/lib/utils';

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
};

const formatNumber = (value?: number | null, digits = 3) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
};

export default function FairnessAudit() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FairnessAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.68);
  const [usePreprocessing, setUsePreprocessing] = useState(true);
  const { addEntry } = useHistory();

  const handleRunAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await runFairnessAudit({ threshold, usePreprocessing });
      
      if (response.success && response.data) {
        setResult(response.data);
        
        addEntry({
          type: 'audit',
          summary: `Baseline fairness score: ${response.data.overall?.baselineScore ?? response.data.overallFairnessScore ?? 0}% - ${response.data.groups.length} groups analyzed`,
          result: response.data,
        });
      } else {
        setError(response.error || 'Audit failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [addEntry, threshold, usePreprocessing]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'low_bias':
        return <CheckCircle className="w-5 h-5 text-status-success" />;
      case 'moderate_bias':
        return <AlertTriangle className="w-5 h-5 text-status-warning" />;
      case 'high_bias':
        return <AlertTriangle className="w-5 h-5 text-status-danger" />;
      case 'detection_risk':
        return <AlertTriangle className="w-5 h-5 text-status-warning" />;
      case 'insufficient_data':
        return <Info className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'low_bias':
        return 'border-status-success/30 bg-status-success/5';
      case 'moderate_bias':
      case 'detection_risk':
        return 'border-status-warning/30 bg-status-warning/5';
      case 'high_bias':
        return 'border-status-danger/30 bg-status-danger/5';
      default:
        return 'border-border bg-card';
    }
  };

  const groupTabs = useMemo(() => result?.groups || [], [result]);

  return (
    <AppLayout title="Bias Audit">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Bias Audit Dashboard</h1>
            <p className="text-muted-foreground">
              Evaluate demographic fairness, compare baseline vs mitigation, and export reproducible reports
            </p>
          </div>
          
          <div className="flex gap-3">
            {result && <ExportButton data={result} />}
            <Button
              onClick={handleRunAudit}
              disabled={isLoading}
              className="gradient-primary glow-primary gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Run Bias Audit
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Audit Controls
            </CardTitle>
            <CardDescription>
              Adjust thresholds and preprocessing to see how audit metrics change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Verification Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="0.95"
                  value={threshold}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) {
                      setThreshold(value);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Lower threshold = stricter matching (lower FPR, higher FNR).
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="preprocess">Illumination Normalization</Label>
                  <p className="text-xs text-muted-foreground">
                    Apply CLAHE / gamma correction before embedding.
                  </p>
                </div>
                <Switch
                  id="preprocess"
                  checked={usePreprocessing}
                  onCheckedChange={setUsePreprocessing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-80 w-full rounded-xl" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Overall Score */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="glass text-center">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Baseline Fairness Score</p>
                  <p className="text-4xl font-bold gradient-text mb-2">
                    {result.overall?.baselineScore ?? result.overallFairnessScore ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on baseline threshold
                  </p>
                </CardContent>
              </Card>
              <Card className="glass text-center">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">Mitigated Fairness Score</p>
                  <p className="text-4xl font-bold gradient-text mb-2">
                    {result.overall?.mitigatedScore ?? result.overallFairnessScore ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adaptive thresholds (target FPR)
                  </p>
                </CardContent>
              </Card>
              <Card className="glass text-center">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-2">FPR Gap (Baseline)</p>
                  <p className="text-4xl font-bold gradient-text mb-2">
                    {formatPercent(result.overall?.baselineFprGap?.gap)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Smaller gap = better parity
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Error Rate Charts */}
            <Tabs defaultValue="baseline" className="space-y-4">
              <TabsList>
                <TabsTrigger value="baseline">Baseline Error Rates</TabsTrigger>
                <TabsTrigger value="mitigated">Mitigated Error Rates</TabsTrigger>
              </TabsList>
              <TabsContent value="baseline">
                <FairnessChart data={result.groups} mode="baseline" />
              </TabsContent>
              <TabsContent value="mitigated">
                <FairnessChart
                  data={result.groups}
                  mode="mitigated"
                  title="Adaptive Threshold Error Rates"
                  description="Group-aware thresholds calibrated to the target FPR"
                />
              </TabsContent>
            </Tabs>

            {/* Group Metrics Table */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Per-Group Metrics</CardTitle>
                <CardDescription>
                  Detection rates, baseline errors, and mitigation deltas per demographic group.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Samples</TableHead>
                        <TableHead>Detection</TableHead>
                        <TableHead>Baseline FPR</TableHead>
                        <TableHead>Baseline FNR</TableHead>
                        <TableHead>Baseline Acc</TableHead>
                        <TableHead>Adaptive FPR</TableHead>
                        <TableHead>Adaptive FNR</TableHead>
                        <TableHead>Adaptive Acc</TableHead>
                        <TableHead>Adaptive Threshold</TableHead>
                        <TableHead>Look-Alike Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.groups.map((group) => (
                        <TableRow key={group.group}>
                          <TableCell>
                            <div className="font-medium">{group.group}</div>
                            {group.warnings && group.warnings.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {group.warnings.join(' ')}
                              </div>
                            )}
                            {group.illumination?.buckets?.low?.detectionRate !== undefined && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Low-light detection: {formatPercent(group.illumination.buckets.low?.detectionRate)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{group.sampleCount}</TableCell>
                          <TableCell>{formatPercent(group.detectionRate)}</TableCell>
                          <TableCell>{formatPercent(group.metrics?.fpr)}</TableCell>
                          <TableCell>{formatPercent(group.metrics?.fnr)}</TableCell>
                          <TableCell>{formatPercent(group.metrics?.accuracy)}</TableCell>
                          <TableCell>{formatPercent(group.mitigation?.fpr)}</TableCell>
                          <TableCell>{formatPercent(group.mitigation?.fnr)}</TableCell>
                          <TableCell>{formatPercent(group.mitigation?.accuracy)}</TableCell>
                          <TableCell>{formatNumber(group.mitigation?.threshold, 3)}</TableCell>
                          <TableCell>{formatPercent(group.lookAlikeRisk?.rate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Distribution Charts */}
            {groupTabs.length > 0 && (
              <Tabs defaultValue={groupTabs[0].group} className="space-y-4">
                <TabsList className="flex flex-wrap">
                  {groupTabs.map((group) => (
                    <TabsTrigger key={group.group} value={group.group}>
                      {group.group}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {groupTabs.map((group) => (
                  <TabsContent key={group.group} value={group.group}>
                    <DistanceDistributionChart
                      group={group}
                      baselineThreshold={result.thresholds.standard}
                      adaptiveThreshold={group.mitigation?.threshold}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* Interpretation Panel */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Interpretation and Transparency</CardTitle>
                <CardDescription>
                  Where bias can originate and how mitigation is applied
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {result.groups.map((item) => (
                    <div
                      key={item.group}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all',
                        getStatusColor(item.interpretation?.status)
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(item.interpretation?.status)}
                        <span className="font-semibold">{item.group}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.interpretation?.message || 'No interpretation available.'}
                      </p>
                    </div>
                  ))}
                </div>

                {result.notes && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground space-y-2">
                        {result.notes.map((note, index) => (
                          <p key={index}>{note}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {result.groupDefinitions && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-semibold text-foreground mb-2">Group Definitions</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {Object.entries(result.groupDefinitions).map(([group, description]) => (
                        <p key={group}>
                          <strong>{group}:</strong> {description}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.evaluationPlan && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Evaluation Plan and Baselines</CardTitle>
                  <CardDescription>
                    Metrics and baseline comparisons used to quantify performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-2">Metrics</p>
                      <ul className="space-y-1">
                        {result.evaluationPlan.metrics.map((metric) => (
                          <li key={metric}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-2">Baselines</p>
                      <ul className="space-y-1">
                        {result.evaluationPlan.baselines.map((baseline) => (
                          <li key={baseline}>{baseline}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-2">Dataset</p>
                      <p>{result.evaluationPlan.dataset}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial State */}
        {!result && !isLoading && !error && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full gradient-primary-soft mx-auto mb-6 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Ready to Run a Bias Audit</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Click "Run Bias Audit" to analyze demographic fairness across population groups and document baseline metrics.
            </p>
            <Button
              onClick={handleRunAudit}
              size="lg"
              className="gradient-primary glow-primary gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              Run Bias Audit
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
