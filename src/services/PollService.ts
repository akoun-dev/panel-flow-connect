import { supabase } from '@/lib/supabase';
import type { Poll } from '@/types/poll';
import { RealtimeChannel } from '@supabase/supabase-js';

class PollService {
  private static channels: Record<string, RealtimeChannel> = {};

  static async createPoll(panelId: string, question: string, options: string[]): Promise<Poll> {
    const { data: poll, error } = await supabase
      .from('polls')
      .insert({ panel_id: panelId, question })
      .select()
      .single();
    if (error || !poll) throw error;

    if (options.length) {
      const rows = options.map(text => ({ poll_id: poll.id, text }));
      const { error: optErr } = await supabase.from('poll_options').insert(rows);
      if (optErr) throw optErr;
    }

    return { ...poll, options: options.map((text, i) => ({ id: '', poll_id: poll.id, text, votes: 0 })) } as Poll;
  }

  static async vote(pollId: string, optionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: user?.id ?? null
    });
    if (error) throw error;
  }

  static subscribeToPoll(pollId: string, cb: () => void) {
    const channel = supabase
      .channel(`poll_votes:${pollId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'poll_votes',
        filter: `poll_id=eq.${pollId}`
      }, cb)
      .subscribe();

    this.channels[pollId] = channel;
    return () => supabase.removeChannel(channel);
  }
}

export default PollService;
