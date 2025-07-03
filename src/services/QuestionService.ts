import { supabase } from '@/lib/supabase';

const QuestionService = {
  async updateAnswered(id: string, value: boolean) {
    const { error } = await supabase
      .from('questions')
      .update({ is_answered: value })
      .eq('id', id);
    if (error) throw error;
  }
};

export default QuestionService;
