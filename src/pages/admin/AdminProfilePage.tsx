import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Lock, Globe, Phone } from "lucide-react";

export function AdminProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    name: "Admin",
    email: "admin@example.com",
    phone: "+225 01 23 45 67 89",
    role: "Administrateur principal",
    lastLogin: "28/06/2025 14:30",
  });

  const handleSave = () => {
    setEditMode(false);
    // Ici on ajouterait l'appel API pour sauvegarder
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mon Profil</h1>
        {editMode ? (
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        ) : (
          <Button onClick={() => setEditMode(true)}>Modifier</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/avatars/admin.png" />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom complet</Label>
              {editMode ? (
                <Input id="name" value={profile.name} 
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                />
              ) : (
                <p className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-500" />
                  {profile.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              {editMode ? (
                <Input id="email" value={profile.email} 
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                />
              ) : (
                <p className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-500" />
                  {profile.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              {editMode ? (
                <Input id="phone" value={profile.phone} 
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                />
              ) : (
                <p className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-500" />
                  {profile.phone}
                </p>
              )}
            </div>

            <div>
              <Label>Rôle</Label>
              <p className="flex items-center gap-2 mt-1">
                <Globe className="h-4 w-4 text-gray-500" />
                {profile.role}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-gray-500" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Dernière connexion</Label>
            <p className="mt-1">{profile.lastLogin}</p>
          </div>
          <Button variant="outline">Changer le mot de passe</Button>
        </CardContent>
      </Card>
    </div>
  );
}