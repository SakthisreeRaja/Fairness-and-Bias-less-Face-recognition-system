import { useState, useCallback } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { FairnessChart } from '@/components/FairnessChart';
import { ExportButton } from '@/components/ExportButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { runFairnessAudit } from '@/api';
import type { FairnessAuditResult } from '@/api/types';
import { useHistory } from '@/hooks/useHistory';
import { cn } from '@/lib/utils';

export default function FairnessAudit() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FairnessAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const handleRunAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await runFairnessAudit();
      
      if (response.success && response.data) {
        setResult(response.data);
        
        addEntry({
          type: 'audit',
          summary: `Bias Audit Score: ${response.data.overallFairnessScore}% - ${response.data.demographicDistances.length} groups analyzed`,
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
  }, [addEntry]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'low_bias':
        return <CheckCircle className="w-5 h-5 text-status-success" />;
      case 'moderate_bias':
        return <AlertTriangle className="w-5 h-5 text-status-warning" />;
      case 'high_bias':
        return <AlertTriangle className="w-5 h-5 text-status-danger" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low_bias':
        return 'border-status-success/30 bg-status-success/5';
      case 'moderate_bias':
        return 'border-status-warning/30 bg-status-warning/5';
      case 'high_bias':
        return 'border-status-danger/30 bg-status-danger/5';
      default:
        return 'border-border bg-card';
    }
  };

  return (
    <AppLayout title="Bias Audit">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Bias Audit Dashboard</h1>
            <p className="text-muted-foreground">
              Evaluate demographic fairness, compare against baselines, and export reproducible reports
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
            <Card className="glass text-center">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Overall Fairness Score</p>
                <p className="text-5xl font-bold gradient-text mb-2">
                  {result.overallFairnessScore}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Based on {result.demographicDistances.reduce((sum, d) => sum + d.sampleCount, 0)} total samples
                </p>
              </CardContent>
            </Card>

            {/* Chart */}
            <FairnessChart
              data={result.demographicDistances}
              threshold={result.threshold}
            />

            {/* Interpretation Panel */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Fairness Interpretation</CardTitle>
                <CardDescription>
                  Analysis of bias levels per demographic group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {result.interpretation.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all',
                        getStatusColor(item.status)
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(item.status)}
                        <span className="font-semibold">{item.group}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                  ))}
                </div>

                {/* Important Notes */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        <strong>Important:</strong> Cosine distance interpretation applies primarily to same-demographic comparisons.
                      </p>
                      <p>
                        Cross-demographic distances do not directly imply bias. Higher distance values indicate better 
                        distinguishability within a demographic group, suggesting lower risk of false matches.
                      </p>
                    </div>
                  </div>
                </div>
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
