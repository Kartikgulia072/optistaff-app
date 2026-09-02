import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { X } from 'lucide-react';

// Same explicit Camera/Gallery pattern used in CreateResource -- kept as its
// own copy here rather than importing, so this file can be edited/rearranged
// independently without risk to the create flow.
function PhotoCaptureCard({ label, optional, type, photos, existingUrls, fileInputRef, handleTakePhoto, handleWebFileChange, labelClass }) {
  const hasNewPhoto = !!photos[type];
  const hasExisting = !!existingUrls[type];
  return (
    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col justify-center">
      <div className="flex items-center justify-between mb-2">
        <label className={`${labelClass} mb-0`}>
          {label}{optional && <span className="text-slate-400 font-medium normal-case"> (optional)</span>}
        </label>
        {hasNewPhoto ? (
          <span className="text-emerald-600 text-xs font-bold">✅ New photo selected</span>
        ) : hasExisting ? (
          <span className="text-blue-600 text-xs font-bold">Existing photo on file</span>
        ) : (
          <span className="text-slate-400 text-xs font-bold">Not uploaded</span>
        )}
      </div>
      {hasExisting && !hasNewPhoto && (
        <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-3">
          <img src={existingUrls[type]} alt={label} className="w-full h-full object-cover" />
        </div>
      )}
      <input type="file" accept="image/*" capture="environment" ref={(el) => { fileInputRef.current[`${type}_camera`] = el; }} onChange={handleWebFileChange} className="hidden" />
      <input type="file" accept="image/*" ref={(el) => { fileInputRef.current[`${type}_gallery`] = el; }} onChange={handleWebFileChange} className="hidden" />
      <div className="flex gap-2">
        <button type="button" onClick={() => handleTakePhoto(type, 'camera')} className="flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all border shadow-sm bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
          📷 Camera
        </button>
        <button type="button" onClick={() => handleTakePhoto(type, 'gallery')} className="flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all border shadow-sm bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
          🖼️ Gallery
        </button>
      </div>
    </div>
  );
}

export default function EditResource({ worker, empType, companies, onSave, onClose }) {
  const [isSaving, setIsSaving] = useState(false);
  const [existingUrls, setExistingUrls] = useState({ profile: null, idFront: null, idBack: null, passbook: null });
  const [loadingPreviews, setLoadingPreviews] = useState(true);

  const [formData, setFormData] = useState({
    companyId: worker.company_id || '',
    plantId: worker.plant_id || '',
    name: worker.name || '',
    fatherName: worker.father_name || '',
    mobile: worker.phone || '',
    aadhar: worker.aadhar_number || '',
    dob: worker.dob || '',
    gender: worker.gender || 'Male',
    department: worker.department || '',
    designation: worker.post || '',
    joiningDate: worker.joining_date || '',
    experience: worker.experience || '',
    previousCompany: worker.previous_company || '',
    salary: worker.monthly_salary || '',
    idProofType: worker.id_proof_type || 'Aadhaar',
    esiNumber: worker.esi_number || '',
    uanNumber: worker.uan_number || '',
    bankAccountName: worker.bank_account_name || '',
    bankName: worker.bank_name || '',
    ifscCode: worker.ifsc_code || '',
    bankAccountNumber: worker.bank_account_number || '',
  });

  // New photo files the admin picks during this edit -- only these get
  // uploaded on save. Anything left null keeps the worker's existing photo.
  const [photos, setPhotos] = useState({ profile: null, idFront: null, idBack: null, passbook: null });
  const fileInputRef = { current: {} };
  const [pendingFileType, setPendingFileType] = useState(null);

  const availablePlants = companies.find(c => c.id === formData.companyId)?.plants || [];

  // Load a quick preview of whatever photos already exist, so the admin can
  // see what's on file before deciding whether to replace anything.
  useEffect(() => {
    const loadPreviews = async () => {
      setLoadingPreviews(true);
      const urlMap = { profile: worker.profile_photo_url, idFront: worker.aadhar_photo_url, idBack: worker.aadhar_back_photo_url, passbook: worker.passbook_photo_url };
      const resolved = {};
      await Promise.all(Object.entries(urlMap).map(async ([key, path]) => {
        if (!path) return;
        const { data } = await supabase.storage.from('worker_docs').createSignedUrl(path, 3600);
        resolved[key] = data?.signedUrl || null;
      }));
      setExistingUrls(resolved);
      setLoadingPreviews(false);
    };
    loadPreviews();
  }, [worker]);

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
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const file = new File([blob], `${type}_photo.${image.format}`, { type: `image/${image.format}` });
      setPhotos(prev => ({ ...prev, [type]: file }));
    } catch (error) {
      console.log("User cancelled photo selection or camera failed:", error);
    }
  };

  const handleWebFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && pendingFileType) {
      setPhotos(prev => ({ ...prev, [pendingFileType]: file }));
    }
    setPendingFileType(null);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(worker, empType, formData, photos);
      onClose();
    } catch (err) {
      alert('Failed to save changes: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const labelClass = "block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2";
  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const sectionHeaderClass = "text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-5 mt-8 first:mt-0";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Edit Details — {worker.name}</h2>
            <p className="text-sm text-slate-500 font-medium">Change any field below, including their company and plant unit.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-8 py-6">
          <h3 className={sectionHeaderClass}>1. Placement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Company *</label>
              <select required value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value, plantId: '' })} className={inputClass}>
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Plant Unit *</label>
              <select required value={formData.plantId} onChange={e => setFormData({ ...formData, plantId: e.target.value })} className={inputClass} disabled={!formData.companyId}>
                <option value="">Select Plant</option>
                {availablePlants.map(p => <option key={p.id} value={p.id}>{p.plant_name}</option>)}
              </select>
            </div>
          </div>

          <h3 className={sectionHeaderClass}>2. Basic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className={labelClass}>Full Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Father's Name</label><input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Mobile Number</label><input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Date of Birth</label><input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Gender</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className={inputClass}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ID Proof Type</label>
              <select value={formData.idProofType} onChange={e => setFormData({...formData, idProofType: e.target.value})} className={inputClass}>
                <option>Aadhaar</option><option>PAN</option><option>Voter ID</option><option>Driving License</option>
              </select>
            </div>
            <div><label className={labelClass}>Aadhaar / ID Number</label><input type="text" value={formData.aadhar} onChange={e => setFormData({...formData, aadhar: e.target.value})} className={inputClass} /></div>
          </div>

          <h3 className={sectionHeaderClass}>3. Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className={labelClass}>Department</label><input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Designation</label><input type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Joining Date</label><input type="date" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Experience</label><input type="text" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Previous Company</label><input type="text" value={formData.previousCompany} onChange={e => setFormData({...formData, previousCompany: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Monthly Salary</label><input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className={inputClass} /></div>
          </div>

          <h3 className={sectionHeaderClass}>4. Statutory & Bank Details <span className="text-slate-400 normal-case font-medium tracking-normal">(optional)</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className={labelClass}>ESI Number</label><input type="text" value={formData.esiNumber} onChange={e => setFormData({...formData, esiNumber: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>UAN / PF Number</label><input type="text" value={formData.uanNumber} onChange={e => setFormData({...formData, uanNumber: e.target.value})} className={inputClass} /></div>
            <div className="hidden md:block" />
            <div><label className={labelClass}>Bank Account Holder Name</label><input type="text" value={formData.bankAccountName} onChange={e => setFormData({...formData, bankAccountName: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Bank Name</label><input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>IFSC Code</label><input type="text" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})} maxLength={11} className={inputClass} /></div>
            <div><label className={labelClass}>Account Number</label><input type="text" value={formData.bankAccountNumber} onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})} className={inputClass} /></div>
          </div>

          <h3 className={sectionHeaderClass}>5. Documents {loadingPreviews && <span className="text-slate-400 normal-case font-medium tracking-normal">(loading previews...)</span>}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <PhotoCaptureCard label="Aadhaar - Front Side" type="idFront" photos={photos} existingUrls={existingUrls} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
            <PhotoCaptureCard label="Aadhaar - Back Side" type="idBack" photos={photos} existingUrls={existingUrls} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
            <PhotoCaptureCard label="Profile Photo" type="profile" photos={photos} existingUrls={existingUrls} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
            <PhotoCaptureCard label="Passbook Photo" optional type="passbook" photos={photos} existingUrls={existingUrls} fileInputRef={fileInputRef} handleTakePhoto={handleTakePhoto} handleWebFileChange={handleWebFileChange} labelClass={labelClass} />
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-200">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
