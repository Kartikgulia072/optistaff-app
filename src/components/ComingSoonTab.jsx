import { Clock, FileText, FileSpreadsheet, Layers, UserSearch, ShieldAlert } from 'lucide-react';

export default function ComingSoonTab({ moduleName }) {
  // Map the module name to specific icons and descriptions
  const moduleConfig = {
    attendance: { icon: Clock, title: 'Attendance Tracking', desc: 'Real-time shift management, biometric integrations, and daily logs are currently being configured for your workspace.' },
    payroll: { icon: FileText, title: 'Payroll Engine', desc: 'Automated wage calculations, overtime multipliers, and one-click Tally exports will be available here.' },
    documents: { icon: FileSpreadsheet, title: 'Document Vault', desc: 'Secure cloud storage for compliance forms, NDAs, and factory act registers.' },
    compliances: { icon: Layers, title: 'Compliances', desc: 'Automated alerts for license renewals, safety audits, and statutory PF/ESI filings.' },
    temporary: { icon: UserSearch, title: 'Temporary Workforce', desc: 'The daily-wage and temporary contractor management module is currently under construction.' },
    default: { icon: ShieldAlert, title: 'Module Locked', desc: 'This module is currently restricted or in development.' }
  };

  const config = moduleConfig[moduleName] || moduleConfig.default;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto text-center">
      <div className="bg-slate-100 p-8 rounded-full mb-6 border-8 border-white shadow-sm">
        <Icon size={64} className="text-blue-300" />
      </div>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">{config.title}</h2>
      <p className="text-slate-500 text-lg max-w-md leading-relaxed mb-8">
        {config.desc}
      </p>
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        Development in Progress
      </div>
    </div>
  );
}