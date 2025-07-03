import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import PollService from '@/services/PollService';
import { supabase } from '@/lib/supabase';
import type { Poll, PollOption } from '@/types/poll';

interface PollViewerProps {
  pollId: string;
}

export function PollViewer({ pollId }: PollViewerProps) {
  const [poll, setPoll] = useState<Poll | null>(null);

  const fetchPoll = async () => {
    const { data, error } = await supabase
      .from('polls')
      .select('*, poll_options(id, text, poll_votes(count))')
      .eq('id', pollId)
      .single();
    if (!error && data) {
      const options = (data.poll_options as any[]).map((o) => ({
        id: o.id,
        poll_id: data.id,
        text: o.text,
        votes: o.poll_votes?.length ? o.poll_votes[0].count : 0
      })) as PollOption[];
      setPoll({ id: data.id, panel_id: data.panel_id, question: data.question, created_at: data.created_at, options });
    }
  };

  useEffect(() => {
    fetchPoll();
    const unsub = PollService.subscribeToPoll(pollId, fetchPoll);
    return unsub;
  }, [pollId]);

  const handleVote = async (optId: string) => {
    await PollService.vote(pollId, optId);
  };

  if (!poll) return null;
  const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{poll.question}</h3>
      {poll.options.map((o) => (
        <div key={o.id} className="space-y-1">
          <Button variant="outline" onClick={() => handleVote(o.id)}>{o.text}</Button>
          {total > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={(o.votes || 0) / total * 100} className="flex-1" />
              <span>{o.votes || 0}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
