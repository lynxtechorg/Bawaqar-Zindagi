
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { PrescriptionItem, PatientStatus, DrugCategory } from '../types';
import PatientDashboard from './PatientDashboard';
import MHQoLAssessment from './MHQoLAssessment';
import { ArrowLeft, Stethoscope, AlertTriangle, FileText, Activity, Search, Plus, StickyNote, Calculator, Clock, CheckCircle, Menu, X, Users, ClipboardList } from 'lucide-react';

const DoctorView: React.FC = () => {
  const { clients, inventory, addPrescription, updateClientStatus, getDrugSuggestions, addProgressNote, patientQueue, updateQueueStatus, removeFromQueue, addToQueue } = useData();
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notes' | 'prescribe' | 'qol'>('dashboard');
  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false); // New Toggle State
  
  // Prescription State
  const [rxType, setRxType] = useState<'Inventory' | 'Text'>('Inventory'); // NEW TOGGLE
  const [prescriptionText, setPrescriptionText] = useState(''); // NEW TEXT STATE
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem[]>([]);
  const [rxForm, setRxForm] = useState({ 
      drugId: '', 
      targetDosage: '', // User Typed Dosage (e.g. 10mg)
      freq: 'OD', 
      durationValue: 1,
      durationUnit: 'Weeks',
      qty: 0, // Calculated
      autoCalc: true,
      morning: 1,
      afternoon: 0,
      evening: 0,
      night: 0
  });
  const [specialRisks, setSpecialRisks] = useState(''); // NEW FIELD
  const [selectedCategory, setSelectedCategory] = useState<DrugCategory | 'All'>('All');
  const [noteInput, setNoteInput] = useState('');

  // Queue Handling
  const waitingPatients = patientQueue.filter(q => q.status !== 'Completed');

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredInventory = selectedCategory === 'All' 
    ? inventory 
    : inventory.filter(d => d.category === selectedCategory);

  // AUTOMATIC DOSAGE CALCULATION EFFECT
  useEffect(() => {
     if(!rxForm.drugId || !rxForm.autoCalc) return;
     
     const drug = inventory.find(d => d.id === rxForm.drugId);
     if (!drug) return;

     // If using manual frequency inputs, calculate total daily dose from them
     let dosesPerDay = rxForm.morning + rxForm.afternoon + rxForm.evening + rxForm.night;
     
     // If freq is standard, override manual inputs (only if user hasn't manually edited them recently - tricky)
     // Instead, let's make the dropdown drive the inputs, and inputs drive the total.
     
     let totalDays = rxForm.durationValue;
     if (rxForm.durationUnit === 'Weeks') totalDays *= 7;
     if (rxForm.durationUnit === 'Months') totalDays *= 30;
     if (rxForm.durationUnit === 'Next 6 Months') totalDays = 180;

     // Calculate pills based on strength if needed, but usually 1+0+1 means 1 pill + 0 pills + 1 pill
     // So we just sum the daily count.
     // However, if targetDosage is different from strength, we might need to adjust.
     // Let's assume 1+0+1 refers to *units* (tablets/capsules).
     
     const totalQty = Math.ceil(dosesPerDay * totalDays);
     
     setRxForm(prev => ({ ...prev, qty: totalQty }));

  }, [rxForm.drugId, rxForm.morning, rxForm.afternoon, rxForm.evening, rxForm.night, rxForm.durationValue, rxForm.durationUnit, inventory, rxForm.autoCalc]);

  // Update manual inputs when dropdown changes
  const handleFreqChange = (val: string) => {
      let m=0, a=0, e=0, n=0;
      switch(val) {
          case 'OD': m=1; break;
          case 'BD': m=1; n=1; break;
          case 'TDS': m=1; a=1; n=1; break; // or m=1, e=1, n=1? usually 1-1-1
          case 'QID': m=1; a=1; e=1; n=1; break;
          case 'HS': n=1; break;
          case 'SOS': break; // 0
      }
      setRxForm(prev => ({ ...prev, freq: val, morning: m, afternoon: a, evening: e, night: n }));
  };

  const handleRxAdd = () => {
    const drug = inventory.find(d => d.id === rxForm.drugId);
    if (!drug) return;
    
    if (drug.currentStock < rxForm.qty) {
       alert(`CRITICAL: Stock Insufficient. Need ${rxForm.qty}, have ${drug.currentStock}.`);
       return;
    }

    const cost = drug.costPerUnit * rxForm.qty;
    const finalDosageString = rxForm.targetDosage || drug.strength;

    setCurrentPrescription([...currentPrescription, {
      drugId: drug.id, 
      drugName: drug.name,
      strength: drug.strength,
      dosage: finalDosageString, 
      frequency: `${rxForm.morning}+${rxForm.afternoon}+${rxForm.evening}+${rxForm.night}`, // Store as 1+0+1+0
      duration: rxForm.durationUnit === 'Next 6 Months' ? 'Next 6 Months' : `${rxForm.durationValue} ${rxForm.durationUnit}`, 
      quantityToDispense: rxForm.qty, 
      cost,
      substitutionNote: finalDosageString !== drug.strength 
         ? `Auto-Calc: ${finalDosageString} using ${drug.strength}`
         : undefined,
      freqDetail: {
          morning: rxForm.morning,
          afternoon: rxForm.afternoon,
          evening: rxForm.evening,
          night: rxForm.night
      }
    }]);
    
    setRxForm({ ...rxForm, drugId: '', targetDosage: '', qty: 0, morning: 1, afternoon: 0, evening: 0, night: 0, freq: 'OD' });
  };

  const handleSubmitRx = async () => {
    if (!selectedClient) return;
    
    // Validation
    if (rxType === 'Inventory' && currentPrescription.length === 0) {
        alert("Please add at least one medication.");
        return;
    }
    if (rxType === 'Text' && !prescriptionText.trim()) {
        alert("Please enter prescription details.");
        return;
    }

    const totalCost = rxType === 'Inventory' ? currentPrescription.reduce((sum, item) => sum + item.cost, 0) : 0;
    
    const res = await addPrescription({
      id: `RX-${Date.now()}`, 
      clientId: selectedClient.id, 
      clientName: selectedClient.name, 
      doctorId: 'DOC-CURRENT', 
      date: new Date().toISOString(), 
      items: rxType === 'Inventory' ? currentPrescription : [], 
      status: 'Pending', 
      totalCost,
      // If Text mode, use prescriptionText as specialRisks. If Inventory mode, use specialRisks input.
      specialRisks: rxType === 'Text' ? prescriptionText : specialRisks
    });
    
    if (res.success) {
       alert('Prescription Transmitted. Inventory Locked.');
       setCurrentPrescription([]);
       setPrescriptionText('');
       setSpecialRisks('');
       setActiveTab('dashboard');
    } else {
       alert(res.msg);
    }
  };

  const handleSaveNote = async () => {
    if(selectedClientId && noteInput) {
      // Optimistic update handled in context, but let's ensure UI clears immediately
      const noteToSave = noteInput;
      setNoteInput(''); // Clear immediately for better UX
      
      try {
          await addProgressNote(selectedClientId, noteToSave);
          // Alert removed to reduce friction, maybe a toast? For now, just silent success or small indicator
      } catch (e) {
          setNoteInput(noteToSave); // Restore if failed
          alert("Failed to save note. Please try again.");
      }
    }
  };

  const selectPatientFromQueue = async (patientId: string, queueId: string) => {
      setSelectedClientId(patientId);
      await updateQueueStatus(queueId, 'In-Consultation');
      setShowMobileQueue(false); // Close drawer on mobile
  };

  const handleSelectPatient = async (clientId: string) => {
      setSelectedClientId(clientId);
      const qItem = patientQueue.find(q => q.patientId === clientId && q.status !== 'Completed');
      if (qItem) {
          if (qItem.status === 'Waiting') {
              await updateQueueStatus(qItem.id, 'In-Consultation');
          }
      } else {
          // If not in queue at all, add them directly as In-Consultation
          const client = clients.find(c => c.id === clientId);
          if (client) {
              const isNew = client.status === PatientStatus.NEW || client.progressNotes.length === 0;
              await addToQueue(clientId, isNew ? 'New' : 'Follow-up', undefined, 'In-Consultation');
          }
      }
  };

  const completeVisit = async () => {
      if(!selectedClientId) return;
      const qItem = patientQueue.find(q => q.patientId === selectedClientId);
      if(qItem) {
          await updateQueueStatus(qItem.id, 'Completed');
      }
      setSelectedClientId(null);
  };

  // MAIN LAYOUT
  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-64px)] relative">
        
        {/* MOBILE QUEUE TOGGLE */}
        <div className="md:hidden bg-white border-b border-slate-200 p-2 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center"><Clock size={14} className="mr-1"/> Waiting: {waitingPatients.length}</span>
            <button onClick={() => setShowMobileQueue(!showMobileQueue)} className="bg-bwz-primary text-white text-xs px-3 py-1 rounded font-bold flex items-center">
                {showMobileQueue ? <X size={14} className="mr-1"/> : <Users size={14} className="mr-1"/>}
                {showMobileQueue ? 'Close' : 'View Queue'}
            </button>
        </div>

        {/* SIDEBAR QUEUE - Responsive Drawer */}
        <div className={`
            fixed md:relative inset-0 md:inset-auto z-40 bg-white md:bg-transparent md:border-r md:border-slate-200 md:w-80 flex flex-col h-full transition-transform duration-300 transform
            ${showMobileQueue ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 flex items-center"><Clock className="mr-2 text-bwz-primary"/> Waiting Room</h2>
                <button onClick={() => setShowMobileQueue(false)} className="md:hidden text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-20 md:pb-2">
                {waitingPatients.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Waiting Room Empty</p>}
                {waitingPatients.map(q => (
                    <div 
                        key={q.id} 
                        onClick={() => selectPatientFromQueue(q.patientId, q.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedClientId === q.patientId ? 'border-bwz-primary bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-800 text-sm">{q.patientName}</h4>
                            <span className="text-xs font-mono text-slate-400">{q.arrivalTime}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${q.type === 'New' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{q.type}</span>
                            {q.status === 'In-Consultation' && <span className="text-[10px] text-bwz-primary font-bold animate-pulse">Consulting...</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* MAIN WORKSTATION */}
        <div className="flex-1 p-4 md:p-6 bg-slate-50 w-full h-auto md:h-full md:overflow-y-auto">
            {selectedClient ? (
                // PATIENT VIEW
                <div className="max-w-5xl mx-auto pb-20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                        <button onClick={() => setSelectedClientId(null)} className="flex items-center text-slate-500 hover:text-bwz-primary transition-colors font-medium text-sm">
                            <ArrowLeft className="mr-2" size={16} /> Back to Search
                        </button>
                        <button onClick={completeVisit} className="w-full md:w-auto bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-700 flex items-center justify-center">
                            <CheckCircle size={18} className="mr-2"/> Finish Consultation
                        </button>
                    </div>

                    {/* Patient Header */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="mb-4 md:mb-0">
                            <h1 className="text-2xl font-bold text-slate-800">{selectedClient.name}</h1>
                            <p className="text-sm text-slate-500">ID: {selectedClient.id} | Age: {selectedClient.age}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="text-left md:text-right w-full">
                                <p className="text-xs font-bold uppercase text-slate-500">Current Status</p>
                                <select className="w-full md:w-auto bg-white border border-slate-300 rounded p-1 font-bold text-slate-800" value={selectedClient.status} onChange={(e) => updateClientStatus(selectedClient.id, e.target.value as PatientStatus)}>
                                {Object.values(PatientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 md:space-x-2 mb-6 border-b border-slate-200 overflow-x-auto pb-1">
                        <button onClick={() => setActiveTab('dashboard')} className={`px-3 md:px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-bwz-primary text-white rounded-t-lg' : 'text-slate-500'}`}>Clinical Dashboard</button>
                        <button onClick={() => setActiveTab('qol')} className={`px-3 md:px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'qol' ? 'bg-bwz-primary text-white rounded-t-lg' : 'text-slate-500'}`}>QoL Assessment</button>
                        <button onClick={() => setActiveTab('notes')} className={`px-3 md:px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'notes' ? 'bg-bwz-primary text-white rounded-t-lg' : 'text-slate-500'}`}>Progress Notes</button>
                        <button onClick={() => setActiveTab('prescribe')} className={`px-3 md:px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'prescribe' ? 'bg-bwz-primary text-white rounded-t-lg' : 'text-slate-500'}`}>e-Prescribing</button>
                    </div>

                    {activeTab === 'dashboard' && <PatientDashboard client={selectedClient} isEditable={true} />}

                    {activeTab === 'qol' && <MHQoLAssessment clientId={selectedClient.id} />}

                    {activeTab === 'notes' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="col-span-1 bg-white p-6 rounded-xl shadow border border-slate-200 h-fit">
                                <h3 className="font-bold text-lg mb-4 flex items-center"><Plus className="mr-2"/> Add Note</h3>
                                <textarea className="w-full h-40 bg-white border border-slate-300 rounded p-3 mb-4 focus:ring-2 focus:ring-bwz-primary outline-none" placeholder="Enter clinical observations..." value={noteInput} onChange={e => setNoteInput(e.target.value)}></textarea>
                                <button onClick={handleSaveNote} className="w-full bg-slate-800 text-white py-2 rounded font-bold">Save Note</button>
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-4">
                                {selectedClient.progressNotes.length === 0 && <p className="text-slate-400 italic">No progress notes recorded.</p>}
                                {selectedClient.progressNotes.slice().reverse().map(note => (
                                <div key={note.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
                                    <div className="absolute top-4 right-4 text-xs text-slate-400 font-mono">{new Date(note.date).toLocaleString()}</div>
                                    <div className="flex items-center mb-2 text-bwz-primary font-bold"><StickyNote size={16} className="mr-2"/> {note.author}</div>
                                    <p className="text-slate-700 whitespace-pre-wrap">{note.note}</p>
                                </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'prescribe' && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                            {/* PRESCRIPTION TYPE TOGGLE */}
                            <div className="flex justify-center mb-6">
                                <div className="bg-slate-100 p-1 rounded-lg flex">
                                    <button 
                                        onClick={() => setRxType('Inventory')}
                                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${rxType === 'Inventory' ? 'bg-white text-bwz-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Inventory Medicine
                                    </button>
                                    <button 
                                        onClick={() => setRxType('Text')}
                                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${rxType === 'Text' ? 'bg-white text-bwz-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Text Prescription / Advice
                                    </button>
                                </div>
                            </div>

                            {rxType === 'Inventory' ? (
                                <>
                                    {/* Category Taskbar */}
                                    <div className="flex space-x-2 overflow-x-auto pb-4 mb-4 border-b border-slate-100">
                                        <button onClick={() => setSelectedCategory('All')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold ${selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>All Meds</button>
                                        {['Antipsychotic (Schizophrenia/Bipolar)', 'Antidepressant (Depression/Anxiety)', 'Mood Stabilizer (Bipolar)', 'Anxiolytic/Hypnotic (Anxiety/Sleep)', 'Supplement/General'].map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat as DrugCategory)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold ${selectedCategory === cat ? 'bg-bwz-primary text-white' : 'bg-slate-100 text-slate-600'}`}>{cat.split(' ')[0]}...</button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Form */}
                                        <div className="lg:col-span-7 space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Inventory Item</label>
                                            <select className="w-full bg-white border border-slate-300 rounded p-3 outline-none" value={rxForm.drugId} onChange={e => setRxForm({...rxForm, drugId: e.target.value})}>
                                            <option value="">-- Choose Drug --</option>
                                            {filteredInventory.map(d => (
                                                <option key={d.id} value={d.id} disabled={d.currentStock <= 0} className={d.currentStock <= 0 ? 'text-red-300' : ''}>
                                                    {d.name} | {d.strength} | {d.currentStock} in stock
                                                </option>
                                            ))}
                                            </select>
                                        </div>
                                        
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h4 className="text-blue-800 font-bold flex items-center mb-3 text-sm"><Calculator size={14} className="mr-2"/> Smart Dosage Calculator</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desired Dosage</label>
                                                    <input 
                                                        className="w-full bg-white border border-slate-300 rounded p-3 outline-none" 
                                                        value={rxForm.targetDosage} 
                                                        onChange={e => setRxForm({...rxForm, targetDosage: e.target.value})} 
                                                        placeholder="e.g. 10mg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequency Preset</label>
                                                    <select className="w-full bg-white border border-slate-300 rounded p-3 outline-none" value={rxForm.freq} onChange={e => handleFreqChange(e.target.value)}>
                                                    <option>OD</option><option>BD</option><option>TDS</option><option>QID</option><option>HS</option><option>SOS</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 bg-white p-3 rounded border border-blue-200">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Daily Schedule (Units)</label>
                                                <div className="grid grid-cols-4 gap-2 text-center">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Morn</span>
                                                        <input type="number" min="0" className="w-full border rounded p-2 text-center font-bold" value={rxForm.morning} onChange={e => setRxForm({...rxForm, morning: Number(e.target.value), freq: 'Custom'})} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Aftn</span>
                                                        <input type="number" min="0" className="w-full border rounded p-2 text-center font-bold" value={rxForm.afternoon} onChange={e => setRxForm({...rxForm, afternoon: Number(e.target.value), freq: 'Custom'})} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Eve</span>
                                                        <input type="number" min="0" className="w-full border rounded p-2 text-center font-bold" value={rxForm.evening} onChange={e => setRxForm({...rxForm, evening: Number(e.target.value), freq: 'Custom'})} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Night</span>
                                                        <input type="number" min="0" className="w-full border rounded p-2 text-center font-bold" value={rxForm.night} onChange={e => setRxForm({...rxForm, night: Number(e.target.value), freq: 'Custom'})} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div className="flex gap-2">
                                                    <input type="number" disabled={rxForm.durationUnit === 'Next 6 Months'} className="w-20 bg-white border border-slate-300 rounded p-3 disabled:bg-slate-100 disabled:text-slate-400" value={rxForm.durationUnit === 'Next 6 Months' ? 6 : rxForm.durationValue} onChange={e => setRxForm({...rxForm, durationValue: Number(e.target.value)})} />
                                                    <select className="flex-1 bg-white border border-slate-300 rounded p-3" value={rxForm.durationUnit} onChange={e => setRxForm({...rxForm, durationUnit: e.target.value})}>
                                                        <option>Days</option><option>Weeks</option><option>Months</option><option>Next 6 Months</option>
                                                    </select>
                                                </div>
                                                <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Quantity (Auto)</label>
                                                        <input type="number" readOnly className="w-full bg-slate-200 border border-slate-300 rounded p-3 outline-none font-bold text-slate-700" value={rxForm.qty} />
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={handleRxAdd} disabled={!rxForm.drugId || rxForm.qty <= 0} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50">Add to List</button>
                                        
                                        {/* SPECIAL RISKS FIELD (Item 9) */}
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <label className="block text-xs font-bold text-red-600 uppercase mb-1 flex items-center"><AlertTriangle size={12} className="mr-1"/> Special Investigation / Risks</label>
                                            <textarea 
                                                className="w-full bg-red-50 border border-red-200 rounded p-3 outline-none text-red-900 placeholder-red-300" 
                                                rows={2} 
                                                placeholder="Note any specific risks, investigation requirements, or critical warnings here..."
                                                value={specialRisks}
                                                onChange={e => setSpecialRisks(e.target.value)}
                                            />
                                        </div>
                                        
                                        </div>

                                        {/* Preview */}
                                        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Rx Preview</h3>
                                        {currentPrescription.length === 0 ? <p className="text-slate-400 italic text-center py-4">No items added.</p> : (
                                            <ul className="space-y-3 mb-6">
                                                {currentPrescription.map((item, i) => (
                                                <li key={i} className="bg-white p-3 rounded shadow-sm border border-slate-200 text-sm relative">
                                                    <div className="font-bold">{item.drugName}</div>
                                                    <div className="text-slate-500">{item.dosage} - {item.frequency} for {item.duration}</div>
                                                    {item.substitutionNote && <div className="text-xs text-orange-600 font-bold mt-1">{item.substitutionNote}</div>}
                                                    <div className="absolute top-3 right-3 font-mono font-bold">x{item.quantityToDispense}</div>
                                                    <button onClick={() => setCurrentPrescription(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 text-red-500 hover:text-red-700">x</button>
                                                </li>
                                                ))}
                                            </ul>
                                        )}
                                        {currentPrescription.length > 0 && (
                                            <button onClick={handleSubmitRx} className="w-full bg-bwz-primary text-white py-3 rounded-lg font-bold shadow-lg hover:bg-teal-700">Sign & Transmit</button>
                                        )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* TEXT ONLY MODE */
                                <div className="max-w-3xl mx-auto">
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                        <h3 className="font-bold text-slate-700 mb-4 flex items-center"><FileText className="mr-2"/> Prescription Details & Advice</h3>
                                        <textarea 
                                            className="w-full h-64 bg-white border border-slate-300 rounded-lg p-4 focus:ring-2 focus:ring-bwz-primary outline-none text-slate-700 leading-relaxed"
                                            placeholder="Enter medication details, dosage instructions, and medical advice here..."
                                            value={prescriptionText}
                                            onChange={e => setPrescriptionText(e.target.value)}
                                        />
                                        <div className="mt-6">
                                            <button onClick={handleSubmitRx} className="w-full bg-bwz-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex justify-center items-center">
                                                <CheckCircle className="mr-2"/> Sign & Transmit Prescription
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // EMPTY STATE / PATIENT SEARCH
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center"><Stethoscope className="mr-3 text-bwz-primary" /> Doctor's Workstation</h1>
                        <div className="flex items-center space-x-2 w-full md:w-auto">
                            <div className="relative w-full md:w-auto">
                                <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                                <input className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-bwz-primary bg-white w-full md:w-64" placeholder="Search Patients..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <p className="text-slate-500 text-sm">Select a patient from the Live Queue sidebar or search.</p>
                        <button 
                            onClick={() => setShowAllPatients(!showAllPatients)} 
                            className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${showAllPatients ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {showAllPatients ? 'Showing All Patients' : 'Showing Today\'s Patients'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients
                            .filter(c => {
                                // Search Filter
                                const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm);
                                if (!matchesSearch) return false;

                                // "Today" Filter
                                if (!showAllPatients && !searchTerm) {
                                    const isToday = new Date(c.lastVisitDate).toDateString() === new Date().toDateString();
                                    const isInQueue = patientQueue.some(q => q.patientId === c.id);
                                    return isToday || isInQueue;
                                }
                                return true;
                            })
                            .map(client => (
                            <div key={client.id} onClick={() => handleSelectPatient(client.id)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg transition-all group border-l-4 hover:border-l-bwz-primary relative overflow-hidden" style={{ borderLeftColor: client.status === PatientStatus.RELAPSE ? '#ef4444' : undefined }}>
                                {client.isLegacy && (
                                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl shadow-sm">
                                        LEGACY
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800">{client.name}</h3>
                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold uppercase tracking-wider">{client.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-4">{client.id} • {client.age}y • {client.gender}</p>
                                <div className="flex justify-between items-center text-xs font-mono text-slate-400 pt-3 border-t border-slate-50">
                                <span>Last: {new Date(client.lastVisitDate).toLocaleDateString()}</span>
                                {client.riskProfile.suicidalIdeation && <span className="text-red-600 font-bold flex items-center"><AlertTriangle size={12} className="mr-1"/> Risk</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default DoctorView;
