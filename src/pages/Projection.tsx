import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PanelService } from '@/services/panelService';
import { PollViewer } from '@/components/polls/PollViewer';
import { supabase } from '@/lib/supabase';
import type { Panel, Poll } from '@/types';

interface Question {
  id: string;
  content: string;
  created_at: string;
  responses?: Array<{ content: string }>; // minimal shape
}

export default function Projection() {
  const { panelId } = useParams<{ panelId: string}>();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!panelId) return;
    PanelService.getPanelById(panelId)
      .then(setPanel)
      .catch((err) => console.error('Error loading panel', err));
  }, [panelId]);

  useEffect(() => {
    if (!panelId) return;
    const fetchPolls = async () => {
      const { data, error } = await supabase
        .from('polls')
        .select('id, panel_id, question, created_at')
        .eq('panel_id', panelId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPolls(data as Poll[]);
      }
    };
    fetchPolls();
  }, [panelId]);

  useEffect(() => {
    if (!panelId) return;
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, content, created_at, responses(content)')
        .eq('panel_id', panelId);
      if (!error && data) {
        setQuestions(data as unknown as Question[]);
      }
    };

    fetchQuestions();

    const channel = supabase
      .channel(`panel-${panelId}-projection`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` },
        (payload) => {
          setQuestions((prev) => [payload.new as Question, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` },
        (payload) => {
          setQuestions((prev) => prev.map(q => q.id === payload.new.id ? payload.new as Question : q));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` },
        (payload) => {
          setQuestions((prev) => prev.filter(q => q.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [panelId]);

  const popularQuestions = [...questions].sort((a, b) => {
    const aCount = a.responses?.length || 0;
    const bCount = b.responses?.length || 0;
    return bCount - aCount;
  });

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {panel && (
        <div>
          <h1 className="text-2xl font-bold">{panel.title}</h1>
          <p className="text-sm text-gray-500">Projection en direct</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Temps réel actif' : 'Déconnecté'}
          </div>
        </div>
      )}

      {polls.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Sondages actifs</h2>
          {polls.map((p) => (
            <PollViewer key={p.id} pollId={p.id} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Questions populaires</h2>
        {popularQuestions.map((q) => (
          <div key={q.id} className="border rounded-md p-3">
            <p>{q.content}</p>
            <p className="text-xs text-gray-500">
              {(q.responses?.length || 0)} réponse{(q.responses?.length || 0) > 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
