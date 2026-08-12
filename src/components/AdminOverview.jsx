import { useState } from 'react';
import { Building2, Factory, Users, IndianRupee, ArrowLeft, ChevronRight, Activity, Clock } from 'lucide-react';

export default function AdminOverview({ companies, supervisors, employees }) {
  // State to track drill-down levels
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);

  // Helper function to calculate stats dynamically based on what we are viewing
  const getStats = (companyId = null, plantId = null) => {
    let activeSup = supervisors.filter(s => s.is_active && s.approval_status === 'approved');
    let activeEmp = employees.filter(e => e.is_active && e.approval_status === 'approved');
    let pendingSup = supervisors.filter(s => s.approval_status === 'pending');
    let pendingEmp = employees.filter(e => e.approval_status === 'pending');

    if (companyId) {
      activeSup = activeSup.filter(s => s.company_id === companyId);
      activeEmp = activeEmp.filter(e => e.company_id === companyId);
      pendingSup = pendingSup.filter(s => s.company_id === companyId);
      pendingEmp = pendingEmp.filter(e => e.company_id === companyId);
    }
    
    if (plantId) {
      activeSup = activeSup.filter(s => s.plant_id === plantId);
      activeEmp = activeEmp.filter(e => e.plant_id === plantId);
      pendingSup = pendingSup.filter(s => s.plant_id === plantId);
      pendingEmp = pendingEmp.filter(e => e.plant_id === plantId);
    }

    const totalHeadcount = activeSup.length + activeEmp.length;
    const totalSalary = activeSup.reduce((acc, curr) => acc + (curr.monthly_salary || 0), 0) +
                        activeEmp.reduce((acc, curr) => acc + (curr.monthly_salary || 0), 0);
    const totalPending = pendingSup.length + pendingEmp.length;

    return { totalHeadcount, totalSalary, totalPending };
  };

  // Reusable Stat Card Component
  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${colorClass}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
        {subtitle && <p className="text-sm font-medium text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  // LEVEL 3: PLANT DASHBOARD
  if (selectedPlant) {
    const stats = getStats(selectedCompany.id, selectedPlant.id);
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <button onClick={() => setSelectedPlant(null)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm mb-6 transition-colors bg-blue-50 px-4 py-2 rounded-lg w-fit">
          <ArrowLeft size={16} /> Back to {selectedCompany.company_name}
        </button>
        
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <Factory className="text-slate-400" size={24} /> 
            {selectedPlant.plant_name}
          </h2>
          <p className="text-slate-500 font-medium mt-1">Plant Unit Dashboard • {selectedPlant.location}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <StatCard title="Plant Headcount" value={stats.totalHeadcount} icon={Users} colorClass="bg-blue-100 text-blue-700" subtitle="Active Permanent & Contractual" />
          <StatCard title="Plant Monthly Payroll" value={`₹${stats.totalSalary.toLocaleString()}`} icon={IndianRupee} colorClass="bg-emerald-100 text-emerald-700" />
          <StatCard title="Pending Approvals" value={stats.totalPending} icon={Clock} colorClass="bg-amber-100 text-amber-700" subtitle="Awaiting admin activation" />
        </div>
      </div>
    );
  }

  // LEVEL 2: COMPANY DASHBOARD
  if (selectedCompany) {
    const stats = getStats(selectedCompany.id);
    const companyPlants = selectedCompany.plants || [];

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <button onClick={() => setSelectedCompany(null)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm mb-6 transition-colors bg-blue-50 px-4 py-2 rounded-lg w-fit">
          <ArrowLeft size={16} /> Back to Network Overview
        </button>
        
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <Building2 className="text-blue-600" size={28} /> 
            {selectedCompany.company_name}
          </h2>
          <p className="text-slate-500 font-medium mt-1">Corporate Level Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <StatCard title="Total Headcount" value={stats.totalHeadcount} icon={Users} colorClass="bg-blue-100 text-blue-700" subtitle="Across all plants" />
          <StatCard title="Total Monthly Payroll" value={`₹${stats.totalSalary.toLocaleString()}`} icon={IndianRupee} colorClass="bg-emerald-100 text-emerald-700" />
          <StatCard title="Pending Approvals" value={stats.totalPending} icon={Clock} colorClass="bg-amber-100 text-amber-700" />
        </div>

        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-3 mb-6">Plant Units ({companyPlants.length})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companyPlants.map(plant => {
            const pStats = getStats(selectedCompany.id, plant.id);
            return (
              <div key={plant.id} onClick={() => setSelectedPlant(plant)} className="bg-white border border-slate-200 hover:border-blue-400 p-6 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Factory size={24} />
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 mb-1">{plant.plant_name}</h4>
                <p className="text-slate-500 font-medium text-sm mb-4">{plant.location} • {plant.plant_code}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider"><span className="text-slate-900 text-sm">{pStats.totalHeadcount}</span> Workers</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">₹{pStats.totalSalary.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
          {companyPlants.length === 0 && <p className="text-slate-500 font-medium text-sm col-span-full">No plant units configured for this company yet.</p>}
        </div>
      </div>
    );
  }

  // LEVEL 1: MASTER NETWORK OVERVIEW
  const networkStats = getStats();
  
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
          <Activity className="text-blue-600" size={28} /> 
          Global Network Overview
        </h2>
        <p className="text-slate-500 font-medium mt-1">High-level summary of all companies and resources.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard title="Network Headcount" value={networkStats.totalHeadcount} icon={Users} colorClass="bg-blue-100 text-blue-700" subtitle="Total active workforce" />
        <StatCard title="Network Monthly Payroll" value={`₹${networkStats.totalSalary.toLocaleString()}`} icon={IndianRupee} colorClass="bg-emerald-100 text-emerald-700" subtitle="Aggregated salary outflow" />
        <StatCard title="Network Pending" value={networkStats.totalPending} icon={Clock} colorClass="bg-amber-100 text-amber-700" subtitle="Requires immediate action" />
      </div>

      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-3 mb-6">Partner Companies ({companies.length})</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map(company => {
          const cStats = getStats(company.id);
          return (
            <div key={company.id} onClick={() => setSelectedCompany(company)} className="bg-white border border-slate-200 hover:border-blue-400 p-6 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Building2 size={24} />
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 mb-1">{company.company_name}</h4>
              <p className="text-slate-500 font-medium text-sm mb-4">Code: {company.company_code} • {(company.plants || []).length} Plants</p>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider"><span className="text-slate-900 text-sm">{cStats.totalHeadcount}</span> Workers</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">₹{cStats.totalSalary.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
        {companies.length === 0 && <p className="text-slate-500 font-medium text-sm col-span-full">No companies configured. Go to "Add Company/Plant" to start.</p>}
      </div>
    </div>
  );
}