
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  Play, 
  Edit, 
  Trash2,
  Filter
} from "lucide-react";

const mockPanels = [
  {
    id: 1,
    title: "Innovation dans l'IA et l'automatisation",
    description: "Discussion approfondie sur les dernières avancées en intelligence artificielle et leur impact sur l'automatisation des processus métiers.",
    date: "2024-01-15",
    time: "14:00",
    duration: "2h",
    participants: 45,
    maxParticipants: 60,
    status: "live",
    moderator: "Dr. Sarah Martin",
    category: "Technologie"
  },
  {
    id: 2,
    title: "Développement Durable et Tech",
    description: "Comment la technologie peut-elle contribuer efficacement au développement durable ? Quels sont les enjeux et les solutions ?",
    date: "2024-01-16",
    time: "16:30",
    duration: "1h30",
    participants: 32,
    maxParticipants: 50,
    status: "scheduled",
    moderator: "Prof. Michel Dubois",
    category: "Environnement"
  },
  {
    id: 3,
    title: "Future of Remote Work",
    description: "L'avenir du travail à distance post-pandémie : défis, opportunités et meilleures pratiques pour les entreprises.",
    date: "2024-01-14",
    time: "10:00",
    duration: "2h30",
    participants: 67,
    maxParticipants: 80,
    status: "completed",
    moderator: "Anna Rodriguez",
    category: "Business"
  },
  {
    id: 4,
    title: "Cybersécurité pour les PME",
    description: "Guide pratique de cybersécurité adapté aux petites et moyennes entreprises : risques, solutions et bonnes pratiques.",
    date: "2024-01-17",
    time: "09:00",
    duration: "1h45",
    participants: 0,
    maxParticipants: 40,
    status: "draft",
    moderator: "Marc Leclerc",
    category: "Sécurité"
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
    case "draft":
      return <Badge className="bg-gray-100 text-gray-800">📝 Brouillon</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function AdminPanelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredPanels = mockPanels.filter(panel => 
    panel.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === "all" || panel.category === selectedCategory)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Panels</h1>
          <p className="text-muted-foreground">
            Créez, modifiez et gérez vos panels et conférences
          </p>
        </div>
        
        <Button className="gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Panel
        </Button>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher un panel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des panels */}
      <div className="grid gap-6">
        {filteredPanels.map((panel) => (
          <Card key={panel.id} className="hover-lift panel-glow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{panel.title}</CardTitle>
                    {getStatusBadge(panel.status)}
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {panel.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {panel.status === "live" && (
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      <Play className="h-4 w-4 mr-1" />
                      Rejoindre
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(panel.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{panel.time} ({panel.duration})</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{panel.participants}/{panel.maxParticipants} participants</span>
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium">Modérateur:</span> {panel.moderator}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">{panel.category}</Badge>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      Taux de participation: {Math.round((panel.participants / panel.maxParticipants) * 100)}%
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(panel.participants / panel.maxParticipants) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPanels.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Aucun panel trouvé</p>
              <p>Essayez de modifier vos critères de recherche ou créez un nouveau panel.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
