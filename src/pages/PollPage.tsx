import { useParams } from 'react-router-dom';
import PollQRCode from '@/components/polls/PollQRCode';
import { PollViewer } from '@/components/polls/PollViewer';

export default function PollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  if (!pollId) return null;

  return (
    <div className="p-4 flex flex-col items-center gap-4">
      <PollQRCode pollId={pollId} size={200} />
      <PollViewer pollId={pollId} />
    </div>
  );
}
