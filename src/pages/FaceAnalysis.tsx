import { useState, useCallback, useMemo } from 'react';
import { CheckCircle, Box, Cpu, Clock, AlertCircle, Sun, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ImageUploader } from '@/components/ImageUploader';
import { AnalysisCard } from '@/components/AnalysisCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeFace } from '@/api';
import type { FaceAnalysisResult } from '@/api/types';
import { useHistory } from '@/hooks/useHistory';

export default function FaceAnalysis() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FaceAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeFace(selectedImage);
      
      if (response.success && response.data) {
        setResult(response.data);
        
        // Add to history
        addEntry({
          type: 'analysis',
          thumbnailUrl: URL.createObjectURL(selectedImage),
          summary: `Face ${response.data.faceDetected ? 'detected' : 'not detected'} - ${response.data.embeddingSize}D embedding`,
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

  const illuminationLabel = useMemo(() => {
    if (!result?.illumination?.bucket) return 'Unknown';
    const bucket = result.illumination.bucket;
    return bucket.charAt(0).toUpperCase() + bucket.slice(1);
  }, [result]);

  const illuminationDescription = useMemo(() => {
    const mean = result?.illumination?.meanLuminance;
    if (mean === undefined || mean === null) return 'No luminance estimate available';
    return `Mean luminance: ${mean.toFixed(1)}`;
  }, [result]);

  return (
    <AppLayout title="Pipeline: Embedding">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Embedding and Inference</h1>
          <p className="text-muted-foreground">
            Stage 2 of the pipeline: detect faces, generate ArcFace embeddings, and record hardware-friendly timings.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Uploaded images are processed transiently and deleted after inference.
          </p>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <ImageUploader
            selectedImage={selectedImage}
            onImageSelect={setSelectedImage}
            onClear={handleClear}
            label="Upload Face Image for Embedding"
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
                    <Cpu className="w-5 h-5" />
                    Generate Embedding
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl glass">
                <Skeleton className="w-12 h-12 rounded-xl mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-xl font-semibold text-center">Analysis Results</h2>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
              <AnalysisCard
                title="Face Detection"
                value={result.faceDetected ? 'Detected' : 'Not Found'}
                icon={<CheckCircle className="w-6 h-6" />}
                status={result.faceDetected ? 'success' : 'danger'}
                description="Face detection status"
              />
              
              <AnalysisCard
                title="Embedding Size"
                value={`${result.embeddingSize}D`}
                icon={<Box className="w-6 h-6" />}
                status="neutral"
                description="Dimensions of feature vector"
              />
              
              <AnalysisCard
                title="Model Used"
                value={result.modelUsed}
                icon={<Cpu className="w-6 h-6" />}
                status="neutral"
                description="Face recognition model"
              />
              
              <AnalysisCard
                title="Processing Time"
                value={`${result.processingTime.toFixed(2)}s`}
                icon={<Clock className="w-6 h-6" />}
                status="neutral"
                description="Time to analyze"
              />
            </div>

            {result.illumination && (
              <div className="grid sm:grid-cols-2 gap-4">
                <AnalysisCard
                  title="Illumination"
                  value={illuminationLabel}
                  icon={<Sun className="w-6 h-6" />}
                  status={illuminationLabel === 'Low' ? 'warning' : 'neutral'}
                  description={illuminationDescription}
                />
                <AnalysisCard
                  title="Preprocessing"
                  value={result.preprocessing?.method || 'None'}
                  icon={<Sparkles className="w-6 h-6" />}
                  status={result.preprocessing?.applied ? 'success' : 'neutral'}
                  description={`Variant: ${result.preprocessing?.variant || 'original'}`}
                />
              </div>
            )}

            {result.confidence && (
              <div className="text-center p-4 rounded-xl glass">
                <p className="text-sm text-muted-foreground mb-1">Detection Confidence</p>
                <p className="text-2xl font-bold gradient-text">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
            )}

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
