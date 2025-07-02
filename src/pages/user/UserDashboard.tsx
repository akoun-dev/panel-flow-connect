import { useState, useEffect } from "react";
import { PanelService } from "@/services/panelService";
import { useUser } from "@/hooks/useUser";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, MessageSquare, Clock, Plus, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";

interface Panel {
  id: string;
  title: string;
  date: string;
  time: string;
  status: "draft" | "scheduled" | "live" | "completed" | "cancelled";
  participants: number;
  questions?: number;
  userRole?: string; // Nouveau champ pour indiquer le rôle de l'utilisateur
}

interface Activity {
  action: string;
  panel: string;
  time: string;
}

interface Stats {
  totalPanels: number;
  totalParticipants: number;
  avgRating: number;
  questionsAnswered: number;
}

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}j`;
};

export function UserDashboard() {
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
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
        panelists: [{
            name: "",
            email: "",
            title: "",
            topic: "",
            duration: 15
        }]
    });

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

    const [userData, setUserData] = useState({
        name: "",
        nextPanel: null as Panel | null,
        stats: {
            totalPanels: 0,
            totalParticipants: 0,
            avgRating: 0,
            questionsAnswered: 0
        } as Stats,
        upcomingPanels: [] as Panel[],
        recentActivity: [] as Activity[]
    });

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

    // Fonction pour réinitialiser le formulaire
    const resetForm = () => {
        setPanelForm({
            title: "",
            description: "",
            date: "",
            time: "",
            duration: 60,
            participants_limit: 30,
            category: "Technologie",
            panelists: [{
                name: "",
                email: "",
                title: "",
                topic: "",
                duration: 15
            }]
        });
        setEditingPanelId(null);
    };

    // Fonction pour ouvrir le modal de création
    const handleNewPanel = () => {
        console.log("Opening new panel modal...");
        resetForm();
        setIsModalOpen(true);
    };

    // Fonction pour gérer un panel
    const handleManagePanel = (panel: Panel) => {
        // Vérifier que l'utilisateur est bien le créateur du panel
        if (panel.userRole !== 'créateur') {
            toast.error("Vous n'avez pas les droits pour gérer ce panel");
            return;
        }
        
        console.log("Managing panel:", panel);
        setManagePanelModal({ open: true, panel, mode: 'view' });
    };

    // Fonction pour éditer un panel
    const handleEditPanel = async (panel: Panel) => {
        console.log("Editing panel:", panel);
        
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

    // Fonction pour supprimer un panel
    const handleDeletePanel = (panel: Panel) => {
        setDeleteConfirmation({
            open: true,
            panelId: panel.id,
            panelTitle: panel.title
        });
        setManagePanelModal({ open: false, panel: null, mode: 'view' });
    };

    // Confirmation de suppression
    const confirmDeletePanel = async () => {
        if (!deleteConfirmation.panelId) return;
        
        try {
            await PanelService.deletePanel(deleteConfirmation.panelId);
            toast.success("Panel supprimé avec succès");
            setDeleteConfirmation({ open: false, panelId: null, panelTitle: "" });
            fetchData(); // Recharger les données
        } catch (error) {
            console.error("Error deleting panel:", error);
            toast.error("Erreur lors de la suppression du panel");
        }
    };

    // Fonction pour changer le statut d'un panel
    const updatePanelStatus = async (panelId: string, newStatus: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled') => {
        try {
            await PanelService.changePanelStatus(panelId, newStatus);
            toast.success("Statut du panel mis à jour");
            fetchData(); // Recharger les données
            // Mettre à jour le panel dans le modal si ouvert
            if (managePanelModal.panel?.id === panelId) {
                setManagePanelModal({
                    ...managePanelModal,
                    panel: { ...managePanelModal.panel, status: newStatus }
                });
            }
        } catch (error) {
            console.error("Error updating panel status:", error);
            toast.error("Erreur lors de la mise à jour du statut");
        }
    };

    // Fonction pour inviter les panélistes
    const handleInvitePanelists = async (panel: Panel) => {
        try {
            // Cette fonction nécessiterait l'accès aux données complètes du panel
            toast("Fonctionnalité d'invitation en cours de développement");
        } catch (error) {
            console.error("Error inviting panelists:", error);
            toast.error("Erreur lors de l'envoi des invitations");
        }
    };

    // Fonction pour fermer le modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    // Gestion des panélistes
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
            panelists: [
                ...panelForm.panelists,
                {
                    name: "",
                    email: "",
                    title: "",
                    topic: "",
                    duration: 15
                }
            ]
        });
    };

    const removePanelist = (index: number) => {
        if (panelForm.panelists.length > 1) {
            const newPanelists = [...panelForm.panelists];
            newPanelists.splice(index, 1);
            setPanelForm({...panelForm, panelists: newPanelists});
        }
    };

    // Fonction de soumission du formulaire
    const handleSubmit = async () => {
        if (!user?.id) {
            toast.error("Utilisateur non connecté");
            return;
        }

        // Validation des champs requis
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
            // Préparer les données avec les informations du modérateur
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
                panelists: panelForm.panelists.filter(p => p.name && p.email) // Filtrer les panélistes vides
            };

            if (editingPanelId) {
                // Mode édition : mettre à jour le panel existant
                console.log("Updating panel with ID:", editingPanelId, "Data:", panelData);
                await PanelService.updatePanel(editingPanelId, panelData);
                toast.success("Panel mis à jour avec succès!");
            } else {
                // Mode création : créer un nouveau panel
                console.log("Creating new panel with data:", panelData);
                await PanelService.createPanel(panelData);
                toast.success("Panel créé avec succès!");
            }
            
            handleCloseModal();
            
            // Recharger les données du dashboard
            fetchData();
            
        } catch (error) {
            console.error("Error saving panel:", error);
            if (editingPanelId) {
                toast.error("Erreur lors de la mise à jour du panel");
            } else {
                toast.error("Erreur lors de la création du panel");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fonction pour charger les données du dashboard
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Récupérer les données utilisateur
            const { data: { user: authUser } } = await supabase.auth.getUser();
            
            if (!authUser?.id) {
                throw new Error("Utilisateur non connecté");
            }

            const userEmail = authUser.email;
            
            // Récupérer TOUS les panels où l'utilisateur est impliqué
            const { data: allPanels } = await supabase
                .from('panels')
                .select('*')
                .order('date', { ascending: true });

            // 4bis. Récupérer les invitations explicites depuis panel_invitations
            let invitedPanelIds: string[] = [];
            const { data: invitations, error: invitationError } = await supabase
                .from('panel_invitations')
                .select('panel_id')
                .eq('panelist_email', userEmail)
                .eq('status', 'accepted');
            if (invitationError) {
                // Si la table n'existe pas (environnement de dev), on ignore l'erreur
                if (invitationError.code !== '42P01') {
                    console.error('Error fetching panel invitations:', invitationError);
                }
            } else {
                invitedPanelIds = invitations?.map(inv => inv.panel_id) || [];
            }

            // Filtrer les panels pour inclure :
            // 1. Panels créés par l'utilisateur
            // 2. Panels où l'utilisateur est panéliste
            // 3. Panels où l'utilisateur est invité
            // 4. Panels avec invitation explicite depuis 'panel_invitations'
            const userPanels = allPanels?.filter(panel => {
                // 1. Panels créés par l'utilisateur
                if (panel.user_id === authUser.id) {
                    return true;
                }
                
                // 2. Panels où l'utilisateur est panéliste
                if (panel.panelists && Array.isArray(panel.panelists)) {
                    const isPanelist = panel.panelists.some(panelist => 
                        panelist.email && panelist.email.toLowerCase() === userEmail?.toLowerCase()
                    );
                    if (isPanelist) {
                        return true;
                    }
                }
                
                // 3. Panels où l'utilisateur est modérateur
                if (panel.moderator_email && panel.moderator_email.toLowerCase() === userEmail?.toLowerCase()) {
                    return true;
                }
                
                // 4. Panels où l'utilisateur possède une invitation acceptée
                if (invitedPanelIds.includes(panel.id)) {
                    return true;
                }

                return false;
            }) || [];

            // Compter les questions pour chaque panel
            const panelsWithQuestions = await Promise.all(
                userPanels.map(async (panel) => {
                    const { count } = await supabase
                        .from('questions')
                        .select('*', { count: 'exact', head: true })
                        .eq('panel_id', panel.id);
                    
                    // Déterminer le rôle de l'utilisateur dans ce panel
                    let userRole = 'participant';
                    if (panel.user_id === authUser.id) {
                        userRole = 'créateur';
                    } else if (panel.panelists && Array.isArray(panel.panelists)) {
                        const isPanelist = panel.panelists.some(panelist => 
                            panelist.email && panelist.email.toLowerCase() === userEmail?.toLowerCase()
                        );
                        if (isPanelist) {
                            userRole = 'panéliste';
                        }
                    } else if (panel.moderator_email && panel.moderator_email.toLowerCase() === userEmail?.toLowerCase()) {
                        userRole = 'modérateur';
                    }
                    
                    return {
                        ...panel,
                        questions: count || 0,
                        userRole: userRole
                    };
                })
            );

            // Récupérer les panels du futur uniquement
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const futurePanels = panelsWithQuestions.filter(panel => {
                const panelDate = new Date(panel.date);
                return panelDate >= today;
            });

            // Récupérer les statistiques (seulement pour les panels créés par l'utilisateur)
            const { data: stats } = await supabase
                .rpc('get_user_stats', { user_id: authUser?.id });

            // Récupérer l'activité récente
            const { data: activities } = await supabase
                .from('activities')
                .select('*')
                .eq('user_id', authUser?.id)
                .order('created_at', { ascending: false })
                .limit(3);

            setUserData({
                name: authUser?.user_metadata?.full_name || userProfile.first_name || 'Utilisateur',
                nextPanel: futurePanels?.[0] || null,
                stats: stats || {
                    totalPanels: panelsWithQuestions.filter(p => p.user_id === authUser.id).length,
                    totalParticipants: 0,
                    avgRating: 0,
                    questionsAnswered: 0
                },
                upcomingPanels: futurePanels?.slice(0, 4) || [], // Augmenté à 4 pour voir plus de panels
                recentActivity: activities?.map(a => ({
                    action: a.action,
                    panel: a.panel_title,
                    time: `Il y a ${formatTimeAgo(a.created_at)}`
                })) || []
            });
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id]);

    if (loading) {
        return (
          <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Chargement des données du dashboard...</p>
          </div>
        );
    }

    return (
        <>
            <div className="space-y-4 px-4 py-4">
                {/* En-tête de bienvenue */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Bonjour, {userData.name}
                        </h1>
                        <p className="text-muted-foreground">
                            Voici un aperçu de vos activités de modération
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleNewPanel}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Nouveau Panel
                        </Button>
                    </div>
                </div>

                {/* Prochain panel */}
                {userData.nextPanel && (
                    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 w-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Prochain Panel
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        {userData.nextPanel.title}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(
                                                userData.nextPanel.date
                                            ).toLocaleDateString("fr-FR")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {userData.nextPanel.time}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge 
                                            variant="outline"
                                            className={
                                                userData.nextPanel.userRole === 'créateur' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                userData.nextPanel.userRole === 'panéliste' ? "bg-green-50 text-green-700 border-green-200" :
                                                userData.nextPanel.userRole === 'modérateur' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                "bg-gray-50 text-gray-700 border-gray-200"
                                            }
                                        >
                                            Vous êtes {userData.nextPanel.userRole}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                        <Button variant="outline" onClick={() => {
                                            window.location.href = `/panel-questions?panel=${userData.nextPanel.id}`;
                                        }}>
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Questions ({userData.nextPanel?.questions || 0})
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

            {/* Modal de gestion de panel */}
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
                                    variant={managePanelModal.panel.status === "scheduled" ? "default" : "secondary"}
                                >
                                    {managePanelModal.panel.status === "scheduled" ? "Confirmé" : "Brouillon"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Informations du panel */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Titre</Label>
                                        <p className="text-lg font-semibold">{managePanelModal.panel.title}</p>
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
                                        <Label className="text-sm font-medium text-muted-foreground">Participants</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold">{managePanelModal.panel.participants}</span>
                                            <span className="text-muted-foreground">inscrits</span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Questions</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold">{managePanelModal.panel.questions || 0}</span>
                                            <span className="text-muted-foreground">questions soumises</span>
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
                                        <Settings className="h-4 w-4" />
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
                                        onClick={() => handleInvitePanelists(managePanelModal.panel!)}
                                        className="flex items-center gap-2"
                                    >
                                        <Users className="h-4 w-4" />
                                        Inviter
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeletePanel(managePanelModal.panel!)}
                                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        Supprimer
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
                            {/* Actions principales */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setManagePanelModal({ open: false, panel: null, mode: 'view' })}
                                >
                                    Fermer
                                </Button>
                                {/* <Button
                                    onClick={() => {
                                        window.location.href = `/panel/${managePanelModal.panel!.id}`;
                                    }}
                                >
                                    Accéder au panel
                                </Button> */}
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
                            <CardTitle className="text-red-600">Confirmer la suppression</CardTitle>
                            <CardDescription>
                                Êtes-vous sûr de vouloir supprimer le panel <strong>"{deleteConfirmation.panelTitle}"</strong> ?
                                <br />
                                <span className="text-red-500 text-sm">Cette action est irréversible.</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmation({ open: false, panelId: null, panelTitle: "" })}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDeletePanel}
                            >
                                Supprimer définitivement
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

                {/* Statistiques */}
                <div className="grid gap-4 md:grid-cols-4 w-full">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Panels Modérés
                            </CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {userData.stats.totalPanels}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                +2 ce mois
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Participants Total
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {userData.stats.totalParticipants.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                +180 ce mois
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Note Moyenne
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ⭐ {userData.stats.avgRating}
                            </div>
                            <p className="text-xs text-muted-foreground">/5.0</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Questions Traitées
                            </CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {userData.stats.questionsAnswered}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                +24 cette semaine
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Panels à venir et activité récente */}
                <div className="grid gap-4 md:grid-cols-2 w-full">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mes panels à venir</CardTitle>
                            <CardDescription>
                                Vos prochaines sessions (modérateur, panéliste)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {userData.upcomingPanels.length > 0 ? (
                                    userData.upcomingPanels.map(panel => (
                                        <div
                                            key={panel.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div>
                                                <h4 className="font-medium">
                                                    {panel.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(
                                                        panel.date
                                                    ).toLocaleDateString("fr-FR")}{" "}
                                                    à {panel.time}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge
                                                        variant={
                                                            panel.status === "draft" ? "secondary" :
                                                            panel.status === "scheduled" ? "default" :
                                                            panel.status === "live" ? "destructive" :
                                                            panel.status === "completed" ? "default" : "destructive"
                                                        }
                                                    >
                                                        {panel.status === "draft" ? "Brouillon" :
                                                         panel.status === "scheduled" ? "Confirmé" :
                                                         panel.status === "live" ? "En direct" :
                                                         panel.status === "completed" ? "Terminé" : "Annulé"}
                                                    </Badge>
                                                    <Badge 
                                                        variant="outline"
                                                        className={
                                                            panel.userRole === 'créateur' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            panel.userRole === 'panéliste' ? "bg-green-50 text-green-700 border-green-200" :
                                                            panel.userRole === 'modérateur' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                            "bg-gray-50 text-gray-700 border-gray-200"
                                                        }
                                                    >
                                                        {panel.userRole}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {panel.userRole === 'créateur' && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleManagePanel(panel)}
                                                    >
                                                        Gérer
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>Aucun panel à venir</p>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="mt-2"
                                            onClick={handleNewPanel}
                                        >
                                            Créer un panel
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Activité Récente</CardTitle>
                            <CardDescription>
                                Dernières actions sur vos panels
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {userData.recentActivity.length > 0 ? (
                                    userData.recentActivity.map(
                                        (activity, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start space-x-3"
                                            >
                                                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {activity.action}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {activity.panel}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {activity.time}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>Aucune activité récente</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de création de panel */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>
                                {editingPanelId ? "Modifier le panel" : "Créer un nouveau panel"}
                            </CardTitle>
                            <CardDescription>
                                {editingPanelId 
                                    ? "Modifiez les informations de votre panel de discussion"
                                    : "Remplissez les informations pour créer votre panel de discussion"
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Informations de base */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Titre *</Label>
                                    <Input
                                        id="title"
                                        value={panelForm.title}
                                        onChange={(e) => setPanelForm({...panelForm, title: e.target.value})}
                                        placeholder="Ex: Discussion sur l'IA en 2024"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Catégorie</Label>
                                    <Input
                                        id="category"
                                        value={panelForm.category}
                                        onChange={(e) => setPanelForm({...panelForm, category: e.target.value})}
                                        placeholder="Ex: Technologie"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={panelForm.description}
                                    onChange={(e) => setPanelForm({...panelForm, description: e.target.value})}
                                    placeholder="Décrivez le sujet et les objectifs de votre panel..."
                                    rows={3}
                                />
                            </div>

                            {/* Date et heure */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={panelForm.date}
                                        onChange={(e) => setPanelForm({...panelForm, date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time">Heure *</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={panelForm.time}
                                        onChange={(e) => setPanelForm({...panelForm, time: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Durée (minutes)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={panelForm.duration}
                                        onChange={(e) => setPanelForm({...panelForm, duration: parseInt(e.target.value) || 60})}
                                        min="15"
                                        max="480"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="participants_limit">Nombre maximum de participants</Label>
                                <Input
                                    id="participants_limit"
                                    type="number"
                                    value={panelForm.participants_limit}
                                    onChange={(e) => setPanelForm({...panelForm, participants_limit: parseInt(e.target.value) || 30})}
                                    min="1"
                                    max="1000"
                                />
                            </div>

                            {/* Panélistes */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Panélistes (optionnel)</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addPanelist}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Ajouter un panéliste
                                    </Button>
                                </div>
                                
                                <div className="space-y-4">
                                    {panelForm.panelists.map((panelist, index) => (
                                        <Card key={index} className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Nom complet</Label>
                                                    <Input
                                                        value={panelist.name}
                                                        onChange={(e) => handlePanelistChange(index, 'name', e.target.value)}
                                                        placeholder="Nom du panéliste"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Email</Label>
                                                    <Input
                                                        value={panelist.email}
                                                        onChange={(e) => handlePanelistChange(index, 'email', e.target.value)}
                                                        placeholder="email@example.com"
                                                        type="email"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Titre/Fonction</Label>
                                                    <Input
                                                        value={panelist.title}
                                                        onChange={(e) => handlePanelistChange(index, 'title', e.target.value)}
                                                        placeholder="Ex: Expert en IA"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Durée (minutes)</Label>
                                                    <Input
                                                        value={panelist.duration}
                                                        onChange={(e) => handlePanelistChange(index, 'duration', parseInt(e.target.value) || 15)}
                                                        type="number"
                                                        min="5"
                                                        max="120"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-2">
                                                    <Label>Sujet à aborder</Label>
                                                    <Input
                                                        value={panelist.topic}
                                                        onChange={(e) => handlePanelistChange(index, 'topic', e.target.value)}
                                                        placeholder="Ex: L'impact de l'IA sur l'emploi"
                                                    />
                                                </div>
                                            </div>
                                            {panelForm.panelists.length > 1 && (
                                                <div className="mt-4 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => removePanelist(index)}
                                                    >
                                                        Supprimer ce panéliste
                                                    </Button>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                            {editingPanelId ? "Mise à jour..." : "Création..."}
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {editingPanelId ? "Mettre à jour le panel" : "Créer le panel"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}