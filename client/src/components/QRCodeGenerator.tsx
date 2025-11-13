import { useRef, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogoSelector } from './LogoSelector';
import type { QROptions } from '@/types';
import QRCodeLib from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  options: QROptions;
  onOptionsChange: (options: QROptions) => void;
  onDownload: () => void;
  userId?: string;
  userLogoUrl?: string;
}

export function QRCodeGenerator({
  value,
  options,
  onOptionsChange,
  onDownload,
  userId,
  userLogoUrl,
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrImage, setQrImage] = useState<string>('');

  // Generate QR code with logo
  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current) return;

      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Generate base QR code
        await QRCodeLib.toCanvas(canvas, value, {
          width: 300,
          margin: 1,
          color: {
            dark: options.fgColor,
            light: options.bgColor,
          },
          errorCorrectionLevel: options.level,
        });

        // If logo is enabled and URL is provided, overlay it
        if (options.includeLogo && options.logoUrl) {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';

          logo.onload = () => {
            const logoSize = (canvas.width * (options.logoSize || 20)) / 100;
            const x = (canvas.width - logoSize) / 2;
            const y = (canvas.height - logoSize) / 2;

            // Draw white background circle for logo
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw logo
            ctx.drawImage(logo, x, y, logoSize, logoSize);

            // Update the displayed image AFTER logo is drawn
            setQrImage(canvas.toDataURL());
          };

          logo.onerror = () => {
            console.error('Failed to load logo image');
            // Even if logo fails, show the QR code without logo
            setQrImage(canvas.toDataURL());
          };

          logo.src = options.logoUrl;
        } else {
          // No logo to embed, just show the QR code
          setQrImage(canvas.toDataURL());
        }
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQR();
  }, [value, options]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column - QR Preview */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex justify-center p-8 bg-card rounded-lg border border-card-border w-full">
          <div ref={qrRef} className="bg-white p-4 rounded-lg" data-testid="qr-code">
            {options.includeLogo && options.logoUrl ? (
              <>
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                  width={300}
                  height={300}
                />
                {qrImage && (
                  <img
                    src={qrImage}
                    alt="QR Code"
                    width={256}
                    height={256}
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </>
            ) : (
              <QRCode
                value={value}
                size={256}
                bgColor={options.bgColor}
                fgColor={options.fgColor}
                level={options.level}
              />
            )}
          </div>
        </div>

        <Button
          onClick={onDownload}
          className="w-full"
          data-testid="button-download-qr"
        >
          <Download className="h-4 w-4 mr-2" />
          Download QR Code
        </Button>
      </div>

      {/* Right Column - Controls */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fg-color">Foreground Color</Label>
          <div className="flex gap-2">
            <Input
              id="fg-color"
              type="color"
              value={options.fgColor}
              onChange={(e) =>
                onOptionsChange({ ...options, fgColor: e.target.value })
              }
              className="h-10 w-16 p-1 cursor-pointer"
              data-testid="input-fg-color"
            />
            <Input
              type="text"
              value={options.fgColor}
              onChange={(e) =>
                onOptionsChange({ ...options, fgColor: e.target.value })
              }
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bg-color">Background Color</Label>
          <div className="flex gap-2">
            <Input
              id="bg-color"
              type="color"
              value={options.bgColor}
              onChange={(e) =>
                onOptionsChange({ ...options, bgColor: e.target.value })
              }
              className="h-10 w-16 p-1 cursor-pointer"
              data-testid="input-bg-color"
            />
            <Input
              type="text"
              value={options.bgColor}
              onChange={(e) =>
                onOptionsChange({ ...options, bgColor: e.target.value })
              }
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="error-correction">Error Correction Level</Label>
        <Select
          value={options.level}
          onValueChange={(value: 'L' | 'M' | 'Q' | 'H') =>
            onOptionsChange({ ...options, level: value })
          }
        >
          <SelectTrigger id="error-correction" data-testid="select-error-correction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">Low (7%)</SelectItem>
            <SelectItem value="M">Medium (15%)</SelectItem>
            <SelectItem value="Q">Quartile (25%)</SelectItem>
            <SelectItem value="H">High (30%)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Higher levels provide better error recovery but create larger QR codes
        </p>
      </div>

      {/* Logo Options */}
      <div className="space-y-4 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-logo"
            checked={options.includeLogo}
            onCheckedChange={(checked) =>
              onOptionsChange({ ...options, includeLogo: checked as boolean })
            }
          />
          <Label htmlFor="include-logo" className="cursor-pointer flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Embed Logo in QR Code
          </Label>
        </div>

        {options.includeLogo && (
          <>
            <div className="space-y-2">
              <Label>Select Logo</Label>
              {userId && (
                <LogoSelector
                  userId={userId}
                  selectedLogoUrl={options.logoUrl}
                  onSelectLogo={(logoUrl) =>
                    onOptionsChange({ ...options, logoUrl })
                  }
                  userLogoUrl={userLogoUrl}
                />
              )}
            </div>

            {options.logoUrl && (
              <div className="space-y-2">
                <Label htmlFor="logo-size">
                  Logo Size: {options.logoSize}% of QR Code
                </Label>
                <Slider
                  id="logo-size"
                  min={10}
                  max={30}
                  step={1}
                  value={[options.logoSize || 20]}
                  onValueChange={([value]) =>
                    onOptionsChange({ ...options, logoSize: value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 15-25%. Larger logos may affect QR code readability.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
