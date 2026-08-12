import { Bell, MessageSquare, Hand, Settings, Lock, Menu, ChevronRight, Plus } from 'lucide-react';

export default function Header({ role, supervisorData, activeTab, setShowCompanyModal, setShowWorkerModal }) {
  const userName = role === 'admin' ? 'Admin' : supervisorData?.name || 'User';
  const formattedTab = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  return (
    <header className="bg-[#1e293b] text-white px-6 py-3 flex justify-between items-center z-20 shadow-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 font-black text-xl tracking-wider">
          OPTI<span className="text-blue-400">STAFF</span>
          <Menu size={20} className="ml-4 cursor-pointer text-slate-300 hover:text-white transition-colors" />
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          HR PANEL <ChevronRight size={14} className="text-slate-500" /> <span className="text-white">{formattedTab}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-5">
        {/* Dynamic Action Buttons Fixed */}
        {activeTab === 'dashboard' && role === 'admin' && (
          <button onClick={() => setShowCompanyModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors shadow-sm mr-2">
            <Plus size={16} /> Add Client Company
          </button>
        )}
        {['existing', 'relieved', 'temporary', 'pending'].includes(activeTab) && (
          <button onClick={() => setShowWorkerModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors shadow-sm mr-2">
            <Plus size={16} /> Create Resource
          </button>
        )}

        <span className="text-sm font-medium mr-2 text-slate-200">Hi, {userName}</span>
        <div className="flex items-center gap-4 text-slate-400">
          <MessageSquare size={18} className="cursor-pointer hover:text-white transition-colors" />
          <Hand size={18} className="cursor-pointer hover:text-white transition-colors" />
          <Settings size={18} className="cursor-pointer hover:text-white transition-colors" />
          <Lock size={18} className="cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>
    </header>
  );
}