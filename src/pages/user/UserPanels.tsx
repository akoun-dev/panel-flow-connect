import React from 'react';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import PanelInvitationService from "@/services/PanelInvitationService";
import { PanelService } from "@/services/panelService";
import type { Panel } from "@/types/panel";
import { PanelQRCode } from "@/components/panels/PanelQRCode";
import { useUser } from "../../hooks/useUser";
import { Calendar, Users, Clock, MessageSquare, MoreHorizontal, Play, Edit, Trash2, Eye, Mail, Filter, X, Plus, Search, Grid, List, SortAsc, Star, Settings, BarChart3 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
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

export function UserPanels() {
  // Ajout du système de notifications en temps réel
  useEffect(() => {
    const handleInvitationSent = (e: CustomEvent<{
      panel_id: string;
      panelist_email: string;
      status: 'sent' | 'failed';
    }>) => {
      const { panelist_email, panel_id, status } = e.detail;
      
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

  const { user } = useUser();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'participants'>('date');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [inviteModal, setInviteModal] = useState<{open: boolean; panel: Panel | null}>({open: false, panel: null});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  }>({});
  
  const [panelForm, setPanelForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: 60,
    participants_limit: 30,
    category: "Technologie",
    user_id: user?.id || "",
    panelists: [
      {
        name: "",
        email: "",
        title: "",
        topic: "",
        duration: 15
      }
    ]
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    panelId: string | null;
    panelTitle: string;
  }>({ open: false, panelId: null, panelTitle: "" });

  // Modal de gestion de panel (similaire à UserDashboard)
  const [managePanelModal, setManagePanelModal] = useState<{
    open: boolean;
    panel: Panel | null;
    mode: 'view' | 'edit';
  }>({ open: false, panel: null, mode: 'view' });

  // Charger le profil utilisateur au démarrage
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

  // Charger les panels
  useEffect(() => {
    const loadPanels = async () => {
      if (!user?.id) return;
      try {
        const data = await PanelService.getPanels(user.id);
        setPanels(data);
      } catch (error) {
        console.error("Failed to load panels", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPanels();
  }, [user?.id]);

  // Fonctions de gestion des panélistes
  const handlePanelistChange = (
    index: number,
    field: 'name' | 'email' | 'title' | 'topic' | 'duration',
    value: string | number
  ) => {
    const newPanelists = [...panelForm.panelists];
    newPanelists[index] = {
      ...newPanelists[index],
      [field]: value
    };
    setPanelForm({...panelForm, panelists: newPanelists});
  };

  const addPanelist = () => {
    setPanelForm({
      ...panelForm,
      panelists: [...panelForm.panelists, { name: "", email: "", title: "", topic: "", duration: 15 }]
    });
  };

  const removePanelist = (index: number) => {
    if (panelForm.panelists.length > 1) {
      const newPanelists = [...panelForm.panelists];
      newPanelists.splice(index, 1);
      setPanelForm({...panelForm, panelists: newPanelists});
    }
  };

  // Obtenir les catégories uniques des panels
  const uniqueCategories = [...new Set(panels.map(panel => panel.category).filter(Boolean))];

  // Filtrage et tri des panels
  const filteredAndSortedPanels = panels
    .filter(panel => {
      if (!panel) return false;
      
      // Filtrage par statut
      const matchesStatus = filter === "all" || panel.status === filter;
      
      // Filtrage par recherche
      const matchesSearch = panel.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           panel.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrage par catégorie
      const matchesCategory = categoryFilter === "all" || panel.category === categoryFilter;
      
      // Filtrage par date
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
        case 'date':
        default:
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

  const getParticipationRate = (registered?: number, limit?: number) => {
    if (!registered || !limit) return 0;
    return Math.round((registered / limit) * 100);
  };

  const getPriorityBadge = (panel: Panel) => {
    const rate = getParticipationRate(panel.participants?.registered, panel.participants?.limit);
    if (rate >= 80) return { label: "Populaire", color: "bg-green-100 text-green-700" };
    if (panel.questions >= 10) return { label: "Actif", color: "bg-blue-100 text-blue-700" };
    if (panel.status === 'live') return { label: "En direct", color: "bg-red-100 text-red-700" };
    return null;
  };

  const handleNewPanel = () => {
    setEditingPanelId(null);
    setPanelForm({
      title: "",
      description: "",
      date: "",
      time: "",
      duration: 60,
      participants_limit: 30,
      category: "Technologie",
      user_id: user?.id || "",
      panelists: [{ name: "", email: "", title: "", topic: "", duration: 15 }]
    });
    setIsModalOpen(true);
  };

  // Fonction pour gérer un panel (similaire à UserDashboard)
  const handleManagePanel = (panel: Panel) => {
    logger.debug("Managing panel:", panel);
    setManagePanelModal({ open: true, panel, mode: 'view' });
  };

  // Fonction pour éditer un panel (similaire à UserDashboard)
  const handleEditPanel = async (panel: Panel) => {
    logger.debug("Editing panel:", panel);
    
    try {
      // Récupérer les données complètes du panel depuis la base de données
      const { data: fullPanelData, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', panel.id)
        .single();

      if (error) throw error;

      // Pré-remplir le formulaire avec les données du panel
      setPanelForm({
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
          : [{
              name: "",
              email: "",
              title: "",
              topic: "",
              duration: 15
            }]
      });

      // Définir qu'on est en mode édition
      setEditingPanelId(panel.id);
      
      // Fermer le modal de gestion et ouvrir le modal d'édition
      setManagePanelModal({ open: false, panel: null, mode: 'view' });
      setIsModalOpen(true);

    } catch (error) {
      console.error("Error loading panel data for editing:", error);
      toast.error("Erreur lors du chargement des données du panel");
    }
  };

  const handleEdit = async (panelId: string) => {
    const panelToEdit = panels.find(p => p.id === panelId);
    if (panelToEdit) {
      handleEditPanel(panelToEdit);
    }
  };

  // Fonction pour supprimer un panel (similaire à UserDashboard)
  const handleDeletePanel = (panel: Panel) => {
    setDeleteConfirmation({
      open: true,
      panelId: panel.id,
      panelTitle: panel.title
    });
    setManagePanelModal({ open: false, panel: null, mode: 'view' });
  };

  const handleDelete = async (panelId: string) => {
    const panelToDelete = panels.find(p => p.id === panelId);
    if (panelToDelete) {
      handleDeletePanel(panelToDelete);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.panelId) return;
    
    try {
      await PanelService.deletePanel(deleteConfirmation.panelId);
      setPanels(panels.filter(p => p.id !== deleteConfirmation.panelId));
      setDeleteConfirmation({ open: false, panelId: null, panelTitle: "" });
      toast.success("Panel supprimé avec succès");
    } catch (error) {
      console.error("Failed to delete panel", error);
      toast.error("Erreur lors de la suppression du panel");
    }
  };

  const handleView = (panelId: string) => {
    const panelToView = panels.find(p => p.id === panelId);
    if (panelToView) {
      handleManagePanel(panelToView);
    }
  };

  // Fonction pour inviter les panélistes (similaire à UserDashboard)
  const handleInvitePanelists = (panel: Panel) => {
    setInviteModal({ open: true, panel });
  };

  // Fonction pour changer le statut d'un panel (similaire à UserDashboard)
  const updatePanelStatus = async (panelId: string, newStatus: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled') => {
    try {
      await PanelService.changePanelStatus(panelId, newStatus);
      const updatedPanel = await PanelService.getPanelById(panelId);
      setPanels(panels.map(p => p.id === panelId ? updatedPanel : p));
      
      // Mettre à jour le panel dans le modal si ouvert
      if (managePanelModal.panel?.id === panelId) {
        setManagePanelModal({
          ...managePanelModal,
          panel: { ...managePanelModal.panel, status: newStatus }
        });
      }
      toast.success("Statut du panel mis à jour");
    } catch (error) {
      console.error("Error updating panel status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    
    // Validation des champs requis
    if (!panelForm.time) {
      toast.error("L'heure du panel est requise");
      return;
    }

    // Préparer les données avec les informations du modérateur
    const moderatorName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Modérateur';
    const moderatorEmail = userProfile.email || user.email || '';

    try {
      if (editingPanelId) {
        // Mise à jour du panel existant
        const updatedPanel = await PanelService.updatePanel(editingPanelId, {
          title: panelForm.title,
          description: panelForm.description,
          date: panelForm.date,
          time: panelForm.time || '00:00',
          duration: panelForm.duration,
          participants_limit: panelForm.participants_limit,
          category: panelForm.category,
          user_id: panelForm.user_id,
          moderator_name: moderatorName,
          moderator_email: moderatorEmail,
          tags: [],
          panelists: panelForm.panelists.filter(p => p.name && p.email)
        });
        setPanels(panels.map(p => p.id === editingPanelId ? updatedPanel : p));
        toast.success("Panel mis à jour!");
      } else {
        // Création d'un nouveau panel
        const createdPanel = await PanelService.createPanel({
          title: panelForm.title,
          description: panelForm.description,
          date: panelForm.date,
          time: panelForm.time || '00:00',
          duration: panelForm.duration,
          participants_limit: panelForm.participants_limit,
          category: panelForm.category,
          user_id: panelForm.user_id,
          moderator_name: moderatorName,
          moderator_email: moderatorEmail,
          tags: [],
          panelists: panelForm.panelists.filter(p => p.name && p.email)
        });
        setPanels([createdPanel, ...panels]);
        toast.success("Panel créé!");
      }
      
      setIsModalOpen(false);
      setEditingPanelId(null);
      setPanelForm({
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
    } catch (error) {
      console.error("Failed to save panel", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const clearFilters = () => {
    setFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
    setSearchTerm("");
  };

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
        flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
        ${isActive 
          ? 'bg-blue-50 border-blue-200 text-blue-700' 
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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

    return (
        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge
                                variant="outline"
                                className={statusInfo?.color}
                            >
                                <div
                                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo?.dotColor}`}
                                />
                                {statusInfo?.label}
                            </Badge>
                            {priority && (
                                <Badge
                                    variant="outline"
                                    className={priority.color}
                                >
                                    <Star className="w-3 h-3 mr-1" />
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
                            <DropdownMenuItem
                                onClick={() => handleEdit(panel.id)}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleView(panel.id)}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleInvitePanelists(panel)}
                            >
                                <Mail className="h-4 w-4 mr-2" />
                                Inviter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(panel.id)}
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
                                {new Date(panel.date).toLocaleDateString(
                                    "fr-FR",
                                    {
                                        day: "numeric",
                                        month: "short",
                                    }
                                )}
                            </div>
                            <div className="text-xs text-gray-500">
                                {panel.time}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                <Users className="h-3 w-3" />
                            </div>
                            <div className="text-sm font-medium">
                                {panel.panelists?.length || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                                Panelistes
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                <MessageSquare className="h-3 w-3" />
                            </div>
                            <div className="text-sm font-medium">
                                {panel.questions || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                                Questions
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {panel.tags && panel.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {panel.tags
                                .slice(0, 3)
                                .map((tag: string, index: number) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs px-2 py-0.5"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            {panel.tags.length > 3 && (
                                <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5"
                                >
                                    +{panel.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                        <Button
                            size="sm"
                            className="w-full bg-blue-700 text-white hover:text-white hover:bg-blue-600"
                            variant="outline"
                            onClick={() => handleManagePanel(panel)}
                        >
                            Gérer
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
  };

  return (
      <div className="min-h-screen bg-gray-50/50 w-full">
          <div className="w-full max-w-none p-6 space-y-6">
              {/* En-tête */}
              <div className="flex items-center justify-between">
                  <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                          Mes Panels
                      </h1>
                      <p className="text-gray-600 mt-1">
                          Gérez et organisez vos sessions de discussion
                      </p>
                  </div>
                  <Button onClick={handleNewPanel} size="lg" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nouveau Panel
                  </Button>
              </div>

              {/* Statistiques rapides */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                      {
                          label: "Total",
                          value: panels.length,
                          color: "bg-blue-500",
                      },
                      {
                          label: "En cours",
                          value: panels.filter(p => p.status === "live").length,
                          color: "bg-green-500",
                      },
                      {
                          label: "Programmés",
                          value: panels.filter(p => p.status === "scheduled")
                              .length,
                          color: "bg-yellow-500",
                      },
                      {
                          label: "Terminés",
                          value: panels.filter(p => p.status === "completed")
                              .length,
                          color: "bg-purple-500",
                      },
                  ].map((stat, index) => (
                      <Card key={index} className="border-0 shadow-sm">
                          <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                  <div
                                      className={`w-3 h-3 rounded-full ${stat.color}`}
                                  />
                                  <div>
                                      <div className="text-2xl font-bold">
                                          {stat.value}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                          {stat.label}
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ))}
              </div>

              {/* Contrôles et filtres */}
              <Card className="border-0 shadow-sm max-w-none">
                  <CardContent className="p-4">
                      <div className="space-y-4">
                          {/* Barre de recherche et contrôles */}
                          <div className="flex items-center gap-4">
                              <div className="relative flex-1 max-w-md">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                      placeholder="Rechercher un panel..."
                                      value={searchTerm}
                                      onChange={e =>
                                          setSearchTerm(e.target.value)
                                      }
                                      className="pl-10"
                                  />
                              </div>

                              <Select
                                  value={sortBy}
                                  onValueChange={(
                                      value: "date" | "title" | "participants"
                                  ) => setSortBy(value)}
                              >
                                  <SelectTrigger className="w-48">
                                      <SortAsc className="h-4 w-4 mr-2" />
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="date">
                                          Par date
                                      </SelectItem>
                                      <SelectItem value="title">
                                          Par titre
                                      </SelectItem>
                                      <SelectItem value="participants">
                                          Par participation
                                      </SelectItem>
                                  </SelectContent>
                              </Select>

                              <Button
                                  variant="outline"
                                  onClick={() =>
                                      setShowAdvancedFilters(
                                          !showAdvancedFilters
                                      )
                                  }
                              >
                                  <Filter className="h-4 w-4 mr-2" />
                                  Filtres avancés
                              </Button>

                              <div className="flex border rounded-lg p-1">
                                  <Button
                                      variant={
                                          viewMode === "grid"
                                              ? "default"
                                              : "ghost"
                                      }
                                      size="sm"
                                      onClick={() => setViewMode("grid")}
                                  >
                                      <Grid className="h-4 w-4" />
                                  </Button>
                                  <Button
                                      variant={
                                          viewMode === "list"
                                              ? "default"
                                              : "ghost"
                                      }
                                      size="sm"
                                      onClick={() => setViewMode("list")}
                                  >
                                      <List className="h-4 w-4" />
                                  </Button>
                              </div>

                              {(filter !== "all" ||
                                  categoryFilter !== "all" ||
                                  dateFilter !== "all" ||
                                  searchTerm) && (
                                  <Button
                                      variant="outline"
                                      onClick={clearFilters}
                                  >
                                      <X className="h-4 w-4 mr-2" />
                                      Effacer
                                  </Button>
                              )}
                          </div>

                          {/* Filtres avancés */}
                          {showAdvancedFilters && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                  <div className="space-y-2">
                                      <Label>Filtrer par catégorie</Label>
                                      <Select
                                          value={categoryFilter}
                                          onValueChange={setCategoryFilter}
                                      >
                                          <SelectTrigger>
                                              <SelectValue placeholder="Toutes les catégories" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="all">
                                                  Toutes les catégories
                                              </SelectItem>
                                              {uniqueCategories.map(
                                                  category => (
                                                      <SelectItem
                                                          key={category}
                                                          value={category}
                                                      >
                                                          {category}
                                                      </SelectItem>
                                                  )
                                              )}
                                          </SelectContent>
                                      </Select>
                                  </div>

                                  <div className="space-y-2">
                                      <Label>Filtrer par date</Label>
                                      <Select
                                          value={dateFilter}
                                          onValueChange={setDateFilter}
                                      >
                                          <SelectTrigger>
                                              <SelectValue placeholder="Toutes les dates" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="all">
                                                  Toutes les dates
                                              </SelectItem>
                                              <SelectItem value="today">
                                                  Aujourd'hui
                                              </SelectItem>
                                              <SelectItem value="tomorrow">
                                                  Demain
                                              </SelectItem>
                                              <SelectItem value="this_week">
                                                  Cette semaine
                                              </SelectItem>
                                              <SelectItem value="this_month">
                                                  Ce mois
                                              </SelectItem>
                                              <SelectItem value="past">
                                                  Passés
                                              </SelectItem>
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
                              {Object.entries(statusConfig).map(
                                  ([status, config]) => {
                                      const count = panels.filter(
                                          p => p.status === status
                                      ).length
                                      return (
                                          <StatusFilter
                                              key={status}
                                              status={
                                                  status as
                                                      | keyof typeof statusConfig
                                                      | "all"
                                              }
                                              count={count}
                                              isActive={filter === status}
                                              onClick={() => setFilter(status)}
                                          />
                                      )
                                  }
                              )}
                          </div>

                          {/* Résumé des filtres actifs */}
                          {filteredAndSortedPanels.length !== panels.length && (
                              <div className="text-sm text-muted-foreground">
                                  {filteredAndSortedPanels.length} panel(s)
                                  trouvé(s) sur {panels.length} au total
                              </div>
                          )}
                      </div>
                  </CardContent>
              </Card>

              {/* Liste des panels */}
              <div className="space-y-4 w-full">
                  {isLoading ? (
                      <div className="flex justify-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                      </div>
                  ) : filteredAndSortedPanels.length === 0 ? (
                      <Card className="border-0 shadow-sm">
                          <CardContent className="text-center py-12">
                              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  Aucun panel trouvé
                              </h3>
                              <p className="text-gray-600 mb-4">
                                  {searchTerm ||
                                  filter !== "all" ||
                                  categoryFilter !== "all" ||
                                  dateFilter !== "all"
                                      ? "Aucun panel ne correspond à vos critères de recherche."
                                      : "Vous n'avez pas encore créé de panel."}
                              </p>
                              {searchTerm ||
                              filter !== "all" ||
                              categoryFilter !== "all" ||
                              dateFilter !== "all" ? (
                                  <Button
                                      variant="outline"
                                      onClick={clearFilters}
                                  >
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
                      <div
                          className={
                              viewMode === "grid"
                                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                  : "space-y-4"
                          }
                      >
                          {filteredAndSortedPanels.map(panel => (
                              <PanelCard key={panel.id} panel={panel} />
                          ))}
                      </div>
                  )}
              </div>

              {/* Modal de gestion de panel (similaire à UserDashboard) */}
              {managePanelModal.open && managePanelModal.panel && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                          <CardHeader>
                              <div className="flex items-center justify-between">
                                  <div>
                                      <CardTitle>Gestion du Panel</CardTitle>
                                      <CardDescription>
                                          {managePanelModal.panel.title}
                                      </CardDescription>
                                  </div>
                                  <Badge
                                      variant={
                                          managePanelModal.panel.status ===
                                          "scheduled"
                                              ? "default"
                                              : "secondary"
                                      }
                                  >
                                      {managePanelModal.panel.status ===
                                      "scheduled"
                                          ? "Confirmé"
                                          : statusConfig[
                                                managePanelModal.panel
                                                    .status as keyof typeof statusConfig
                                            ]?.label}
                                  </Badge>
                              </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                              {/* Informations du panel */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                      <div>
                                          <Label className="text-sm font-medium text-muted-foreground">
                                              Titre
                                          </Label>
                                          <p className="text-lg font-semibold">
                                              {managePanelModal.panel.title}
                                          </p>
                                      </div>
                                      <div>
                                          <Label className="text-sm font-medium text-muted-foreground">
                                              Date et heure
                                          </Label>
                                          <div className="flex items-center gap-2 mt-1">
                                              <Calendar className="h-4 w-4 text-muted-foreground" />
                                              <span>
                                                  {new Date(
                                                      managePanelModal.panel.date
                                                  ).toLocaleDateString("fr-FR")}
                                              </span>
                                              <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                              <span>
                                                  {managePanelModal.panel.time}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex flex-row gap-6 items-start">
                                      <div className="flex-1">
                                          <Label className="text-sm font-medium text-muted-foreground">
                                              Questions
                                          </Label>
                                          <div className="flex items-center gap-2 mt-1">
                                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-semibold">
                                                  {managePanelModal.panel
                                                      .questions || 0}
                                              </span>
                                              <span className="text-muted-foreground">
                                                  questions soumises
                                              </span>
                                          </div>
                                      </div>
                                      <div className="flex-1 flex flex-col items-center">
                                          <Label className="text-sm font-medium text-muted-foreground">
                                              QR Code
                                          </Label>
                                          <PanelQRCode
                                              panel={managePanelModal.panel}
                                              size={120}
                                          />
                                      </div>
                                  </div>
                              </div>

                              {/* Actions rapides */}
                              <div className="border-t pt-6">
                                  <Label className="text-sm font-medium mb-4 block">
                                      Actions rapides
                                  </Label>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                              handleEditPanel(
                                                  managePanelModal.panel!
                                              )
                                          }
                                          className="flex items-center gap-2"
                                      >
                                          <Settings className="h-4 w-4" />
                                          Modifier
                                      </Button>
                                      <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                              window.location.href = `/panel-questions?panel=${
                                                  managePanelModal.panel!.id
                                              }`
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
                                              window.location.href = `/panel/${
                                                  managePanelModal.panel!.id
                                              }/projection`
                                          }}
                                          className="flex items-center gap-2"
                                      >
                                          <Play className="h-4 w-4" />
                                          Projection
                                      </Button>
                                      <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                              handleInvitePanelists(
                                                  managePanelModal.panel!
                                              )
                                          }
                                          className="flex items-center gap-2"
                                      >
                                          <Users className="h-4 w-4" />
                                          Inviter
                                      </Button>
                                      <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                              handleDeletePanel(
                                                  managePanelModal.panel!
                                              )
                                          }
                                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                      >
                                          <Calendar className="h-4 w-4" />
                                          Supprimer
                                      </Button>
                                  </div>
                              </div>

                              {/* Gestion du statut */}
                              <div className="border-t pt-6">
                                  <Label className="text-sm font-medium mb-4 block">
                                      Gestion du statut
                                  </Label>
                                  <div className="flex gap-3">
                                      {managePanelModal.panel.status ===
                                      "draft" ? (
                                          <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() =>
                                                  updatePanelStatus(
                                                      managePanelModal.panel!
                                                          .id,
                                                      "scheduled"
                                                  )
                                              }
                                          >
                                              Confirmer le panel
                                          </Button>
                                      ) : (
                                          <Button
                                              variant="secondary"
                                              size="sm"
                                              onClick={() =>
                                                  updatePanelStatus(
                                                      managePanelModal.panel!
                                                          .id,
                                                      "draft"
                                                  )
                                              }
                                          >
                                              Remettre en brouillon
                                          </Button>
                                      )}
                                  </div>
                              </div>
                              {/* Actions principales */}
                              <div className="flex justify-end gap-2 pt-4 border-t">
                                  <Button
                                      variant="outline"
                                      onClick={() =>
                                          setManagePanelModal({
                                              open: false,
                                              panel: null,
                                              mode: "view",
                                          })
                                      }
                                  >
                                      Fermer
                                  </Button>
                              </div>
                          </CardContent>
                      </Card>
                  </div>
              )}

              {/* Modal de confirmation de suppression */}
              {deleteConfirmation.open && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <Card className="w-full max-w-md">
                          <CardHeader>
                              <CardTitle className="text-red-600">
                                  Confirmer la suppression
                              </CardTitle>
                              <CardDescription>
                                  Êtes-vous sûr de vouloir supprimer le panel{" "}
                                  <strong>
                                      "{deleteConfirmation.panelTitle}"
                                  </strong>{" "}
                                  ?
                                  <br />
                                  <span className="text-red-500 text-sm">
                                      Cette action est irréversible.
                                  </span>
                              </CardDescription>
                          </CardHeader>
                          <CardContent className="flex justify-end gap-2">
                              <Button
                                  variant="outline"
                                  onClick={() =>
                                      setDeleteConfirmation({
                                          open: false,
                                          panelId: null,
                                          panelTitle: "",
                                      })
                                  }
                              >
                                  Annuler
                              </Button>
                              <Button
                                  variant="destructive"
                                  onClick={confirmDelete}
                              >
                                  Supprimer définitivement
                              </Button>
                          </CardContent>
                      </Card>
                  </div>
              )}

              {/* Modal de création/édition */}
              {isModalOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                      <Card className="w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                          <CardHeader className="p-4 sm:p-6">
                              <CardTitle className="text-lg sm:text-xl">
                                  {editingPanelId
                                      ? "Modifier le panel"
                                      : "Créer un nouveau panel"}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                  Remplissez les informations pour votre panel
                                  de discussion
                              </CardDescription>
                          </CardHeader>

                          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                              {/* Informations principales */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label
                                          htmlFor="title"
                                          className="text-sm font-medium"
                                      >
                                          Titre{" "}
                                          <span className="text-red-500">
                                              *
                                          </span>
                                      </Label>
                                      <Input
                                          id="title"
                                          value={panelForm.title}
                                          onChange={e =>
                                              setPanelForm({
                                                  ...panelForm,
                                                  title: e.target.value,
                                              })
                                          }
                                          placeholder="Titre du panel"
                                          className="w-full"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label
                                          htmlFor="category"
                                          className="text-sm font-medium"
                                      >
                                          Catégorie
                                      </Label>
                                      <Select
                                          value={panelForm.category}
                                          onValueChange={value =>
                                              setPanelForm({
                                                  ...panelForm,
                                                  category: value,
                                              })
                                          }
                                      >
                                          <SelectTrigger className="w-full">
                                              <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="Technologie">
                                                  Technologie
                                              </SelectItem>
                                              <SelectItem value="Business">
                                                  Business
                                              </SelectItem>
                                              <SelectItem value="Environnement">
                                                  Environnement
                                              </SelectItem>
                                              <SelectItem value="Santé">
                                                  Santé
                                              </SelectItem>
                                              <SelectItem value="Éducation">
                                                  Éducation
                                              </SelectItem>
                                              <SelectItem value="Sport">
                                                  Sport
                                              </SelectItem>
                                              <SelectItem value="Culture">
                                                  Culture
                                              </SelectItem>
                                              <SelectItem value="Autre">
                                                  Autre
                                              </SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <Label
                                      htmlFor="description"
                                      className="text-sm font-medium"
                                  >
                                      Description{" "}
                                      <span className="text-red-500">*</span>
                                  </Label>
                                  <Textarea
                                      id="description"
                                      value={panelForm.description}
                                      onChange={e =>
                                          setPanelForm({
                                              ...panelForm,
                                              description: e.target.value,
                                          })
                                      }
                                      placeholder="Décrivez votre panel en quelques phrases..."
                                      rows={3}
                                      className="w-full resize-none"
                                  />
                              </div>

                              {/* Date et heure */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                      <Label
                                          htmlFor="date"
                                          className="text-sm font-medium"
                                      >
                                          Date{" "}
                                          <span className="text-red-500">
                                              *
                                          </span>
                                      </Label>
                                      <Input
                                          id="date"
                                          type="date"
                                          value={panelForm.date}
                                          onChange={e =>
                                              setPanelForm({
                                                  ...panelForm,
                                                  date: e.target.value,
                                              })
                                          }
                                          className="w-full"
                                          min={
                                              new Date()
                                                  .toISOString()
                                                  .split("T")[0]
                                          }
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label
                                          htmlFor="time"
                                          className="text-sm font-medium"
                                      >
                                          Heure{" "}
                                          <span className="text-red-500">
                                              *
                                          </span>
                                      </Label>
                                      <Input
                                          id="time"
                                          type="time"
                                          value={panelForm.time}
                                          onChange={e =>
                                              setPanelForm({
                                                  ...panelForm,
                                                  time: e.target.value,
                                              })
                                          }
                                          className="w-full"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label
                                          htmlFor="duration"
                                          className="text-sm font-medium"
                                      >
                                          Durée
                                      </Label>
                                      <Select
                                          value={panelForm.duration.toString()}
                                          onValueChange={value =>
                                              setPanelForm({
                                                  ...panelForm,
                                                  duration: parseInt(value),
                                              })
                                          }
                                      >
                                          <SelectTrigger className="w-full">
                                              <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="30">
                                                  30 minutes
                                              </SelectItem>
                                              <SelectItem value="45">
                                                  45 minutes
                                              </SelectItem>
                                              <SelectItem value="60">
                                                  1 heure
                                              </SelectItem>
                                              <SelectItem value="90">
                                                  1h30
                                              </SelectItem>
                                              <SelectItem value="120">
                                                  2 heures
                                              </SelectItem>
                                              <SelectItem value="180">
                                                  3 heures
                                              </SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <div className="space-y-2">
                                      <Label
                                          htmlFor="participants_limit"
                                          className="text-sm font-medium"
                                      >
                                          Participants max
                                      </Label>
                                      <Select
                                          value={panelForm.participants_limit.toString()}
                                          onValueChange={value =>
                                              setPanelForm({
                                                  ...panelForm,
                                                  participants_limit:
                                                      parseInt(value),
                                              })
                                          }
                                      >
                                          <SelectTrigger className="w-full">
                                              <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="10">
                                                  10 personnes
                                              </SelectItem>
                                              <SelectItem value="20">
                                                  20 personnes
                                              </SelectItem>
                                              <SelectItem value="30">
                                                  30 personnes
                                              </SelectItem>
                                              <SelectItem value="50">
                                                  50 personnes
                                              </SelectItem>
                                              <SelectItem value="100">
                                                  100 personnes
                                              </SelectItem>
                                              <SelectItem value="200">
                                                  200 personnes
                                              </SelectItem>
                                              <SelectItem value="500">
                                                  500 personnes
                                              </SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>

                              {/* Section Panélistes */}
                              <div className="space-y-4 border-t pt-4 sm:pt-6">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                          <Label className="text-base font-semibold">
                                              Panélistes
                                          </Label>
                                          <p className="text-sm text-muted-foreground">
                                              Ajoutez les intervenants de votre
                                              panel
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
                                      {panelForm.panelists.map(
                                          (panelist, index) => (
                                              <Card
                                                  key={index}
                                                  className="p-3 sm:p-4 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors"
                                              >
                                                  <div className="space-y-3">
                                                      {/* En-tête de la carte panéliste */}
                                                      <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-2">
                                                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                                  {index + 1}
                                                              </div>
                                                              <span className="text-sm font-medium text-gray-700">
                                                                  Panéliste{" "}
                                                                  {index + 1}
                                                              </span>
                                                          </div>
                                                          {panelForm.panelists
                                                              .length > 1 && (
                                                              <Button
                                                                  type="button"
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  onClick={() =>
                                                                      removePanelist(
                                                                          index
                                                                      )
                                                                  }
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
                                                                  Nom complet{" "}
                                                                  <span className="text-red-500">
                                                                      *
                                                                  </span>
                                                              </Label>
                                                              <Input
                                                                  placeholder="Ex: Jean Dupont"
                                                                  value={
                                                                      panelist.name
                                                                  }
                                                                  onChange={e =>
                                                                      handlePanelistChange(
                                                                          index,
                                                                          "name",
                                                                          e
                                                                              .target
                                                                              .value
                                                                      )
                                                                  }
                                                                  className="text-sm"
                                                              />
                                                          </div>
                                                          <div className="space-y-1">
                                                              <Label className="text-xs font-medium text-gray-600">
                                                                  Email{" "}
                                                                  <span className="text-red-500">
                                                                      *
                                                                  </span>
                                                              </Label>
                                                              <Input
                                                                  placeholder="jean@exemple.com"
                                                                  type="email"
                                                                  value={
                                                                      panelist.email
                                                                  }
                                                                  onChange={e =>
                                                                      handlePanelistChange(
                                                                          index,
                                                                          "email",
                                                                          e
                                                                              .target
                                                                              .value
                                                                      )
                                                                  }
                                                                  className="text-sm"
                                                              />
                                                          </div>
                                                          <div className="space-y-1">
                                                              <Label className="text-xs font-medium text-gray-600">
                                                                  Titre/Fonction
                                                              </Label>
                                                              <Input
                                                                  placeholder="Ex: Directeur Marketing"
                                                                  value={
                                                                      panelist.title
                                                                  }
                                                                  onChange={e =>
                                                                      handlePanelistChange(
                                                                          index,
                                                                          "title",
                                                                          e
                                                                              .target
                                                                              .value
                                                                      )
                                                                  }
                                                                  className="text-sm"
                                                              />
                                                          </div>
                                                          <div className="space-y-1">
                                                              <Label className="text-xs font-medium text-gray-600">
                                                                  Temps
                                                                  d'intervention
                                                              </Label>
                                                              <Select
                                                                  value={panelist.duration.toString()}
                                                                  onValueChange={value =>
                                                                      handlePanelistChange(
                                                                          index,
                                                                          "duration",
                                                                          parseInt(
                                                                              value
                                                                          )
                                                                      )
                                                                  }
                                                              >
                                                                  <SelectTrigger className="text-sm">
                                                                      <SelectValue />
                                                                  </SelectTrigger>
                                                                  <SelectContent>
                                                                      <SelectItem value="5">
                                                                          5
                                                                          minutes
                                                                      </SelectItem>
                                                                      <SelectItem value="10">
                                                                          10
                                                                          minutes
                                                                      </SelectItem>
                                                                      <SelectItem value="15">
                                                                          15
                                                                          minutes
                                                                      </SelectItem>
                                                                      <SelectItem value="20">
                                                                          20
                                                                          minutes
                                                                      </SelectItem>
                                                                      <SelectItem value="30">
                                                                          30
                                                                          minutes
                                                                      </SelectItem>
                                                                      <SelectItem value="45">
                                                                          45
                                                                          minutes
                                                                      </SelectItem>
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
                                                              value={
                                                                  panelist.topic
                                                              }
                                                              onChange={e =>
                                                                  handlePanelistChange(
                                                                      index,
                                                                      "topic",
                                                                      e.target
                                                                          .value
                                                                  )
                                                              }
                                                              className="text-sm"
                                                          />
                                                      </div>
                                                  </div>
                                              </Card>
                                          )
                                      )}
                                  </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
                                  <Button
                                      variant="outline"
                                      onClick={() => {
                                          setIsModalOpen(false)
                                          setEditingPanelId(null)
                                      }}
                                      className="w-full sm:w-auto"
                                  >
                                      Annuler
                                  </Button>
                                  <Button
                                      onClick={handleSubmit}
                                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                                      disabled={
                                          !panelForm.title ||
                                          !panelForm.description ||
                                          !panelForm.date ||
                                          !panelForm.time
                                      }
                                  >
                                      {editingPanelId
                                          ? "Mettre à jour le panel"
                                          : "Créer le panel"}
                                  </Button>
                              </div>

                              {/* Aide/Instructions */}
                              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                                  <div className="flex items-start gap-2">
                                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <span className="text-blue-600 text-xs">
                                              💡
                                          </span>
                                      </div>
                                      <div className="text-sm text-blue-800">
                                          <p className="font-medium mb-1">
                                              Conseils pour créer un panel
                                              réussi :
                                          </p>
                                          <ul className="space-y-1 text-xs">
                                              <li>
                                                  • Choisissez un titre
                                                  accrocheur et descriptif
                                              </li>
                                              <li>
                                                  • Ajoutez une description
                                                  claire du sujet
                                              </li>
                                              <li>
                                                  • Invitez des panélistes
                                                  complémentaires
                                              </li>
                                              <li>
                                                  • Prévoyez du temps pour les
                                                  questions du public
                                              </li>
                                          </ul>
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  </div>
              )}
          </div>
          <InvitePanelistsModal
              open={inviteModal.open}
              panel={inviteModal.panel}
              onClose={() => setInviteModal({ open: false, panel: null })}
          />
      </div>
  )
}