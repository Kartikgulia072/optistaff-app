import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Edit, Trash2, Key, Image as ImageIcon, User, CheckCircle, Users } from 'lucide-react';

function SecureAvatar({ path, className, onClick }) { /* ... keep existing SecureAvatar ... */ 
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!path) return;
    if (path.startsWith('http')) { setUrl(path); return; }
    const fetchUrl = async () => {
      const { data } = await supabase.storage.from('worker_docs').createSignedUrl(path, 3600);
      if (data) setUrl(data.signedUrl);
    };
    fetchUrl();
  }, [path]);
  if (!url) return <div className={`bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 ${className}`}><User size={16} className="text-slate-400" /></div>;
  return <img src={url} alt="Profile" className={`object-cover shrink-0 cursor-pointer ${className}`} onClick={onClick} />;
}

export default function WorkersTab(props) {
  const { 
    role, companies, activeTab, searchQuery, setSearchQuery, 
    supervisors, employees, setTargetSupervisor, setCredentials, 
    setShowCredentialsModal, setEditingWorker, handleToggleWorkerStatus, onViewImage, onApproveWorker 
  } = props;

  const [subTab, setSubTab] = useState('PERMANENT');

  const getPlantName = (plantId) => {
    for (const c of companies) {
      const p = c.plants?.find((plant) => plant.id === plantId);
      if (p) return p.plant_name;
    }
    return '-';
  };

  // --- NEW STRICT FILTERING LOGIC ---
  const isPendingTab = activeTab === 'pending';
  const isRelievedTab = activeTab === 'relieved';
  const targetActiveStatus = !isRelievedTab; 

  // Compute raw stats (Only counting approved active workers for the top metric cards)
  const activeSupervisors = supervisors.filter(s => s.is_active === true && s.approval_status === 'approved');
  const activeEmployees = employees.filter(e => e.is_active === true && e.approval_status === 'approved');
  const totalUsers = activeSupervisors.length + activeEmployees.length;
  const uniqueDepts = new Set([...activeSupervisors, ...activeEmployees].map(w => w.department).filter(Boolean)).size;

  // Filter specific data for the current table view
  const baseData = subTab === 'PERMANENT' ? supervisors : employees;
  
  const filteredData = baseData.filter((worker) => {
    // 1. Check Approval Status
    if (isPendingTab) {
      if (worker.approval_status !== 'pending') return false; // Show ONLY pending
    } else {
      if (worker.approval_status === 'pending') return false; // Hide pending from other tabs
      if (worker.is_active !== targetActiveStatus) return false; // Check active/relieved status
    }

    // 2. Check Search Query
    const safeQuery = (searchQuery || '').toLowerCase();
    const idCode = worker.supervisor_code || worker.employee_code || '';
    return (worker.name || '').toLowerCase().includes(safeQuery) || idCode.toLowerCase().includes(safeQuery);
  });

  const thClass = "px-6 py-4 font-semibold text-slate-700 border-b border-slate-200 bg-[#f8fafc] whitespace-nowrap";
  const tdClass = "px-6 py-4 border-b border-slate-100 text-slate-600 whitespace-nowrap";

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className={`flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 ${isPendingTab ? 'border-l-amber-500' : 'border-l-blue-600'}`}>
        <div className="flex items-center gap-3">
          <div className={`${isPendingTab ? 'bg-amber-100 text-amber-700' : 'bg-blue-900 text-white'} p-2 rounded-full`}><Users size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab} Resources</h2>
            <p className="text-xs text-slate-500 font-medium">
              {isPendingTab ? 'Review and approve supervisor assignments' : 'Permanent, contractual and access status'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Only show on Existing tab */}
      {!isPendingTab && !isRelievedTab && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border-t border-r border-b border-l-4 border-l-blue-400 p-5 rounded-lg shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase">Permanent</p>
            <p className="text-2xl font-light text-slate-700 mt-1">{activeSupervisors.length}</p>
          </div>
          <div className="bg-white border-t border-r border-b border-l-4 border-l-emerald-400 p-5 rounded-lg shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase">Contractual</p>
            <p className="text-2xl font-light text-slate-700 mt-1">{activeEmployees.length}</p>
          </div>
          <div className="bg-white border-t border-r border-b border-l-4 border-l-amber-400 p-5 rounded-lg shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase">Departments</p>
            <p className="text-2xl font-light text-slate-700 mt-1">{uniqueDepts}</p>
          </div>
          <div className="bg-white border-t border-r border-b border-l-4 border-l-purple-400 p-5 rounded-lg shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase">Total Users</p>
            <p className="text-2xl font-light text-slate-700 mt-1">{totalUsers}</p>
          </div>
        </div>
      )}

      {/* Tabs and Search Row */}
      <div className="bg-white rounded-t-xl border-b border-slate-200 px-6 pt-4 flex justify-between items-end">
        <div className="flex gap-8">
          <button 
            onClick={() => setSubTab('PERMANENT')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors ${subTab === 'PERMANENT' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-700 border-b-2 border-transparent'}`}
          >
            Permanent {isPendingTab && subTab !== 'PERMANENT' && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">New</span>}
          </button>
          <button 
            onClick={() => setSubTab('CONTRACTUAL')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors ${subTab === 'CONTRACTUAL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-700 border-b-2 border-transparent'}`}
          >
            Contractual {isPendingTab && subTab !== 'CONTRACTUAL' && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">New</span>}
          </button>
        </div>
        
        <div className="pb-3 flex items-center gap-3">
          <div className="relative w-64">
            <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-6 pr-2 py-1 border-b border-slate-300 focus:border-indigo-600 focus:outline-none text-sm bg-transparent" 
            />
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden -mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>Resource ID</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Mobile</th>
                <th className={thClass}>Designation</th>
                {role === 'admin' && <th className={thClass}>Location</th>}
                <th className={thClass}>Department</th>
                <th className={thClass}>Supplier</th>
                <th className={`${thClass} text-center`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500 italic">No records found.</td></tr>
              ) : (
                filteredData.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} font-mono font-medium text-slate-600`}>
                      {worker.supervisor_code || worker.employee_code}
                      {isPendingTab && <span className="block text-[10px] text-amber-500 mt-1 uppercase">Pending Review</span>}
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <SecureAvatar path={worker.profile_photo_url} className="w-8 h-8 rounded-full" onClick={() => onViewImage(worker.profile_photo_url)} />
                        <span className="font-semibold text-slate-800">{worker.name}</span>
                      </div>
                    </td>
                    <td className={tdClass}>{worker.phone || '-'}</td>
                    <td className={tdClass}>{worker.post || '-'}</td>
                    {role === 'admin' && <td className={tdClass}>{getPlantName(worker.plant_id)}</td>}
                    <td className={tdClass}>{worker.department || '-'}</td>
                    <td className={tdClass}>{companies.find(c => c.id === worker.company_id)?.company_name || '-'}</td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex items-center justify-center gap-3">
                        
                        {/* Verify Docs Button (Always Visible) */}
                        {worker.aadhar_photo_url && (
                          <button onClick={() => onViewImage(worker.aadhar_photo_url)} className="text-blue-600 hover:text-blue-800" title="Verify Document"><ImageIcon size={16} /></button>
                        )}
                        
                        {/* The Action Buttons */}
                        {isPendingTab ? (
                          <button 
                            onClick={() => onApproveWorker(worker.id, subTab === 'PERMANENT' ? 'supervisor' : 'employee')} 
                            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded text-xs font-bold transition-colors"
                          >
                            <CheckCircle size={14}/> Approve
                          </button>
                        ) : (
                          <>
                            {subTab === 'PERMANENT' && !isRelievedTab && (
                               <button onClick={() => { setTargetSupervisor(worker); setCredentials({ username: worker.username || '', password: worker.password || '' }); setShowCredentialsModal(true); }} className="text-green-600 opacity-70 hover:opacity-100" title="Keys"><Key size={16} /></button>
                            )}
                            <button onClick={() => setEditingWorker({ ...worker, role: subTab === 'PERMANENT' ? 'supervisor' : 'employee' })} className="text-slate-600 opacity-70 hover:opacity-100" title="Edit"><Edit size={16} /></button>
                            <button onClick={() => handleToggleWorkerStatus(worker.id, subTab === 'PERMANENT' ? 'supervisor' : 'employee', !isRelievedTab)} className={`${isRelievedTab ? "text-emerald-600" : "text-red-600"} opacity-70 hover:opacity-100`} title="Toggle Status"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end px-6 py-4 bg-white text-slate-500 text-sm">
          <div className="flex items-center gap-2 mr-6">
            <span>Rows per page:</span>
            <select className="border-none bg-transparent outline-none cursor-pointer text-slate-700 font-medium"><option>10</option><option>20</option></select>
          </div>
          <span>1-{filteredData.length} of {filteredData.length}</span>
        </div>
      </div>
    </div>
  );
}