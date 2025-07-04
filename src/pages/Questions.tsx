import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { LucideIcon } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Panel, Panelist } from '../types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface basée EXACTEMENT sur votre schéma
interface Question {
  id: string;
  content: string;
  panel_id: string;
  panelist_email?: string | null;
  // author_name?: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  created_at: string;
}

export default function Questions({ panel }: { panel?: Panel }) {
  const { user } = useUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [selectedPanelistEmail, setSelectedPanelistEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'answered' | 'unanswered'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [newQuestionCount, setNewQuestionCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const questionsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      panel?.panelists &&
      (panel.panelists as Panelist[]).length > 0 &&
      !selectedPanelistEmail
    ) {
      setSelectedPanelistEmail((panel.panelists as Panelist[])[0].email);
    }
  }, [panel, selectedPanelistEmail]);

  // Charger les questions initiales et configurer REALTIME
  useEffect(() => {
    if (!panel?.id) {
      setHasError(true);
      setErrorMessage('Panel ID not found');
      setIsLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        logger.debug('Fetching questions for panel:', panel.id);
        
        // Initial fetch
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('panel_id', panel.id)
          .order('created_at', { ascending: false });

        logger.debug('Questions response:', { data, error });

        if (error) throw error;

        const questions = data || [];
        setQuestions(questions);
        setIsConnected(true);

      } catch (error) {
        console.error('Error:', error);
        toast.error(`Erreur: ${error.message}`);
        setIsConnected(false);
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
          logger.debug('New question:', payload.new);
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
          logger.debug('Question updated:', payload.new);
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
          logger.debug('Question deleted:', payload.old);
          setQuestions(prev => prev.filter(q => q.id !== payload.old.id));
          toast.error('Une question a été supprimée');
        }
      )
      .subscribe((status) => {
        logger.debug('Questions subscription status:', status);
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
  }, [panel?.id, user?.id]);

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
    logger.debug('Submit triggered', { newQuestion, panel });
    
    if (!newQuestion.trim()) {
      logger.debug('Validation failed: empty question');
      toast.error('Veuillez saisir une question');
      return;
    }

    if (newQuestion.length > 500) {
      logger.debug('Validation failed: question too long');
      toast.error('La question ne doit pas dépasser 500 caractères');
      return;
    }

    if (!isAnonymous && !authorName.trim()) {
      toast.error('Veuillez renseigner votre nom');
      return;
    }

    if (!panel?.id) {
      console.error('Panel ID missing:', panel);
      toast.error('Erreur: Panel non défini');
      return;
    }

    setIsSubmitting(true);
    try {
      logger.debug('Submitting question to Supabase:', {
        content: newQuestion.trim(),
        panel_id: panel.id,
        is_anonymous: true,
        length: newQuestion.length
      });

      const { data, error } = await supabase
        .from('questions')
        .insert({
          content: newQuestion.trim(),
          panel_id: panel.id,
          is_anonymous: isAnonymous,
          is_answered: false,
          panelist_email: selectedPanelistEmail || null,
          // author_name: isAnonymous ? null : authorName.trim()
        })
        .select()
        .single();

      logger.debug('Supabase response:', { data, error, status: error?.code });

      if (error) {
        console.error('Supabase error:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      logger.debug('Question submitted successfully:', data);
      setNewQuestion('');
      setAuthorName('');
      toast.success('Question envoyée avec succès! 🚀');
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error(`Erreur lors de l'envoi de la question: ${error.message}`);
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
    icon: LucideIcon;
    count?: number;
  }) => (
    <Button
      variant={activeTab === id ? 'default' : 'outline'}
      size="sm"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 min-w-0 ${
        activeTab === id ? 'bg-blue-600 text-white' : ''
      }`}
    >
      <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="hidden xs:inline sm:inline">{label}</span>
      <span className="xs:hidden sm:hidden">{label.charAt(0)}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs min-w-[20px] h-4 px-1">
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
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Indicateur de statut - Mobile: horizontal, Desktop: vertical */}
            <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2 min-w-0 sm:min-w-[60px]">
              <div className="flex items-center gap-2 sm:flex-col sm:gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(question.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short'
                    })}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(question.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Menu actions - visible sur mobile */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
            </div>


            {/* Contenu de la question */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {question.is_answered && (
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      <span className="hidden xs:inline">Répondue</span>
                      <span className="xs:hidden">✓</span>
                    </Badge>
                  )}
                  
                  {isRecent && (
                    <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      <span className="hidden xs:inline">Nouvelle</span>
                      <span className="xs:hidden">New</span>
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    {question.is_anonymous ? (
                      <>
                        <UserX className="h-3 w-3" />
                        <span className="hidden xs:inline">Anonyme</span>
                        <span className="xs:hidden">Anon</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span className="hidden xs:inline">Identifié</span>
                        <span className="xs:hidden">ID</span>
                      </>
                    )}
                  </Badge>
                </div>

                {/* Menu actions - caché sur mobile, visible sur desktop */}
                <div className="hidden sm:block">
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
              </div>

              <p className="text-gray-800 text-sm sm:text-base leading-relaxed mb-3 break-words">
                {question.content}
              </p>

              {/* {!question.is_anonymous && question.author_name && (
                <p className="text-xs text-gray-500 mb-2">Par {question.author_name}</p>
              )} */}

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
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
                    className="h-6 px-2 text-xs whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <span className="hidden xs:inline">Marquer répondue</span>
                    <span className="xs:hidden">Répondue</span>
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
      <div className="max-w-6xl mx-auto p-3 sm:p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base text-center">Connexion en temps réel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Indicateur de connexion */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs sm:text-sm text-gray-600">
            {isConnected ? 'Temps réel actif' : 'Connexion interrompue'}
          </span>
          {newQuestionCount > 0 && (
            <Badge variant="default" className="bg-green-100 text-green-700 animate-pulse text-xs">
              +{newQuestionCount} nouvelle(s)
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {newQuestionCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={scrollToBottom}
              className="animate-bounce text-xs"
            >
              <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Voir les nouvelles</span>
            </Button>
          )}
          
          {/* Bouton de rechargement manuel */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsLoading(true);
              window.location.reload();
            }}
            title="Recharger les questions"
            className="px-2 sm:px-3"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* En-tête avec statistiques */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 flex-wrap">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <span>Questions</span>
            <Badge variant="outline" className="text-xs sm:text-sm">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base truncate">{panel?.title || 'Panel non défini'}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full lg:w-auto lg:min-w-[300px]">
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.answered}</div>
            <div className="text-xs text-gray-500">Répondues</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.unanswered}</div>
            <div className="text-xs text-gray-500">En attente</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.recent}</div>
            <div className="text-xs text-gray-500">Récentes</div>
          </div>
        </div>
      </div>

      {/* Formulaire de nouvelle question */}
      <Card className="border-2 border-dashed border-blue-200 hover:border-blue-300 transition-colors">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Poser une question</span>
            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Temps réel
            </Badge>
          </CardTitle>
          <CardDescription className="text-sm">
            Votre question apparaîtra instantanément à tous les participants
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="question" className="text-sm sm:text-base">Votre question</Label>
              <Textarea
                id="question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Posez votre question ici..."
                className="mt-2 resize-none text-sm sm:text-base"
                rows={3}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {newQuestion.length}/500 caractères
              </div>
            </div>

            {panel?.panelists && (panel.panelists as Panelist[]).length > 0 && (
              <div>
                <Label htmlFor="panelist" className="text-sm sm:text-base">Paneliste</Label>
                <Select
                  value={selectedPanelistEmail}
                  onValueChange={setSelectedPanelistEmail}
                >
                  <SelectTrigger id="panelist" className="mt-2">
                    <SelectValue placeholder="Choisir un paneliste" />
                  </SelectTrigger>
                  <SelectContent>
                    {(panel.panelists as Panelist[]).map((p: Panelist) => (
                      <SelectItem key={p.email} value={p.email}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isAnonymous && (
              <div>
                <Label htmlFor="authorName" className="text-sm sm:text-base">Votre nom</Label>
                <Input
                  id="authorName"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
            )}

            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 xs:gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous" className="flex items-center gap-2 text-sm cursor-pointer">
                  {isAnonymous ? <UserX className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  Poser anonymement
                </Label>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="submit-question-btn"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 w-full xs:w-auto"
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
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Onglets */}
            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1">
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

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher en temps réel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Filtrer</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
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
      <div className="space-y-3 sm:space-y-4">
        {sortedQuestions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 sm:py-12 px-4">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Aucune question trouvée' 
                  : 'Aucune question pour le moment'
                }
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
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
        <div className="text-center text-xs sm:text-sm text-gray-500 px-4">
          {sortedQuestions.length} question(s) trouvée(s) sur {questions.length} au total
        </div>
      )}
    </div>
  );
};