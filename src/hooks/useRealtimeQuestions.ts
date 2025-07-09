import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  content: string;
  created_at: string;
  is_anonymous?: boolean;
  panelist_email?: string | null;
  panelist_name?: string | null;
  author_name?: string | null;
  author_structure?: string | null;
  is_answered?: boolean;
  responses?: Array<{ content: string; created_at?: string }>;
}

export function useRealtimeQuestions(panelId?: string | null) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<string>('idle');
  const [loading, setLoading] = useState<boolean>(true);
  const timeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [newQuestionIds, setNewQuestionIds] = useState<Set<string>>(new Set());
  const [updatedQuestionIds, setUpdatedQuestionIds] = useState<Set<string>>(new Set());

  const clearTimeouts = useCallback(() => {
    timeouts.current.forEach(t => clearTimeout(t));
    timeouts.current.clear();
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!panelId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*, responses(content, created_at)')
      .eq('panel_id', panelId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setQuestions(data as Question[]);
    }
    setLoading(false);
  }, [panelId]);

  useEffect(() => {
    clearTimeouts();
    setQuestions([]);
    if (!panelId) {
      setLoading(false);
      return;
    }

    fetchQuestions();

    const channel = supabase
      .channel(`panel-${panelId}-questions-hook`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` }, payload => {
        const q = payload.new as Question;
        setQuestions(prev => [q, ...prev]);
        setNewQuestionIds(prev => {
          const next = new Set(prev);
          next.add(q.id);
          return next;
        });
        const to = setTimeout(() => {
          setNewQuestionIds(prev => {
            const next = new Set(prev);
            next.delete(q.id);
            return next;
          });
        }, 10000);
        timeouts.current.add(to);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` }, payload => {
        const q = payload.new as Question;
        setQuestions(prev => prev.map(ques => (ques.id === q.id ? q : ques)));
        setUpdatedQuestionIds(prev => {
          const next = new Set(prev);
          next.add(q.id);
          return next;
        });
        const to = setTimeout(() => {
          setUpdatedQuestionIds(prev => {
            const next = new Set(prev);
            next.delete(q.id);
            return next;
          });
        }, 5000);
        timeouts.current.add(to);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'questions', filter: `panel_id=eq.${panelId}` }, payload => {
        setQuestions(prev => prev.filter(q => q.id !== payload.old.id));
      })
      .subscribe(s => setStatus(s));

    return () => {
      supabase.removeChannel(channel);
      clearTimeouts();
    };
  }, [panelId, fetchQuestions, clearTimeouts]);

  const refresh = useCallback(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return { questions, status, loading, refresh, newQuestionIds, updatedQuestionIds };
}
