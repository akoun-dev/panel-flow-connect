
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  Search,
  Calendar
} from "lucide-react";

const mockNotes = [
  {
    id: 1,
    title: "Points clés - Innovation Tech",
    content: "- IA générative : impact majeur sur les industries créatives\n- Blockchain : applications au-delà des cryptomonnaies\n- IoT : sécurité et vie privée restent des défis\n- Quantum computing : encore 5-10 ans avant l'adoption massive",
    session: "Panel Innovation Tech 2024",
    lastModified: "2024-01-10",
    tags: ["tech", "innovation", "ai"]
  },
  {
    id: 2,
    title: "Arguments écologie",
    content: "- Transition énergétique : nécessité de politique publique forte\n- Entreprises : RSE devient un avantage concurrentiel\n- Consommateurs : prise de conscience croissante\n- Technologies vertes : financement et scalabilité",
    session: "Table Ronde Écologie",
    lastModified: "2024-01-08",
    tags: ["écologie", "environnement", "rse"]
  },
  {
    id: 3,
    title: "Statistiques économie numérique",
    content: "- 60% des PME ont digitalisé leurs processus en 2023\n- E-commerce : +15% de croissance annuelle\n- Télétravail : 35% des emplois compatibles\n- Formation numérique : besoin de 2M de personnes d'ici 2025",
    session: "Débat Économie Numérique",
    lastModified: "2024-01-05",
    tags: ["économie", "digital", "statistiques"]
  }
];

export function UserNotes() {
  const [notes, setNotes] = useState(mockNotes);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [newNote, setNewNote] = useState({ title: "", content: "", session: "" });
  const [showNewNote, setShowNewNote] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.session.toLowerCase().includes(searchTerm.toLowerCase())
  );

  interface NoteData {
    title?: string;
    content?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  const handleSaveNote = (noteId: number, updatedNote: Partial<NoteData>) => {
    setNotes(notes.map(note => 
      note.id === noteId 
        ? { ...note, ...updatedNote, lastModified: new Date().toISOString().split('T')[0] }
        : note
    ));
    setEditingNote(null);
  };

  const handleCreateNote = () => {
    if (newNote.title && newNote.content) {
      const newId = Math.max(...notes.map(n => n.id)) + 1;
      setNotes([...notes, {
        id: newId,
        ...newNote,
        lastModified: new Date().toISOString().split('T')[0],
        tags: []
      }]);
      setNewNote({ title: "", content: "", session: "" });
      setShowNewNote(false);
    }
  };

  const handleDeleteNote = (noteId: number) => {
    setNotes(notes.filter(note => note.id !== noteId));
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mes Notes</h1>
          <p className="text-muted-foreground mt-1">Organisez vos idées et préparations</p>
        </div>
        <Button onClick={() => setShowNewNote(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle note
        </Button>
      </div>

      {/* Barre de recherche */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Rechercher dans vos notes..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Formulaire nouvelle note */}
      {showNewNote && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-900">Nouvelle note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Titre de la note"
              value={newNote.title}
              onChange={(e) => setNewNote({...newNote, title: e.target.value})}
            />
            <Input
              placeholder="Session associée (optionnel)"
              value={newNote.session}
              onChange={(e) => setNewNote({...newNote, session: e.target.value})}
            />
            <Textarea
              placeholder="Contenu de la note..."
              rows={6}
              value={newNote.content}
              onChange={(e) => setNewNote({...newNote, content: e.target.value})}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateNote}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setShowNewNote(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {filteredNotes.map(note => (
          <Card key={note.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {editingNote === note.id ? (
                    <Input
                      defaultValue={note.title}
                      className="font-semibold"
                      onBlur={(e) => handleSaveNote(note.id, { title: e.target.value })}
                    />
                  ) : (
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                  )}
                  {note.session && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {note.session}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingNote === note.id ? (
                <div className="space-y-4">
                  <Textarea
                    defaultValue={note.content}
                    rows={8}
                    onBlur={(e) => handleSaveNote(note.id, { content: e.target.value })}
                  />
                  <Button size="sm" onClick={() => setEditingNote(null)}>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="whitespace-pre-line text-gray-700">
                    {note.content}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {note.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      Modifié le {new Date(note.lastModified).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message si aucune note */}
      {filteredNotes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {searchTerm ? "Aucune note trouvée" : "Aucune note créée"}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? "Essayez avec d'autres mots-clés." 
                : "Commencez par créer votre première note."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
