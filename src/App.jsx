import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Dashboard from './Dashboard';
import SuperAdmin from './SuperAdmin';
import { Shield } from 'lucide-react';

// This path is intentionally not linked or referenced anywhere in the normal
// UI. It's only reachable by typing it directly into the browser. Change
// this to your own private string before deploying -- anyone who doesn't
// know the exact path never sees this exists, and even someone who guesses
// it still can't get past login unless their account is separately
// whitelisted in the super_admins table.
const SUPER_ADMIN_PATH = '/sa-control';

export default function App() {
  const [session, setSession] = useState(null);
  const [supervisorData, setSupervisorData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Whether the current session's workspace has been disabled. Checked here,
  // at the very top, BEFORE Dashboard ever mounts -- doing this check inside
  // Dashboard instead caused a brief flash of the wrong screen on refresh,
  // because Dashboard would mount first (showing itself or a stale state)
  // and only flip to "restricted" a moment later once its own check
  // resolved. Deciding it here means there's only ever one correct render.
  const [restricted, setRestricted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  useEffect(() => {
    // 1. Check for active Admin session (Supabase Auth)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for Admin login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Check for saved Supervisor session in LocalStorage
    const savedSupervisor = localStorage.getItem('optistaff_supervisor');
    if (savedSupervisor) {
      setSupervisorData(JSON.parse(savedSupervisor));
    }

    return () => subscription.unsubscribe();
  }, []);

  // Re-checks access every time we have an active session/supervisor --
  // covers both a fresh login AND a page refresh on an already-active one.
  useEffect(() => {
    const checkAccess = async () => {
      const workspaceId = supervisorData ? supervisorData.workspace_id : session?.user?.id;
      if (!workspaceId) { setRestricted(false); return; }

      setCheckingAccess(true);
      const { data } = await supabase.from('workspaces').select('is_disabled').eq('id', workspaceId).maybeSingle();
      setRestricted(!!data?.is_disabled);
      setCheckingAccess(false);
    };
    checkAccess();
  }, [session, supervisorData]);

  const handleSupervisorLogin = (data) => {
    setSupervisorData(data);
    localStorage.setItem('optistaff_supervisor', JSON.stringify(data));
  };

  const handleLogout = async () => {
    setRestricted(false);
    if (supervisorData) {
      setSupervisorData(null);
      localStorage.removeItem('optistaff_supervisor');
    } else {
      await supabase.auth.signOut();
    }
  };

  if (window.location.pathname === SUPER_ADMIN_PATH) {
    return <SuperAdmin />;
  }

  if (loading || checkingAccess) {
    return <div className="min-h-screen bg-[#171717] flex items-center justify-center text-neutral-400">Loading OptiStaff...</div>;
  }

  if (restricted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-950 border border-red-900 rounded-full flex items-center justify-center mx-auto mb-5">
            <Shield size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">Your Plan Has Expired</h2>
          <p className="text-slate-400 text-sm font-medium mb-6">
            Your data is safe for the next 15 days. Please renew your subscription before then to continue using OptiStaff — after 15 days, your data will be permanently deleted.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  // Route to Dashboard if Admin OR Supervisor is logged in
  if (session || supervisorData) {
    return (
      <Dashboard 
        role={supervisorData ? 'supervisor' : 'admin'} 
        supervisorData={supervisorData} 
        onLogout={handleLogout} 
      />
    );
  }

  // Otherwise, show the Login/Signup screen
  return <Auth onSupervisorLogin={handleSupervisorLogin} />;
}