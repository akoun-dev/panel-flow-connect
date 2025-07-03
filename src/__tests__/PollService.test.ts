import PollService from '@/services/PollService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user1' } } })
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => 'chan')
    })),
    removeChannel: jest.fn()
  }
}));

const pollsChain = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { id: 'poll1' } })
};
const optionsChain = { insert: jest.fn() };
const votesChain = { insert: jest.fn() };

(supabase.from as jest.Mock).mockImplementation((table: string) => {
  if (table === 'polls') return pollsChain;
  if (table === 'poll_options') return optionsChain;
  if (table === 'poll_votes') return votesChain;
  return {} as any;
});

describe('PollService', () => {
  it('creates poll with options', async () => {
    await PollService.createPoll('panel1', 'Q?', ['a', 'b']);
    expect(supabase.from).toHaveBeenCalledWith('polls');
    expect(pollsChain.insert).toHaveBeenCalledWith({ panel_id: 'panel1', question: 'Q?' });
    expect(optionsChain.insert).toHaveBeenCalledWith([
      { poll_id: 'poll1', text: 'a' },
      { poll_id: 'poll1', text: 'b' }
    ]);
  });

  it('records vote', async () => {
    await PollService.vote('poll1', 'opt1');
    expect(votesChain.insert).toHaveBeenCalledWith({ poll_id: 'poll1', option_id: 'opt1', user_id: 'user1' });
  });

  it('subscribes to poll updates', () => {
    const cb = jest.fn();
    const unsub = PollService.subscribeToPoll('poll1', cb);
    expect(supabase.channel).toHaveBeenCalledWith('poll_votes:poll1');
    unsub();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
