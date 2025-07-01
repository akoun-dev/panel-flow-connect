import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Panel } from '../types';
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Clock, 
  User, 
  UserX, 
  Send, 
  Filter,
  Search,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Reply,
  Flag,
  Activity,
  Sparkles,
  ArrowDown,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

// Interface basée EXACTEMENT sur votre schéma
interface Question {
  id: string;
  content: string;
  panel_id: string;
  is_anonymous: boolean;
  is_answered: boolean;
  created_at: string;
}

export default function Questions({ panel }: { panel?: Panel }) {
  const { user } = useUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'answered' | 'unanswered'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [newQuestionCount, setNewQuestionCount] = useState(0);
  const questionsEndRef = useRef<HTMLDivElement>(null);

  // Vérification de la présence du panel
  if (!panel) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Panel non trouvé</h3>
            <p className="text-gray-600">
              Impossible de charger les informations du panel. Veuillez vérifier l'URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Charger les questions initiales et configurer REALTIME
  useEffect(() => {
    if (!panel?.id) return;

    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('questions')
          .select('*') // Seulement les champs existants
          .eq('panel_id', panel.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQuestions(data || []);
        setIsConnected(true);
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error('Erreur lors du chargement des questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();

    // Configuration REALTIME
    const questionsChannel = supabase
      .channel(`panel-${panel.id}-questions`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panel.id}`
        },
        (payload) => {
          console.log('New question:', payload.new);
          const newQuestion = payload.new as Question;
          setQuestions(prev => [newQuestion, ...prev]);
          setNewQuestionCount(prev => prev + 1);
          toast.success('Nouvelle question reçue! 🎉', {
            duration: 3000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panel.id}`
        },
        (payload) => {
          console.log('Question updated:', payload.new);
          setQuestions(prev => prev.map(q => 
            q.id === payload.new.id ? payload.new as Question : q
          ));
          
          if (payload.new.is_answered && !payload.old.is_answered) {
            toast.success('Une question a été répondue! ✅');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panel.id}`
        },
        (payload) => {
          console.log('Question deleted:', payload.old);
          setQuestions(prev => prev.filter(q => q.id !== payload.old.id));
          toast.error('Une question a été supprimée');
        }
      )
      .subscribe((status) => {
        console.log('Questions subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          toast.success('Connexion en temps réel établie! ⚡');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          toast.error('Erreur de connexion temps réel');
        }
      });

    return () => {
      supabase.removeChannel(questionsChannel);
    };
  }, [panel?.id]);

  // Auto-scroll vers les nouvelles questions
  const scrollToBottom = () => {
    questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (newQuestionCount > 0) {
      const timer = setTimeout(() => {
        setNewQuestionCount(0);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newQuestionCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) {
      toast.error('Veuillez saisir une question');
      return;
    }

    if (!panel?.id) {
      toast.error('Erreur: Panel non défini');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('questions')
        .insert({
          content: newQuestion.trim(),
          panel_id: panel.id,
          is_anonymous: isAnonymous,
          is_answered: false
        });

      if (error) throw error;

      setNewQuestion('');
      toast.success('Question envoyée avec succès! 🚀');
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error('Erreur lors de l\'envoi de la question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsAnswered = async (questionId: string, isAnswered: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_answered: !isAnswered })
        .eq('id', questionId);

      if (error) throw error;
      toast.success(isAnswered ? 'Question marquée comme non répondue' : 'Question marquée comme répondue');
    } catch (error) {
      console.error('Error updating question status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return;
    
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast.success('Question supprimée');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Filtrage et tri des questions
  const filteredQuestions = questions
    .filter(question => {
      const matchesSearch = question.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filterStatus === 'all' || 
        (filterStatus === 'answered' && question.is_answered) ||
        (filterStatus === 'unanswered' && !question.is_answered);
      return matchesSearch && matchesFilter;
    });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    switch (activeTab) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'answered':
        if (a.is_answered && !b.is_answered) return -1;
        if (!a.is_answered && b.is_answered) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'unanswered':
        if (!a.is_answered && b.is_answered) return -1;
        if (a.is_answered && !b.is_answered) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const getQuestionStats = () => {
    const total = questions.length;
    const answered = questions.filter(q => q.is_answered).length;
    const unanswered = total - answered;
    const recent = questions.filter(q => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return new Date(q.created_at) > hourAgo;
    }).length;
    
    return { total, answered, unanswered, recent };
  };

  const stats = getQuestionStats();

  const TabButton = ({ 
    id, 
    label, 
    icon: Icon, 
    count
  }: { 
    id: 'recent' | 'answered' | 'unanswered'; 
    label: string; 
    icon: any; 
    count?: number;
  }) => (
    <Button
      variant={activeTab === id ? 'default' : 'outline'}
      size="sm"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 ${
        activeTab === id ? 'bg-blue-600 text-white' : ''
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="ml-1">
          {count}
        </Badge>
      )}
    </Button>
  );

  const QuestionCard = ({ question, index }: { question: Question; index: number }) => {
    const isRecent = new Date(Date.now() - 10 * 60 * 1000) < new Date(question.created_at);

    return (
      <Card 
        className={`group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
          isRecent ? 'ring-2 ring-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50' : ''
        } ${index < 3 ? 'animate-in slide-in-from-bottom duration-500' : ''}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Indicateur de statut */}
            <div className="flex flex-col items-center space-y-2 min-w-[60px]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                question.is_answered 
                  ? 'bg-green-500 text-white' 
                  : 'bg-orange-400 text-white'
              }`}>
                {question.is_answered ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <MessageSquare className="h-3 w-3" />
                )}
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-500">
                  {new Date(question.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short'
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(question.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* Contenu de la question */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {question.is_answered && (
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Répondue
                    </Badge>
                  )}
                  
                  {isRecent && (
                    <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Nouvelle
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="flex items-center gap-1">
                    {question.is_anonymous ? (
                      <>
                        <UserX className="h-3 w-3" />
                        Anonyme
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        Identifié
                      </>
                    )}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Reply className="h-4 w-4 mr-2" />
                      Répondre
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => markAsAnswered(question.id, question.is_answered)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {question.is_answered ? 'Marquer non répondue' : 'Marquer comme répondue'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-gray-800 text-base leading-relaxed mb-3">
                {question.content}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(question.created_at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {!question.is_answered && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsAnswered(question.id, false)}
                    className="h-6 px-2 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Marquer répondue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Connexion en temps réel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Indicateur de connexion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Temps réel actif' : 'Connexion interrompue'}
          </span>
          {newQuestionCount > 0 && (
            <Badge variant="default" className="bg-green-100 text-green-700 animate-pulse">
              +{newQuestionCount} nouvelle(s)
            </Badge>
          )}
        </div>
        
        {newQuestionCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={scrollToBottom}
            className="animate-bounce"
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            Voir les nouvelles
          </Button>
        )}
      </div>

      {/* En-tête avec statistiques */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            Questions
            <Badge variant="outline" className="text-sm">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </h1>
          <p className="text-gray-600 mt-1">{panel?.title || 'Panel non défini'}</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.answered}</div>
            <div className="text-xs text-gray-500">Répondues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.unanswered}</div>
            <div className="text-xs text-gray-500">En attente</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.recent}</div>
            <div className="text-xs text-gray-500">Récentes</div>
          </div>
        </div>
      </div>

      {/* Formulaire de nouvelle question */}
      <Card className="border-2 border-dashed border-blue-200 hover:border-blue-300 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Poser une question
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <Activity className="h-3 w-3 mr-1" />
              Temps réel
            </Badge>
          </CardTitle>
          <CardDescription>
            Votre question apparaîtra instantanément à tous les participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="question">Votre question</Label>
              <Textarea
                id="question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Posez votre question ici..."
                className="mt-2 resize-none"
                rows={3}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {newQuestion.length}/500 caractères
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous" className="flex items-center gap-2">
                  {isAnonymous ? <UserX className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  Poser anonymement
                </Label>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !newQuestion.trim() || newQuestion.length > 500}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <RefreshCw className="animate-spin h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Onglets et filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <TabButton 
                id="recent" 
                label="Récentes" 
                icon={Clock}
                count={stats.recent}
              />
              <TabButton 
                id="answered" 
                label="Répondues" 
                icon={CheckCircle2}
                count={stats.answered}
              />
              <TabButton 
                id="unanswered" 
                label="En attente" 
                icon={MessageSquare}
                count={stats.unanswered}
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher en temps réel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                    Toutes les questions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('answered')}>
                    Questions répondues
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('unanswered')}>
                    Questions non répondues
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des questions */}
      <div className="space-y-4">
        {sortedQuestions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Aucune question trouvée' 
                  : 'Aucune question pour le moment'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all'
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Soyez le premier à poser une question !'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Activity className="h-4 w-4 animate-pulse" />
                  <span>En attente de nouvelles questions...</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {sortedQuestions.map((question, index) => (
              <QuestionCard key={question.id} question={question} index={index} />
            ))}
            <div ref={questionsEndRef} />
          </>
        )}
      </div>

      {/* Résumé des résultats filtrés */}
      {(searchTerm || filterStatus !== 'all') && sortedQuestions.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          {sortedQuestions.length} question(s) trouvée(s) sur {questions.length} au total
        </div>
      )}
    </div>
  );
}