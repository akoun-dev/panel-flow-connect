import { Panel } from '@/types/panel';

interface PanelInfoHeaderProps {
  panel: Panel;
}

export function PanelInfoHeader({ panel }: PanelInfoHeaderProps) {
  const formatSchedule = () => {
    if (panel.start_time && panel.end_time) {
      const start = new Date(panel.start_time);
      const end = new Date(panel.end_time);
      return `${start.toLocaleString()} - ${end.toLocaleString()}`;
    }
    if (panel.start_time) {
      const start = new Date(panel.start_time);
      return start.toLocaleString();
    }
    return 'Horaires à d\u00e9finir';
  };

  const statusStyles: Record<Panel['status'], string> = {
    draft: 'bg-slate-100 text-slate-700',
    scheduled: 'bg-blue-100 text-blue-700',
    live: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="mb-4 space-y-1">
      <h1 className="text-2xl font-bold">{panel.title}</h1>
      <p className="text-sm text-muted-foreground">{formatSchedule()}</p>
      <span className={`px-2 py-1 rounded text-sm font-medium ${statusStyles[panel.status]}`}>{panel.status}</span>
    </div>
  );
}
