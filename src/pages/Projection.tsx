import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PanelService } from '@/services/panelService';
import { supabase } from '@/lib/supabase';
import type { Panel, Poll } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Wifi, 
  WifiOff, 
  Clock, 
  BarChart3,
  Zap,
  ThumbsUp,
  Hash,
  Timer,
  Activity,
  Radio,
  Bell,
  RefreshCw,
  Eye,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Question {
  id: string;
  content: string;
  created_at: string;
  responses?: Array<{ content: string }>;
}

interface RealtimeStats {
  questionsCount: number;
  responsesCount: number;
  pollsCount: number;
  lastActivity: Date | null;
}

export default function Projection() {
  const { panelId } = useParams<{ panelId: string}>();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats>({
    questionsCount: 0,
    responsesCount: 0,
    pollsCount: 0,
    lastActivity: null
  });
  
  // États pour les animations temps réel
  const [newQuestionIds, setNewQuestionIds] = useState<Set<string>>(new Set());
  const [updatedQuestionIds, setUpdatedQuestionIds] = useState<Set<string>>(new Set());
  const [connectionPulse, setConnectionPulse] = useState(false);
  const [activityFlash, setActivityFlash] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Références pour le nettoyage
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  // Sons de notification (optionnel)
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkjBSiO2/LOfyMFLYrQ8+Ixe');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Could not play notification sound');
    }
  }, [soundEnabled]);

  // Nettoyage des timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  // Fonction pour ajouter un timeout avec nettoyage automatique
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      timeoutRefs.current.delete(timeout);
    }, delay);
    timeoutRefs.current.add(timeout);
    return timeout;
  }, []);

  // Animation de connexion
  const triggerConnectionPulse = useCallback(() => {
    setConnectionPulse(true);
    addTimeout(() => setConnectionPulse(false), 1000);
  }, [addTimeout]);

  // Animation d'activité
  const triggerActivityFlash = useCallback(() => {
    setActivityFlash(true);
    playNotificationSound();
    addTimeout(() => setActivityFlash(false), 2000);
  }, [addTimeout, playNotificationSound]);

  // Mise à jour de l'horloge
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPaused]);

  // Chargement initial du panel
  useEffect(() => {
    if (!panelId) return;
    
    setIsLoading(true);
    PanelService.getPanelById(panelId)
      .then(setPanel)
      .catch((err) => console.error('Error loading panel', err))
      .finally(() => setIsLoading(false));
  }, [panelId]);

  // Chargement initial des sondages
  useEffect(() => {
    if (!panelId) return;
    
    const fetchPolls = async () => {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('id, panel_id, question, created_at')
          .eq('panel_id', panelId)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setPolls(data as Poll[]);
          setRealtimeStats(prev => ({ ...prev, pollsCount: data.length }));
        }
      } catch (error) {
        console.error('Error fetching polls:', error);
      }
    };
    
    fetchPolls();
  }, [panelId]);

  // Configuration temps réel avec gestion robuste
  useEffect(() => {
    if (!panelId || isPaused) return;

    // Chargement initial des questions
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, content, created_at, responses(content)')
          .eq('panel_id', panelId)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          const questionsData = data as unknown as Question[];
          setQuestions(questionsData);
          
          const responsesCount = questionsData.reduce((sum, q) => sum + (q.responses?.length || 0), 0);
          setRealtimeStats(prev => ({
            ...prev,
            questionsCount: questionsData.length,
            responsesCount,
            lastActivity: questionsData.length > 0 ? new Date(questionsData[0].created_at) : null
          }));
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();

    // Configuration du canal temps réel
    const channel = supabase
      .channel(`panel-${panelId}-projection-enhanced`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'questions', 
          filter: `panel_id=eq.${panelId}` 
        },
        (payload) => {
          if (isPaused) return;
          
          const newQuestion = payload.new as Question;
          console.log('🆕 Nouvelle question reçue:', newQuestion);
          
          setQuestions((prev) => [newQuestion, ...prev]);
          setNewQuestionIds(prev => new Set([...prev, newQuestion.id]));
          
          // Mise à jour des stats
          setRealtimeStats(prev => ({
            ...prev,
            questionsCount: prev.questionsCount + 1,
            lastActivity: new Date()
          }));
          
          triggerActivityFlash();
          
          // Retirer l'animation après 10 secondes
          addTimeout(() => {
            setNewQuestionIds(prev => {
              const updated = new Set(prev);
              updated.delete(newQuestion.id);
              return updated;
            });
          }, 10000);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'questions', 
          filter: `panel_id=eq.${panelId}` 
        },
        (payload) => {
          if (isPaused) return;
          
          const updatedQuestion = payload.new as Question;
          console.log('🔄 Question mise à jour:', updatedQuestion);
          
          setQuestions((prev) => 
            prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
          );
          
          setUpdatedQuestionIds(prev => new Set([...prev, updatedQuestion.id]));
          setRealtimeStats(prev => ({ ...prev, lastActivity: new Date() }));
          
          // Retirer l'animation après 5 secondes
          addTimeout(() => {
            setUpdatedQuestionIds(prev => {
              const updated = new Set(prev);
              updated.delete(updatedQuestion.id);
              return updated;
            });
          }, 5000);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'questions', 
          filter: `panel_id=eq.${panelId}` 
        },
        (payload) => {
          if (isPaused) return;
          
          console.log('🗑️ Question supprimée:', payload.old);
          setQuestions((prev) => prev.filter(q => q.id !== payload.old.id));
          setRealtimeStats(prev => ({
            ...prev,
            questionsCount: Math.max(0, prev.questionsCount - 1),
            lastActivity: new Date()
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
          filter: `panel_id=eq.${panelId}`
        },
        (payload) => {
          if (isPaused) return;
          
          console.log('💬 Réponse mise à jour:', payload);
          // Recharger les questions pour avoir les réponses à jour
          fetchQuestions();
          triggerActivityFlash();
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut de connexion:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          triggerConnectionPulse();
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Nettoyage de la connexion temps réel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearAllTimeouts();
    };
  }, [panelId, isPaused, addTimeout, triggerActivityFlash, triggerConnectionPulse, clearAllTimeouts]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [clearAllTimeouts]);

  // Tri des questions par popularité
  const popularQuestions = [...questions].sort((a, b) => {
    const aCount = a.responses?.length || 0;
    const bCount = b.responses?.length || 0;
    return bCount - aCount;
  });

  const topQuestions = popularQuestions.slice(0, 8);
  const recentQuestions = [...questions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  // Fonctions utilitaires
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getQuestionAge = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h`;
  };

  const getConnectionStatusText = () => {
    if (isPaused) return 'En pause';
    return isConnected ? 'Temps réel actif' : 'Reconnexion...';
  };

  const getActivityStatus = () => {
    if (!realtimeStats.lastActivity) return 'Aucune activité';
    const diffMs = new Date().getTime() - realtimeStats.lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Activité maintenant';
    if (diffMinutes < 5) return `Dernière activité: ${diffMinutes}min`;
    return 'Inactif depuis >5min';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-blue-600 animate-spin mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800">Chargement de la projection...</h2>
          <p className="text-gray-600 mt-2">Initialisation de la connexion temps réel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* En-tête avec contrôles temps réel */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Informations du panel */}
            <div className="flex items-center gap-6">
              {panel && (
                <>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{panel.title}</h1>
                    <p className="text-gray-600 mt-1">{panel.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-base px-3 py-1 border-blue-200 text-blue-700">
                      <Radio className="h-4 w-4 mr-1" />
                      Live
                    </Badge>
                    
                    {activityFlash && (
                      <Badge className="bg-green-500 text-white animate-bounce">
                        <Zap className="h-3 w-3 mr-1" />
                        Activité !
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Panneau de contrôle temps réel */}
            <div className="flex items-center gap-6">
              
              {/* Contrôles */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                  className={isPaused ? 'border-orange-300 text-orange-700' : ''}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Statut de connexion */}
              <div className="flex items-center gap-2">
                <div className={`
                  flex items-center gap-2 px-3 py-1 rounded-full transition-all
                  ${isPaused 
                    ? 'bg-orange-100 text-orange-700' 
                    : isConnected 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }
                  ${connectionPulse ? 'scale-110' : ''}
                `}>
                  {isPaused ? (
                    <Pause className="h-4 w-4" />
                  ) : isConnected ? (
                    <Wifi className={`h-4 w-4 ${connectionPulse ? 'animate-pulse' : ''}`} />
                  ) : (
                    <WifiOff className="h-4 w-4 animate-pulse" />
                  )}
                  <span className="font-medium text-sm">{getConnectionStatusText()}</span>
                </div>
              </div>
              
              {/* Horloge et activité */}
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-gray-900">
                  {formatTime(currentTime)}
                </div>
                <div className="text-xs text-gray-600">
                  {getActivityStatus()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Métriques temps réel */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className={`border-0 shadow-lg transition-all ${activityFlash ? 'ring-2 ring-green-400 bg-green-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{panel?.panelists?.length || 0}</div>
                  <div className="text-gray-600">Panélistes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg transition-all ${activityFlash ? 'ring-2 ring-green-400 bg-green-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 rounded-xl">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{realtimeStats.questionsCount}</div>
                  <div className="text-gray-600">Questions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg transition-all ${activityFlash ? 'ring-2 ring-green-400 bg-green-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{realtimeStats.responsesCount}</div>
                  <div className="text-gray-600">Interactions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg transition-all ${activityFlash ? 'ring-2 ring-green-400 bg-green-50' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{realtimeStats.pollsCount}</div>
                  <div className="text-gray-600">Sondages</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* Questions populaires */}
          <div className="col-span-8">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                    Questions Populaires
                    <Badge variant="secondary" className="text-sm">
                      Temps réel
                    </Badge>
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-sm text-gray-600">{topQuestions.length} questions</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {topQuestions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="relative">
                      <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      {!isPaused && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin opacity-50"></div>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-500 mb-2">
                      {isPaused ? 'Projection en pause' : 'En attente de questions...'}
                    </h3>
                    <p className="text-gray-400">
                      {isPaused 
                        ? 'Cliquez sur lecture pour reprendre le temps réel' 
                        : 'Les questions du public apparaîtront ici automatiquement'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topQuestions.map((question, index) => {
                      const responseCount = question.responses?.length || 0;
                      const isNew = newQuestionIds.has(question.id);
                      const isUpdated = updatedQuestionIds.has(question.id);
                      
                      return (
                        <div
                          key={question.id}
                          className={`
                            p-6 rounded-xl border transition-all duration-500
                            ${isNew 
                              ? 'border-green-300 bg-green-50 shadow-lg shadow-green-200/50 animate-pulse' 
                              : isUpdated
                              ? 'border-blue-300 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                            }
                          `}
                        >
                          <div className="flex items-start gap-4">
                            {/* Badge de classement */}
                            <div className={`
                              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                              ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                                'bg-gradient-to-r from-blue-500 to-purple-600'}
                            `}>
                              {index + 1}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              {/* Badges de statut */}
                              <div className="flex items-center gap-2 mb-3">
                                {isNew && (
                                  <Badge className="bg-green-500 text-white">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Nouveau
                                  </Badge>
                                )}
                                {isUpdated && (
                                  <Badge className="bg-blue-500 text-white">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Mis à jour
                                  </Badge>
                                )}
                                {index < 3 && (
                                  <Badge variant="outline" className="border-purple-200 text-purple-700">
                                    Top {index + 1}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-lg font-medium text-gray-900 leading-relaxed mb-4">
                                {question.content}
                              </p>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="h-4 w-4" />
                                  <span className="font-medium">{responseCount}</span>
                                  <span>interaction{responseCount > 1 ? 's' : ''}</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Timer className="h-4 w-4" />
                                  <span>{getQuestionAge(question.created_at)}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs">
                                  <Eye className="h-3 w-3" />
                                  <span>En direct</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar avec sondages et activité récente */}
          <div className="col-span-4 space-y-6">
            
            {/* Liste des panelistes */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Panélistes
                  <Badge variant="secondary">{panel?.panelists?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {panel?.panelists?.length ? (
                  <div className="space-y-3">
                    {panel.panelists.map((panelist, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {panelist.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{panelist.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Aucun panéliste</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activité récente */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Activité Récente
                  <div className={`w-2 h-2 rounded-full ml-auto ${
                    realtimeStats.lastActivity && 
                    new Date().getTime() - realtimeStats.lastActivity.getTime() < 60000
                      ? 'bg-green-400 animate-pulse' 
                      : 'bg-gray-300'
                  }`} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentQuestions.length === 0 ? (
                  <div className="text-center py-6">
                    <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Aucune activité récente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentQuestions.map((question) => {
                      const isNew = newQuestionIds.has(question.id);
                      const isUpdated = updatedQuestionIds.has(question.id);
                      
                      return (
                        <div
                          key={question.id}
                          className={`
                            p-3 rounded-lg border transition-all duration-300
                            ${isNew 
                              ? 'border-green-200 bg-green-50 shadow-md' 
                              : isUpdated
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-gray-200 bg-gray-50'
                            }
                          `}
                        >
                          <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                            {question.content}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{getQuestionAge(question.created_at)}</span>
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>{question.responses?.length || 0}</span>
                              {(isNew || isUpdated) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques temps réel */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Stats Live
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Questions/heure</span>
                    <span className="font-bold text-green-600">
                      {Math.round((realtimeStats.questionsCount / Math.max(1, panel?.duration || 60)) * 60)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Engagement</span>
                    <Badge variant="outline" className="text-xs">
                      {realtimeStats.responsesCount > 20 ? 'Élevé' : 
                       realtimeStats.responsesCount > 10 ? 'Moyen' : 'Faible'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Dernière mise à jour</span>
                    <span className="text-xs text-gray-500">
                      {realtimeStats.lastActivity 
                        ? formatTime(realtimeStats.lastActivity)
                        : 'Aucune'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer avec indicateurs temps réel */}
        <Card className="mt-8 border-0 shadow-lg bg-white/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connexion temps réel active' : 'Connexion interrompue'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Mises à jour automatiques</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    Notifications {soundEnabled ? 'activées' : 'désactivées'}
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                Projection temps réel - Panel: {panel?.title}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}