import React from 'react';
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import PanelInvitationService from "@/services/PanelInvitationService";
import { PanelService } from "@/services/panelService";
import type { Panel } from "@/types/panel";
import { PanelQRCode } from "@/components/panels/PanelQRCode";
import { useUser } from "../../hooks/useUser";
import { 
  Calendar, Users, Clock, MessageSquare, MoreHorizontal, Play, Edit, Trash2, 
  Eye, Mail, Filter, X, Plus, Search, Grid, List, SortAsc, Star, Settings, 
  BarChart3, RefreshCw, Save, AlertCircle, CheckCircle, Copy, Share2, 
  Download, Archive, Zap, TrendingUp, Award, Shield
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InvitePanelistsModal } from "@/components/panels/InvitePanelistsModal";

const statusConfig = {
  draft: { 
    label: "Brouillon", 
    color: "bg-slate-100 text-slate-700 border-slate-200",
    dotColor: "bg-slate-400"
  },
  scheduled: { 
    label: "Programmé", 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500"
  },
  live: { 
    label: "En cours", 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500"
  },
  completed: { 
    label: "Terminé", 
    color: "bg-purple-100 text-purple-700 border-purple-200",
    dotColor: "bg-purple-500"
  },
  cancelled: { 
    label: "Annulé", 
    color: "bg-red-100 text-red-700 border-red-200",
    dotColor: "bg-red-500"
  }
};

type ViewMode = 'grid' | 'list' | 'table';
type SortBy = 'date' | 'title' | 'participants' | 'questions' | 'status';

interface PanelFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  participants_limit: number;
  category: string;
  user_id: string;
  panelists: Array<{
    name: string;
    email: string;
    title: string;
    topic: string;
    duration: number;
  }>;
}

export function UserPanels() {
  const { user } = useUser();
  const [hasOwnPanel, setHasOwnPanel] = useState(false);
  
  // États principaux
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États de filtrage et tri
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // États de modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // États des modals
  const [inviteModal, setInviteModal] = useState<{open: boolean; panel: Panel | null}>({open: false, panel: null});
  const [managePanelModal, setManagePanelModal] = useState<{
    open: boolean;
    panel: Panel | null;
    mode: 'view' | 'edit';
  }>({ open: false, panel: null, mode: 'view' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    panelId: string | null;
    panelTitle: string;
  }>({ open: false, panelId: null, panelTitle: "" });
  
  // États utilisateur
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  }>({});
  
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set());
  
  // Formulaire de panel
  const [panelForm, setPanelForm] = useState<PanelFormData>({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: 60,
    participants_limit: 30,
    category: "Technologie",
    user_id: user?.id || "",
    panelists: [{
      name: "",
      email: "",
      title: "",
      topic: "",
      duration: 15
    }]
  });

  // Surveillance des changements non sauvegardés
  const originalFormRef = React.useRef<PanelFormData | null>(null);

  const checkForUnsavedChanges = useCallback(() => {
    if (!originalFormRef.current) return false;
    return JSON.stringify(panelForm) !== JSON.stringify(originalFormRef.current);
  }, [panelForm]);

  useEffect(() => {
    setHasUnsavedChanges(checkForUnsavedChanges());
  }, [checkForUnsavedChanges]);

  useEffect(() => {
    if (!user?.id) return;
    PanelService.hasOwnPanel(user.id, user.email).then(setHasOwnPanel).catch(() => setHasOwnPanel(false));
  }, [user]);

  // Notifications en temps réel
  useEffect(() => {
    const handleInvitationSent = (e: CustomEvent<{
      panel_id: string;
      panelist_email: string;
      status: 'sent' | 'failed';
    }>) => {
      const { panelist_email, status } = e.detail;
      
      if (status === 'sent') {
        toast.success(`Invitation envoyée à ${panelist_email}`);
      } else {
        toast.error(`Échec d'envoi à ${panelist_email}`);
      }
    };

    document.addEventListener('invitationSent', handleInvitationSent as EventListener);
    
    return () => {
      document.removeEventListener('invitationSent', handleInvitationSent as EventListener);
    };
  }, []);

  // Charger le profil utilisateur
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error("Failed to load user profile", error);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  // Charger les panels avec refresh intelligent
  const loadPanels = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    
    try {
      const data = await PanelService.getPanels(user.id);
      setPanels(data);
    } catch (error) {
      setError("Impossible de charger les panels");
      console.error("Failed to load panels", error);
      toast.error("Erreur lors du chargement des panels");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  // Obtenir les catégories uniques
  const uniqueCategories = useMemo(() => 
    [...new Set(panels.map(panel => panel.category).filter(Boolean))],
    [panels]
  );

  // Filtrage et tri optimisés
  const filteredAndSortedPanels = useMemo(() => {
    return panels
      .filter(panel => {
        if (!panel) return false;
        
        const matchesStatus = filter === "all" || panel.status === filter;
        const matchesSearch = panel.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             panel.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "all" || panel.category === categoryFilter;
        
        let matchesDate = true;
        if (dateFilter !== "all") {
          const panelDate = new Date(panel.date);
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          const nextMonth = new Date(today);
          nextMonth.setMonth(today.getMonth() + 1);
          
          switch (dateFilter) {
            case "today":
              matchesDate = panelDate.toDateString() === today.toDateString();
              break;
            case "tomorrow":
              matchesDate = panelDate.toDateString() === tomorrow.toDateString();
              break;
            case "this_week":
              matchesDate = panelDate >= today && panelDate <= nextWeek;
              break;
            case "this_month":
              matchesDate = panelDate >= today && panelDate <= nextMonth;
              break;
            case "past":
              matchesDate = panelDate < today;
              break;
          }
        }
        
        return matchesStatus && matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'participants':
            return (b.participants?.registered || 0) - (a.participants?.registered || 0);
          case 'questions':
            return (b.questions || 0) - (a.questions || 0);
          case 'status':
            return a.status.localeCompare(b.status);
          case 'date':
          default:
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
      });
  }, [panels, filter, searchTerm, categoryFilter, dateFilter, sortBy]);

  // Statistiques calculées
  const panelStats = useMemo(() => {
    const total = panels.length;
    const byStatus = {
      live: panels.filter(p => p.status === "live").length,
      scheduled: panels.filter(p => p.status === "scheduled").length,
      completed: panels.filter(p => p.status === "completed").length,
      draft: panels.filter(p => p.status === "draft").length,
    };
    const totalQuestions = panels.reduce((sum, p) => sum + (p.questions || 0), 0);
    const totalParticipants = panels.reduce((sum, p) => sum + (p.participants?.registered || 0), 0);
    
    return {
      total,
      byStatus,
      totalQuestions,
      totalParticipants,
      averageQuestions: total > 0 ? Math.round(totalQuestions / total) : 0,
    };
  }, [panels]);

  // Fonctions utilitaires
  const getParticipationRate = (registered?: number, limit?: number) => {
    if (!registered || !limit) return 0;
    return Math.round((registered / limit) * 100);
  };

  const getPriorityBadge = (panel: Panel) => {
    const rate = getParticipationRate(panel.participants?.registered, panel.participants?.limit);
    if (rate >= 80) return { label: "Populaire", color: "bg-green-100 text-green-700", icon: TrendingUp };
    if ((panel.questions || 0) >= 10) return { label: "Actif", color: "bg-blue-100 text-blue-700", icon: Zap };
    if (panel.status === 'live') return { label: "En direct", color: "bg-red-100 text-red-700", icon: Award };
    return null;
  };

  // Gestion du formulaire
  const resetForm = useCallback(() => {
    const emptyForm: PanelFormData = {
      title: "",
      description: "",
      date: "",
      time: "",
      duration: 60,
      participants_limit: 30,
      category: "Technologie",
      user_id: user?.id || "",
      panelists: [{ name: "", email: "", title: "", topic: "", duration: 15 }]
    };
    setPanelForm(emptyForm);
    originalFormRef.current = { ...emptyForm };
    setHasUnsavedChanges(false);
    setEditingPanelId(null);
  }, [user?.id]);

  const handleFormChange = useCallback((field: keyof PanelFormData, value: string | number | boolean) => {
    setPanelForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Gestion des panélistes
  const handlePanelistChange = useCallback((
    index: number,
    field: 'name' | 'email' | 'title' | 'topic' | 'duration',
    value: string | number
  ) => {
    setPanelForm(prev => ({
      ...prev,
      panelists: prev.panelists.map((panelist, i) => 
        i === index ? { ...panelist, [field]: value } : panelist
      )
    }));
  }, []);

  const addPanelist = useCallback(() => {
    setPanelForm(prev => ({
      ...prev,
      panelists: [...prev.panelists, { name: "", email: "", title: "", topic: "", duration: 15 }]
    }));
  }, []);

  const removePanelist = useCallback((index: number) => {
    if (panelForm.panelists.length > 1) {
      setPanelForm(prev => ({
        ...prev,
        panelists: prev.panelists.filter((_, i) => i !== index)
      }));
    }
  }, [panelForm.panelists.length]);

  // Actions principales
  const handleNewPanel = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const handleEditPanel = useCallback(async (panel: Panel) => {
    logger.debug("Editing panel:", panel);
    
    try {
      setIsLoading(true);
      const { data: fullPanelData, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', panel.id)
        .single();

      if (error) throw error;

      const formData: PanelFormData = {
        title: fullPanelData.title || "",
        description: fullPanelData.description || "",
        date: fullPanelData.date || "",
        time: fullPanelData.time || "",
        duration: fullPanelData.duration || 60,
        participants_limit: fullPanelData.participants_limit || 30,
        category: fullPanelData.category || "Technologie",
        user_id: user?.id || "",
        panelists: fullPanelData.panelists && fullPanelData.panelists.length > 0 
          ? fullPanelData.panelists 
          : [{ name: "", email: "", title: "", topic: "", duration: 15 }]
      };

      setPanelForm(formData);
      originalFormRef.current = { ...formData };
      setEditingPanelId(panel.id);
      setManagePanelModal({ open: false, panel: null, mode: 'view' });
      setIsModalOpen(true);

    } catch (error) {
      console.error("Error loading panel data for editing:", error);
      toast.error("Erreur lors du chargement des données du panel");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      toast.error("Utilisateur non connecté");
      return;
    }

    // Validation
    if (!panelForm.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    if (!panelForm.date) {
      toast.error("La date est requise");
      return;
    }

    if (!panelForm.time) {
      toast.error("L'heure est requise");
      return;
    }

    setIsSubmitting(true);

    try {
      const moderatorName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Modérateur';
      const moderatorEmail = userProfile.email || user.email || '';

      const panelData = {
        title: panelForm.title,
        description: panelForm.description,
        date: panelForm.date,
        time: panelForm.time,
        duration: panelForm.duration,
        participants_limit: panelForm.participants_limit,
        category: panelForm.category,
        user_id: user.id,
        moderator_name: moderatorName,
        moderator_email: moderatorEmail,
        tags: [],
        panelists: panelForm.panelists.filter(p => p.name && p.email)
      };

      if (editingPanelId) {
        const updatedPanel = await PanelService.updatePanel(editingPanelId, panelData);
        setPanels(prev => prev.map(p => p.id === editingPanelId ? updatedPanel : p));
        toast.success("Panel mis à jour avec succès!");
      } else {
        const createdPanel = await PanelService.createPanel(panelData);
        setPanels(prev => [createdPanel, ...prev]);
        toast.success("Panel créé avec succès!");
      }
      
      setIsModalOpen(false);
      resetForm();
      
    } catch (error) {
      console.error("Error saving panel:", error);
      toast.error(editingPanelId ? "Erreur lors de la mise à jour" : "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  }, [user, userProfile, panelForm, editingPanelId, resetForm]);

  const handleCloseModal = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm("Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?");
      if (!confirmClose) return;
    }
    
    setIsModalOpen(false);
    resetForm();
  }, [hasUnsavedChanges, resetForm]);

  // Actions sur les panels
  const handleManagePanel = useCallback((panel: Panel) => {
    setManagePanelModal({ open: true, panel, mode: 'view' });
  }, []);

  const handleDeletePanel = useCallback((panel: Panel) => {
    setDeleteConfirmation({
      open: true,
      panelId: panel.id,
      panelTitle: panel.title
    });
    setManagePanelModal({ open: false, panel: null, mode: 'view' });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmation.panelId) return;
    
    try {
      await PanelService.deletePanel(deleteConfirmation.panelId);
      setPanels(prev => prev.filter(p => p.id !== deleteConfirmation.panelId));
      setDeleteConfirmation({ open: false, panelId: null, panelTitle: "" });
      toast.success("Panel supprimé avec succès");
    } catch (error) {
      console.error("Failed to delete panel", error);
      toast.error("Erreur lors de la suppression du panel");
    }
  }, [deleteConfirmation.panelId]);

  const handleInvitePanelists = useCallback((panel: Panel) => {
    setInviteModal({ open: true, panel });
  }, []);

  const updatePanelStatus = useCallback(async (
    panelId: string, 
    newStatus: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled'
  ) => {
    try {
      await PanelService.changePanelStatus(panelId, newStatus);
      const updatedPanel = await PanelService.getPanelById(panelId);
      setPanels(prev => prev.map(p => p.id === panelId ? updatedPanel : p));
      
      if (managePanelModal.panel?.id === panelId) {
        setManagePanelModal(prev => ({
          ...prev,
          panel: { ...prev.panel!, status: newStatus }
        }));
      }
      toast.success("Statut du panel mis à jour");
    } catch (error) {
      console.error("Error updating panel status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  }, [managePanelModal.panel?.id]);

  // Actions groupées
  const handleBulkAction = useCallback((action: 'delete' | 'archive' | 'export') => {
    if (selectedPanels.size === 0) return;
    
    switch (action) {
      case 'export':
        toast.success(`Export en cours pour ${selectedPanels.size} panel(s)`);
        break;
      case 'archive':
        toast.success(`Archivage en cours pour ${selectedPanels.size} panel(s)`);
        break;
      case 'delete':
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedPanels.size} panel(s) ?`)) {
          toast.success(`Suppression en cours pour ${selectedPanels.size} panel(s)`);
        }
        break;
    }
    setSelectedPanels(new Set());
  }, [selectedPanels]);

  const togglePanelSelection = useCallback((panelId: string) => {
    setSelectedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  }, []);

  // Filtres
  const clearFilters = useCallback(() => {
    setFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
    setSearchTerm("");
    setSelectedPanels(new Set());
  }, []);

  // Composants
  const StatusFilter = ({
    status,
    count,
    isActive,
    onClick
  }: {
    status: keyof typeof statusConfig | 'all'
    count: number
    isActive: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200
        ${isActive 
          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }
      `}
    >
      <div className={`w-2 h-2 rounded-full ${statusConfig[status]?.dotColor || 'bg-gray-400'}`} />
      <span className="font-medium">{statusConfig[status]?.label || 'Tous'}</span>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </button>
  );

  const PanelCard = ({ panel }: { panel: Panel }) => {
    const statusInfo = statusConfig[panel.status as keyof typeof statusConfig];
    const participationRate = getParticipationRate(panel.participants?.registered, panel.participants?.limit);
    const priority = getPriorityBadge(panel);
    const isSelected = selectedPanels.has(panel.id);

    return (
      <Card className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-1 ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => togglePanelSelection(panel.id)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={statusInfo?.color}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo?.dotColor}`} />
                    {statusInfo?.label}
                  </Badge>
                  {priority && (
                    <Badge variant="outline" className={priority.color}>
                      <priority.icon className="w-3 h-3 mr-1" />
                      {priority.label}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {panel.title}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {panel.description}
                </CardDescription>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleEditPanel(panel)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleManagePanel(panel)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleInvitePanelists(panel)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Inviter
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.origin + `/panel/${panel.id}`)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le lien
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("Partage en cours...")}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => handleDeletePanel(panel)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Métriques principales */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <Calendar className="h-3 w-3" />
                </div>
                <div className="text-sm font-medium">
                  {new Date(panel.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="text-xs text-gray-500">{panel.time}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <Users className="h-3 w-3" />
                </div>
                <div className="text-sm font-medium">{panel.panelists?.length || 0}</div>
                <div className="text-xs text-gray-500">Panélistes</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <MessageSquare className="h-3 w-3" />
                </div>
                <div className="text-sm font-medium">{panel.questions || 0}</div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
            </div>

            {/* Barre de progression pour la participation */}
            {panel.participants?.limit && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Participation</span>
                  <span>{panel.participants.registered || 0}/{panel.participants.limit}</span>
                </div>
                <Progress 
                  value={participationRate} 
                  className="h-2"
                  // className={`h-2 ${participationRate >= 80 ? 'bg-green-100' : participationRate >= 50 ? 'bg-yellow-100' : 'bg-gray-100'}`}
                />
              </div>
            )}

            {/* Tags */}
            {panel.tags && panel.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {panel.tags.slice(0, 3).map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                    {tag}
                  </Badge>
                ))}
                {panel.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    +{panel.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleManagePanel(panel)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Gérer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditPanel(panel)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // États de chargement
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );

  if (isLoading && panels.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 w-full">
        <div className="w-full max-w-none p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 w-full flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Erreur de chargement</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={() => loadPanels()} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasOwnPanel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Accès interdit
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 w-full">
      <div className="w-full max-w-none p-6 space-y-6">
        {/* En-tête avec statistiques */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mes Panels
            </h1>
            <p className="text-gray-600">
              Gérez et organisez vos sessions de discussion
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {panelStats.total} panels total
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {panelStats.totalQuestions} questions
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {panelStats.totalParticipants} participants
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => loadPanels(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={handleNewPanel} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Panel
            </Button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total",
              value: panelStats.total,
              color: "bg-blue-500",
              icon: BarChart3,
              trend: "+2 ce mois"
            },
            {
              label: "En cours",
              value: panelStats.byStatus.live,
              color: "bg-green-500",
              icon: Zap,
              trend: "Actifs maintenant"
            },
            {
              label: "Programmés",
              value: panelStats.byStatus.scheduled,
              color: "bg-yellow-500",
              icon: Calendar,
              trend: "À venir"
            },
            {
              label: "Questions moy.",
              value: panelStats.averageQuestions,
              color: "bg-purple-500",
              icon: MessageSquare,
              trend: "Par panel"
            },
          ].map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {stat.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stat.trend}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contrôles et filtres */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Barre de recherche et contrôles principaux */}
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un panel..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Par date</SelectItem>
                    <SelectItem value="title">Par titre</SelectItem>
                    <SelectItem value="participants">Par participation</SelectItem>
                    <SelectItem value="questions">Par questions</SelectItem>
                    <SelectItem value="status">Par statut</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres avancés
                </Button>

                <div className="flex border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {(filter !== "all" || categoryFilter !== "all" || dateFilter !== "all" || searchTerm) && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Effacer
                  </Button>
                )}
              </div>

              {/* Sélection groupée */}
              {selectedPanels.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800 font-medium">
                      {selectedPanels.size} panel(s) sélectionné(s)
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                        <Download className="h-4 w-4 mr-2" />
                        Exporter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archiver
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedPanels(new Set())}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filtres avancés */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Filtrer par catégorie</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les catégories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {uniqueCategories.map(category => (
                          <SelectItem key={category} value={category || ""}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Filtrer par date</Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les dates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les dates</SelectItem>
                        <SelectItem value="today">Aujourd'hui</SelectItem>
                        <SelectItem value="tomorrow">Demain</SelectItem>
                        <SelectItem value="this_week">Cette semaine</SelectItem>
                        <SelectItem value="this_month">Ce mois</SelectItem>
                        <SelectItem value="past">Passés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Filtres par statut */}
              <div className="flex flex-wrap gap-2">
                <StatusFilter
                  status="all"
                  count={panels.length}
                  isActive={filter === "all"}
                  onClick={() => setFilter("all")}
                />
                {Object.entries(statusConfig).map(([status, config]) => {
                  const count = panels.filter(p => p.status === status).length;
                  return (
                    <StatusFilter
                      key={status}
                      status={status as keyof typeof statusConfig}
                      count={count}
                      isActive={filter === status}
                      onClick={() => setFilter(status)}
                    />
                  );
                })}
              </div>

              {/* Résumé des filtres actifs */}
              {filteredAndSortedPanels.length !== panels.length && (
                <div className="text-sm text-muted-foreground bg-gray-100 px-3 py-2 rounded-lg">
                  {filteredAndSortedPanels.length} panel(s) trouvé(s) sur {panels.length} au total
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Liste des panels */}
        <div className="space-y-4 w-full">
          {filteredAndSortedPanels.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun panel trouvé
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filter !== "all" || categoryFilter !== "all" || dateFilter !== "all"
                    ? "Aucun panel ne correspond à vos critères de recherche."
                    : "Vous n'avez pas encore créé de panel."}
                </p>
                {searchTerm || filter !== "all" || categoryFilter !== "all" || dateFilter !== "all" ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Effacer les filtres
                  </Button>
                ) : (
                  <Button onClick={handleNewPanel}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un panel
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }>
              {filteredAndSortedPanels.map(panel => (
                <PanelCard key={panel.id} panel={panel} />
              ))}
            </div>
          )}
        </div>

        {/* Modal de gestion de panel */}
        {managePanelModal.open && managePanelModal.panel && (
          <Dialog open={managePanelModal.open} onOpenChange={(open) => 
            setManagePanelModal({ open, panel: null, mode: 'view' })
          }>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>Gestion du Panel</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {managePanelModal.panel.title}
                    </p>
                  </div>
                  <Badge
                    variant={managePanelModal.panel.status === "scheduled" ? "default" : "secondary"}
                  >
                    {statusConfig[managePanelModal.panel.status as keyof typeof statusConfig]?.label}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Informations du panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Titre</Label>
                      <p className="text-lg font-semibold">{managePanelModal.panel.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm text-gray-700">{managePanelModal.panel.description}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Date et heure</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(managePanelModal.panel.date).toLocaleDateString("fr-FR")}</span>
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                        <span>{managePanelModal.panel.time}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Questions</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{managePanelModal.panel.questions || 0}</span>
                        <span className="text-muted-foreground">questions soumises</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">QR Code</Label>
                      <div className="flex justify-center mt-2">
                        <PanelQRCode panel={managePanelModal.panel} size={120} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="border-t pt-6">
                  <Label className="text-sm font-medium mb-4 block">Actions rapides</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPanel(managePanelModal.panel!)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/panel-questions?panel=${managePanelModal.panel!.id}`;
                      }}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Questions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/panel/${managePanelModal.panel!.id}/projection`;
                      }}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Projection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/panel/${managePanelModal.panel!.id}/polls`;
                      }}
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Sondages
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvitePanelists(managePanelModal.panel!)}
                      className="flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Inviter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(window.location.origin + `/panel/${managePanelModal.panel!.id}`)}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Partager
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("Export en cours...")}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exporter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("Duplication en cours...")}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Dupliquer
                    </Button>
                  </div>
                </div>

                {/* Gestion du statut */}
                <div className="border-t pt-6">
                  <Label className="text-sm font-medium mb-4 block">Gestion du statut</Label>
                  <div className="flex gap-3">
                    {managePanelModal.panel.status === 'draft' ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updatePanelStatus(managePanelModal.panel!.id, 'scheduled')}
                      >
                        Confirmer le panel
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updatePanelStatus(managePanelModal.panel!.id, 'draft')}
                      >
                        Remettre en brouillon
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de confirmation de suppression */}
        <AlertDialog open={deleteConfirmation.open} onOpenChange={(open) => 
          setDeleteConfirmation({ open, panelId: null, panelTitle: "" })
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                Confirmer la suppression
              </AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le panel{" "}
                <strong>"{deleteConfirmation.panelTitle}"</strong> ?
                <br />
                <span className="text-red-500 text-sm">
                  Cette action est irréversible.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de création/édition */}
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingPanelId ? (
                  <>
                    <Edit className="h-5 w-5" />
                    Modifier le panel
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Créer un nouveau panel
                  </>
                )}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editingPanelId 
                  ? "Modifiez les informations de votre panel de discussion"
                  : "Remplissez les informations pour créer votre panel de discussion"
                }
              </p>
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Modifications non sauvegardées
                </div>
              )}
            </DialogHeader>

            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Titre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={panelForm.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Titre du panel"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Catégorie
                  </Label>
                  <Select
                    value={panelForm.category}
                    onValueChange={(value) => handleFormChange('category', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technologie">Technologie</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Environnement">Environnement</SelectItem>
                      <SelectItem value="Santé">Santé</SelectItem>
                      <SelectItem value="Éducation">Éducation</SelectItem>
                      <SelectItem value="Sport">Sport</SelectItem>
                      <SelectItem value="Culture">Culture</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={panelForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Décrivez votre panel en quelques phrases..."
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={panelForm.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">
                    Heure <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={panelForm.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium">
                    Durée
                  </Label>
                  <Select
                    value={panelForm.duration.toString()}
                    onValueChange={(value) => handleFormChange('duration', parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                      <SelectItem value="180">3 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="participants_limit" className="text-sm font-medium">
                    Participants max
                  </Label>
                  <Select
                    value={panelForm.participants_limit.toString()}
                    onValueChange={(value) => handleFormChange('participants_limit', parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 personnes</SelectItem>
                      <SelectItem value="20">20 personnes</SelectItem>
                      <SelectItem value="30">30 personnes</SelectItem>
                      <SelectItem value="50">50 personnes</SelectItem>
                      <SelectItem value="100">100 personnes</SelectItem>
                      <SelectItem value="200">200 personnes</SelectItem>
                      <SelectItem value="500">500 personnes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section Panélistes */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-base font-semibold">Panélistes</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez les intervenants de votre panel
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPanelist}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un panéliste
                  </Button>
                </div>

                <div className="space-y-4">
                  {panelForm.panelists.map((panelist, index) => (
                    <Card key={index} className="p-4 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="space-y-3">
                        {/* En-tête de la carte panéliste */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Panéliste {index + 1}
                            </span>
                          </div>
                          {panelForm.panelists.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePanelist(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Formulaire panéliste */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">
                              Nom complet <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="Ex: Jean Dupont"
                              value={panelist.name}
                              onChange={(e) => handlePanelistChange(index, "name", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">
                              Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="jean@exemple.com"
                              type="email"
                              value={panelist.email}
                              onChange={(e) => handlePanelistChange(index, "email", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">
                              Titre/Fonction
                            </Label>
                            <Input
                              placeholder="Ex: Directeur Marketing"
                              value={panelist.title}
                              onChange={(e) => handlePanelistChange(index, "title", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">
                              Temps d'intervention
                            </Label>
                            <Select
                              value={panelist.duration.toString()}
                              onValueChange={(value) => handlePanelistChange(index, "duration", parseInt(value))}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="20">20 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="45">45 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">
                            Sujet à aborder
                          </Label>
                          <Input
                            placeholder="Ex: Les tendances du marketing digital en 2025"
                            value={panelist.topic}
                            onChange={(e) => handlePanelistChange(index, "topic", e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !panelForm.title || !panelForm.description || !panelForm.date || !panelForm.time}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {editingPanelId ? "Mise à jour..." : "Création..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingPanelId ? "Mettre à jour le panel" : "Créer le panel"}
                    </>
                  )}
                </Button>
              </div>

              {/* Aide/Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Conseils pour créer un panel réussi :</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Choisissez un titre accrocheur et descriptif</li>
                      <li>• Ajoutez une description claire du sujet</li>
                      <li>• Invitez des panélistes complémentaires</li>
                      <li>• Prévoyez du temps pour les questions du public</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <InvitePanelistsModal
        open={inviteModal.open}
        panel={inviteModal.panel}
        onClose={() => setInviteModal({ open: false, panel: null })}
      />
    </div>
  );
}