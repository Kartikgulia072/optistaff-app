import { useState } from 'react';
import { Building2, Plus, MapPin, Factory, ChevronLeft, ArrowRight, Activity, Users } from 'lucide-react';

export default function ClientsTab({ companies, setSelectedCompanyId, setShowPlantModal, goToRoster }) {
  const [activeCompanyId, setActiveCompanyId] = useState(null);

  // Quick top-level analytics
  const totalCompanies = companies.length;
  const totalPlants = companies.reduce((sum, c) => sum + (c.plants?.length || 0), 0);

  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center max-w-2xl mx-auto mt-8">
        <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-slate-700">No Companies Found</h3>
        <p className="text-sm text-slate-500 mt-1">Get started by adding your first client company.</p>
      </div>
    );
  }

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  // LEVEL 2: DRILL-DOWN PLANT VIEW
  if (activeCompany) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-7xl mx-auto">
        <button onClick={() => setActiveCompanyId(null)} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-2">
          <ChevronLeft size={18} /> Back to Dashboard Summary
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><Building2 size={32} className="text-blue-600" /></div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{activeCompany.company_name}</h2>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
                  Network Code: <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono ml-1">{activeCompany.company_code}</span>
                </p>
              </div>
            </div>
            <button onClick={() => { setSelectedCompanyId(activeCompany.id); setShowPlantModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
              <Plus size={16} /> Add Plant Unit
            </button>
          </div>
          
          {!activeCompany.plants || activeCompany.plants.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Factory className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-slate-500 font-medium">No plant units assigned to this company yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeCompany.plants.map((plant) => (
                <div key={plant.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">{plant.plant_name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200">ID: {plant.plant_code}</span>
                        <span className="flex items-center gap-1 text-slate-500 text-xs font-medium"><MapPin size={12} className="text-slate-400" /> {plant.location}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-600 transition-colors">
                      <Factory size={20} />
                    </div>
                  </div>
                  <button onClick={() => goToRoster(plant.id)} className="w-full flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-sm transition-colors mt-2">
                    View Plant Roster <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // LEVEL 1: DASHBOARD SUMMARY
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* High Level Metrics */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-full text-blue-600"><Building2 size={24}/></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Active Companies</p>
            <p className="text-3xl font-light text-slate-800">{totalCompanies}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600"><Factory size={24}/></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Total Facilities</p>
            <p className="text-3xl font-light text-slate-800">{totalPlants}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 p-4 rounded-full text-purple-600"><Activity size={24}/></div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">System Status</p>
            <p className="text-lg font-medium text-emerald-600 mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2">Network Architecture</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company.id} onClick={() => setActiveCompanyId(company.id)} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                <Building2 size={28} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{company.company_name}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Code: {company.company_code}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center border border-slate-100 mt-4">
              <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Factory size={16} className="text-slate-400"/>
                {company.plants?.length || 0} Plant Units
              </span>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}