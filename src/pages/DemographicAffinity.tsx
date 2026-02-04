import { useState, useCallback } from 'react';
import { Users, AlertCircle, Info } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ImageUploader } from '@/components/ImageUploader';
import { DemographicCard } from '@/components/DemographicCard';
import { ConfidenceRing } from '@/components/ConfidenceRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { predictDemographic } from '@/api';
import type { DemographicAffinityResult } from '@/api/types';
import { useHistory } from '@/hooks/useHistory';

export default function DemographicAffinity() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DemographicAffinityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await predictDemographic(selectedImage);
      
      if (response.success && response.data) {
        setResult(response.data);
        
        addEntry({
          type: 'affinity',
          thumbnailUrl: URL.createObjectURL(selectedImage),
          summary: `Closest reference set: ${response.data.predictedGroup} (${(response.data.confidenceScore * 100).toFixed(1)}% confidence)`,
          result: response.data,
        });
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, addEntry]);

  const handleClear = useCallback(() => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <AppLayout title="Reference Sets">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Reference Set Similarity
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Compare embeddings against curated reference sets to diagnose potential demographic skews
          </p>
        </div>

        {/* Important Disclaimer */}
        <Alert className="glass border-primary/30">
          <Info className="h-4 w-4" />
          <AlertTitle>Important Disclaimer</AlertTitle>
          <AlertDescription>
            This system does <strong>NOT</strong> classify race. It reports similarity trends from face embeddings
            by comparing against reference demographic datasets sourced from public data or realistic simulators.
            The results indicate embedding similarity patterns, not racial identity or classification.
          </AlertDescription>
        </Alert>

        {/* Upload Section */}
        <div className="space-y-4">
          <ImageUploader
            selectedImage={selectedImage}
            onImageSelect={setSelectedImage}
            onClear={handleClear}
            label="Upload Face for Reference Matching"
          />

          {selectedImage && !result && (
            <div className="flex justify-center">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                size="lg"
                className="gradient-primary glow-primary gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Run Reference Match
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {isAnalyzing && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <Skeleton className="w-32 h-32 rounded-full" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Confidence Score */}
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <ConfidenceRing
                    value={result.confidenceScore}
                    size={140}
                    label="Confidence"
                  />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Closest Reference Set</p>
                    <p className="text-2xl font-bold gradient-text">{result.predictedGroup}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distance Cards */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center">
                Distance to Reference Sets
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.distances.map((d) => (
                  <DemographicCard
                    key={d.group}
                    group={d.group}
                    distance={d.averageDistance}
                    isHighlighted={d.group === result.predictedGroup}
                  />
                ))}
              </div>
            </div>

            {/* Disclaimer Card */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5 text-primary" />
                  Understanding These Results
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>{result.disclaimer}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Lower distance indicates higher similarity to that reference set</li>
                  <li>The "predicted group" shows which reference set the embedding is most similar to</li>
                  <li>Confidence reflects the relative difference between the closest and other groups</li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClear}>
                Analyze Another Image
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
