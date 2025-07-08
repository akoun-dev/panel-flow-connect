import { PanelService } from '@/services/panelService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid')
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const insertMock = jest.fn();
const selectMock = jest.fn();
const singleMock = jest.fn();

(supabase.from as jest.Mock).mockReturnValue({
  insert: insertMock.mockReturnValue({ select: selectMock.mockReturnValue({ single: singleMock.mockResolvedValue({ data: {} }) }) })
});

describe('PanelService.createPanel', () => {
  it('sends start and end time when provided', async () => {
    await PanelService.createPanel({
      title: 't',
      description: 'd',
      date: '2024-01-01',
      time: '10:00',
      duration: 60,
      participants_limit: 10,
      category: 'c',
      user_id: 'u1',
      moderator_name: 'm',
      moderator_email: 'm@example.com',
      panelists: [],
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T11:00:00Z'
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T11:00:00Z'
    }));
  });
});
