import html2canvas from 'html2canvas';
import type { QROptions } from '@/types';

export const qrService = {
  // Download QR code as PNG using html2canvas
  async downloadQRCode(
    element: HTMLElement,
    filename: string = 'qr-code.png'
  ): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2, // Higher resolution
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
    } catch (error) {
      console.error('Failed to download QR code:', error);
      throw new Error('Failed to download QR code');
    }
  },

  // Get default QR options
  getDefaultOptions(): QROptions {
    return {
      fgColor: '#000000',
      bgColor: '#ffffff',
      level: 'M',
      logoUrl: undefined,
      logoSize: 20,
      includeLogo: false,
    };
  },

  // Validate QR options
  validateOptions(options: QROptions): boolean {
    const isValidColor = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);
    const validLevels: Array<QROptions['level']> = ['L', 'M', 'Q', 'H'];

    return (
      isValidColor(options.fgColor) &&
      isValidColor(options.bgColor) &&
      validLevels.includes(options.level)
    );
  },
};
