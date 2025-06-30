
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  Users, 
  MessageSquare, 
  Download, 
  BarChart3,
  Calendar,
  Star
} from "lucide-react";

const mockHistory = [
  {
    id: 1,
    title: "Panel Innovation Tech 2024",
    date: "2024-01-10",
    duration: "1h 30min",
    participants: 67,
    questions: 23,
    rating: 4.8,
    transcript: true,
    summary: "Discussion approfondie sur l'IA générative et son impact sur les industries créatives. Excellents échanges avec l'audience.",
    moderator: "Marie Dubois",
    topics: ["IA", "Innovation", "Technologie"]
  },
  {
    id: 2,
    title: "Débat Économie Numérique",
    date: "2024-01-05",
    duration: "2h 00min",
    participants: 89,
    questions: 31,
    rating: 4.6,
    transcript: true,
    summary: "Analyse des impacts de la digitalisation sur l'économie traditionnelle. Débat constructif sur les enjeux de formation.",
    moderator: "Jean Martin",
    topics: ["Économie", "Digital", "Formation"]
  },
  {
    id: 3,
    title: "Table Ronde Startup",
    date: "2023-12-20",
    duration: "45min",
    participants: 45,
    questions: 18,
    rating: 4.9,
    transcript: false,
    summary: "Partage d'expériences sur l'entrepreneuriat et les défis des jeunes entreprises. Très bonne interaction avec les participants.",
    moderator: "Sophie Laurent",
    topics: ["Entrepreneuriat", "Startup", "Innovation"]
  }
];

export function UserHistory() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-muted-foreground mt-1">Vos participations précédentes</p>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-900">{mockHistory.length}</p>
                <p className="text-sm text-emerald-600">Sessions totales</p>
              </div>
              <Calendar className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-900">
                  {mockHistory.reduce((acc, session) => acc + session.participants, 0)}
                </p>
                <p className="text-sm text-emerald-600">Participants touchés</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-900">
                  {mockHistory.reduce((acc, session) => acc + session.questions, 0)}
                </p>
                <p className="text-sm text-emerald-600">Questions reçues</p>
              </div>
              <MessageSquare className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-900">
                  {(mockHistory.reduce((acc, session) => acc + session.rating, 0) / mockHistory.length).toFixed(1)}
                </p>
                <p className="text-sm text-emerald-600">Note moyenne</p>
              </div>
              <Star className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des sessions passées */}
      <div className="space-y-6 w-full">
        {mockHistory.map(session => (
          <Card key={session.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{session.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{session.rating}</span>
                    </div>
                  </div>
                  <CardDescription>{session.summary}</CardDescription>
                </div>
                <Badge variant="outline">
                  {new Date(session.date).toLocaleDateString('fr-FR')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{session.duration}</p>
                    <p className="text-sm text-gray-600">Durée</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{session.participants}</p>
                    <p className="text-sm text-gray-600">Participants</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{session.questions}</p>
                    <p className="text-sm text-gray-600">Questions</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm">
                      {session.moderator.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{session.moderator}</p>
                    <p className="text-sm text-gray-600">Modérateur</p>
                  </div>
                </div>
              </div>

              {/* Sujets abordés */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Sujets abordés :</h4>
                <div className="flex gap-2">
                  {session.topics.map(topic => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Voir les statistiques
                </Button>
                {session.transcript && (
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger transcript
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Rapport PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message si aucun historique */}
      {mockHistory.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Aucun historique</h3>
            <p className="text-gray-600">
              Vos sessions passées apparaîtront ici après vos premières participations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
