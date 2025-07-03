import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Panel, Panelist } from '@/types/panel';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PanelInvitation {
  id: string;
  panel_id: string;
  panelist_email: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
}

class PanelInvitationService {
  private static invitationChannel: RealtimeChannel;

  static initializeRealtime() {
    this.invitationChannel = supabase
      .channel('invitation_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'panel_invitations'
      }, (payload) => {
        document.dispatchEvent(new CustomEvent('invitationSent', {
          detail: payload.new
        }));
      })
      .subscribe();
  }
  static async checkUserRegistration(email: string): Promise<boolean> {
    // Vérification via le champ email dédié de la table users
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Erreur vérification utilisateur:', error);
      return false;
    }
    return !!data?.id;
  }

  static async sendInvitation(panel: { id: string; title: string }, panelist: { email: string; id?: string; name?: string }): Promise<void> {
    const isRegistered = await this.checkUserRegistration(panelist.email);
    const uniqueToken = crypto.randomUUID();
    
    // Récupérer l'ID de l'utilisateur authentifié
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Utilisateur non authentifié');

    // Vérifier directement si la table existe via une requête
    const { data, error } = await supabase
      .from('panel_invitations')
      .select('*')
      .limit(1);

    if (error?.code === '42P01') { // 42P01 = table does not exist
      throw new Error('La table panel_invitations n\'existe pas');
    }

    // Utiliser upsert avec onConflict pour gérer les doublons
    const { error: inviteError } = await supabase
      .from('panel_invitations')
      .upsert({
        panel_id: panel.id,
        panelist_email: panelist.email,
        unique_token: uniqueToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire dans 7 jours
        status: 'pending',
        user_id: user.id // Ajout du user_id pour respecter la politique RLS
      }, {
        onConflict: 'panel_id,panelist_email',
        ignoreDuplicates: false
      });

    if (inviteError) throw inviteError;
  }

  static async acceptInvitation(invitationId: string, userId: string) {
    logger.debug(`[acceptInvitation] Début acceptation invitation id=${invitationId} userId=${userId}`);

    // Met à jour le statut de l'invitation en 'accepted'
    const { data: invitation, error: fetchError } = await supabase
      .from('panel_invitations')
      .select('panel_id, panelist_email')
      .eq('id', invitationId)
      .single();

    if (fetchError) {
      console.error(`[acceptInvitation] Erreur récupération invitation: ${fetchError.message}`);
      throw new Error(`Erreur lors de la récupération de l'invitation: ${fetchError.message}`);
    }
    logger.debug(`[acceptInvitation] Invitation récupérée:`, invitation);

    const { error: updateError } = await supabase
      .from('panel_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (updateError) {
      console.error(`[acceptInvitation] Erreur mise à jour invitation: ${updateError.message}`);
      throw new Error(`Erreur lors de la mise à jour de l'invitation: ${updateError.message}`);
    }
    logger.debug(`[acceptInvitation] Invitation mise à jour en 'accepted'`);

    // Récupérer les données du panel pour créer l'entrée dans user_planning
    const { data: panel, error: panelError } = await supabase
      .from('panels')
      .select('title, description, date, time, duration, status')
      .eq('id', invitation.panel_id)
      .single();

    if (panelError) {
      console.error(`[acceptInvitation] Erreur récupération panel: ${panelError.message}`);
      throw new Error(`Erreur lors de la récupération du panel: ${panelError.message}`);
    }
    logger.debug(`[acceptInvitation] Panel récupéré:`, panel);

    // Créer l'entrée dans user_planning
    const { error: planningError } = await supabase
      .from('user_planning')
      .insert({
        panel_id: invitation.panel_id,
        user_id: userId,
        title: panel.title,
        description: panel.description,
        date: panel.date,
        time: panel.time,
        duration: panel.duration,
        status: panel.status
      });

    if (planningError) {
      console.error(`[acceptInvitation] Erreur création planning: ${planningError.message}`);
      throw new Error(`Erreur lors de la création du planning: ${planningError.message}`);
    }
    logger.debug(`[acceptInvitation] Entrée planning créée avec succès`);
  }

  static generateUniqueLink(panelId: string, panelistId: string): string {
    const token = crypto.randomUUID();
    return `${window.location.origin}/panel/join?token=${token}`;
  }

  static async getInvitationsByUser(email: string): Promise<PanelInvitation[]> {
    logger.debug('[DEBUG] Recherche invitations pour email:', email);
    if (!email) {
      console.warn('[WARN] Email vide fourni à getInvitationsByUser');
      return [];
    }

    logger.debug('[DEBUG] Exécution requête Supabase...');
    logger.debug('[DEBUG] Exécution requête pour email:', email);
    const { data, error, count } = await supabase
      .from('panel_invitations')
      .select(`
        id,
        panel_id,
        panelist_email,
        status,
        expires_at,
        created_at
      `, {
        count: 'exact',
        head: false // Important pour contourner RLS temporairement
      })
      .eq('panelist_email', email)
      .order('created_at', { ascending: false });

    logger.debug('[DEBUG] Résultat requête:', {
      data,
      error,
      count,
      hasData: !!data?.length,
      emailUsed: email
    });

    // Test direct avec une requête simple
    const testQuery = await supabase
      .from('panel_invitations')
      .select('*')
      .eq('panelist_email', email)
      .limit(1);
    logger.debug('[DEBUG] Test direct:', testQuery);

    logger.debug('[DEBUG] Résultat requête:', { data, error });
    
    if (error) {
      console.error('[ERROR] Erreur fetching invitations:', error);
      throw new Error('Failed to load invitations');
    }

    logger.debug('[DEBUG] Invitations trouvées:', data?.length || 0);
    return data || [];
  }

  static async createInvitation(params: {
    panel_id: string;
    panelist_email: string;
    user_id: string;
  }): Promise<string> {
    // Validation de l'email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.panelist_email)) {
      throw new Error('Format d\'email invalide');
    }

    // Vérification de l'existence de l'email dans la table users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', params.panelist_email)
      .maybeSingle();

    if (!existingUser) {
      throw new Error('Cet email n\'est pas associé à un compte utilisateur');
    }

    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('panel_invitations')
      .insert({
        panel_id: params.panel_id,
        panelist_email: params.panelist_email,
        user_id: params.user_id,
        unique_token: token,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

    if (error) throw error;
    return `${window.location.origin}/panel/join?token=${token}`;
  }
}

export default PanelInvitationService;

// Initialiser le canal Realtime au chargement
PanelInvitationService.initializeRealtime();
