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
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', panelId)
        .single();

      if (!error && data) {
        setPanel(data);
      }
      setLoading(false);
    };

    fetchPanel();
  }, [panelId]);

  if (loading) return <div>Chargement...</div>;
  if (!panel) return <div>Panel non trouvé</div>;

  return <Questions panel={panel} />;
}