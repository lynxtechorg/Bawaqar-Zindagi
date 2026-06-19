

import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { ClientProfile, MSEData, ClinicalHistory, VitalsData } from '../types';
import RiskBanner from './RiskBanner';
import AICopilot from './ui/AICopilot';
import { deidentify } from '../lib/ai';
import { Save, AlertOctagon, History, Eye, PlusCircle, Calendar, Clock, Lock, Activity, Edit, Loader2, CheckCircle } from 'lucide-react';

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
  const { histories, mseRecords, saveConsultation, updateConsultation, mhqolRecords, prescriptions } = useData();

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

  const clientQoLs = React.useMemo(() => {
      if (!mhqolRecords) return [];
      return mhqolRecords
          .filter(r => r.clientId === client.id)
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [mhqolRecords, client.id]);
  
  const clientPrescriptions = React.useMemo(() => {
      if (!prescriptions) return [];
      return prescriptions
          .filter(r => r.clientId === client.id)
          .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [prescriptions, client.id]);

  // --- STATE ---
  const [viewMode, setViewMode] = useState<'NEW' | 'VIEW' | 'EDIT'>('NEW');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [customDiagnosis, setCustomDiagnosis] = useState('');
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'Consultations' | 'Prescriptions'>('Consultations');

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
      history: { ...latestHistory, id: '', vitals: client.vitals }
  });

  // Dynamic, context-aware vitals (reverts to historical values when viewing past visits)
  const displayedVitals = React.useMemo(() => {
      return formData.history.vitals || client.vitals || {
          temperature: '',
          pulse: '',
          respRate: '',
          bp: '',
          weight: ''
      };
  }, [formData.history.vitals, client.vitals]);

  // Vitals Warnings Analysis (Upgrade 4)
  const tempStatus = React.useMemo(() => {
    const val = parseFloat(displayedVitals.temperature || '');
    if (isNaN(val)) return null;
    if (val >= 99.5) return { label: 'Fever Alert', color: 'bg-rose-50 border-rose-200 text-rose-800' };
    if (val < 95.0) return { label: 'Hypothermia', color: 'bg-blue-50 border-blue-200 text-blue-800' };
    return { label: 'Normal Temp', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' };
  }, [displayedVitals.temperature]);

  const pulseStatus = React.useMemo(() => {
    const val = parseInt(displayedVitals.pulse || '');
    if (isNaN(val)) return null;
    if (val > 100) return { label: 'Tachycardia', color: 'bg-amber-50 border-amber-200 text-amber-800' };
    if (val < 60) return { label: 'Bradycardia', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' };
    return { label: 'Normal pulse', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' };
  }, [displayedVitals.pulse]);

  const bpStatus = React.useMemo(() => {
    const val = displayedVitals.bp || '';
    if (!val || !val.includes('/')) return null;
    const parts = val.split('/');
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    if (isNaN(sys) || isNaN(dia)) return null;
    if (sys >= 135 || dia >= 85) return { label: 'Hypertension', color: 'bg-rose-50 border-rose-200 text-rose-800' };
    if (sys < 95 || dia < 60) return { label: 'Hypotension', color: 'bg-blue-50 border-blue-200 text-blue-800' };
    return { label: 'Normal BP', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' };
  }, [displayedVitals.bp]);

  const respStatus = React.useMemo(() => {
    const val = parseInt(displayedVitals.respRate || '');
    if (isNaN(val)) return null;
    if (val > 20) return { label: 'Tachypnea', color: 'bg-amber-50 border-amber-200 text-amber-800' };
    if (val < 12) return { label: 'Bradypnea', color: 'bg-slate-100 border-slate-200 text-slate-800' };
    return { label: 'Normal Resp', color: 'bg-emerald-50 border-emerald-100 text-emerald-800' };
  }, [displayedVitals.respRate]);

  const clientVitalsKey = JSON.stringify(client.vitals || {});

  // Effect to reset form when switching client or clicking "New"
  useEffect(() => {
     if (viewMode === 'NEW') {
         // When creating NEW, we keep static history (Family, Past Med) but clear Visit-Specifics (MSE, Chief Complaints)
         // Actually, doctors often want to see the previous values to just tweak them. 
         // Let's pre-fill with latest for convenience, but it will save as NEW.
         setFormData({
             mse: { ...latestMSE, id: '', date: new Date().toISOString() },
             history: { ...latestHistory, id: '', vitals: client.vitals } 
         });
         setSelectedRecordId(null);
     }
     // We intentionally omit latestMSE/latestHistory from deps to prevent resetting while typing if background data updates
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, viewMode, clientVitalsKey]);

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

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = async () => {
    // Prevent double submission
    if (!formData.history.diagnosis && !formData.mse.appearance) {
        console.warn("Please enter some data before saving.");
        return;
    }
    
    setSaveStatus('saving');
    const isOther = formData.history.diagnosis === 'Other (Specify)' || (!Object.values(DIAGNOSIS_CATEGORIES).flat().includes(formData.history.diagnosis) && formData.history.diagnosis !== '');
    const finalDiagnosis = isOther && customDiagnosis ? customDiagnosis : formData.history.diagnosis;
    const historyToSave = { ...formData.history, diagnosis: finalDiagnosis };

    try {
        if (viewMode === 'EDIT') {
            await updateConsultation(historyToSave, formData.mse);
            setViewMode('EDIT');
        } else {
            await saveConsultation(historyToSave, formData.mse);
            setViewMode('NEW'); 
            setFormData({
                 mse: { ...latestMSE, id: '', date: new Date().toISOString(), appearance: '', behavior: '', mood: '', affect: '' },
                 history: { ...latestHistory, id: '', chiefComplaints: '' } 
            });
            setCustomDiagnosis('');
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
        console.error("Save failed", e);
        setSaveStatus('idle');
    }
  };

  // Build a DE-IDENTIFIED case summary prompt for the AI copilot (no name/CNIC/contact).
  const buildAIPrompt = () => {
    const terms = [client.name, client.cnic, client.contact, client.emergencyContact];
    const lines: string[] = [`Patient: ${client.age}y ${client.gender}, current status ${client.status}.`];
    clientHistories.slice(0, 5).forEach(h => {
      lines.push(`Visit — Diagnosis: ${h.diagnosis || 'n/a'}; Complaints: ${h.chiefComplaints || 'n/a'}; HPI: ${h.durationOfIllness || 'n/a'}.`);
    });
    if (clientMSEs[0]) {
      const m = clientMSEs[0];
      lines.push(`Latest MSE — mood: ${m.mood || 'n/a'}, affect: ${m.affect || 'n/a'}, thought process: ${m.thoughtProcess || 'n/a'}, content: ${m.thoughtContent || 'n/a'}, insight: ${m.insight}.`);
    }
    client.progressNotes.slice(-5).forEach(n => lines.push(`Note: ${n.note}`));
    if (client.riskProfile?.suicidalIdeation) lines.push('Flag: active suicidal ideation.');
    if (client.riskProfile?.homicidalIntent) lines.push('Flag: active homicidal intent.');
    const body = deidentify(lines.join('\n'), terms);
    return `You are a psychiatric clinical assistant. Summarize this de-identified case in 4-6 concise bullet points covering: primary diagnosis, clinical course, current mental state, risk factors, and a suggested follow-up focus. Be factual and do not invent details.\n\n${body}`;
  };

  const updateMSE = (field: keyof MSEData, value: any) => {
      setFormData(prev => ({ ...prev, mse: { ...prev.mse, [field]: value } }));
  };

  const updateHistory = (field: keyof ClinicalHistory, value: any) => {
      setFormData(prev => ({ ...prev, history: { ...prev.history, [field]: value } }));
  };

  const updateFormVitals = (key: keyof VitalsData, val: string) => {
      const currentVitals = formData.history.vitals || client.vitals || {
          temperature: '',
          pulse: '',
          respRate: '',
          bp: '',
          weight: ''
      };
      const updatedVitals = { ...currentVitals, [key]: val };
      setFormData(prev => ({
          ...prev,
          history: {
              ...prev.history,
              vitals: updatedVitals
          }
      }));
  };

  return (
    <div className="space-y-6">
      <RiskBanner client={client} />
      
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

      {/* VITALS & MHQOL PROGRESS ROW (Upgrades 4 & 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VITALS SNAPSHOT SECTION */}
          <div className="card p-5 animate-fade-in flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-slate-700 mb-3 flex flex-row items-center justify-between text-sm uppercase tracking-wider w-full">
                    <div className="flex items-center"><Activity className="mr-2 text-teal-600" size={18}/> Triage Vitals Guardrails</div>
                    <button type="button" onClick={() => setShowVitalsHistory(true)} className="text-xs text-teal-600 hover:text-teal-800 font-bold bg-teal-50 px-2 py-1 rounded cursor-pointer border border-teal-200">
                        View History
                    </button>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className={`p-2.5 rounded-lg border text-center transition-all ${tempStatus?.color || 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Temp</span>
                        {isEditable && viewMode !== 'VIEW' ? (
                            <div className="flex items-center justify-center space-x-1">
                                <input 
                                    type="text" 
                                    className="w-16 bg-white text-slate-800 text-center font-bold font-mono py-0.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500"
                                    value={formData.history.vitals?.temperature || ''}
                                    placeholder="98.6"
                                    onChange={e => updateFormVitals('temperature', e.target.value)}
                                />
                                <span className="text-[10px] font-bold text-slate-500">°F</span>
                            </div>
                        ) : (
                            <span className="font-mono text-base font-bold">{displayedVitals.temperature || '--'} <span className="text-[10px]">°F</span></span>
                        )}
                        {tempStatus && <span className="text-[8px] font-black uppercase tracking-wider block mt-0.5">{tempStatus.label}</span>}
                    </div>
                    <div className={`p-2.5 rounded-lg border text-center transition-all ${pulseStatus?.color || 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Pulse</span>
                        {isEditable && viewMode !== 'VIEW' ? (
                            <div className="flex items-center justify-center space-x-1">
                                <input 
                                    type="text" 
                                    className="w-16 bg-white text-slate-800 text-center font-bold font-mono py-0.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500"
                                    value={formData.history.vitals?.pulse || ''}
                                    placeholder="72"
                                    onChange={e => updateFormVitals('pulse', e.target.value)}
                                />
                                <span className="text-[10px] font-bold text-slate-500">bpm</span>
                            </div>
                        ) : (
                            <span className="font-mono text-base font-bold">{displayedVitals.pulse || '--'} <span className="text-[10px]">bpm</span></span>
                        )}
                        {pulseStatus && <span className="text-[8px] font-black uppercase tracking-wider block mt-0.5">{pulseStatus.label}</span>}
                    </div>
                    <div className={`p-2.5 rounded-lg border text-center transition-all ${bpStatus?.color || 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Blood Pr</span>
                        {isEditable && viewMode !== 'VIEW' ? (
                            <input 
                                type="text" 
                                className="w-full bg-white text-slate-800 text-center font-bold font-mono py-0.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500"
                                value={formData.history.vitals?.bp || ''}
                                placeholder="120/80"
                                onChange={e => updateFormVitals('bp', e.target.value)}
                            />
                        ) : (
                            <span className="font-mono text-base font-bold">{displayedVitals.bp || '--'}</span>
                        )}
                        {bpStatus && <span className="text-[8px] font-black uppercase tracking-wider block mt-0.5">{bpStatus.label}</span>}
                    </div>
                    <div className={`p-2.5 rounded-lg border text-center transition-all ${respStatus?.color || 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Resp Rate</span>
                        {isEditable && viewMode !== 'VIEW' ? (
                            <input 
                                type="text" 
                                className="w-full bg-white text-slate-800 text-center font-bold font-mono py-0.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500"
                                value={formData.history.vitals?.respRate || ''}
                                placeholder="16"
                                onChange={e => updateFormVitals('respRate', e.target.value)}
                            />
                        ) : (
                            <span className="font-mono text-base font-bold">{displayedVitals.respRate || '--'}</span>
                        )}
                        {respStatus && <span className="text-[8px] font-black uppercase tracking-wider block mt-0.5">{respStatus.label}</span>}
                    </div>
                    <div className="p-2.5 rounded-lg border border-teal-100 bg-teal-50/50 text-center">
                        <span className="text-[9px] uppercase font-bold text-teal-600 block mb-0.5">Weight</span>
                        {isEditable && viewMode !== 'VIEW' ? (
                            <div className="flex items-center justify-center space-x-1">
                                <input 
                                    type="text" 
                                    className="w-16 bg-white text-teal-800 text-center font-bold font-mono py-0.5 border border-teal-300 rounded text-xs outline-none focus:border-teal-500"
                                    value={formData.history.vitals?.weight || ''}
                                    placeholder="70"
                                    onChange={e => updateFormVitals('weight', e.target.value)}
                                />
                                <span className="text-[10px] font-bold text-teal-600">kg</span>
                            </div>
                        ) : (
                            <span className="font-mono text-base font-bold text-teal-800">{displayedVitals.weight || '--'} <span className="text-[10px] text-teal-600">kg</span></span>
                         )}
                        <span className="text-[8px] font-black uppercase tracking-wider block mt-0.5 text-teal-500">Recorded</span>
                    </div>
                </div>
            </div>
            {(tempStatus?.label.includes('Alert') || pulseStatus?.label.includes('cardia') || bpStatus?.label.includes('tension')) && (
                <div className="mt-3 bg-red-50 border border-red-100 p-2 rounded-lg text-[10px] text-red-800 font-bold flex items-center animate-pulse">
                    ⚠️ Somatic Warning Indicators Detected! Please coordinate cardiovascular & temperature precautions under consultation.
                </div>
            )}
          </div>

          {/* MHQOL TREATMENT PROGRESS TRACKER */}
          <div className="card p-5 animate-fade-in flex flex-col justify-between">
             {clientQoLs.length < 2 ? (
                 <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs flex flex-col justify-center items-center h-full">
                     <span className="text-xl mb-1">📈</span>
                     <p className="font-bold text-slate-600 mb-1">MHQoL Assessment Trend Graph</p>
                     <p className="text-[11px]">Register at least 2 QoL assessments in the QoL Tab to unlock the therapeutic progress trend tracker.</p>
                 </div>
             ) : (
                 <div className="space-y-3">
                     <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                         <span className="uppercase tracking-wider">📈 Chronological MHQoL Assessment Progress</span>
                         <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                             Latest Score: {clientQoLs[clientQoLs.length - 1].totalScore}/21
                         </span>
                     </div>
                     <div className="h-24 w-full flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                               <defs>
                                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2"/>
                                         <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0"/>
                                    </linearGradient>
                               </defs>
                               {/* Fill area */}
                               <path
                                    d={`M 0 100 ${clientQoLs.map((r, i) => {
                                         const x = (i / (clientQoLs.length - 1)) * 500;
                                         const y = 90 - (r.totalScore / 21) * 70;
                                         return `L ${x} ${y}`;
                                    }).join(' ')} L 500 100 Z`}
                                    fill="url(#chartGrad)"
                               />
                               {/* Line path */}
                               <path
                                    d={clientQoLs.map((r, i) => {
                                         const x = (i / (clientQoLs.length - 1)) * 500;
                                         const y = 90 - (r.totalScore / 21) * 70;
                                         return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#0d9488"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                               />
                               {/* Dots */}
                               {clientQoLs.map((r, i) => {
                                    const x = (i / (clientQoLs.length - 1)) * 500;
                                    const y = 90 - (r.totalScore / 21) * 70;
                                    return (
                                        <g key={r.id}>
                                            <circle cx={x} cy={y} r="6" fill="#ffffff" stroke="#0d9488" strokeWidth="3" />
                                            <text x={x} y={y - 8} fill="#0d9488" fontSize="10" fontWeight="bold" textAnchor="middle">
                                                {r.totalScore}
                                            </text>
                                        </g>
                                    );
                               })}
                          </svg>
                     </div>
                     <div className="flex justify-between font-mono text-[9px] text-slate-400 pt-1.5 border-t">
                          <span>{new Date(clientQoLs[0].date).toLocaleDateString()} (Initial)</span>
                          <span>Therapeutic Progress Timeline ({clientQoLs.length} Assessments)</span>
                          <span>{new Date(clientQoLs[clientQoLs.length - 1].date).toLocaleDateString()} (Latest)</span>
                     </div>
                 </div>
             )}
          </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: FORM / DETAIL VIEW (3/4 width) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Header & Actions */}
          <div className="flex justify-between items-center card p-4">
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
                  <div className="ml-4">
                      <AICopilot buildPrompt={buildAIPrompt} />
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
                  <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 flex items-center disabled:opacity-70 transition-all">
                      {saveStatus === 'idle' && <><Save className="mr-2" size={18}/> Save Consultation</>}
                      {saveStatus === 'saving' && <><Loader2 className="mr-2 animate-spin" size={18}/> Saving...</>}
                      {saveStatus === 'saved' && <><CheckCircle className="mr-2" size={18}/> Saved!</>}
                  </button>
              )}
              
              {viewMode === 'EDIT' && isEditable && (
                  <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-orange-700 flex items-center disabled:opacity-70 transition-all">
                      {saveStatus === 'idle' && <><Save className="mr-2" size={18}/> Update Consultation</>}
                      {saveStatus === 'saving' && <><Loader2 className="mr-2 animate-spin" size={18}/> Updating...</>}
                      {saveStatus === 'saved' && <><CheckCircle className="mr-2" size={18}/> Updated!</>}
                  </button>
              )}
          </div>

          {/* Clinical History Section */}
          <div className={`card p-6 relative ${viewMode === 'VIEW' ? 'opacity-90 bg-slate-50' : ''}`}>
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
          <div className={`card p-6 relative ${viewMode === 'VIEW' ? 'opacity-90 bg-slate-50' : ''}`}>
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
        <div className="xl:col-span-1 card pt-4 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
            <div className="flex border-b border-slate-200 px-4 mb-4">
                <button 
                  onClick={() => setHistoryTab('Consultations')} 
                  className={`flex-1 font-bold text-sm pb-2 border-b-2 ${historyTab === 'Consultations' ? 'border-bwz-primary text-bwz-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Consultations
                </button>
                <button 
                  onClick={() => setHistoryTab('Prescriptions')} 
                  className={`flex-1 font-bold text-sm pb-2 border-b-2 ${historyTab === 'Prescriptions' ? 'border-bwz-primary text-bwz-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Prescriptions
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 px-4 pb-4 custom-scrollbar">
                {historyTab === 'Consultations' ? (
                    <>
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
                                    className={`p-3 rounded-lg border cursor-pointer transition-all text-sm group relative overflow-hidden ${isSelected ? 'bg-bwz-primary text-white border-bwz-primary shadow-md transform scale-[1.02]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm text-slate-700'}`}
                                >
                                    {isSelected && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-800 group-hover:text-bwz-primary transition-colors'}`}>{new Date(record.date).toLocaleDateString()}</span>
                                        <span className={`text-[10px] font-mono opacity-80 ${isSelected ? 'text-white' : 'text-slate-500'}`}>{new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className={`text-xs mb-2 truncate ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                                        {diag}
                                    </div>
                                    {/* Mini Risk Indicator in List */}
                                    {record.thoughtContent && (
                                        <div className={`text-[10px] flex items-center ${isSelected ? 'text-red-200' : 'text-red-500 font-bold group-hover:text-red-600'}`}>
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
                    </>
                ) : (
                    <>
                        {clientPrescriptions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic text-sm">
                                No prescriptions found.
                            </div>
                        ) : (
                            clientPrescriptions.map(rx => (
                                <div key={rx.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm mb-2">
                                    <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                                       <span className="font-bold text-slate-800">{new Date(rx.date || rx.id.split('-')[1]).toLocaleDateString()}</span>
                                       <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${rx.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>{rx.status || 'Pending'}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {rx.items && rx.items.map((d, i) => (
                                            <div key={i} className="text-xs">
                                                <span className="font-bold text-slate-700">{d.drugName}</span> <span className="text-slate-500 font-mono">({d.strength || d.dosage})</span> - <span className="text-slate-600 italic">{d.frequency} for {d.duration} {d.substitutionNote && <span className="text-orange-500">[{d.substitutionNote}]</span>}</span>
                                            </div>
                                        ))}
                                        {rx.specialRisks && (
                                            <div className="text-xs font-bold text-red-600 mt-2">
                                                {rx.specialRisks}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {showVitalsHistory && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center border-b pb-4 mb-4">
                      <h2 className="text-xl font-bold font-spectral text-bwz-primary flex items-center">
                          <Activity className="mr-2"/> Vitals History
                      </h2>
                      <button onClick={() => setShowVitalsHistory(false)} className="text-slate-500 hover:text-slate-800">
                          ✕
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                  <th className="p-3 font-bold text-slate-600">Date/Time</th>
                                  <th className="p-3 font-bold text-slate-600 text-center">Temp (°F)</th>
                                  <th className="p-3 font-bold text-slate-600 text-center">Pulse (bpm)</th>
                                  <th className="p-3 font-bold text-slate-600 text-center">Resp</th>
                                  <th className="p-3 font-bold text-slate-600 text-center">BP</th>
                                  <th className="p-3 font-bold text-slate-600 text-center">Weight (kg)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {client.vitals && (
                                  <tr className="bg-teal-50 border-b-2 border-teal-100">
                                      <td className="p-3 text-xs font-bold text-teal-800">
                                          Current (Latest)
                                      </td>
                                      <td className="p-3 text-center">{client.vitals.temperature || '--'}</td>
                                      <td className="p-3 text-center">{client.vitals.pulse || '--'}</td>
                                      <td className="p-3 text-center">{client.vitals.respRate || '--'}</td>
                                      <td className="p-3 text-center font-mono">{client.vitals.bp || '--'}</td>
                                      <td className="p-3 text-center">{client.vitals.weight || '--'}</td>
                                  </tr>
                              )}
                              {clientHistories.filter(h => h.vitals).length === 0 && !client.vitals ? (
                                  <tr>
                                      <td colSpan={6} className="p-4 text-center text-slate-500 italic">No vitals history recorded for this patient.</td>
                                  </tr>
                              ) : (
                                  clientHistories.filter(h => h.vitals).map(h => (
                                      <tr key={h.id} className="hover:bg-slate-50">
                                          <td className="p-3 text-xs font-bold text-slate-700">
                                              {new Date(parseInt(h.id.split('-')[1] || '0')).toLocaleString()}
                                          </td>
                                          <td className="p-3 text-center">{h.vitals?.temperature || '--'}</td>
                                          <td className="p-3 text-center">{h.vitals?.pulse || '--'}</td>
                                          <td className="p-3 text-center">{h.vitals?.respRate || '--'}</td>
                                          <td className="p-3 text-center font-mono">{h.vitals?.bp || '--'}</td>
                                          <td className="p-3 text-center">{h.vitals?.weight || '--'}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PatientDashboard;