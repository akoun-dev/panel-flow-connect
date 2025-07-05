import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui/button';
import { Download, Share2, Copy } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface PollQRCodeProps {
  pollId: string;
  size?: number;
  /**
   * Base URL to use when generating the QR code.
   * Defaults to `window.location.origin` when not provided.
   */
  url?: string;
}

export default function PollQRCode({ pollId, size = 128, url }: PollQRCodeProps) {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const qrValue = `${url ?? window.location.origin}/poll/${pollId}`;

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const png = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `qrcode-poll-${pollId}.png`;
      a.href = png;
      a.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Poll',
        url: qrValue,
      });
    } catch (err) {
      handleCopy();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    toast({
      title: 'Lien copié',
      description: 'Le lien du sondage a été copié dans le presse-papiers'
    });
  };

  return (
    <div ref={qrRef} className="flex flex-col items-center gap-4 p-4 border rounded-lg">
      <QRCodeSVG
        value={qrValue}
        size={size}
        level="H"
        includeMargin
      />
      <div className="flex gap-2 w-full justify-center">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
