export interface Panelist {
  id?: string;
  name: string;
  email: string;
  title: string;
  topic: string;
  duration: number;
}

export interface Panel {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  participants_limit: number;
  participants: {
    registered: number;
    limit: number;
  };
  questions?: number;
  qr_code_url?: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
  category?: string;
  tags?: string[];
  panelists?: Panelist[];
  user_id: string;
  moderator_name?: string;
  moderator_email?: string;
  created_at: string;
  updated_at: string;
  start_time?: string;
  end_time?: string;
}