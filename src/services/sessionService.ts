import { supabase } from '@/lib/supabase';

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

    return ((data as any[]) || []).map((item) => ({
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
};

export default SessionService;
