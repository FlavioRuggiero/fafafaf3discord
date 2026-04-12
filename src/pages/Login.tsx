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

  const handleDiscordLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      showError(error.message || 'Errore durante il login con Discord');
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
            onClick={handleDiscordLogin}
            className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] h-11 transition-colors mt-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            Continua con Discord
          </button>
          <p className="text-xs text-[#23a559] text-center mt-3 font-medium bg-[#23a559]/10 py-2 rounded">
            ✨ Consigliato: importa in automatico il tuo nome e l'immagine del profilo!
          </p>
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