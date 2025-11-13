import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { logosService } from '@/services/logos.service';
import type { UserLogo } from '@/types';

interface LogoSelectorProps {
  userId: string;
  selectedLogoUrl?: string;
  onSelectLogo: (logoUrl: string) => void;
  userLogoUrl?: string;
}

export function LogoSelector({
  userId,
  selectedLogoUrl,
  onSelectLogo,
  userLogoUrl,
}: LogoSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Fetch user's logos
  const { data: logos = [] } = useQuery({
    queryKey: ['/api/logos', userId],
    queryFn: () => logosService.getUserLogos(userId),
    enabled: !!userId,
  });

  // Upload new logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !logoName) {
        throw new Error('Please provide a name and select a file');
      }

      const logoUrl = await logosService.uploadLogoFile(userId, uploadFile);
      return logosService.createLogo({
        userId,
        name: logoName,
        logoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos', userId] });
      toast({
        title: 'Logo uploaded',
        description: 'Your logo has been added to the collection.',
      });
      setIsUploadOpen(false);
      setUploadFile(null);
      setLogoName('');
      setUploadPreview(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async (logo: UserLogo) => {
      await logosService.deleteLogoFile(logo.logoUrl);
      await logosService.deleteLogo(logo.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos', userId] });
      toast({
        title: 'Logo deleted',
        description: 'Logo removed from your collection.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-fill name from filename
      if (!logoName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setLogoName(nameWithoutExt);
      }
    }
  };

  const handleUpload = () => {
    uploadLogoMutation.mutate();
  };

  return (
    <div className="space-y-3">
      {/* Logo Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* User's Profile Logo (if set) */}
        {userLogoUrl && (
          <div className="relative group">
            <button
              onClick={() => onSelectLogo(userLogoUrl)}
              className={`relative w-full aspect-square rounded-lg border-2 overflow-hidden transition-all hover:border-primary ${
                selectedLogoUrl === userLogoUrl
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-border'
              }`}
              title="Your Profile Logo"
            >
              <img
                src={userLogoUrl}
                alt="Your Profile Logo"
                className="w-full h-full object-contain p-1"
              />
              {selectedLogoUrl === userLogoUrl && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-primary" />
                </div>
              )}
            </button>
            <div className="absolute -bottom-5 left-0 right-0 text-center">
              <span className="text-xs text-muted-foreground bg-background px-1">Profile</span>
            </div>
          </div>
        )}

        {/* Collection Logos */}
        {logos.map((logo) => (
          <div key={logo.id} className="relative group">
            <button
              onClick={() => onSelectLogo(logo.logoUrl)}
              className={`relative w-full aspect-square rounded-lg border-2 overflow-hidden transition-all hover:border-primary ${
                selectedLogoUrl === logo.logoUrl
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-border'
              }`}
              title={logo.name}
            >
              <img
                src={logo.logoUrl}
                alt={logo.name}
                className="w-full h-full object-contain p-1"
              />
              {selectedLogoUrl === logo.logoUrl && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-primary" />
                </div>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${logo.name}"?`)) {
                  deleteLogoMutation.mutate(logo);
                }
              }}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Upload New Logo Button */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <button className="w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-colors flex flex-col items-center justify-center gap-1">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Logo</DialogTitle>
              <DialogDescription>
                Add a logo to your collection for embedding in QR codes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Logo Preview */}
              {uploadPreview && (
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="max-w-32 max-h-32 object-contain"
                  />
                </div>
              )}

              {/* Logo Name */}
              <div className="space-y-2">
                <Label htmlFor="logo-name">Logo Name</Label>
                <Input
                  id="logo-name"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  placeholder="e.g., Company Logo"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo-file">Logo File</Label>
                <Input
                  id="logo-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  PNG or JPG. Max 5MB. Square images work best.
                </p>
              </div>

              {/* Upload Button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadFile(null);
                    setLogoName('');
                    setUploadPreview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || !logoName || uploadLogoMutation.isPending}
                >
                  {uploadLogoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {logos.length === 0 && !userLogoUrl && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No logos yet. Upload one to get started.
        </p>
      )}
    </div>
  );
}
