import { useState } from 'react';

export default function CreateResource({ role, companies, supervisorData, onAddWorker }) {
  // Supervisor defaults to Contractual, Admin defaults to Permanent
  const [empType, setEmpType] = useState(role === 'supervisor' ? 'Contractual' : 'Permanent');
  
  const [formData, setFormData] = useState({
    companyId: '', plantId: '', name: '', fatherName: '', mobile: '', aadhar: '', dob: '', gender: 'Male',
    department: '', designation: '', joiningDate: '', experience: '', previousCompany: '', salary: '',
    idProofType: 'Aadhaar', operatorTrial: false
  });

  const availablePlants = companies.find(c => c.id === formData.companyId)?.plants || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === 'supervisor' && !formData.department) return alert("Please select a department.");
    const profileFile = document.getElementById('profilePhoto').files[0];
    const idFile = document.getElementById('idPhoto').files[0];
    onAddWorker({ ...formData, employmentType: empType }, profileFile, idFile);
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm shadow-sm";
  const labelClass = "block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2";
  const sectionHeaderClass = "text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-5 mt-10";

  return (
    <div className="max-w-4xl pb-10 animate-in fade-in duration-300">
      <div className="flex gap-3 mb-8 bg-slate-200/50 p-1.5 rounded-xl w-fit">
        
        {/* Only Admin can see and click Permanent */}
        {role === 'admin' && (
          <button type="button" onClick={() => setEmpType('Permanent')} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${empType === 'Permanent' ? 'bg-white text-blue-700 border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800 border border-transparent shadow-none'}`}>
            Permanent
          </button>
        )}
        
        <button type="button" onClick={() => setEmpType('Contractual')} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${empType === 'Contractual' ? 'bg-white text-blue-700 border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800 border border-transparent shadow-none'}`}>
          Contractual
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-5">1. Placement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Company *</label>
            <select required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value, plantId: ''})} className={inputClass}>
              <option value="" disabled>Select...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Plant Unit *</label>
            <select required value={formData.plantId} onChange={e => setFormData({...formData, plantId: e.target.value})} disabled={!formData.companyId} className={inputClass}>
              <option value="" disabled>Select...</option>
              {availablePlants.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
            </select>
          </div>
        </div>

        <h3 className={sectionHeaderClass}>2. Basic Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div><label className={labelClass}>Employee Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Father's / Husband Name *</label><input type="text" required value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Mobile Number *</label><input type="tel" required value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Date of Birth *</label><input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={inputClass} /></div>
          <div>
            <label className={labelClass}>Gender *</label>
            <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className={inputClass}>
              <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
            </select>
          </div>
        </div>

        <h3 className={sectionHeaderClass}>3. Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>Department / Work Area *</label>
            {role === 'supervisor' ? (
              <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={inputClass}>
                <option value="" disabled>Select assigned department...</option>
                {supervisorData?.allowed_departments?.length > 0 ? (
                  supervisorData.allowed_departments.map(d => <option key={d} value={d}>{d}</option>)
                ) : (
                  <option value="" disabled>No departments configured by Admin</option>
                )}
              </select>
            ) : (
              <input type="text" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="e.g. Shearing, Fabrication..." className={inputClass} />
            )}
          </div>
          <div><label className={labelClass}>Designation *</label><input type="text" required value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} placeholder="e.g. Operator" className={inputClass} /></div>
          <div><label className={labelClass}>Monthly Salary (₹) *</label><input type="number" required min="0" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Joining Date *</label><input type="date" required value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Experience *</label><input type="text" required value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder="e.g. 2 Years" className={inputClass} /></div>
          <div><label className={labelClass}>Previous Company *</label><input type="text" required value={formData.previousCompany} onChange={e => setFormData({...formData, previousCompany: e.target.value})} placeholder="e.g. Maruti / NA" className={inputClass} /></div>
        </div>

        <h3 className={sectionHeaderClass}>4. Documents & Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>ID Proof Type *</label>
            <select required value={formData.idProofType} onChange={e => setFormData({...formData, idProofType: e.target.value})} className={inputClass}>
              <option value="Aadhaar">Aadhaar</option><option value="PAN">PAN</option><option value="Voter ID">Voter ID</option><option value="Driving License">Driving License</option>
            </select>
          </div>
          <div><label className={labelClass}>ID Number *</label><input type="text" required value={formData.aadhar} onChange={e => setFormData({...formData, aadhar: e.target.value})} className={inputClass} /></div>
          
          {empType === 'Contractual' && (
            <div className="col-span-1 md:col-span-3 mt-2">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between w-fit gap-4 pr-8">
                <span className="text-sm font-bold text-slate-700">Operator Trial Done?</span>
                <input type="checkbox" checked={formData.operatorTrial} onChange={e => setFormData({...formData, operatorTrial: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded cursor-pointer" />
              </div>
            </div>
          )}

          <div className="col-span-1 md:col-span-3 grid grid-cols-2 gap-6 mt-4">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
              <label className={labelClass}>Upload ID Image *</label>
              <input type="file" id="idPhoto" accept="image/*" capture="environment" required className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
              <label className={labelClass}>Upload Profile Photo *</label>
              <input type="file" id="profilePhoto" accept="image/*" capture="environment" required className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all mt-8 text-lg shadow-lg shadow-blue-600/30">
          {role === 'admin' ? 'Create & Activate Resource' : 'Submit for Admin Approval'}
        </button>
      </form>
    </div>
  );
}