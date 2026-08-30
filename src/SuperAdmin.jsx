import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Shield, Lock, Mail, LogOut, HardDrive, Ban, CheckCircle2, Users, Briefcase, RefreshCw } from 'lucide-react';

// Converts a raw byte count into a friendly "12.3 MB" style string.
function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function SuperAdmin() {
  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [workspaces, setWorkspaces] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // On mount, if there's already an active Supabase Auth session (e.g. you're
  // also logged in as a normal admin in this browser), immediately check if
  // that account is whitelisted as a super admin.
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthorization = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setChecking(false); return; }

    const { data } = await supabase.from('super_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (data) {
      setIsAuthorized(true);
      fetchWorkspaces();
    }
    setChecking(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: superAdminRow } = await supabase.from('super_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (!superAdminRow) {
        await supabase.auth.signOut();
        throw new Error('Access denied.');
      }
      setIsAuthorized(true);
      fetchWorkspaces();
    } catch (err) {
      setErrorMsg(err.message === 'Access denied.' ? err.message : 'Invalid credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthorized(false);
    setWorkspaces([]);
  };

  const fetchWorkspaces = async () => {
    setLoadingData(true);
    try {
      const { data: wsList, error } = await supabase
        .from('workspaces')
        .select('id, name, admin_name, admin_email, is_disabled, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Storage usage isn't tracked anywhere — the only way to get it is to
      // list every file under each workspace's folder in the worker_docs
      // bucket and sum up the byte sizes ourselves. Same idea for counting
      // how many supervisors (users) and employees each workspace has
      // created — { count: 'exact', head: true } just returns the number
      // without pulling back all the row data.
      const withStats = await Promise.all((wsList || []).map(async (ws) => {
        const [{ data: files }, { count: supervisorCount }, { count: employeeCount }] = await Promise.all([
          supabase.storage.from('worker_docs').list(ws.id, { limit: 1000 }),
          supabase.from('supervisors').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
        ]);
        const totalBytes = (files || []).reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
        return {
          ...ws,
          storageBytes: totalBytes,
          fileCount: files?.length || 0,
          supervisorCount: supervisorCount || 0,
          employeeCount: employeeCount || 0,
        };
      }));

      setWorkspaces(withStats);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      alert('Failed to load workspaces: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleDisabled = async (ws) => {
    const action = ws.is_disabled ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} ${ws.admin_name}'s workspace?`)) return;

    const { error } = await supabase.from('workspaces').update({ is_disabled: !ws.is_disabled }).eq('id', ws.id);
    if (error) { alert('Failed: ' + error.message); return; }
    setWorkspaces(workspaces.map(w => w.id === ws.id ? { ...w, is_disabled: !w.is_disabled } : w));
  };

  if (checking) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Checking access...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="flex items-center gap-3 mb-8 text-slate-300">
          <Shield size={28} />
          <span className="text-2xl font-extrabold tracking-tight">Super Admin</span>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          {errorMsg && <div className="bg-red-950 border border-red-900 text-red-400 p-3 rounded-lg text-sm font-semibold">{errorMsg}</div>}
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-sm" />
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-sm" />
          </div>
          <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
            {loginLoading ? 'Verifying...' : 'Log in'}
          </button>
        </form>
      </div>
    );
  }

  const totalStorage = workspaces.reduce((sum, w) => sum + w.storageBytes, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Shield size={26} className="text-blue-500" />
          <h1 className="text-2xl font-extrabold tracking-tight">Super Admin</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchWorkspaces} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Workspaces</p>
          <p className="text-3xl font-extrabold">{workspaces.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Storage Used</p>
          <p className="text-3xl font-extrabold">{formatBytes(totalStorage)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-3xl font-extrabold">{workspaces.reduce((sum, w) => sum + w.supervisorCount, 0)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Employees</p>
          <p className="text-3xl font-extrabold">{workspaces.reduce((sum, w) => sum + w.employeeCount, 0)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Disabled Workspaces</p>
          <p className="text-3xl font-extrabold">{workspaces.filter(w => w.is_disabled).length}</p>
        </div>
      </div>

      {/* Workspaces table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left font-bold px-6 py-3">Admin</th>
                <th className="text-left font-bold px-6 py-3">Email</th>
                <th className="text-left font-bold px-6 py-3">Storage Used</th>
                <th className="text-left font-bold px-6 py-3">Users (Supervisors)</th>
                <th className="text-left font-bold px-6 py-3">Employees</th>
                <th className="text-left font-bold px-6 py-3">Status</th>
                <th className="text-left font-bold px-6 py-3">Joined</th>
                <th className="text-right font-bold px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map(ws => (
                <tr key={ws.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-semibold">{ws.admin_name || '—'}</td>
                  <td className="px-6 py-4 text-slate-400">{ws.admin_email || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-slate-300">
                      <HardDrive size={14} className="text-slate-500" />
                      {formatBytes(ws.storageBytes)}
                      <span className="text-slate-600 text-xs">({ws.fileCount} files)</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Users size={14} className="text-slate-500" /> {ws.supervisorCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Briefcase size={14} className="text-slate-500" /> {ws.employeeCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {ws.is_disabled ? (
                      <span className="bg-red-950 text-red-400 border border-red-900 px-2.5 py-1 rounded-full text-xs font-bold">Disabled</span>
                    ) : (
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-2.5 py-1 rounded-full text-xs font-bold">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(ws.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleDisabled(ws)}
                      className={`flex items-center gap-1.5 ml-auto text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        ws.is_disabled
                          ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-900'
                          : 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-900'
                      }`}
                    >
                      {ws.is_disabled ? <><CheckCircle2 size={14} /> Enable</> : <><Ban size={14} /> Disable</>}
                    </button>
                  </td>
                </tr>
              ))}
              {workspaces.length === 0 && !loadingData && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-600">No workspaces yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
