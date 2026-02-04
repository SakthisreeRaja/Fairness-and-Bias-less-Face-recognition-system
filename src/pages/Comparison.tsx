import { useState, useCallback } from 'react';
import { GitCompare, CheckCircle, XCircle, AlertCircle, ArrowLeftRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ImageUploader } from '@/components/ImageUploader';
import { ConfidenceRing } from '@/components/ConfidenceRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { compareFaces } from '@/api';
import type { FaceComparisonResult } from '@/api/types';
import { useHistory } from '@/hooks/useHistory';
import { cn } from '@/lib/utils';

const GROUP_OPTIONS = ['African', 'Asian', 'Caucasian', 'Indian'];

export default function Comparison() {
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<FaceComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAdaptiveThreshold, setUseAdaptiveThreshold] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const { addEntry } = useHistory();

  const handleCompare = useCallback(async () => {
    if (!image1 || !image2) return;

    setIsComparing(true);
    setError(null);
    setResult(null);

    try {
      const response = await compareFaces(image1, image2, {
        useAdaptiveThreshold,
        group: selectedGroup || undefined,
      });
      
      if (response.success && response.data) {
        setResult(response.data);
        
        addEntry({
          type: 'comparison',
          summary: `${response.data.isMatch ? 'Match' : 'No Match'} - Similarity: ${(response.data.cosineSimilarity * 100).toFixed(1)}%`,
          result: response.data,
        });
      } else {
        setError(response.error || 'Comparison failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsComparing(false);
    }
  }, [image1, image2, addEntry, useAdaptiveThreshold, selectedGroup]);

  const handleClear = useCallback(() => {
    setImage1(null);
    setImage2(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <AppLayout title="Baseline Verification">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Baseline Verification</h1>
          <p className="text-muted-foreground">
            Compare two faces as a baseline verification task for evaluation and reporting
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 relative">
          {/* Image 1 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-center">Face 1</h3>
            <ImageUploader
              selectedImage={image1}
              onImageSelect={setImage1}
              onClear={() => setImage1(null)}
              label="Upload First Face"
            />
            {result && (
              <div className={cn(
                'flex items-center justify-center gap-2 p-2 rounded-lg',
                result.face1Detected 
                  ? 'bg-status-success/10 text-status-success'
                  : 'bg-status-danger/10 text-status-danger'
              )}>
                {result.face1Detected ? (
                  <><CheckCircle className="w-4 h-4" /> Face Detected</>
                ) : (
                  <><XCircle className="w-4 h-4" /> No Face Detected</>
                )}
              </div>
            )}
          </div>

          {/* Connection indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-all',
              result 
                ? result.isMatch 
                  ? 'bg-status-success glow-primary'
                  : 'bg-status-danger'
                : 'glass'
            )}>
              <ArrowLeftRight className={cn(
                'w-6 h-6',
                result 
                  ? 'text-white'
                  : 'text-muted-foreground'
              )} />
            </div>
          </div>

          {/* Image 2 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-center">Face 2</h3>
            <ImageUploader
              selectedImage={image2}
              onImageSelect={setImage2}
              onClear={() => setImage2(null)}
              label="Upload Second Face"
            />
            {result && (
              <div className={cn(
                'flex items-center justify-center gap-2 p-2 rounded-lg',
                result.face2Detected 
                  ? 'bg-status-success/10 text-status-success'
                  : 'bg-status-danger/10 text-status-danger'
              )}>
                {result.face2Detected ? (
                  <><CheckCircle className="w-4 h-4" /> Face Detected</>
                ) : (
                  <><XCircle className="w-4 h-4" /> No Face Detected</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Threshold Options */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Threshold Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="adaptive-threshold"
                  checked={useAdaptiveThreshold}
                  onCheckedChange={setUseAdaptiveThreshold}
                />
                <Label htmlFor="adaptive-threshold">Use adaptive (group-aware) threshold</Label>
              </div>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Select subject group" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Adaptive thresholds are calibrated during the fairness audit. Select a group to apply the
              group-specific threshold for decision-level mitigation.
            </p>
            {useAdaptiveThreshold && !selectedGroup && (
              <p className="text-xs text-status-warning mt-2">
                Select a group to apply adaptive thresholds; otherwise the standard threshold is used.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Compare Button */}
        {image1 && image2 && !result && (
          <div className="flex justify-center">
            <Button
              onClick={handleCompare}
              disabled={isComparing}
              size="lg"
              className="gradient-primary glow-primary gap-2"
            >
              {isComparing ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="w-5 h-5" />
                  Run Baseline Compare
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isComparing && (
          <div className="flex justify-center">
            <Skeleton className="w-48 h-48 rounded-xl" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in-up">
            {result.warnings && result.warnings.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-status-warning/10 border border-status-warning/30 text-status-warning">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  {result.warnings.map((warning, index) => (
                    <p key={index}>{warning}</p>
                  ))}
                </div>
              </div>
            )}

            {result.twinLookAlikeRisk?.flag && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Look-alike risk detected</p>
                  <p>{result.twinLookAlikeRisk.note}</p>
                </div>
              </div>
            )}

            {/* Match Result Card */}
            <Card className={cn(
              'glass overflow-hidden',
              result.isMatch ? 'border-status-success/50' : 'border-status-danger/50'
            )}>
              <div className={cn(
                'h-1',
                result.isMatch ? 'bg-status-success' : 'bg-status-danger'
              )} />
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                  {/* Verdict */}
                  <div className="text-center">
                    <div className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center mb-3 mx-auto',
                      result.isMatch 
                        ? 'bg-status-success/20' 
                        : 'bg-status-danger/20'
                    )}>
                      {result.isMatch ? (
                        <CheckCircle className="w-10 h-10 text-status-success" />
                      ) : (
                        <XCircle className="w-10 h-10 text-status-danger" />
                      )}
                    </div>
                    <h2 className={cn(
                      'text-3xl font-bold',
                      result.isMatch ? 'text-status-success' : 'text-status-danger'
                    )}>
                      {result.isMatch ? 'Match' : 'No Match'}
                    </h2>
                  </div>

                  {/* Similarity Score */}
                  <div className="text-center">
                    <ConfidenceRing
                      value={result.cosineSimilarity}
                      size={120}
                      label="Similarity"
                    />
                  </div>

                  {/* Confidence */}
                  <div className="text-center">
                    <ConfidenceRing
                      value={result.confidence}
                      size={120}
                      label="Calibrated Confidence"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Comparison Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Cosine Similarity</p>
                    <p className="text-2xl font-bold">{result.cosineSimilarity.toFixed(4)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Distance</p>
                    <p className="text-2xl font-bold">{result.distance?.toFixed(4) ?? 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Threshold</p>
                    <p className="text-2xl font-bold">{result.threshold?.toFixed(3) ?? 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{result.thresholdSource || 'standard'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Processing Time</p>
                    <p className="text-2xl font-bold">{result.processingTime.toFixed(2)}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClear}>
                Compare New Pair
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
