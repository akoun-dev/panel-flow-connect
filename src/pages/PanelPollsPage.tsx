import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { PanelService } from '@/services/panelService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Share2, 
  Copy, 
  Trash2,
  BarChart3,
  Calendar,
  Users,
  Filter,
  Eye,
  Download,
  Settings,
  TrendingUp,
  PieChart,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  RefreshCw,
  Award,
  Clock,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import PollsQRCode from '@/components/polls/PollsQRCode';
import { PollCreator } from '@/components/polls/PollCreator';
import { PollEditor } from '@/components/polls/PollEditor';
import type { Poll, Panel } from '@/types';

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface ExtendedPoll extends Poll {
  total_votes: number;
  unique_voters: number;
  options: PollOption[];
  status?: 'active' | 'draft' | 'closed';
  participation_rate: number;
  winner_option?: PollOption;
  engagement_score: number;
}

type SortField = 'created_at' | 'total_votes' | 'unique_voters' | 'question';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list' | 'compact';
type FilterStatus = 'all' | 'active' | 'draft' | 'closed';

export default function PanelPollsPage() {
  const { panelId } = useParams<{ panelId: string }>();
  const { toast } = useToast();
  
  // États principaux
  const [polls, setPolls] = useState<ExtendedPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États de filtrage et tri
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // États d'interaction
  const [selectedPolls, setSelectedPolls] = useState<Set<string>>(new Set());
  const [expandedPoll, setExpandedPoll] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<ExtendedPoll | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const { user } = useUser();
  const canManagePolls = useMemo(
    () =>
      !!(
        panel &&
        user &&
        (panel.user_id === user.id ||
          panel.moderator_email?.toLowerCase() === user.email?.toLowerCase())
      ),
    [panel, user]
  );

  // Mémoisation des sondages filtrés et triés
  const filteredAndSortedPolls = useMemo(() => {
    let filtered = polls.filter(poll => {
      const matchesSearch = poll.question.toLowerCase().includes(searchTerm.toLowerCase());
      const pollStatus = poll.status || 'active';
      const matchesStatus = filterStatus === 'all' || pollStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [polls, searchTerm, sortField, sortOrder, filterStatus]);

  // Statistiques globales mémorisées
  const globalStats = useMemo(() => {
    const total = polls.length;
    const totalVotes = polls.reduce((sum, poll) => sum + poll.total_votes, 0);
    const totalParticipants = polls.reduce((sum, poll) => sum + poll.unique_voters, 0);
    const averageVotes = total > 0 ? Math.round(totalVotes / total) : 0;
    const mostPopular = polls.reduce((max, poll) => 
      poll.total_votes > (max?.total_votes || 0) ? poll : max, null);
    
    return {
      total,
      totalVotes,
      totalParticipants,
      averageVotes,
      mostPopular,
      active: polls.filter(p => (p.status || 'active') === 'active').length,
      draft: polls.filter(p => (p.status || 'active') === 'draft').length,
      closed: polls.filter(p => (p.status || 'active') === 'closed').length,
    };
  }, [polls]);

  // Fonction optimisée de récupération des données
  const fetchPolls = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    
    try {
      // Requête corrigée pour récupérer les sondages et leurs votes
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(`
          id, 
          panel_id, 
          question, 
          created_at,
          poll_options (
            id,
            text,
            poll_votes (
              id,
              user_id
            )
          )
        `)
        .eq('panel_id', panelId)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      // Traitement des données côté client
      const pollsWithStats: ExtendedPoll[] = (pollsData || []).map(poll => {
        const options: PollOption[] = (poll.poll_options || []).map(option => ({
          id: option.id,
          text: option.text,
          vote_count: option.poll_votes?.length || 0
        }));

        const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);
        
        // Calculer les votants uniques
        const allVotes = poll.poll_options?.flatMap(opt => opt.poll_votes || []) || [];
        const uniqueVoters = new Set(allVotes.map(v => v.user_id)).size;
        
        const winnerOption = options.length > 0 
          ? options.reduce((max, opt) => opt.vote_count > (max?.vote_count || 0) ? opt : max, options[0])
          : undefined;
        
        const engagementScore = totalVotes > 0 ? 
          Math.round((uniqueVoters / totalVotes) * 100) : 0;

        return {
          ...poll,
          options,
          total_votes: totalVotes,
          unique_voters: uniqueVoters,
          status: 'active' as const, // Status par défaut puisque la colonne n'existe pas en DB
          winner_option: winnerOption && winnerOption.vote_count > 0 ? winnerOption : undefined,
          engagement_score: engagementScore,
          participation_rate: Math.round((uniqueVoters / 100) * 100)
        };
      });
      
      setPolls(pollsWithStats);
    } catch (err) {
      setError('Erreur lors du chargement des sondages');
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sondages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [panelId, toast]);

  useEffect(() => {
    if (!panelId) return;
    PanelService.getPanelById(panelId)
      .then(setPanel)
      .catch(() => setPanel(null));
  }, [panelId]);

  useEffect(() => {
    if (panelId) {
      fetchPolls();
    }
  }, [panelId, fetchPolls]);

  // Handlers d'actions
  const handleCopyLink = useCallback(async (pollId: string) => {
    try {
      const url = `${window.location.origin}/poll/${pollId}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: "Lien copié",
        description: "Le lien du sondage a été copié dans le presse-papiers",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSharePoll = useCallback(
    async (poll: ExtendedPoll) => {
      const url = `${window.location.origin}/poll/${poll.id}`;
      if (navigator.share) {
        try {
          await navigator.share({ url });
          return;
        } catch (err) {
          // ignore and fallback to clipboard
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Lien copié",
          description:
            "Le lien du sondage a été copié dans le presse-papiers",
        });
      } catch (err) {
        toast({
          title: "Erreur",
          description: "Impossible de partager le lien du sondage",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleExportPoll = useCallback(
    (poll: ExtendedPoll) => {
      toast({
        title: "Export", 
        description: `Export du sondage "${poll.question}" en cours...`,
      });
    },
    [toast]
  );

  const handleBulkAction = (action: string) => {
    if (selectedPolls.size === 0) return;
    
    toast({
      title: "Action en cours",
      description: `${action} en cours pour ${selectedPolls.size} sondage(s)`,
    });
  };

  const togglePollSelection = (pollId: string) => {
    const newSelected = new Set(selectedPolls);
    if (newSelected.has(pollId)) {
      newSelected.delete(pollId);
    } else {
      newSelected.add(pollId);
    }
    setSelectedPolls(newSelected);
  };

  const handlePollCreated = useCallback(() => {
    setCreateDialogOpen(false);
    fetchPolls();
  }, [fetchPolls]);

  // Composants utilitaires
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'draft': return 'bg-yellow-500 text-white';
      case 'closed': return 'bg-gray-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculatePercentage = (votes: number, total: number) => {
    return total > 0 ? Math.round((votes / total) * 100) : 0;
  };

  // Composants de rendu
  const PollResults = ({ poll }: { poll: ExtendedPoll }) => {
    const maxVotes = Math.max(...poll.options.map(o => o.vote_count));
    
    return (
        <div className="space-y-4 px-4 py-4">
            {poll.options.map(option => {
                const percentage = calculatePercentage(
                    option.vote_count,
                    poll.total_votes
                )
                const isWinning = option.vote_count === maxVotes && maxVotes > 0

                return (
                    <div
                        key={option.id}
                        className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                            isWinning
                                ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200"
                                : "bg-gray-50 border-gray-200"
                        }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span
                                className={`font-medium ${
                                    isWinning
                                        ? "text-green-800"
                                        : "text-gray-700"
                                }`}
                            >
                                {option.text}
                                {isWinning && (
                                    <Award className="inline ml-2 h-4 w-4 text-yellow-500" />
                                )}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                    {option.vote_count} vote
                                    {option.vote_count > 1 ? "s" : ""}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {percentage}%
                                </Badge>
                            </div>
                        </div>
                        <Progress
                            value={percentage}
                            className={`h-2 transition-all duration-300 ${
                                isWinning ? "bg-green-100" : ""
                            }`}
                        />
                    </div>
                )
            })}

            {poll.total_votes === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <PieChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun vote pour le moment</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Partagez ce sondage pour commencer
                    </p>
                </div>
            )}
        </div>
    )
  };

  const PollStats = ({ poll }: { poll: ExtendedPoll }) => (
    <div className="grid grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
      <div className="text-center">
        <div className="text-xl font-bold text-blue-600">{poll.total_votes}</div>
        <div className="text-xs text-gray-500">Votes</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-green-600">{poll.unique_voters}</div>
        <div className="text-xs text-gray-500">Participants</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-purple-600">{poll.options.length}</div>
        <div className="text-xs text-gray-500">Options</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-orange-600">{poll.engagement_score}%</div>
        <div className="text-xs text-gray-500">Engagement</div>
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!panelId) return null;
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">{error}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => fetchPolls()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {canManagePolls && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un sondage</DialogTitle>
            </DialogHeader>
            <PollCreator panelId={panelId} onCreated={handlePollCreated} />
          </DialogContent>
        </Dialog>
      )}
      {canManagePolls && (
        <Dialog open={!!editingPoll} onOpenChange={(o) => { if (!o) setEditingPoll(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifier le sondage</DialogTitle>
            </DialogHeader>
            {editingPoll && (
              <PollEditor poll={editingPoll} onSaved={() => { setEditingPoll(null); fetchPolls(); }} />
            )}
          </DialogContent>
        </Dialog>
      )}
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* En-tête avec statistiques globales */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tableau de bord des sondages
          </h1>
          <p className="text-gray-600">
            Gérez et analysez vos sondages en temps réel
          </p>
        </div>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{globalStats.total}</p>
                <p className="text-sm text-gray-600">Sondages total</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{globalStats.totalVotes}</p>
                <p className="text-sm text-gray-600">Votes collectés</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <PollsQRCode panelId={panelId} url={window.location.origin} />
      </div>

      {!canManagePolls && (
        <p className="text-center text-sm text-gray-500">
          Vous ne pouvez pas gérer les sondages de ce panel.
        </p>
      )}

      {/* Barre d'outils */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un sondage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="draft">Brouillons</SelectItem>
              <SelectItem value="closed">Fermés</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Trier
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortField('created_at')}>
                <Calendar className="h-4 w-4 mr-2" />
                Date de création
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField('total_votes')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Nombre de votes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortField('unique_voters')}>
                <Users className="h-4 w-4 mr-2" />
                Participants
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? <SortDesc className="h-4 w-4 mr-2" /> : <SortAsc className="h-4 w-4 mr-2" />}
                {sortOrder === 'asc' ? 'Décroissant' : 'Croissant'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchPolls(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          {canManagePolls && selectedPolls.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions ({selectedPolls.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter la sélection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {canManagePolls && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau sondage
            </Button>
          )}
        </div>
      </div>

      {/* Liste des sondages */}
      {filteredAndSortedPolls.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'Aucun résultat' : 'Commencez votre premier sondage'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Modifiez vos critères de recherche ou créez un nouveau sondage'
                  : 'Créez des sondages interactifs et collectez des réponses en temps réel'
                }
              </p>
              <div className="flex gap-3 justify-center">
                {(searchTerm || filterStatus !== 'all') && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
                {canManagePolls && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un sondage
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 
          viewMode === 'compact' ? 'grid-cols-1' : 'grid-cols-1'
        }`}>
          {filteredAndSortedPolls.map((poll) => (
            <Card 
              key={poll.id} 
              className={`transition-all duration-200 hover:shadow-xl border-l-4 ${
                selectedPolls.has(poll.id) ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-200'
              } ${viewMode === 'compact' ? 'hover:shadow-md' : 'hover:shadow-lg'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={getStatusColor(poll.status || 'active')}>
                        {poll.status || 'active'}
                      </Badge>
                      <span className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(poll.created_at)}
                      </span>
                      {poll.total_votes > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Zap className="h-3 w-3 mr-1" />
                          En cours
                        </Badge>
                      )}
                      {poll.winner_option && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          <Award className="h-3 w-3 mr-1" />
                          Leader: {poll.winner_option.text.substring(0, 15)}...
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg leading-tight mb-2 hover:text-blue-600 transition-colors cursor-pointer">
                      {poll.question}
                    </CardTitle>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canManagePolls && (
                      <input
                        type="checkbox"
                        checked={selectedPolls.has(poll.id)}
                        onChange={() => togglePollSelection(poll.id)}
                        className="rounded border-gray-300"
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink(poll.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copier le lien
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSharePoll(poll)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Partager
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPoll(poll)}>
                          <Download className="h-4 w-4 mr-2" />
                          Exporter les résultats
                        </DropdownMenuItem>
                        {canManagePolls && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Settings className="h-4 w-4 mr-2" />
                              Paramètres
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {viewMode !== 'compact' && (
                  <>
                    <PollStats poll={poll} />
                    
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>

                      
                      <div className={viewMode === 'list' ? 'lg:col-span-2' : ''}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Résultats temps réel
                          </h4>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Détails
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle className="text-xl">{poll.question}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6">
                                <PollStats poll={poll} />
                                <div className="grid lg:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className="font-semibold mb-3">Résultats détaillés</h4>
                                    <PollResults poll={poll} />
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <PollResults poll={poll} />
                      </div>
                    </div>
                  </>
                )}

                {viewMode === 'compact' && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{poll.total_votes}</span> votes
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{poll.unique_voters}</span> participants
                      </div>
                      {poll.winner_option && (
                        <div className="text-sm text-green-600">
                          <Award className="h-3 w-3 inline mr-1" />
                          {poll.winner_option.text}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setExpandedPoll(expandedPoll === poll.id ? null : poll.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {expandedPoll === poll.id && viewMode === 'compact' && (
                  <div className="border-t pt-4 mt-4">
                    <PollStats poll={poll} />
                    <div className="mt-4">
                      <PollResults poll={poll} />
                    </div>
                  </div>
                )}
                
                {viewMode !== 'compact' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleSharePoll(poll)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Partager
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPoll(poll)}>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                    {canManagePolls && (
                      <Button variant="outline" size="sm" onClick={() => setEditingPoll(poll)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
}