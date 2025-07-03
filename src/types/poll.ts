export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  votes?: number;
}

export interface Poll {
  id: string;
  panel_id: string;
  question: string;
  created_at: string;
  options: PollOption[];
}
