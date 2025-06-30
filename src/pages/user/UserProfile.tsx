import { useState, useEffect } from "react";
import { UserLayout } from '@/layouts/UserLayout';
import { supabase } from '@/lib/supabase';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Save,
  Upload,
  Bell,
  Mail,
  Lock,
  Globe,
  Calendar,
  User,
  Edit3
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

export default function UserProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "user",
    avatar: "/avatars/default.png",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "user",
            avatar: data.avatar || "/avatars/default.png",
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString()
          });
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (!error) {
          setEditing(false);
          toast({
            title: "Profil mis à jour",
            description: "Vos informations ont été enregistrées avec succès",
            variant: "default"
          });
        }
      }
    } catch (error) {
      setError('Erreur lors de la mise à jour du profil');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="space-y-6 w-full">
        <div className="flex justify-between items-center px-4 pt-4">
          <div>
            <h1 className="text-2xl font-bold">Profil Utilisateur</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos informations personnelles et préférences
            </p>
          </div>
          <Button onClick={() => setEditing(!editing)}>
            <Edit3 className="h-4 w-4 mr-2" />
            {editing ? "Annuler" : "Modifier"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 px-6 pb-6">
          {/* Colonne gauche - Photo et infos basiques */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Photo de profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Changer la photo
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    JPG, GIF ou PNG. 1MB max.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne centrale - Informations principales */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input
                      value={profile.first_name}
                      onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={profile.last_name}
                      onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                      disabled={!editing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    disabled={!editing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    disabled={!editing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Input
                    value={profile.role}
                    disabled={true}
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Colonne droite - Sécurité et préférences */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mot de passe actuel</Label>
                  <Input 
                    type="password" 
                    value={password.current}
                    onChange={(e) => setPassword({...password, current: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input 
                    type="password" 
                    value={password.new}
                    onChange={(e) => setPassword({...password, new: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le mot de passe</Label>
                  <Input 
                    type="password" 
                    value={password.confirm}
                    onChange={(e) => setPassword({...password, confirm: e.target.value})}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    if (password.new !== password.confirm) {
                      alert("Les mots de passe ne correspondent pas");
                      return;
                    }
                    
                    try {
                      const { error } = await supabase.auth.updateUser({
                        password: password.new
                      });
                      
                      if (error) throw error;
                      
                      toast({
                        title: "Mot de passe mis à jour",
                        description: "Votre mot de passe a été changé avec succès",
                        variant: "default"
                      });
                      setPassword({
                        current: "",
                        new: "",
                        confirm: ""
                      });
                    } catch (error) {
                      alert("Erreur lors de la mise à jour du mot de passe");
                      console.error(error);
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Changer le mot de passe
                </Button>
              </CardContent>
            </Card>


          </div>
        </div>

        {editing && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
            {error && (
              <div className="text-red-500 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
  );
}