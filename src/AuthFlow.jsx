import { useState } from 'react';
import { supabase } from './supabaseClient';
import { 
  Building2, Factory, ArrowRight, CheckCircle2, 
  ShieldCheck, ChevronLeft, Users, BarChart3, X
} from 'lucide-react';

export default function AuthFlow({ onSupervisorLogin }) {
  const [step, setStep] = useState('login'); 
  const [userType, setUserType] = useState(''); 
  
  // Login States
  const [loginView, setLoginView] = useState('admin'); // 'admin' or 'supervisor'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [supUser, setSupUser] = useState('');
  const [supPass, setSupPass] = useState('');

  const [formData, setFormData] = useState({
    companyName: '', gst: '', adminName: '', mobile: '', email: '', username: '', password: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Handle Admin Login (Supabase Auth)
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail, password: loginPassword,
    });
    if (error) setErrorMsg(error.message);
    setLoading(false);
  };

  // 2. Handle Supervisor Login (Custom DB Check)
  const handleSupervisorLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMsg('');

    const { data, error } = await supabase.rpc('login_supervisor', {
      p_username: supUser.toLowerCase(),
      p_password: supPass
    });

    if (error) {
      setErrorMsg(error.message);
    } else if (!data) {
      setErrorMsg('Invalid Supervisor Username or Password. Please contact your administrator.');
    } else {
      onSupervisorLogin(data);
    }
    setLoading(false);
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault(); setStep('subscription');
  };

  const completeOnboarding = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email, password: formData.password,
      });
      if (authError) throw authError;

      if (authData.user) {
        const { error: workspaceError } = await supabase
          .from('workspaces')
          .insert([{ id: authData.user.id, name: formData.companyName, type: userType }]);
        if (workspaceError) throw workspaceError;
      }
    } catch (err) {
      setErrorMsg(err.message); setStep('signup'); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      
      {/* LEFT SIDE: Branding Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-48 -right-24 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-24 left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-indigo-400 mb-12">
            <ShieldCheck size={40} className="text-white" />
            <span className="text-2xl font-black tracking-tight text-white">OptiStaff</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">Industrial Workforce & Compliance Security.</h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-md">Stop ghost employee salary leaks, manage multi-plant rosters, and stay 100% compliant with enterprise-grade data privacy.</p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="bg-indigo-500/30 p-3 rounded-xl"><BarChart3 className="text-indigo-200" size={24}/></div>
            <div><h4 className="font-bold text-white">Automated Payroll Exports</h4><p className="text-sm text-indigo-200">One-click Tally & Excel compliance.</p></div>
          </div>
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="bg-indigo-500/30 p-3 rounded-xl"><Users className="text-indigo-200" size={24}/></div>
            <div><h4 className="font-bold text-white">Duplicate ID Prevention</h4><p className="text-sm text-indigo-200">Bulletproof ID verification systems.</p></div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Forms */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative">
        <div className="w-full max-w-md">
          
          {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <div className="bg-red-100 p-1 rounded-full shrink-0"><X size={14}/></div>
              {errorMsg}
            </div>
          )}

          {/* --- STEP 1: LOGIN --- */}
          {step === 'login' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Welcome back</h2>
                
                {/* LOGIN TOGGLE */}
                <div className="flex bg-slate-200 p-1.5 rounded-xl">
                  <button onClick={() => setLoginView('admin')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginView === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Workspace Admin</button>
                  <button onClick={() => setLoginView('supervisor')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginView === 'supervisor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Plant Supervisor</button>
                </div>
              </div>
              
              {/* ADMIN FORM */}
              {loginView === 'admin' ? (
                <form className="space-y-5 animate-in fade-in" onSubmit={handleAdminLogin}>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" placeholder="admin@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                    <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" placeholder="••••••••" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 mt-4">
                    {loading ? 'Authenticating...' : 'Sign In as Admin'} <ArrowRight size={18} />
                  </button>
                </form>
              ) : (
                /* SUPERVISOR FORM */
                <form className="space-y-5 animate-in fade-in" onSubmit={handleSupervisorLoginSubmit}>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                    <p className="text-sm text-indigo-800 font-medium text-center">Use the credentials provided by your Workspace Administrator.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supervisor Username</label>
                    <input type="text" required value={supUser} onChange={(e) => setSupUser(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" placeholder="e.g. jdoe_unit1" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                    <input type="password" required value={supPass} onChange={(e) => setSupPass(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" placeholder="••••••••" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 mt-4">
                    {loading ? 'Authenticating...' : 'Access Plant Dashboard'} <ArrowRight size={18} />
                  </button>
                </form>
              )}
              
              {loginView === 'admin' && (
                <div className="mt-8 text-center border-t border-slate-200 pt-6">
                  <p className="text-slate-600">Don't have a workspace?{' '}
                    <button onClick={() => { setErrorMsg(''); setStep('split'); }} className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Create an account</button>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* --- STEP 2: SPLIT SELECTION --- */}
          {step === 'split' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <button onClick={() => setStep('login')} className="text-slate-400 hover:text-slate-800 flex items-center gap-1 text-sm font-bold mb-8 transition-colors"><ChevronLeft size={18} /> Back to Login</button>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Choose your path</h3>
              <p className="text-slate-500 mb-8">How will you be utilizing the OptiStaff platform?</p>
              
              <div className="grid grid-cols-1 gap-4">
                <div onClick={() => { setUserType('company'); setStep('signup'); }} className="cursor-pointer border-2 border-slate-200 hover:border-indigo-600 rounded-2xl p-6 transition-all hover:shadow-lg bg-white group flex items-start gap-4">
                  <div className="bg-slate-100 group-hover:bg-indigo-100 p-4 rounded-xl transition-colors"><Factory size={32} className="text-slate-500 group-hover:text-indigo-600" /></div>
                  <div><h4 className="font-bold text-slate-900 text-lg">I am a Company</h4><p className="text-sm text-slate-500 mt-1">I manage multiple industrial plants and want to onboard external contractors.</p></div>
                </div>
                
                <div onClick={() => { setUserType('contractor'); setStep('signup'); }} className="cursor-pointer border-2 border-slate-200 hover:border-indigo-600 rounded-2xl p-6 transition-all hover:shadow-lg bg-white group flex items-start gap-4">
                  <div className="bg-slate-100 group-hover:bg-indigo-100 p-4 rounded-xl transition-colors"><Building2 size={32} className="text-slate-500 group-hover:text-indigo-600" /></div>
                  <div><h4 className="font-bold text-slate-900 text-lg">I am a Contractor</h4><p className="text-sm text-slate-500 mt-1">I supply manpower and need to manage my workforce, deployments, & payroll.</p></div>
                </div>
              </div>
            </div>
          )}

          {/* --- STEP 3: REGISTRATION FORM --- */}
          {step === 'signup' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <button onClick={() => setStep('split')} className="text-slate-400 hover:text-slate-800 flex items-center gap-1 text-sm font-bold mb-6 transition-colors"><ChevronLeft size={18} /> Back</button>
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight capitalize">{userType} Registration</h3>
                <p className="text-slate-500 mt-1">Set up your master administrative account.</p>
              </div>
              
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company / Firm Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admin Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                    <input type="tel" required value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">GST Number <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none uppercase" placeholder="22AAAAA0000A1Z5"/>
                  </div>
                  
                  <div className="col-span-2 mt-4 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-indigo-600 mb-4 uppercase tracking-wider">Login Credentials</h4>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" placeholder="e.g. skengineering" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                    <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none" />
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full flex justify-center items-center bg-indigo-900 hover:bg-indigo-950 text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl">Continue to Plans</button>
                </div>
              </form>
            </div>
          )}

          {/* --- STEP 4: SUBSCRIPTION WALL --- */}
          {step === 'subscription' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <div className="text-center mb-8">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><CheckCircle2 size={40} className="text-green-600" /></div>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Account Ready!</h3>
                <p className="text-slate-500 mt-2">Select a plan to launch your enterprise workspace.</p>
              </div>

              <div className="space-y-4">
                <div onClick={completeOnboarding} className={`cursor-pointer border-2 ${loading ? 'border-slate-300 bg-slate-100 opacity-50' : 'border-indigo-600 bg-indigo-50 hover:shadow-lg'} rounded-2xl p-6 flex justify-between items-center transition-all duration-300 relative overflow-hidden group`}>
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">Active Beta</div>
                  <div>
                    <h4 className="font-bold text-indigo-900 text-xl">Free Tier</h4>
                    <p className="text-sm text-indigo-700 mt-1">Development & Testing Mode</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-indigo-900 tracking-tighter">₹0</span>
                  </div>
                </div>
                
                <div className="border border-slate-200 bg-white rounded-2xl p-6 flex justify-between items-center opacity-60 grayscale relative pointer-events-none">
                  <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">Coming Soon</div>
                  <div><h4 className="font-bold text-slate-800 text-xl">Starter Plan</h4></div>
                  <div className="text-right"><span className="text-2xl font-black text-slate-800">₹2,499</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}