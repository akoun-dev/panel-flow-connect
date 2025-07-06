import { supabase } from '@/lib/supabase';
import type { Session } from '@/types/session';

export interface PanelistSession {
  id: string;
  panel_id: string;
  title: string;
  description: string;
  theme: string;
  status: string;
  allocated_time: number | null;
  start_time: string | null;
  end_time: string | null;
  moderator: string;
}

interface PanelInvitationRow {
  id: string;
  panel_id: string;
  panels?: {
    title?: string;
    description?: string;
    theme?: string;
    status?: string;
    allocated_time?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    users?: {
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
}

const SessionService = {
  async getSessionsForPanelist(email: string): Promise<PanelistSession[]> {
    const { data, error } = await supabase
      .from('panel_invitations')
      .select(
        `
        id,
        panel_id,
        panels!inner(
          id,
          title,
          description,
          theme,
          status,
          allocated_time,
          start_time,
          end_time,
          user_id,
          users!user_id(
            first_name,
            last_name,
            email
          )
        )
      `
      )
      .eq('panelist_email', email)
      .eq('status', 'accepted');

    if (error) throw error;

    return ((data as PanelInvitationRow[]) || []).map((item) => ({
      id: item.id,
      panel_id: item.panel_id,
      title: item.panels?.title ?? '',
      description: item.panels?.description ?? '',
      theme: item.panels?.theme ?? '',
      status: item.panels?.status ?? '',
      allocated_time: item.panels?.allocated_time ?? null,
      start_time: item.panels?.start_time ?? null,
      end_time: item.panels?.end_time ?? null,
      moderator: item.panels?.users
        ? `${item.panels.users.first_name} ${item.panels.users.last_name}`.trim() ||
          item.panels.users.email
        : '',
    }));
  },

  async getRecordedSessions(email: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('panelist_email', email);

    if (error) throw error;

    return (data as Session[]) || [];
  },
  async getByPanelAndUser(panelId: string, email: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('panel_id', panelId)
      .eq('panelist_email', email);

    if (error) throw error;
    return (data as Session[]) || [];
  },

  async insert(
    session: Omit<Session, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single();

    if (error || !data) throw error;
    return data as Session;
  },
};

export default SessionService;
