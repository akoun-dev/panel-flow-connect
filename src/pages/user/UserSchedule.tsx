import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, MapPin, Video, User, Play, MessageSquare } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"
import PanelInvitationService from "@/services/PanelInvitationService"

interface Panel {
    id: string
    title: string
    description: string
    date: string
    time: string
    duration: number
    status: string
    category?: string
    moderator_name?: string
    moderator_email?: string
    participants_limit?: number
}

export default function UserSchedule() {
    const { user } = useUser()
    const { toast } = useToast()
    const [searchParams] = useSearchParams()
    const invitationId = searchParams.get('invitationId')
    const [panels, setPanels] = useState<Panel[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchAcceptedPanels = async () => {
            if (!user?.email) return

            try {
                // Récupérer les panels auxquels l'utilisateur a accepté de participer
                const { data, error } = await supabase
                    .from("panel_invitations")
                    .select(
                        `
            panels!inner(
              id,
              title,
              description,
              date,
              time,
              duration,
              status,
              category,
              moderator_name,
              moderator_email,
              participants_limit
            )
          `
                    )
                    .eq("panelist_email", user.email)
                    .eq("status", "accepted")
                    .gte("panels.date", new Date().toISOString().split("T")[0]) // Panels futurs uniquement
                    .order("panels(date)", { ascending: true })

                if (error) throw error

                // Transformer les données
                const formattedPanels = (
                    data as unknown as Array<{
                        panels: Panel
                    }>
                ).map(item => item.panels)

                setPanels(formattedPanels)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur inconnue")
                toast({
                    title: "Erreur",
                    description: "Impossible de charger votre planning",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchAcceptedPanels()
    }, [user?.email, toast])

    const getStatusColor = (status: string) => {
        switch (status) {
            case "live":
                return "bg-red-100 text-red-800"
            case "scheduled":
                return "bg-blue-100 text-blue-800"
            case "completed":
                return "bg-green-100 text-green-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case "live":
                return "En cours"
            case "scheduled":
                return "Programmé"
            case "completed":
                return "Terminé"
            default:
                return status
        }
    }

    const isToday = (date: string) => {
        const today = new Date().toDateString()
        const panelDate = new Date(date).toDateString()
        return today === panelDate
    }

    const isTomorrow = (date: string) => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const panelDate = new Date(date).toDateString()
        return tomorrow.toDateString() === panelDate
    }

    const groupPanelsByDate = (panels: Panel[]) => {
        const today: Panel[] = []
        const tomorrow: Panel[] = []
        const upcoming: Panel[] = []

        panels.forEach(panel => {
            if (isToday(panel.date)) {
                today.push(panel)
            } else if (isTomorrow(panel.date)) {
                tomorrow.push(panel)
            } else {
                upcoming.push(panel)
            }
        })

        return { today, tomorrow, upcoming }
    }

    const handleAcceptInvitation = async (invitationId: string) => {
        if (!user) {
            toast({
                title: "Erreur",
                description: "Utilisateur non authentifié",
                variant: "destructive",
            })
            return
        }
        try {
            await PanelInvitationService.acceptInvitation(invitationId, user.id)
            toast({
                title: "Succès",
                description: "Invitation acceptée et planning mis à jour",
                variant: "default",
            })
            // Rafraîchir la liste des panels acceptés
            setLoading(true)
            const { data, error } = await supabase
                .from("panel_invitations")
                .select(
                    `
          panels!inner(
            id,
            title,
            description,
            date,
            time,
            duration,
            status,
            category,
            moderator_name,
            moderator_email,
            participants_limit
          )
        `
                )
                .eq("panelist_email", user.email)
                .eq("status", "accepted")
                .gte("panels.date", new Date().toISOString().split("T")[0])
                .order("panels(date)", { ascending: true })
            if (error) throw error
            const formattedPanels = (
                data as unknown as Array<{ panels: Panel }>
            ).map(item => item.panels)
            setPanels(formattedPanels)
        } catch (err) {
            toast({
                title: "Erreur",
                description:
                    err instanceof Error ? err.message : "Erreur inconnue",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-4 px-4 py-4">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        Chargement de votre planning...
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-4 px-4 py-4">
                <Card>
                    <CardContent className="text-center py-12">
                        <p className="text-red-600">Erreur: {error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { today, tomorrow, upcoming } = groupPanelsByDate(panels)

    return (
        <div className="space-y-4 px-4 py-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Mon Planning</h1>
                    <p className="text-muted-foreground mt-1">
                        Panels auxquels vous participez en tant que panéliste
                    </p>
                </div>
                <Badge variant="outline" className="bg-blue-50">
                    {panels.length} panel(s) programmé(s)
                </Badge>
            </div>

            {/* Panels d'aujourd'hui */}
            {today.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800">
                            <Calendar className="h-5 w-5" />
                            Aujourd'hui
                        </CardTitle>
                        <CardDescription className="text-red-700">
                            Panels prévus pour aujourd'hui
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {today.map(panel => (
                                <Card
                                    key={panel.id}
                                    className="bg-white border-l-4 border-l-red-500"
                                >
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">
                                                    {panel.title}
                                                </CardTitle>
                                                <CardDescription>
                                                    {panel.description}
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                className={getStatusColor(
                                                    panel.status
                                                )}
                                            >
                                                {getStatusText(panel.status)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {panel.time} (
                                                    {panel.duration} min)
                                                </span>
                                            </div>
                                            {panel.moderator_name && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>
                                                        {panel.moderator_name}
                                                    </span>
                                                </div>
                                            )}
                                            {panel.category && (
                                                <Badge variant="outline">
                                                    {panel.category}
                                                </Badge>
                                            )}
                                        </div>
                                        {panel.status === "live" && (
                                            <Button className="bg-red-600 hover:bg-red-700">
                                                <Play className="h-4 w-4 mr-2" />
                                                Rejoindre maintenant
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Panels de demain */}
            {tomorrow.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-800">
                            <Calendar className="h-5 w-5" />
                            Demain
                        </CardTitle>
                        <CardDescription className="text-orange-700">
                            Panels prévus pour demain
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {tomorrow.map(panel => (
                                <Card
                                    key={panel.id}
                                    className="bg-white border-l-4 border-l-orange-500"
                                >
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">
                                                    {panel.title}
                                                </CardTitle>
                                                <CardDescription>
                                                    {panel.description}
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                className={getStatusColor(
                                                    panel.status
                                                )}
                                            >
                                                {getStatusText(panel.status)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {panel.time} (
                                                    {panel.duration} min)
                                                </span>
                                            </div>
                                            {panel.moderator_name && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>
                                                        {panel.moderator_name}
                                                    </span>
                                                </div>
                                            )}
                                            {panel.category && (
                                                <Badge variant="outline">
                                                    {panel.category}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Panels à venir */}
            {upcoming.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />À venir
                        </CardTitle>
                        <CardDescription>
                            Panels programmés dans les prochains jours
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcoming.map(panel => (
                                <Card
                                    key={panel.id}
                                    className="border-l-4 border-l-blue-500"
                                >
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">
                                                    {panel.title}
                                                </CardTitle>
                                                <CardDescription>
                                                    {panel.description}
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                className={getStatusColor(
                                                    panel.status
                                                )}
                                            >
                                                {getStatusText(panel.status)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {new Date(
                                                        panel.date
                                                    ).toLocaleDateString(
                                                        "fr-FR"
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {panel.time} (
                                                    {panel.duration} min)
                                                </span>
                                            </div>
                                            {panel.moderator_name && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>
                                                        {panel.moderator_name}
                                                    </span>
                                                </div>
                                            )}
                                            {panel.category && (
                                                <Badge variant="outline">
                                                    {panel.category}
                                                </Badge>
                                            )}
                                              <Link
                                                to={`/questions?panel=${panel.id}`}
                                                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm"
                                              >
                                                <MessageSquare className="h-4 w-4" />
                                                Questions
                                              </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Message si aucun panel */}
            {panels.length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Aucun panel programmé
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Vous n'avez pas encore accepté d'invitations à des
                            panels.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() =>
                                (window.location.href = "/invitations")
                            }
                        >
                            Voir mes invitations
                        </Button>
                    </CardContent>
                </Card>
            )}

            {invitationId && (
                <div className="text-center mt-4">
                    <Button
                        onClick={() => handleAcceptInvitation(invitationId)}
                    >
                        Accepter l'invitation
                    </Button>
                </div>
            )}
        </div>
    )
}
