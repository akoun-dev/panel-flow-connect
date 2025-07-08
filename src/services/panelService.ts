import { supabase } from '@/lib/supabase';
import { generateUUID } from '@/lib/uuid';

import type { Panel, Panelist } from '@/types/panel';

export const PanelService = {
    async getPanelById(id: string) {
        const { data, error } = await supabase
            .from('panels')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Panel;
    },

  async createPanel(
    panelData: Omit<
      Panel,
      'id' | 'status' | 'created_at' | 'updated_at' | 'user_id' | 'qr_code_url' | 'participants'
    > & {
      user_id: string;
      moderator_name: string;
      moderator_email: string;
      participants_limit: number;
      start_time?: string;
      end_time?: string;
    }
  ) {
    const generatedId = generateUUID();
    const qrUrl = `${window.location.origin}/panel/${generatedId}/polls`;

    const { data, error } = await supabase
      .from('panels')
      .insert({
        ...panelData,
        id: generatedId,
        status: 'draft',
        qr_code_url: qrUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data as Panel;
  },

  async getPanels(userId: string) {
    const { data, error } = await supabase
      .from('panels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Panel[];
  },

  async hasOwnPanel(userId: string, userEmail?: string) {
    let query = supabase
      .from('panels')
      .select('id')
      .or(`user_id.eq.${userId}${userEmail ? ",moderator_email.eq." + userEmail : ''}`)
      .limit(1)
      .maybeSingle();

    const { data, error } = await query;
    if (error) throw error;
    return !!data;
  },

  async updatePanel(id: string, updates: Partial<Omit<Panel, 'qr_code_url'>>) {
    // Vérifier d'abord si le panel existe
    const { data: existingPanel, error: fetchError } = await supabase
      .from('panels')
      .select('id, qr_code_url')
      .eq('id', id)
      .single();

    if (fetchError || !existingPanel) {
      throw new Error(`Panel with id ${id} not found`);
    }

    // Effectuer la mise à jour en s'assurant que qr_code_url n'est pas modifié
    const cleanUpdates: Partial<Panel> = { ...updates };
    if ('qr_code_url' in cleanUpdates) {
      delete cleanUpdates.qr_code_url;
    }
    const { data, error } = await supabase
      .from('panels')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Panel;
  },

  async deletePanel(id: string) {
    const { error } = await supabase
      .from('panels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async changePanelStatus(id: string, status: Panel['status']) {
    return this.updatePanel(id, { status });
  }
};
