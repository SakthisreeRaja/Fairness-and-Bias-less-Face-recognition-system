import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear?: () => void;
  className?: string;
  label?: string;
  accept?: string;
}

export function ImageUploader({
  onImageSelect,
  selectedImage,
  onClear,
  className,
  label = 'Upload Image',
  accept = 'image/*',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleClear = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onClear?.();
  }, [previewUrl, onClear]);

  return (
    <div className={cn('w-full', className)}>
      {!selectedImage ? (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative flex flex-col items-center justify-center w-full h-64 cursor-pointer',
            'rounded-xl border-2 border-dashed transition-all duration-300',
            'gradient-border bg-card/50 hover:bg-card/70',
            isDragging 
              ? 'border-primary glow-border scale-[1.02]' 
              : 'border-muted-foreground/30 hover:border-primary/50'
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className={cn(
              'p-4 rounded-full transition-all duration-300',
              'gradient-primary-soft',
              isDragging && 'animate-pulse-glow'
            )}>
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & drop or click to browse
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>PNG, JPG, JPEG up to 10MB</span>
            </div>
          </div>
        </label>
      ) : (
        <div className="relative w-full h-64 rounded-xl overflow-hidden glass group">
          <img
            src={previewUrl || ''}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="secondary" className="h-8 w-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <img
                  src={previewUrl || ''}
                  alt="Full size preview"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
              </DialogContent>
            </Dialog>
            
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-sm text-foreground font-medium truncate">
              {selectedImage.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
