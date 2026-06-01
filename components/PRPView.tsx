
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { OutreachSession } from '../types';
import MHQoLAssessment from './MHQoLAssessment';
import { MapPin, Users, Heart, BookOpen, Briefcase, Tent, UserPlus, StickyNote, Copy, Layers, Calendar, AlertTriangle, Search, ClipboardList, Home, FileText, CheckCircle, Plus } from 'lucide-react';

const PRPView: React.FC = () => {
  const { addSession, locations, sessions, clients, addProgressNote } = useData();
  const { organization, copMode, currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'log' | 'schedule' | 'assessment'>('log');
  
  // Assessment Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Rehab Note State
  const [rehabNote, setRehabNote] = useState('');

  // Unified Form State
  const [formData, setFormData] = useState<{
    location: string;
    // BWZ Logic
    bwzType: string;
    newCount: number;
    followUpCount: number;
    // COP Campsite Logic
    campsiteType: string;
    domain: string;
    // COP Field Logic
    fieldActivity: string; 
    sessionFormat: string;
    pamphletsQty: number;
    // Home Visit Logic
    maleCount: number;
    femaleCount: number;
    
    // Shared
    headcount: number;
    notes: string;
    nextDate: string; // New
  }>({
    location: '',
    bwzType: 'Group Therapy',
    newCount: 0,
    followUpCount: 0,
    campsiteType: 'Group Therapy',
    domain: 'Living',
    fieldActivity: 'Awareness Session',
    sessionFormat: 'Group',
    pamphletsQty: 0,
    maleCount: 0,
    femaleCount: 0,
    headcount: 0,
    notes: '',
    nextDate: ''
  });

  const isBWZ = organization === 'BWZ';
  const isCampsite = organization === 'COP' && copMode === 'CAMPSITE';
  const isField = organization === 'COP' && copMode === 'FIELD';

  // Alerts Logic
  const upcomingSessions = sessions.filter(s => s.nextScheduledDate && new Date(s.nextScheduledDate) >= new Date());
  const missedSessions = sessions.filter(s => s.nextScheduledDate && new Date(s.nextScheduledDate) < new Date()); 

  const handleLogSession = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Location validation only for COP
    if (!isBWZ && !formData.location) return;

    let finalSession: Omit<OutreachSession, 'organization'>;

    if (isBWZ) {
       // BWZ LOGIC
       const total = Number(formData.newCount) + Number(formData.followUpCount);
       finalSession = {
         id: `S-BWZ-${Date.now()}`,
         location: 'Rehab Center', 
         date: new Date().toISOString(),
         type: formData.bwzType,
         domainFocus: formData.domain as any,
         newPatientCount: Number(formData.newCount),
         followUpPatientCount: Number(formData.followUpCount),
         participantCount: total,
         resourcesUtilized: 'Standard',
         notes: formData.notes,
         nextScheduledDate: formData.nextDate || undefined
       };
    } else {
       // COP LOGIC
       if (copMode === 'CAMPSITE') {
          finalSession = {
             id: `S-COP-C-${Date.now()}`,
             location: formData.location,
             date: new Date().toISOString(),
             copDivision: 'Campsite',
             type: formData.campsiteType,
             domainFocus: formData.domain as any,
             participantCount: Number(formData.headcount),
             resourcesUtilized: 'Standard',
             notes: formData.notes,
             nextScheduledDate: formData.nextDate || undefined
          };
       } else {
          // Field (Awareness, Pamphlet, Home Visit)
          let constructedType = formData.fieldActivity;
          let totalParticipants = 0;

          if (formData.fieldActivity === 'Home Visit') {
             totalParticipants = Number(formData.maleCount) + Number(formData.femaleCount);
          } else {
             totalParticipants = Number(formData.headcount);
             if (formData.fieldActivity === 'Awareness Session') {
                constructedType += ` (${formData.sessionFormat})`;
             }
          }

          finalSession = {
             id: `S-COP-F-${Date.now()}`,
             location: formData.location,
             date: new Date().toISOString(),
             copDivision: 'Field',
             type: constructedType,
             fieldActivityType: formData.fieldActivity as any,
             fieldSessionFormat: formData.fieldActivity === 'Awareness Session' ? (formData.sessionFormat as any) : undefined,
             genderBreakdown: formData.fieldActivity === 'Home Visit' ? { male: Number(formData.maleCount), female: Number(formData.femaleCount) } : undefined,
             pamphletsDistributed: Number(formData.pamphletsQty),
             participantCount: totalParticipants,
             resourcesUtilized: `Pamphlets: ${formData.pamphletsQty}`,
             notes: formData.notes,
             nextScheduledDate: formData.nextDate || undefined
          };
       }
    }

    addSession(finalSession);
    alert('Session Logged Successfully');
    // Reset inputs
    setFormData(prev => ({ ...prev, newCount: 0, followUpCount: 0, headcount: 0, pamphletsQty: 0, maleCount: 0, femaleCount: 0, notes: '', nextDate: '' }));
  };

  const handleAddRehabNote = () => {
    if (selectedPatientId && rehabNote.trim()) {
        addProgressNote(selectedPatientId, `[REHAB NOTE] ${rehabNote}`);
        setRehabNote('');
        alert('Rehab Progress Note Added');
    }
  };

  const filteredPatients = clients.filter(c => 
     c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.includes(searchQuery)
  );

  const selectedPatient = clients.find(c => c.id === selectedPatientId);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 h-auto min-h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] md:overflow-y-auto">
       
       <div className="flex space-x-4 mb-6">
           <button onClick={() => setActiveTab('log')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'log' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Log Session</button>
           <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'schedule' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Alerts & Schedule</button>
           <button onClick={() => setActiveTab('assessment')} className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'assessment' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>Individual Assessment</button>
       </div>

       {activeTab === 'log' && (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Stats Cards */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                <div className="bg-pink-100 p-3 rounded-full text-pink-600"><Users size={24}/></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Headcount</p>
                  <p className="text-2xl font-bold">{sessions.reduce((a,b) => a + b.participantCount, 0)}</p>
                </div>
             </div>
             {isField && (
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                   <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Home size={24}/></div>
                   <div>
                     <p className="text-xs text-slate-500 font-bold uppercase">Home Visits</p>
                     <p className="text-2xl font-bold">{sessions.filter(s => s.fieldActivityType === 'Home Visit').length}</p>
                   </div>
                 </div>
             )}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-full text-purple-600"><Briefcase size={24}/></div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Sessions Held</p>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                </div>
             </div>
          </div>

          {/* INPUT FORM */}
          <div className="md:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 p-6 h-fit order-2 md:order-1">
            <h2 className="font-bold text-xl text-slate-800 mb-6 flex items-center">
                {isBWZ ? <Heart className="mr-2 text-bwz-primary"/> : (isCampsite ? <Tent className="mr-2 text-indigo-900"/> : <MapPin className="mr-2 text-indigo-900"/>)}
                {isBWZ ? 'Rehab Session Log' : (isCampsite ? 'Campsite Log' : 'Field Log')}
            </h2>
            
            <form onSubmit={handleLogSession} className="space-y-4">
              
              {/* Location - COP Only */}
              {!isBWZ && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                    <select required className="w-full bg-white border border-slate-300 rounded p-2" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      <option value="">Select Area...</option>
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
              )}

              {/* --- BWZ FORM --- */}
              {isBWZ && (
                  <>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Therapy Type</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-2" value={formData.bwzType} onChange={e => setFormData({...formData, bwzType: e.target.value})}>
                            <option>Group Therapy</option>
                            <option>Rehab Readiness</option>
                            <option>Support Group</option>
                            <option>Family Psychoeducation</option>
                            <option>Awareness</option>
                            <option>Individual Therapy</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Rehab Domain</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {['Living', 'Learning', 'Working', 'Socializing'].map(d => (
                            <button 
                                type="button" 
                                key={d} 
                                onClick={() => setFormData({...formData, domain: d})}
                                className={`text-xs py-2 rounded font-bold ${formData.domain === d ? 'bg-bwz-primary text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}
                            >
                                {d}
                            </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">New Patients</label>
                            <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.newCount} onChange={e => setFormData({...formData, newCount: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Follow-up</label>
                            <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.followUpCount} onChange={e => setFormData({...formData, followUpCount: Number(e.target.value)})} />
                        </div>
                    </div>
                  </>
              )}

              {/* --- COP CAMPSITE FORM --- */}
              {isCampsite && (
                  <>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Activity Type</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-2" value={formData.campsiteType} onChange={e => setFormData({...formData, campsiteType: e.target.value})}>
                            <option>Group Therapy</option>
                            <option>Support Group</option>
                            <option>Family Psychoeducation</option>
                            <option>Screening</option>
                            <option>Awareness</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Rehab Domain</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {['Living', 'Learning', 'Working', 'Socializing'].map(d => (
                            <button 
                                type="button" 
                                key={d} 
                                onClick={() => setFormData({...formData, domain: d})}
                                className={`text-xs py-2 rounded font-bold ${formData.domain === d ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}
                            >
                                {d}
                            </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Total Headcount</label>
                        <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.headcount} onChange={e => setFormData({...formData, headcount: Number(e.target.value)})} />
                    </div>
                  </>
              )}

              {/* --- COP FIELD FORM --- */}
              {isField && (
                  <>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Field Activity</label>
                        <select className="w-full bg-white border border-slate-300 rounded p-2" value={formData.fieldActivity} onChange={e => setFormData({...formData, fieldActivity: e.target.value})}>
                            <option value="Awareness Pamphlet Distribution">Awareness Pamphlet Distribution</option>
                            <option value="Awareness Session">Awareness Session</option>
                            <option value="Home Visit">Home Visit</option>
                        </select>
                    </div>

                    {formData.fieldActivity === 'Awareness Session' && (
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Session Format</label>
                             <div className="flex space-x-2 mt-1">
                                 <button type="button" onClick={() => setFormData({...formData, sessionFormat: 'Group'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.sessionFormat === 'Group' ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Group Session</button>
                                 <button type="button" onClick={() => setFormData({...formData, sessionFormat: 'Individual'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.sessionFormat === 'Individual' ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Individual Session</button>
                             </div>
                        </div>
                    )}

                    {formData.fieldActivity === 'Home Visit' ? (
                        <div className="grid grid-cols-2 gap-4 bg-indigo-50 p-3 rounded border border-indigo-100">
                             <div className="col-span-2 text-xs font-bold text-indigo-800 uppercase text-center mb-1">Gender Breakdown</div>
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase">Males</label>
                                 <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.maleCount} onChange={e => setFormData({...formData, maleCount: Number(e.target.value)})} />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase">Females</label>
                                 <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.femaleCount} onChange={e => setFormData({...formData, femaleCount: Number(e.target.value)})} />
                             </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Pamphlets Qty</label>
                                <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.pamphletsQty} onChange={e => setFormData({...formData, pamphletsQty: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">People Engaged</label>
                                <input type="number" min="0" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.headcount} onChange={e => setFormData({...formData, headcount: Number(e.target.value)})} />
                            </div>
                        </div>
                    )}
                  </>
              )}

              {/* Shared Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Next Scheduled On</label>
                <input type="date" className="w-full bg-white border border-slate-300 rounded p-2" value={formData.nextDate} onChange={e => setFormData({...formData, nextDate: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Outcomes / Notes</label>
                <textarea className="w-full bg-white border border-slate-300 rounded p-2" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <button type="submit" className={`w-full text-white py-3 rounded-lg font-bold transition-colors ${organization === 'COP' ? 'bg-indigo-900 hover:bg-indigo-800' : 'bg-bwz-primary hover:bg-teal-700'}`}>
                Log Session
              </button>
            </form>
          </div>

          {/* List */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden order-1 md:order-2">
             <h2 className="font-bold text-lg mb-4">Recent {organization} {copMode ? `(${copMode})` : ''} Activity</h2>
             <div className="space-y-4">
               {sessions.slice().reverse().map((s, i) => (
                 <div key={i} className="flex items-start border-b border-dashed pb-4 last:border-0">
                    <div className="bg-slate-100 p-3 rounded-lg mr-4 text-slate-600 flex-shrink-0">
                       {/* Icons based on type */}
                       {s.fieldActivityType === 'Home Visit' ? <Home size={20}/> : 
                        s.copDivision === 'Field' ? <Layers size={20}/> : 
                        (s.type.includes('Group') ? <Users size={20}/> : <MapPin size={20}/>)
                       }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">
                          {s.copDivision ? <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded uppercase mr-2">{s.copDivision}</span> : ''}
                          {s.type} {s.domainFocus ? `- ${s.domainFocus}` : ''}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center truncate"><MapPin size={12} className="mr-1"/> {s.location} • {new Date(s.date).toLocaleDateString()}</p>
                      <p className="text-sm mt-1 bg-slate-50 p-2 rounded whitespace-pre-wrap">{s.notes}</p>
                      
                      {/* Breakdown Display */}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                          {s.genderBreakdown && <span className="text-indigo-600">Male: {s.genderBreakdown.male} / Female: {s.genderBreakdown.female}</span>}
                          {s.newPatientCount !== undefined && <span className="text-green-600">New: {s.newPatientCount}</span>}
                          {s.followUpPatientCount !== undefined && <span className="text-blue-600">Follow-up: {s.followUpPatientCount}</span>}
                          {s.pamphletsDistributed !== undefined && s.pamphletsDistributed > 0 && <span className="text-purple-600">Pamphlets: {s.pamphletsDistributed}</span>}
                      </div>
                      {s.nextScheduledDate && (
                          <div className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-fit">
                              Next: {new Date(s.nextScheduledDate).toLocaleDateString()}
                          </div>
                      )}
                    </div>
                    <div className="ml-auto text-right flex-shrink-0 pl-2">
                       <span className="block text-2xl font-bold text-slate-700">{s.participantCount}</span>
                       <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                    </div>
                 </div>
               ))}
               {sessions.length === 0 && <p className="text-slate-400 italic">No activity logs.</p>}
             </div>
          </div>
       </div>
       )}

       {activeTab === 'schedule' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Upcoming */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h2 className="font-bold text-lg mb-4 flex items-center"><Calendar className="mr-2 text-bwz-primary"/> Upcoming Scheduled Sessions</h2>
                   {upcomingSessions.length === 0 ? <p className="text-slate-400 italic">No future sessions scheduled.</p> : (
                       <ul className="space-y-3">
                           {upcomingSessions.sort((a,b) => new Date(a.nextScheduledDate!).getTime() - new Date(b.nextScheduledDate!).getTime()).map(s => (
                               <li key={s.id} className="p-3 border rounded-lg hover:bg-slate-50">
                                   <div className="flex justify-between">
                                       <span className="font-bold text-slate-700">{s.type}</span>
                                       <span className="text-sm font-mono text-indigo-600">{new Date(s.nextScheduledDate!).toLocaleDateString()}</span>
                                   </div>
                                   <div className="text-xs text-slate-500">{s.location}</div>
                               </li>
                           ))}
                       </ul>
                   )}
               </div>

               {/* Alerts */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h2 className="font-bold text-lg mb-4 flex items-center text-red-600"><AlertTriangle className="mr-2"/> Overdue / Alerts</h2>
                   {missedSessions.length === 0 ? <p className="text-slate-400 italic">No overdue sessions found.</p> : (
                       <ul className="space-y-3">
                            {missedSessions.map(s => (
                               <li key={s.id} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                                   <div className="flex justify-between">
                                       <span className="font-bold text-slate-800">{s.type}</span>
                                       <span className="text-xs font-bold text-red-600">Was Due: {new Date(s.nextScheduledDate!).toLocaleDateString()}</span>
                                   </div>
                                   <div className="text-xs text-slate-600 mt-1">
                                       Originated at: {s.location} on {new Date(s.date).toLocaleDateString()}
                                   </div>
                               </li>
                           ))}
                       </ul>
                   )}
               </div>
           </div>
       )}

       {activeTab === 'assessment' && (
           <div className="space-y-6">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h2 className="font-bold text-lg mb-6 flex items-center"><ClipboardList className="mr-2 text-slate-700"/> Individual Patient Assessment</h2>
                   
                   {/* Search Bar */}
                   {!selectedPatientId ? (
                       <div>
                           <div className="relative mb-6">
                               <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                               <input 
                                  placeholder="Search Patient by Name or ID..." 
                                  className="w-full pl-10 p-3 border border-slate-300 rounded-lg"
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                               />
                           </div>
                           
                           {searchQuery.length > 0 && (
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   {filteredPatients.map(c => (
                                       <div key={c.id} onClick={() => setSelectedPatientId(c.id)} className="p-4 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                           <h3 className="font-bold text-slate-800">{c.name}</h3>
                                           <p className="text-xs text-slate-500">{c.id} • {c.age}y</p>
                                       </div>
                                   ))}
                                   {filteredPatients.length === 0 && <p className="text-slate-400 italic">No patients found.</p>}
                               </div>
                           )}
                       </div>
                   ) : (
                       <div>
                           <div className="mb-4 flex justify-between items-center">
                               <button onClick={() => setSelectedPatientId(null)} className="text-sm font-bold text-slate-500 hover:text-slate-800">← Back to Search</button>
                               <h3 className="font-bold text-lg">Assessing: <span className="text-bwz-primary">{selectedPatient?.name}</span></h3>
                           </div>
                           
                           {/* Dual Column Layout: MHQoL + Rehab Notes */}
                           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                               {/* Left: MHQoL */}
                               <div className="space-y-6">
                                    <MHQoLAssessment clientId={selectedPatientId} />
                               </div>

                               {/* Right: Rehab Progress Note */}
                               <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center"><FileText className="mr-2 text-indigo-600"/> Add Rehab Progress Note</h3>
                                        <textarea 
                                            className="w-full bg-slate-50 border border-slate-200 rounded p-4 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            rows={5}
                                            placeholder="Enter behavioral observations, participation level, and qualitative progress..."
                                            value={rehabNote}
                                            onChange={e => setRehabNote(e.target.value)}
                                        ></textarea>
                                        <button onClick={handleAddRehabNote} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center">
                                            <Plus className="mr-2"/> Save Rehab Note
                                        </button>
                                    </div>

                                    {/* Recent Notes History */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-700 mb-4 flex items-center text-sm uppercase"><StickyNote className="mr-2" size={16}/> Recent Patient History</h3>
                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                            {selectedPatient?.progressNotes.length === 0 && <p className="text-slate-400 italic text-sm">No notes recorded.</p>}
                                            {selectedPatient?.progressNotes.slice().reverse().map(note => (
                                                <div key={note.id} className="bg-white p-3 rounded border border-slate-100 shadow-sm text-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-indigo-600 text-xs">{note.author}</span>
                                                        <span className="text-xs text-slate-400">{new Date(note.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-slate-600">{note.note}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                               </div>
                           </div>
                       </div>
                   )}
               </div>
           </div>
       )}
    </div>
  );
};
export default PRPView;
