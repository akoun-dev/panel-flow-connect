import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import UserPlanning from '@/pages/user/UserPlanning';
import { supabase } from '@/lib/supabase';

jest.mock('@fullcalendar/react', () => ({ __esModule: true, default: () => <div>Calendar</div> }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() }
  }
}));

const selectMock = jest.fn().mockReturnThis();
const eqMock = jest.fn().mockReturnThis();
const orderMock = jest.fn();

(supabase.from as jest.Mock).mockReturnValue({ select: selectMock, eq: eqMock, order: orderMock });

beforeEach(() => {
  jest.resetAllMocks();
  (supabase.from as jest.Mock).mockReturnValue({ select: selectMock, eq: eqMock, order: orderMock });
});

describe('UserPlanning filtering', () => {
  const data = [
    {
      id: '1',
      panel_id: 'p1',
      status: 'confirmed',
      panels: [{ title: 'Alpha', description: 'first', date: '2024-01-01', time: '10:00', duration: 60 }]
    },
    {
      id: '2',
      panel_id: 'p2',
      status: 'pending',
      panels: [{ title: 'Beta', description: 'foo bar', date: '2024-01-02', time: '11:00', duration: 30 }]
    }
  ];

  const expectedPanels = data.map(d => ({
    id: d.id,
    panel_id: d.panel_id,
    title: d.panels[0].title,
    description: d.panels[0].description,
    date: d.panels[0].date,
    time: d.panels[0].time,
    duration: d.panels[0].duration,
    status: d.status
  }));

  let setFilteredPanels: jest.Mock;
  const realUseState = React.useState;

  beforeEach(() => {
    setFilteredPanels = jest.fn();
    let call = 0;
    jest.spyOn(React, 'useState').mockImplementation((init: any) => {
      const result = realUseState(init);
      call++;
      if (call === 2) {
        const [, setState] = result;
        return [result[0], (val: any) => { setFilteredPanels(val); setState(val); }];
      }
      return result;
    });

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });
    orderMock.mockResolvedValue({ data, error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters by search term', async () => {
    render(<UserPlanning />);

    await waitFor(() => expect(setFilteredPanels).toHaveBeenCalledWith(expectedPanels));

    setFilteredPanels.mockClear();
    await userEvent.type(screen.getByPlaceholderText(/rechercher/i), 'beta');

    await waitFor(() => expect(setFilteredPanels).toHaveBeenCalledWith([
      expectedPanels[1]
    ]));
  });

  it('filters by status', async () => {
    render(<UserPlanning />);

    await waitFor(() => expect(setFilteredPanels).toHaveBeenCalledWith(expectedPanels));

    setFilteredPanels.mockClear();
    // open select and choose "Confirmés"
    await userEvent.click(screen.getByRole('button', { name: /tous/i }));
    await userEvent.click(screen.getByText('Confirmés'));

    await waitFor(() => expect(setFilteredPanels).toHaveBeenCalledWith([
      expectedPanels[0]
    ]));
  });
});
