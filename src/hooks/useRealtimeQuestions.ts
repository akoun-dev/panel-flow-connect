import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Question {
  id: string;
  content: string;
  panel_id: string;
  panelist_email?: string | null;
  panelist_name?: string | null;
  author_name?: string | null;
  author_structure?: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  created_at: string;
  responses?: Array<{ content: string; created_at?: string }>;
}

export interface RealtimeQuestionsResult {
  questions: Question[];
  status: string;
  newQuestionIds: Set<string>;
  updatedQuestionIds: Set<string>;
}

export default function useRealtimeQuestions(panelId?: string): RealtimeQuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<string>('idle');
  const [newQuestionIds, setNewQuestionIds] = useState<Set<string>>(new Set());
  const [updatedQuestionIds, setUpdatedQuestionIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  const addTimeout = useCallback((cb: () => void, delay: number) => {
    const t = setTimeout(() => {
      cb();
      timeoutRefs.current.delete(t);
    }, delay);
    timeoutRefs.current.add(t);
  }, []);

  useEffect(() => {
    if (!panelId) return;

    const fetchQuestions = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*, responses(content, created_at)')
        .eq('panel_id', panelId)
        .order('created_at', { ascending: false });
      if (data) {
        setQuestions(data as Question[]);
      }
    };

    fetchQuestions();

    const channel = supabase
      .channel(`panel-${panelId}-questions`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` },
        payload => {
          const q = payload.new as Question;
          setQuestions(prev => [q, ...prev]);
          setNewQuestionIds(prev => new Set([...prev, q.id]));
          addTimeout(() => {
            setNewQuestionIds(prev => {
              const s = new Set(prev);
              s.delete(q.id);
              return s;
            });
          }, 10000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` },
        payload => {
          const q = payload.new as Question;
          setQuestions(prev => prev.map(item => (item.id === q.id ? q : item)));
          setUpdatedQuestionIds(prev => new Set([...prev, q.id]));
          addTimeout(() => {
            setUpdatedQuestionIds(prev => {
              const s = new Set(prev);
              s.delete(q.id);
              return s;
            });
          }, 5000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` },
        payload => {
          setQuestions(prev => prev.filter(q => q.id !== payload.old.id));
        }
      )
      .subscribe(s => setStatus(s));

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      timeoutRefs.current.forEach(t => clearTimeout(t));
      timeoutRefs.current.clear();
    };
  }, [panelId, addTimeout]);

  return { questions, status, newQuestionIds, updatedQuestionIds };
}
