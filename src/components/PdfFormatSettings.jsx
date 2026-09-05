import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FileText, Save, CheckSquare } from 'lucide-react';

// These match the fields the generated PDF can show -- keep this list in
// sync with the field keys handleDownloadPDF checks in Dashboard.jsx. Name,
// Company/Plant, and Employment Type are always shown and aren't listed
// here since they're not optional. Bank/account details and the old
// Statutory (ESI/UAN) section are permanently excluded from the PDF, not
// just unchecked by default, so they don't appear here as options at all.
const FIELD_OPTIONS = [
  { key: 'fatherName', label: "Father's Name" },
  { key: 'mobile', label: 'Mobile Number' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'idProofType', label: 'ID Proof Type' },
  { key: 'aadharNumber', label: 'Aadhaar / ID Number' },
  { key: 'department', label: 'Department' },
  { key: 'designation', label: 'Designation' },
  { key: 'joiningDate', label: 'Joining Date' },
  { key: 'experience', label: 'Experience' },
  { key: 'previousCompany', label: 'Previous Company' },
  { key: 'salary', label: 'Monthly Salary' },
  { key: 'operatorTrial', label: 'Operator Trial Done' },
];

// The Supervisor's own signature line is always included and isn't
// customizable -- these 4 are the ones that vary by company.
const SIGNATURE_OPTIONS = [
  { key: 'hr', label: 'HR' },
  { key: 'plantHead', label: 'Plant Head' },
  { key: 'vp', label: 'VP' },
  { key: 'ceo', label: 'CEO' },
];

const DEFAULT_FIELDS = FIELD_OPTIONS.map(f => f.key);
const DEFAULT_SIGNATURES = SIGNATURE_OPTIONS.map(s => s.key);

export default function PdfFormatSettings({ companies }) {
  const clientCompanies = companies.filter(c => !c.is_own_company);
  const [selectedCompanyId, setSelectedCompanyId] = useState(clientCompanies[0]?.id || '');
  const [includedFields, setIncludedFields] = useState(DEFAULT_FIELDS);
  const [includedSignatures, setIncludedSignatures] = useState(DEFAULT_SIGNATURES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const loadSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('company_pdf_settings').select('*').eq('company_id', selectedCompanyId).maybeSingle();
      setIncludedFields(data?.included_fields || DEFAULT_FIELDS);
      setIncludedSignatures(data?.included_signatures || DEFAULT_SIGNATURES);
      setLoading(false);
    };
    loadSettings();
  }, [selectedCompanyId]);

  const toggleField = (key) => {
    setIncludedFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };
  const toggleSignature = (key) => {
    setIncludedSignatures(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('company_pdf_settings').upsert(
      { company_id: selectedCompanyId, included_fields: includedFields, included_signatures: includedSignatures, updated_at: new Date().toISOString() },
      { onConflict: 'company_id' }
    );
    setSaving(false);
    if (error) alert('Failed to save: ' + error.message);
    else alert('PDF format saved for this company.');
  };

  const selectedCompany = clientCompanies.find(c => c.id === selectedCompanyId);

  return (
    <div className="max-w-4xl animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl"><FileText size={24} /></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">PDF Download Format</h2>
            <p className="text-sm font-medium text-slate-500">Choose which details and signatures appear on the downloaded PDF, per client company.</p>
          </div>
        </div>

        {clientCompanies.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium">Add a client company first (under "Add Company/Plant") before customizing its PDF format.</p>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Client Company</label>
              <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm">
                {clientCompanies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400 font-medium py-6 text-center">Loading current format...</p>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare size={16} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Details to Include</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-4">Name, Placement (Company/Plant), and Employment Type always appear and can't be turned off. Bank details and statutory numbers (ESI/UAN) are never included on this form.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {FIELD_OPTIONS.map(f => (
                      <label key={f.key} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="checkbox" checked={includedFields.includes(f.key)} onChange={() => toggleField(f.key)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        <span className="text-sm font-semibold text-slate-700">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare size={16} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Signatures Required</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-4">The Supervisor's own signature line always appears. Choose which additional sign-off boxes this company's paperwork needs.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SIGNATURE_OPTIONS.map(s => (
                      <label key={s.key} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="checkbox" checked={includedSignatures.includes(s.key)} onChange={() => toggleSignature(s.key)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-600/20">
                  <Save size={16} /> {saving ? 'Saving...' : `Save Format for ${selectedCompany?.company_name || 'this company'}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
