import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PollService from '@/services/PollService';
import type { Poll } from '@/types/poll';

interface PollEditorProps {
  poll: Poll;
  onSaved?: () => void;
}

export function PollEditor({ poll, onSaved }: PollEditorProps) {
  const [question, setQuestion] = useState(poll.question);
  const [options, setOptions] = useState<string[]>(poll.options.map(o => o.text));

  const handleOptionChange = (idx: number, value: string) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const addOption = () => setOptions([...options, '']);

  const save = async () => {
    const opts = options.filter(o => o.trim().length > 0).map((text, idx) => ({
      id: poll.options[idx]?.id,
      text
    }));
    if (!question.trim() || opts.length < 2) return;
    await PollService.updatePoll(poll.id, question, opts);
    onSaved?.();
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
        <Button type="button" onClick={save}>
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
