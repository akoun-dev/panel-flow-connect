import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Panel } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface Question {
  id: string;
  content: string;
  created_at: string;
  is_answered?: boolean | null;
  responses: { count: number }[];
  popularity: number;
}

export default function Projection({ panel }: { panel: Panel }) {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*, responses(count)')
        .eq('panel_id', panel.id);

      if (!error && data) {
        const withPopularity = data.map(q => ({
          ...q,
          popularity: q.responses?.[0]?.count ?? 0
        })) as Question[];
        withPopularity.sort((a, b) => b.popularity - a.popularity);
        setQuestions(withPopularity);
      }
    };

    fetchQuestions();
    const channel = supabase
      .channel(`projection-${panel.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panel.id}`
        },
        fetchQuestions
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [panel.id]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {questions.map(q => (
        <Card key={q.id}>
          <CardContent className="p-4 space-y-1">
            <p className="font-medium">{q.content}</p>
            <p className="text-sm text-gray-500">Popularité: {q.popularity}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
