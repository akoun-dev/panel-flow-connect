import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelService } from '@/services/panelService';
import { Panel } from '@/types/panel';
import { PanelInfoHeader } from '@/components/panels/PanelInfoHeader';

export default function Projection() {
  const { panelId } = useParams();

  const { data: panel, isLoading } = useQuery<Panel | null>(['panel', panelId], async () => {
    if (!panelId) return null;
    try {
      return await PanelService.getPanelById(panelId);
    } catch {
      return null;
    }
  }, { enabled: !!panelId });

  if (isLoading) return <div>Chargement...</div>;
  if (!panel) return <div>Panel introuvable</div>;

  return (
    <div className="p-4">
      <PanelInfoHeader panel={panel} />
      {/* Contenu de projection ici */}
    </div>
  );
}
