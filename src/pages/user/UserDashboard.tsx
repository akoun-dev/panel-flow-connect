import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PanelService } from "@/services/panelService"
import { logger } from "@/lib/logger"
import { useUser } from "@/hooks/useUser"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Calendar,
    Users,
    MessageSquare,
    Clock,
    Plus,
    Settings,
    BarChart3,
    Play,
    Edit,
    Trash2,
    Eye,
    Mail,
    Copy,
    Share2,
    Download,
    Archive,
    Zap,
    TrendingUp,
    Award,
    RefreshCw,
    MoreHorizontal,
    Filter,
    Grid,
    List,
    Search,
    X,
    CheckCircle,
    AlertCircle,
    PieChart,
    ExternalLink,
    QrCode,
    Send,
    Bell,
    Star,
    Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { InvitePanelistsModal } from "@/components/panels/InvitePanelistsModal"
import { PanelQRCode } from "@/components/panels/PanelQRCode"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Panel {
    id: string
    title: string
    date: string
    time: string
    status: "draft" | "scheduled" | "live" | "completed" | "cancelled"
    participants: number
    questions?: number
    userRole?: string
    description?: string
    category?: string
    duration?: number
    participants_limit?: number
    panelists?: any[]
    tags?: string[]
}

interface Activity {
    action: string
    panel: string
    time: string
}

interface Stats {
    totalPanels: number
    totalParticipants: number
    avgRating: number
    questionsAnswered: number
}

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    )

    if (diffInHours < 24) return `${diffInHours}h`
    return `${Math.floor(diffInHours / 24)}j`
}

const statusConfig = {
    draft: {
        label: "Brouillon",
        color: "bg-slate-100 text-slate-700 border-slate-200",
        dotColor: "bg-slate-400",
    },
    scheduled: {
        label: "Programmé",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        dotColor: "bg-blue-500",
    },
    live: {
        label: "En cours",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    completed: {
        label: "Terminé",
        color: "bg-purple-100 text-purple-700 border-purple-200",
        dotColor: "bg-purple-500",
    },
    cancelled: {
        label: "Annulé",
        color: "bg-red-100 text-red-700 border-red-200",
        dotColor: "bg-red-500",
    },
}

export function UserDashboard() {
    const { user } = useUser()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // États des modals
    const [inviteModal, setInviteModal] = useState<{
        open: boolean
        panel: Panel | null
    }>({ open: false, panel: null })
    const [managePanelModal, setManagePanelModal] = useState<{
        open: boolean
        panel: Panel | null
        mode: "view" | "edit"
    }>({ open: false, panel: null, mode: "view" })
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        open: boolean
        panelId: string | null
        panelTitle: string
    }>({ open: false, panelId: null, panelTitle: "" })
    const [shareModal, setShareModal] = useState<{
        open: boolean
        panel: Panel | null
    }>({ open: false, panel: null })

    // États de filtrage
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [filterStatus, setFilterStatus] = useState("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set())

    const [userProfile, setUserProfile] = useState<{
        first_name?: string
        last_name?: string
        email?: string
    }>({})

    const [panelForm, setPanelForm] = useState({
        title: "",
        description: "",
        date: "",
        time: "",
        duration: 60,
        participants_limit: 30,
        category: "Technologie",
        panelists: [
            {
                name: "",
                email: "",
                title: "",
                topic: "",
                duration: 15,
            },
        ],
    })

    const [userData, setUserData] = useState({
        name: "",
        nextPanel: null as Panel | null,
        stats: {
            totalPanels: 0,
            totalParticipants: 0,
            avgRating: 0,
            questionsAnswered: 0,
        } as Stats,
        upcomingPanels: [] as Panel[],
        recentActivity: [] as Activity[],
    })

    // Panels filtrés et triés
    const filteredPanels = useMemo(() => {
        return userData.upcomingPanels.filter(panel => {
            const matchesStatus =
                filterStatus === "all" || panel.status === filterStatus
            const matchesSearch =
                panel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                panel.description
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
            return matchesStatus && matchesSearch
        })
    }, [userData.upcomingPanels, filterStatus, searchTerm])

    // Statistiques calculées
    const panelStats = useMemo(() => {
        const total = userData.upcomingPanels.length
        const byStatus = {
            live: userData.upcomingPanels.filter(p => p.status === "live")
                .length,
            scheduled: userData.upcomingPanels.filter(
                p => p.status === "scheduled"
            ).length,
            completed: userData.upcomingPanels.filter(
                p => p.status === "completed"
            ).length,
            draft: userData.upcomingPanels.filter(p => p.status === "draft")
                .length,
        }
        const totalQuestions = userData.upcomingPanels.reduce(
            (sum, p) => sum + (p.questions || 0),
            0
        )

        return {
            total,
            byStatus,
            totalQuestions,
            averageQuestions:
                total > 0 ? Math.round(totalQuestions / total) : 0,
        }
    }, [userData.upcomingPanels])

    // Charger le profil utilisateur
    useEffect(() => {
        const loadUserProfile = async () => {
            if (!user?.id) return

            try {
                const { data, error } = await supabase
                    .from("users")
                    .select("first_name, last_name, email")
                    .eq("id", user.id)
                    .single()

                if (error) throw error
                setUserProfile(data)
            } catch (error) {
                console.error("Failed to load user profile", error)
            }
        }

        loadUserProfile()
    }, [user?.id])

    // Fonction pour charger les données du dashboard
    const fetchData = useCallback(
        async (showRefresh = false) => {
            try {
                if (showRefresh) setIsRefreshing(true)
                else setLoading(true)

                // Récupérer les données utilisateur
                const {
                    data: { user: authUser },
                } = await supabase.auth.getUser()

                if (!authUser?.id) {
                    throw new Error("Utilisateur non connecté")
                }

                const userEmail = authUser.email

                // Récupérer TOUS les panels où l'utilisateur est impliqué
                const { data: allPanels } = await supabase
                    .from("panels")
                    .select("*")
                    .order("date", { ascending: true })

                // Récupérer les invitations explicites depuis panel_invitations
                let invitedPanelIds: string[] = []
                const { data: invitations, error: invitationError } =
                    await supabase
                        .from("panel_invitations")
                        .select("panel_id")
                        .eq("panelist_email", userEmail)
                        .eq("status", "accepted")
                if (invitationError) {
                    if (invitationError.code !== "42P01") {
                        console.error(
                            "Error fetching panel invitations:",
                            invitationError
                        )
                    }
                } else {
                    invitedPanelIds =
                        invitations?.map(inv => inv.panel_id) || []
                }

                // Filtrer les panels pour inclure ceux où l'utilisateur est impliqué
                const userPanels =
                    allPanels?.filter(panel => {
                        if (panel.user_id === authUser.id) return true

                        if (panel.panelists && Array.isArray(panel.panelists)) {
                            const isPanelist = panel.panelists.some(
                                panelist =>
                                    panelist.email &&
                                    panelist.email.toLowerCase() ===
                                        userEmail?.toLowerCase()
                            )
                            if (isPanelist) return true
                        }

                        if (
                            panel.moderator_email &&
                            panel.moderator_email.toLowerCase() ===
                                userEmail?.toLowerCase()
                        ) {
                            return true
                        }

                        if (invitedPanelIds.includes(panel.id)) {
                            return true
                        }

                        return false
                    }) || []

                // Compter les questions pour chaque panel
                const panelsWithQuestions = await Promise.all(
                    userPanels.map(async panel => {
                        const { count } = await supabase
                            .from("questions")
                            .select("*", { count: "exact", head: true })
                            .eq("panel_id", panel.id)

                        // Déterminer le rôle de l'utilisateur dans ce panel
                        let userRole = "participant"
                        if (panel.user_id === authUser.id) {
                            userRole = "créateur"
                        } else if (
                            panel.panelists &&
                            Array.isArray(panel.panelists)
                        ) {
                            const isPanelist = panel.panelists.some(
                                panelist =>
                                    panelist.email &&
                                    panelist.email.toLowerCase() ===
                                        userEmail?.toLowerCase()
                            )
                            if (isPanelist) {
                                userRole = "panéliste"
                            }
                        } else if (
                            panel.moderator_email &&
                            panel.moderator_email.toLowerCase() ===
                                userEmail?.toLowerCase()
                        ) {
                            userRole = "modérateur"
                        }

                        return {
                            ...panel,
                            questions: count || 0,
                            userRole: userRole,
                        }
                    })
                )

                // Récupérer les panels du futur uniquement
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const futurePanels = panelsWithQuestions.filter(panel => {
                    const panelDate = new Date(panel.date)
                    return panelDate >= today
                })

                // Récupérer les statistiques
                const { data: stats } = await supabase.rpc("get_user_stats", {
                    user_id: authUser?.id,
                })

                // Récupérer l'activité récente
                const { data: activities } = await supabase
                    .from("activities")
                    .select("*")
                    .eq("user_id", authUser?.id)
                    .order("created_at", { ascending: false })
                    .limit(5)

                setUserData({
                    name:
                        authUser?.user_metadata?.full_name ||
                        userProfile.first_name ||
                        "Utilisateur",
                    nextPanel: futurePanels?.[0] || null,
                    stats: stats || {
                        totalPanels: panelsWithQuestions.filter(
                            p => p.user_id === authUser.id
                        ).length,
                        totalParticipants: 0,
                        avgRating: 0,
                        questionsAnswered: 0,
                    },
                    upcomingPanels: futurePanels || [],
                    recentActivity:
                        activities?.map(a => ({
                            action: a.action,
                            panel: a.panel_title,
                            time: `Il y a ${formatTimeAgo(a.created_at)}`,
                        })) || [],
                })
            } catch (error) {
                console.error("Error fetching data:", error)
                toast.error("Erreur lors du chargement des données")
            } finally {
                setLoading(false)
                setIsRefreshing(false)
            }
        },
        [userProfile.first_name]
    )

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Fonctions de gestion des actions
    const resetForm = useCallback(() => {
        setPanelForm({
            title: "",
            description: "",
            date: "",
            time: "",
            duration: 60,
            participants_limit: 30,
            category: "Technologie",
            panelists: [
                {
                    name: "",
                    email: "",
                    title: "",
                    topic: "",
                    duration: 15,
                },
            ],
        })
        setEditingPanelId(null)
        setHasUnsavedChanges(false)
    }, [])

    const handleNewPanel = useCallback(() => {
        logger.debug("Opening new panel modal...")
        resetForm()
        setIsModalOpen(true)
    }, [resetForm])

    const handleManagePanel = useCallback((panel: Panel) => {
        if (panel.userRole !== "créateur") {
            toast.error("Vous n'avez pas les droits pour gérer ce panel")
            return
        }

        logger.debug("Managing panel:", panel)
        setManagePanelModal({ open: true, panel, mode: "view" })
    }, [])

    const handleEditPanel = useCallback(async (panel: Panel) => {
        logger.debug("Editing panel:", panel)

        try {
            const { data: fullPanelData, error } = await supabase
                .from("panels")
                .select("*")
                .eq("id", panel.id)
                .single()

            if (error) throw error

            setPanelForm({
                title: fullPanelData.title || "",
                description: fullPanelData.description || "",
                date: fullPanelData.date || "",
                time: fullPanelData.time || "",
                duration: fullPanelData.duration || 60,
                participants_limit: fullPanelData.participants_limit || 30,
                category: fullPanelData.category || "Technologie",
                panelists:
                    fullPanelData.panelists &&
                    fullPanelData.panelists.length > 0
                        ? fullPanelData.panelists
                        : [
                              {
                                  name: "",
                                  email: "",
                                  title: "",
                                  topic: "",
                                  duration: 15,
                              },
                          ],
            })

            setEditingPanelId(panel.id)
            setManagePanelModal({ open: false, panel: null, mode: "view" })
            setIsModalOpen(true)
        } catch (error) {
            console.error("Error loading panel data for editing:", error)
            toast.error("Erreur lors du chargement des données du panel")
        }
    }, [])

    const handleDeletePanel = useCallback((panel: Panel) => {
        setDeleteConfirmation({
            open: true,
            panelId: panel.id,
            panelTitle: panel.title,
        })
        setManagePanelModal({ open: false, panel: null, mode: "view" })
    }, [])

    const confirmDeletePanel = useCallback(async () => {
        if (!deleteConfirmation.panelId) return

        try {
            await PanelService.deletePanel(deleteConfirmation.panelId)
            toast.success("Panel supprimé avec succès")
            setDeleteConfirmation({
                open: false,
                panelId: null,
                panelTitle: "",
            })
            fetchData(true)
        } catch (error) {
            console.error("Error deleting panel:", error)
            toast.error("Erreur lors de la suppression du panel")
        }
    }, [deleteConfirmation.panelId, fetchData])

    const updatePanelStatus = useCallback(
        async (
            panelId: string,
            newStatus:
                | "draft"
                | "scheduled"
                | "live"
                | "completed"
                | "cancelled"
        ) => {
            try {
                await PanelService.changePanelStatus(panelId, newStatus)
                toast.success("Statut du panel mis à jour")
                fetchData(true)

                if (managePanelModal.panel?.id === panelId) {
                    setManagePanelModal({
                        ...managePanelModal,
                        panel: { ...managePanelModal.panel, status: newStatus },
                    })
                }
            } catch (error) {
                console.error("Error updating panel status:", error)
                toast.error("Erreur lors de la mise à jour du statut")
            }
        },
        [managePanelModal, fetchData]
    )

    const handleInvitePanelists = useCallback((panel: Panel) => {
        setInviteModal({ open: true, panel })
    }, [])

    const handleSharePanel = useCallback((panel: Panel) => {
        setShareModal({ open: true, panel })
    }, [])

    const handleCopyLink = useCallback(async (panel: Panel) => {
        try {
            const url = `${window.location.origin}/panel/${panel.id}`
            await navigator.clipboard.writeText(url)
            toast.success("Lien copié dans le presse-papiers")
        } catch (error) {
            toast.error("Erreur lors de la copie du lien")
        }
    }, [])

    const handleExportPanel = useCallback((panel: Panel) => {
        toast.success(`Export du panel "${panel.title}" en cours...`)
    }, [])

    const handleDuplicatePanel = useCallback((panel: Panel) => {
        toast.success(`Duplication du panel "${panel.title}" en cours...`)
    }, [])

    // Actions groupées
    const handleBulkAction = useCallback(
        (action: "export" | "archive" | "delete") => {
            if (selectedPanels.size === 0) return

            switch (action) {
                case "export":
                    toast.success(
                        `Export en cours pour ${selectedPanels.size} panel(s)`
                    )
                    break
                case "archive":
                    toast.success(
                        `Archivage en cours pour ${selectedPanels.size} panel(s)`
                    )
                    break
                case "delete":
                    const confirmDelete = window.confirm(
                        `Êtes-vous sûr de vouloir supprimer ${selectedPanels.size} panel(s) ?`
                    )
                    if (confirmDelete) {
                        toast.success(
                            `Suppression en cours pour ${selectedPanels.size} panel(s)`
                        )
                    }
                    break
            }
            setSelectedPanels(new Set())
        },
        [selectedPanels]
    )

    const togglePanelSelection = useCallback((panelId: string) => {
        setSelectedPanels(prev => {
            const newSet = new Set(prev)
            if (newSet.has(panelId)) {
                newSet.delete(panelId)
            } else {
                newSet.add(panelId)
            }
            return newSet
        })
    }, [])

    // Gestion des panélistes
    const handlePanelistChange = useCallback(
        (
            index: number,
            field: "name" | "email" | "title" | "topic" | "duration",
            value: string | number
        ) => {
            const newPanelists = [...panelForm.panelists]
            newPanelists[index] = {
                ...newPanelists[index],
                [field]: value,
            }
            setPanelForm({ ...panelForm, panelists: newPanelists })
            setHasUnsavedChanges(true)
        },
        [panelForm]
    )

    const addPanelist = useCallback(() => {
        setPanelForm({
            ...panelForm,
            panelists: [
                ...panelForm.panelists,
                {
                    name: "",
                    email: "",
                    title: "",
                    topic: "",
                    duration: 15,
                },
            ],
        })
        setHasUnsavedChanges(true)
    }, [panelForm])

    const removePanelist = useCallback(
        (index: number) => {
            if (panelForm.panelists.length > 1) {
                const newPanelists = [...panelForm.panelists]
                newPanelists.splice(index, 1)
                setPanelForm({ ...panelForm, panelists: newPanelists })
                setHasUnsavedChanges(true)
            }
        },
        [panelForm]
    )

    const handleCloseModal = useCallback(() => {
        if (hasUnsavedChanges) {
            const confirmClose = window.confirm(
                "Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?"
            )
            if (!confirmClose) return
        }

        setIsModalOpen(false)
        resetForm()
    }, [hasUnsavedChanges, resetForm])

    const handleSubmit = useCallback(async () => {
        if (!user?.id) {
            toast.error("Utilisateur non connecté")
            return
        }

        if (!panelForm.title.trim()) {
            toast.error("Le titre est requis")
            return
        }

        if (!panelForm.date) {
            toast.error("La date est requise")
            return
        }

        if (!panelForm.time) {
            toast.error("L'heure est requise")
            return
        }

        setIsSubmitting(true)

        try {
            const moderatorName =
                `${userProfile.first_name || ""} ${
                    userProfile.last_name || ""
                }`.trim() || "Modérateur"
            const moderatorEmail = userProfile.email || user.email || ""

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
                panelists: panelForm.panelists.filter(p => p.name && p.email),
            }

            if (editingPanelId) {
                logger.debug(
                    "Updating panel with ID:",
                    editingPanelId,
                    "Data:",
                    panelData
                )
                await PanelService.updatePanel(editingPanelId, panelData)
                toast.success("Panel mis à jour avec succès!")
            } else {
                logger.debug("Creating new panel with data:", panelData)
                await PanelService.createPanel(panelData)
                toast.success("Panel créé avec succès!")
            }

            handleCloseModal()
            fetchData(true)
        } catch (error) {
            console.error("Error saving panel:", error)
            if (editingPanelId) {
                toast.error("Erreur lors de la mise à jour du panel")
            } else {
                toast.error("Erreur lors de la création du panel")
            }
        } finally {
            setIsSubmitting(false)
        }
    }, [
        user,
        userProfile,
        panelForm,
        editingPanelId,
        handleCloseModal,
        fetchData,
    ])

    // Composants
    const getPriorityBadge = (panel: Panel) => {
        if (panel.status === "live")
            return {
                label: "En direct",
                color: "bg-red-100 text-red-700",
                icon: Zap,
            }
        if ((panel.questions || 0) >= 10)
            return {
                label: "Actif",
                color: "bg-blue-100 text-blue-700",
                icon: TrendingUp,
            }
        return null
    }

    const PanelCard = ({ panel }: { panel: Panel }) => {
        const statusInfo =
            statusConfig[panel.status as keyof typeof statusConfig]
        const priority = getPriorityBadge(panel)
        const isSelected = selectedPanels.has(panel.id)

        return (
            <Card
                className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-1 ${
                    isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                }`}
            >
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
                                            <priority.icon className="w-3 h-3 mr-1" />
                                            {priority.label}
                                        </Badge>
                                    )}
                                    <Badge
                                        variant="outline"
                                        className={
                                            panel.userRole === "créateur"
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : panel.userRole === "panéliste"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : panel.userRole ===
                                                  "modérateur"
                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                : "bg-gray-50 text-gray-700 border-gray-200"
                                        }
                                    >
                                        {panel.userRole}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {panel.title}
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600 line-clamp-2 mt-1">
                                    {panel.description}
                                </CardDescription>

                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(
                                            panel.date
                                        ).toLocaleDateString("fr-FR")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {panel.time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {panel.questions || 0} questions
                                    </span>
                                </div>
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
                            <DropdownMenuContent align="end" className="w-56">
                                {panel.userRole === "panéliste" ? (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            navigate(`/panel-questions?panel=${panel.id}`)
                                        }}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Questions
                                    </DropdownMenuItem>
                                ) : (
                                    <>
                                        <DropdownMenuLabel>
                                            Actions principales
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleManagePanel(panel)
                                            }
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Voir détails
                                        </DropdownMenuItem>
                                        {panel.userRole === "créateur" && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleEditPanel(panel)
                                                }
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Modifier
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>
                                            Navigation
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                navigate(`/panel-questions?panel=${panel.id}`)
                                            }}
                                        >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Questions ({panel.questions || 0})
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                navigate(`/panel/${panel.id}/polls`)
                                            }}
                                        >
                                            <BarChart3 className="h-4 w-4 mr-2" />
                                            Sondages
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                navigate(`/panel/${panel.id}/projection`)
                                            }}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Mode projection
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>
                                            Collaboration
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleInvitePanelists(panel)
                                            }
                                        >
                                            <Mail className="h-4 w-4 mr-2" />
                                            Inviter des panélistes
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleSharePanel(panel)
                                            }
                                        >
                                            <Share2 className="h-4 w-4 mr-2" />
                                            Partager le panel
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleCopyLink(panel)
                                            }
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copier le lien
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>
                                            Outils
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleExportPanel(panel)
                                            }
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Exporter les données
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleDuplicatePanel(panel)
                                            }
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Dupliquer le panel
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {panel.userRole === "créateur" && (
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() =>
                                                    handleDeletePanel(panel)
                                                }
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Supprimer
                                            </DropdownMenuItem>
                                        )}
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <div className="flex gap-2 pt-2 border-t">
                        {panel.userRole !== "panéliste" && (
                            <Button
                                size="sm"
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleManagePanel(panel)}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Gérer
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                navigate(`/panel-questions?panel=${panel.id}`)
                            }}
                            className={
                                panel.userRole === "panéliste" ? "flex-1" : ""
                            }
                        >
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                        {panel.userRole !== "panéliste" && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSharePanel(panel)}
                            >
                                <Share2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (loading) {
        return (
            <div className="space-y-6 px-4 py-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6 px-4 py-4">
                {/* En-tête de bienvenue */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Bonjour, {userData.name}
                        </h1>
                        <p className="text-muted-foreground">
                            Voici un aperçu de vos activités de modération
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
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => fetchData(true)}
                            disabled={isRefreshing}
                        >
                            <RefreshCw
                                className={`h-4 w-4 mr-2 ${
                                    isRefreshing ? "animate-spin" : ""
                                }`}
                            />
                            Actualiser
                        </Button>
                        <Button onClick={handleNewPanel}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nouveau Panel
                        </Button>
                    </div>
                </div>

                {/* Prochain panel */}
                {userData.nextPanel && (
                    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 w-full border-0 shadow-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-orange-500" />
                                    Prochain Panel
                                </CardTitle>
                                <div className="flex gap-2">
                                    {userData.nextPanel.userRole !==
                                        "panéliste" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleManagePanel(
                                                    userData.nextPanel!
                                                )
                                            }
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Gérer
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            navigate(
                                                `/panel-questions?panel=${userData.nextPanel!.id}`
                                            )
                                        }}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Questions (
                                        {userData.nextPanel?.questions || 0})
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            navigate(
                                                `/panel/${userData.nextPanel!.id}/session`
                                            )
                                        }}
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        Ma session (
                                        {userData.nextPanel?.questions || 0})
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        {userData.nextPanel.title}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
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
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className={
                                                userData.nextPanel.userRole ===
                                                "créateur"
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : userData.nextPanel
                                                          .userRole ===
                                                      "panéliste"
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : userData.nextPanel
                                                          .userRole ===
                                                      "modérateur"
                                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                            }
                                        >
                                            Vous êtes{" "}
                                            {userData.nextPanel.userRole}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end">
                                    <div className="flex gap-2">
                                        {userData.nextPanel.userRole !==
                                            "panéliste" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigate(
                                                            `/panel/${userData.nextPanel!.id}/projection`
                                                        )
                                                    }}
                                                >
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Projection
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigate(
                                                            `/panel/${userData.nextPanel!.id}/polls`
                                                        )
                                                    }}
                                                >
                                                    <BarChart3 className="h-4 w-4 mr-2" />
                                                    Sondages
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleInvitePanelists(
                                                            userData.nextPanel!
                                                        )
                                                    }
                                                >
                                                    <Mail className="h-4 w-4 mr-2" />
                                                    Inviter
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Statistiques */}
                <div className="grid gap-4 md:grid-cols-4 w-full">
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
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

                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
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

                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Note Moyenne
                            </CardTitle>
                            <Star className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ⭐ {userData.stats.avgRating}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                /5.0
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
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

                {/* Contrôles et filtres pour les panels */}
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4 items-center">
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
                                value={filterStatus}
                                onValueChange={setFilterStatus}
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Filtrer par statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Tous les statuts
                                    </SelectItem>
                                    <SelectItem value="scheduled">
                                        Programmés
                                    </SelectItem>
                                    <SelectItem value="live">
                                        En cours
                                    </SelectItem>
                                    <SelectItem value="draft">
                                        Brouillons
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        Terminés
                                    </SelectItem>
                                </SelectContent>
                            </Select>

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

                            {(filterStatus !== "all" || searchTerm) && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setFilterStatus("all")
                                        setSearchTerm("")
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Effacer
                                </Button>
                            )}
                        </div>

                        {/* Sélection groupée */}
                        {selectedPanels.size > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-800 font-medium">
                                        {selectedPanels.size} panel(s)
                                        sélectionné(s)
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleBulkAction("export")
                                            }
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Exporter
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleBulkAction("archive")
                                            }
                                        >
                                            <Archive className="h-4 w-4 mr-2" />
                                            Archiver
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                handleBulkAction("delete")
                                            }
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Supprimer
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setSelectedPanels(new Set())
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Mes panels - Liste complète */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Mes panels ({filteredPanels.length})
                        </h2>
                    </div>

                    {filteredPanels.length === 0 ? (
                        <Card className="border-0 shadow-lg">
                            <CardContent className="text-center py-12">
                                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {searchTerm || filterStatus !== "all"
                                        ? "Aucun panel trouvé"
                                        : "Aucun panel à venir"}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {searchTerm || filterStatus !== "all"
                                        ? "Modifiez vos critères de recherche ou créez un nouveau panel"
                                        : "Commencez par créer votre premier panel de discussion"}
                                </p>
                                <div className="flex gap-3 justify-center">
                                    {(searchTerm || filterStatus !== "all") && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSearchTerm("")
                                                setFilterStatus("all")
                                            }}
                                        >
                                            Réinitialiser les filtres
                                        </Button>
                                    )}
                                    <Button onClick={handleNewPanel}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Créer un panel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div
                            className={
                                viewMode === "grid"
                                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                    : "space-y-4"
                            }
                        >
                            {filteredPanels.map(panel => (
                                <PanelCard key={panel.id} panel={panel} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Activité récente */}
                <Card className="border-0 shadow-lg">
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

            {/* Modal de gestion de panel */}
            {managePanelModal.open && managePanelModal.panel && (
                <Dialog
                    open={managePanelModal.open}
                    onOpenChange={open =>
                        setManagePanelModal({ open, panel: null, mode: "view" })
                    }
                >
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-xl">
                                        Gestion du Panel
                                    </DialogTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {managePanelModal.panel.title}
                                    </p>
                                </div>
                                <Badge
                                    variant={
                                        managePanelModal.panel.status ===
                                        "scheduled"
                                            ? "default"
                                            : "secondary"
                                    }
                                >
                                    {
                                        statusConfig[
                                            managePanelModal.panel
                                                .status as keyof typeof statusConfig
                                        ]?.label
                                    }
                                </Badge>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Informations du panel */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
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
                                            Description
                                        </Label>
                                        <p className="text-sm text-gray-700">
                                            {managePanelModal.panel.description}
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
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
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
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">
                                                Panélistes
                                            </Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-semibold">
                                                    {managePanelModal.panel
                                                        .panelists?.length || 0}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    invités
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">
                                            QR Code
                                        </Label>
                                        <div className="flex justify-center mt-2">
                                            <PanelQRCode
                                                panel={managePanelModal.panel}
                                                size={150}
                                            />
                                        </div>
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
                                            navigate(
                                                `/panel-questions?panel=${managePanelModal.panel!.id}`
                                            )
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
                                            navigate(
                                                `/panel/${managePanelModal.panel!.id}/projection`
                                            )
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
                                            navigate(
                                                `/panel/${managePanelModal.panel!.id}/polls`
                                            )
                                        }}
                                        className="flex items-center gap-2"
                                    >
                                        <BarChart3 className="h-4 w-4" />
                                        Sondages
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
                                            handleSharePanel(
                                                managePanelModal.panel!
                                            )
                                        }
                                        className="flex items-center gap-2"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        Partager
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleExportPanel(
                                                managePanelModal.panel!
                                            )
                                        }
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Exporter
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleDuplicatePanel(
                                                managePanelModal.panel!
                                            )
                                        }
                                        className="flex items-center gap-2"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Dupliquer
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
                                                    managePanelModal.panel!.id,
                                                    "scheduled"
                                                )
                                            }
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Confirmer le panel
                                        </Button>
                                    ) : managePanelModal.panel.status ===
                                      "scheduled" ? (
                                        <>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() =>
                                                    updatePanelStatus(
                                                        managePanelModal.panel!
                                                            .id,
                                                        "live"
                                                    )
                                                }
                                            >
                                                <Play className="h-4 w-4 mr-2" />
                                                Démarrer le panel
                                            </Button>
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
                                        </>
                                    ) : managePanelModal.panel.status ===
                                      "live" ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                updatePanelStatus(
                                                    managePanelModal.panel!.id,
                                                    "completed"
                                                )
                                            }
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Terminer le panel
                                        </Button>
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            Panel terminé
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal de partage */}
            {shareModal.open && shareModal.panel && (
                <Dialog
                    open={shareModal.open}
                    onOpenChange={open => setShareModal({ open, panel: null })}
                >
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Partager le panel</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {shareModal.panel.title}
                            </p>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="text-center">
                                    <h4 className="font-medium mb-3">
                                        QR Code
                                    </h4>
                                    <div className="bg-white p-4 rounded-lg border inline-block">
                                        <PanelQRCode
                                            panel={shareModal.panel}
                                            size={200}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Scannez pour accéder au panel
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium">
                                            Lien direct
                                        </Label>
                                        <div className="flex mt-1">
                                            <Input
                                                value={`${window.location.origin}/panel/${shareModal.panel.id}`}
                                                readOnly
                                                className="rounded-r-none"
                                            />
                                            <Button
                                                variant="outline"
                                                className="rounded-l-none"
                                                onClick={() =>
                                                    handleCopyLink(
                                                        shareModal.panel!
                                                    )
                                                }
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                window.open(
                                                    `mailto:?subject=Invitation au panel: ${
                                                        shareModal.panel!.title
                                                    }&body=Vous êtes invité à participer au panel "${
                                                        shareModal.panel!.title
                                                    }". Accédez-y ici: ${
                                                        window.location.origin
                                                    }/panel/${
                                                        shareModal.panel!.id
                                                    }`
                                                )
                                            }}
                                        >
                                            <Mail className="h-4 w-4 mr-2" />
                                            Partager par email
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: shareModal.panel!
                                                            .title,
                                                        text: `Participez au panel: ${
                                                            shareModal.panel!
                                                                .title
                                                        }`,
                                                        url: `${
                                                            window.location
                                                                .origin
                                                        }/panel/${
                                                            shareModal.panel!.id
                                                        }`,
                                                    })
                                                }
                                            }}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Partager via l'OS
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal de confirmation de suppression */}
            <AlertDialog
                open={deleteConfirmation.open}
                onOpenChange={open =>
                    setDeleteConfirmation({
                        open,
                        panelId: null,
                        panelTitle: "",
                    })
                }
            >
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
                            onClick={confirmDeletePanel}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Supprimer définitivement
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de création de panel */}
            {isModalOpen && (
                <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingPanelId
                                    ? "Modifier le panel"
                                    : "Créer un nouveau panel"}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {editingPanelId
                                    ? "Modifiez les informations de votre panel de discussion"
                                    : "Remplissez les informations pour créer votre panel de discussion"}
                            </p>
                            {hasUnsavedChanges && (
                                <div className="flex items-center gap-2 text-amber-600 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    Modifications non sauvegardées
                                </div>
                            )}
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Informations de base */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Titre *</Label>
                                    <Input
                                        id="title"
                                        value={panelForm.title}
                                        onChange={e => {
                                            setPanelForm({
                                                ...panelForm,
                                                title: e.target.value,
                                            })
                                            setHasUnsavedChanges(true)
                                        }}
                                        placeholder="Ex: Discussion sur l'IA en 2024"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Catégorie</Label>
                                    <Input
                                        id="category"
                                        value={panelForm.category}
                                        onChange={e => {
                                            setPanelForm({
                                                ...panelForm,
                                                category: e.target.value,
                                            })
                                            setHasUnsavedChanges(true)
                                        }}
                                        placeholder="Ex: Technologie"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={panelForm.description}
                                    onChange={e => {
                                        setPanelForm({
                                            ...panelForm,
                                            description: e.target.value,
                                        })
                                        setHasUnsavedChanges(true)
                                    }}
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
                                        onChange={e => {
                                            setPanelForm({
                                                ...panelForm,
                                                date: e.target.value,
                                            })
                                            setHasUnsavedChanges(true)
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time">Heure *</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={panelForm.time}
                                        onChange={e => {
                                            setPanelForm({
                                                ...panelForm,
                                                time: e.target.value,
                                            })
                                            setHasUnsavedChanges(true)
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">
                                        Durée (minutes)
                                    </Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={panelForm.duration}
                                        onChange={e => {
                                            setPanelForm({
                                                ...panelForm,
                                                duration:
                                                    parseInt(e.target.value) ||
                                                    60,
                                            })
                                            setHasUnsavedChanges(true)
                                        }}
                                        min="15"
                                        max="480"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="participants_limit">
                                    Nombre maximum de participants
                                </Label>
                                <Input
                                    id="participants_limit"
                                    type="number"
                                    value={panelForm.participants_limit}
                                    onChange={e => {
                                        setPanelForm({
                                            ...panelForm,
                                            participants_limit:
                                                parseInt(e.target.value) || 30,
                                        })
                                        setHasUnsavedChanges(true)
                                    }}
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
                                    {panelForm.panelists.map(
                                        (panelist, index) => (
                                            <Card key={index} className="p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>
                                                            Nom complet
                                                        </Label>
                                                        <Input
                                                            value={
                                                                panelist.name
                                                            }
                                                            onChange={e =>
                                                                handlePanelistChange(
                                                                    index,
                                                                    "name",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="Nom du panéliste"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Email</Label>
                                                        <Input
                                                            value={
                                                                panelist.email
                                                            }
                                                            onChange={e =>
                                                                handlePanelistChange(
                                                                    index,
                                                                    "email",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="email@example.com"
                                                            type="email"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>
                                                            Titre/Fonction
                                                        </Label>
                                                        <Input
                                                            value={
                                                                panelist.title
                                                            }
                                                            onChange={e =>
                                                                handlePanelistChange(
                                                                    index,
                                                                    "title",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="Ex: Expert en IA"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>
                                                            Durée (minutes)
                                                        </Label>
                                                        <Input
                                                            value={
                                                                panelist.duration
                                                            }
                                                            onChange={e =>
                                                                handlePanelistChange(
                                                                    index,
                                                                    "duration",
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    ) || 15
                                                                )
                                                            }
                                                            type="number"
                                                            min="5"
                                                            max="120"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2">
                                                        <Label>
                                                            Sujet à aborder
                                                        </Label>
                                                        <Input
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
                                                            placeholder="Ex: L'impact de l'IA sur l'emploi"
                                                        />
                                                    </div>
                                                </div>
                                                {panelForm.panelists.length >
                                                    1 && (
                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() =>
                                                                removePanelist(
                                                                    index
                                                                )
                                                            }
                                                        >
                                                            Supprimer ce
                                                            panéliste
                                                        </Button>
                                                    </div>
                                                )}
                                            </Card>
                                        )
                                    )}
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
                                            {editingPanelId
                                                ? "Mise à jour..."
                                                : "Création..."}
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {editingPanelId
                                                ? "Mettre à jour le panel"
                                                : "Créer le panel"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <InvitePanelistsModal
                open={inviteModal.open}
                panel={inviteModal.panel}
                onClose={() => setInviteModal({ open: false, panel: null })}
            />
        </>
    )
}
