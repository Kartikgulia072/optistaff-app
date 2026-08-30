import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, User, Lock, Mail, ChevronRight } from 'lucide-react';

export default function Auth({ onSupervisorLogin }) {
  const [loginMode, setLoginMode] = useState('admin'); // 'admin' or 'supervisor'
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  
  const [supUsername, setSupUsername] = useState('');
  const [supPassword, setSupPassword] = useState('');

  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          const { error: wsError } = await supabase.from('workspaces').insert([
            { id: authData.user.id, name: 'Main Workspace', admin_name: adminName || 'Workspace Admin', admin_email: email }
          ]);
          if (wsError) throw wsError;
        }
        alert("Registration successful! You can now log in.");
        setIsSignUp(false);
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: ws } = await supabase.from('workspaces').select('is_disabled').eq('id', signInData.user.id).single();
        if (ws?.is_disabled) {
          await supabase.auth.signOut();
          throw new Error("This workspace has been disabled. Contact support for assistance.");
        }
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('supervisors')
        .select('*')
        .eq('username', supUsername.toLowerCase())
        .eq('password', supPassword)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error("Invalid credentials or your account is deactivated.");
      }

      onSupervisorLogin(data);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // LIGHT THEME STYLING
  const inputClass = "w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm shadow-sm";
  const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600 text-white p-2.5 rounded-xl font-black text-lg leading-none shadow-md shadow-blue-600/20">OS</div>
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">OptiStaff</span>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Toggle Mode Header */}
        <div className="flex bg-slate-50 border-b border-slate-200">
          <button 
            onClick={() => { setLoginMode('admin'); setIsSignUp(false); setErrorMsg(''); }} 
            className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${loginMode === 'admin' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <Shield size={16} /> Admin
          </button>
          <button 
            onClick={() => { setLoginMode('supervisor'); setErrorMsg(''); }} 
            className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${loginMode === 'supervisor' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            <User size={16} /> Supervisor
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">
            {loginMode === 'admin' ? (isSignUp ? 'Create Workspace' : 'Workspace Login') : 'Supervisor Portal'}
          </h2>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            {loginMode === 'admin' 
              ? (isSignUp ? 'Register a new master admin account.' : 'Access your network-wide dashboard.') 
              : 'Log in with credentials provided by your admin.'}
          </p>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-6 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
              {errorMsg}
            </div>
          )}

          {/* ADMIN FORM */}
          {loginMode === 'admin' && (
            <form onSubmit={handleAdminAuth} className="space-y-4">
              {isSignUp && (
                <div className="relative">
                  <User size={18} className={iconClass} />
                  <input type="text" required placeholder="Full Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} className={inputClass} />
                </div>
              )}
              <div className="relative">
                <Mail size={18} className={iconClass} />
                <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="relative">
                <Lock size={18} className={iconClass} />
                <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2 shadow-md shadow-blue-600/20">
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Secure Login')}
                {!loading && <ChevronRight size={18} />}
              </button>

              <div className="text-center mt-6">
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">
                  {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
                </button>
              </div>
            </form>
          )}

          {/* SUPERVISOR FORM */}
          {loginMode === 'supervisor' && (
            <form onSubmit={handleSupervisorAuth} className="space-y-4">
              <div className="relative">
                <User size={18} className={iconClass} />
                <input type="text" required placeholder="Supervisor Username (e.g. sk_unit1)" value={supUsername} onChange={(e) => setSupUsername(e.target.value.toLowerCase())} className={inputClass} />
              </div>
              <div className="relative">
                <Lock size={18} className={iconClass} />
                <input type="password" required placeholder="Temporary or Private Password" value={supPassword} onChange={(e) => setSupPassword(e.target.value)} className={inputClass} />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2 shadow-md shadow-blue-600/20">
                {loading ? 'Verifying...' : 'Access Plant Roster'}
                {!loading && <ChevronRight size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <p className="text-slate-400 font-medium text-xs mt-8">Secure Industrial Network Portal v2.0</p>
    </div>
  );
}