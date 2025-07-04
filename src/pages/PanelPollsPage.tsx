import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PollQRCode from '@/components/polls/PollQRCode';
import { PollViewer } from '@/components/polls/PollViewer';
import type { Poll } from '@/types/poll';

export default function PanelPollsPage() {
  const { panelId } = useParams<{ panelId: string }>();
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    if (!panelId) return;
    supabase
      .from('polls')
      .select('id, panel_id, question, created_at')
      .eq('panel_id', panelId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPolls(data as Poll[]);
      });
  }, [panelId]);

  if (!panelId) return null;

  return (
    <div className="p-4 space-y-6">
      {polls.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>{p.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PollQRCode pollId={p.id} />
            <PollViewer pollId={p.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
