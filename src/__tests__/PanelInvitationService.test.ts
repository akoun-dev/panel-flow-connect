import PanelInvitationService from '@/services/PanelInvitationService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  }
}));

describe('PanelInvitationService.createInvitation', () => {
  const insertMock = jest.fn();
  (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

  beforeEach(() => {
    insertMock.mockClear();
  });

  it('creates invitation with token and panel id', async () => {
    const link = await PanelInvitationService.createInvitation({
      panel_id: 'p1',
      panelist_email: 'test@example.com',
      user_id: 'u1'
    });
    const args = insertMock.mock.calls[0][0];
    expect(args.panel_id).toBe('p1');
    expect(args.panelist_email).toBe('test@example.com');
    expect(args.unique_token).toBeDefined();
    expect(link).toContain('/panel/join?token=');
  });
});
