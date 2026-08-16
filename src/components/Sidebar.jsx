import { LayoutGrid, Users, Clock, Archive, UserPlus, Key, Building2, X } from 'lucide-react';

export default function Sidebar({ role, activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) {
  const getNavClass = (tabName) => {
    const isActive = activeTab === tabName;
    return `flex items-center gap-3 px-6 py-3.5 text-[13px] font-bold uppercase tracking-wider border-b border-blue-800/50 cursor-pointer transition-all ${
      isActive 
        ? 'bg-blue-800 text-white border-l-4 border-white shadow-inner' 
        : 'text-blue-200 hover:text-white hover:bg-blue-800/50 border-l-4 border-transparent'
    }`;
  };

  const handleNavClick = (tabName) => {
    setActiveTab(tabName);
    if (setIsMobileOpen) setIsMobileOpen(false); // Close drawer on mobile after clicking
  };

  return (
    <>
      {/* Mobile Dark Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar - Fixed on mobile, static on desktop */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-blue-900 border-r border-blue-950 flex flex-col h-screen shrink-0 shadow-2xl md:shadow-xl transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        <div className="p-5 md:p-6 flex items-center justify-between border-b border-blue-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white text-blue-900 p-2 rounded-lg font-black text-xs leading-none shadow-md shadow-black/10">OS</div>
            <span className="text-2xl font-extrabold text-white tracking-tight">OptiStaff</span>
          </div>
          {/* Mobile Close Button */}
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-blue-200 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {role === 'admin' && (
            <div onClick={() => handleNavClick('dashboard')} className={getNavClass('dashboard')}>
              <LayoutGrid size={18} /> Dashboard
            </div>
          )}

          {role === 'admin' && (
          <div onClick={() => handleNavClick('existing')} className={getNavClass('existing')}>
            <Users size={18} /> Existing
          </div>
          )}
          {role === 'admin' && (
            <div onClick={() => handleNavClick('pending')} className={getNavClass('pending')}>
              <Clock size={18} /> Pending approvals
            </div>
          )}
          {role === 'admin' && (
          <div onClick={() => handleNavClick('relieved')} className={getNavClass('relieved')}>
            <Archive size={18} /> Relieved
          </div>
          )}
          <div onClick={() => handleNavClick('create')} className={getNavClass('create')}>
            <UserPlus size={18} /> Create resource
          </div>
          
          {role === 'admin' && (
            <div onClick={() => handleNavClick('infrastructure')} className={getNavClass('infrastructure')}>
              <Building2 size={18} /> Add Company/Plant
            </div>
          )}

          {role === 'admin' && (
            <div onClick={() => handleNavClick('manage')} className={getNavClass('manage')}>
              <Key size={18} /> Manage access
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-blue-800/50 text-blue-400 text-[10px] font-bold tracking-widest uppercase text-center shrink-0">
          Enterprise v2.0
        </div>
      </aside>
    </>
  );
}