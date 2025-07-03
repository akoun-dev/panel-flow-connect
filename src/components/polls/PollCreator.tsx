import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PollService from '@/services/PollService';

interface PollCreatorProps {
  panelId: string;
  onCreated?: () => void;
}

export function PollCreator({ panelId, onCreated }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const handleOptionChange = (idx: number, value: string) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const addOption = () => setOptions([...options, '']);

  const create = async () => {
    const opts = options.filter(o => o.trim().length > 0);
    if (!question.trim() || opts.length < 2) return;
    await PollService.createPoll(panelId, question, opts);
    setQuestion('');
    setOptions(['', '']);
    onCreated?.();
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Question"
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />
      {options.map((o, i) => (
        <Input
          key={i}
          className="mt-1"
          placeholder={`Option ${i + 1}`}
          value={o}
          onChange={e => handleOptionChange(i, e.target.value)}
        />
      ))}
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={addOption}>
          Ajouter une option
        </Button>
        <Button type="button" onClick={create}>
          Créer le sondage
        </Button>
      </div>
    </div>
  );
}
