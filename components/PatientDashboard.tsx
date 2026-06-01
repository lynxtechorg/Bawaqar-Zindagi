

import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { ClientProfile, MSEData, ClinicalHistory } from '../types';
import RiskBanner from './RiskBanner';
import { Save, AlertOctagon, History, Eye, PlusCircle, Calendar, Clock, Lock, Activity, Edit } from 'lucide-react';

interface Props {
  client: ClientProfile;
  isEditable?: boolean;
}

const DIAGNOSIS_CATEGORIES: Record<string, string[]> = {
  "Neurodevelopmental Disorders": ["Autism Spectrum Disorder", "ADHD", "Intellectual Developmental Disorder"],
  "Schizophrenia Spectrum": ["Schizophrenia", "Schizoaffective Disorder", "Delusional Disorder", "Brief Psychotic Disorder"],
  "Mood Disorders": ["Major Depressive Disorder", "Bipolar I Disorder", "Bipolar II Disorder"],
  "Anxiety Disorders": ["Generalized Anxiety Disorder", "Panic Disorder", "Social Anxiety Disorder"],
  "Obsessive-Compulsive": ["Obsessive-Compulsive Disorder (OCD)"],
  "Trauma & Stressor": ["PTSD", "Acute Stress Disorder", "Adjustment Disorder"],
  "Substance-Related": ["Alcohol Use Disorder", "Substance Use Disorders"],
  "Personality Disorders": ["Borderline PD", "Antisocial PD", "Narcissistic PD"],
  "Neurocognitive": ["Delirium", "Major Neurocognitive Disorder"],
  "Other": ["Other (Specify)"]
};

const PatientDashboard: React.FC<Props> = ({ client, isEditable = false }) => {
  const { histories, mseRecords, saveConsultation, updateConsultation } = useData();

  // --- DATA FETCHING ---
  // Get all records for this client to build the history log
  const clientHistories = React.useMemo(() => 
      histories.filter(h => h.clientId === client.id).sort((a,b) => b.id.localeCompare(a.id)), 
      [histories, client.id]
  );
  
  const clientMSEs = React.useMemo(() => 
      mseRecords.filter(m => m.clientId === client.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      [mseRecords, client.id]
  );

  // --- STATE ---
  const [viewMode, setViewMode] = useState<'NEW' | 'VIEW' | 'EDIT'>('NEW');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [customDiagnosis, setCustomDiagnosis] = useState('');

  // Memoize latest records to prevent infinite reset loops on render
  const latestMSE = React.useMemo(() => clientMSEs[0] || { 
    id: '', clientId: client.id, date: new Date().toISOString(), 
    appearance: '', behavior: '', eyeContact: '', speechRate: '', speechVolume: '',
    mood: '', affect: '', thoughtProcess: '', thoughtContent: '', perceptualDisturbances: '',
    orientation: '', attention: '', memory: '', insight: 1, judgment: ''
  }, [clientMSEs, client.id]);
  
  const latestHistory = React.useMemo(() => clientHistories[0] || { 
     id: '', clientId: client.id, diagnosis: '', chiefComplaints: '', 
     durationOfIllness: '', familyHistory: '', pastPsychMedicalHistory: '', substanceAbuseHistory: '' 
  }, [clientHistories, client.id]);

  // Form State (Initialized with latest static data, but empty dynamic data for new entry)
  const [formData, setFormData] = useState<{mse: MSEData, history: ClinicalHistory}>({
      mse: { ...latestMSE, id: '', date: new Date().toISOString() }, 
      history: { ...latestHistory, id: '' }
  });

  // Effect to reset form when switching client or clicking "New"
  useEffect(() => {
     if (viewMode === 'NEW') {
         // When creating NEW, we keep static history (Family, Past Med) but clear Visit-Specifics (MSE, Chief Complaints)
         // Actually, doctors often want to see the previous values to just tweak them. 
         // Let's pre-fill with latest for convenience, but it will save as NEW.
         setFormData({
             mse: { ...latestMSE, id: '', date: new Date().toISOString() },
             history: { ...latestHistory, id: '' } 
         });
         setSelectedRecordId(null);
     }
     // We intentionally omit latestMSE/latestHistory from deps to prevent resetting while typing if background data updates
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, viewMode]);

  const handleHistoryClick = (mseId: string) => {
      const pastMSE = clientMSEs.find(m => m.id === mseId);
      const timestamp = mseId.split('-')[1];
      const pastHistory = clientHistories.find(h => h.id === `H-${timestamp}`) || latestHistory;

      if (pastMSE) {
          setFormData({ mse: pastMSE, history: pastHistory });
          
          const isCustom = !Object.values(DIAGNOSIS_CATEGORIES).flat().includes(pastHistory.diagnosis) && pastHistory.diagnosis !== '';
          if (isCustom) {
              setCustomDiagnosis(pastHistory.diagnosis);
          } else {
              setCustomDiagnosis('');
          }
          
          setViewMode('EDIT'); // Always open in EDIT mode instead of VIEW
          setSelectedRecordId(mseId);
      }
  };

  const handleSave = async () => {
    // Prevent double submission
    if (!formData.history.diagnosis && !formData.mse.appearance) {
        console.warn("Please enter some data before saving.");
        return;
    }
    
    const isOther = formData.history.diagnosis === 'Other (Specify)' || (!Object.values(DIAGNOSIS_CATEGORIES).flat().includes(formData.history.diagnosis) && formData.history.diagnosis !== '');
    const finalDiagnosis = isOther && customDiagnosis ? customDiagnosis : formData.history.diagnosis;
    const historyToSave = { ...formData.history, diagnosis: finalDiagnosis };

    try {
        if (viewMode === 'EDIT') {
            await updateConsultation(historyToSave, formData.mse);
            // Removed alert to prevent iframe blocking
            setViewMode('EDIT');
        } else {
            await saveConsultation(historyToSave, formData.mse);
            // Removed alert to prevent iframe blocking
            setViewMode('NEW'); 
            setFormData({
                 mse: { ...latestMSE, id: '', date: new Date().toISOString(), appearance: '', behavior: '', mood: '', affect: '' },
                 history: { ...latestHistory, id: '', chiefComplaints: '' } 
            });
            setCustomDiagnosis('');
        }
    } catch (e) {
        console.error("Save failed", e);
    }
  };

  const updateMSE = (field: keyof MSEData, value: any) => {
      setFormData(prev => ({ ...prev, mse: { ...prev.mse, [field]: value } }));
  };

  const updateHistory = (field: keyof ClinicalHistory, value: any) => {
      setFormData(prev => ({ ...prev, history: { ...prev.history, [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <RiskBanner riskProfile={client.riskProfile} name={client.name} />
      
      {client.exitPlanEligible && (
         <div className="bg-green-600 text-white p-4 shadow-md rounded-lg flex justify-between items-center animate-pulse">
            <div className="flex items-center">
              <AlertOctagon className="mr-3" />
              <div>
                <h3 className="font-bold text-lg">Vocational Exit Plan Eligible</h3>
                <p className="text-sm">Client has scored {'>'}80 in Working Domain consistently.</p>
              </div>
            </div>
            <button className="bg-white text-green-800 px-4 py-2 rounded font-bold text-sm shadow hover:bg-gray-100">Generate Plan</button>
         </div>
      )}

      {/* VITALS SNAPSHOT SECTION */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
        <h3 className="font-bold text-slate-700 mb-3 flex items-center text-sm uppercase tracking-wider">
            <Activity className="mr-2 text-teal-600" size={18}/> Recent Vitals (Triage)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">Temp</span>
                <span className="font-mono text-lg font-bold text-slate-700">{client.vitals?.temperature || '--'} <span className="text-xs text-slate-400">°F</span></span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">Pulse</span>
                <span className="font-mono text-lg font-bold text-slate-700">{client.vitals?.pulse || '--'} <span className="text-xs text-slate-400">bpm</span></span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">BP</span>
                <span className="font-mono text-lg font-bold text-slate-700">{client.vitals?.bp || '--'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">Resp</span>
                <span className="font-mono text-lg font-bold text-slate-700">{client.vitals?.respRate || '--'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center justify-center bg-teal-50 border-teal-100">
                <span className="text-[10px] text-teal-600 uppercase font-bold mb-1">Weight</span>
                <span className="font-mono text-lg font-bold text-teal-800">{client.vitals?.weight || '--'} <span className="text-xs text-teal-600">kg</span></span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: FORM / DETAIL VIEW (3/4 width) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Header & Actions */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                  {viewMode === 'NEW' ? (
                      <div className="bg-bwz-primary text-white p-2 rounded-lg mr-3"><PlusCircle size={20}/></div>
                  ) : (
                      <div className="bg-slate-600 text-white p-2 rounded-lg mr-3"><Lock size={20}/></div>
                  )}
                  <div>
                      <h2 className="text-xl font-bold text-slate-800">
                          {viewMode === 'NEW' ? 'New Consultation Entry' : 'Historical Snapshot'}
                      </h2>
                      <p className="text-xs text-slate-500">
                          {viewMode === 'NEW' ? new Date().toLocaleDateString() + ' (Today)' : new Date(formData.mse.date).toLocaleString()}
                      </p>
                  </div>
              </div>

              {viewMode === 'VIEW' && (
                  <div className="flex space-x-2">
                      <button onClick={() => setViewMode('EDIT')} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-orange-600 flex items-center">
                          <Edit size={16} className="mr-2"/> Edit Record
                      </button>
                      <button onClick={() => setViewMode('NEW')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center">
                          <PlusCircle className="mr-2" size={16}/> New Consultation
                      </button>
                  </div>
              )}
              
              {viewMode === 'NEW' && isEditable && (
                  <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 flex items-center">
                      <Save className="mr-2" size={18}/> Save Consultation
                  </button>
              )}
              
              {viewMode === 'EDIT' && isEditable && (
                  <button onClick={handleSave} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-orange-700 flex items-center">
                      <Save className="mr-2" size={18}/> Update Consultation
                  </button>
              )}
          </div>

          {/* Clinical History Section */}
          <div className={`bg-white p-6 rounded-xl shadow border border-slate-200 relative ${viewMode === 'VIEW' ? 'opacity-90 bg-slate-50' : ''}`}>
             <h2 className="text-lg font-bold text-medical-900 mb-4 border-b pb-2 flex items-center">
                <History className="mr-2"/> Clinical History & Diagnosis
             </h2>
             {viewMode === 'VIEW' && <div className="absolute top-4 right-4 text-xs font-bold text-slate-400 border border-slate-200 px-2 py-1 rounded">READ ONLY</div>}
             {viewMode === 'EDIT' && <div className="absolute top-4 right-4 text-xs font-bold text-orange-600 border border-orange-200 bg-orange-50 px-2 py-1 rounded">EDITING</div>}
             
             <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Primary Diagnosis</label>
                    {viewMode !== 'VIEW' ? (
                        <>
                        <select 
                        className="w-full bg-white border border-slate-300 rounded p-3 text-sm focus:ring-2 focus:ring-bwz-primary outline-none font-medium"
                        value={Object.values(DIAGNOSIS_CATEGORIES).flat().includes(formData.history.diagnosis) || formData.history.diagnosis === '' ? formData.history.diagnosis : 'Other (Specify)'} 
                        onChange={e => {
                            if (e.target.value === 'Other (Specify)') {
                                updateHistory('diagnosis', 'Other (Specify)');
                                setCustomDiagnosis('');
                            } else {
                                updateHistory('diagnosis', e.target.value);
                            }
                        }}
                        >
                        <option value="">-- Select Clinical Diagnosis --</option>
                        {Object.entries(DIAGNOSIS_CATEGORIES).map(([category, diagnoses]) => (
                            <optgroup key={category} label={category}>
                            {diagnoses.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                            </optgroup>
                        ))}
                        </select>
                        {(formData.history.diagnosis === 'Other (Specify)' || (!Object.values(DIAGNOSIS_CATEGORIES).flat().includes(formData.history.diagnosis) && formData.history.diagnosis !== '')) && (
                            <input 
                                className="w-full mt-2 border rounded p-3 text-sm outline-none bg-white border-slate-300 focus:ring-2 focus:ring-bwz-primary"
                                placeholder="Type custom diagnosis..."
                                value={customDiagnosis}
                                onChange={e => setCustomDiagnosis(e.target.value)}
                            />
                        )}
                        </>
                    ) : (
                        <div className="p-3 bg-slate-100 rounded border border-slate-200 font-bold text-slate-800">{formData.history.diagnosis || 'Not Diagnosed'}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Chief Complaints</label>
                    <textarea 
                        readOnly={viewMode === 'VIEW'}
                        className={`w-full border rounded p-3 text-sm outline-none ${viewMode === 'VIEW' ? 'bg-slate-100 text-slate-600' : 'bg-white border-slate-300 focus:ring-2 focus:ring-bwz-primary'}`}
                        rows={3} 
                        value={formData.history.chiefComplaints} 
                        onChange={e => updateHistory('chiefComplaints', e.target.value)} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">History of Present Illness</label>
                        <textarea 
                            readOnly={viewMode === 'VIEW'}
                            className={`w-full border rounded p-3 text-sm outline-none ${viewMode === 'VIEW' ? 'bg-slate-100 text-slate-600' : 'bg-white border-slate-300 focus:ring-2 focus:ring-bwz-primary'}`}
                            rows={3} 
                            value={formData.history.durationOfIllness} 
                            onChange={e => updateHistory('durationOfIllness', e.target.value)} 
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Family History</label>
                        <textarea 
                            readOnly={viewMode === 'VIEW'}
                            className={`w-full border rounded p-3 text-sm outline-none ${viewMode === 'VIEW' ? 'bg-slate-100 text-slate-600' : 'bg-white border-slate-300 focus:ring-2 focus:ring-bwz-primary'}`}
                            rows={3} 
                            value={formData.history.familyHistory} 
                            onChange={e => updateHistory('familyHistory', e.target.value)} 
                        />
                     </div>
                  </div>
             </div>
          </div>

          {/* MSE Section */}
          <div className={`bg-white p-6 rounded-xl shadow border border-slate-200 relative ${viewMode === 'VIEW' ? 'opacity-90 bg-slate-50' : ''}`}>
            <h2 className="text-lg font-bold text-medical-900 mb-6 border-b pb-4 flex items-center">
                <Eye className="mr-2"/> Mental State Examination (MSE)
            </h2>
            {viewMode === 'VIEW' && <div className="absolute top-4 right-4 text-xs font-bold text-slate-400 border border-slate-200 px-2 py-1 rounded">READ ONLY</div>}
            {viewMode === 'EDIT' && <div className="absolute top-4 right-4 text-xs font-bold text-orange-600 border border-orange-200 bg-orange-50 px-2 py-1 rounded">EDITING</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 {/* Appearance & Behavior */}
                 <div className="col-span-2 bg-slate-50 p-3 rounded border border-slate-100"><h3 className="font-bold text-slate-700 mb-2">General Appearance</h3>
                   <div className="grid grid-cols-2 gap-3">
                     <div><label className="block text-slate-500 text-xs mb-1">Appearance</label>
                        <select disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-bwz-primary outline-none disabled:bg-slate-100" value={formData.mse.appearance} onChange={e => updateMSE('appearance', e.target.value)}>
                           <option value="">Select...</option><option>Well Groomed</option><option>Disheveled</option><option>Inappropriate Dress</option>
                        </select>
                     </div>
                     <div><label className="block text-slate-500 text-xs mb-1">Behavior</label>
                        <select disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-bwz-primary outline-none disabled:bg-slate-100" value={formData.mse.behavior} onChange={e => updateMSE('behavior', e.target.value)}>
                           <option value="">Select...</option><option>Cooperative</option><option>Agitated</option><option>Guarded</option><option>Psychomotor Retardation</option>
                        </select>
                     </div>
                   </div>
                 </div>

                 {/* Speech */}
                 <div className="bg-slate-50 p-3 rounded border border-slate-100"><h3 className="font-bold text-slate-700 mb-2">Speech</h3>
                   <div className="space-y-2">
                     <select disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 disabled:bg-slate-100" value={formData.mse.speechRate} onChange={e => updateMSE('speechRate', e.target.value)}>
                        <option value="">Rate...</option><option>Normal</option><option>Pressured</option><option>Slow/Latent</option>
                     </select>
                     <select disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 disabled:bg-slate-100" value={formData.mse.speechVolume} onChange={e => updateMSE('speechVolume', e.target.value)}>
                        <option value="">Volume...</option><option>Normal</option><option>Soft/Whispered</option><option>Loud</option>
                     </select>
                   </div>
                 </div>

                 {/* Mood/Affect */}
                 <div className="bg-slate-50 p-3 rounded border border-slate-100"><h3 className="font-bold text-slate-700 mb-2">Mood & Affect</h3>
                   <div className="space-y-2">
                     <input disabled={viewMode === 'VIEW'} placeholder="Mood (Subjective)" className="w-full bg-white border border-slate-300 rounded p-2 disabled:bg-slate-100" value={formData.mse.mood} onChange={e => updateMSE('mood', e.target.value)} />
                     <select disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 disabled:bg-slate-100" value={formData.mse.affect} onChange={e => updateMSE('affect', e.target.value)}>
                        <option value="">Affect (Objective)...</option><option>Broad/Euthymic</option><option>Restricted</option><option>Blunted</option><option>Flat</option><option>Labile</option>
                     </select>
                   </div>
                 </div>

                 {/* Thought & Perception */}
                 <div className="col-span-2 bg-slate-50 p-3 rounded border border-slate-100"><h3 className="font-bold text-slate-700 mb-2">Thought & Perception</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Thought Process</label>
                        <select disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 disabled:bg-slate-100" value={formData.mse.thoughtProcess} onChange={e => updateMSE('thoughtProcess', e.target.value)}>
                           <option value="">Select...</option><option>Linear/Goal Directed</option><option>Tangential</option><option>Circumstantial</option><option>Flight of Ideas</option><option>Loose Associations</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Thought Content (Risk Flags)</label>
                        <input disabled={viewMode === 'VIEW'} className="w-full bg-white border border-red-300 rounded p-2 text-red-900 placeholder-red-200 focus:ring-red-500 disabled:bg-slate-100" placeholder="Delusions, Suicidal/Homicidal Ideation..." value={formData.mse.thoughtContent} onChange={e => updateMSE('thoughtContent', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Perceptual Disturbances</label>
                        <input disabled={viewMode === 'VIEW'} className="w-full bg-white border border-slate-300 rounded p-2 disabled:bg-slate-100" placeholder="Hallucinations (Auditory/Visual)..." value={formData.mse.perceptualDisturbances} onChange={e => updateMSE('perceptualDisturbances', e.target.value)} />
                      </div>
                    </div>
                 </div>

                 {/* Insight */}
                 <div className="col-span-2 bg-slate-50 p-3 rounded border border-slate-100 flex items-center justify-between">
                    <label className="font-bold text-slate-700">Insight Level (1-6)</label>
                    <input disabled={viewMode === 'VIEW'} type="number" min="1" max="6" className="w-20 bg-white border border-slate-300 rounded p-2 text-center font-bold disabled:bg-slate-100" value={formData.mse.insight} onChange={e => updateMSE('insight', Number(e.target.value))} />
                 </div>
              </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HISTORY SIDEBAR (1/4 width) */}
        <div className="xl:col-span-1 bg-white p-4 rounded-xl shadow border border-slate-200 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
            <div className="mb-4 pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center"><Calendar className="mr-2" size={16}/> Consultation History</h3>
                <p className="text-xs text-slate-500 mt-1">Select a past visit to view details.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {clientMSEs.length === 0 && (
                    <div className="text-center py-10 text-slate-400 italic text-sm">
                        No previous consultations recorded.
                    </div>
                )}
                
                {clientMSEs.map((record) => {
                    const timestamp = record.id.split('-')[1];
                    const historyRecord = clientHistories.find(h => h.id === `H-${timestamp}`);
                    const diag = historyRecord?.diagnosis || 'No Diagnosis';
                    const isSelected = selectedRecordId === record.id;
                    
                    return (
                        <div 
                            key={record.id} 
                            onClick={() => handleHistoryClick(record.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all text-sm group ${isSelected ? 'bg-bwz-primary text-white border-bwz-primary shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>{new Date(record.date).toLocaleDateString()}</span>
                                <span className={`text-[10px] font-mono opacity-80 ${isSelected ? 'text-white' : 'text-slate-500'}`}>{new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className={`text-xs mb-2 truncate ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                                {diag}
                            </div>
                            {/* Mini Risk Indicator in List */}
                            {record.thoughtContent && (
                                <div className={`text-[10px] flex items-center ${isSelected ? 'text-red-200' : 'text-red-600 font-bold'}`}>
                                    <AlertOctagon size={10} className="mr-1"/> Risk Factors Noted
                                </div>
                            )}
                            {isSelected && (
                                <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-center bg-white/20 rounded py-1">
                                    Currently Viewing
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;