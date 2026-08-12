import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Dashboard from './Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [supervisorData, setSupervisorData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleSupervisorLogin = (data) => {
    setSupervisorData(data);
    localStorage.setItem('optistaff_supervisor', JSON.stringify(data));
  };

  const handleLogout = async () => {
    if (supervisorData) {
      setSupervisorData(null);
      localStorage.removeItem('optistaff_supervisor');
    } else {
      await supabase.auth.signOut();
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#171717] flex items-center justify-center text-neutral-400">Loading OptiStaff...</div>;
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