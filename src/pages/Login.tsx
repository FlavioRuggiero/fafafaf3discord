import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // Stati separati per Login e Registrazione per evitare confusioni nell'interfaccia
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email o Username per l'accesso
  const [email, setEmail] = useState(''); // Email per la registrazione
  const [username, setUsername] = useState(''); // Username per la registrazione
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        let targetEmail = loginIdentifier.trim();

        // Se l'input non contiene '@', presumiamo sia un Nome Utente
        if (!targetEmail.includes('@')) {
          // Richiamiamo la funzione RPC appena creata su Supabase
          const { data: fetchedEmail, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: targetEmail });

          if (rpcError || !fetchedEmail) {
            throw new Error('Nome utente non trovato. Controlla di averlo scritto correttamente.');
          }
          targetEmail = fetchedEmail;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Credenziali non valide. Riprova.');
          }
          throw error;
        }
        
        showSuccess('Accesso effettuato con successo!');
      } else {
        // Registrazione
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: username,
            }
          }
        });
        if (error) throw error;
        showSuccess('Registrazione completata! Puoi effettuare il login.');
        setIsLogin(true);
      }
    } catch (error: any) {
      showError(error.message || 'Si è verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      showError(error.message || 'Errore durante il login con Google');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#313338] p-4 font-sans">
      <div className="w-full max-w-[480px] bg-[#313338] md:bg-[#2b2d31] md:p-8 rounded-lg md:shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-[24px] font-bold text-white mb-2">
            {isLogin ? 'Bentornato!' : 'Crea un account'}
          </h1>
          <p className="text-[#b5bac1] text-[15px]">
            {isLogin ? 'Siamo davvero felici di rivederti!' : 'Unisciti alla nostra community!'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isLogin ? (
            // Modulo di Login
            <div>
              <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                Email o Nome utente <span className="text-[#f23f43]">*</span>
              </label>
              <input 
                type="text" 
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          ) : (
            // Moduli di Registrazione
            <>
              <div>
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                  Nome utente <span className="text-[#f23f43]">*</span>
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                  Email <span className="text-[#f23f43]">*</span>
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
              Password <span className="text-[#f23f43]">*</span>
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
            />
            {isLogin && (
              <a href="#" className="text-[#00a8fc] hover:underline text-sm block mt-2">
                Hai dimenticato la password?
              </a>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] h-11 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Caricamento...' : (isLogin ? 'Accedi' : 'Continua')}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-[#3f4147]"></div>
            <span className="flex-shrink-0 mx-4 text-[#949ba4] text-xs font-medium">OPPURE</span>
            <div className="flex-grow border-t border-[#3f4147]"></div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black font-medium rounded-[3px] h-11 transition-colors mt-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continua con Google
          </button>
        </div>
        
        <div className="mt-4 text-sm">
          <span className="text-[#949ba4]">
            {isLogin ? 'Hai bisogno di un account? ' : 'Hai già un account? '}
          </span>
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)} 
            className="text-[#00a8fc] hover:underline"
          >
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;