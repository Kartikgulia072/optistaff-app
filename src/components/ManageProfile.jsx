import { useState } from 'react';
import { Building2, Save, CheckCircle2 } from 'lucide-react';

export default function ManageProfile({ companies, onSave }) {
  const ownCompany = companies.find(c => c.is_own_company);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    companyName: ownCompany?.company_name || '',
    gstNumber: ownCompany?.gst_number || '',
    address: ownCompany?.address || '',
    city: ownCompany?.city || '',
    state: ownCompany?.state || '',
    pincode: ownCompany?.pincode || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await onSave(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2";
  const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm shadow-sm";

  return (
    <div className="max-w-3xl animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl"><Building2 size={24} /></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Manage Profile</h2>
            <p className="text-sm font-medium text-slate-500">
              {ownCompany ? 'Your company details, shown on branded documents like the PDF joining form.' : "You haven't set up your company details yet -- add them below to get started."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Company Name *</label>
            <input type="text" required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>GST Number</label>
            <input type="text" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input type="text" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-600/20">
              <Save size={16} /> {saving ? 'Saving...' : ownCompany ? 'Save Changes' : 'Create Company Profile'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                <CheckCircle2 size={16} /> Saved
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
