import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitePanelistsModal } from '@/components/panels/InvitePanelistsModal';
import PanelInvitationService from '@/services/PanelInvitationService';

jest.mock('@/services/PanelInvitationService', () => ({
  __esModule: true,
  default: { sendInvitation: jest.fn() }
}));

describe('InvitePanelistsModal', () => {
  it('calls service for each email', async () => {
    const panel = { id: 'p1', title: 'Panel' } as any;
    render(
      <InvitePanelistsModal open panel={panel} onClose={() => {}} />
    );
    await userEvent.type(screen.getByPlaceholderText(/email1/i), 'a@ex.com, b@ex.com');
    await userEvent.click(screen.getByText(/Envoyer/));
    expect(PanelInvitationService.sendInvitation).toHaveBeenCalledTimes(2);
    expect(PanelInvitationService.sendInvitation).toHaveBeenCalledWith({ id: 'p1', title: 'Panel' }, { email: 'a@ex.com' });
  });
});
