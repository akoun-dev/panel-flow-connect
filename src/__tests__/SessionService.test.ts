import SessionService from '@/services/SessionService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() }
}));

describe('SessionService.getByPanelAndUser', () => {
  const selectMock = jest.fn();
  const eqPanelMock = jest.fn();
  const eqEmailMock = jest.fn();

  beforeEach(() => {
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqPanelMock });
    eqPanelMock.mockReturnValue({ eq: eqEmailMock });
    eqEmailMock.mockResolvedValue({ data: [], error: null });

    selectMock.mockClear();
    eqPanelMock.mockClear();
    eqEmailMock.mockClear();
  });

  it('queries sessions by panel and user', async () => {
    await SessionService.getByPanelAndUser('p1', 'user@example.com');
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqPanelMock).toHaveBeenCalledWith('panel_id', 'p1');
    expect(eqEmailMock).toHaveBeenCalledWith('panelist_email', 'user@example.com');
  });
});

describe('SessionService.insert', () => {
  const insertMock = jest.fn();
  const selectMock = jest.fn();
  const singleMock = jest.fn();

  beforeEach(() => {
    (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });
    insertMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ single: singleMock });
    singleMock.mockResolvedValue({ data: {}, error: null });

    insertMock.mockClear();
    selectMock.mockClear();
    singleMock.mockClear();
  });

  it('inserts a session', async () => {
    const payload = { title: 'Test Session' } as any;
    await SessionService.insert(payload);
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    expect(insertMock).toHaveBeenCalledWith(payload);
    expect(selectMock).toHaveBeenCalled();
    expect(singleMock).toHaveBeenCalled();
  });
});
