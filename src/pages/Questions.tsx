import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Panel } from '../types';

interface Question {
  id: string;
  content: string;
  is_answered: boolean;
  is_anonymous: boolean;
  created_at: string;
  votes: number;
  answers?: {
    content: string;
    created_at: string;
  }[];
}

export default function Questions({ panel }: { panel: Panel }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent');

  // Charger les questions existantes avec leurs réponses
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('panel_id', panel.id)
        .order('created_at', { ascending: false });

      if (questionsError || !questionsData) return;

      // Charger les réponses pour chaque question
      const questionsWithAnswers = await Promise.all(
        questionsData.map(async (question) => {
          const { data: answersData } = await supabase
            .from('answers')
            .select('content, created_at')
            .eq('question_id', question.id)
            .order('created_at', { ascending: true });

          return {
            ...question,
            answers: answersData || []
          };
        })
      );

      setQuestions(questionsWithAnswers);
    };

    fetchQuestions();

    // Abonnement aux nouvelles questions
    const subscription = supabase
      .channel('questions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panel.id}`
        },
        (payload) => {
          setQuestions(prev => [payload.new as Question, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [panel.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const { error } = await supabase
      .from('questions')
      .insert({
        content: newQuestion,
        panel_id: panel.id,
        is_anonymous: isAnonymous
      });

    if (!error) {
      setNewQuestion('');
    }
  };

  const handleVote = async (questionId: string, increment: number) => {
    const { data } = await supabase.rpc('increment_vote', {
      question_id: questionId,
      increment
    });
    
    if (data) {
      setQuestions(prev => prev.map(q =>
        q.id === questionId ? {...q, votes: q.votes + increment} : q
      ));
    }
  };

  const sortedQuestions = activeTab === 'recent'
    ? [...questions].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...questions].sort((a, b) => b.votes - a.votes);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Questions pour {panel.title}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Récentes
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'popular' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Populaires
          </button>
        </div>
      </div>
      
      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Posez votre question..."
            className="w-full p-3 border rounded-lg"
            rows={3}
            required
          />
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(!isAnonymous)}
            className="mr-2"
          />
          <label htmlFor="anonymous">Poser anonymement</label>
        </div>
        
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Envoyer
        </button>
      </form>

      {/* Liste des questions */}
      <div className="space-y-4">
        {sortedQuestions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucune question pour le moment</p>
          </div>
        ) : (
          sortedQuestions.map((question) => (
            <div
              key={question.id}
              className={`p-6 bg-white rounded-lg shadow ${question.is_answered ? 'border-l-4 border-green-500' : ''}`}
            >
              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <button
                    onClick={() => handleVote(question.id, 1)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    ↑
                  </button>
                  <span className="my-1 font-medium">{question.votes || 0}</span>
                  <button
                    onClick={() => handleVote(question.id, -1)}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    ↓
                  </button>
                </div>
                
                <div className="flex-1">
                  <p className="text-lg text-gray-800">{question.content}</p>
                  <div className="flex justify-between mt-3 text-sm text-gray-500">
                    <span>{question.is_anonymous ? 'Anonyme' : 'Identifié'}</span>
                    <span>{new Date(question.created_at).toLocaleString()}</span>
                  </div>
                  
                  {question.answers?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="font-medium text-gray-700">Réponses :</h4>
                      {question.answers.map((answer, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-gray-200">
                          <p className="text-gray-700">{answer.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Répondu le {new Date(answer.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
