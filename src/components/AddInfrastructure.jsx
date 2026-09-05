import { Building2, Factory, Trash2 } from 'lucide-react';

export default function AddInfrastructure({ 
  companies, 
  newCompany, setNewCompany, handleAddCompany, 
  newPlant, setNewPlant, handleAddPlant, 
  handleDeleteCompany, handleDeletePlant,
  loading 
}) {
  // Your own company (created automatically at signup) is managed
  // separately and doesn't belong in this client-company list at all.
  const clientCompanies = companies.filter(c => !c.is_own_company);

  const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm shadow-sm";
  const labelClass = "block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2";

  return (
    <div className="max-w-6xl animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ADD COMPANY FORM */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl"><Building2 size={24} /></div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Add Client Company</h2>
              <p className="text-sm font-medium text-slate-500">Register a new client or umbrella organization.</p>
            </div>
          </div>
          
          <form onSubmit={handleAddCompany} className="space-y-5">
            <div>
              <label className={labelClass}>Company Name</label>
              <input type="text" required placeholder="e.g. SK Engineering" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Company Code (3-4 Letters)</label>
              <input type="text" required maxLength="4" placeholder="e.g. SKE" value={newCompany.code} onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
              <p className="text-xs text-slate-400 mt-1.5 font-medium">This code is used to auto-generate worker IDs.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-600/20 mt-4">
              {loading ? 'Saving...' : 'Register Company'}
            </button>
          </form>
        </div>

        {/* ADD PLANT FORM */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl"><Factory size={24} /></div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Add Plant Unit</h2>
              <p className="text-sm font-medium text-slate-500">Attach a new facility to an existing company.</p>
            </div>
          </div>
          
          <form onSubmit={handleAddPlant} className="space-y-5">
            <div>
              <label className={labelClass}>Parent Company</label>
              <select required value={newPlant.companyId} onChange={(e) => setNewPlant({ ...newPlant, companyId: e.target.value })} className={inputClass}>
                <option value="" disabled>Select a company...</option>
                {clientCompanies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Plant / Unit Name</label>
              <input type="text" required placeholder="e.g. Unit 1 - Faridabad" value={newPlant.name} onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Location / City</label>
              <input type="text" required placeholder="e.g. Sector 12" value={newPlant.location} onChange={(e) => setNewPlant({ ...newPlant, location: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-slate-800/20 mt-4">
              {loading ? 'Saving...' : 'Create Plant Unit'}
            </button>
          </form>
        </div>

      </div>

      {/* MANAGE EXISTING */}
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 mt-8">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">Manage Existing</h2>
          <p className="text-sm font-medium text-slate-500">Remove a company or plant unit you no longer need. A company can only be removed once all its plants are removed, and a plant can only be removed once it has no employees or supervisors assigned to it.</p>
        </div>

        {clientCompanies.length === 0 && <p className="text-sm text-slate-400 font-medium">No companies added yet.</p>}

        <div className="space-y-4">
          {clientCompanies.map(company => (
            <div key={company.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <Building2 size={16} className="text-blue-700" />
                  <span className="font-bold text-slate-800">{company.company_name}</span>
                  <span className="text-xs text-slate-400 font-semibold">({company.company_code})</span>
                </div>
                <button
                  onClick={() => handleDeleteCompany(company)}
                  title="Delete company"
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {(company.plants || []).length > 0 && (
                <div className="divide-y divide-slate-100">
                  {company.plants.map(plant => (
                    <div key={plant.id} className="flex items-center justify-between px-5 py-2.5 pl-10">
                      <div className="flex items-center gap-2.5 text-sm">
                        <Factory size={14} className="text-emerald-700" />
                        <span className="font-semibold text-slate-700">{plant.plant_name}</span>
                        <span className="text-xs text-slate-400">{plant.location} · {plant.plant_code}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePlant(company, plant)}
                        title="Delete plant"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}