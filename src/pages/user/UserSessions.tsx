import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  Clock,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Calendar
} from "lucide-react";
import SessionService from "@/services/sessionService";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/use-toast";


interface PanelSession {
  id: string;
  title: string;
  description: string;
  theme: string;
  status: "live" | "scheduled" | "completed";
  participants: number;
  questions: number;
  duration: string;
  allocatedTime?: number | null;
  start_time: string;
  end_time: string;
  timeRemaining: string;
  moderator: string;
  moderator_avatar?: string;
}

export function UserSessions() {
  const { user } = useUser();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<PanelSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    const fetchAcceptedPanels = async () => {
      if (!user?.email) return;

      try {
        const sessionsData = await SessionService.getSessionsForPanelist(user.email);

        const formattedSessions = sessionsData.map((panel) => {
          const now = new Date();
          const startDate = new Date(panel.start_time);
          const endDate = new Date(panel.end_time);
          const timeRemaining = panel.status === 'live'
            ? `${Math.floor((endDate.getTime() - now.getTime()) / 60000)} min`
            : panel.status === 'scheduled'
            ? `${Math.floor((startDate.getTime() - now.getTime()) / 3600000)}h ${Math.floor(((startDate.getTime() - now.getTime()) % 3600000) / 60000)}min`
            : 'Terminé';

          return {
            id: panel.panel_id,
            title: panel.title,
            description: panel.description,
            theme: panel.theme,
            status: panel.status as "live" | "scheduled" | "completed",
            participants: 0,
            questions: 0,
            duration: calculateDuration(panel.start_time ?? '', panel.end_time ?? ''),
            start_time: panel.start_time ?? '',
            end_time: panel.end_time ?? '',
            allocatedTime: panel.allocated_time,
            timeRemaining,
            moderator: panel.moderator,
            moderator_avatar: undefined
          };
        });

        setSessions(formattedSessions);
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les sessions',
          variant: 'destructive'
        });
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedPanels();
  }, [user?.email]);

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-700 border-red-300';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'En direct';
      case 'scheduled': return 'Programmé';
      case 'completed': return 'Terminé';
      default: return 'Inconnu';
    }
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mes Sessions</h1>
          <p className="text-muted-foreground mt-1">Gérez vos participations aux panels</p>
        </div>
      </div>

      {/* Session en cours - vue détaillée */}
      {sessions.filter(s => s.status === 'live').map(session => (
        <Card key={session.id} className="w-full border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-red-900">{session.title}</CardTitle>
                <CardDescription className="text-red-700">{session.description}</CardDescription>
              </div>
              <Badge className="bg-red-100 text-red-700 border-red-300">
                🔴 {getStatusText(session.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contrôles audio/vidéo */}
              <div className="space-y-4">
                <h3 className="font-semibold text-red-900">Contrôles</h3>
                <div className="flex gap-2">
                  <Button
                    variant={micEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={() => setMicEnabled(!micEnabled)}
                    className="flex-1"
                  >
                    {micEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
                    {micEnabled ? "Micro ON" : "Micro OFF"}
                  </Button>
                  <Button
                    variant={videoEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={() => setVideoEnabled(!videoEnabled)}
                    className="flex-1"
                  >
                    {videoEnabled ? <Video className="h-4 w-4 mr-2" /> : <VideoOff className="h-4 w-4 mr-2" />}
                    {videoEnabled ? "Vidéo ON" : "Vidéo OFF"}
                  </Button>
                </div>
              </div>

              {/* Statistiques temps réel */}
              <div className="space-y-4">
                <h3 className="font-semibold text-red-900">En direct</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <Users className="h-5 w-5 mx-auto text-red-600 mb-1" />
                    <div className="font-bold text-red-900">{session.participants}</div>
                    <div className="text-xs text-red-600">Participants</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <MessageSquare className="h-5 w-5 mx-auto text-red-600 mb-1" />
                    <div className="font-bold text-red-900">{session.questions}</div>
                    <div className="text-xs text-red-600">Questions</div>
                  </div>
                </div>
              </div>

              {/* Temps restant */}
              <div className="space-y-4">
                <h3 className="font-semibold text-red-900">Temps</h3>
                <div className="text-center p-4 bg-white rounded-lg">
                  <Clock className="h-6 w-6 mx-auto text-red-600 mb-2" />
                  <div className="font-bold text-2xl text-red-900">{session.timeRemaining}</div>
                  <div className="text-sm text-red-600">restantes</div>
                  {session.allocatedTime !== undefined && (
                    <div className="text-sm text-red-600">Temps alloué: {session.allocatedTime} min</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Button className="bg-red-600 hover:bg-red-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                Voir les questions
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Autres sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.filter(s => s.status !== 'live').map(session => (
          <Card key={session.id} className="w-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <CardDescription>{session.description}</CardDescription>
                </div>
                <Badge className={getStatusColor(session.status)}>
                  {getStatusText(session.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {session.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {session.participants} participants
                  </div>
                  {session.allocatedTime !== undefined && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {session.allocatedTime} min allouées
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {session.moderator.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">Modéré par {session.moderator}</span>
                </div>

                <div className="flex gap-2">
                  {session.status === 'scheduled' && (
                    <>
                      <Button size="sm" className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Rejoindre
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {session.status === 'completed' && (
                    <Button size="sm" variant="outline" className="flex-1">
                      Voir le résumé
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}