import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Panel, Panelist } from '@/types/panel'
import { PanelService } from '@/services/panelService'
import { moveItem } from '@/lib/reorder'

export function PanelRegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Panel>()
  const [panelists, setPanelists] = useState<Panelist[]>([])
  const [newPanelist, setNewPanelist] = useState<Panelist>({
    name: '',
    email: '',
    title: '',
    organization: '',
    theme: '',
    allocatedTime: '',
    requirements: '',
    bio: ''
  })

  const movePanelist = (index: number, direction: 'up' | 'down') => {
    setPanelists(prev => {
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      return moveItem(prev, index, newIndex)
    })
  }

  const onSubmit = (data: Panel) => {
    const completeData = {
      ...data,
      panelists
    }
    console.log('Panel data:', completeData)
    PanelService.createPanel({
      ...completeData,
      user_id: 'demo-user',
      moderator_name: 'moderator',
      moderator_email: 'moderator@example.com',
      participants_limit: panelists.length,
      tags: []
    })
  }

  const addPanelist = () => {
    if (newPanelist.name && newPanelist.email) {
      setPanelists([...panelists, newPanelist])
      setNewPanelist({
        name: '',
        email: '',
        title: '',
        organization: '',
        theme: '',
        allocatedTime: '',
        requirements: '',
        bio: ''
      })
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Nouveau Panel</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section Informations du panel */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">1. Informations du Panel</h3>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Titre du Panel*</Label>
              <Input
                id="title"
                {...register('title', { required: 'Ce champ est requis' })}
                placeholder="Ex: Digital Innovation in Africa"
              />
              {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="date">Date*</Label>
              <Input
                id="date"
                type="date"
                {...register('date', { required: 'Ce champ est requis' })}
              />
              {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description détaillée*</Label>
            <Textarea
              id="description"
              {...register('description', { required: 'Ce champ est requis' })}
              rows={4}
              placeholder="Objectifs, thèmes, public cible..."
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
          </div>
        </div>

        {/* Section Panelistes */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">2. Panelistes</h3>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Thème</TableHead>
                <TableHead>Temps</TableHead>
                <TableHead className="w-24">Ordre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panelists.map((panelist, index) => (
                <TableRow key={index}>
                  <TableCell>{panelist.name}</TableCell>
                  <TableCell>{panelist.email}</TableCell>
                  <TableCell>{panelist.title}</TableCell>
                  <TableCell>{panelist.organization}</TableCell>
                  <TableCell>{panelist.theme}</TableCell>
                  <TableCell>{panelist.allocatedTime}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => movePanelist(index, 'up')}
                        data-testid={`move-up-${index}`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === panelists.length - 1}
                        onClick={() => movePanelist(index, 'down')}
                        data-testid={`move-down-${index}`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="panelist-name">Nom complet*</Label>
              <Input
                id="panelist-name"
                value={newPanelist.name}
                onChange={(e) => setNewPanelist({...newPanelist, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="panelist-email">Email*</Label>
              <Input
                id="panelist-email"
                type="email"
                value={newPanelist.email}
                onChange={(e) => setNewPanelist({...newPanelist, email: e.target.value})}
              />
            </div>
            {/* Autres champs paneliste... */}
          </div>

          <Button type="button" onClick={addPanelist}>
            Ajouter Paneliste
          </Button>
        </div>

        <Button type="submit">Enregistrer le Panel</Button>
      </form>
    </div>
  )
}