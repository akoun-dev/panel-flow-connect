import { useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, UserPlus, Shield, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockModerators = [
  {
    id: 1,
    name: "Marie Dubois",
    email: "marie.dubois@example.com",
    status: "active",
    assignedPanels: 5,
    lastActive: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    name: "Thomas Martin",
    email: "thomas.martin@example.com", 
    status: "active",
    assignedPanels: 3,
    lastActive: "2024-01-14T15:45:00Z"
  },
  {
    id: 3,
    name: "Sophie Lambert",
    email: "sophie.lambert@example.com",
    status: "pending",
    assignedPanels: 0,
    lastActive: null
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function AdminModeratorsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModerators = mockModerators.filter(mod => 
    mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mod.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modérateurs</h1>
          <p className="text-muted-foreground">
            Gestion des modérateurs de panels
          </p>
        </div>
        
        <Button className="gradient-primary hover:opacity-90">
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un modérateur
        </Button>
      </div>

      {/* Recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un modérateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des modérateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des modérateurs</CardTitle>
          <CardDescription>
            {filteredModerators.length} modérateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Panels assignés</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModerators.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-500" />
                      {mod.name}
                    </div>
                  </TableCell>
                  <TableCell>{mod.email}</TableCell>
                  <TableCell>{getStatusBadge(mod.status)}</TableCell>
                  <TableCell>{mod.assignedPanels}</TableCell>
                  <TableCell>
                    {mod.lastActive ? new Date(mod.lastActive).toLocaleString('fr-FR') : 'Jamais'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="mr-2">
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}