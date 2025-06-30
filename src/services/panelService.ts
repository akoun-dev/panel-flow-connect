import { supabase } from '@/lib/supabase';

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

    async createPanel(panelData: Omit<Panel, 'id' | 'status' | 'created_at' | 'updated_at' | 'user_id' | 'qr_code' | 'participants'> & {
    user_id: string;
    moderator_name: string;
    moderator_email: string;
    participants_limit: number;
  }) {
    // Générer un QR code unique basé sur l'ID utilisateur et le timestamp
    const qrCode = `panel-${panelData.user_id}-${Date.now()}`;
    
    const { data, error } = await supabase
      .from('panels')
      .insert({
        ...panelData,
        status: 'draft',
        qr_code: qrCode
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

  async updatePanel(id: string, updates: Partial<Omit<Panel, 'qr_code'>>) {
    // Vérifier d'abord si le panel existe
    const { data: existingPanel, error: fetchError } = await supabase
      .from('panels')
      .select('id, qr_code')
      .eq('id', id)
      .single();

    if (fetchError || !existingPanel) {
      throw new Error(`Panel with id ${id} not found`);
    }

    // Effectuer la mise à jour en s'assurant que qr_code n'est pas modifié
    const cleanUpdates: Partial<Panel> = { ...updates };
    if ('qr_code' in cleanUpdates) {
      delete cleanUpdates.qr_code;
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
