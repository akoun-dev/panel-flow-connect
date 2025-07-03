import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import Questions from '../pages/Questions';
import { Panel } from '../types';
import { PanelInfoHeader } from './panels/PanelInfoHeader';

export default function QuestionsWrapper() {
  const { panelId } = useParams();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPanel = async () => {
      logger.debug(`Chargement du panel avec ID: ${panelId}`);
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', panelId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du panel:', error);
      } else if (data) {
        logger.debug('Panel chargé avec succès:', data);
        setPanel(data);
      } else {
        console.warn('Aucun panel trouvé avec cet ID');
      }
      setLoading(false);
    };

    fetchPanel();
  }, [panelId]);

  if (loading) return <div>Chargement...</div>;
  if (!panel) return <div>+</div>;

  return (
    <div className="p-4">
      <PanelInfoHeader panel={panel} />
      <Questions panel={panel} />
    </div>
  );
}