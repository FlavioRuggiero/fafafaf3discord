import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  adminId: string | null;
  moderatorIds: string[];
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true, adminId: null, moderatorIds: [] });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [moderatorIds, setModeratorIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Recupera l'ID dell'amministratore (se la funzione RPC esiste nel database)
    supabase.rpc('get_admin_id').then(({ data, error }) => {
      if (!error && data) {
        setAdminId(data);
      }
    });

    // Recupera gli ID dei moderatori
    supabase.rpc('get_moderator_ids').then(({ data, error }) => {
      if (!error && data) {
        setModeratorIds(data);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, adminId, moderatorIds }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);