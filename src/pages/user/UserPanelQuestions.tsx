import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Question {
  id: string;
  content: string;
  created_at: string;
  responses: Array<{content: string}>;
  is_answered: boolean;
}

export default function UserPanelQuestions() {
  const [searchParams] = useSearchParams();
  const panelId = searchParams.get('panel');
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected');
  const [panelTitle, setPanelTitle] = useState<string>('');
  
  useEffect(() => {
    const fetchPanelTitle = async () => {
      if (!panelId) return;
      const { data } = await supabase
        .from('panels')
        .select('title')
        .eq('id', panelId)
        .single();
      setPanelTitle(data?.title || '');
    };
    fetchPanelTitle();
  }, [panelId]);

  const { data: questions = [], isLoading, error, refetch } = useQuery<Question[]>({
    queryKey: ['panel-questions', panelId],
    queryFn: async () => {
      if (!panelId) return [];
      
      const { data, error } = await supabase
        .from('questions')
        .select('*, responses(content)')
        .eq('panel_id', panelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!panelId,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!panelId) return;

    const subscription = supabase
      .channel(`panel_questions:${panelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panelId}`
        },
        () => {
          console.log('Changement détecté, déclenchement re-fetch...');
          refetch();
        }
      )
      .subscribe((status, err) => {
        console.log('Statut abonnement:', status);
        setRealtimeStatus(status);
        if (err) {
          console.error('Erreur abonnement:', err);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [panelId, refetch]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      <p className="text-gray-600">Chargement des questions...</p>
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-red-500">
      <AlertTriangle className="h-12 w-12" />
      <p>Erreur lors du chargement des questions</p>
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => window.location.reload()}
      >
        Réessayer
      </button>
    </div>
  );
  if (!panelId) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-yellow-600">
      <AlertTriangle className="h-12 w-12" />
      <p>Panel non spécifié</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Questions du panel
            </div>
            {panelTitle && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-normal text-muted-foreground"
              >
                Panel: {panelTitle}
              </motion.p>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground"
            >
              Aucune question pour ce panel
            </motion.p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {questions.map((question) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <p>{question.content}</p>
                  </div>
                  {question.responses?.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                      <p className="text-sm text-gray-600">Réponse:</p>
                      <p>{question.responses[0].content}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}