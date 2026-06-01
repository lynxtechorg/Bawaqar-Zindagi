

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Drug, DrugCategory, Prescription } from '../types';
import { Package, AlertTriangle, Search, Activity, Archive, DollarSign, Edit, Trash, Trash2, Plus, Printer, FileText, Star, CheckSquare, MessageSquare, MapPin, X, Receipt } from 'lucide-react';

const PharmacistView: React.FC = () => {
  const { organization, currentUser } = useAuth();
  const { prescriptions, dispensePrescription, inventory, getAlerts, restockInventory, manageInventory, getInventoryValuation, dispenseLogs, addPharmacyFeedback } = useData();
  const [activeTab, setActiveTab] = useState<'queue' | 'inventory' | 'logs'>('queue');
  
  // Inventory Form State
  const [isEditing, setIsEditing] = useState(false);
  // Extends Partial<Drug> to allow temporary expiry field
  const [drugForm, setDrugForm] = useState<Partial<Drug> & { expiryDate?: string }>({
    name: '', molecule: '', category: 'Supplement/General', strength: '', brand: '', currentStock: 0, reorderLevel: 50, unit: 'tablets', packetCost: 0, unitsPerPacket: 10, costPerUnit: 0, tags: [],
    manufacturer: '', rackLocation: '', formulation: 'Tablet', expiryDate: ''
  });

  const [logFilter, setLogFilter] = useState('');

  // FEEDBACK MODAL STATE
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRx, setFeedbackRx] = useState<Prescription | null>(null);
  const [feedbackData, setFeedbackData] = useState({
      doctorHelpful: true,
      instructionsClear: true,
      waitTimeAcceptable: true,
      staffPolite: true,
      rating: 5
  });

  // RECEIPT PRINT STATE
  const [printRx, setPrintRx] = useState<Prescription | null>(null);

  const alerts = getAlerts();
  const valuation = getInventoryValuation();

  const handleSaveDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    const costPerUnit = (drugForm.packetCost || 0) / (drugForm.unitsPerPacket || 1);
    
    // Create initial batch if this is a new drug/entry
    const currentBatches = drugForm.batches || [];
    if (drugForm.expiryDate && !isEditing) {
        currentBatches.push({
            batchId: `B-${Date.now()}`,
            expiryDate: drugForm.expiryDate,
            quantity: drugForm.currentStock || 0,
            costPrice: costPerUnit
        });
    }

    const newDrug: Drug = {
       id: drugForm.id || `D-${Date.now()}`,
       organization,
       name: drugForm.name!,
       molecule: drugForm.molecule!,
       category: drugForm.category as DrugCategory,
       strength: drugForm.strength!,
       brand: drugForm.brand!,
       currentStock: drugForm.currentStock || 0,
       reorderLevel: drugForm.reorderLevel || 50,
       unit: drugForm.unit || 'tablets',
       packetCost: drugForm.packetCost!,
       unitsPerPacket: drugForm.unitsPerPacket!,
       costPerUnit,
       tags: [],
       batches: currentBatches,
       manufacturer: drugForm.manufacturer || 'Generic',
       rackLocation: drugForm.rackLocation || 'General',
       formulation: drugForm.formulation as any || 'Tablet'
    };
    
    await manageInventory(isEditing ? 'UPDATE' : 'ADD', newDrug);
    setDrugForm({ name: '', molecule: '', category: 'Supplement/General', strength: '', brand: '', currentStock: 0, reorderLevel: 50, unit: 'tablets', packetCost: 0, unitsPerPacket: 10, costPerUnit: 0, tags: [], manufacturer: '', rackLocation: '', formulation: 'Tablet', expiryDate: '' });
    setIsEditing(false);
    alert('Inventory Updated Successfully');
  };

  const handleEdit = (drug: Drug) => {
    setDrugForm(drug);
    setIsEditing(true);
    setActiveTab('inventory');
    window.scrollTo(0,0);
  };

  const [deleteInventoryConfirm, setDeleteInventoryConfirm] = useState<Drug | null>(null);

  const handleDelete = async (drug: Drug) => {
    setDeleteInventoryConfirm(drug);
  };

  const confirmDeleteInventory = async () => {
    if (deleteInventoryConfirm) {
        await manageInventory('DELETE', deleteInventoryConfirm);
        setDeleteInventoryConfirm(null);
    }
  };

  const initiatePrint = (rx: Prescription) => {
     setPrintRx(rx);
  };

  const handleActualPrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(`
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; margin: 0; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .text-xs { font-size: 12px; }
                    .text-sm { font-size: 14px; }
                    .text-xl { font-size: 20px; }
                    .mb-1 { margin-bottom: 4px; }
                    .mb-2 { margin-bottom: 8px; }
                    .mb-4 { margin-bottom: 16px; }
                    .mb-6 { margin-bottom: 24px; }
                    .mt-1 { margin-top: 4px; }
                    .mt-2 { margin-top: 8px; }
                    .mt-4 { margin-top: 16px; }
                    .pt-4 { padding-top: 16px; }
                    .pb-2 { padding-bottom: 8px; }
                    .py-2 { padding-top: 8px; padding-bottom: 8px; }
                    .border-b { border-bottom: 1px solid #e2e8f0; }
                    .border-t { border-top: 1px solid #e2e8f0; }
                    .border-dashed { border-style: dashed; }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .uppercase { text-transform: uppercase; }
                    .tracking-widest { letter-spacing: 0.1em; }
                    .tracking-tight { letter-spacing: -0.025em; }
                    .text-slate-500 { color: #64748b; }
                    .text-slate-700 { color: #334155; }
                    .text-slate-900 { color: #0f172a; }
                    .text-slate-400 { color: #94a3b8; }
                    .w-full { width: 100%; }
                    .max-w-\\[80mm\\] { max-width: 80mm; }
                    .mx-auto { margin-left: auto; margin-right: auto; }
                    .leading-relaxed { line-height: 1.625; }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        doc.close();
        
        iframe.contentWindow?.focus();
        setTimeout(() => {
            try {
                iframe.contentWindow?.print();
            } catch (e) {
                console.error("Print failed", e);
            }
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        }, 100);
    }
  };

  const initiateDispense = (rx: Prescription) => {
      setFeedbackRx(rx);
      setFeedbackData({ doctorHelpful: true, instructionsClear: true, waitTimeAcceptable: true, staffPolite: true, rating: 5 });
      setShowFeedbackModal(true);
  };

  const finalizeDispense = async () => {
      if (!feedbackRx) return;
      
      await addPharmacyFeedback({
          date: new Date().toISOString(),
          clientId: feedbackRx.clientId,
          rxId: feedbackRx.id,
          questions: {
              doctorHelpful: feedbackData.doctorHelpful,
              instructionsClear: feedbackData.instructionsClear,
              waitTimeAcceptable: feedbackData.waitTimeAcceptable,
              staffPolite: feedbackData.staffPolite
          },
          rating: feedbackData.rating
      });

      const res = await dispensePrescription(feedbackRx.id);
      if (res.success) {
        if(res.alerts.length) console.warn(`Dispensed with Alerts: ${res.alerts.join(', ')}`);
        // Auto open print dialog after dispense
        const updatedRx = { ...feedbackRx, status: 'Dispensed' as const };
        initiatePrint(updatedRx);
      } else {
        console.error(`Failed: ${res.alerts.join(', ')}`);
      }

      setShowFeedbackModal(false);
      setFeedbackRx(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 h-auto min-h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] md:overflow-y-auto">
      {/* Tab Nav & Stats */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 no-print">
         <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setActiveTab('queue')} className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm md:text-base ${activeTab === 'queue' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Dispensing Queue</button>
            <button onClick={() => setActiveTab('inventory')} className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm md:text-base ${activeTab === 'inventory' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Inventory Master</button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm md:text-base ${activeTab === 'logs' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Dispense Logs</button>
         </div>
         <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-bold">Total Assets</p>
              <p className="text-lg md:text-xl font-mono font-bold text-slate-800">PKR {valuation.toLocaleString()}</p>
            </div>
            {alerts.length > 0 && <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">{alerts.length} Alerts</div>}
         </div>
      </div>

      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 gap-6">
             <div className="flex justify-between items-center no-print">
                <h2 className="font-bold text-lg text-slate-700">Pending Prescriptions</h2>
                <button onClick={() => window.location.reload()} className="text-xs text-slate-500 hover:text-orange-600 flex items-center">
                    <Activity size={12} className="mr-1"/> Refresh Queue
                </button>
             </div>
             {prescriptions.filter(p => p.status === 'Pending').length === 0 && <p className="text-slate-400 italic no-print">Queue is empty.</p>}
             {prescriptions.filter(p => p.status === 'Pending').map(rx => {
               const isTextRx = rx.items.length === 0;
               return (
               <div key={rx.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center print-card">
                 <div className="w-full">
                   <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-xl text-slate-800">{rx.clientName} <span className="text-sm font-normal text-slate-500">({rx.clientId})</span></h3>
                        <p className="font-mono text-xs text-slate-400">{new Date(rx.date).toLocaleString()}</p>
                   </div>
                   
                   {/* Only show Red Alert for Inventory Rx that have risks */}
                   {!isTextRx && rx.specialRisks && (
                       <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
                           <p className="text-xs font-bold text-red-600 uppercase flex items-center"><AlertTriangle size={12} className="mr-1"/> Special Instructions / Risks:</p>
                           <p className="text-red-900 text-sm mt-1">{rx.specialRisks}</p>
                       </div>
                   )}

                   <div className="mt-2 space-y-2">
                     {isTextRx ? (
                         <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                             <h4 className="font-bold text-slate-900 mb-2 flex items-center"><FileText size={14} className="mr-2"/> Prescription / Advice</h4>
                             {rx.specialRisks}
                         </div>
                     ) : (
                         rx.items.map((item, i) => (
                           <div key={i} className="text-sm text-slate-600 flex justify-between border-b border-dashed border-slate-100 pb-1">
                             <span><span className="font-bold">{item.drugName}</span> - {item.dosage} ({item.frequency})</span>
                             <span className="font-mono font-bold">Qty: {item.quantityToDispense}</span>
                           </div>
                         ))
                     )}
                   </div>
                   {!isTextRx && <p className="mt-4 text-xs font-bold text-slate-500 text-right">Total: PKR {Math.round(rx.totalCost)}</p>}
                 </div>
                 
                 {/* Action Buttons */}
                 <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2 mt-4 md:mt-0 md:ml-6 w-full md:w-auto no-print">
                    <button onClick={() => initiateDispense(rx)} className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-md whitespace-nowrap">
                        Dispense
                    </button>
                    <button onClick={() => initiatePrint(rx)} className="flex-1 bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold hover:bg-slate-300 flex items-center justify-center whitespace-nowrap">
                        <Printer size={16} className="mr-2"/> Print
                    </button>
                 </div>
               </div>
               );
             })}
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {printRx && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print">
                    <h3 className="font-bold text-slate-800 flex items-center"><Receipt className="mr-2"/> Print Preview</h3>
                    <button onClick={() => setPrintRx(null)} className="text-slate-500 hover:text-slate-800"><X size={20}/></button>
                </div>
                
                {/* RECEIPT CONTENT - SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white flex justify-center">
                    <div id="receipt-content" className="w-full max-w-[80mm] mx-auto text-xs leading-relaxed text-slate-900 font-sans">
                        <div className="text-center mb-6">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">A project of Caravan of Life Pakistan Trust</p>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-1">
                                {organization === 'BWZ' ? 'BAWAQAR ZINDAGI' : 'COP INITIATIVE'}
                            </h2>
                            <p className="font-bold text-lg text-emerald-700 font-serif my-2">روشن ذہن روشن مستقبل</p>
                            <p className="text-[10px] font-bold mt-1">Ph: +92301-0032220</p>
                        </div>
                        
                        <div className="mb-6 border-y border-slate-200 py-3 space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Date:</span> 
                                <span className="font-bold">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Patient:</span> 
                                <span className="font-bold uppercase">{printRx.clientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">MR #:</span> 
                                <span className="font-mono">{printRx.clientId}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            {printRx.items.length === 0 ? (
                                <div className="border border-slate-200 rounded p-4 text-base font-medium whitespace-pre-wrap min-h-[150px]">
                                    {printRx.specialRisks}
                                </div>
                            ) : (
                                <>
                                    <div className="flex font-bold border-b border-slate-800 pb-2 mb-2 text-[10px] uppercase tracking-wider">
                                        <span className="flex-1">Medication / Strength</span>
                                        <span className="w-16 text-center">Freq</span>
                                        <span className="w-8 text-right">Qty</span>
                                        <span className="w-12 text-right">Amt</span>
                                    </div>
                                    {printRx.items.map((item, i) => (
                                        <div key={i} className="flex mb-3 items-start">
                                            <div className="flex-1 pr-2">
                                                <div className="font-bold text-sm">{item.drugName}</div>
                                                <div className="text-[10px] text-slate-500">{item.strength || 'N/A'}</div>
                                            </div>
                                            <div className="w-16 text-center font-mono font-bold text-xs bg-slate-100 rounded py-0.5 h-fit">
                                                {item.frequency.includes('+') ? item.frequency : item.frequency}
                                            </div>
                                            <span className="w-8 text-right font-mono pt-0.5">{item.quantityToDispense}</span>
                                            <span className="w-12 text-right font-mono pt-0.5">{Math.round(item.cost)}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {printRx.items.length > 0 && (
                            <div className="border-t-2 border-slate-800 pt-3 mb-8">
                                <div className="flex justify-between font-black text-lg">
                                    <span>TOTAL</span>
                                    <span>PKR {Math.round(printRx.totalCost)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase">
                                    <span>Payment Mode</span>
                                    <span>Cash / Charity</span>
                                </div>
                            </div>
                        )}

                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-slate-400">Dispensed By: {currentUser?.username || 'Pharmacy'}</p>
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <p className="font-bold text-sm text-slate-700">Your Mental Health Matters</p>
                                <p className="text-[10px] text-slate-400 mt-1">Computer Generated Receipt</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-slate-50 flex space-x-3 no-print">
                    <button onClick={handleActualPrint} className="flex-1 bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800 flex justify-center items-center">
                        <Printer size={16} className="mr-2"/> Print Receipt
                    </button>
                    <button onClick={() => setPrintRx(null)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded font-bold hover:bg-slate-50">
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('receipt-portal') || document.body
      )}

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl text-slate-800 flex items-center"><MessageSquare className="mr-2 text-bwz-primary"/> Patient Feedback</h3>
                      <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-red-500 font-bold">Cancel</button>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                      <p className="text-sm text-slate-500 italic">Please ask the patient the following before handing over receipts:</p>
                      
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <span className="text-sm font-bold text-slate-700">Was the Doctor helpful?</span>
                          <input type="checkbox" className="w-5 h-5 accent-bwz-primary" checked={feedbackData.doctorHelpful} onChange={e => setFeedbackData({...feedbackData, doctorHelpful: e.target.checked})}/>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <span className="text-sm font-bold text-slate-700">Are medicine instructions clear?</span>
                          <input type="checkbox" className="w-5 h-5 accent-bwz-primary" checked={feedbackData.instructionsClear} onChange={e => setFeedbackData({...feedbackData, instructionsClear: e.target.checked})}/>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <span className="text-sm font-bold text-slate-700">Was the wait time acceptable?</span>
                          <input type="checkbox" className="w-5 h-5 accent-bwz-primary" checked={feedbackData.waitTimeAcceptable} onChange={e => setFeedbackData({...feedbackData, waitTimeAcceptable: e.target.checked})}/>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <span className="text-sm font-bold text-slate-700">Was staff polite?</span>
                          <input type="checkbox" className="w-5 h-5 accent-bwz-primary" checked={feedbackData.staffPolite} onChange={e => setFeedbackData({...feedbackData, staffPolite: e.target.checked})}/>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Overall Experience (1-5)</label>
                          <div className="flex space-x-2">
                              {[1,2,3,4,5].map(star => (
                                  <button key={star} onClick={() => setFeedbackData({...feedbackData, rating: star})} className={`p-2 rounded-full transition-all ${feedbackData.rating >= star ? 'text-yellow-400 scale-110' : 'text-slate-200'}`}>
                                      <Star fill={feedbackData.rating >= star ? "currentColor" : "none"} size={28}/>
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <button onClick={finalizeDispense} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 flex justify-center items-center">
                      <CheckSquare className="mr-2"/> Confirm & Dispense
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit order-2 lg:order-1">
             <h2 className="font-bold text-lg mb-4 flex items-center text-orange-700"><Plus className="mr-2"/> {isEditing ? 'Edit Drug' : 'Add New Drug'}</h2>
             <form onSubmit={handleSaveDrug} className="space-y-3">
                <input required placeholder="Drug Name" className="w-full border rounded p-2 bg-white" value={drugForm.name} onChange={e => setDrugForm({...drugForm, name: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-2">
                    <select className="w-full border rounded p-2 bg-white" value={drugForm.formulation} onChange={e => setDrugForm({...drugForm, formulation: e.target.value as any})}>
                        <option>Tablet</option><option>Syrup</option><option>Injection</option><option>Capsule</option><option>Drops</option>
                    </select>
                    <input required placeholder="Strength (e.g. 20mg)" className="w-full border rounded p-2 bg-white" value={drugForm.strength} onChange={e => setDrugForm({...drugForm, strength: e.target.value})} />
                </div>
                
                <input required placeholder="Molecule (Generic Name)" className="w-full border rounded p-2 bg-white" value={drugForm.molecule} onChange={e => setDrugForm({...drugForm, molecule: e.target.value})} />
                <input required placeholder="Manufacturer" className="w-full border rounded p-2 bg-white" value={drugForm.manufacturer} onChange={e => setDrugForm({...drugForm, manufacturer: e.target.value})} />
                
                <select className="w-full border rounded p-2 bg-white text-sm" value={drugForm.category} onChange={e => setDrugForm({...drugForm, category: e.target.value as DrugCategory})}>
                   <option>Antipsychotic (Schizophrenia/Bipolar)</option>
                   <option>Antidepressant (Depression/Anxiety)</option>
                   <option>Mood Stabilizer (Bipolar)</option>
                   <option>Anxiolytic/Hypnotic (Anxiety/Sleep)</option>
                   <option>Anticholinergic (Side Effect Mgmt)</option>
                   <option>Supplement/General</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                   <div>
                     <label className="text-xs font-bold text-slate-500">Rack/Bin Loc</label>
                     <input className="w-full border rounded p-2 bg-white" placeholder="e.g. A-04" value={drugForm.rackLocation} onChange={e => setDrugForm({...drugForm, rackLocation: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-500">Reorder Level</label>
                     <input type="number" className="w-full border rounded p-2 bg-white" value={drugForm.reorderLevel} onChange={e => setDrugForm({...drugForm, reorderLevel: Number(e.target.value)})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                   <div>
                     <label className="text-xs font-bold text-slate-500">Packet Cost</label>
                     <input type="number" step="0.01" required className="w-full border rounded p-2 bg-white" value={drugForm.packetCost} onChange={e => setDrugForm({...drugForm, packetCost: Number(e.target.value)})} />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-500">Units/Packet</label>
                     <input type="number" step="1" required className="w-full border rounded p-2 bg-white" value={drugForm.unitsPerPacket} onChange={e => setDrugForm({...drugForm, unitsPerPacket: Number(e.target.value)})} />
                   </div>
                </div>
                
                {!isEditing && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Initial Stock</label>
                            <input type="number" step="0.1" required className="w-full border rounded p-2 bg-white" value={drugForm.currentStock} onChange={e => setDrugForm({...drugForm, currentStock: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Expiry Date</label>
                            <input type="date" required className="w-full border rounded p-2 bg-white" value={drugForm.expiryDate} onChange={e => setDrugForm({...drugForm, expiryDate: e.target.value})} />
                        </div>
                    </div>
                )}
                {isEditing && (
                    <div>
                         <label className="text-xs font-bold text-slate-500">Current Stock ({drugForm.unit})</label>
                         <input type="number" step="0.1" required className="w-full border rounded p-2 bg-white" value={drugForm.currentStock} onChange={e => setDrugForm({...drugForm, currentStock: Number(e.target.value)})} />
                    </div>
                )}

                <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700">{isEditing ? 'Update Drug' : 'Add to Inventory'}</button>
                {isEditing && <button type="button" onClick={() => { setIsEditing(false); setDrugForm({}); }} className="w-full text-slate-500 text-xs py-2">Cancel Edit</button>}
             </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden order-1 lg:order-2">
             <div className="overflow-x-auto">
             <table className="w-full text-left text-sm min-w-[600px]">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                 <tr>
                   <th className="p-4">Drug Details</th>
                   <th className="p-4">Strength</th>
                   <th className="p-4">Location</th>
                   <th className="p-4">Stock</th>
                   <th className="p-4">Batches (FIFO)</th>
                   <th className="p-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {inventory.map(d => (
                   <tr key={d.id}>
                     <td className="p-4">
                       <p className="font-bold text-slate-800">{d.name} <span className="text-xs font-normal text-slate-500">({d.manufacturer})</span></p>
                       <p className="text-xs text-slate-500 truncate max-w-[200px]">{d.category}</p>
                       <p className="text-xs font-mono text-slate-400">Cost: PKR {Math.round(d.costPerUnit)}/unit</p>
                     </td>
                     <td className="p-4">
                        <span className="font-bold text-slate-700">{d.strength}</span>
                     </td>
                     <td className="p-4">
                        <span className="flex items-center text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit"><MapPin size={10} className="mr-1"/> {d.rackLocation}</span>
                     </td>
                     <td className="p-4">
                       <span className={`font-bold ${d.currentStock < d.reorderLevel ? 'text-red-600' : 'text-green-600'}`}>{Math.round(d.currentStock)}</span>
                     </td>
                     <td className="p-4 text-xs font-mono">
                        {d.batches.sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).map(b => {
                           const expiryDate = new Date(b.expiryDate);
                           const sixMonthsFromNow = new Date();
                           sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                           const isExpiringSoon = expiryDate < sixMonthsFromNow;
                           return (
                               <div key={b.batchId} className={isExpiringSoon ? 'text-red-600 font-bold' : 'text-slate-600'}>
                                  {b.quantity} (Exp: {b.expiryDate})
                               </div>
                           );
                        })}
                     </td>
                     <td className="p-4 text-right space-x-2">
                       <button onClick={() => handleEdit(d)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                       <button onClick={() => handleDelete(d)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash size={16}/></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                  <h2 className="font-bold text-lg text-slate-700 flex items-center"><FileText className="mr-2"/> Dispensing History Log</h2>
                  <input className="border p-2 rounded w-full md:w-64 text-sm" placeholder="Filter by Drug or Patient..." value={logFilter} onChange={e => setLogFilter(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[600px]">
                      <thead className="bg-slate-50 border-b">
                          <tr>
                              <th className="p-3">Date/Time</th>
                              <th className="p-3">Drug</th>
                              <th className="p-3">Quantity</th>
                              <th className="p-3">Patient</th>
                              <th className="p-3 text-right">Cost</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {dispenseLogs.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">No history found.</td></tr>}
                          {dispenseLogs.slice().reverse()
                            .filter(l => l.drugName.toLowerCase().includes(logFilter.toLowerCase()) || l.patientName.toLowerCase().includes(logFilter.toLowerCase()))
                            .map(log => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono text-xs">{new Date(log.date).toLocaleString()}</td>
                                  <td className="p-3 font-bold">{log.drugName}</td>
                                  <td className="p-3">{log.quantity}</td>
                                  <td className="p-3">{log.patientName}</td>
                                  <td className="p-3 text-right font-mono">PKR {Math.round(log.cost)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* DELETE INVENTORY CONFIRMATION MODAL */}
      {deleteInventoryConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
                  <div className="flex items-center text-red-600 mb-4">
                      <AlertTriangle className="mr-2" size={24} />
                      <h3 className="font-bold text-xl">Confirm Deletion</h3>
                  </div>
                  <p className="text-slate-600 mb-6">
                      Are you sure you want to delete <strong>{deleteInventoryConfirm.name}</strong> from the inventory? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                      <button 
                          onClick={() => setDeleteInventoryConfirm(null)} 
                          className="flex-1 bg-slate-100 text-slate-700 py-2 rounded font-bold hover:bg-slate-200"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDeleteInventory} 
                          className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 flex justify-center items-center"
                      >
                          <Trash2 size={16} className="mr-2"/> Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PharmacistView;