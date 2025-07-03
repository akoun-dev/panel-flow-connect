import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Projection from '@/pages/Projection';
import type { Panel } from '@/types';

export default function ProjectionWrapper() {
  const { panelId } = useParams();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPanel = async () => {
      const { data } = await supabase
        .from('panels')
        .select('*')
        .eq('id', panelId)
        .single();
      setPanel(data as Panel);
      setLoading(false);
    };
    fetchPanel();
  }, [panelId]);

  if (loading) return <div>Chargement...</div>;
  if (!panel) return <div>+</div>;

  return <Projection panel={panel} />;
}
