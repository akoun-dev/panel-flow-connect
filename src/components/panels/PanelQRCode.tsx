import { useMemo } from 'react';

import { QRCodeSVG } from 'qrcode.react';
import { type Panel } from '@/services/panelService';

interface PanelQRCodeProps {
  panel: Panel & { qr_code?: string };
  size?: number;
  url?: string;
}

export function PanelQRCode({ panel, size = 128, url }: PanelQRCodeProps) {
  const qrValue = useMemo(() => {
    return url || panel.qr_code || `panel-${panel.id}`;
  }, [panel.id, panel.qr_code]);

  return (
    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
      <QRCodeSVG
        value={qrValue}
        size={size}
        level="H"
        includeMargin
      />
    </div>
  );
}