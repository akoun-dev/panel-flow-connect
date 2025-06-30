
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Play, Eye } from "lucide-react";

const recentPanels = [
  {
    id: 1,
    title: "Innovation dans l'IA et l'automatisation",
    description: "Discussion sur les dernières avancées en intelligence artificielle",
    date: "2024-01-15",
    time: "14:00",
    participants: 45,
    status: "live",
    moderator: "Dr. Sarah Martin"
  },
  {
    id: 2,
    title: "Développement Durable et Tech",
    description: "Comment la technologie peut-elle contribuer au développement durable ?",
    date: "2024-01-14",
    time: "16:30",
    participants: 32,
    status: "scheduled",
    moderator: "Prof. Michel Dubois"
  },
  {
    id: 3,
    title: "Future of Remote Work",
    description: "L'avenir du travail à distance post-pandémie",
    date: "2024-01-13",
    time: "10:00",
    participants: 67,
    status: "completed",
    moderator: "Anna Rodriguez"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "live":
      return <Badge className="bg-red-100 text-red-800 animate-pulse">🔴 En direct</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-100 text-blue-800">📅 Programmé</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800">✅ Terminé</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function RecentPanels() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Panels Récents</CardTitle>
        <CardDescription>
          Aperçu des dernières sessions et panels organisés
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentPanels.map((panel) => (
            <div key={panel.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm">{panel.title}</h3>
                  {getStatusBadge(panel.status)}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {panel.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(panel.date).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {panel.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {panel.participants} participants
                  </div>
                </div>
                <p className="text-xs">Modérateur: {panel.moderator}</p>
              </div>
              <div className="flex items-center gap-2">
                {panel.status === "live" && (
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    <Play className="h-3 w-3 mr-1" />
                    Rejoindre
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Eye className="h-3 w-3 mr-1" />
                  Voir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
