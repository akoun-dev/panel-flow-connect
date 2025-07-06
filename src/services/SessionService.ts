import { supabase } from '@/lib/supabase';
import type { Session } from '@/types/session';

const SessionService = {
  async getByPanelAndUser(panelId: string, email: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('panel_id', panelId)
      .eq('panelist_email', email);

    if (error) throw error;
    return (data as Session[]) || [];
  },

  async insert(session: Omit<Session, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data as Session;
  }
};

export default SessionService;
