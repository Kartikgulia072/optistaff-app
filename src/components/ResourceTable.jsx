import { useState } from 'react';
import { Eye, CheckCircle, RefreshCw, Power, Trash2 } from 'lucide-react';

export default function ResourceTable({ activeTab, role, companies, supervisors, employees, onToggleStatus, onApprove, onViewProfile, onHardDelete }) {
  const [empType, setEmpType] = useState('Contractual'); // Defaulting to Contractual
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 10;

  const isRelieved = activeTab === 'relieved';
  const isPending = activeTab === 'pending';
  const isActive = !isRelieved;

  const baseData = empType === 'Permanent' ? supervisors : employees;
  const filteredData = baseData.filter(w => {
    if (isPending) return w.approval_status === 'pending';
    return w.approval_status === 'approved' && w.is_active === isActive;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentData = filteredData.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const thClass = "px-5 py-4 font-bold text-slate-600 border-b border-slate-200";
  const tdClass = "px-5 py-4 font-medium text-slate-700 border-b border-slate-100";

  return (
    <div className="max-w-full animate-in fade-in duration-300">
      <div className="flex gap-3 mb-6 bg-slate-200/50 p-1.5 rounded-xl w-fit">
        
        {/* Only Admins can view Permanent workers in the table */}
        {role === 'admin' && (
          <button onClick={() => { setEmpType('Permanent'); setCurrentPage(0); }} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${empType === 'Permanent' ? 'bg-white text-blue-700 border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800 border border-transparent shadow-none'}`}>
            Permanent
          </button>
        )}
        
        <button onClick={() => { setEmpType('Contractual'); setCurrentPage(0); }} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${empType === 'Contractual' ? 'bg-white text-blue-700 border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800 border border-transparent shadow-none'}`}>
          Contractual
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xl shadow-slate-200/40">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className={thClass}>ID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Dept</th>
              <th className={thClass}>Designation</th>
              <th className={thClass}>Salary</th>
              <th className={thClass}>Joining Date</th>
              <th className={thClass}>Status / Approval</th>
              <th className={`${thClass} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {currentData.length === 0 ? (
              <tr><td colSpan="9" className="px-6 py-10 text-center text-slate-500 font-medium">No records found.</td></tr>
            ) : (
              currentData.map(worker => {
                const hasId = worker.supervisor_code || worker.employee_code;
                
                return (
                  <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} text-slate-900 font-bold`}>{hasId || <span className="text-amber-600 text-xs uppercase bg-amber-50 px-2 py-1 rounded">Unassigned</span>}</td>
                    <td className={`${tdClass} text-slate-900 font-bold`}>{worker.name}</td>
                    <td className={tdClass}>{worker.phone}</td>
                    <td className={tdClass}>{worker.department}</td>
                    <td className={tdClass}>{worker.post || worker.designation}</td>
                    <td className={`${tdClass} font-semibold text-emerald-600`}>₹{(worker.monthly_salary || 0).toLocaleString()}</td>
                    <td className={tdClass}>{formatDate(worker.joining_date)}</td>
                    <td className={tdClass}>
                      {worker.approval_status === 'approved' ? (
                        formatDate(worker.approved_at || worker.created_at)
                      ) : (
                        hasId ? (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${worker.is_active ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            Pending {worker.is_active ? 'Reactivation' : 'Relieve'}
                          </span>
                        ) : (
                          <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded">Pending New Hire</span>
                        )
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onViewProfile(worker, empType)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition-colors border border-slate-200 shadow-sm" title="View Profile">
                          <Eye size={16} />
                        </button>
                        
                        {isPending && role === 'admin' ? (
                          <button onClick={() => onApprove(worker.id, empType, worker.plant_id)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200 p-2 rounded-lg transition-colors shadow-sm" title={hasId ? 'Approve Request' : 'Approve & Generate ID'}>
                            <CheckCircle size={16} />
                          </button>
                        ) : (
                          <button onClick={() => onToggleStatus(worker.id, empType, isRelieved)} className={`${isRelieved ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'} border p-2 rounded-lg transition-colors shadow-sm`} title={isRelieved ? 'Reactivate Worker' : 'Relieve / Deactivate Worker'}>
                            {isRelieved ? <RefreshCw size={16} /> : <Power size={16} />}
                          </button>
                        )}

                        {role === 'admin' && (
                          <button onClick={() => onHardDelete(worker.id, empType)} className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 p-2 rounded-lg transition-colors shadow-sm ml-2" title="Delete Permanently">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setCurrentPage(i)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all shadow-sm ${currentPage === i ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}