import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

import Sidebar from './components/Sidebar';
import AdminOverview from './components/AdminOverview';
import ResourceTable from './components/ResourceTable';
import CreateResource from './components/CreateResource';
import AddInfrastructure from './components/AddInfrastructure';
import EditResource from './components/EditResource';
import { X, Key, User, Shield, CreditCard, LogOut, Camera, Trash2, Menu, Download } from 'lucide-react';

export default function Dashboard({ role = 'admin', supervisorData = null, onLogout }) {
  // Supervisors immediately default to the 'create' tab
  const [activeTab, setActiveTab] = useState(role === 'admin' ? 'dashboard' : 'create');
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [adminProfile, setAdminProfile] = useState({ name: '', photo: null });

  // Modals & Menus State
  const [viewingWorker, setViewingWorker] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null); // { worker, empType } or null
  const [serviceRestricted, setServiceRestricted] = useState(false);
  const [securePhotos, setSecurePhotos] = useState({ profile: null, idFront: null, idBack: null, passbook: null });
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [targetSupervisor, setTargetSupervisor] = useState(null);
  const [credentials, setCredentials] = useState({ password: '' });
  const [manageTab, setManageTab] = useState('credentials');
  const [newDept, setNewDept] = useState('');

  // New Infrastructure State
  const [newCompany, setNewCompany] = useState({ name: '', code: '' });
  const [newPlant, setNewPlant] = useState({ name: '', location: '', companyId: '' });

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({ name: '', file: null });
  const [loading, setLoading] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setupWorkspaceAndFetchData(); }, []);

  // Ask for notification permission once, as soon as the dashboard loads,
  // instead of only at the moment a worker is submitted. On Android 13+ this
  // permission prompt has to be granted or nothing will ever show, no matter
  // how many times schedule() is called later.
  useEffect(() => {
    LocalNotifications.requestPermissions().catch((err) =>
      console.error('Notification permission request failed:', err)
    );
  }, []);

  useEffect(() => {
  if (!workspaceId) return;
  if (role === 'supervisor' && !supervisorData) return;
  // The push-notifications plugin has no web implementation at all — calling
  // any of its methods in a browser throws "plugin is not implemented on web"
  // instead of failing gracefully. Real push only makes sense on the native
  // Android app anyway, since a browser tab can't receive FCM pushes without
  // a completely separate Web Push + service worker setup.
  if (!Capacitor.isNativePlatform()) return;

  const registerPush = async () => {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') return;
    }
    await PushNotifications.register();
  };

  const regListener = PushNotifications.addListener('registration', async (token) => {
    await supabase.from('device_tokens').upsert(
      {
        token: token.value,
        role,
        workspace_id: workspaceId,
        plant_id: role === 'supervisor' ? supervisorData.plant_id : null,
      },
      { onConflict: 'token' }
    );
  });

  const errListener = PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error:', err);
  });

  registerPush();

  return () => {
    regListener.remove();
    errListener.remove();
  };
}, [workspaceId, role, supervisorData]);

  // Cross-device approval notifications.
  //
  // LocalNotifications only fires on the device that calls .schedule() — it
  // cannot "push" to someone else's phone. Previously the only schedule()
  // call fired on the *supervisor's own* device right after they submitted a
  // worker, which just confirms their own action and never reaches the Admin.
  // Nobody was ever notified that something needed approval, and the
  // supervisor was never told once the Admin acted on it.
  //
  // This subscribes to Supabase Realtime so that whichever role is looking
  // at this dashboard right now gets a local notification the moment a
  // relevant row changes in the database:
  //   - Admin: notified when a supervisor submits a new worker, or requests
  //     a relieve/reactivation, that needs approval.
  //   - Supervisor: notified when the Admin approves something they submitted.
  //
  // Note: this still requires the app to be open (foreground or background)
  // to receive the Realtime event — it is not a true push notification that
  // wakes a fully closed app. That would need a server-side trigger (e.g. a
  // Supabase Edge Function) pushing through Firebase Cloud Messaging via the
  // @capacitor/push-notifications plugin.
  useEffect(() => {
    if (!workspaceId) return;
    if (role === 'supervisor' && !supervisorData) return;

    // A supervisor can now have multiple accessible plants -- companies
    // (already scoped down to just what they can see, built in
    // setupWorkspaceAndFetchData) gives us every plant_id to watch. Wait
    // until that's actually loaded before subscribing to anything.
    const accessiblePlantIds = companies.flatMap(c => c.plants || []).map(p => p.id);
    if (role === 'supervisor' && accessiblePlantIds.length === 0) return;

    const notify = (title, body) => {
      LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          // Android requires a 32-bit int id (max ~2.1 billion). Date.now()
          // is a 13-digit millisecond timestamp that overflows this, which
          // silently failed every notification with error OS-PLUG-LNOT-0009.
          // Math.random() * 2147483647 always fits.
          id: Math.floor(Math.random() * 2147483647),
          schedule: { at: new Date(Date.now() + 500) },
        }],
      }).catch((err) => console.error('Notification failed to send:', err));
    };

    const channel = supabase.channel(`approvals-${workspaceId}-${role}`);

    if (role === 'admin') {
      const handlePendingChange = (payload) => {
        const isNewlyPending =
          payload.new.approval_status === 'pending' &&
          payload.old?.approval_status !== 'pending';
        if (payload.eventType === 'INSERT' && payload.new.approval_status === 'pending') {
          notify('New Approval Request', `${payload.new.name} was submitted by ${payload.new.added_by || 'a supervisor'} for approval.`);
        } else if (payload.eventType === 'UPDATE' && isNewlyPending) {
          notify('Approval Requested', `${payload.new.name}'s status change needs your approval.`);
        }
      };

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `workspace_id=eq.${workspaceId}` }, handlePendingChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'supervisors', filter: `workspace_id=eq.${workspaceId}` }, handlePendingChange);
    } else {
      const handleApprovedChange = (payload) => {
        const justApproved =
          payload.new.approval_status === 'approved' &&
          payload.old?.approval_status === 'pending';
        if (justApproved) {
          notify('Request Approved', `${payload.new.name} has been approved by the Admin.`);
        }
      };

      const plantFilter = `plant_id=in.(${accessiblePlantIds.join(',')})`;
      channel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employees', filter: plantFilter }, handleApprovedChange)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'supervisors', filter: plantFilter }, handleApprovedChange);
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, role, supervisorData, companies]);

  const setupWorkspaceAndFetchData = async () => {
    try {
      if (role === 'supervisor' && supervisorData) {
        setWorkspaceId(supervisorData.workspace_id);

        // Catches a workspace disabled AFTER this supervisor already logged
        // in and stayed logged in -- the login-time check alone only stops
        // new sign-ins, not sessions that were already active.
        const { data: wsCheck } = await supabase.from('workspaces').select('is_disabled').eq('id', supervisorData.workspace_id).maybeSingle();
        if (wsCheck?.is_disabled) {
          setServiceRestricted(true);
          return;
        }

        // A supervisor can now be granted access to multiple plants (even
        // across different companies) via supervisor_plant_access. Existing
        // supervisors who were never explicitly granted anything there fall
        // back to just their original single plant, so nobody who was
        // already working gets locked out by this change.
        const { data: accessRows } = await supabase
          .from('supervisor_plant_access')
          .select('plant_id, plants(*, companies(*))')
          .eq('supervisor_id', supervisorData.id);

        let accessiblePlants = (accessRows || []).map(r => r.plants).filter(Boolean);

        if (accessiblePlants.length === 0) {
          const { data: plantData } = await supabase.from('plants').select('*, companies(*)').eq('id', supervisorData.plant_id).single();
          if (plantData) accessiblePlants = [plantData];
        }

        // Group the flat list of plants back into the same
        // { ...company, plants: [...] } shape used everywhere else in the
        // app, but scoped to only what this supervisor can actually see.
        const grouped = [];
        accessiblePlants.forEach(plant => {
          const company = plant.companies;
          if (!company) return;
          let entry = grouped.find(c => c.id === company.id);
          if (!entry) { entry = { ...company, plants: [] }; grouped.push(entry); }
          const plantOnly = { ...plant };
          delete plantOnly.companies;
          entry.plants.push(plantOnly);
        });
        setCompanies(grouped);

        const accessiblePlantIds = accessiblePlants.map(p => p.id);
        const { data: empData } = await supabase.from('employees').select('*').in('plant_id', accessiblePlantIds);
        if (empData) setEmployees(empData);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { console.error("Session Error:", sessionError.message); return; }
      if (!session?.user) return;
      
      const user = session.user;

      let { data: workspace } = await supabase.from('workspaces').select('*').eq('id', user.id).single();
      
      // Auto-heal missing or hidden workspace using UPSERT
      if (!workspace) {
        const { data: newWs, error: newWsError } = await supabase.from('workspaces').upsert([{ 
          id: user.id, 
          name: 'Main Workspace', 
          admin_name: 'Workspace Admin' 
        }], { onConflict: 'id' }).select().single();
        
        if (newWsError) {
          alert("Workspace Auto-Heal Blocked: " + newWsError.message);
          return; 
        }
        workspace = newWs;
      }

      // Same idea as the supervisor check above -- catches a workspace that
      // got disabled while this admin was already signed in. Don't sign out
      // automatically here -- that would trigger App.jsx's auth listener
      // and swap this screen away before the person can even read it. The
      // actual sign-out happens only when they tap the button below.
      if (workspace.is_disabled) {
        setServiceRestricted(true);
        return;
      }

      setWorkspaceId(workspace.id);
      setAdminProfile({ name: workspace.admin_name || 'Admin', photo: workspace.admin_profile_photo_url || null });

      const { data: companiesData } = await supabase.from('companies').select('*, plants(*)').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
      if (companiesData) setCompanies(companiesData);

      const { data: supData } = await supabase.from('supervisors').select('*, supervisor_plant_access(plant_id)').eq('workspace_id', workspace.id);
      if (supData) setSupervisors(supData);

      const { data: empData } = await supabase.from('employees').select('*').eq('workspace_id', workspace.id);
      if (empData) setEmployees(empData);

    } catch (err) { 
      console.error('Setup error:', err); 
    }
  };

  const uploadImage = async (file, prefix) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const filePath = `${workspaceId}/${prefix}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('worker_docs').upload(filePath, file);
    if (error) {
      console.error('Photo upload failed:', error);
      alert(`Photo upload failed: ${error.message}\n\nThe resource will NOT be saved with this photo. Check the worker_docs storage bucket and its policies in Supabase.`);
      return null;
    }
    return filePath;
  };

  const handleAddWorker = async (formData, profileFile, aadharFrontFile, aadharBackFile, passbookFile) => {
    let companyId = role === 'supervisor' ? supervisorData.company_id : formData.companyId;
    let plantId = role === 'supervisor' ? supervisorData.plant_id : formData.plantId;
    
    // Support the global selection from supervisor dropdowns
    if (role === 'supervisor' && formData.companyId && formData.plantId) {
      companyId = formData.companyId;
      plantId = formData.plantId;
    }

    const company = companies.find(c => c.id === companyId);
    const plant = company?.plants?.find(p => p.id === plantId);
    
    if (!company || !plant) { alert("Error: Please select a valid company and plant."); return; }

    const profileUrl = await uploadImage(profileFile, `${plant.plant_code}_profile`);
    const aadharFrontUrl = await uploadImage(aadharFrontFile, `${plant.plant_code}_aadhar_front`);
    const aadharBackUrl = await uploadImage(aadharBackFile, `${plant.plant_code}_aadhar_back`);
    // Passbook is optional -- uploadImage already returns null when passed a
    // null file, so this is safe to call unconditionally.
    const passbookUrl = await uploadImage(passbookFile, `${plant.plant_code}_passbook`);

    const workerPayload = {
      workspace_id: workspaceId, company_id: company.id, plant_id: plant.id,
      name: formData.name, father_name: formData.fatherName, phone: formData.mobile,
      dob: formData.dob, gender: formData.gender, department: formData.department,
      post: formData.designation, joining_date: formData.joiningDate, experience: formData.experience,
      previous_company: formData.previousCompany, monthly_salary: parseFloat(formData.salary),
      id_proof_type: formData.idProofType, aadhar_number: formData.aadhar,
      profile_photo_url: profileUrl, aadhar_photo_url: aadharFrontUrl, aadhar_back_photo_url: aadharBackUrl,
      passbook_photo_url: passbookUrl, is_active: true,
      esi_number: formData.esiNumber || null, uan_number: formData.uanNumber || null,
      bank_account_name: formData.bankAccountName || null, bank_name: formData.bankName || null,
      ifsc_code: formData.ifscCode || null, bank_account_number: formData.bankAccountNumber || null
    };

    if (formData.employmentType === 'Contractual') {
      workerPayload.operator_trial = formData.operatorTrial;
    }

    if (role === 'admin') {
      const pCode = plant.plant_code;
      const relevantWorkers = formData.employmentType === 'Permanent' ? supervisors : employees;
      const allCodes = relevantWorkers.filter(w => w.plant_id === plant.id).map(w => w.supervisor_code || w.employee_code).filter(Boolean);
      let maxSeq = 0;
      allCodes.forEach(code => {
        const num = parseInt(code.replace(pCode, '').replace('C', ''), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      });
      const generatedId = formData.employmentType === 'Permanent' ? `${pCode}${(maxSeq + 1).toString().padStart(4, '0')}` : `${pCode}C${(maxSeq + 1).toString().padStart(4, '0')}`;
      
      workerPayload.approval_status = 'approved';
      workerPayload.approved_at = new Date().toISOString();
      workerPayload.added_by = 'Admin';
      if (formData.employmentType === 'Permanent') workerPayload.supervisor_code = generatedId;
      else workerPayload.employee_code = generatedId;
    } else {
      workerPayload.approval_status = 'pending';
      workerPayload.added_by = supervisorData.name;
    }

    const table = formData.employmentType === 'Permanent' ? 'supervisors' : 'employees';
    const { data, error } = await supabase.from(table).insert([workerPayload]).select();
    if (error) { alert("Error adding resource: " + error.message); throw error; }
    
    if (formData.employmentType === 'Permanent') setSupervisors([...supervisors, data[0]]);
    else setEmployees([...employees, data[0]]);
    
    // Local confirmation for the supervisor that their own submission went
    // through. The Admin is notified separately by the Realtime subscription
    // above, since this device has no way to push to the Admin's phone.
    if (role === 'supervisor') {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Resource Submitted",
              body: "New employee profile has been sent to the contractor for approval.",
              // Same 32-bit id fix as the notify() helper above.
              id: Math.floor(Math.random() * 2147483647),
              schedule: { at: new Date(Date.now() + 1000) },
              sound: null,
              attachments: null,
              actionTypeId: "",
              extra: null
            }
          ]
        });
      } catch (error) {
        console.error("Notification failed to send:", error);
      }
    }

    alert("Resource successfully created!");
    setActiveTab(role === 'admin' ? 'existing' : 'create');
  };

  const handleApprove = async (workerId, type, plantId) => {
    const table = type === 'Permanent' ? 'supervisors' : 'employees';
    const relevantWorkers = type === 'Permanent' ? supervisors : employees;
    const worker = relevantWorkers.find(w => w.id === workerId);
    
    const updatePayload = { approval_status: 'approved', approved_at: new Date().toISOString() };

    if (!worker.supervisor_code && !worker.employee_code) {
      const plant = companies.flatMap(c => c.plants).find(p => p.id === plantId);
      const pCode = plant.plant_code;
      
      const allCodes = relevantWorkers.filter(w => w.plant_id === plantId).map(w => w.supervisor_code || w.employee_code).filter(Boolean);
      let maxSeq = 0;
      allCodes.forEach(code => {
        const num = parseInt(code.replace(pCode, '').replace('C', ''), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      });
      const generatedId = type === 'Permanent' ? `${pCode}${(maxSeq + 1).toString().padStart(4, '0')}` : `${pCode}C${(maxSeq + 1).toString().padStart(4, '0')}`;

      if (type === 'Permanent') updatePayload.supervisor_code = generatedId;
      else updatePayload.employee_code = generatedId;
    }

    const { data, error } = await supabase.from(table).update(updatePayload).eq('id', workerId).select();
    if (error) { alert(error.message); return; }

    if (type === 'Permanent') setSupervisors(supervisors.map(s => s.id === workerId ? data[0] : s));
    else setEmployees(employees.map(e => e.id === workerId ? data[0] : e));
  };

  const handleToggleStatus = async (workerId, type, newStatus) => {
    const table = type === 'Permanent' ? 'supervisors' : 'employees';
    const updatePayload = { is_active: newStatus };

    if (role === 'supervisor') {
      updatePayload.approval_status = 'pending';
    }

    const { data } = await supabase.from(table).update(updatePayload).eq('id', workerId).select();
    if (data) {
      if (type === 'Permanent') setSupervisors(supervisors.map(s => s.id === workerId ? data[0] : s));
      else setEmployees(employees.map(e => e.id === workerId ? data[0] : e));

      if (role === 'supervisor') {
        alert(`Request to ${newStatus ? 'reactivate' : 'relieve'} this worker has been sent to the Admin for approval.`);
      }
    }
  };

  const handleHardDelete = async (worker, type) => {
    if (!window.confirm("WARNING: This will permanently delete this record from the database. Continue?")) return;
    const table = type === 'Permanent' ? 'supervisors' : 'employees';
    const workerId = worker.id;

    // Clean up storage FIRST. If this were done after the row delete and
    // failed partway, we'd have no record left to retry from -- doing it
    // first means a storage failure just leaves the row intact for another
    // attempt, rather than silently leaking files forever (which is exactly
    // what was happening before this fix).
    const filePaths = [
      worker.profile_photo_url,
      worker.aadhar_photo_url,
      worker.aadhar_back_photo_url,
      worker.passbook_photo_url,
    ].filter(Boolean);

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('worker_docs').remove(filePaths);
      if (storageError) {
        alert(`Could not delete this worker's files from storage: ${storageError.message}\n\nThe record was NOT deleted, so you can try again.`);
        return;
      }
    }

    const { error } = await supabase.from(table).delete().eq('id', workerId);
    if (error) { alert("Delete failed: " + error.message); return; }
    
    if (type === 'Permanent') setSupervisors(supervisors.filter(s => s.id !== workerId));
    else setEmployees(employees.filter(e => e.id !== workerId));
  };

  // Lets an admin change any field on an existing worker, including moving
  // them to a different company/plant, at any time -- not just at creation.
  const handleSaveWorkerEdit = async (worker, type, formData, newPhotos) => {
    const table = type === 'Permanent' ? 'supervisors' : 'employees';
    const company = companies.find(c => c.id === formData.companyId);
    const plant = company?.plants?.find(p => p.id === formData.plantId);
    if (!company || !plant) throw new Error('Please select a valid company and plant.');

    // Only touch storage for slots where a new photo was actually picked --
    // everything else keeps its existing file untouched. When a slot IS
    // replaced, the old file is deleted afterwards so it doesn't become
    // another orphan sitting in storage forever.
    const photoColumnMap = {
      profile: 'profile_photo_url',
      idFront: 'aadhar_photo_url',
      idBack: 'aadhar_back_photo_url',
      passbook: 'passbook_photo_url',
    };
    const photoUpdates = {};
    const oldPathsToDelete = [];

    for (const [key, column] of Object.entries(photoColumnMap)) {
      const newFile = newPhotos[key];
      if (!newFile) continue;
      const newPath = await uploadImage(newFile, `${plant.plant_code}_${key}`);
      if (newPath) {
        photoUpdates[column] = newPath;
        if (worker[column] && worker[column] !== newPath) oldPathsToDelete.push(worker[column]);
      }
    }

    const updatePayload = {
      company_id: company.id, plant_id: plant.id,
      name: formData.name, father_name: formData.fatherName, phone: formData.mobile,
      dob: formData.dob, gender: formData.gender, department: formData.department,
      post: formData.designation, joining_date: formData.joiningDate, experience: formData.experience,
      previous_company: formData.previousCompany, monthly_salary: parseFloat(formData.salary) || 0,
      id_proof_type: formData.idProofType, aadhar_number: formData.aadhar,
      esi_number: formData.esiNumber || null, uan_number: formData.uanNumber || null,
      bank_account_name: formData.bankAccountName || null, bank_name: formData.bankName || null,
      ifsc_code: formData.ifscCode || null, bank_account_number: formData.bankAccountNumber || null,
      ...photoUpdates,
    };

    const { data, error } = await supabase.from(table).update(updatePayload).eq('id', worker.id).select();
    if (error) throw error;

    if (oldPathsToDelete.length > 0) {
      const { error: cleanupError } = await supabase.storage.from('worker_docs').remove(oldPathsToDelete);
      if (cleanupError) console.error('Old photo cleanup failed (non-fatal):', cleanupError);
    }

    const updated = data[0];
    if (type === 'Permanent') setSupervisors(supervisors.map(s => s.id === worker.id ? { ...s, ...updated } : s));
    else setEmployees(employees.map(e => e.id === worker.id ? { ...e, ...updated } : e));
  };

  const handleDeleteCompany = async (company) => {
    if (company.plants && company.plants.length > 0) {
      alert(`Can't delete "${company.company_name}" — it still has ${company.plants.length} plant unit(s) under it. Delete those first.`);
      return;
    }
    if (!confirm(`Delete "${company.company_name}"? This cannot be undone.`)) return;

    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) { alert('Error deleting company: ' + error.message); return; }
    setCompanies(companies.filter(c => c.id !== company.id));
  };

  const handleDeletePlant = async (company, plant) => {
    // Refuse to delete a plant that still has employees or supervisors
    // assigned to it -- otherwise their plant_id would point at nothing.
    const [{ count: empCount }, { count: supCount }] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('plant_id', plant.id),
      supabase.from('supervisors').select('id', { count: 'exact', head: true }).eq('plant_id', plant.id),
    ]);
    if ((empCount || 0) + (supCount || 0) > 0) {
      alert(`Can't delete "${plant.plant_name}" — it still has ${empCount || 0} employee(s) and ${supCount || 0} supervisor(s) assigned to it.`);
      return;
    }
    if (!confirm(`Delete plant "${plant.plant_name}"? This cannot be undone.`)) return;

    const { error } = await supabase.from('plants').delete().eq('id', plant.id);
    if (error) { alert('Error deleting plant: ' + error.message); return; }
    setCompanies(companies.map(c => c.id === company.id ? { ...c, plants: c.plants.filter(p => p.id !== plant.id) } : c));
  };

  const handleAddCompany = async (e) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.from('companies').insert([{ 
      workspace_id: workspaceId, company_name: newCompany.name, company_code: newCompany.code 
    }]).select('*, plants(*)');
    
    if (error) alert('Error saving company: ' + error.message);
    else if (data) { 
      setCompanies([data[0], ...companies]); 
      setNewCompany({ name: '', code: '' }); 
      alert("Company successfully added!");
    }
    setLoading(false);
  };

  const handleAddPlant = async (e) => {
    e.preventDefault(); setLoading(true);
    const company = companies.find(c => c.id === newPlant.companyId);
    if (!company) { setLoading(false); alert("Invalid company selected."); return; }
    
    const nextPlantNumber = (company.plants?.length || 0) + 1;
    const generatedPlantCode = `${company.company_code}${nextPlantNumber}`;
    
    const { data, error } = await supabase.from('plants').insert([{ 
      workspace_id: workspaceId, company_id: company.id, plant_name: newPlant.name, 
      location: newPlant.location, plant_code: generatedPlantCode 
    }]).select();
    
    if (error) alert('Error saving plant: ' + error.message);
    else if (data) {
      const updatedCompanies = companies.map(c => c.id === company.id ? { ...c, plants: [...(c.plants || []), data[0]] } : c);
      setCompanies(updatedCompanies); 
      setNewPlant({ name: '', location: '', companyId: '' });
      alert("Plant unit successfully added!");
    }
    setLoading(false);
  };

  const updateComplianceData = async () => {
    const table = viewingWorker.type === 'Permanent' ? 'supervisors' : 'employees';
    const { error } = await supabase
      .from(table)
      .update({ uan_number: viewingWorker.uan_number, esi_number: viewingWorker.esi_number })
      .eq('id', viewingWorker.id);
      
    if (error) alert("Error saving compliance data: " + error.message);
    else {
      alert("Compliance data saved successfully!");
      if (viewingWorker.type === 'Permanent') {
         setSupervisors(supervisors.map(s => s.id === viewingWorker.id ? {...s, uan_number: viewingWorker.uan_number, esi_number: viewingWorker.esi_number} : s));
      } else {
         setEmployees(employees.map(e => e.id === viewingWorker.id ? {...e, uan_number: viewingWorker.uan_number, esi_number: viewingWorker.esi_number} : e));
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      let photoUrl = role === 'admin' ? adminProfile.photo : supervisorData.profile_photo_url;
      if (profileForm.file) {
        const newPhotoPath = await uploadImage(profileForm.file, `avatar`);
        if (newPhotoPath) photoUrl = newPhotoPath;
      }
      if (role === 'admin') {
        const { data, error } = await supabase.from('workspaces').update({ admin_name: profileForm.name, admin_profile_photo_url: photoUrl }).eq('id', workspaceId).select();
        if (error) throw error;
        if (data && data.length > 0) setAdminProfile({ name: data[0].admin_name, photo: data[0].admin_profile_photo_url });
        alert("Profile updated successfully!");
      } else {
        const { error } = await supabase.from('supervisors').update({ name: profileForm.name, profile_photo_url: photoUrl }).eq('id', supervisorData.id);
        if (error) throw error;
        alert("Profile updated! Please log out and back in to see changes.");
      }
      setShowProfileModal(false);
    } catch (err) { alert("Error updating profile: " + err.message); } finally { setLoading(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) { alert("Passwords do not match!"); return; }
    setLoading(true);
    if (role === 'admin') {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) alert("Error updating password: " + error.message);
      else { alert("Password updated successfully!"); setShowPasswordModal(false); }
    } else {
      const { error } = await supabase.from('supervisors').update({ password: passwordForm.newPassword }).eq('id', supervisorData.id);
      if (error) alert("Error updating password: " + error.message);
      else { alert("Password updated successfully!"); setShowPasswordModal(false); }
    }
    setPasswordForm({ newPassword: '', confirm: '' }); setLoading(false);
  };

  const handleLogoutClick = async () => {
    try {
      if (role === 'admin') {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem('optistaff_supervisor');
      }
      if (onLogout) onLogout();
      window.location.href = '/'; 
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleViewProfile = async (worker, type) => {
    setViewingWorker({ ...worker, type });
    setIsLoadingPhotos(true);
    setSecurePhotos({ profile: null, idFront: null, idBack: null, passbook: null });

    try {
      let pUrl = null;
      let idFrontUrl = null;
      let idBackUrl = null;
      let passbookUrl = null;

      if (worker.profile_photo_url) {
        const { data } = await supabase.storage.from('worker_docs').createSignedUrl(worker.profile_photo_url, 3600);
        pUrl = data?.signedUrl;
      }
      
      if (worker.aadhar_photo_url) {
        const { data } = await supabase.storage.from('worker_docs').createSignedUrl(worker.aadhar_photo_url, 3600);
        idFrontUrl = data?.signedUrl;
      }

      if (worker.aadhar_back_photo_url) {
        const { data } = await supabase.storage.from('worker_docs').createSignedUrl(worker.aadhar_back_photo_url, 3600);
        idBackUrl = data?.signedUrl;
      }

      // Passbook is optional -- a worker may simply not have one, which is
      // a normal state, not an error, so it's handled the same way as the
      // required photos (falls back to 'not_found' -> hidden card below).
      if (worker.passbook_photo_url) {
        const { data } = await supabase.storage.from('worker_docs').createSignedUrl(worker.passbook_photo_url, 3600);
        passbookUrl = data?.signedUrl;
      }

      setSecurePhotos({ 
        profile: pUrl || 'not_found', 
        idFront: idFrontUrl || 'not_found',
        idBack: idBackUrl || 'not_found',
        passbook: passbookUrl || 'not_found',
      });
    } catch (error) {
      console.error("Image fetch error:", error);
      setSecurePhotos({ profile: 'not_found', idFront: 'not_found', idBack: 'not_found', passbook: 'not_found' });
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  // Downloads an image to the user's device regardless of the image's
  // origin -- a plain <a download> tag gets silently ignored by most
  // browsers for cross-origin URLs like these signed Supabase links, so we
  // fetch the bytes ourselves and trigger the download from a local blob.
  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.from('supervisors').update({ username: targetSupervisor.supervisor_code.toLowerCase(), password: credentials.password }).eq('id', targetSupervisor.id).select();
    if (!error && data) {
      // .update().select() only returns this table's own columns, not the
      // nested supervisor_plant_access relation -- carry it over manually
      // so the Access tab doesn't appear to lose its data.
      const merged = { ...data[0], supervisor_plant_access: targetSupervisor.supervisor_plant_access };
      setSupervisors(supervisors.map(s => s.id === targetSupervisor.id ? merged : s));
      setShowCredentialsModal(false); setTargetSupervisor(null); setCredentials({ password: '' });
    }
    setLoading(false);
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    const updatedDepts = [...(targetSupervisor.allowed_departments || []), newDept.trim()];
    const { data } = await supabase.from('supervisors').update({ allowed_departments: updatedDepts }).eq('id', targetSupervisor.id).select();
    if (data) {
      const merged = { ...data[0], supervisor_plant_access: targetSupervisor.supervisor_plant_access };
      setSupervisors(supervisors.map(s => s.id === targetSupervisor.id ? merged : s));
      setTargetSupervisor(merged); setNewDept('');
    }
  };

  const handleRemoveDepartment = async (deptToRemove) => {
    const updatedDepts = targetSupervisor.allowed_departments.filter(d => d !== deptToRemove);
    const { data } = await supabase.from('supervisors').update({ allowed_departments: updatedDepts }).eq('id', targetSupervisor.id).select();
    if (data) {
      const merged = { ...data[0], supervisor_plant_access: targetSupervisor.supervisor_plant_access };
      setSupervisors(supervisors.map(s => s.id === targetSupervisor.id ? merged : s));
      setTargetSupervisor(merged);
    }
  };

  // Grants or revokes a supervisor's access to a specific plant. Unlike the
  // department list (a plain array column on supervisors), plant access
  // lives in its own join table so a supervisor can belong to plants across
  // multiple different companies at once.
  const handleToggleSupervisorAccess = async (plantId, isCurrentlyGranted) => {
    if (isCurrentlyGranted) {
      const { error } = await supabase.from('supervisor_plant_access').delete().eq('supervisor_id', targetSupervisor.id).eq('plant_id', plantId);
      if (error) { alert('Error updating access: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('supervisor_plant_access').insert([{ supervisor_id: targetSupervisor.id, plant_id: plantId }]);
      if (error) { alert('Error updating access: ' + error.message); return; }
    }

    const updatedAccess = isCurrentlyGranted
      ? (targetSupervisor.supervisor_plant_access || []).filter(a => a.plant_id !== plantId)
      : [...(targetSupervisor.supervisor_plant_access || []), { plant_id: plantId }];

    const updatedSupervisor = { ...targetSupervisor, supervisor_plant_access: updatedAccess };
    setTargetSupervisor(updatedSupervisor);
    setSupervisors(supervisors.map(s => s.id === targetSupervisor.id ? updatedSupervisor : s));
  };

  const headerDetails = {
    dashboard: { title: 'Dashboard', sub: 'Network-wide overview' },
    existing: { title: 'Existing', sub: 'Permanent and contractual roster' },
    pending: { title: 'Pending approvals', sub: 'Verify documents before activation' },
    relieved: { title: 'Relieved', sub: 'Deactivated workers, ready to reactivate' },
    create: { title: 'Create resource', sub: 'Onboard a new worker' },
    infrastructure: { title: 'Add Company/Plant', sub: 'Configure network facilities' },
    manage: { title: 'Manage access', sub: 'Generate and configure supervisor logic' }
  };
  const currentHeader = headerDetails[activeTab] || headerDetails.dashboard;
  const userName = role === 'admin' ? adminProfile.name : supervisorData?.name;
  const userInitials = userName ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'OS';
  const displayPhoto = role === 'admin' ? adminProfile.photo : supervisorData?.profile_photo_url;
  const [headerPhotoUrl, setHeaderPhotoUrl] = useState(null);

  // displayPhoto is just the raw storage path (e.g. "workspaceId/avatar_123.jpg"),
  // not a usable URL — worker_docs is a private bucket, so it has to be exchanged
  // for a temporary signed URL before it can be used as an <img src>.
  useEffect(() => {
    if (!displayPhoto) { setHeaderPhotoUrl(null); return; }
    let cancelled = false;
    supabase.storage.from('worker_docs').createSignedUrl(displayPhoto, 3600).then(({ data, error }) => {
      if (error) { console.error('Failed to load profile photo:', error); return; }
      if (!cancelled) setHeaderPhotoUrl(data?.signedUrl || null);
    });
    return () => { cancelled = true; };
  }, [displayPhoto]);

  if (serviceRestricted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-950 border border-red-900 rounded-full flex items-center justify-center mx-auto mb-5">
            <Shield size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">Your Plan Has Expired</h2>
          <p className="text-slate-400 text-sm font-medium mb-6">
            Your data is safe for the next 15 days. Please renew your subscription before then to continue using OptiStaff — after 15 days, your data will be permanently deleted.
          </p>
          <button
            onClick={onLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      <Sidebar role={role} activeTab={activeTab} setActiveTab={setActiveTab} isMobileOpen={isSidebarMobileOpen} setIsMobileOpen={setIsSidebarMobileOpen} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        <div className="px-5 md:px-10 py-4 md:py-6 flex justify-between items-center border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
          
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarMobileOpen(true)} className="md:hidden p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg shadow-sm hover:bg-slate-100 transition-colors">
              <Menu size={20} />
            </button>
            
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">{currentHeader.title}</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-medium hidden sm:block">{currentHeader.sub}</p>
            </div>
          </div>
          
          <div className="relative" ref={menuRef}>
            <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-slate-50 p-1.5 md:p-2 rounded-xl border border-transparent hover:border-slate-200 transition-all">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs md:text-sm overflow-hidden shadow-sm shrink-0">
                {headerPhotoUrl ? <img src={headerPhotoUrl} alt="Profile" className="w-full h-full object-cover" /> : userInitials}
              </div>
              <span className="text-slate-700 font-bold text-sm hidden md:block">{userName}</span>
            </div>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-200/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{userName}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{role === 'admin' ? 'Workspace Admin' : 'Plant Supervisor'}</p>
                </div>
                <div className="py-2">
                  <button onClick={() => { setProfileForm({ name: userName, file: null }); setShowProfileModal(true); setIsProfileMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-semibold flex items-center gap-3 transition-colors"><User size={16} /> Edit Profile</button>
                  <button onClick={() => { setShowPasswordModal(true); setIsProfileMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-semibold flex items-center gap-3 transition-colors"><Shield size={16} /> Update Password</button>
                  {role === 'admin' && <button onClick={() => { setShowSubModal(true); setIsProfileMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 font-semibold flex items-center gap-3 transition-colors"><CreditCard size={16} /> Subscription details</button>}
                </div>
                <div className="border-t border-slate-100 py-2">
                  <button onClick={handleLogoutClick} className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-3 transition-colors"><LogOut size={16} /> Log out</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-10 overflow-y-auto flex-1 relative bg-slate-50">
          {activeTab === 'dashboard' && role === 'admin' && <AdminOverview companies={companies} supervisors={supervisors} employees={employees} />}

          {['existing', 'relieved', 'pending'].includes(activeTab) && (
            <ResourceTable activeTab={activeTab} role={role} companies={companies} supervisors={supervisors} employees={employees} onToggleStatus={handleToggleStatus} onApprove={handleApprove} onViewProfile={handleViewProfile} onHardDelete={handleHardDelete} onEditWorker={(worker, empType) => setEditingWorker({ worker, empType })} />
          )}

          {activeTab === 'create' && <CreateResource role={role} companies={companies} supervisorData={supervisorData} onAddWorker={handleAddWorker} />}

          {activeTab === 'infrastructure' && role === 'admin' && (
            <AddInfrastructure 
              companies={companies}
              newCompany={newCompany} setNewCompany={setNewCompany} handleAddCompany={handleAddCompany}
              newPlant={newPlant} setNewPlant={setNewPlant} handleAddPlant={handleAddPlant}
              handleDeleteCompany={handleDeleteCompany} handleDeletePlant={handleDeletePlant}
              loading={loading}
            />
          )}

          {activeTab === 'manage' && role === 'admin' && (
            <div className="max-w-4xl space-y-4 animate-in fade-in duration-300">
              {supervisors.filter(s => s.is_active && s.approval_status === 'approved').map(sup => {
                const plant = companies.flatMap(c => c.plants || []).find(p => p.id === sup.plant_id);
                return (
                  <div key={sup.id} className="bg-white border border-slate-200 shadow-sm p-4 md:p-6 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-blue-300 transition-all">
                    <div>
                      <h4 className="text-slate-900 font-extrabold text-lg flex items-center gap-3">
                        {sup.name} 
                        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">{sup.supervisor_code}</span>
                      </h4>
                      <p className="text-slate-500 font-medium text-sm mt-1.5">{plant?.plant_name} · {sup.allowed_departments?.length || 0} Departments Assigned</p>
                    </div>
                    <button onClick={() => { setTargetSupervisor(sup); setManageTab('credentials'); setShowCredentialsModal(true); }} className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:bg-white hover:border-blue-300 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
                      <Key size={16} /> Configure Logic
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MODALS */}
        {showProfileModal && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-extrabold text-slate-900">Edit Profile</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-md border border-slate-200 shadow-sm"><X size={18} /></button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Display Name</label>
                  <input type="text" required value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm" />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Profile Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      {profileForm.file ? <img src={URL.createObjectURL(profileForm.file)} className="w-full h-full object-cover"/> : <Camera size={20} className="text-slate-400" />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => setProfileForm({ ...profileForm, file: e.target.files[0] })} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm mt-2 transition-colors shadow-md shadow-blue-600/20">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {showPasswordModal && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-extrabold text-slate-900">Set a new password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-md border border-slate-200 shadow-sm"><X size={18} /></button>
              </div>
              <form onSubmit={handleUpdatePassword} className="p-6 space-y-5">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">New Password</label>
                  <input type="password" required value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm" />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Confirm new password</label>
                  <input type="password" required value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm mt-4 transition-colors shadow-md shadow-blue-600/20">
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {showSubModal && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
              <CreditCard size={48} className="mx-auto text-blue-600 mb-5" />
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Free Tier (Beta)</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">Your workspace is currently running on the free development tier. Billing details will be available upon launch.</p>
              <button onClick={() => setShowSubModal(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm transition-colors border border-slate-200 shadow-sm">Close</button>
            </div>
          </div>
        )}

        {showCredentialsModal && targetSupervisor && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-extrabold text-slate-900">Configure Supervisor</h3>
                <button onClick={() => { setShowCredentialsModal(false); setTargetSupervisor(null); }} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-md border border-slate-200 shadow-sm"><X size={18} /></button>
              </div>
              <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2">
                <button onClick={() => setManageTab('credentials')} className={`flex-1 py-3 text-sm font-bold transition-all rounded-t-xl ${manageTab === 'credentials' ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Logins</button>
                <button onClick={() => setManageTab('departments')} className={`flex-1 py-3 text-sm font-bold transition-all rounded-t-xl ${manageTab === 'departments' ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Departments</button>
                <button onClick={() => setManageTab('access')} className={`flex-1 py-3 text-sm font-bold transition-all rounded-t-xl ${manageTab === 'access' ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Companies</button>
              </div>

              {manageTab === 'credentials' && (
                <form onSubmit={handleSaveCredentials} className="p-6 space-y-6">
                  <p className="text-sm font-medium text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-lg">Provide these credentials securely to the supervisor to access the portal.</p>
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Supervisor Username (Auto-Mapped to ID)</label>
                    <input type="text" disabled value={targetSupervisor.supervisor_code} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 focus:outline-none text-sm font-mono font-bold shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Temporary Password</label>
                    <input type="text" required value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm shadow-sm" placeholder="Enter temp password" />
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button type="button" onClick={() => setShowCredentialsModal(false)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-md shadow-blue-600/20">{loading ? 'Saving...' : 'Save Keys'}</button>
                  </div>
                </form>
              )}

              {manageTab === 'departments' && (
                <div className="p-6">
                  <p className="text-sm font-medium text-slate-500 mb-5">Define which departments this supervisor is allowed to add workers into.</p>
                  <form onSubmit={handleAddDepartment} className="flex gap-3 mb-6">
                    <input type="text" value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="e.g. Paint Shop" className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600 text-sm shadow-sm" />
                    <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md shadow-slate-800/20">Add</button>
                  </form>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {targetSupervisor.allowed_departments?.length > 0 ? targetSupervisor.allowed_departments.map(dept => (
                      <div key={dept} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm">
                        <span className="text-sm text-slate-800 font-bold">{dept}</span>
                        <button onClick={() => handleRemoveDepartment(dept)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    )) : <p className="text-sm font-medium text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">No departments assigned yet.</p>}
                  </div>
                </div>
              )}

              {manageTab === 'access' && (
                <div className="p-6">
                  <p className="text-sm font-medium text-slate-500 mb-5">Choose which companies and plant units this supervisor is allowed to add employees into. They can be given access to more than one.</p>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {companies.length === 0 && <p className="text-sm font-medium text-slate-400 italic text-center py-4">No companies added yet.</p>}
                    {companies.map(company => (
                      <div key={company.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2.5 font-bold text-sm text-slate-700">{company.company_name}</div>
                        <div className="divide-y divide-slate-100">
                          {(company.plants || []).map(plant => {
                            const isGranted = (targetSupervisor.supervisor_plant_access || []).some(a => a.plant_id === plant.id);
                            return (
                              <label key={plant.id} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                                <span className="text-sm font-semibold text-slate-700">{plant.plant_name} <span className="text-slate-400 font-medium">· {plant.location}</span></span>
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  onChange={() => handleToggleSupervisorAccess(plant.id, isGranted)}
                                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </label>
                            );
                          })}
                          {(company.plants || []).length === 0 && <p className="px-4 py-3 text-xs text-slate-400 italic">No plants under this company yet.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewingWorker && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Resource Profile</h3>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Added by: <span className="text-blue-600 font-bold">{viewingWorker.added_by || 'Unknown'}</span></p>
                </div>
                <button onClick={() => { setViewingWorker(null); setSecurePhotos({profile:null, idFront:null, idBack:null, passbook:null}); }} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-sm transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto p-8 flex flex-col md:flex-row gap-10">
                <div className="w-full md:w-1/3 flex flex-col gap-6 shrink-0">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Profile Photo</p>
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                      {isLoadingPhotos ? (
                        <span className="text-slate-400 font-medium text-sm animate-pulse">Loading secure image...</span>
                      ) : securePhotos.profile && securePhotos.profile !== 'not_found' ? (
                        <img src={securePhotos.profile} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-red-400 font-medium text-sm text-center px-4">Image not found.<br/>Upload failed or missing.</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aadhaar - Front</p>
                      {securePhotos.idFront && securePhotos.idFront !== 'not_found' && (
                        <button onClick={() => downloadImage(securePhotos.idFront, `${viewingWorker.name}_aadhar_front.jpg`)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                          <Download size={13} /> Download
                        </button>
                      )}
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                      {isLoadingPhotos ? (
                        <span className="text-slate-400 font-medium text-sm animate-pulse">Loading secure image...</span>
                      ) : securePhotos.idFront && securePhotos.idFront !== 'not_found' ? (
                        <img src={securePhotos.idFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-red-400 font-medium text-sm text-center px-4">Image not found.<br/>Upload failed or missing.</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aadhaar - Back</p>
                      {securePhotos.idBack && securePhotos.idBack !== 'not_found' && (
                        <button onClick={() => downloadImage(securePhotos.idBack, `${viewingWorker.name}_aadhar_back.jpg`)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                          <Download size={13} /> Download
                        </button>
                      )}
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                      {isLoadingPhotos ? (
                        <span className="text-slate-400 font-medium text-sm animate-pulse">Loading secure image...</span>
                      ) : securePhotos.idBack && securePhotos.idBack !== 'not_found' ? (
                        <img src={securePhotos.idBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-red-400 font-medium text-sm text-center px-4">Image not found.<br/>Upload failed or missing.</span>
                      )}
                    </div>
                  </div>
                  {!isLoadingPhotos && securePhotos.passbook && securePhotos.passbook !== 'not_found' && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passbook</p>
                        <button onClick={() => downloadImage(securePhotos.passbook, `${viewingWorker.name}_passbook.jpg`)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                          <Download size={13} /> Download
                        </button>
                      </div>
                      <div className="aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                        <img src={securePhotos.passbook} alt="Passbook" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full md:w-2/3">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-sm">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{viewingWorker.name}</h2>
                      <p className="text-blue-600 font-mono font-extrabold text-lg mt-1">{viewingWorker.supervisor_code || viewingWorker.employee_code || 'Unassigned ID'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm ${viewingWorker.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {viewingWorker.is_active ? 'Active' : 'Relieved'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Father's / Husband Name</p><p className="text-slate-800 font-bold text-base">{viewingWorker.father_name || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Mobile Number</p><p className="text-slate-800 font-bold text-base">{viewingWorker.phone || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Date of Birth</p><p className="text-slate-800 font-bold text-base">{viewingWorker.dob || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Gender</p><p className="text-slate-800 font-bold text-base">{viewingWorker.gender || '-'}</p></div>
                    
                    <div className="col-span-2 my-2 border-t border-slate-100"></div>
                    
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Department</p><p className="text-slate-800 font-bold text-base">{viewingWorker.department || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Designation</p><p className="text-slate-800 font-bold text-base">{viewingWorker.post || viewingWorker.designation || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Monthly Salary</p><p className="text-emerald-600 font-extrabold text-base">₹{(viewingWorker.monthly_salary || 0).toLocaleString()}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Joining Date</p><p className="text-slate-800 font-bold text-base">{viewingWorker.joining_date || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Experience</p><p className="text-slate-800 font-bold text-base">{viewingWorker.experience || '-'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Previous Company</p><p className="text-slate-800 font-bold text-base">{viewingWorker.previous_company || '-'}</p></div>
                    
                    <div className="col-span-2 my-2 border-t border-slate-100"></div>

                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">ID Proof Type</p><p className="text-slate-800 font-bold text-base">{viewingWorker.id_proof_type || 'Aadhaar'}</p></div>
                    <div><p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">ID Number</p><p className="text-slate-800 font-bold text-base">{viewingWorker.aadhar_number || '-'}</p></div>
                    
                    {viewingWorker.type === 'Contractual' && (
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1.5">Operator Trial</p>
                        <p className="text-slate-800 font-bold text-base flex items-center gap-2">{viewingWorker.operator_trial ? <span className="text-emerald-500">✅ Done</span> : <span className="text-amber-500">❌ Pending</span>}</p>
                      </div>
                    )}
                    
                    {/* Compliance Information Block - Added Here */}
                    <div className="col-span-2 mt-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex justify-between items-center">
                        Compliance Information
                        {role === 'admin' && (
                          <button onClick={updateComplianceData} className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors font-bold">
                            Save Changes
                          </button>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2 block">PF / UAN Number</label>
                          {role === 'admin' ? (
                            <input type="text" value={viewingWorker.uan_number || ''} onChange={(e) => setViewingWorker({...viewingWorker, uan_number: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 100XXXXXXX" />
                          ) : (
                            <p className="text-slate-800 font-bold text-base">{viewingWorker.uan_number || 'Pending'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2 block">ESI Number</label>
                          {role === 'admin' ? (
                            <input type="text" value={viewingWorker.esi_number || ''} onChange={(e) => setViewingWorker({...viewingWorker, esi_number: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 11XXXXXXX" />
                          ) : (
                            <p className="text-slate-800 font-bold text-base">{viewingWorker.esi_number || 'Pending'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingWorker && (
          <EditResource
            worker={editingWorker.worker}
            empType={editingWorker.empType}
            companies={companies}
            onSave={handleSaveWorkerEdit}
            onClose={() => setEditingWorker(null)}
          />
        )}
      </main>
    </div>
  );
}