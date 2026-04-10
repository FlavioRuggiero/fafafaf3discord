import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Se l'utente è già loggato, reindirizza alla home
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2b2d31] p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Benvenuto!</h1>
          <p className="text-[#b5bac1]">Effettua l'accesso o registrati per continuare</p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#5865F2',
                  brandAccent: '#4752C4',
                }
              }
            },
            className: {
              container: 'auth-container',
              button: 'w-full px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-colors mt-4',
              input: 'w-full px-3 py-2 bg-[#1e1f22] text-[#dbdee1] rounded border-none focus:ring-1 focus:ring-[#5865F2] outline-none mb-2',
              label: 'block text-xs font-semibold text-[#b5bac1] uppercase mb-1 mt-4',
              message: 'text-[#f23f43] text-sm mt-2',
              anchor: 'text-[#00a8fc] hover:underline text-sm'
            }
          }}
          theme="dark"
        />
      </div>
    </div>
  );
}