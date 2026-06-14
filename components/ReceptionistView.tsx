
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Gender, PatientStatus, ReferenceSource, ClientProfile } from '../types';
import { Plus, Users, MapPin, Search, CheckCircle, Navigation, Edit, Save, ArrowRight, History, Activity, Loader2, RefreshCw, Clock, X, Trash } from 'lucide-react';

const ReceptionistView: React.FC = () => {
  const { addClient, updateClientProfile, deleteClient, locations, clients, addToQueue, patientQueue, refreshData, histories, saveConsultation } = useData();
  const { organization } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'register' | 'lookup'>('register');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registration Layout Stepper State
  const [formStep, setFormStep] = useState(1);

  // Advanced Lookup Filtering States
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'All' | 'High Risk' | 'Normal'>('All');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'All' | 'Male' | 'Female' | 'Other'>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | 'Active' | 'Discharged'>('All');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Legacy Logic
  const [isLegacy, setIsLegacy] = useState(false);
  const [legacyDate, setLegacyDate] = useState('');
  
  // Address Search State
  const [addressSearch, setAddressSearch] = useState('');
  const [showAddressResults, setShowAddressResults] = useState(false);

  const initialFormState = {
    name: '', cnic: '', age: '', gender: Gender.MALE, religion: '', sect: '', maritalStatus: 'Single',
    contact: '', 
    // New Address Fields
    area: '', sectorBlock: '', street: '', 
    // Reference Fields
    referenceSource: 'Marketing' as ReferenceSource, referenceDetail: '',
    familyType: 'Nuclear', education: '', employmentStatus: 'Unemployed', emergency: '',
    // Vitals
    temperature: '', pulse: '', respRate: '', bp: '', weight: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Dynamic Validation Logic
  const isRequired = (field: string) => {
    // COP: All info fields non mandatory
    if (organization === 'COP') return false;
    
    // BWZ: Phone & CNIC non mandatory
    if (organization === 'BWZ') {
       if (field === 'cnic' || field === 'contact') return false;
       return true; // Name, Age, Emergency etc are required
    }
    
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // VALIDATION: Check Legacy Date
    if (isLegacy && !legacyDate) {
        alert("Please select a Registration Date for the Legacy Patient.");
        return;
    }

    setIsSubmitting(true);

    // Construct full address
    const fullAddress = `${formData.street}, ${formData.sectorBlock}, ${formData.area}, Karachi`;

    const commonData = {
        cnic: formData.cnic,
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        religion: formData.religion,
        sect: formData.sect,
        maritalStatus: formData.maritalStatus as any,
        contact: formData.contact,
        
        area: formData.area,
        street: formData.street, // Save raw street for better editing
        address: fullAddress,
        sectorBlock: formData.sectorBlock,
        
        referenceSource: formData.referenceSource,
        referenceDetail: formData.referenceDetail,

        familyType: formData.familyType as any,
        education: formData.education,
        employmentStatus: formData.employmentStatus,
        emergencyContact: formData.emergency,
        lastVisitDate: new Date().toISOString(),
        
        // Vitals
        vitals: {
            temperature: formData.temperature,
            pulse: formData.pulse,
            respRate: formData.respRate,
            bp: formData.bp,
            weight: formData.weight
        }
    };

    if (isEditing && editingId) {
          // UPDATE EXISTING
          const original = clients.find(c => c.id === editingId);
          if (original) {
              const res = await updateClientProfile({
                 ...original,
                 ...commonData,
                 // Ensure organization doesn't change implicitly
                 organization: organization! 
              });
              
              if (res.success) {
                 resetForm();
                 setActiveTab('lookup'); // Switch to view updated list
              } else {
                 alert(res.msg);
              }
          }
    } else {
          // CREATE NEW
          const res = await addClient({
            ...commonData,
            status: isLegacy ? PatientStatus.FOLLOW_UP : PatientStatus.NEW,
            riskProfile: { suicidalIdeation: false, homicidalIntent: false, lastAssessmentDate: '', safetyPlanGenerated: false },
            exitPlanEligible: false,
            totalSpend: 0,
            progressNotes: []
          }, isLegacy, legacyDate);
          
          if (res.success) {
            // Automatically switch to list and refresh
            resetForm();
            setActiveTab('lookup');
          } else {
            alert(res.msg);
          }
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
      setFormData(initialFormState);
      setAddressSearch('');
      setIsEditing(false);
      setEditingId(null);
      setIsLegacy(false);
      setLegacyDate('');
      setFormStep(1);
  };

  const handleEditClick = (client: ClientProfile) => {
     // Smart Address Parsing: Use stored fields if available, otherwise try to parse string
     const parts = client.address.split(', ');
     const street = client.street || parts[0] || '';
     const sec = client.sectorBlock || parts[1] || '';
     
     setFormData({
        name: client.name,
        cnic: client.cnic,
        age: client.age.toString(),
        gender: client.gender,
        religion: client.religion,
        sect: client.sect,
        maritalStatus: client.maritalStatus,
        contact: client.contact,
        area: client.area,
        sectorBlock: sec,
        street: street,
        referenceSource: client.referenceSource,
        referenceDetail: client.referenceDetail || '',
        familyType: client.familyType,
        education: client.education,
        employmentStatus: client.employmentStatus || 'Unemployed',
        emergency: client.emergencyContact,
        // Load Vitals
        temperature: client.vitals?.temperature || '',
        pulse: client.vitals?.pulse || '',
        respRate: client.vitals?.respRate || '',
        bp: client.vitals?.bp || '',
        weight: client.vitals?.weight || ''
     });
     setAddressSearch(client.area);
     setIsEditing(true);
     setEditingId(client.id);
     setActiveTab('register');
     setFormStep(1);
     window.scrollTo(0, 0);
  };

  const selectAddress = (addr: string) => {
      setAddressSearch(addr);
      setFormData({ ...formData, area: addr, sectorBlock: '', street: '' }); 
      setShowAddressResults(false);
  };

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await refreshData();
      setIsRefreshing(false);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null);

  const handleDeleteClient = async (id: string, name: string) => {
      setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
      if (!deleteConfirm) return;
      const res = await deleteClient(deleteConfirm.id);
      if (res.success) {
          await refreshData();
      } else {
          console.error(res.msg);
          alert("Failed to delete patient: " + res.msg);
      }
      setDeleteConfirm(null);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.cnic.includes(searchTerm) || 
                          c.id.includes(searchTerm);
    const matchesGender = selectedGenderFilter === 'All' || c.gender === selectedGenderFilter;
    const matchesStatus = selectedStatusFilter === 'All' || c.status === selectedStatusFilter;
    const isHighRisk = !!(c.riskProfile?.suicidalIdeation || c.riskProfile?.homicidalIntent);
    const matchesRisk = selectedRiskFilter === 'All' || 
                        (selectedRiskFilter === 'High Risk' ? isHighRisk : !isHighRisk);
    return matchesSearch && matchesGender && matchesStatus && matchesRisk;
  });

  // Check-In Modal State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInClient, setCheckInClient] = useState<ClientProfile | null>(null);
  const [checkInType, setCheckInType] = useState<'New' | 'Follow-up'>('Follow-up');
  const [checkInVitals, setCheckInVitals] = useState({
      temperature: '',
      pulse: '',
      respRate: '',
      bp: '',
      weight: ''
  });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showCheckInVitalsHistory, setShowCheckInVitalsHistory] = useState(false);

  const openCheckIn = (client: ClientProfile) => {
      setCheckInClient(client);
      // Auto-detect type
      const isNew = client.status === PatientStatus.NEW || (client.progressNotes || []).length === 0;
      setCheckInType(isNew ? 'New' : 'Follow-up');
      setCheckInVitals({
          temperature: client.vitals?.temperature || '',
          pulse: client.vitals?.pulse || '',
          respRate: client.vitals?.respRate || '',
          bp: client.vitals?.bp || '',
          weight: client.vitals?.weight || ''
      });
      setShowCheckInModal(true);
  };

  const confirmCheckIn = async () => {
      if (!checkInClient) return;
      setIsCheckingIn(true);
      
      try {
          // Save vitals specifically so they are updated and reflected immediately on doctor's dashboard view
          const vitals = {
              temperature: checkInVitals.temperature,
              pulse: checkInVitals.pulse,
              respRate: checkInVitals.respRate,
              bp: checkInVitals.bp,
              weight: checkInVitals.weight
          };
          
          const updatedClient = {
              ...checkInClient,
              vitals
          };
          const profileRes = await updateClientProfile(updatedClient);
          
          if (!profileRes.success) {
              alert("Failed to update patient vitals: " + profileRes.msg);
          } else {
              // Log vitals historically
              if (vitals.temperature || vitals.pulse || vitals.respRate || vitals.bp || vitals.weight) {
                  const checkInHistory = {
                      id: '',
                      clientId: checkInClient.id,
                      diagnosis: 'Triage Check-In',
                      chiefComplaints: 'Vitals captured during check-in.',
                      durationOfIllness: '',
                      familyHistory: '',
                      pastPsychMedicalHistory: '',
                      substanceAbuseHistory: '',
                      vitals: vitals
                  };
                  
                  const blankMse = {
                      id: '',
                      clientId: checkInClient.id,
                      date: new Date().toISOString(),
                      appearance: '',
                      behavior: '',
                      speech: '',
                      mood: '',
                      affect: '',
                      thoughtProcess: '',
                      thoughtContent: '',
                      perceptualDisturbances: '',
                      cognition: '',
                      insight: 5,
                      judgment: ''
                  };
                  
                  await saveConsultation(checkInHistory, blankMse);
              }
          }
          
          await addToQueue(checkInClient.id, checkInType, undefined, 'Waiting', checkInClient.name);
          setShowCheckInModal(false);
          setCheckInClient(null);
      } catch (err: any) {
          console.error("Check-in error:", err);
          alert("An error occurred during check-in: " + err.message);
      } finally {
          setIsCheckingIn(false);
      }
  };

  // Queue Segmentation
  const waitingList = patientQueue.filter(q => q.status === 'Waiting');
  const inConsultationList = patientQueue.filter(q => q.status === 'In-Consultation');
  const completedList = patientQueue.filter(q => q.status === 'Completed');

  // Helper for table view (legacy support until refactor)
  const isInQueue = (id: string) => patientQueue.some(q => q.patientId === id && q.status !== 'Completed');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 h-auto min-h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] md:overflow-y-auto">
      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 no-print bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-full md:w-fit">
        <button type="button" onClick={() => { setActiveTab('register'); resetForm(); }} className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'register' ? 'bg-bwz-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Plus size={20} /> <span>{isEditing ? 'Edit Details' : 'New Registration'}</span>
        </button>
        <button type="button" onClick={() => setActiveTab('lookup')} className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'lookup' ? 'bg-bwz-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Search size={20} /> <span>Lookup & Queue</span>
        </button>
      </div>

      {/* CHECK-IN MODAL */}
      {showCheckInModal && checkInClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-bwz-primary p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg flex items-center"><Clock className="mr-2"/> Patient Check-In</h3>
                      <button onClick={() => setShowCheckInModal(false)} className="hover:bg-white/20 p-1 rounded"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                          <p className="text-xs text-slate-500 uppercase font-bold">Patient</p>
                          <p className="font-bold text-lg text-slate-800">{checkInClient.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{checkInClient.id}</p>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Visit Type</label>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                  onClick={() => setCheckInType('New')}
                                  className={`p-3 rounded-lg border font-bold text-sm transition-all ${checkInType === 'New' ? 'bg-green-100 border-green-500 text-green-800 ring-2 ring-green-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                  New Visit
                              </button>
                              <button 
                                  onClick={() => setCheckInType('Follow-up')}
                                  className={`p-3 rounded-lg border font-bold text-sm transition-all ${checkInType === 'Follow-up' ? 'bg-blue-100 border-blue-500 text-blue-800 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                  Follow-up
                              </button>
                          </div>
                      </div>

                      {/* Triage Vitals */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <p>Triage Vitals (Optional)</p>
                              <button onClick={() => setShowCheckInVitalsHistory(true)} className="text-teal-600 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                                  View History
                              </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temp (°F)</label>
                                  <input 
                                      type="text" 
                                      value={checkInVitals.temperature}
                                      onChange={(e) => setCheckInVitals({ ...checkInVitals, temperature: e.target.value })}
                                      placeholder="98.6"
                                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pulse (bpm)</label>
                                  <input 
                                      type="text" 
                                      value={checkInVitals.pulse}
                                      onChange={(e) => setCheckInVitals({ ...checkInVitals, pulse: e.target.value })}
                                      placeholder="72"
                                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blood Pressure</label>
                                  <input 
                                      type="text" 
                                      value={checkInVitals.bp}
                                      onChange={(e) => setCheckInVitals({ ...checkInVitals, bp: e.target.value })}
                                      placeholder="120/80"
                                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resp Rate</label>
                                  <input 
                                      type="text" 
                                      value={checkInVitals.respRate}
                                      onChange={(e) => setCheckInVitals({ ...checkInVitals, respRate: e.target.value })}
                                      placeholder="18"
                                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                                  />
                              </div>
                              <div className="col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Weight (kg)</label>
                                  <input 
                                      type="text" 
                                      value={checkInVitals.weight}
                                      onChange={(e) => setCheckInVitals({ ...checkInVitals, weight: e.target.value })}
                                      placeholder="70"
                                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                                  />
                              </div>
                          </div>
                      </div>

                      <button onClick={confirmCheckIn} disabled={isCheckingIn} className="w-full bg-bwz-primary text-white py-3 rounded-lg font-bold shadow-lg hover:bg-teal-700 transition-all flex justify-center items-center disabled:opacity-50">
                          {isCheckingIn ? <><Loader2 className="mr-2 animate-spin" size={18}/> Checking In...</> : <><CheckCircle className="mr-2" size={18}/> Confirm Check-In</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showCheckInVitalsHistory && checkInClient && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center border-b pb-4 mb-4">
                      <h2 className="text-xl font-bold font-spectral text-bwz-primary flex items-center">
                          <Activity className="mr-2"/> Vitals History for {checkInClient.name}
                      </h2>
                      <button onClick={() => setShowCheckInVitalsHistory(false)} className="text-slate-500 hover:text-slate-800">
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
                              {checkInClient.vitals && (
                                  <tr className="bg-teal-50 border-b-2 border-teal-100">
                                      <td className="p-3 text-xs font-bold text-teal-800">
                                          Current (Latest)
                                      </td>
                                      <td className="p-3 text-center">{checkInClient.vitals.temperature || '--'}</td>
                                      <td className="p-3 text-center">{checkInClient.vitals.pulse || '--'}</td>
                                      <td className="p-3 text-center">{checkInClient.vitals.respRate || '--'}</td>
                                      <td className="p-3 text-center font-mono">{checkInClient.vitals.bp || '--'}</td>
                                      <td className="p-3 text-center">{checkInClient.vitals.weight || '--'}</td>
                                  </tr>
                              )}
                              {histories.filter(h => h.clientId === checkInClient.id && h.vitals).length === 0 && !checkInClient.vitals ? (
                                  <tr>
                                      <td colSpan={6} className="p-4 text-center text-slate-500 italic">No vitals history recorded for this patient.</td>
                                  </tr>
                              ) : (
                                  histories.filter(h => h.clientId === checkInClient.id && h.vitals).sort((a,b) => b.id.localeCompare(a.id)).map(h => (
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

      {activeTab === 'register' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 md:p-8">
          <div className="flex justify-between items-center border-b pb-4 mb-6">
             <h2 className="text-xl md:text-2xl font-bold text-bwz-primary">{isEditing ? `Editing: ${editingId}` : 'Patient Intake'}</h2>
             {isEditing && <button type="button" onClick={resetForm} className="text-sm text-red-500 hover:underline">Cancel</button>}
          </div>

          {/* STEP INDICATOR HEADER (Upgrade 2) */}
          <div className="mb-8 border-b pb-6">
              <div className="flex items-center justify-between max-w-lg mx-auto">
                  {[
                      { num: 1, name: "Core Identity" },
                      { num: 2, name: "Socio-Referral" },
                      { num: 3, name: "Contact & Triage" }
                  ].map((s) => (
                      <div key={s.num} className="flex flex-col items-center flex-1 relative">
                          <button
                              type="button"
                              onClick={() => {
                                  setFormStep(s.num);
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                                  formStep === s.num
                                      ? "bg-bwz-primary text-white border-bwz-primary ring-4 ring-teal-500/20 shadow-md transform scale-110"
                                      : formStep > s.num
                                      ? "bg-emerald-500 border-emerald-500 text-white animate-fade-in"
                                      : "bg-slate-50 border-slate-300 text-slate-500"
                              }`}
                          >
                              {s.num}
                          </button>
                          <span className={`text-[11px] font-bold mt-2 ${formStep === s.num ? "text-bwz-primary font-black" : "text-slate-500"}`}>
                              {s.name}
                          </span>
                      </div>
                  ))}
              </div>
          </div>
          
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Legacy Checkbox */}
            {formStep === 1 && !isEditing && (
                <div className="md:col-span-3 bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
                    <div className="flex items-center">
                        <History className="text-yellow-700 mr-3"/>
                        <div>
                            <h4 className="font-bold text-yellow-800">Legacy Patient / Offline Record?</h4>
                            <p className="text-xs text-yellow-700">Check if registered BEFORE system existed.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 rounded" checked={isLegacy} onChange={e => setIsLegacy(e.target.checked)} />
                            <span className="ml-2 font-bold text-slate-700 text-sm">Legacy</span>
                        </label>
                        {isLegacy && (
                            <input 
                                type="date" 
                                required={isLegacy}
                                className="border border-yellow-400 rounded p-2 text-sm bg-white flex-1 md:flex-none" 
                                value={legacyDate} 
                                onChange={e => setLegacyDate(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* STEP 1: Core Identity */}
            {formStep === 1 && (
                <div className="md:col-span-3 space-y-6 animate-fade-in">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-wider">Demographics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Full Name {isRequired('name') && '*'}</label>
                                <input required={isRequired('name')} className="w-full bg-white border border-slate-300 rounded p-3 text-slate-800 font-bold focus:ring-2 focus:ring-teal-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Gender</label>
                                <select className="w-full bg-white border border-slate-300 rounded p-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})}>
                                  <option value={Gender.MALE}>Male</option>
                                  <option value={Gender.FEMALE}>Female</option>
                                  <option value={Gender.OTHER}>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Age {isRequired('age') && '*'}</label>
                                <input required={isRequired('age')} type="number" className="w-full bg-white border border-slate-300 rounded p-3 text-slate-800 font-mono focus:ring-2 focus:ring-teal-500 outline-none" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">CNIC {isRequired('cnic') && '*'}</label>
                                <input 
                                    required={isRequired('cnic')} 
                                    placeholder="42201-xxxxxxx-x" 
                                    className="w-full bg-white border border-slate-300 rounded p-3 text-slate-800 font-mono focus:ring-2 focus:ring-teal-500 outline-none" 
                                    value={formData.cnic} 
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                                        let formatted = '';
                                        if (digits.length > 0) {
                                            formatted += digits.slice(0, 5);
                                        }
                                        if (digits.length > 5) {
                                            formatted += '-' + digits.slice(5, 12);
                                        }
                                        if (digits.length > 12) {
                                            formatted += '-' + digits.slice(12, 13);
                                        }
                                        setFormData({...formData, cnic: formatted});
                                    }} 
                                    maxLength={15}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: Socio-Referral */}
            {formStep === 2 && (
                <div className="md:col-span-3 space-y-6 animate-fade-in">
                    {/* Reference Source */}
                     <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-wider">Referral Source</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">How did you find us?</label>
                                <select className="w-full bg-white border border-slate-300 rounded p-3 outline-none" value={formData.referenceSource} onChange={e => setFormData({...formData, referenceSource: e.target.value as ReferenceSource})}>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Patient to Patient">Patient to Patient</option>
                                    <option value="Community">Community</option>
                                    <option value="MOU Partner">MOU Partner</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {formData.referenceSource === 'MOU Partner' && (
                                <div>
                                     <label className="text-xs font-bold text-slate-500 block mb-1">Partner Organization Name</label>
                                     <input placeholder="Enter Partner Name..." className="w-full bg-white border border-slate-300 rounded p-3" value={formData.referenceDetail} onChange={e => setFormData({...formData, referenceDetail: e.target.value})} />
                                </div>
                            )}
                        </div>
                     </div>

                    {/* Socio-Cultural */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                       <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-wider">Socio-Cultural</h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Religion</label>
                             <input className="w-full bg-white border border-slate-300 rounded p-3" value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Sect</label>
                             <input className="w-full bg-white border border-slate-300 rounded p-3" value={formData.sect} onChange={e => setFormData({...formData, sect: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Marital Status</label>
                             <select className="w-full bg-white border border-slate-300 rounded p-3 outline-none" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                               <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                             </select>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Education</label>
                             <input className="w-full bg-white border border-slate-300 rounded p-3" value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Employment Status</label>
                             <select className="w-full bg-white border border-slate-300 rounded p-3 outline-none" value={formData.employmentStatus} onChange={e => setFormData({...formData, employmentStatus: e.target.value})}>
                               <option>Unemployed</option>
                               <option>Employed</option>
                               <option>Self-Employed</option>
                               <option>Student</option>
                               <option>Retired</option>
                             </select>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Family Type</label>
                             <select className="w-full bg-white border border-slate-300 rounded p-3 outline-none" value={formData.familyType} onChange={e => setFormData({...formData, familyType: e.target.value as any})}>
                               <option>Nuclear</option>
                               <option>Extended</option>
                             </select>
                          </div>
                       </div>
                    </div>
                </div>
            )}

            {/* STEP 3: Contact & Triage */}
            {formStep === 3 && (
                <div className="md:col-span-3 space-y-6 animate-fade-in">
                    {/* Detailed Location & Contact */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                       <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-wider">Location & Contact</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Contact Number {isRequired('contact') && '*'}</label>
                             <input required={isRequired('contact')} className="w-full bg-white border border-slate-300 rounded p-3 text-slate-800 font-mono outline-none" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                          </div>
                          
                          {/* Smart Address Search */}
                          <div className="relative">
                              <label className="text-xs font-bold text-slate-500 flex items-center mb-1"><Navigation size={12} className="mr-1"/> Location Search</label>
                              <input 
                                 placeholder="Search Area..." 
                                 className="w-full bg-white border border-slate-300 rounded p-3 pl-10" 
                                 value={addressSearch}
                                 onChange={(e) => {
                                     setAddressSearch(e.target.value);
                                     setShowAddressResults(true);
                                 }}
                              />
                              <Search size={16} className="absolute left-3 top-10 text-slate-400" />
                              
                              {showAddressResults && addressSearch.length > 2 && (
                                  <div className="absolute z-10 bg-white border border-slate-300 shadow-xl rounded-b w-full mt-1 max-h-40 overflow-y-auto">
                                      {locations.filter(l => l.toLowerCase().includes(addressSearch.toLowerCase())).map(l => (
                                          <div key={l} onClick={() => selectAddress(l)} className="p-3 hover:bg-slate-100 cursor-pointer text-sm">
                                              {l}, Karachi
                                          </div>
                                      ))}
                                      <div onClick={() => selectAddress(addressSearch)} className="p-3 hover:bg-slate-100 cursor-pointer text-sm font-bold text-bwz-primary border-t">
                                          Use "{addressSearch}"
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-2">
                               <div>
                                   <label className="text-xs font-bold text-slate-500 block mb-1">Town / Area</label>
                                   <input placeholder="e.g. Gulshan-e-Iqbal" className="w-full bg-white border border-slate-300 rounded p-3 text-slate-800 font-semibold" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                               </div>
                               <div>
                                   <label className="text-xs font-bold text-slate-500 block mb-1">Block / Sector</label>
                                   <input placeholder="e.g. Block 13-D" className="w-full bg-white border border-slate-300 rounded p-3" value={formData.sectorBlock} onChange={e => setFormData({...formData, sectorBlock: e.target.value})} />
                               </div>
                               <div>
                                   <label className="text-xs font-bold text-slate-500 block mb-1">Street / House No</label>
                                   <input placeholder="e.g. House 123, St 5" className="w-full bg-white border border-slate-300 rounded p-3" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                               </div>
                          </div>

                          <div className="md:col-span-2">
                             <label className="text-xs font-bold text-slate-500 block mb-1">Emergency Contact {isRequired('emergency') && '*'}</label>
                             <input required={isRequired('emergency')} className="w-full bg-white border border-slate-300 rounded p-3 text-slate-800" value={formData.emergency} onChange={e => setFormData({...formData, emergency: e.target.value})} />
                          </div>
                       </div>
                    </div>

                    {/* Vitals Section */}
                    <div className="bg-teal-50 p-5 rounded-xl border border-teal-200">
                       <h3 className="font-bold text-teal-800 mb-4 uppercase text-xs tracking-wider flex items-center">
                          <Activity size={16} className="mr-2"/> Vitals / Triage
                       </h3>
                       <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Temp (°F)</label>
                             <input placeholder="98.6" className="w-full bg-white border border-teal-200 rounded p-3 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Pulse (bpm)</label>
                             <input placeholder="72" className="w-full bg-white border border-teal-200 rounded p-3 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500" value={formData.pulse} onChange={e => setFormData({...formData, pulse: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">BP (mmHg)</label>
                             <input placeholder="120/80" className="w-full bg-white border border-teal-200 rounded p-3 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500" value={formData.bp} onChange={e => setFormData({...formData, bp: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Resp Rate</label>
                             <input placeholder="16" className="w-full bg-white border border-teal-200 rounded p-3 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500" value={formData.respRate} onChange={e => setFormData({...formData, respRate: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs font-bold text-slate-500 block mb-1">Weight (kg)</label>
                             <input placeholder="e.g. 65" className="w-full bg-white border border-teal-200 rounded p-3 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                          </div>
                       </div>
                    </div>
                </div>
            )}

            {/* FOOTER NAV BUTTONS */}
            <div className="md:col-span-3 flex justify-between items-center border-t pt-6 bg-slate-50 -mx-4 md:-mx-8 p-6 md:p-8 mt-4 rounded-b-xl">
                <div>
                    {formStep > 1 && (
                        <button
                            type="button"
                            onClick={() => setFormStep(prev => prev - 1)}
                            className="bg-white border hover:bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-bold shadow-sm transition"
                        >
                            Back
                        </button>
                    )}
                </div>
                <div className="flex space-x-3">
                    {formStep < 3 ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (formStep === 1) {
                                    if (isRequired('name') && !formData.name) {
                                        alert("Please enter patient name.");
                                        return;
                                    }
                                    if (isRequired('age') && !formData.age) {
                                        alert("Please enter patient age.");
                                        return;
                                    }
                                }
                                setFormStep(prev => prev + 1);
                            }}
                            className="bg-bwz-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-700 transition flex items-center shadow-md active:scale-95"
                        >
                            Next Step <ArrowRight size={16} className="ml-2" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all text-base flex items-center ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-bwz-primary hover:bg-teal-700'} text-white disabled:opacity-50`}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : isEditing ? <Save className="mr-2"/> : <CheckCircle className="mr-2"/>}
                            {isSubmitting ? 'Processing...' : isEditing ? 'Save Changes' : 'Register Patient & Finish'}
                        </button>
                    )}
                </div>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'lookup' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 md:p-8">
           <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
             <div>
                 <h2 className="font-bold text-xl">Patient Database & Queue</h2>
                 <p className="text-xs text-slate-400">Manage triage and lookup historical records</p>
             </div>
             <div className="flex items-center space-x-2 w-full md:w-auto">
                 <input className="border p-2 rounded w-full md:w-64" placeholder="Search ID, Name or CNIC..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                 <button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-slate-100 hover:bg-slate-200 p-2 rounded text-slate-600 transition-colors" title="Refresh List">
                     <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''}/>
                 </button>
             </div>
           </div>
           
           {/* SEGMENTED QUEUE DASHBOARD */}
           <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* WAITING */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-80">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center"><Clock size={16} className="mr-2 text-orange-500"/> Waiting Room</h3>
                        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{waitingList.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {waitingList.length === 0 && <p className="text-center text-slate-400 text-xs mt-10 italic">No patients waiting.</p>}
                        {waitingList.map(q => (
                            <div key={q.id} className="bg-white p-3 rounded border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm text-slate-800">{q.patientName}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{q.arrivalTime}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${q.type === 'New' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{q.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* IN CONSULTATION */}
                <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-80 ring-1 ring-blue-100">
                    <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
                        <h3 className="font-bold text-blue-800 flex items-center"><Activity size={16} className="mr-2 text-blue-600 animate-pulse"/> In Consultation</h3>
                        <span className="bg-blue-200 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{inConsultationList.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {inConsultationList.length === 0 && <p className="text-center text-blue-300 text-xs mt-10 italic">Doctors are free.</p>}
                        {inConsultationList.map(q => (
                            <div key={q.id} className="bg-white p-3 rounded border border-blue-100 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm text-slate-800">{q.patientName}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{q.arrivalTime}</span>
                                </div>
                                <div className="mt-2 w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full w-2/3 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COMPLETED */}
                <div className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-80">
                    <div className="bg-green-50 p-3 border-b border-green-100 flex justify-between items-center">
                        <h3 className="font-bold text-green-800 flex items-center"><CheckCircle size={16} className="mr-2 text-green-600"/> Completed Today</h3>
                        <span className="bg-green-200 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{completedList.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {completedList.length === 0 && <p className="text-center text-slate-400 text-xs mt-10 italic">No completed visits yet.</p>}
                        {completedList.map(q => (
                            <div key={q.id} className="bg-white p-3 rounded border border-green-100 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm text-slate-600 line-through decoration-slate-300">{q.patientName}</span>
                                    <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">DONE</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
           </div>

           {/* ADVANCED LOOKUP SMART CHIPS FILTER TAB (Upgrade 6) */}
           <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-wrap gap-4 items-center justify-between">
               <div className="flex flex-wrap gap-3 items-center">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Smart Filters:</span>
                   
                   {/* Risk Filter */}
                   <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm">
                       <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 font-sans">Risk:</span>
                       {(['All', 'High Risk', 'Normal'] as const).map(rf => (
                           <button
                               key={rf}
                               type="button"
                               onClick={() => setSelectedRiskFilter(rf)}
                               className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${
                                   selectedRiskFilter === rf
                                       ? 'bg-rose-500 text-white shadow-sm'
                                       : 'text-slate-600 hover:bg-slate-100'
                               }`}
                           >
                               {rf}
                           </button>
                       ))}
                   </div>

                   {/* Gender Filter */}
                   <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm">
                       <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 font-sans">Gender:</span>
                       {(['All', 'Male', 'Female', 'Other'] as const).map(gf => (
                           <button
                               key={gf}
                               type="button"
                               onClick={() => setSelectedGenderFilter(gf)}
                               className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${
                                   selectedGenderFilter === gf
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:bg-slate-100'
                               }`}
                           >
                               {gf}
                           </button>
                       ))}
                   </div>

                   {/* Status Filter */}
                   <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm">
                       <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 font-sans font-sans">Status:</span>
                       {(['All', 'Active', 'Discharged'] as const).map(sf => (
                           <button
                               key={sf}
                               type="button"
                               onClick={() => setSelectedStatusFilter(sf)}
                               className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${
                                   selectedStatusFilter === sf
                                       ? 'bg-emerald-600 text-white shadow-sm'
                                       : 'text-slate-600 hover:bg-slate-100'
                               }`}
                           >
                               {sf}
                           </button>
                       ))}
                   </div>
               </div>

               <div className="text-xs text-slate-500 font-bold">
                   Showing <span className="text-slate-800 font-extrabold">{filteredClients.length}</span> patient{filteredClients.length === 1 ? '' : 's'}
               </div>
           </div>

           {filteredClients.length === 0 ? (
               <div className="text-center py-10 text-slate-400">
                   <Users size={48} className="mx-auto mb-2 opacity-20"/>
                   <p>No patients found. Add a new patient to get started.</p>
                   {searchTerm && <p className="text-xs mt-1">Try refreshing the list or clear search terms.</p>}
               </div>
           ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm min-w-[600px]">
                   <thead className="bg-slate-50 border-b">
                     <tr>
                       <th className="p-3">ID</th>
                       <th className="p-3">Name</th>
                       <th className="p-3 hidden md:table-cell">Reference</th>
                       <th className="p-3">Status</th>
                       <th className="p-3 text-center">Live Queue</th>
                       <th className="p-3 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                      {filteredClients.map(c => {
                          const queueItem = patientQueue.find(q => q.patientId === c.id && q.status !== 'Completed') || 
                                            patientQueue.find(q => q.patientId === c.id);
                          const isQueued = !!queueItem;
                          const isCompleted = queueItem?.status === 'Completed';
                          
                          return (
                            <tr key={c.id} className="border-b hover:bg-slate-50">
                              <td className="p-3 font-mono">{c.id}</td>
                              <td className="p-3 font-bold">{c.name}</td>
                              <td className="p-3 hidden md:table-cell">{c.referenceSource}</td>
                              <td className="p-3"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{c.status}</span></td>
                              <td className="p-3 text-center">
                                {isQueued ? (
                                    isCompleted ? (
                                        <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded flex items-center justify-center"><CheckCircle size={12} className="mr-1"/> Completed</span>
                                    ) : (
                                        <span className="text-orange-600 font-bold text-xs bg-orange-100 px-2 py-1 rounded flex items-center justify-center"><Clock size={12} className="mr-1"/> {queueItem?.status}</span>
                                    )
                                ) : (
                                    <button onClick={() => openCheckIn(c)} className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded hover:bg-slate-700 font-bold shadow-sm transition-all transform hover:scale-105">
                                        Check In
                                    </button>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col items-end space-y-2">
                                    <button onClick={() => handleEditClick(c)} className="text-blue-600 hover:text-blue-800 flex items-center justify-end w-full">
                                       <Edit size={14} className="mr-1"/> Edit
                                    </button>
                                    <button onClick={() => handleDeleteClient(c.id, c.name)} className="text-red-600 hover:text-red-800 flex items-center justify-end w-full">
                                       <Trash size={14} className="mr-1"/> Delete
                                    </button>
                                </div>
                              </td>
                            </tr>
                          );
                      })}
                   </tbody>
                 </table>
               </div>
           )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
                <h3 className="font-bold text-xl text-red-600 mb-2 flex items-center">
                    <Trash className="mr-2" /> Delete Patient
                </h3>
                <p className="text-slate-600 mb-6">
                    Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone and will remove all associated records.
                </p>
                <div className="flex space-x-3">
                    <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">
                        Yes, Delete
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-slate-200 text-slate-800 py-2 rounded-lg font-bold hover:bg-slate-300 transition">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistView;
