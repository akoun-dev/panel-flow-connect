
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ModeratorFormProps {
  moderator?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ModeratorForm({ moderator, onSubmit, onCancel }: ModeratorFormProps) {
  const [formData, setFormData] = useState({
    name: moderator?.name || "",
    email: moderator?.email || "",
    phone: moderator?.phone || "",
    role: moderator?.role || "Modérateur",
    bio: moderator?.bio || "",
    specialties: moderator?.specialties || [],
    status: moderator?.status || "active"
  });

  const [currentSpecialty, setCurrentSpecialty] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSpecialty = () => {
    if (currentSpecialty.trim() && !formData.specialties.includes(currentSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, currentSpecialty.trim()]
      }));
      setCurrentSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Nom Prénom"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="email@example.com"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Rôle</Label>
          <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Modérateur Senior">Modérateur Senior</SelectItem>
              <SelectItem value="Modérateur">Modérateur</SelectItem>
              <SelectItem value="Modérateur Junior">Modérateur Junior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biographie</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleInputChange("bio", e.target.value)}
          placeholder="Décrivez l'expérience et les qualifications du modérateur..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Spécialités</Label>
        <div className="flex gap-2">
          <Input
            value={currentSpecialty}
            onChange={(e) => setCurrentSpecialty(e.target.value)}
            placeholder="Ajouter une spécialité"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
          />
          <Button type="button" onClick={addSpecialty} variant="outline">
            Ajouter
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.specialties.map((specialty, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {specialty}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeSpecialty(specialty)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          {moderator ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
