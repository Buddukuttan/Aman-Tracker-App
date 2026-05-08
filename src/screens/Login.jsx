import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, AlertCircle } from 'lucide-react';

const Login = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Login failed:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized. Please add this URL to 'Authorized Domains' in Firebase Console.");
      } else {
        setError("Login failed. Please check your internet or Firebase config.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-10 text-center space-y-12">
      <div className="space-y-4">
        <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-primary/40">
          <IndianRupee className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold font-display tracking-tight">Ka-Ching!</h1>
        <p className="text-foreground/50 font-medium">Frictionless expense tracking,<br />optimized for your iPhone.</p>
      </div>

      <div className="w-full space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-start gap-3 text-left text-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-5 bg-foreground text-background rounded-3xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span>Continue with Google</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-bold">
          Secure Login via Firebase
        </p>
      </div>
    </div>
  );
};

export default Login;
