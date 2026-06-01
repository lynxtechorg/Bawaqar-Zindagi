
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Organization } from '../types';
import { Shield, UserPlus, RefreshCw, Trash2, CheckCircle, Lock, Key, AlertTriangle } from 'lucide-react';

const AdminView: React.FC = () => {
  const { users, registerUser, deleteUser, resetUserPassword, organization } = useAuth();

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>(''); // String first, cast later
  const [targetOrg, setTargetOrg] = useState<Organization>(organization || 'BWZ');
  
  const [lastCreatedUser, setLastCreatedUser] = useState<{username: string, password: string} | null>(null);
  const [resetInfo, setResetInfo] = useState<{id: string, password: string} | null>(null);
  
  // New Error State
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      
      if (!newRole) {
          setError("Please select a role");
          return;
      }
      
      const res = await registerUser(newName, newRole as UserRole, targetOrg);
      
      if (res.success && res.user) {
          setLastCreatedUser({ username: res.user.username, password: res.user.password });
          setNewName('');
          setError(null);
      } else {
          setError(res.msg || "Unknown Error");
      }
  };

  const handleReset = async (id: string) => {
      const newPass = await resetUserPassword(id);
      setResetInfo({ id, password: newPass });
      setTimeout(() => setResetInfo(null), 10000); // Clear after 10s
  };

  // Filter users: Don't show Master Admin. Sort by Org.
  const displayUsers = users.filter(u => u.role !== UserRole.ADMIN).sort((a,b) => a.organization.localeCompare(b.organization));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* White Header Box */}
      <div className="bg-white text-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold flex items-center text-slate-900"><Shield className="mr-3 text-bwz-primary"/> Master Admin Console</h1>
              <p className="text-slate-500 mt-2">Universal Identity & Access Management</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
              Session: {new Date().toLocaleTimeString()}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create User Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow border border-slate-200 h-fit">
              <h2 className="font-bold text-lg mb-6 flex items-center text-slate-800"><UserPlus className="mr-2"/> Register New Employee</h2>
              
              <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee Name</label>
                      <input 
                         required 
                         className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" 
                         placeholder="e.g. Uroosa Talib" 
                         value={newName} 
                         onChange={e => setNewName(e.target.value)} 
                      />
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organization</label>
                      <select className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={targetOrg} onChange={e => {
                          setTargetOrg(e.target.value as Organization);
                          setNewRole(''); // Reset role when org changes to prevent mismatch
                      }}>
                          <option value="BWZ">Bawaqar Zindagi (BWZ)</option>
                          <option value="COP">COP Initiative</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role / Permissions</label>
                      <select required className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900" value={newRole} onChange={e => setNewRole(e.target.value)}>
                          <option value="">-- Select Role --</option>
                          <option value={UserRole.EXECUTIVE}>Executive (Management)</option>
                          <option value={UserRole.DOCTOR}>Doctor (Clinical)</option>
                          <option value={UserRole.RECEPTIONIST}>Receptionist (Front Desk)</option>
                          <option value={UserRole.PHARMACIST}>Pharmacist (Inventory)</option>
                          
                          {/* Conditionally render based on Target Org */}
                          {targetOrg === 'BWZ' && <option value={UserRole.PRP_SPECIALIST}>PRP Specialist</option>}
                          {targetOrg === 'COP' && <option value={UserRole.OUTREACH_SPECIALIST}>Outreach Specialist</option>}
                      </select>
                  </div>

                  <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700">
                      Generate Credentials
                  </button>
              </form>

              {/* ERROR ALERT */}
              {error && (
                  <div className="mt-6 bg-red-50 border border-red-200 p-4 rounded-xl animate-fade-in text-red-700 text-sm">
                      <div className="flex items-start font-bold mb-1">
                          <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0"/> Registration Failed
                      </div>
                      <p>{error}</p>
                  </div>
              )}

              {/* SUCCESS MODAL / CARD */}
              {lastCreatedUser && (
                  <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-xl animate-fade-in">
                      <div className="flex items-center text-green-800 font-bold mb-2">
                          <CheckCircle size={16} className="mr-2"/> User Created Successfully
                      </div>
                      <div className="bg-white p-3 rounded border border-green-100 font-mono text-sm space-y-1">
                          <p><span className="text-slate-500">Username:</span> <strong className="select-all">{lastCreatedUser.username}</strong></p>
                          <p><span className="text-slate-500">Password:</span> <strong className="select-all text-red-600">{lastCreatedUser.password}</strong></p>
                      </div>
                      <p className="text-xs text-green-600 mt-2">Please copy these credentials and share them securely with the employee.</p>
                      <button onClick={() => setLastCreatedUser(null)} className="mt-3 text-xs underline text-green-700 w-full text-center">Clear</button>
                  </div>
              )}
          </div>

          {/* User List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-bold text-lg text-slate-800">Active Directory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Employee</th>
                            <th className="p-4">Org</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Login ID / Email</th>
                            <th className="p-4">Password</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayUsers.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No active employees found.</td></tr>
                        )}
                        {displayUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-700">{u.name}</td>
                                <td className="p-4 font-mono text-xs font-bold text-slate-500">{u.organization}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase border ${
                                        u.role === UserRole.EXECUTIVE ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                        u.role === UserRole.DOCTOR ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 text-xs">{u.username}</td>
                                <td className="p-4 font-mono text-slate-400 font-bold w-fit text-xs">
                                    {u.password === '(Hidden)' ? <span className="opacity-50">●●●●●●</span> : <span className="text-red-600 bg-red-50 px-1 rounded">{u.password}</span>}
                                </td>
                                <td className="p-4 text-right flex justify-end space-x-2">
                                    <button onClick={() => handleReset(u.id)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Reset Password">
                                        <RefreshCw size={16} />
                                    </button>
                                    <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete User">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
              {resetInfo && (
                  <div className="fixed bottom-10 right-10 bg-white border border-slate-300 text-slate-800 p-6 rounded-xl shadow-2xl z-50 animate-bounce-in">
                      <h4 className="font-bold flex items-center mb-2 text-bwz-primary"><Lock size={16} className="mr-2"/> Password Reset</h4>
                      <p className="text-sm opacity-80 mb-2">New password generated for ID: {resetInfo.id}</p>
                      <div className="bg-slate-50 p-3 rounded font-mono text-xl text-center text-red-600 select-all border border-slate-200">
                          {resetInfo.password}
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default AdminView;
