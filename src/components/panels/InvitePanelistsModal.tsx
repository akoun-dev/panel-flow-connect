import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import PanelInvitationService from '@/services/PanelInvitationService';
import type { Panel } from '@/types/panel';

interface InvitePanelistsModalProps {
  open: boolean;
  panel: Panel | null;
  onClose: () => void;
}

export function InvitePanelistsModal({ open, panel, onClose }: InvitePanelistsModalProps) {
  const [emails, setEmails] = useState('');

  const handleSend = async () => {
    if (!panel) return;
    const list = emails.split(/[\s,;]+/).filter(e => e);
    for (const email of list) {
      try {
        await PanelInvitationService.sendInvitation({ id: panel.id, title: panel.title }, { email });
        toast.success(`Invitation envoyée à ${email}`);
      } catch {
        toast.error(`Erreur lors de l'envoi à ${email}`);
      }
    }
    setEmails('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter des participants</DialogTitle>
          <DialogDescription>Saisissez une ou plusieurs adresses séparées par une virgule.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="email1@example.com, email2@example.com"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSend}>Envoyer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
