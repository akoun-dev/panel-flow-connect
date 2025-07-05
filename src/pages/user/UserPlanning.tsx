import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { logger } from "@/lib/logger"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventInput, EventClickArg } from "@fullcalendar/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
    Calendar, 
    Clock, 
    Users, 
    Filter, 
    Search, 
    Plus, 
    Eye, 
    Edit, 
    Trash2, 
    MoreHorizontal, 
    CalendarDays, 
    CheckCircle, 
    XCircle, 
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    TrendingUp,
    MapPin,
    Bell,
    Settings,
    Download,
    Share2,
    Zap,
    Star,
    Maximize2,
    Minimize2,
    RefreshCw,
    ArrowRight,
    Activity,
    Target,
    PieChart,
    BarChart3
} from "lucide-react"
import { toast } from "react-hot-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type PanelEvent = {
    id: string
    panel_id: string
    title: string
    description: string
    date: string
    time: string
    duration: number
    status: string
    moderators?: { name: string; avatar_url: string }[]
}

type PanelData = {
    id: string
    title: string
    description: string
    date: string
    time: string
    duration: number
    status?: string
}

type IconComponent = React.ComponentType<{ className?: string }>

const STATUS_CONFIG = {
  draft: {
    label: "Brouillon",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: AlertCircle,
    calendarColor: "#64748b",
    dotColor: "bg-slate-400",
    gradient: "from-slate-100 to-slate-200"
  },
  scheduled: {
    label: "Programmé",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CalendarDays,
    calendarColor: "#3b82f6",
    dotColor: "bg-blue-500",
    gradient: "from-blue-100 to-blue-200"
  },
  live: {
    label: "En cours",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: Zap,
    calendarColor: "#10b981",
    dotColor: "bg-emerald-500",
    gradient: "from-emerald-100 to-emerald-200"
  },
  confirmed: {
    label: "Confirmé",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
    calendarColor: "#10b981",
    dotColor: "bg-emerald-500",
    gradient: "from-emerald-100 to-emerald-200"
  },
  pending: {
    label: "En attente",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertCircle,
    calendarColor: "#f59e0b",
    dotColor: "bg-amber-500",
    gradient: "from-amber-100 to-amber-200"
  },
  cancelled: {
    label: "Annulé",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    calendarColor: "#ef4444",
    dotColor: "bg-red-500",
    gradient: "from-red-100 to-red-200"
  },
  completed: {
    label: "Terminé",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: CheckCircle,
    calendarColor: "#8b5cf6",
    dotColor: "bg-purple-500",
    gradient: "from-purple-100 to-purple-200"
  }
};

interface SupabasePanel {
    id: string;
    panel_id: string;
    status: string;
    panels: {
        title: string;
        description: string;
        date: string;
        time: string;
        duration: number;
    }[];
}

// Composant EventCard pour l'agenda du jour
const EventCard = ({ event, onView }: { event: PanelEvent; onView: (event: PanelEvent) => void }) => {
  const statusInfo = STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG]
  const StatusIcon = statusInfo?.icon

  return (
    <div className={`group p-4 rounded-xl border-2 border-transparent bg-gradient-to-r ${statusInfo?.gradient} hover:border-blue-200 transition-all duration-200 cursor-pointer`}
         onClick={() => onView(event)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-1 h-12 rounded-full ${statusInfo?.dotColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm">{event.time}</span>
              <Badge variant="outline" className={`text-xs ${statusInfo?.color}`}>
                {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                {statusInfo?.label}
              </Badge>
            </div>
            <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {event.title}
            </h4>
            <p className="text-sm text-gray-600 truncate">{event.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{event.duration} min</span>
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  )
}

// Composant StatCard pour les statistiques
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "blue" 
}: { 
  title: string; 
  value: string | number; 
  icon: IconComponent;
  trend?: string; 
  color?: string 
}) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700"
  }

  return (
    <Card className={`${colorClasses[color as keyof typeof colorClasses]} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && <p className="text-xs opacity-75 mt-1">{trend}</p>}
          </div>
          <Icon className="h-8 w-8 opacity-80" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function UserPlanning() {
    const [acceptedPanels, setAcceptedPanels] = useState<PanelEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [calendarView, setCalendarView] = useState("dayGridMonth")
    const [selectedEvent, setSelectedEvent] = useState<PanelEvent | null>(null)
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [fullScreen, setFullScreen] = useState(false)
    const [activeTab, setActiveTab] = useState("calendar")
    const [refreshing, setRefreshing] = useState(false)

    // Panels filtrés mémorisés
    const filteredPanels = useMemo(() => {
        let filtered = acceptedPanels

        if (searchTerm) {
            filtered = filtered.filter(panel =>
                panel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                panel.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(panel => panel.status === statusFilter)
        }

        return filtered
    }, [acceptedPanels, searchTerm, statusFilter])

    // Événements du jour mémorisés
    const todayEvents = useMemo(() => 
        filteredPanels.filter(panel => 
            panel.date === selectedDate.toISOString().split('T')[0]
        ).sort((a, b) => a.time.localeCompare(b.time))
    , [filteredPanels, selectedDate])

    // Événements à venir mémorisés
    const upcomingEvents = useMemo(() => 
        filteredPanels.filter(panel => {
            const panelDate = new Date(panel.date)
            const today = new Date()
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            return panelDate >= today && panelDate <= weekFromNow
        }).slice(0, 5)
    , [filteredPanels])

    // Statistiques mémorisées
    const stats = useMemo(() => ({
        total: acceptedPanels.length,
        confirmed: acceptedPanels.filter(p => p.status === 'confirmed').length,
        pending: acceptedPanels.filter(p => p.status === 'pending').length,
        live: acceptedPanels.filter(p => p.status === 'live').length,
        thisWeek: acceptedPanels.filter(p => {
            const panelDate = new Date(p.date)
            const today = new Date()
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            return panelDate >= today && panelDate <= weekFromNow
        }).length,
        completionRate: acceptedPanels.length > 0 
            ? Math.round((acceptedPanels.filter(p => p.status === 'completed').length / acceptedPanels.length) * 100)
            : 0
    }), [acceptedPanels])

    // Événements du calendrier mémorisés
    const calendarEvents: EventInput[] = useMemo(() => 
        filteredPanels.map(panel => {
            const statusInfo = STATUS_CONFIG[panel.status as keyof typeof STATUS_CONFIG]
            return {
                id: panel.id,
                title: panel.title,
                start: `${panel.date}T${panel.time}`,
                end: new Date(
                    new Date(`${panel.date}T${panel.time}`).getTime() + panel.duration * 60000
                ).toISOString(),
                backgroundColor: statusInfo?.calendarColor || '#6b7280',
                borderColor: statusInfo?.calendarColor || '#6b7280',
                textColor: '#ffffff',
                extendedProps: {
                    description: panel.description,
                    status: panel.status,
                    duration: panel.duration
                },
            }
        })
    , [filteredPanels])

    const fetchAcceptedPanels = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) setRefreshing(true)
            else setLoading(true)
            
            logger.debug('[UserPlanning] Starting to fetch panels...')
            
            const authResult = await supabase.auth.getUser()
            logger.debug('[UserPlanning] Auth result:', authResult)
            
            const userId = authResult.data.user?.id
            if (!userId) {
                logger.error('[UserPlanning] No user ID found')
                throw new Error("User ID not found")
            }

            logger.debug('[UserPlanning] Fetching user_planning for user:', userId)
            const { data, error, count } = await supabase
                .from("user_planning")
                .select(`
                    id,
                    panel_id,
                    status,
                    panels (
                        title,
                        description,
                        date,
                        time,
                        duration
                    )
                `)
                .eq("user_id", userId)
                .order('date', { ascending: true, referencedTable: 'panels' })

            if (error) {
                logger.error('[UserPlanning] Error fetching user_planning:', error)
                throw error
            }

            logger.debug('[UserPlanning] Fetched user_planning data:', {
                count: data?.length,
                firstItem: data?.[0]
            })

            const planningPanels: PanelEvent[] = (data as SupabasePanel[])
                .filter(item => item.panels && item.panels.length > 0)
                .map(item => ({
                    id: item.id,
                    panel_id: item.panel_id,
                    title: item.panels[0].title,
                    description: item.panels[0].description,
                    date: item.panels[0].date,
                    time: item.panels[0].time,
                    duration: item.panels[0].duration,
                    status: item.status,
                }))

            // Panels créés par l'utilisateur
            const { data: ownData, error: ownError } = await supabase
                .from('panels')
                .select('id, title, description, date, time, duration, status')
                .eq('user_id', userId)
                .order('date', { ascending: true })

            if (ownError) {
                logger.error('[UserPlanning] Error fetching own panels:', ownError)
                throw ownError
            }

            logger.debug('[UserPlanning] Fetched own panels:', {
                count: ownData?.length,
                firstItem: ownData?.[0]
            })

            const ownPanels: PanelEvent[] = (ownData as PanelData[]).map(panel => ({
                id: panel.id,
                panel_id: panel.id,
                title: panel.title,
                description: panel.description,
                date: panel.date,
                time: panel.time,
                duration: panel.duration,
                status: panel.status || 'scheduled',
            }))

            const combined = [...planningPanels, ...ownPanels]
            setAcceptedPanels(combined)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue")
            toast.error("Erreur lors du chargement du planning")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchAcceptedPanels()
    }, [fetchAcceptedPanels])

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventId = clickInfo.event.id
        const panel = acceptedPanels.find(p => p.id === eventId)
        if (panel) {
            setSelectedEvent(panel)
            setShowEventModal(true)
        }
    }, [acceptedPanels])

    const handleViewEvent = useCallback((event: PanelEvent) => {
        setSelectedEvent(event)
        setShowEventModal(true)
    }, [])

    const clearFilters = useCallback(() => {
        setSearchTerm("")
        setStatusFilter("all")
    }, [])

    if (loading) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Card className="p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chargement de votre planning</h3>
                        <p className="text-gray-600">Récupération de vos événements...</p>
                    </div>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                <Card className="border-red-200 bg-white max-w-md">
                    <CardContent className="text-center py-8">
                        <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
                        <p className="text-red-700 mb-4">{error}</p>
                        <Button onClick={() => fetchAcceptedPanels()} className="bg-red-600 hover:bg-red-700">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Réessayer
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
            {/* Sidebar */}
            {!fullScreen && (
            <div className={`bg-white/80 backdrop-blur-sm border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-80'} shadow-lg`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-white/90">
                    <div className="flex items-center justify-between">
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Mon Planning
                                </h1>
                                <p className="text-sm text-gray-600">Gérez vos événements</p>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hover:bg-blue-50"
                        >
                            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {!sidebarCollapsed && (
                    <div className="p-4 space-y-6 overflow-y-auto h-full">
                        {/* Statistiques rapides */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                title="Cette semaine"
                                value={stats.thisWeek}
                                icon={CalendarDays}
                                color="blue"
                            />
                            <StatCard
                                title="En cours"
                                value={stats.live}
                                icon={Zap}
                                color="green"
                            />
                            <StatCard
                                title="Confirmés"
                                value={stats.confirmed}
                                icon={CheckCircle}
                                color="green"
                            />
                            <StatCard
                                title="En attente"
                                value={stats.pending}
                                icon={AlertCircle}
                                color="amber"
                            />
                        </div>

                        {/* Taux de complétion */}
                        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-purple-700">Taux de complétion</h4>
                                    <Target className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-purple-600">Progression</span>
                                        <span className="text-sm font-bold text-purple-700">{stats.completionRate}%</span>
                                    </div>
                                    <Progress value={stats.completionRate} className="h-2 bg-purple-100" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Prochains événements */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                    À venir
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {upcomingEvents.length === 0 ? (
                                    <div className="text-center py-6">
                                        <Calendar className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500">Aucun événement à venir</p>
                                    </div>
                                ) : (
                                    upcomingEvents.map((event) => {
                                        const statusInfo = STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG]
                                        return (
                                            <div key={event.id} 
                                                 className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                                 onClick={() => handleViewEvent(event)}>
                                                <div className={`w-2 h-2 rounded-full ${statusInfo?.dotColor}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{event.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(event.date).toLocaleDateString('fr-FR', { 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        })} à {event.time}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>

                        {/* Filtres */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-blue-500" />
                                    Filtres
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Rechercher..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les statuts</SelectItem>
                                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                                            <SelectItem key={status} value={status}>
                                                {config.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {(searchTerm || statusFilter !== "all") && (
                                    <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                                        Effacer les filtres
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            )}

            {/* Zone principale */}
            <div className="flex-1 flex flex-col">
                {/* En-tête principal */}
                <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {selectedDate.toLocaleDateString('fr-FR', { 
                                        weekday: 'long',
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </h2>
                                <p className="text-gray-600 mt-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {todayEvents.length} événement(s) aujourd'hui
                                </p>
                            </div>
                            {refreshing && (
                                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => fetchAcceptedPanels(true)}
                                disabled={refreshing}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                Actualiser
                            </Button>
                            <Select value={calendarView} onValueChange={setCalendarView}>
                                <SelectTrigger className="w-40">
                                    <CalendarDays className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dayGridMonth">Mois</SelectItem>
                                    <SelectItem value="dayGridWeek">Semaine</SelectItem>
                                    <SelectItem value="timeGridWeek">Planning</SelectItem>
                                    <SelectItem value="timeGridDay">Jour</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => setFullScreen(!fullScreen)}>
                                {fullScreen ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 space-y-6 flex flex-col overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="calendar" className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Calendrier
                            </TabsTrigger>
                            <TabsTrigger value="agenda" className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Agenda
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="calendar" className="flex-1 flex flex-col mt-6">
                            <Card className="flex-1 flex flex-col">
                                <CardContent className="p-6 flex-1 flex flex-col">
                                    {filteredPanels.length === 0 ? (
                                        <div className="text-center py-12 flex-1 flex items-center justify-center">
                                            <div>
                                                <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                                    {searchTerm || statusFilter !== "all" 
                                                        ? "Aucun événement trouvé" 
                                                        : "Aucun événement planifié"}
                                                </h3>
                                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                                    {searchTerm || statusFilter !== "all"
                                                        ? "Essayez de modifier vos filtres de recherche."
                                                        : "Commencez par ajouter des événements à votre planning."}
                                                </p>
                                                {(searchTerm || statusFilter !== "all") && (
                                                    <Button variant="outline" onClick={clearFilters}>
                                                        Effacer les filtres
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 relative">
                                            <style>{`
                                                .fc {
                                                    font-family: 'Inter', system-ui, sans-serif;
                                                }
                                                
                                                .fc-header-toolbar {
                                                    padding: 1rem 0;
                                                    margin-bottom: 1rem !important;
                                                    border-bottom: 1px solid #e5e7eb;
                                                }
                                                
                                                .fc-toolbar-title {
                                                    font-size: 1.5rem !important;
                                                    font-weight: 700 !important;
                                                    color: #1f2937 !important;
                                                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                                                    -webkit-background-clip: text;
                                                    -webkit-text-fill-color: transparent;
                                                    background-clip: text;
                                                }
                                                
                                                .fc-button {
                                                    background: white !important;
                                                    border: 1px solid #d1d5db !important;
                                                    color: #374151 !important;
                                                    border-radius: 8px !important;
                                                    padding: 8px 12px !important;
                                                    font-weight: 500 !important;
                                                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
                                                    transition: all 0.2s ease !important;
                                                }
                                                
                                                .fc-button:hover {
                                                    background: #f9fafb !important;
                                                    border-color: #9ca3af !important;
                                                    transform: translateY(-1px);
                                                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                                                }
                                                
                                                .fc-button:focus,
                                                .fc-button-active {
                                                    background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
                                                    border-color: #3b82f6 !important;
                                                    color: white !important;
                                                    box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39) !important;
                                                }
                                                
                                                .fc-today-button {
                                                    background: linear-gradient(135deg, #10b981, #059669) !important;
                                                    border-color: #10b981 !important;
                                                    color: white !important;
                                                }
                                                
                                                .fc-today-button:hover {
                                                    background: linear-gradient(135deg, #059669, #047857) !important;
                                                }
                                                
                                                .fc-daygrid-day {
                                                    transition: background-color 0.2s ease;
                                                }
                                                
                                                .fc-daygrid-day:hover {
                                                    background-color: #f0f9ff !important;
                                                }
                                                
                                                .fc-day-today {
                                                    background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
                                                    border: 2px solid #3b82f6 !important;
                                                }
                                                
                                                .fc-col-header-cell {
                                                    background: linear-gradient(135deg, #f8fafc, #f1f5f9) !important;
                                                    border-color: #e2e8f0 !important;
                                                    font-weight: 600 !important;
                                                    color: #475569 !important;
                                                    text-transform: uppercase;
                                                    font-size: 0.75rem;
                                                    letter-spacing: 0.05em;
                                                    padding: 12px 8px !important;
                                                }
                                                
                                                .fc-daygrid-day-number {
                                                    font-weight: 600 !important;
                                                    color: #374151 !important;
                                                    padding: 8px !important;
                                                    transition: all 0.2s ease;
                                                }
                                                
                                                .fc-day-today .fc-daygrid-day-number {
                                                    background: #3b82f6 !important;
                                                    color: white !important;
                                                    border-radius: 50% !important;
                                                    width: 32px !important;
                                                    height: 32px !important;
                                                    display: flex !important;
                                                    align-items: center !important;
                                                    justify-content: center !important;
                                                    margin: 4px !important;
                                                }
                                                
                                                .fc-event {
                                                    border: none !important;
                                                    border-radius: 6px !important;
                                                    padding: 2px 6px !important;
                                                    margin: 1px 2px !important;
                                                    font-size: 0.75rem !important;
                                                    font-weight: 500 !important;
                                                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
                                                    transition: all 0.2s ease !important;
                                                    cursor: pointer !important;
                                                    backdrop-filter: blur(10px);
                                                }
                                                
                                                .fc-event:hover {
                                                    transform: translateY(-2px) scale(1.02) !important;
                                                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25) !important;
                                                    z-index: 100 !important;
                                                }
                                                
                                                .fc-event-title {
                                                    font-weight: 600 !important;
                                                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                                                }
                                                
                                                .fc-event-time {
                                                    font-weight: 500 !important;
                                                    opacity: 0.9;
                                                }
                                                
                                                .fc-more-link {
                                                    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
                                                    color: white !important;
                                                    border-radius: 12px !important;
                                                    padding: 2px 8px !important;
                                                    font-weight: 500 !important;
                                                    font-size: 0.7rem !important;
                                                    margin: 1px 2px !important;
                                                    text-decoration: none !important;
                                                    transition: all 0.2s ease !important;
                                                }
                                                
                                                .fc-more-link:hover {
                                                    transform: scale(1.05);
                                                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                                                }
                                                
                                                .fc-timegrid-slot {
                                                    border-color: #f3f4f6 !important;
                                                    height: 3rem !important;
                                                }
                                                
                                                .fc-timegrid-slot-label {
                                                    color: #6b7280 !important;
                                                    font-weight: 500 !important;
                                                    font-size: 0.75rem !important;
                                                }
                                                
                                                .fc-timegrid-axis {
                                                    background: #fafafa !important;
                                                }
                                                
                                                .fc-scrollgrid-sync-table {
                                                    border-radius: 8px;
                                                    overflow: hidden;
                                                }
                                                
                                                .fc-view-harness {
                                                    border-radius: 12px;
                                                    overflow: hidden;
                                                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                                }
                                                
                                                .fc-daygrid-event-harness {
                                                    animation: slideIn 0.3s ease-out;
                                                }
                                                
                                                @keyframes slideIn {
                                                    from {
                                                        opacity: 0;
                                                        transform: translateY(-10px);
                                                    }
                                                    to {
                                                        opacity: 1;
                                                        transform: translateY(0);
                                                    }
                                                }
                                                
                                                .fc-popover {
                                                    border-radius: 12px !important;
                                                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                                                    border: 1px solid #e5e7eb !important;
                                                    backdrop-filter: blur(20px);
                                                    background: rgba(255, 255, 255, 0.95) !important;
                                                }
                                                
                                                .fc-popover-header {
                                                    background: linear-gradient(135deg, #f8fafc, #f1f5f9) !important;
                                                    border-bottom: 1px solid #e2e8f0 !important;
                                                    padding: 12px 16px !important;
                                                    font-weight: 600 !important;
                                                    color: #374151 !important;
                                                }
                                                
                                                /* Mode sombre pour certains événements */
                                                .fc-event.event-live {
                                                    background: linear-gradient(135deg, #10b981, #059669) !important;
                                                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.4) !important;
                                                    animation: pulse 2s infinite;
                                                }
                                                
                                                @keyframes pulse {
                                                    0%, 100% { opacity: 1; }
                                                    50% { opacity: 0.8; }
                                                }
                                                
                                                .fc-event.event-pending {
                                                    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
                                                    box-shadow: 0 0 15px rgba(245, 158, 11, 0.3) !important;
                                                }
                                                
                                                .fc-event.event-cancelled {
                                                    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                                                    opacity: 0.7;
                                                    text-decoration: line-through;
                                                }
                                                
                                                .fc-event.event-completed {
                                                    background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
                                                    box-shadow: 0 0 15px rgba(139, 92, 246, 0.3) !important;
                                                }
                                                
                                                /* Responsive */
                                                @media (max-width: 768px) {
                                                    .fc-toolbar {
                                                        flex-direction: column !important;
                                                        gap: 8px;
                                                    }
                                                    
                                                    .fc-toolbar-title {
                                                        font-size: 1.25rem !important;
                                                        margin: 8px 0 !important;
                                                    }
                                                    
                                                    .fc-button {
                                                        padding: 6px 10px !important;
                                                        font-size: 0.875rem !important;
                                                    }
                                                    
                                                    .fc-event {
                                                        font-size: 0.7rem !important;
                                                        padding: 1px 4px !important;
                                                    }
                                                }
                                            `}</style>
                                            <FullCalendar
                                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                                initialView={calendarView}
                                                views={{
                                                    dayGridMonth: { 
                                                        titleFormat: { year: 'numeric', month: 'long' },
                                                        dayMaxEvents: 4,
                                                        moreLinkClick: 'popover',
                                                        dayMaxEventRows: 4
                                                    },
                                                    dayGridWeek: { 
                                                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                                                        dayMaxEvents: false,
                                                        dayMaxEventRows: false
                                                    },
                                                    timeGridWeek: {
                                                        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                                                        slotDuration: '00:30:00',
                                                        slotLabelInterval: '01:00:00',
                                                        scrollTime: '08:00:00',
                                                        nowIndicator: true,
                                                        allDaySlot: true,
                                                        allDayText: 'Journée'
                                                    },
                                                    timeGridDay: {
                                                        titleFormat: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
                                                        slotDuration: '00:15:00',
                                                        slotLabelInterval: '01:00:00',
                                                        scrollTime: '07:00:00',
                                                        nowIndicator: true,
                                                        allDaySlot: true,
                                                        allDayText: 'Journée'
                                                    }
                                                }}
                                                events={calendarEvents.map(event => ({
                                                    ...event,
                                                    classNames: [`event-${event.extendedProps?.status || 'default'}`]
                                                }))}
                                                eventClick={handleEventClick}
                                                dateClick={(dateInfo) => {
                                                    setSelectedDate(new Date(dateInfo.date))
                                                    if (calendarView.includes('timeGrid')) {
                                                        setActiveTab('agenda')
                                                    }
                                                }}
                                                select={(selectInfo) => {
                                                    // Possibilité d'ajouter création d'événement par sélection
                                                    console.log('Date sélectionnée:', selectInfo)
                                                }}
                                                headerToolbar={{
                                                    left: "prev,next today",
                                                    center: "title",
                                                    right: ""
                                                }}
                                                height="auto"
                                                contentHeight="auto"
                                                aspectRatio={2.0}
                                                locale="fr"
                                                firstDay={1}
                                                weekNumbers={false}
                                                eventDisplay="block"
                                                displayEventTime={true}
                                                eventTimeFormat={{
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                }}
                                                buttonText={{
                                                    today: "Aujourd'hui",
                                                    month: "Mois",
                                                    week: "Semaine",
                                                    day: "Jour"
                                                }}
                                                dayHeaderFormat={{ weekday: 'short' }}
                                                slotMinTime="06:00:00"
                                                slotMaxTime="23:00:00"
                                                expandRows={false}
                                                stickyHeaderDates={true}
                                                navLinks={true}
                                                editable={false}
                                                selectable={true}
                                                selectMirror={true}
                                                eventStartEditable={false}
                                                eventDurationEditable={false}
                                                eventResizableFromStart={false}
                                                dayPopoverFormat={{ month: 'long', day: 'numeric', year: 'numeric' }}
                                                eventDidMount={(info) => {
                                                    // Tooltip personnalisé
                                                    const event = info.event
                                                    const tooltip = `
                                                        <div style="
                                                            background: white;
                                                            border: 1px solid #e5e7eb;
                                                            border-radius: 8px;
                                                            padding: 12px;
                                                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                                                            max-width: 250px;
                                                            font-size: 14px;
                                                            z-index: 1000;
                                                        ">
                                                            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                                                                ${event.title}
                                                            </div>
                                                            <div style="color: #6b7280; margin-bottom: 8px;">
                                                                ${event.extendedProps?.description || 'Aucune description'}
                                                            </div>
                                                            <div style="display: flex; align-items: center; gap: 8px; color: #374151;">
                                                                <span style="font-size: 12px;">⏰ ${event.start?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <span style="font-size: 12px;">⏱️ ${event.extendedProps?.duration}min</span>
                                                            </div>
                                                        </div>
                                                    `
                                                    
                                                    info.el.setAttribute('title', '')
                                                    info.el.setAttribute('data-tooltip', tooltip)
                                                }}
                                                eventMouseEnter={(info) => {
                                                    // Animation d'entrée
                                                    info.el.style.cursor = 'pointer'
                                                    info.el.style.transform = 'translateY(-2px) scale(1.02)'
                                                    info.el.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    info.el.style.zIndex = '100'
                                                    
                                                    // Effet de brillance
                                                    info.el.style.filter = 'brightness(1.1) saturate(1.1)'
                                                }}
                                                eventMouseLeave={(info) => {
                                                    // Animation de sortie
                                                    info.el.style.transform = 'translateY(0) scale(1)'
                                                    info.el.style.zIndex = '1'
                                                    info.el.style.filter = 'none'
                                                }}
                                                datesSet={(dateInfo) => {
                                                    // Synchroniser avec la date sélectionnée
                                                    const currentDate = dateInfo.view.currentStart
                                                    if (currentDate.getMonth() !== selectedDate.getMonth() || 
                                                        currentDate.getFullYear() !== selectedDate.getFullYear()) {
                                                        setSelectedDate(new Date(currentDate))
                                                    }
                                                }}
                                                loading={(isLoading) => {
                                                    // Indicateur de chargement du calendrier
                                                    if (isLoading) {
                                                        console.log('Calendrier en cours de chargement...')
                                                    }
                                                }}
                                                eventContent={(eventInfo) => {
                                                    // Rendu personnalisé des événements
                                                    const status = eventInfo.event.extendedProps?.status
                                                    const isLive = status === 'live'
                                                    
                                                    return {
                                                        html: `
                                                            <div style="
                                                                display: flex;
                                                                align-items: center;
                                                                gap: 4px;
                                                                padding: 2px;
                                                                width: 100%;
                                                            ">
                                                                ${isLive ? '<span style="color: #ffffff; font-size: 10px;">🔴</span>' : ''}
                                                                <div style="
                                                                    flex: 1;
                                                                    min-width: 0;
                                                                    line-height: 1.2;
                                                                ">
                                                                    <div style="font-weight: 600; font-size: 0.75rem; truncate;">
                                                                        ${eventInfo.event.title}
                                                                    </div>
                                                                    ${eventInfo.timeText ? `<div style="font-size: 0.7rem; opacity: 0.9;">${eventInfo.timeText}</div>` : ''}
                                                                </div>
                                                            </div>
                                                        `
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="agenda" className="flex-1 flex flex-col mt-6">
                            <div className="space-y-6">
                                {/* Agenda du jour */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-blue-500" />
                                            Agenda du jour
                                            <Badge variant="secondary">{todayEvents.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {todayEvents.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                                <p className="text-gray-500">Aucun événement aujourd'hui</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {todayEvents.map((event) => (
                                                    <EventCard 
                                                        key={event.id} 
                                                        event={event} 
                                                        onView={handleViewEvent} 
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Événements à venir */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-green-500" />
                                            Prochains événements
                                            <Badge variant="secondary">{upcomingEvents.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {upcomingEvents.length === 0 ? (
                                            <div className="text-center py-8">
                                                <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                                <p className="text-gray-500">Aucun événement à venir cette semaine</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {upcomingEvents.map((event) => (
                                                    <EventCard 
                                                        key={event.id} 
                                                        event={event} 
                                                        onView={handleViewEvent} 
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modal de détail d'événement */}
            {showEventModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-xl mb-2">{selectedEvent.title}</CardTitle>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={STATUS_CONFIG[selectedEvent.status as keyof typeof STATUS_CONFIG]?.color}>
                                            {(() => {
                                                const StatusIcon = STATUS_CONFIG[selectedEvent.status as keyof typeof STATUS_CONFIG]?.icon
                                                return StatusIcon ? <StatusIcon className="w-3 h-3 mr-1" /> : null
                                            })()}
                                            {STATUS_CONFIG[selectedEvent.status as keyof typeof STATUS_CONFIG]?.label}
                                        </Badge>
                                        <Badge variant="outline">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {selectedEvent.duration} min
                                        </Badge>
                                        <Badge variant="outline">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {new Date(selectedEvent.date).toLocaleDateString('fr-FR')}
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEventModal(false)}
                                    className="hover:bg-white/80"
                                >
                                    ✕
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div>
                                <Label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</Label>
                                <p className="mt-2 text-gray-900 leading-relaxed">{selectedEvent.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Date et heure</Label>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <Calendar className="h-4 w-4 text-blue-500" />
                                                <span className="text-gray-900 font-medium">
                                                    {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <Clock className="h-4 w-4 text-green-500" />
                                                <span className="text-gray-900 font-medium">{selectedEvent.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Informations</Label>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <MapPin className="h-4 w-4 text-purple-500" />
                                                <span className="text-sm text-gray-600">Panel ID: {selectedEvent.panel_id}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <Clock className="h-4 w-4 text-orange-500" />
                                                <span className="text-sm text-gray-600">Durée: {selectedEvent.duration} minutes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir le panel
                                </Button>
                                <Button variant="outline">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                </Button>
                                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}