import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ModelViewerProps {
  modelUrl: string;
  alt?: string;
  className?: string;
  ar?: boolean;
  autoRotate?: boolean;
  cameraControls?: boolean;
}

// Declare model-viewer as a custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export function ModelViewer({
  modelUrl,
  alt = '3D Model',
  className = '',
  ar = false,
  autoRotate = false,
  cameraControls = true,
}: ModelViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically load model-viewer script
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError(true);
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [modelUrl]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading 3D model...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-sm text-destructive">Failed to load model</p>
        </div>
      )}

      <model-viewer
        ref={viewerRef}
        src={modelUrl}
        alt={alt}
        camera-controls={cameraControls}
        auto-rotate={autoRotate}
        ar={ar}
        ar-modes={ar ? "webxr scene-viewer quick-look" : undefined}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
        data-testid="model-viewer"
      />
    </div>
  );
}
