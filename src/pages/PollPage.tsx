import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Share2, 
  Copy, 
  Download,
  Users,
  TrendingUp,
  Clock,
  QrCode,
  ChevronLeft,
  Zap,
  Award,
  Globe,
  Smartphone,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Eye,
  ExternalLink,
  RefreshCw,
  Lock,
  UserCheck,
  Vote,
  Shield
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import PollQRCode from '@/components/polls/PollQRCode';
import { PollViewer } from '@/components/polls/PollViewer';

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  created_at: string;
  panel_id: string;
  options: PollOption[];
  total_votes: number;
  unique_voters: number;
  status: 'active' | 'draft' | 'closed';
  winner_option?: PollOption;
}

interface PollStats {
  hourlyVotes: { hour: string; votes: number }[];
  recentVotes: number;
  peakHour: string;
  engagementRate: number;
}

interface UserVoteStatus {
  hasVoted: boolean;
  votedOption?: PollOption;
  voteTime?: string;
}

export default function PollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [stats, setStats] = useState<PollStats | null>(null);
  const [userVoteStatus, setUserVoteStatus] = useState<UserVoteStatus>({ hasVoted: false });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');

  // Générer un identifiant unique pour l'appareil/utilisateur
  const generateDeviceId = useCallback(() => {
    const stored = localStorage.getItem('poll_device_id');
    if (stored) return stored;
    
    const newId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('poll_device_id', newId);
    return newId;
  }, []);

  // Vérifier si l'utilisateur a déjà voté
  const checkUserVoteStatus = useCallback(async (pollId: string, userId: string) => {
    try {
      const { data: existingVote, error } = await supabase
        .from('poll_votes')
        .select(`
          id,
          created_at,
          poll_options (
            id,
            text
          )
        `)
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking vote status:', error);
        return { hasVoted: false };
      }

      if (existingVote) {
        return {
          hasVoted: true,
          votedOption: existingVote.poll_options,
          voteTime: existingVote.created_at
        };
      }

      return { hasVoted: false };
    } catch (err) {
      console.error('Error checking vote status:', err);
      return { hasVoted: false };
    }
  }, []);

  const fetchPollData = useCallback(async (showRefresh = false) => {
    if (!pollId) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Obtenir l'utilisateur actuel ou générer un ID d'appareil
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id;
      
      if (!userId) {
        // Utiliser un ID d'appareil pour les utilisateurs non connectés
        userId = generateDeviceId();
        setDeviceId(userId);
      }
      
      setCurrentUser(user);

      // Vérifier si l'utilisateur a déjà voté
      const voteStatus = await checkUserVoteStatus(pollId, userId);
      setUserVoteStatus(voteStatus);

      // Récupérer les données du sondage
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select(`
          id,
          question,
          created_at,
          panel_id,
          poll_options (
            id,
            text
          )
        `)
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      // Récupérer les votes avec détails
      const { data: votesData, error: votesError } = await supabase
        .from('poll_votes')
        .select(`
          id,
          option_id,
          user_id,
          created_at,
          poll_options (
            id,
            text
          )
        `)
        .eq('poll_id', pollId);

      if (votesError) throw votesError;

      // Traitement des données
      const optionsWithVotes: PollOption[] = pollData.poll_options.map(option => ({
        ...option,
        vote_count: votesData?.filter(vote => vote.option_id === option.id).length || 0
      }));

      const totalVotes = votesData?.length || 0;
      const uniqueVoters = new Set(votesData?.map(vote => vote.user_id)).size;
      const winnerOption = optionsWithVotes.reduce((max, option) => 
        option.vote_count > (max?.vote_count || 0) ? option : max, null);

      // Calculer les statistiques
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentVotes = votesData?.filter(vote => 
        new Date(vote.created_at) > last24Hours
      ).length || 0;

      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStart = new Date(hour.setMinutes(0, 0, 0));
        const hourEnd = new Date(hour.setMinutes(59, 59, 999));
        
        const votesInHour = votesData?.filter(vote => {
          const voteTime = new Date(vote.created_at);
          return voteTime >= hourStart && voteTime <= hourEnd;
        }).length || 0;

        return {
          hour: hour.toLocaleTimeString('fr-FR', { hour: '2-digit' }),
          votes: votesInHour
        };
      }).reverse();

      const peakHour = hourlyData.reduce((max, curr) => 
        curr.votes > max.votes ? curr : max
      );

      const engagementRate = totalVotes > 0 ? Math.round((uniqueVoters / totalVotes) * 100) : 0;

      setPoll({
        ...pollData,
        options: optionsWithVotes,
        total_votes: totalVotes,
        unique_voters: uniqueVoters,
        status: 'active',
        winner_option: winnerOption
      });

      setStats({
        hourlyVotes: hourlyData,
        recentVotes,
        peakHour: peakHour.hour,
        engagementRate
      });

    } catch (err) {
      setError('Impossible de charger le sondage');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [pollId, generateDeviceId, checkUserVoteStatus]);

  useEffect(() => {
    fetchPollData();
  }, [fetchPollData]);

  const handleVoteCompleted = useCallback(async (optionId: string) => {
    // Rafraîchir les données après un vote
    await fetchPollData(true);
    
    toast({
      title: "Vote enregistré !",
      description: "Merci pour votre participation. Vous ne pouvez voter qu'une seule fois.",
    });
  }, [fetchPollData, toast]);

  const handleShare = useCallback(async (method: 'link' | 'qr' | 'social') => {
    const url = window.location.href;
    
    switch (method) {
      case 'link':
        await navigator.clipboard.writeText(url);
        toast({
          title: "Lien copié",
          description: "Le lien du sondage a été copié dans le presse-papiers",
        });
        break;
      case 'qr':
        setShowQRCode(true);
        break;
      case 'social':
        if (navigator.share) {
          await navigator.share({
            title: poll?.question,
            text: "Participez à ce sondage",
            url: url
          });
        } else {
          await navigator.clipboard.writeText(url);
          toast({
            title: "Lien copié",
            description: "Partagez ce lien pour inviter des participants",
          });
        }
        break;
    }
  }, [poll?.question, toast]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { 
          color: 'bg-green-500 text-white', 
          icon: <Zap className="h-3 w-3" />,
          text: 'En cours'
        };
      case 'draft':
        return { 
          color: 'bg-yellow-500 text-white', 
          icon: <Clock className="h-3 w-3" />,
          text: 'Brouillon'
        };
      case 'closed':
        return { 
          color: 'bg-gray-500 text-white', 
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Terminé'
        };
      default:
        return { 
          color: 'bg-blue-500 text-white', 
          icon: <BarChart3 className="h-3 w-3" />,
          text: 'Actif'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!pollId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sondage introuvable</h3>
              <p className="text-gray-500 mb-4">L'identifiant du sondage est manquant ou invalide.</p>
              <Button onClick={() => navigate('/')}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button onClick={() => fetchPollData()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(poll.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header avec navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            
            <div className="flex items-center gap-3">
              <Badge className={statusInfo.color}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.text}</span>
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchPollData(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* En-tête du sondage */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Sondage public</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {poll.question}
            </h1>
            
            <p className="text-gray-600 max-w-2xl mx-auto">
              Créé le {formatDate(poll.created_at)} • Partagez ce sondage pour collecter plus de réponses
            </p>
          </div>

          {/* Statistiques en temps réel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{poll.total_votes}</div>
                <div className="text-xs text-gray-600">Votes totaux</div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{poll.unique_voters}</div>
                <div className="text-xs text-gray-600">Participants</div>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats?.recentVotes || 0}</div>
                <div className="text-xs text-gray-600">Votes 24h</div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-orange-600">{stats?.engagementRate || 0}%</div>
                <div className="text-xs text-gray-600">Engagement</div>
              </CardContent>
            </Card>
          </div>

          {/* Section principale avec sondage et partage */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Sondage principal */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {userVoteStatus.hasVoted ? 'Votre vote a été enregistré' : 'Participez au sondage'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {userVoteStatus.hasVoted && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Vous avez voté
                        </Badge>
                      )}
                      {poll?.winner_option && (
                        <Badge variant="outline" className="text-purple-600 border-purple-600">
                          <Award className="h-3 w-3 mr-1" />
                          Leader: {poll.winner_option.text}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {userVoteStatus.hasVoted ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="font-medium text-green-800">Vote enregistré avec succès</span>
                        </div>
                        <p className="text-green-700 text-sm">
                          Vous avez voté pour : <strong>{userVoteStatus.votedOption?.text}</strong>
                        </p>
                        {userVoteStatus.voteTime && (
                          <p className="text-green-600 text-xs mt-1">
                            Le {new Date(userVoteStatus.voteTime).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Shield className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="font-medium text-blue-800">Un vote par personne</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Pour garantir l'équité, chaque personne ne peut voter qu'une seule fois. 
                          Vous pouvez toujours consulter les résultats en temps réel ci-dessous.
                        </p>
                      </div>

                      <div className="pt-4">
                        <h4 className="font-medium text-gray-800 mb-3">Résultats actuels :</h4>
                        <div className="space-y-3">
                          {poll?.options.map((option) => {
                            const percentage = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;
                            const isUserChoice = option.id === userVoteStatus.votedOption?.id;
                            const isWinning = poll.winner_option?.id === option.id;
                            
                            return (
                              <div 
                                key={option.id}
                                className={`p-3 rounded-lg border transition-all duration-300 ${
                                  isUserChoice ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-200' :
                                  isWinning ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' : 
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`font-medium ${
                                    isUserChoice ? 'text-blue-800' :
                                    isWinning ? 'text-green-800' : 'text-gray-700'
                                  }`}>
                                    {option.text}
                                    {isUserChoice && <Vote className="inline ml-2 h-4 w-4 text-blue-500" />}
                                    {isWinning && <Award className="inline ml-2 h-4 w-4 text-yellow-500" />}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                      {option.vote_count} vote{option.vote_count > 1 ? 's' : ''}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                      {percentage}%
                                    </Badge>
                                  </div>
                                </div>
                                <Progress 
                                  value={percentage} 
                                  className={`h-2 transition-all duration-500 ${
                                    isUserChoice ? 'bg-blue-100' :
                                    isWinning ? 'bg-green-100' : ''
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Lock className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="font-medium text-blue-800">Vote unique et sécurisé</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Chaque personne ne peut voter qu'une seule fois pour garantir la fiabilité des résultats.
                        </p>
                      </div>
                      <PollViewer pollId={pollId} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Panel de partage et QR Code */}
            <div className="space-y-6">
              
              {/* QR Code */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <QrCode className="h-5 w-5 mr-2" />
                    Partage rapide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <PollQRCode pollId={pollId} size={200} url={window.location.origin} />
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Scannez ce QR code avec votre smartphone pour participer
                  </p>
                </CardContent>
              </Card>

              {/* Options de partage */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <Share2 className="h-5 w-5 mr-2" />
                    Partager ce sondage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => handleShare('link')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier le lien
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleShare('social')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Partager sur les réseaux
                  </Button>
                  
                  <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Smartphone className="h-4 w-4 mr-2" />
                        QR Code mobile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>QR Code de partage</DialogTitle>
                      </DialogHeader>
                      <div className="text-center space-y-4">
                        <div className="bg-white p-6 rounded-lg border mx-auto inline-block">
                          <PollQRCode pollId={pollId} size={250} url={window.location.origin} />
                        </div>
                        <p className="text-sm text-gray-600">
                          Partagez ce QR code pour permettre un accès rapide au sondage
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            // Logique pour télécharger le QR code
                            toast({
                              title: "QR Code téléchargé",
                              description: "Le QR code a été sauvegardé",
                            });
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger le QR Code
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Statistiques détaillées */}
              {stats && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Activité récente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Heure de pic</span>
                        <span className="font-medium">{stats.peakHour}h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Taux d'engagement</span>
                        <span className="font-medium">{stats.engagementRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Votes dernières 24h</span>
                        <span className="font-medium">{stats.recentVotes}</span>
                      </div>
                      {userVoteStatus.hasVoted && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Votre statut</span>
                          <span className="font-medium text-green-600 flex items-center">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Participé
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500 mb-2">Activité horaire</div>
                      <div className="grid grid-cols-6 gap-1">
                        {stats.hourlyVotes.slice(-12).map((hour, index) => (
                          <div key={index} className="text-center">
                            <div 
                              className="bg-blue-200 rounded-sm mb-1 transition-all duration-300"
                              style={{ 
                                height: `${Math.max(4, (hour.votes / Math.max(...stats.hourlyVotes.map(h => h.votes), 1)) * 20)}px` 
                              }}
                            />
                            <div className="text-xs text-gray-400">{hour.hour}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!userVoteStatus.hasVoted && (
                      <div className="pt-2 border-t">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center text-sm">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                            <span className="text-yellow-800">
                              Vous n'avez pas encore participé à ce sondage
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Résultats détaillés */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Résultats en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {poll.options.map((option, index) => {
                  const percentage = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;
                  const isWinning = poll.winner_option?.id === option.id;
                  
                  return (
                    <div 
                      key={option.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        isWinning ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className={`font-medium ${isWinning ? 'text-green-800' : 'text-gray-700'}`}>
                          {option.text}
                          {isWinning && <Award className="inline ml-2 h-4 w-4 text-yellow-500" />}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            {option.vote_count} vote{option.vote_count > 1 ? 's' : ''}
                          </span>
                          <Badge variant="secondary" className="text-sm min-w-[50px]">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-3 transition-all duration-500 ${isWinning ? 'bg-green-100' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
              
              {poll.total_votes === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Soyez le premier à voter !</h3>
                  <p className="text-sm">Ce sondage attend vos réponses pour révéler les tendances</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}