import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Questions from '../pages/Questions';
import { Panel } from '../types';

export default function QuestionsWrapper() {
  const { panelId } = useParams();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPanel = async () => {
      console.log(`Chargement du panel avec ID: ${panelId}`);
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', panelId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du panel:', error);
      } else if (data) {
        console.log('Panel chargé avec succès:', data);
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

  return <Questions panel={panel} />;
}