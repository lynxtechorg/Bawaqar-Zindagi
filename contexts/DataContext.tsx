

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientProfile, ClinicalHistory, MSEData, RehabMetrics, Drug, Prescription, OutreachSession, Gender, PatientStatus, ProgressNote, Organization, User, UserRole, EmployeePerformance, QueueItem, DispenseLogEntry, MHQoLRecord, PharmacyFeedback, PerformanceBadge } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface DataContextType {
  clients: ClientProfile[];
  histories: ClinicalHistory[];
  mseRecords: MSEData[];
  metrics: RehabMetrics[];
  mhqolRecords: MHQoLRecord[];
  inventory: Drug[];
  prescriptions: Prescription[];
  sessions: OutreachSession[];
  locations: string[];
  patientQueue: QueueItem[];
  dispenseLogs: DispenseLogEntry[];
  pharmacyFeedbacks: PharmacyFeedback[];
  
  // Intelligence & Actions
  refreshData: () => Promise<void>;
  addClient: (client: Omit<ClientProfile, 'organization' | 'id' | 'isLegacy' | 'registrationDate'>, isLegacy?: boolean, legacyDate?: string) => Promise<{ success: boolean, msg: string }>;
  updateClientProfile: (client: ClientProfile) => Promise<{ success: boolean, msg: string }>;
  deleteClient: (clientId: string) => Promise<{ success: boolean, msg: string }>;
  saveConsultation: (history: ClinicalHistory, mse: MSEData) => Promise<void>;
  updateConsultation: (history: ClinicalHistory, mse: MSEData) => Promise<void>;
  addProgressNote: (clientId: string, note: string) => Promise<void>;
  updateClientStatus: (id: string, status: PatientStatus) => Promise<void>;
  calculateClientStatus: (client: ClientProfile) => PatientStatus;
  
  // MHQoL
  addMHQoLRecord: (record: MHQoLRecord) => Promise<void>;

  // Queue Actions
  addToQueue: (clientId: string, type: 'New' | 'Follow-up', notes?: string, status?: 'Waiting' | 'In-Consultation' | 'Completed') => Promise<void>;
  removeFromQueue: (queueId: string) => Promise<void>;
  updateQueueStatus: (queueId: string, status: 'Waiting' | 'In-Consultation' | 'Completed') => Promise<void>;

  // Pharmacy Actions
  addPrescription: (rx: Omit<Prescription, 'organization'>) => Promise<{ success: boolean, msg: string }>;
  dispensePrescription: (rxId: string) => Promise<{ success: boolean; alerts: string[] }>;
  manageInventory: (action: 'ADD' | 'UPDATE' | 'DELETE', drug: Drug) => Promise<void>;
  restockInventory: (drugId: string, qty: number, batchInfo: {expiry: string, cost: number}) => Promise<void>;
  addPharmacyFeedback: (feedback: Omit<PharmacyFeedback, 'organization' | 'id'>) => Promise<void>;
  
  // PRP
  addSession: (session: Omit<OutreachSession, 'organization'>) => Promise<void>;
  
  // Metrics & Analytics
  getAlerts: () => string[];
  getInventoryValuation: () => number;
  getDrugSuggestions: (molecule: string, targetStrength: string) => { drug: Drug, ratio: number } | null;
  calculateEmployeePerformance: (user: User) => EmployeePerformance;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const KARACHI_AREAS = [
  "UC-01 Natha Khan", "UC-02 Al-Falah", "UC-03 Green Town", "UC-04 Reta Plot",
  "Al-Falah Society", "Rafa-e-Aam Society", "Shamsi Society", "Muhammad Ali Shaheed Society",
  "Al Ghaffar Nagori City", "Delhi Saudagaran Society", "Rafi Garden", "Maaz Garden",
  "Natha Khan Goth", "Moria Khan Goth", "Pak Sadat Colony", "Raita Plot",
  "Shah Faisal Town Block 1", "Shah Faisal Town Block 2", "Shah Faisal Town Block 3", 
  "Shah Faisal Town Block 3A", "Shah Faisal Town Block 4", "Shah Faisal Town Block 5",
  "Rafi Bungalows", "Bagh-e-Malir", "Milliat Town", "New Horizon Care Center (NHCC)",
  "Shah Faisal Colony (General)", "Malir", "Korangi", "Landhi", "Gulshan-e-Iqbal", 
  "Gulistan-e-Jauhar", "North Nazimabad", "Orangi Town", "Lyari", "Saddar", "DHA", 
  "Clifton", "Baldia Town", "Bin Qasim", "Gadap", "Keamari", "Jamshed Road", "PECHS", "Defence View"
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { organization, currentUser, isLoading } = useAuth();
  
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [histories, setHistories] = useState<ClinicalHistory[]>([]);
  const [mseRecords, setMseRecords] = useState<MSEData[]>([]);
  const [mhqolRecords, setMhqolRecords] = useState<MHQoLRecord[]>([]);
  const [metrics, setMetrics] = useState<RehabMetrics[]>([]);
  const [allInventory, setAllInventory] = useState<Drug[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [allSessions, setAllSessions] = useState<OutreachSession[]>([]);
  const [allQueue, setAllQueue] = useState<QueueItem[]>([]);
  const [dispenseLogs, setDispenseLogs] = useState<DispenseLogEntry[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<PharmacyFeedback[]>([]);
  const [locations] = useState<string[]>(KARACHI_AREAS);

  // --- DATA LOADING ---
  const fetchData = async () => {
    // SECURITY GATE: Only fetch when organization is selected AND Auth is done loading
    if (!organization || isLoading) return;

    // Explicitly filter by the currently selected organization in the UI.
    const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization', organization)
        .order('created_at', { ascending: false });
    
    if (clientError) console.error("Error fetching clients:", clientError);
    if (clientData) setAllClients(clientData as any);

    const { data: invData } = await supabase.from('drug_inventory').select('*').eq('organization', organization);
    if (invData) setAllInventory(invData as any);

    const { data: rxData } = await supabase.from('prescriptions').select('*').eq('organization', organization);
    if (rxData) setAllPrescriptions(rxData as any);

    const { data: qData } = await supabase.from('patient_queue').select('*').eq('organization', organization);
    if (qData) setAllQueue(qData as any);
    
    const { data: histData } = await supabase.from('clinical_histories').select('*');
    if (histData) {
        const parsedHistData = histData.map(h => {
            let diagnosis = h.diagnosis || '';
            let chiefComplaints = h.chiefComplaints || '';
            const match = chiefComplaints.match(/^\[DIAGNOSIS:(.*?)\]\n/);
            if (match) {
                diagnosis = match[1];
                chiefComplaints = chiefComplaints.replace(/^\[DIAGNOSIS:.*?\]\n/, '');
            }
            return { ...h, diagnosis, chiefComplaints };
        });
        setHistories(parsedHistData as any);
    }

    const { data: mseData } = await supabase.from('mse_records').select('*');
    if (mseData) setMseRecords(mseData as any);
    
    const { data: sessData } = await supabase.from('outreach_sessions').select('*').eq('organization', organization);
    if (sessData) setAllSessions(sessData as any);

    const { data: logsData } = await supabase.from('dispense_logs').select('*');
    if (logsData) setDispenseLogs(logsData as any);
    
    const { data: mhqData } = await supabase.from('mhqol_records').select('*');
    if (mhqData) setMhqolRecords(mhqData as any);
    
    const { data: feedData } = await supabase.from('pharmacy_feedbacks').select('*').eq('organization', organization);
    if (feedData) setAllFeedbacks(feedData as any);
  };

  useEffect(() => {
    fetchData();
  }, [organization, isLoading, currentUser]); // Added currentUser to ensure re-fetch on login/session restore

  // --- FILTERED DATA (Local derived state for speed) ---
  const clients = allClients; 
  const inventory = allInventory;
  const prescriptions = allPrescriptions;
  const sessions = allSessions;
  
  // Filter queue to only show today's items (Clears every 24 hours)
  const patientQueue = allQueue.filter(q => {
      // Try to parse timestamp from ID (Q-TIMESTAMP)
      const parts = q.id.split('-');
      if (parts.length >= 2) {
          const timestamp = parseInt(parts[1]);
          if (!isNaN(timestamp)) {
              const date = new Date(timestamp);
              const today = new Date();
              return date.getDate() === today.getDate() && 
                     date.getMonth() === today.getMonth() && 
                     date.getFullYear() === today.getFullYear();
          }
      }
      return false; 
  });

  const pharmacyFeedbacks = allFeedbacks;

  // --- ACTIONS ---

  const calculateClientStatus = (client: ClientProfile): PatientStatus => {
    if (client.status === PatientStatus.TERMINATED) return PatientStatus.TERMINATED;
    const lastVisit = new Date(client.lastVisitDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) return PatientStatus.RELAPSE;
    if (diffDays > 180) return PatientStatus.DROPPED_OUT;
    return PatientStatus.FOLLOW_UP;
  };


  const addClient = async (clientData: Omit<ClientProfile, 'organization' | 'id' | 'isLegacy' | 'registrationDate'>, isLegacy = false, legacyDate?: string) => {
    if (!organization) return { success: false, msg: 'No Organization Selected' };
    
    let idYear = new Date().getFullYear().toString().slice(-2);
    if (isLegacy && legacyDate) {
        const d = new Date(legacyDate);
        idYear = d.getFullYear().toString().slice(-2);
    }
    
    try {
        const { data: latest } = await supabase
            .from('clients')
            .select('id')
            .eq('organization', organization)
            .ilike('id', `${organization}-${idYear}-%`)
            .order('created_at', { ascending: false })
            .limit(1);
        
        let sequence = 1;
        if (latest && latest.length > 0) {
            const lastId = latest[0].id;
            const parts = lastId.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) sequence = lastSeq + 1;
            }
        }
        
        const seqStr = sequence.toString().padStart(3, '0');
        const newId = `${organization}-${idYear}-${seqStr}`;

        const clientWithOrg: ClientProfile = { 
            ...clientData, 
            id: newId,
            organization,
            isLegacy,
            registrationDate: isLegacy && legacyDate ? legacyDate : new Date().toISOString(),
            registeredBy: currentUser?.username || 'Unknown' 
        };

        // Optimistic Update
        setAllClients(prev => [clientWithOrg, ...prev]);

        const { error } = await supabase.from('clients').insert([clientWithOrg]);
        
        if (error) {
            console.error("Supabase Insert Error:", error);
            // Revert optimistic update if failed
            setAllClients(prev => prev.filter(c => c.id !== newId));
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                 return { success: false, msg: 'Database Schema Error: Missing columns. Please run the SQL Update Script.' };
            }
            return { success: false, msg: 'Database Error: ' + error.message };
        }
        
        // Background fetch to ensure consistency
        fetchData();
        return { success: true, msg: `Patient Profile Created. Assigned ID: ${newId}` };

    } catch (err: any) {
        console.error("Add Client Exception:", err);
        return { success: false, msg: 'System Error: ' + err.message };
    }
  };

  const updateClientProfile = async (client: ClientProfile) => {
    const { error } = await supabase.from('clients').update(client).eq('id', client.id);
    if (!error) {
        await fetchData();
        return { success: true, msg: 'Patient Profile Updated' };
    }
    return { success: false, msg: 'Update Failed: ' + error.message };
  };

  const deleteClient = async (clientId: string) => {
    // Delete from all related tables first to avoid foreign key constraints
    await supabase.from('patient_queue').delete().eq('patientId', clientId);
    await supabase.from('clinical_histories').delete().eq('clientId', clientId);
    await supabase.from('mse_records').delete().eq('clientId', clientId);
    await supabase.from('mhqol_records').delete().eq('clientId', clientId);
    
    // Orphan prescriptions instead of deleting them to avoid triggering immutable audit logs
    await supabase.from('prescriptions').update({ clientId: null, status: 'Deleted' }).eq('clientId', clientId);
    
    await supabase.from('pharmacy_feedbacks').delete().eq('clientId', clientId);
    
    // Finally delete the client
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) {
        setAllClients(prev => prev.filter(c => c.id !== clientId));
        setAllQueue(prev => prev.filter(q => q.patientId !== clientId));
        setHistories(prev => prev.filter(h => h.clientId !== clientId));
        setMseRecords(prev => prev.filter(m => m.clientId !== clientId));
        setMhqolRecords(prev => prev.filter(m => m.clientId !== clientId));
        setAllPrescriptions(prev => prev.filter(p => p.clientId !== clientId));
        setDispenseLogs(prev => prev.filter(l => l.patientName !== clients.find(c => c.id === clientId)?.name));
        setAllFeedbacks(prev => prev.filter(f => f.clientId !== clientId));
        return { success: true, msg: 'Patient and all related records deleted permanently' };
    }
    return { success: false, msg: error.message };
  };

  const saveConsultation = async (history: ClinicalHistory, mse: MSEData) => {
    const timestamp = Date.now();
    const newHistoryId = `H-${timestamp}`;
    const newMseId = `MSE-${timestamp}`;

    const { diagnosis, ...restHistory } = history;
    const logHistory = { 
        ...restHistory, 
        id: newHistoryId,
        chiefComplaints: `[DIAGNOSIS:${diagnosis || ''}]\n${restHistory.chiefComplaints}`
    };
    const logMse = { ...mse, id: newMseId, date: new Date().toISOString() };

    const { error: hErr } = await supabase.from('clinical_histories').insert([logHistory]);
    const { error: mErr } = await supabase.from('mse_records').insert([logMse]);

    if (hErr || mErr) {
        console.error("Failed to save consultation", hErr, mErr);
        console.error("Error saving consultation data to database.");
        return;
    }

    setHistories(prev => [...prev, { ...history, id: newHistoryId }]);
    setMseRecords(prev => [...prev, logMse]);
    
    const client = clients.find(c => c.id === history.clientId);
    if (client) {
        const updated = { ...client, lastVisitDate: new Date().toISOString() };
        await updateClientProfile(updated);
    }
  };

  const updateConsultation = async (history: ClinicalHistory, mse: MSEData) => {
    const { diagnosis, ...restHistory } = history;
    const dbHistory = {
        ...restHistory,
        chiefComplaints: `[DIAGNOSIS:${diagnosis || ''}]\n${restHistory.chiefComplaints}`
    };

    const { error: hErr } = await supabase.from('clinical_histories').update(dbHistory).eq('id', history.id);
    const { error: mErr } = await supabase.from('mse_records').update(mse).eq('id', mse.id);

    if (hErr || mErr) {
        console.error("Failed to update consultation", hErr, mErr);
        console.error("Error updating consultation data in database.");
        alert("Failed to update consultation. Please check database permissions.");
        return;
    }

    setHistories(prev => prev.map(h => h.id === history.id ? history : h));
    setMseRecords(prev => prev.map(m => m.id === mse.id ? mse : m));
  };

  const addProgressNote = async (clientId: string, note: string) => {
    const newNote: ProgressNote = {
      id: `PN-${Date.now()}`,
      date: new Date().toISOString(),
      note,
      author: currentUser?.username || 'Unknown'
    };
    
    const client = clients.find(c => c.id === clientId);
    if (client) {
        const updatedNotes = [...client.progressNotes, newNote];
        const { error } = await supabase.from('clients').update({ progressNotes: updatedNotes }).eq('id', clientId);
        if(!error) {
             setAllClients(prev => prev.map(c => c.id === clientId ? { ...c, progressNotes: updatedNotes } : c));
        } else {
            alert("Failed to save progress note.");
        }
    }
  };

  const updateClientStatus = async (id: string, status: PatientStatus) => {
    const { error } = await supabase.from('clients').update({ status }).eq('id', id);
    if (!error) {
        setAllClients(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    }
  };

  const addMHQoLRecord = async (record: MHQoLRecord) => {
      const { error } = await supabase.from('mhqol_records').insert([record]);
      if (!error) {
          setMhqolRecords(prev => [...prev, record]);
      } else {
          alert("Failed to save MHQoL assessment.");
      }
  };

  // --- QUEUE ---
  const addToQueue = async (clientId: string, type: 'New' | 'Follow-up', notes?: string, status: 'Waiting' | 'In-Consultation' | 'Completed' = 'Waiting') => {
      if (!organization) return;
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      // Prevent duplicates in TODAY'S queue
      // We use the filtered 'patientQueue' which only contains today's items
      const existing = patientQueue.find(q => q.patientId === clientId && q.status !== 'Completed');
      if (existing) {
          if (status !== 'Waiting' && existing.status !== status) {
              await updateQueueStatus(existing.id, status);
          } else if (status === 'Waiting') {
              alert("Patient is already in the active queue for today.");
          }
          return;
      }

      const newItem: QueueItem = {
          id: `Q-${Date.now()}`,
          patientId: clientId,
          patientName: client.name,
          organization,
          type,
          arrivalTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          status
      };
      
      // Optimistic Update - Append to allQueue, the derived patientQueue will pick it up
      setAllQueue(prev => [...prev, newItem]);

      const { error } = await supabase.from('patient_queue').insert([newItem]);
      if (error) {
          console.error("Queue Insert Error", error);
          setAllQueue(prev => prev.filter(q => q.id !== newItem.id)); // Revert
          alert("Failed to add to queue.");
      } 
      // Removed fetchData() to prevent race condition where stale DB data overwrites optimistic update
  };

  const removeFromQueue = async (queueId: string) => {
      const { error } = await supabase.from('patient_queue').delete().eq('id', queueId);
      if (!error) {
          setAllQueue(prev => prev.filter(q => q.id !== queueId));
      }
  };

  const updateQueueStatus = async (queueId: string, status: 'Waiting' | 'In-Consultation' | 'Completed') => {
      const { error } = await supabase.from('patient_queue').update({ status }).eq('id', queueId);
      if (!error) {
          setAllQueue(prev => prev.map(q => q.id === queueId ? { ...q, status } : q));
      }
  };

  // --- PHARMACY ---
  const addPrescription = async (rx: Omit<Prescription, 'organization'>) => {
    if (!organization) return { success: false, msg: 'No Org' };
    const rxWithOrg: Prescription = { ...rx, organization };
    
    const { error } = await supabase.from('prescriptions').insert([rxWithOrg]);
    if (error) return { success: false, msg: error.message };

    setAllPrescriptions(prev => [...prev, rxWithOrg]);
    return { success: true, msg: 'Rx Sent to Pharmacy' };
  };

  const dispensePrescription = async (rxId: string) => {
    const rx = allPrescriptions.find(p => p.id === rxId);
    if (!rx) return { success: false, alerts: ['Rx Not Found'] };

    let alerts: string[] = [];
    const inventoryClone = JSON.parse(JSON.stringify(allInventory)) as Drug[];
    const newLogs: DispenseLogEntry[] = [];
    let transactionSuccess = true;

    for (const item of rx.items) {
      const drugIdx = inventoryClone.findIndex(d => d.id === item.drugId);
      if (drugIdx === -1) {
          alerts.push(`Drug ${item.drugName} not found.`);
          transactionSuccess = false;
          continue;
      }
      const drug = inventoryClone[drugIdx];
      if (drug.currentStock < item.quantityToDispense) {
          alerts.push(`Insufficient Stock for ${drug.name}`);
          transactionSuccess = false;
          continue;
      }

      drug.currentStock -= item.quantityToDispense;
      if (drug.currentStock < (drug.reorderLevel || 10)) alerts.push(`Low Stock: ${drug.name}`);

      newLogs.push({
          id: `DL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: new Date().toISOString(),
          prescriptionId: rx.id,
          drugName: drug.name,
          quantity: item.quantityToDispense,
          cost: item.cost,
          patientName: rx.clientName,
          organization: organization || undefined
      });
    }

    if (!transactionSuccess) return { success: false, alerts };

    for (const drug of inventoryClone) {
        await supabase.from('drug_inventory').update({ currentStock: drug.currentStock, batches: drug.batches }).eq('id', drug.id);
    }
    const { error: rxErr } = await supabase.from('prescriptions').update({ status: 'Dispensed' }).eq('id', rxId);
    if (rxErr) {
        return { success: false, alerts: ["Failed to update Rx status"]};
    }

    // AUTO-COMPLETE PATIENT VISIT
    // Find the patient in the active queue and mark as Completed
    const queueItem = patientQueue.find(q => q.patientId === rx.clientId && q.status !== 'Completed');
    if (queueItem) {
        await updateQueueStatus(queueItem.id, 'Completed');
    }

    const { error: logErr } = await supabase.from('dispense_logs').insert(newLogs);
    if (logErr) {
        console.error("Log error", logErr);
    }

    setAllInventory(inventoryClone);
    setAllPrescriptions(prev => prev.map(p => p.id === rxId ? { ...p, status: 'Dispensed' } : p));
    setDispenseLogs(prev => [...prev, ...newLogs]);

    // Background sync
    fetchData();

    return { success: true, alerts };
  };

  const manageInventory = async (action: 'ADD' | 'UPDATE' | 'DELETE', drug: Drug) => {
    if (!organization) return;
    const drugWithOrg = { ...drug, organization };
    
    let error = null;
    if (action === 'ADD') {
        const res = await supabase.from('drug_inventory').insert([drugWithOrg]);
        error = res.error;
        if (!error) setAllInventory(prev => [...prev, drugWithOrg]);
    }
    if (action === 'UPDATE') {
        const res = await supabase.from('drug_inventory').update(drugWithOrg).eq('id', drug.id);
        error = res.error;
        if (!error) setAllInventory(prev => prev.map(d => d.id === drug.id ? drugWithOrg : d));
    }
    if (action === 'DELETE') {
        const res = await supabase.from('drug_inventory').delete().eq('id', drug.id);
        error = res.error;
        if (!error) setAllInventory(prev => prev.filter(d => d.id !== drug.id));
    }
    
    if (error) alert("Inventory Action Failed: " + error.message);
  };

  const restockInventory = async (drugId: string, qty: number, batchInfo: {expiry: string, cost: number}) => {
    const drug = allInventory.find(d => d.id === drugId);
    if (!drug) return;

    const updatedDrug = {
      ...drug,
      currentStock: drug.currentStock + qty,
      costPerUnit: batchInfo.cost,
      batches: [...drug.batches, { batchId: `B${Date.now()}`, expiryDate: batchInfo.expiry, quantity: qty, costPrice: batchInfo.cost }]
    };

    const { error } = await supabase.from('drug_inventory').update(updatedDrug).eq('id', drugId);
    if (!error) {
        setAllInventory(prev => prev.map(d => d.id === drugId ? updatedDrug : d));
    } else {
        alert("Restock failed");
    }
  };

  const addPharmacyFeedback = async (feedback: Omit<PharmacyFeedback, 'organization' | 'id'>) => {
      if (!organization) return;
      const newFeedback: PharmacyFeedback = { ...feedback, id: `PF-${Date.now()}`, organization };
      const { error } = await supabase.from('pharmacy_feedbacks').insert([newFeedback]);
      if (!error) {
          setAllFeedbacks(prev => [...prev, newFeedback]);
      }
  };

  const addSession = async (session: Omit<OutreachSession, 'organization'>) => {
    if (!organization) return;
    const sessionWithOrg: OutreachSession = { 
        ...session, 
        organization,
        conductedBy: currentUser?.username || 'Unknown'
    };
    const { error } = await supabase.from('outreach_sessions').insert([sessionWithOrg]);
    if (!error) {
        setAllSessions(prev => [...prev, sessionWithOrg]);
    } else {
        alert("Failed to log session: " + error.message);
    }
  };

  // --- ANALYTICS HELPERS ---
  const getAlerts = () => {
    const alerts: string[] = [];
    inventory.forEach(d => {
      if (d.currentStock < d.reorderLevel) alerts.push(`Low Stock: ${d.name}`);
      const nearExpiry = d.batches.some(b => {
         const diff = new Date(b.expiryDate).getTime() - new Date().getTime();
         return diff < 15552000000 && diff > 0; // 6 months
      });
      if (nearExpiry) alerts.push(`Near Expiry: ${d.name}`);
      const expired = d.batches.some(b => new Date(b.expiryDate).getTime() <= new Date().getTime());
      if (expired) alerts.push(`Expired: ${d.name}`);
    });
    return alerts;
  };

  const getInventoryValuation = () => {
    return inventory.reduce((total, drug) => total + (drug.currentStock * drug.costPerUnit), 0);
  };
  
  const getDrugSuggestions = (molecule: string, targetStrength: string) => {
    const alternatives = inventory.filter(d => d.molecule === molecule && d.currentStock > 0);
    const targetNum = parseInt(targetStrength.replace(/\D/g,''));
    for (const alt of alternatives) {
       const altNum = parseInt(alt.strength.replace(/\D/g,''));
       if (!isNaN(targetNum) && !isNaN(altNum)) {
          if (altNum === targetNum * 2) return { drug: alt, ratio: 0.5 };
       }
    }
    return null;
  };

  const calculateEmployeePerformance = (user: User): EmployeePerformance => {
      let productivity = 0;
      let quality = 0;
      let impact = 0;
      let badges: PerformanceBadge[] = [];
      let feedback: string[] = [];
      let history: { date: string; score: number }[] = [];

      const now = new Date();
      // Generate last 7 days array
      const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(now.getDate() - (6-i));
          return d.toLocaleDateString();
      });

      // Helper to map daily counts to history score
      const mapToHistory = (dates: string[]) => {
          return last7Days.map(dayStr => {
             // Basic date string matching (using Locale Date String for simplicity in client-side filtering)
             const count = dates.filter(d => new Date(d).toLocaleDateString() === dayStr).length;
             // Scoring Logic: 1 unit of work = 20 points, cap at 100 for visualization
             return {
                 date: new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' }),
                 score: Math.min(100, count * 20)
             };
          });
      };

      if (user.role === UserRole.DOCTOR) {
          // Rx Count (Productivity)
          const myRx = allPrescriptions.filter(p => p.doctorId === user.username || p.doctorId === user.id);
          const rxCount = myRx.length;
          productivity = Math.min(100, (rxCount / 10) * 100); 

          // Notes Quality (Notes vs Unique Patients)
          const patientsSeenIds = new Set(myRx.map(r => r.clientId));
          const myNotes = allClients.flatMap(c => c.progressNotes).filter(n => n.author === user.username);
          const notesCount = myNotes.length;
          quality = patientsSeenIds.size > 0 ? Math.min(100, (notesCount / patientsSeenIds.size) * 100) : 0;
          
          // MHQoL Assessments (Impact)
          const myAssessments = mhqolRecords.filter(r => r.recordedBy === user.username).length;
          impact = Math.min(100, (myAssessments / 5) * 100);

          history = mapToHistory(myRx.map(p => p.date));

          if (productivity > 90) badges.push({ id: 'b1', icon: 'Zap', label: 'High Velocity', color: 'text-yellow-500' });
          if (quality > 90) badges.push({ id: 'b2', icon: 'FileText', label: 'Documentation Pro', color: 'text-blue-500' });
      
      } else if (user.role === UserRole.RECEPTIONIST) {
          // Registrations (Productivity)
          const myRegs = allClients.filter(c => c.registeredBy === user.username);
          productivity = Math.min(100, (myRegs.length / 5) * 100);
          
          quality = 100; // Placeholder until data entry quality metrics are defined
          impact = Math.min(100, (myRegs.length / 5) * 100);
          
          history = mapToHistory(myRegs.map(c => c.registrationDate));

      } else if (user.role === UserRole.PRP_SPECIALIST || user.role === UserRole.OUTREACH_SPECIALIST) {
          // Sessions Conducted
          const mySessions = allSessions.filter(s => s.conductedBy === user.username);
          productivity = Math.min(100, (mySessions.length / 2) * 100);
          
          // Note Verbosity (Quality proxy)
          const notesLength = mySessions.reduce((acc, s) => acc + (s.notes?.length || 0), 0);
          quality = Math.min(100, (notesLength / 500) * 100);
          
          // Participants Reached (Impact)
          const totalParticipants = mySessions.reduce((acc, s) => acc + s.participantCount, 0);
          impact = Math.min(100, (totalParticipants / 20) * 100);
          
          history = mapToHistory(mySessions.map(s => s.date));

      } else {
          // Default empty state for roles without specific individual metrics yet (Pharmacist, Exec, Admin)
          productivity = 0; quality = 0; impact = 0;
          history = last7Days.map(dayStr => ({
             date: new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' }),
             score: 0
          }));
      }

      const overallScore = Math.round((productivity * 0.4) + (quality * 0.3) + (impact * 0.3));
      
      let ratingLabel = "No Data";
      if (overallScore > 0) {
        ratingLabel = overallScore >= 90 ? "Top Performer" : overallScore >= 75 ? "Exceeding Expectations" : "Needs Improvement";
      }

      // Real Trend Calculation (Last 3 days vs Prev 3 days)
      const recentSum = history.slice(4).reduce((a,b) => a + b.score, 0);
      const prevSum = history.slice(0, 3).reduce((a,b) => a + b.score, 0);
      const trend = recentSum > prevSum ? 'UP' : recentSum < prevSum ? 'DOWN' : 'STABLE';
      const trendValue = Math.abs(recentSum - prevSum); // Raw score difference

      return {
          overallScore, ratingLabel, trend, trendValue,
          productivityScore: Math.round(productivity), qualityScore: Math.round(quality), impactScore: Math.round(impact),
          history, badges, actionableFeedback: feedback
      };
  };

  return (
    <DataContext.Provider value={{
      clients, histories, mseRecords, metrics, mhqolRecords, inventory, prescriptions, sessions, locations,
      patientQueue, dispenseLogs, pharmacyFeedbacks,
      refreshData: fetchData, // Expose refresh
      addClient, updateClientProfile, deleteClient, saveConsultation, updateConsultation, addProgressNote, updateClientStatus, calculateClientStatus,
      addToQueue, removeFromQueue, updateQueueStatus, addMHQoLRecord,
      addPrescription, dispensePrescription, manageInventory, restockInventory, addPharmacyFeedback,
      addSession, getAlerts, getInventoryValuation, getDrugSuggestions,
      calculateEmployeePerformance
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};