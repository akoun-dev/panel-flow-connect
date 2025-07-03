import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { logger } from "@/lib/logger"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
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
    Star
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

const statusConfig = {
  confirmed: { 
    label: "Confirmé", 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
    calendarColor: "#10b981",
    dotColor: "bg-emerald-500"
  },
  pending: { 
    label: "En attente", 
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertCircle,
    calendarColor: "#f59e0b",
    dotColor: "bg-amber-500"
  },
  cancelled: { 
    label: "Annulé", 
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    calendarColor: "#ef4444",
    dotColor: "bg-red-500"
  },
  completed: { 
    label: "Terminé", 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CheckCircle,
    calendarColor: "#3b82f6",
    dotColor: "bg-blue-500"
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

export default function UserPlanning() {
    const [acceptedPanels, setAcceptedPanels] = useState<PanelEvent[]>([])
    const [filteredPanels, setFilteredPanels] = useState<PanelEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [calendarView, setCalendarView] = useState("dayGridMonth")
    const [selectedEvent, setSelectedEvent] = useState<PanelEvent | null>(null)
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    useEffect(() => {
        const fetchAcceptedPanels = async () => {
            try {
                setLoading(true)
                logger.debug('[DEBUG] Starting to fetch panels...')
                
                const authResult = await supabase.auth.getUser()
                logger.debug('[DEBUG] Auth result:', authResult)
                
                const userId = authResult.data.user?.id
                if (!userId) throw new Error("User ID not found")
                logger.debug('[DEBUG] User ID:', userId)

                logger.debug('[DEBUG] Building query...')
                const query = supabase
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

                logger.debug('[DEBUG] Executing query:', query)
                const { data, error } = await query

                if (error) {
                    console.error('[DEBUG] Query error:', error)
                    throw error
                }
                
                logger.debug('[DEBUG] Query successful, data:', data)
                if (!data) {
                    logger.debug('[DEBUG] No data returned')
                    return
                }

                const formattedPanels: PanelEvent[] = (data as SupabasePanel[])
                    .filter(item => item.panels && item.panels.length > 0) // Filtre d'abord les éléments valides
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

                setAcceptedPanels(formattedPanels)
                setFilteredPanels(formattedPanels)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Une erreur est survenue")
                toast.error("Erreur lors du chargement du planning")
            } finally {
                setLoading(false)
            }
        }

        fetchAcceptedPanels()
    }, [])

    // Filtrage des panels
    useEffect(() => {
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

        setFilteredPanels(filtered)
    }, [acceptedPanels, searchTerm, statusFilter])

    // Gestion du clic sur un événement
    const handleEventClick = (clickInfo: EventClickArg) => {
        const eventId = clickInfo.event.id
        const panel = acceptedPanels.find(p => p.id === eventId)
        if (panel) {
            setSelectedEvent(panel)
            setShowEventModal(true)
        }
    }

    // Événements du jour sélectionné
    const todayEvents = filteredPanels.filter(panel => 
        panel.date === selectedDate.toISOString().split('T')[0]
    ).sort((a, b) => a.time.localeCompare(b.time))

    // Événements des 7 prochains jours
    const upcomingEvents = filteredPanels.filter(panel => {
        const panelDate = new Date(panel.date)
        const today = new Date()
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        return panelDate >= today && panelDate <= weekFromNow
    }).slice(0, 5)

    // Calcul des statistiques
    const stats = {
        total: acceptedPanels.length,
        confirmed: acceptedPanels.filter(p => p.status === 'confirmed').length,
        pending: acceptedPanels.filter(p => p.status === 'pending').length,
        thisWeek: acceptedPanels.filter(p => {
            const panelDate = new Date(p.date)
            const today = new Date()
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            return panelDate >= today && panelDate <= weekFromNow
        }).length,
        completionRate: acceptedPanels.length > 0 
            ? Math.round((acceptedPanels.filter(p => p.status === 'completed').length / acceptedPanels.length) * 100)
            : 0
    }

    // Conversion des panels pour FullCalendar
    const calendarEvents: EventInput[] = filteredPanels.map(panel => {
        const statusInfo = statusConfig[panel.status as keyof typeof statusConfig]
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

    if (loading) {
        return (
            <div className="w-full h-full bg-gray-50">
                <div className="w-full h-full p-6 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Chargement de votre planning...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full h-full bg-gray-50">
                <div className="w-full h-full p-6 flex items-center justify-center">
                    <Card className="border-red-200 bg-red-50 max-w-md">
                        <CardContent className="text-center py-8">
                            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                            <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
                            <p className="text-red-700 mb-4">{error}</p>
                            <Button onClick={() => window.location.reload()}>
                                Réessayer
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Planning</h1>
                                <p className="text-sm text-gray-600">Gérez vos événements</p>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {!sidebarCollapsed && (
                    <div className="p-4 space-y-6">
                        {/* Mini calendrier */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Mini calendrier</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {selectedDate.getDate()}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {selectedDate.toLocaleDateString('fr-FR', { 
                                            month: 'long', 
                                            year: 'numeric' 
                                        })}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Statistiques rapides */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Aperçu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Cette semaine</span>
                                    <Badge variant="secondary">{stats.thisWeek}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Confirmés</span>
                                    <Badge className="bg-emerald-100 text-emerald-700">{stats.confirmed}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">En attente</span>
                                    <Badge className="bg-amber-100 text-amber-700">{stats.pending}</Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Taux de complétion</span>
                                        <span className="text-sm font-medium">{stats.completionRate}%</span>
                                    </div>
                                    <Progress value={stats.completionRate} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Prochains événements */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    À venir
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {upcomingEvents.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        Aucun événement à venir
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.map((event) => {
                                            const statusInfo = statusConfig[event.status as keyof typeof statusConfig]
                                            return (
                                                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Filtres */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filtres
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-xs">Recherche</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                        <Input
                                            placeholder="Rechercher..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-7 text-sm"
                                            size={16}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Statut</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="confirmed">Confirmés</SelectItem>
                                            <SelectItem value="pending">En attente</SelectItem>
                                            <SelectItem value="cancelled">Annulés</SelectItem>
                                            <SelectItem value="completed">Terminés</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(statusConfig).map(([status, config]) => {
                                        const count = acceptedPanels.filter(p => p.status === status).length
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => setStatusFilter(status)}
                                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                                    statusFilter === status 
                                                        ? config.color 
                                                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                                }`}
                                            >
                                                {count}
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Zone principale */}
            <div className="flex-1 flex flex-col">
                {/* En-tête principal */}
                <div className="bg-white border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {selectedDate.toLocaleDateString('fr-FR', { 
                                    weekday: 'long',
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </h2>
                            <p className="text-gray-600 mt-1">
                                {todayEvents.length} événement(s) aujourd'hui
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Select value={calendarView} onValueChange={setCalendarView}>
                                <SelectTrigger className="w-40">
                                    <CalendarDays className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dayGridMonth">Mois</SelectItem>
                                    <SelectItem value="dayGridWeek">Semaine</SelectItem>
                                </SelectContent>
                            </Select>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <Download className="h-4 w-4 mr-2" />
                                        Exporter
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Partager
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 space-y-6">
                    {/* Timeline du jour */}
                    {todayEvents.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Agenda du jour
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {todayEvents.map((event, index) => {
                                        const statusInfo = statusConfig[event.status as keyof typeof statusConfig]
                                        const StatusIcon = statusInfo?.icon
                                        return (
                                            <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${statusInfo?.dotColor}`} />
                                                    <div className="text-sm font-medium text-gray-900 min-w-[60px]">
                                                        {event.time}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                                                    <p className="text-sm text-gray-600">{event.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={statusInfo?.color}>
                                                        {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                                                        {statusInfo?.label}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500">{event.duration}min</span>
                                                </div>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Calendrier principal */}
                    <Card className="flex-1">
                        <CardContent className="p-6">
                            {filteredPanels.length === 0 ? (
                                <div className="text-center py-12">
                                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {searchTerm || statusFilter !== "all" 
                                            ? "Aucun événement trouvé" 
                                            : "Aucun événement planifié"}
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {searchTerm || statusFilter !== "all"
                                            ? "Essayez de modifier vos filtres de recherche."
                                            : "Commencez par ajouter des événements à votre planning."}
                                    </p>
                                    {(searchTerm || statusFilter !== "all") && (
                                        <Button variant="outline" onClick={() => {
                                            setSearchTerm("")
                                            setStatusFilter("all")
                                        }}>
                                            Effacer les filtres
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <FullCalendar
                                    plugins={[dayGridPlugin, interactionPlugin]}
                                    initialView={calendarView}
                                    views={{
                                        dayGridMonth: { 
                                            titleFormat: { year: 'numeric', month: 'long' },
                                            dayMaxEvents: 3
                                        },
                                        dayGridWeek: { 
                                            titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                                            dayMaxEvents: false
                                        }
                                    }}
                                    events={calendarEvents}
                                    eventClick={handleEventClick}
                                    dateClick={(dateInfo) => {
                                        setSelectedDate(new Date(dateInfo.date))
                                    }}
                                    headerToolbar={{
                                        left: "prev,next today",
                                        center: "title",
                                        right: ""
                                    }}
                                    height="auto"
                                    locale="fr"
                                    firstDay={1}
                                    eventDisplay="block"
                                    displayEventTime={true}
                                    eventTimeFormat={{
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }}
                                    buttonText={{
                                        today: "Aujourd'hui"
                                    }}
                                    dayHeaderFormat={{ weekday: 'short' }}
                                    weekNumbers={false}
                                    eventMouseEnter={(info) => {
                                        info.el.style.cursor = 'pointer'
                                        info.el.style.transform = 'scale(1.02)'
                                        info.el.style.transition = 'transform 0.2s'
                                        info.el.style.zIndex = '10'
                                    }}
                                    eventMouseLeave={(info) => {
                                        info.el.style.transform = 'scale(1)'
                                        info.el.style.zIndex = '1'
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de détail d'événement */}
            {showEventModal && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-xl">{selectedEvent.title}</CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className={statusConfig[selectedEvent.status as keyof typeof statusConfig]?.color}>
                                            {(() => {
                                                const StatusIcon = statusConfig[selectedEvent.status as keyof typeof statusConfig]?.icon
                                                return StatusIcon ? <StatusIcon className="w-3 h-3 mr-1" /> : null
                                            })()}
                                            {statusConfig[selectedEvent.status as keyof typeof statusConfig]?.label}
                                        </Badge>
                                        <Badge variant="outline">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {selectedEvent.duration} min
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEventModal(false)}
                                >
                                    ✕
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-sm font-medium text-gray-500">Description</Label>
                                <p className="mt-1 text-gray-900">{selectedEvent.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500">Date et heure</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-900">
                                                {new Date(selectedEvent.date).toLocaleDateString('fr-FR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-900">{selectedEvent.time}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500">Informations</Label>
                                        <div className="mt-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">Panel ID: {selectedEvent.panel_id}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">Durée: {selectedEvent.duration} minutes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                                <Button size="sm" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir le panel
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
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