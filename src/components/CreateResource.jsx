import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export default function CreateResource({ role, companies, supervisorData, onAddWorker }) {
  const [empType, setEmpType] = useState(role === 'supervisor' ? 'Contractual' : 'Permanent');
  
  const initialFormData = {
    companyId: '', plantId: '', name: '', fatherName: '', mobile: '', aadhar: '', dob: '', gender: 'Male',
    department: '', designation: '', joiningDate: '', experience: '', previousCompany: '', salary: '',
    idProofType: 'Aadhaar', operatorTrial: false
  };

  const [formData, setFormData] = useState(initialFormData);

  // Store the actual file data from the native camera
  const [photos, setPhotos] = useState({ profile: null, idFront: null, idBack: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Used only on the web fallback path below, to trigger a hidden file input.
  const fileInputRef = useRef({ profile: null, idFront: null, idBack: null });
  const [pendingFileType, setPendingFileType] = useState(null);

  const availablePlants = companies.find(c => c.id === formData.companyId)?.plants || [];

  // This function triggers the native popup asking "Camera or Gallery?" on
  // the actual Android app. In a browser, Capacitor's Camera plugin falls
  // back to a bundled camera UI (@ionic/pwa-elements) that depends on the
  // ImageCapture Web API -- support for that is inconsistent across mobile
  // browsers, and where it's missing this crashes on the shutter click. So
  // on the web we skip that fallback entirely and just use a plain file
  // input instead, which reliably opens the phone's camera/gallery picker
  // in every mobile browser without depending on that shaky API.
  const handleTakePhoto = async (type) => {
    if (!Capacitor.isNativePlatform()) {
      setPendingFileType(type);
      fileInputRef.current[type]?.click();
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt, // <-- This is the magic command for the selection menu!
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

  // Handles the file chosen via the plain <input type="file"> on web.
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

    // Ensure all three photos are selected before submitting
    if (!photos.profile || !photos.idFront || !photos.idBack) return alert("Please provide the Profile Photo and both sides of the Aadhaar card.");

    setIsSubmitting(true);
    try {
      await onAddWorker({ ...formData, employmentType: empType }, photos.profile, photos.idFront, photos.idBack);
      // Clear the form back to a blank state only after the submission succeeded
      setFormData(initialFormData);
      setPhotos({ profile: null, idFront: null, idBack: null });
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

          <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col justify-center">
              <label className={labelClass}>Aadhaar - Front Side *</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={(el) => { fileInputRef.current.idFront = el; }}
                onChange={handleWebFileChange}
                className="hidden"
              />
              <button 
                type="button" 
                onClick={() => handleTakePhoto('idFront')}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all border shadow-sm ${photos.idFront ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
              >
                {photos.idFront ? '✅ Front Saved (Tap to change)' : '📸 Camera or Gallery'}
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col justify-center">
              <label className={labelClass}>Aadhaar - Back Side *</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={(el) => { fileInputRef.current.idBack = el; }}
                onChange={handleWebFileChange}
                className="hidden"
              />
              <button 
                type="button" 
                onClick={() => handleTakePhoto('idBack')}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all border shadow-sm ${photos.idBack ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
              >
                {photos.idBack ? '✅ Back Saved (Tap to change)' : '📸 Camera or Gallery'}
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col justify-center">
              <label className={labelClass}>Upload Profile Photo *</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={(el) => { fileInputRef.current.profile = el; }}
                onChange={handleWebFileChange}
                className="hidden"
              />
              <button 
                type="button" 
                onClick={() => handleTakePhoto('profile')}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all border shadow-sm ${photos.profile ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
              >
                {photos.profile ? '✅ Profile Saved (Tap to change)' : '📸 Camera or Gallery'}
              </button>
            </div>
          </div>
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