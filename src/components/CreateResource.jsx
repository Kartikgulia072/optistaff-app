import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Building2 } from 'lucide-react';

// One photo slot: a label, an optional badge, and two explicit buttons
// (Camera / Gallery) instead of one ambiguous button, since mobile browsers
// handle a single file input's "guess what I want" behavior inconsistently.
function PhotoCaptureCard({ label, optional, type, photos, fileInputRef, handleTakePhoto, handleWebFileChange, labelClass }) {
  const hasPhoto = !!photos[type];
  return (
    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col justify-center">
      <div className="flex items-center justify-between mb-2">
        <label className={`${labelClass} mb-0`}>
          {label}{optional && <span className="text-slate-400 font-medium normal-case"> (optional)</span>}
        </label>
        {hasPhoto && <span className="text-emerald-600 text-xs font-bold">✅ Saved</span>}
      </div>
      <input type="file" accept="image/*" capture="environment" ref={(el) => { fileInputRef.current[`${type}_camera`] = el; }} onChange={handleWebFileChange} className="hidden" />
      <input type="file" accept="image/*" ref={(el) => { fileInputRef.current[`${type}_gallery`] = el; }} onChange={handleWebFileChange} className="hidden" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTakePhoto(type, 'camera')}
          className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all border shadow-sm ${hasPhoto ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
        >
          📷 Camera
        </button>
        <button
          type="button"
          onClick={() => handleTakePhoto(type, 'gallery')}
          className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all border shadow-sm ${hasPhoto ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
        >
          🖼️ Gallery
        </button>
      </div>
    </div>
  );
}

export default function CreateResource({ role, companies, supervisorData, onAddWorker }) {
  const [empType, setEmpType] = useState(role === 'supervisor' ? 'Contractual' : 'Permanent');
  
  const initialFormData = {
    companyId: '', plantId: '', name: '', fatherName: '', mobile: '', aadhar: '', dob: '', gender: 'Male',
    department: '', designation: '', joiningDate: '', experience: '', previousCompany: '', salary: '',
    idProofType: 'Aadhaar', operatorTrial: false,
    esiNumber: '', uanNumber: '',
    bankAccountName: '', bankName: '', ifscCode: '', bankAccountNumber: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Store the actual file data from the native camera
  const [photos, setPhotos] = useState({ profile: null, idFront: null, idBack: null, passbook: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Used only on the web fallback path below, to trigger hidden file inputs.
  // Keyed dynamically as "<type>_camera" / "<type>_gallery".
  const fileInputRef = useRef({});
  const [pendingFileType, setPendingFileType] = useState(null);

  const availablePlants = companies.find(c => c.id === formData.companyId)?.plants || [];

  // Permanent hires (Supervisors) belong to the admin's own agency, not a
  // client site -- that company is auto-created at signup and flagged
  // is_own_company. Contractual workers still pick from client companies
  // via the normal dropdown.
  const ownCompany = companies.find(c => c.is_own_company);
  const clientCompanies = companies.filter(c => !c.is_own_company);
  const ownPlant = ownCompany?.plants?.[0];

  // Only needs to clear any leftover client-company selection when switching
  // away from Permanent -- the actual company/plant used for a Permanent
  // hire is resolved fresh at submit time below, so there's nothing to
  // pre-sync here regardless of mount timing or when `companies` finishes loading.
  const handleEmpTypeChange = (newType) => {
    setEmpType(newType);
    setFormData(prev => ({ ...prev, companyId: '', plantId: '' }));
  };

  // Different mobile browsers handle a plain file input inconsistently --
  // with capture="environment" it forces the camera with no gallery option,
  // and without it, modern Chrome's "Photo Picker" often shows gallery only
  // with no visible camera shortcut. Rather than depend on the browser to
  // guess right, we give two explicit, always-visible buttons instead --
  // one wired to a camera-forcing input, one to a gallery-only input. Same
  // idea on native: CameraSource.Camera / CameraSource.Photos explicitly,
  // instead of relying on the OS's own Prompt action sheet.
  const handleTakePhoto = async (type, mode) => {
    if (!Capacitor.isNativePlatform()) {
      setPendingFileType(type);
      fileInputRef.current[`${type}_${mode}`]?.click();
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: mode === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      // Convert the native phone image into a standard file so your Supabase upload still works perfectly
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const file = new File([blob], `${type}_photo.${image.format}`, { type: `image/${image.format}` });

      setPhotos(prev => ({ ...prev, [type]: file }));
    } catch (error) {
      console.log("User cancelled photo selection or camera failed:", error);
    }
  };

  // Handles the file chosen via either plain <input type="file"> on web.
  const handleWebFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && pendingFileType) {
      setPhotos(prev => ({ ...prev, [pendingFileType]: file }));
    }
    setPendingFileType(null);
    e.target.value = ''; // allow picking the same file again later
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === 'supervisor' && !formData.department) return alert("Please select a department.");
    if (empType === 'Permanent' && (!ownCompany || !ownPlant)) return alert("Set up your company details in \"Manage Profile\" (in the sidebar) before adding Permanent staff.");

    // Ensure all three photos are selected before submitting
    if (!photos.profile || !photos.idFront || !photos.idBack) return alert("Please provide the Profile Photo and both sides of the Aadhaar card.");

    // A Permanent hire always belongs to the admin's own agency, resolved
    // fresh here rather than relying on form state being pre-filled.
    const submissionData = empType === 'Permanent'
      ? { ...formData, companyId: ownCompany.id, plantId: ownPlant.id }
      : formData;

    setIsSubmitting(true);
    try {
      await onAddWorker({ ...submissionData, employmentType: empType }, photos.profile, photos.idFront, photos.idBack, photos.passbook);
      // Clear the form back to a blank state only after the submission succeeded
      setFormData(initialFormData);
      setPhotos({ profile: null, idFront: null, idBack: null, passbook: null });
      setEmpType(role === 'supervisor' ? 'Contractual' : 'Permanent');
    } catch (err) {
      // Dashboard already shows an alert with the specific error; just keep
      // the form filled in so the user doesn't lose their entered data.
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm shadow-sm";
  const labelClass = "block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2";
  const sectionHeaderClass = "text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-5 mt-10";

  return (
    <div className="max-w-4xl pb-10 animate-in fade-in duration-300">
      <div className="flex gap-3 mb-8 bg-slate-200/50 p-1.5 rounded-xl w-fit">
        {role === 'admin' && (
          <button type="button" onClick={() => handleEmpTypeChange('Permanent')} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${empType === 'Permanent' ? 'bg-white text-blue-700 border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800 border border-transparent shadow-none'}`}>
            Permanent
          </button>
        )}
        <button type="button" onClick={() => handleEmpTypeChange('Contractual')} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${empType === 'Contractual' ? 'bg-white text-blue-700 border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800 border border-transparent shadow-none'}`}>
          Contractual
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-5">1. Placement</h3>
        {empType === 'Permanent' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <Building2 size={20} className="text-blue-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-900">
                {ownCompany ? `This Supervisor will be added under ${ownCompany.company_name}` : 'Your company details are not set up yet'}
              </p>
              <p className="text-xs font-medium text-blue-700/70">
                {ownCompany ? 'Permanent staff always belong to your own agency, not a client company.' : 'Set up your company details in "Manage Profile" (in the sidebar) first.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Company *</label>
              <select required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value, plantId: ''})} className={inputClass}>
                <option value="" disabled>Select...</option>
                {clientCompanies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
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
        )}

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

          <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <PhotoCaptureCard label="Aadhaar - Front Side *" type="idFront" photos={photos} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
            <PhotoCaptureCard label="Aadhaar - Back Side *" type="idBack" photos={photos} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
            <PhotoCaptureCard label="Upload Profile Photo *" type="profile" photos={photos} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
            <PhotoCaptureCard label="Passbook Photo" optional type="passbook" photos={photos} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
          </div>
        </div>

        <h3 className={sectionHeaderClass}>5. Statutory & Bank Details <span className="text-slate-400 normal-case font-medium tracking-normal">(optional)</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div><label className={labelClass}>ESI Number</label><input type="text" value={formData.esiNumber} onChange={e => setFormData({...formData, esiNumber: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>UAN / PF Number</label><input type="text" value={formData.uanNumber} onChange={e => setFormData({...formData, uanNumber: e.target.value})} className={inputClass} /></div>
          <div className="hidden md:block" />
          <div><label className={labelClass}>Bank Account Holder Name</label><input type="text" value={formData.bankAccountName} onChange={e => setFormData({...formData, bankAccountName: e.target.value})} placeholder="As per bank records" className={inputClass} /></div>
          <div><label className={labelClass}>Bank Name</label><input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>IFSC Code</label><input type="text" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})} maxLength={11} placeholder="e.g. SBIN0001234" className={inputClass} /></div>
          <div><label className={labelClass}>Account Number</label><input type="text" value={formData.bankAccountNumber} onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})} className={inputClass} /></div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all mt-8 text-lg shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            role === 'admin' ? 'Create & Activate Resource' : 'Submit for Admin Approval'
          )}
        </button>
      </form>
    </div>
  );
}