import { useState, useEffect, useDebugValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/lib/supabase"
import { logger } from "@/lib/logger"
import { useUser } from "@/hooks/useUser"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter,
  Activity,
  User,
  UserX,
  Reply,
  Eye,
  RefreshCw,
  BarChart3,
  Sparkles,
  MessageCircle,
  TrendingUp,
  Calendar,
  Users,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Share2,
  Bookmark,
  ThumbsUp,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panelist, Poll } from "@/types";
import { PollCreator } from '@/components/polls/PollCreator';
import { PollViewer } from '@/components/polls/PollViewer';

interface Question {
  id: string;
  content: string;
  created_at: string;
  is_anonymous?: boolean;
  panelist_email?: string | null;
  author_name?: string | null;
  responses: Array<{content: string; created_at?: string}>;
  is_answered: boolean;
}

export default function UserPanelQuestions() {
  const [searchParams] = useSearchParams();
  const panelId = searchParams.get('panel');
  
  // Debug logs
  useEffect(() => {
    console.log('UserPanelQuestions component mounted with panelId:', panelId);
  }, [panelId]);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected');
  const [panelTitle, setPanelTitle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'answered'>('recent');
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [panelistFilter, setPanelistFilter] = useState<string>('all');
  const [panelOwnerId, setPanelOwnerId] = useState<string>('');
  const [moderatorEmail, setModeratorEmail] = useState<string>('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const { user } = useUser();
  const isPanelAdmin =
    !!user && (user.id === panelOwnerId || user.email === moderatorEmail);
  
  useEffect(() => {
    const fetchPanelTitle = async () => {
      if (!panelId) return;
      const { data } = await supabase
        .from('panels')
        .select('title, description, created_at, panelists, user_id, moderator_email')
        .eq('id', panelId)
        .single();
      setPanelTitle(data?.title || '');
      setPanelists((data?.panelists as Panelist[]) || []);
      setPanelOwnerId(data?.user_id || '');
      setModeratorEmail(data?.moderator_email || '');
    };
    const fetchPolls = async () => {
      if (!panelId) return;
      const { data, error } = await supabase
        .from('polls')
        .select('id, panel_id, question, created_at')
        .eq('panel_id', panelId)
        .order('created_at', { ascending: false });
      if (!error && data) setPolls(data as Poll[]);
    };
    fetchPanelTitle();
    fetchPolls();
  }, [panelId]);

  const { data: questions = [], isLoading, error, refetch } = useQuery<Question[]>({
    queryKey: ['panel-questions', panelId],
    queryFn: async () => {
      if (!panelId) return [];
      
      const { data, error } = await supabase
        .from('questions')
        .select('*, responses(content, created_at)')
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
      .channel(`questions:${panelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `panel_id=eq.${panelId}`
        },
        () => {
          logger.debug('Changement détecté, déclenchement re-fetch...');
          refetch();
        }
      )
      .subscribe((status, err) => {
        logger.debug('Statut abonnement:', status);
        setRealtimeStatus(status);
        if (err) {
          console.error('Erreur abonnement:', err);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [panelId, refetch]);

  const handleToggleAnswered = async (q: Question) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_answered: !q.is_answered })
        .eq('id', q.id);
      
      if (error) throw error;
      refetch();
    } catch (err) {
      logger.error('Failed to update question', err);
    }
  };

  // Filtrage et tri des questions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.responses?.some(r => r.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'answered' && question.is_answered) ||
      (filterStatus === 'unanswered' && !question.is_answered);
    const matchesPanelist = panelistFilter === 'all' || question.panelist_email === panelistFilter;
    return matchesSearch && matchesFilter && matchesPanelist;
  });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'answered':
        if (a.is_answered && !b.is_answered) return -1;
        if (!a.is_answered && b.is_answered) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  // Statistiques avancées
  const getAdvancedStats = () => {
    const total = questions.length;
    const answered = questions.filter(q => q.is_answered).length;
    const unanswered = total - answered;
    const withResponses = questions.filter(q => q.responses && q.responses.length > 0).length;
    const anonymous = questions.filter(q => q.is_anonymous).length;
    const recent24h = questions.filter(q => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(q.created_at) > dayAgo;
    }).length;
    const responseRate = total > 0 ? Math.round((answered / total) * 100) : 0;
    
    return { total, answered, unanswered, withResponses, anonymous, recent24h, responseRate };
  };

  const stats = getAdvancedStats();

  const StatCard = ({ icon: Icon, label, value, color, subtitle }: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color: string;
    subtitle?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <Icon className={`h-8 w-8 ${color.replace('text-', 'text-').replace('-600', '-400')} opacity-80`} />
        </div>
      </CardContent>
    </Card>
  );

  const QuestionCard = ({ question, index }: { question: Question; index: number }) => {
    const isRecent = new Date(Date.now() - 30 * 60 * 1000) < new Date(question.created_at); // 30 min
    const hasResponse = question.responses && question.responses.length > 0;
    const responseTime = hasResponse && question.responses[0].created_at ? 
      new Date(question.responses[0].created_at).getTime() - new Date(question.created_at).getTime() : null;

    if (viewMode === 'compact') {
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${
                question.is_answered ? 'bg-green-500' : 'bg-orange-400'
              }`} />
              <span className="text-sm text-gray-500">
                {new Date(question.created_at).toLocaleDateString('fr-FR')}
              </span>
              {isRecent && <Badge variant="secondary" className="text-xs">Nouveau</Badge>}
            </div>
            <p className="text-sm text-gray-900 truncate">{question.content}</p>
            {!question.is_anonymous && question.author_name && (
              <p className="text-xs text-gray-500 truncate">par {question.author_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasResponse && (
              <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                Répondu
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className={`group ${
          isRecent ? 'ring-2 ring-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50' : ''
        }`}
      >
        <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Timeline indicator */}
              <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2 min-w-0 sm:min-w-[60px]">
                <div className="flex items-center gap-2 sm:flex-col sm:gap-2">
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

                {/* Actions mobiles */}
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Share2 className="h-4 w-4 mr-2" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Marquer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header badges */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    {question.is_answered && (
                      <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Répondue
                      </Badge>
                    )}
                    
                    {isRecent && (
                      <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 text-xs animate-pulse">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Nouveau
                      </Badge>
                    )}
                    
                    {question.is_anonymous !== false && (
                      <Badge variant="outline" className="text-xs">
                        <UserX className="h-3 w-3 mr-1" />
                        Anonyme
                      </Badge>
                    )}

                    {hasResponse && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              <Reply className="h-3 w-3 mr-1" />
                              Réponse
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {responseTime && (
                              <p>Répondu en {Math.round(responseTime / (1000 * 60))} min</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Desktop actions */}
                  <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Partager</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Marquer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Question content */}
                <div className="mb-4">
                  <p className="text-gray-800 text-sm sm:text-base leading-relaxed break-words">
                    {question.content}
                  </p>
                  {!question.is_anonymous && question.author_name && (
                    <p className="text-xs text-gray-500 mt-1">par {question.author_name}</p>
                  )}
                </div>

                {/* Response */}
                {hasResponse && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 relative"
                  >
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-r-lg p-4 relative overflow-hidden">
                      {/* Decorative element */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full opacity-20 -mr-10 -mt-10"></div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <Reply className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-green-800">Réponse officielle</span>
                            {question.responses[0].created_at && (
                              <div className="text-xs text-green-600">
                                {new Date(question.responses[0].created_at).toLocaleString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative z-10">
                        <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                          {question.responses[0].content}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
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
                    
                    {responseTime && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Zap className="h-3 w-3" />
                        <span>Répondu en {Math.round(responseTime / (1000 * 60))}min</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasResponse && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-600">
                        <Eye className="h-3 w-3 mr-1" />
                        Voir détails
                      </Button>
                    )}
                    {user?.email === question.panelist_email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleToggleAnswered(question)}
                        data-testid="toggle-answered-btn"
                      >
                        {question.is_answered ? 'Marquer non répondue' : 'Marquer répondue'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 text-sm sm:text-base">Synchronisation en temps réel...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      <Card className="border-red-200">
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Erreur de connexion</h3>
          <p className="text-red-600 mb-4">Impossible de charger les questions du panel</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="text-red-600 border-red-300">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  useEffect(() => {
    if (panelId) {
      console.log('Rendering UserPanelQuestions - isPanelAdmin:', isPanelAdmin, 'panelId:', panelId);
      if (isPanelAdmin) {
        console.log('Admin view - Rendering PollCreator');
      }
    }
  }, [isPanelAdmin, panelId]);

  if (!panelId) return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      <Card className="border-yellow-200">
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-700 mb-2">Panel requis</h3>
          <p className="text-yellow-600">Veuillez sélectionner un panel pour voir les questions</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header avec status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            realtimeStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600">
            {realtimeStatus === 'SUBSCRIBED' ? 'Synchronisé en temps réel' : 'Hors ligne'}
          </span>
          <Badge variant="outline" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Exporter en PDF</DropdownMenuItem>
              <DropdownMenuItem>Exporter en CSV</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Partager le lien</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border"
      >
        <MessageCircle className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Questions du Panel
        </h1>
        {panelTitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 mb-4"
          >
            {panelTitle}
          </motion.p>
        )}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}</span>
          <span>•</span>
          <span>{stats.total} questions au total</span>
        </div>
      </motion.div>

      {/* Stats Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <StatCard
          icon={MessageSquare}
          label="Total Questions"
          value={stats.total}
          color="text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Répondues"
          value={stats.answered}
          color="text-green-600"
          subtitle={`${stats.responseRate}% taux`}
        />
        <StatCard
          icon={Clock}
          label="En attente"
          value={stats.unanswered}
          color="text-orange-600"
        />
        <StatCard
          icon={Reply}
          label="Avec réponses"
          value={stats.withResponses}
          color="text-purple-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Récentes 24h"
          value={stats.recent24h}
          color="text-indigo-600"
        />
        <StatCard
          icon={UserX}
          label="Anonymes"
          value={stats.anonymous}
          color="text-gray-600"
        />
      </motion.div>

      {isPanelAdmin && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Créer un sondage</CardTitle>
            </CardHeader>
            <CardContent>
              <PollCreator panelId={panelId!} onCreated={() => {
                // reload polls
                supabase
                  .from('polls')
                  .select('id, panel_id, question, created_at')
                  .eq('panel_id', panelId!)
                  .order('created_at', { ascending: false })
                  .then(({ data, error }) => {
                    if (!error && data) setPolls(data as Poll[]);
                  });
              }} />
            </CardContent>
          </Card>

          {polls.length > 0 && (
            <div className="mt-6 space-y-4">
              {polls.map((p) => (
                <Card key={p.id}>
                  <CardContent>
                    <PollViewer pollId={p.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher dans les questions et réponses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
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

              {panelists.length > 0 && (
                <Select
                  value={panelistFilter}
                  onValueChange={setPanelistFilter}
                >
                  <SelectTrigger className="w-32" data-testid="panelist-filter">
                    <SelectValue placeholder="Paneliste" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {panelists.map((p) => (
                      <SelectItem key={p.email} value={p.email}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {sortBy === 'recent' && <ArrowDown className="h-4 w-4 mr-2" />}
                      {sortBy === 'oldest' && <ArrowUp className="h-4 w-4 mr-2" />}
                      {sortBy === 'answered' && <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Trier
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy('recent')}>
                      Plus récentes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                      Plus anciennes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('answered')}>
                      Répondues en premier
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'card' ? 'compact' : 'card')}
                >
                  {viewMode === 'card' ? 'Vue compacte' : 'Vue détaillée'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Questions List */}
      <div className={`space-y-${viewMode === 'card' ? '4' : '2'}`}>
        <AnimatePresence mode="wait">
          {sortedQuestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card>
                <CardContent className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Aucun résultat trouvé' 
                      : 'Aucune question pour ce panel'
                    }
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Essayez de modifier vos critères de recherche ou vos filtres'
                      : 'Les questions apparaîtront ici dès qu\'elles seront posées par les participants'}
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                      <Activity className="h-4 w-4 animate-pulse" />
                      <span>En attente de nouvelles questions...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 sm:space-y-4"
            >
              {sortedQuestions.map((question, index) => (
                <QuestionCard key={question.id} question={question} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results summary */}
      {(searchTerm || filterStatus !== 'all') && sortedQuestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-500 py-4"
        >
          <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full">
            <Target className="h-4 w-4" />
            {sortedQuestions.length} question(s) trouvée(s) sur {questions.length} au total
          </div>
        </motion.div>
      )}
    </div>
  );
}