import React from 'react';
import { useAuth } from '../context/AuthContext';
import { IndianRupee } from 'lucide-react';

const Login = () => {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-10 text-center space-y-12">
      <div className="space-y-4">
        <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-primary/40">
          <IndianRupee className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold font-display tracking-tight">Ka-Ching!</h1>
        <p className="text-foreground/50 font-medium">Frictionless expense tracking,<br />optimized for your iPhone.</p>
      </div>

      <div className="w-full space-y-4">
        <button
          onClick={loginWithGoogle}
          className="w-full py-5 bg-foreground text-background rounded-3xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span>Continue with Google</span>
        </button>
        <p className="text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-bold">
          Secure Login via Firebase
        </p>
      </div>
    </div>
  );
};

export default Login;
