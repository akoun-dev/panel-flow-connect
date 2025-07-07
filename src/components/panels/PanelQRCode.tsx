import { useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Panel } from '@/types/panel';
import { Button } from '../ui/button';
import { Download, Share2, Copy } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface PanelQRCodeProps {
  panel: Panel;
  size?: number;
  url?: string;
}

export function PanelQRCode({ panel, size = 128, url }: PanelQRCodeProps) {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const qrValue = useMemo(() => {
    if (url) return url;

    if (panel.qr_code_url) {
      return panel.qr_code_url.startsWith('http')
        ? panel.qr_code_url
        : `${window.location.origin}${panel.qr_code_url}`;
    }

    return `${window.location.origin}/panel/${panel.id}/quesions`;
  }, [panel.id, panel.qr_code_url, url]);

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
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-panel-${panel.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Panel: ${panel.title}`,
        text: `Participez à mon panel "${panel.title}"`,
        url: qrValue
      });
    } catch (err) {
      console.error('Erreur de partage:', err);
      handleCopy(); // Fallback si le partage n'est pas supporté
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    toast({
      title: 'Lien copié',
      description: 'Le lien du panel a été copié dans le presse-papiers'
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