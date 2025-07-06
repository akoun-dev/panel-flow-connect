export interface Session {
  id: string;
  title: string;
  description?: string;
  panel_id: string;
  panelist_id: string;
  panelist_name: string;
  panelist_email: string;
  created_at: string;
  updated_at: string;
  duration: number; // en secondes
  status: 'draft' | 'recording' | 'completed' | 'transcribing';
  audio_url?: string;
  transcript?: string;
  transcript_confidence?: number;
  tags?: string[];
  is_public: boolean;
  recording_quality: 'high' | 'medium' | 'low';
}
