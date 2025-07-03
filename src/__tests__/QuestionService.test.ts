import QuestionService from '@/services/QuestionService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() }
}));

const updateMock = jest.fn(() => ({ eq: eqMock }));
const eqMock = jest.fn();
(supabase.from as jest.Mock).mockReturnValue({ update: updateMock });

beforeEach(() => {
  updateMock.mockClear();
  eqMock.mockClear();
});

describe('QuestionService.updateAnswered', () => {
  it('updates is_answered field', async () => {
    eqMock.mockResolvedValue({ error: null });
    await QuestionService.updateAnswered('q1', true);
    expect(supabase.from).toHaveBeenCalledWith('questions');
    expect(updateMock).toHaveBeenCalledWith({ is_answered: true });
    expect(eqMock).toHaveBeenCalledWith('id', 'q1');
  });

  it('throws when update fails', async () => {
    const err = { message: 'permission denied' };
    eqMock.mockResolvedValue({ error: err });
    await expect(QuestionService.updateAnswered('q1', true)).rejects.toEqual(err);
  });
});
