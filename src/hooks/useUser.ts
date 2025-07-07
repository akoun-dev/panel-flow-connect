import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
  };
} | null;

export function useUser() {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return { user };
}