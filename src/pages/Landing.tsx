import { Link } from 'react-router-dom';
import { 
  ScanFace, 
  BarChart3, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  ChevronDown,
  Cpu,
  Scale,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: ScanFace,
    title: 'Face Detection',
    description: 'Advanced face detection using state-of-the-art deep learning models',
    color: 'text-primary',
  },
  {
    icon: Cpu,
    title: 'Embedding Generation',
    description: 'Generate 512-dimensional face embeddings with ArcFace model',
    color: 'text-secondary',
  },
  {
    icon: Scale,
    title: 'Fairness Analysis',
    description: 'Evaluate demographic fairness across multiple population groups',
    color: 'text-status-success',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-primary opacity-10" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center stagger-children">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Powered by DeepFace & ArcFace</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6">
              <span className="gradient-text">Fairness-Aware</span>
              <br />
              <span className="text-foreground">Face Recognition</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Detect faces, generate embeddings, and evaluate fairness across demographic groups 
              with our advanced AI-powered analysis system.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                className="gradient-primary glow-primary text-primary-foreground gap-2 text-lg px-8"
              >
                <Link to="/analysis">
                  <ScanFace className="w-5 h-5" />
                  Upload Image
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="gap-2 text-lg px-8 glow-border"
              >
                <Link to="/audit">
                  <BarChart3 className="w-5 h-5" />
                  Run Fairness Audit
                </Link>
              </Button>
            </div>

            {/* Animated illustration */}
            <div className="mt-16 relative">
              <div className="relative w-64 h-64 mx-auto">
                {/* Central face icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full gradient-primary glow-primary flex items-center justify-center animate-pulse-glow">
                    <ScanFace className="w-16 h-16 text-primary-foreground" />
                  </div>
                </div>

                {/* Floating icons */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-float">
                  <div className="p-3 rounded-xl glass">
                    <Shield className="w-6 h-6 text-status-success" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="p-3 rounded-xl glass">
                    <Scale className="w-6 h-6 text-secondary" />
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="p-3 rounded-xl glass">
                    <Fingerprint className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Scan line animation */}
                <div className="absolute inset-0 rounded-full overflow-hidden opacity-50">
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">Key Features</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our system provides comprehensive face analysis with a focus on fairness and transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={cn(
                  'glass card-glow group cursor-pointer',
                  'border-transparent hover:border-primary/30'
                )}
              >
                <CardContent className="p-6">
                  <div className={cn(
                    'w-14 h-14 rounded-xl mb-4 flex items-center justify-center',
                    'gradient-primary-soft group-hover:glow-primary transition-all'
                  )}>
                    <feature.icon className={cn('w-7 h-7', feature.color)} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Get Started CTA */}
          <div className="mt-16 text-center">
            <Button asChild size="lg" className="gradient-primary glow-primary gap-2">
              <Link to="/analysis">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
