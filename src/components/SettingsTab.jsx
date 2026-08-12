import { useState } from 'react';
import { User, Shield, CreditCard, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function SettingsTab({ role, supervisorData, workspaceId }) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  
  // For Admin Profile updates
  const [adminProfile, setAdminProfile] = useState({ name: '', phone: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (role === 'admin') {
      // Supabase native auth update
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) alert("Failed to update password: " + error.message);
      else alert("Password updated successfully!");
    } else {
      // Supervisor DB update
      const { error } = await supabase.from('supervisors').update({ password: password }).eq('id', supervisorData.id);
      if (error) alert("Failed to update password: " + error.message);
      else alert("Password updated successfully!");
    }
    
    setPassword('');
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* PROFILE SECTION (Admin Only) */}
      {role === 'admin' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Admin Profile Details</h3>
          </div>
          <div className="p-6">
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Update Admin Name</label>
                  <input type="text" placeholder="John Doe" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Update Contact Number</label>
                  <input type="tel" placeholder="+91..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                </div>
              </div>
              <button type="button" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                <Save size={16} /> Save Profile Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUPERVISOR INFO (Read-Only) */}
      {role === 'supervisor' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">My Profile</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-800">{supervisorData.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">ID Code</p>
              <p className="font-mono font-medium text-blue-600">{supervisorData.supervisor_code}</p>
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION SECTION (Admin Only) */}
      {role === 'admin' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <CreditCard size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Subscription & Billing</h3>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-lg">Free Tier (Beta)</h4>
              <p className="text-sm text-slate-500 mt-1">Your workspace is currently running on the free development tier.</p>
            </div>
            <button className="bg-slate-800 text-white px-5 py-2 rounded-lg font-medium opacity-50 cursor-not-allowed">
              Upgrade Plan (Coming Soon)
            </button>
          </div>
        </div>
      )}

      {/* SECURITY SECTION (Both Roles) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Shield size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Security</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a new secure password" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" 
              />
            </div>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-70">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}