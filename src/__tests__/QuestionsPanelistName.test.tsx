import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Questions from '@/pages/Questions';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const insertMock = jest.fn();
const singleMock = jest.fn().mockResolvedValue({ data: {} });
const selectMock = jest.fn(() => ({ single: singleMock }));
(supabase.from as jest.Mock).mockReturnValue({ insert: insertMock.mockReturnValue({ select: selectMock }) });

describe('Questions panelist name', () => {
  it('sends panelist_name when submitting', async () => {
    const panel = { id: 'p1', panelists: [{ name: 'Alice', email: 'a@example.com' }] } as any;
    render(<Questions panel={panel} />);
    await userEvent.type(screen.getByLabelText(/votre question/i), 'Hello');
    await userEvent.click(screen.getByTestId('submit-question-btn'));
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ panelist_name: 'Alice' }));
  });
});
