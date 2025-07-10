import { useEffect, useState, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import { useParams } from 'react-router-dom';
import { PanelService } from '@/services/panelService';
import { supabase } from '@/lib/supabase';
import type { Panel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Users,
  User,
  TrendingUp,
  Wifi,
  WifiOff,
  Clock,
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
  VolumeX,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useRealtimeQuestions } from '@/hooks/useRealtimeQuestions';

interface Question {
  id: string;
  content: string;
  created_at: string;
  author_name?: string | null;
  author_structure?: string | null;
  panelist_name?: string | null;
  panelist_structure?: string | null;
  responses?: Array<{ content: string }>;
}

interface RealtimeStats {
  questionsCount: number;
  responsesCount: number;
  lastActivity: Date | null;
}

export default function Projection() {
  const { panelId } = useParams<{ panelId: string}>();
  const [showQRCode, setShowQRCode] = useState(false);
  const qrCodeUrl = panelId ? `${window.location.origin}/panel/${panelId}/questions` : '';
  const [panel, setPanel] = useState<Panel | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const {
    questions,
    status,
    loading: isLoading,
    newQuestionIds,
    updatedQuestionIds,
    refresh
  } = useRealtimeQuestions(!isPaused ? panelId : null);
  const isConnected = status === 'SUBSCRIBED';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats>({
    questionsCount: 0,
    responsesCount: 0,
    lastActivity: null
  });
  
  const [connectionPulse, setConnectionPulse] = useState(false);
  const [activityFlash, setActivityFlash] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  useEffect(() => {
    const responsesCount = localQuestions.reduce((sum, q) => sum + (q.responses?.length || 0), 0);
    setRealtimeStats({
      questionsCount: localQuestions.length,
      responsesCount,
      lastActivity: new Date()
    });
  }, [localQuestions]);
  
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

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

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      timeoutRefs.current.delete(timeout);
    }, delay);
    timeoutRefs.current.add(timeout);
    return timeout;
  }, []);

  const triggerConnectionPulse = useCallback(() => {
    setConnectionPulse(true);
    addTimeout(() => setConnectionPulse(false), 1000);
  }, [addTimeout]);

  const triggerActivityFlash = useCallback(() => {
    setActivityFlash(true);
    playNotificationSound();
    addTimeout(() => setActivityFlash(false), 2000);
  }, [addTimeout, playNotificationSound]);

  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (!panelId) return;
    PanelService.getPanelById(panelId).then(setPanel);
  }, [panelId]);

  useEffect(() => {
    if (!panelId || isPaused) return;

    const channel = supabase
      .channel(`panel-${panelId}-projection-responses`)
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

          setLocalQuestions(prev => {
            const updated = [...prev];
            const response = payload.new as { question_id: string; content: string };
            const idx = updated.findIndex(q => q.id === response.question_id);
            if (idx >= 0) {
              const q = { ...updated[idx] };
              q.responses = q.responses || [];
              q.responses.push({ content: response.content });
              updated[idx] = q;
            }
            return updated;
          });
          triggerActivityFlash();
        }
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          triggerConnectionPulse();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [panelId, isPaused, triggerActivityFlash, triggerConnectionPulse]);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  const [topQuestions, setTopQuestions] = useState<Question[]>([]);

  useEffect(() => {
    console.log('🔄 Recalcul des questions populaires');
    const popularQuestions = [...localQuestions].sort((a, b) => {
      const aCount = a.responses?.length || 0;
      const bCount = b.responses?.length || 0;
      return bCount - aCount;
    });
    const newTopQuestions = popularQuestions.slice(0, 8);
    console.log('🏆 Nouvelles questions populaires:', newTopQuestions.map(q => ({
      id: q.id,
      content: q.content.substring(0, 20) + '...',
      responses: q.responses?.length
    })));
    setTopQuestions(newTopQuestions);
  }, [localQuestions]);

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
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Chargement de la projection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      {/* En-tête avec contrôles temps réel */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Informations du panel */}
            <div className="flex items-center gap-6">
              {panel && (
                <>
                  <img
                    src="/images/logoministere.png"
                    alt="Logo Ministère"
                    className="h-10 object-contain"
                  />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{panel.title}</h1>
                    <p className="text-gray-600 mt-1">{panel.description}</p>
                  </div>
                </>
              )}
            </div>
            
            {/* Panneau de contrôle temps réel */}
            <div className="flex items-center gap-6">
              
              {/* Statut de connexion */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/ivoiretech.png"
                    alt="Logo IvoireTech"
                    className="h-8 ml-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Métriques temps réel */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={Users}
            value={panel?.panelists?.length || 0}
            label="Panélistes"
            color="#0c54a4"
            gradient="linear-gradient(135deg, #0c54a4, #046eb6)"
          />

          <StatCard 
            icon={MessageSquare}
            value={realtimeStats.questionsCount}
            label="Questions"
            color="#45b9bc"
            gradient="linear-gradient(135deg, #45b9bc, #19b3d2)"
          />

          <StatCard 
            icon={Activity}
            value={realtimeStats.responsesCount}
            label="Interactions"
            color="#84c282"
            gradient="linear-gradient(135deg, #84c282, #5cbcb4)"
          />

          <StatCard 
            icon={TrendingUp}
            value={Math.round((realtimeStats.questionsCount / Math.max(1, panel?.duration || 60)) * 60)}
            label="Questions/heure"
            color="#19b3d2"
            gradient="linear-gradient(135deg, #19b3d2, #5cbcb4)"
          />
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* Questions populaires */}
          <div className="col-span-8">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="h-6 w-6" style={{ color: '#19b3d2' }} />
                    Questions Populaires
                    <Badge className="text-white" style={{ background: 'linear-gradient(135deg, #0c54a4, #046eb6)' }}>
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
                                  <Badge className="text-white" style={{ background: 'linear-gradient(135deg, #84c282, #5cbcb4)' }}>
                                    <Zap className="h-3 w-3 mr-1" />
                                    Nouveau
                                  </Badge>
                                )}
                                {isUpdated && (
                                  <Badge className="text-white" style={{ background: 'linear-gradient(135deg, #0c54a4, #046eb6)' }}>
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
                              
                              <p className="text-lg font-medium text-gray-900 leading-relaxed">
                                {question.content}
                              </p>
                              <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
                                {question.panelist_name && (
                                  <span className="bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                                    <User className="h-3 w-3 text-blue-600" />
                                    <span>
                                      Pour: {question.panelist_name}
                                      {question.panelist_structure && ` (${question.panelist_structure})`}
                                    </span>
                                  </span>
                                )}
                                {question.author_name && (
                                  <span className="bg-gray-50 px-2 py-1 rounded flex items-center gap-1">
                                    <User className="h-3 w-3 text-gray-600" />
                                    <span>
                                      Par: {question.author_name}
                                      {question.author_structure && ` (${question.author_structure})`}
                                    </span>
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-600">
                                
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
                  <Users className="h-5 w-5" style={{ color: '#0c54a4' }} />
                  Panélistes
                  <Badge className="text-white" style={{ background: 'linear-gradient(135deg, #0c54a4, #046eb6)' }}>
                    {panel?.panelists?.length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {panel?.panelists?.length ? (
                  <div className="space-y-3">
                    {panel.panelists.map((panelist, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg" 
                           style={{ background: 'linear-gradient(135deg, rgba(12,84,164,0.05), rgba(4,110,182,0.05))' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                             style={{ background: 'linear-gradient(135deg, #0c54a4, #046eb6)' }}>
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

            {/* Bouton QR Code */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" style={{ color: '#0c54a4' }} />
                  Accès questionnaire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowQRCode(true)}
                >
                  Afficher le QR Code
                </Button>
              </CardContent>
            </Card>

            {/* Modal QR Code - Plein écran */}
            {showQRCode && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
                <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] p-8 flex flex-col">
                  <div className="absolute top-8 right-8 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const qrCode = document.getElementById('qr-code-download');
                        if (qrCode) {
                          const canvas = document.createElement('canvas');
                          canvas.width = qrCode.clientWidth;
                          canvas.height = qrCode.clientHeight;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            // Capture le QR Code et le logo ensemble
                            if (qrCode instanceof HTMLElement) {
                              import('html2canvas').then(({ default: html2canvas }) => {
                                return html2canvas(qrCode);
                              }).then(canvas => {
                                const pngFile = canvas.toDataURL('image/png');
                                const downloadLink = document.createElement('a');
                                downloadLink.download = `QR-Code-${panel?.title || 'Panel'}.png`;
                                downloadLink.href = pngFile;
                                downloadLink.click();
                              }).catch(error => {
                                console.error('Erreur lors de la capture du QR Code:', error);
                                // Fallback simple si html2canvas échoue
                                const svg = qrCode.querySelector('svg');
                                if (svg) {
                                  const svgData = new XMLSerializer().serializeToString(svg);
                                  const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                                  const url = URL.createObjectURL(svgBlob);
                                  const downloadLink = document.createElement('a');
                                  downloadLink.download = `QR-Code-${panel?.title || 'Panel'}.svg`;
                                  downloadLink.href = url;
                                  downloadLink.click();
                                  URL.revokeObjectURL(url);
                                }
                              });
                            }
                          }
                        }
                      }}
                      className="p-3 rounded-full hover:bg-gray-100 z-10"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </Button>
                    <button
                      onClick={() => setShowQRCode(false)}
                      className="p-3 rounded-full hover:bg-gray-100 z-10"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center gap-8">
                    <img
                      src="/images/ivoiretech.png"
                      alt="Logo IvoireTech"
                      className="h-16 mx-auto"
                    />
                    
                    <div className="flex-1 flex items-center justify-center w-full">
                      <div className="p-8 bg-white rounded-2xl shadow-2xl">
                        <div id="qr-code-download" className="relative">
                          <QRCode
                            value={qrCodeUrl}
                            size={512}
                            level="H"
                            fgColor="#0c54a4"
                            bgColor="#ffffff"
                            className="mx-auto"
                          />
                          <img
                            src="/images/ivoiretech.png"
                            alt="Logo IvoireTech"
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-24 w-24"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl text-gray-200 text-center max-w-2xl">
                      Scannez ce QR Code avec votre appareil mobile pour accéder au questionnaire
                    </h3>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowQRCode(false)}
                      className="mt-8 px-8 py-4 text-xl bg-white hover:bg-gray-50"
                      size="lg"
                    >
                      Fermer la vue QR Code
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Statistiques temps réel */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" style={{ color: '#19b3d2' }} />
                  Stats Live
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Questions/heure</span>
                    <span className="font-bold" style={{ color: '#19b3d2' }}>
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
                  <Bell className="h-4 w-4" style={{ color: '#0c54a4' }} />
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

// Composant StatCard réutilisé depuis la première vue
const StatCard = ({ 
  icon: Icon, 
  value, 
  label, 
  color, 
  gradient 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  value: number; 
  label: string; 
  color: string;
  gradient: string;
}) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
       style={{ background: gradient }}>
    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" 
         style={{ background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.2), transparent)' }}></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-8 w-8 opacity-90" />
        <div className="text-3xl font-bold animate-pulse">{value}</div>
      </div>
      <div className="text-sm opacity-90 font-medium">{label}</div>
    </div>
  </div>
);