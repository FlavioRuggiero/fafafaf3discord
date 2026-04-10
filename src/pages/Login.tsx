import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess, showError } from '@/utils/toast';

const Login = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showSuccess('Accesso effettuato con successo!');
      } else {
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
        // Opzionale: passa in automatico al login dopo la registrazione
        if (!error) setIsLogin(true);
      }
    } catch (error: any) {
      showError(error.message || 'Si è verificato un errore');
    } finally {
      setIsLoading(false);
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
          {!isLogin && (
            <div>
              <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                Nome utente
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          )}
          
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