import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#313338] p-4 font-sans">
      <div className="w-full max-w-[480px] bg-[#313338] md:bg-[#2b2d31] md:p-8 rounded-lg md:shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-[24px] font-bold text-white mb-2">Bentornato!</h1>
          <p className="text-[#b5bac1] text-[15px]">Siamo davvero felici di rivederti!</p>
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
                  inputText: '#dbdee1',
                  inputBackground: '#1e1f22',
                  inputBorder: '#1e1f22',
                  inputLabelText: '#b5bac1',
                  messageText: '#f23f43',
                }
              }
            },
            className: {
              input: 'text-white bg-[#1e1f22] border-none rounded-[3px] h-10',
              label: 'text-[#b5bac1] uppercase text-xs font-bold mb-2',
              button: 'font-medium rounded-[3px] h-11 transition-colors',
              anchor: 'text-[#00a8fc] hover:underline text-sm',
              divider: 'bg-[#3f4147]',
              message: 'text-[#f23f43] text-sm mt-2'
            }
          }}
          theme="dark"
        />
      </div>
    </div>
  );
};

export default Login;