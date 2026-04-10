import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#313338]/80 backdrop-blur-sm" />
      <div className="w-full max-w-[480px] bg-[#313338] p-8 rounded-[8px] shadow-2xl relative z-10 border border-[#1f2023]/50">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Bentornato!</h1>
          <p className="text-[#b5bac1]">Siamo così felici di rivederti!</p>
        </div>
        <div className="auth-container">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#5865F2',
                    brandAccent: '#4752C4',
                    inputText: '#dbdee1',
                    brandButtonText: 'white',
                    defaultButtonBackground: '#2b2d31',
                    defaultButtonBackgroundHover: '#35373c',
                    inputBackground: '#1e1f22',
                    inputBorder: 'transparent',
                    inputBorderHover: 'transparent',
                    inputBorderFocus: 'transparent',
                  },
                  space: {
                    buttonPadding: '10px 15px',
                    inputPadding: '10px 15px',
                  },
                  borderWidths: {
                    buttonBorderWidth: '0px',
                    inputBorderWidth: '0px',
                  },
                  radii: {
                    borderRadiusButton: '3px',
                    buttonBorderRadius: '3px',
                    inputBorderRadius: '3px',
                  },
                },
              },
              style: {
                label: { color: '#b5bac1', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' },
                input: { outline: 'none' },
                button: { fontWeight: '500' },
                anchor: { color: '#00a8fc', textDecoration: 'none', fontSize: '14px' }
              }
            }}
            theme="dark"
            providers={[]}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email o Numero di Telefono',
                  password_label: 'Password',
                  button_label: 'Accedi',
                  loading_button_label: 'Accesso in corso...',
                  social_provider_text: 'Accedi con {{provider}}',
                  link_text: 'Hai già un account? Accedi',
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Password',
                  button_label: 'Continua',
                  loading_button_label: 'Registrazione in corso...',
                  social_provider_text: 'Registrati con {{provider}}',
                  link_text: 'Non hai un account? Registrati',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}