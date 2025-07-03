import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import PanelInvitationService from '@/services/PanelInvitationService';
import { toast } from 'react-hot-toast';

export default function JoinPanel() {
  const [params] = useSearchParams();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const run = async () => {
      if (!token || !user?.id) return;
      try {
        const { data, error } = await supabase
          .from('panel_invitations')
          .select('id,panel_id')
          .eq('unique_token', token)
          .single();
        if (error || !data) throw error || new Error('Invalid token');
        await PanelInvitationService.acceptInvitation(data.id, user.id);
        navigate(`/user/panels`);
      } catch (err) {
        toast.error("Invitation invalide");
        navigate('/user/invitations');
      }
    };
    run();
  }, [params, user, navigate]);

  return <div className="p-4">Validation de l'invitation...</div>;
}
