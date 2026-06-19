

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientProfile, ClinicalHistory, MSEData, RehabMetrics, Drug, Prescription, OutreachSession, Gender, PatientStatus, ProgressNote, Organization, User, UserRole, EmployeePerformance, QueueItem, DispenseLogEntry, MHQoLRecord, PharmacyFeedback, PerformanceBadge } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

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
  addToQueue: (clientId: string, type: 'New' | 'Follow-up', notes?: string, status?: 'Waiting' | 'In-Consultation' | 'Completed', patientNameFallback?: string) => Promise<void>;
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

const cleanHistoryForDb = (history: any) => {
  const allowed = ['id', 'clientId', 'diagnosis', 'chiefComplaints', 'durationOfIllness', 'familyHistory', 'pastPsychMedicalHistory', 'substanceAbuseHistory'];
  const clean: any = {};
  allowed.forEach(key => {
    if (history[key] !== undefined) {
      clean[key] = history[key];
    }
  });
  return clean;
};

const cleanMseForDb = (mse: any) => {
  const allowed = ['id', 'clientId', 'date', 'appearance', 'behavior', 'eyeContact', 'speechRate', 'speechVolume', 'mood', 'affect', 'thoughtProcess', 'thoughtContent', 'perceptualDisturbances', 'orientation', 'attention', 'memory', 'insight', 'judgment'];
  const clean: any = {};
  allowed.forEach(key => {
    if (mse[key] !== undefined) {
      clean[key] = mse[key];
    }
  });
  return clean;
};

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

  // Parse the legacy "[DIAGNOSIS:..][VITALS:..]" prefix that older rows store inside chiefComplaints.
  const parseHistoryRow = (h: any) => {
      let diagnosis = h.diagnosis || '';
      let chiefComplaints = h.chiefComplaints || '';
      let vitals: any = undefined;
      const match = chiefComplaints.match(/^\[DIAGNOSIS:(.*?)\]\n?/);
      if (match) {
          diagnosis = match[1];
          chiefComplaints = chiefComplaints.replace(/^\[DIAGNOSIS:.*?\]\n?/, '');
      }
      const vitalsMatch = chiefComplaints.match(/^\[VITALS:(.*?)\]\n?/);
      if (vitalsMatch) {
          try { vitals = JSON.parse(vitalsMatch[1]); } catch (e) { console.error("Vitals parsing error:", e); }
          chiefComplaints = chiefComplaints.replace(/^\[VITALS:.*?\]\n?/, '');
      }
      return { ...h, diagnosis, chiefComplaints, vitals };
  };

  // PostgREST has a URL-length limit, so fetch clinical tables (which have no org
  // column) by chunking the patient-id list rather than pulling every row in the DB.
  const fetchByClientIds = async (table: string, clientIds: string[]) => {
      if (clientIds.length === 0) return [];
      const CHUNK = 150;
      const chunks: string[][] = [];
      for (let i = 0; i < clientIds.length; i += CHUNK) chunks.push(clientIds.slice(i, i + CHUNK));
      const results = await Promise.all(
          chunks.map(ids => supabase.from(table).select('*').in('clientId', ids))
      );
      return results.flatMap(r => r.data || []);
  };

  // Lightweight refetchers used by the realtime subscription and the reconcile tick.
  const refetchQueue = () => {
      if (!organization) return;
      supabase.from('patient_queue').select('*').eq('organization', organization)
          .then(({ data }) => { if (data) setAllQueue(data as any); });
  };
  const refetchPrescriptions = () => {
      if (!organization) return;
      supabase.from('prescriptions').select('*').eq('organization', organization)
          .then(({ data }) => { if (data) setAllPrescriptions(data as any); });
  };

  // --- DATA LOADING ---
  const fetchData = async () => {
    // SECURITY GATE: Only fetch when organization is selected AND Auth is done loading
    if (!organization || isLoading) return;

    try {
        // Clients first — their ids scope the clinical tables below.
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('organization', organization)
            .order('created_at', { ascending: false });

        if (clientError) console.error("Error fetching clients:", clientError);
        const clientList = (clientData as ClientProfile[]) || [];
        if (clientData) setAllClients(clientList);
        const clientIds = clientList.map(c => c.id);

        // All org-scoped tables in parallel.
        const [inv, rx, q, sess, feed, logs] = await Promise.all([
            supabase.from('drug_inventory').select('*').eq('organization', organization),
            supabase.from('prescriptions').select('*').eq('organization', organization),
            supabase.from('patient_queue').select('*').eq('organization', organization),
            supabase.from('outreach_sessions').select('*').eq('organization', organization),
            supabase.from('pharmacy_feedbacks').select('*').eq('organization', organization),
            supabase.from('dispense_logs').select('*').eq('organization', organization),
        ]);
        if (inv.data) setAllInventory(inv.data as any);
        if (rx.data) setAllPrescriptions(rx.data as any);
        if (q.data) setAllQueue(q.data as any);
        if (sess.data) setAllSessions(sess.data as any);
        if (feed.data) setAllFeedbacks(feed.data as any);
        if (logs.data) setDispenseLogs(logs.data as any);

        // Clinical tables (no org column) scoped to this org's patients.
        const [histData, mseData, mhqData] = await Promise.all([
            fetchByClientIds('clinical_histories', clientIds),
            fetchByClientIds('mse_records', clientIds),
            fetchByClientIds('mhqol_records', clientIds),
        ]);
        setHistories(histData.map(parseHistoryRow) as any);
        setMseRecords(mseData as any);
        setMhqolRecords(mhqData as any);
    } catch (err) {
        console.error("Network error fetching data:", err);
    }
  };

  useEffect(() => {
    if (!organization || isLoading) return;

    fetchData();

    // Push-based live updates for the two tables that actually change minute-to-minute,
    // replacing the old 10s full-table polling loop. (Requires the tables to be in the
    // `supabase_realtime` publication — see schema.ts.)
    const channel = supabase
        .channel(`org-live-${organization}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_queue', filter: `organization=eq.${organization}` }, refetchQueue)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions', filter: `organization=eq.${organization}` }, refetchPrescriptions)
        .subscribe();

    // Safety-net reconcile: catches any missed realtime events, but only while the tab
    // is visible and at a 60s cadence (vs. the old 10s) — ~95% fewer idle requests.
    const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            refetchQueue();
            refetchPrescriptions();
        }
    }, 60000);

    return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization, isLoading]);

  // --- FILTERED DATA (Local derived state for speed) ---
  const clients = allClients; 
  const inventory = allInventory;
  const prescriptions = allPrescriptions;
  const sessions = allSessions;
  
  // Filter queue to only show today's items (Clears every night at 12 AM to start fresh)
  const patientQueue = allQueue.filter(q => {
      // Try to parse timestamp from ID (Q-TIMESTAMP)
      const parts = q.id.split('-');
      if (parts.length >= 2) {
          const timestamp = parseInt(parts[1]);
          if (!isNaN(timestamp)) {
              const date = new Date(timestamp);
              const today = new Date();
              // A more resilient "today" check: if within 18 hours, it's definitely today's active session!
              const hoursDiff = Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60);
              if (hoursDiff <= 18) {
                  return true;
              }
              return date.getDate() === today.getDate() && 
                     date.getMonth() === today.getMonth() && 
                     date.getFullYear() === today.getFullYear();
          }
      }
      // Keep any queue item that doesn't fit the Q-timestamp format to avoid throwing live database items away
      return true; 
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
        // Find the current highest sequence for this org/year as a starting point.
        const { data: latest } = await supabase
            .from('clients')
            .select('id')
            .eq('organization', organization)
            .ilike('id', `${organization}-${idYear}-%`)
            .order('created_at', { ascending: false })
            .limit(1);

        let sequence = 1;
        if (latest && latest.length > 0) {
            const parts = latest[0].id.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) sequence = lastSeq + 1;
            }
        }

        // Retry loop: if two receptionists register at once, the loser hits a
        // duplicate-key error, bumps the sequence, and tries again.
        const MAX_ATTEMPTS = 5;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const newId = `${organization}-${idYear}-${sequence.toString().padStart(3, '0')}`;
            const clientWithOrg: ClientProfile = {
                ...clientData,
                id: newId,
                organization,
                isLegacy,
                registrationDate: isLegacy && legacyDate ? legacyDate : new Date().toISOString(),
                registeredBy: currentUser?.username || 'Unknown'
            };

            const { error } = await supabase.from('clients').insert([clientWithOrg]);

            if (!error) {
                setAllClients(prev => [clientWithOrg, ...prev]); // Optimistic add (no full refetch needed)
                return { success: true, msg: `Patient Profile Created. Assigned ID: ${newId}` };
            }

            const isDuplicate = error.code === '23505' || /duplicate key|already exists/i.test(error.message);
            if (isDuplicate) {
                sequence++; // Someone took this ID — try the next one.
                continue;
            }

            console.error("Supabase Insert Error:", error);
            if (error.message.includes('column') && error.message.includes('does not exist')) {
                return { success: false, msg: 'Database Schema Error: Missing columns. Please run the SQL Update Script.' };
            }
            return { success: false, msg: 'Database Error: ' + error.message };
        }

        return { success: false, msg: 'Could not assign a unique patient ID after several attempts. Please retry.' };
    } catch (err: any) {
        console.error("Add Client Exception:", err);
        return { success: false, msg: 'System Error: ' + err.message };
    }
  };

  const updateClientProfile = async (client: ClientProfile) => {
    // Optimistic Update
    setAllClients(prev => prev.map(c => c.id === client.id ? client : c));
    
    const { error } = await supabase.from('clients').update(client).eq('id', client.id);
    if (!error) {
        return { success: true, msg: 'Patient Profile Updated' };
    }
    
    console.error("DEBUG UpdateClient Error", error);
    // Revert if error
    await fetchData(); 
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

    const { diagnosis, vitals, ...restHistory } = history;
    const currentClient = clients.find(c => c.id === history.clientId);
    const actualVitals = vitals || currentClient?.vitals;
    const vitalsStr = actualVitals ? `[VITALS:${JSON.stringify(actualVitals)}]\n` : '';

    const logHistory = { 
        ...restHistory, 
        id: newHistoryId,
        chiefComplaints: `[DIAGNOSIS:${diagnosis || ''}]\n${vitalsStr}${restHistory.chiefComplaints}`
    };
    const logMse = { ...mse, id: newMseId, date: new Date().toISOString() };

    const cleanLogHistory = cleanHistoryForDb(logHistory);
    const cleanLogMse = cleanMseForDb(logMse);

    const { error: hErr } = await supabase.from('clinical_histories').insert([cleanLogHistory]);
    const { error: mErr } = await supabase.from('mse_records').insert([cleanLogMse]);

    if (hErr || mErr) {
        console.error("Failed to save consultation", hErr, mErr);
        console.error("Error saving consultation data to database.");
        return;
    }

    setHistories(prev => [...prev, { ...history, vitals: actualVitals, id: newHistoryId }]);
    setMseRecords(prev => [...prev, logMse]);
    
    const client = clients.find(c => c.id === history.clientId);
    if (client) {
        const textToAnalyze = `${history.chiefComplaints} ${history.durationOfIllness} ${history.pastPsychMedicalHistory} ${mse.thoughtContent} ${mse.thoughtProcess}`.toLowerCase();
        
        const suicidalKeywords = ["suicid", "kill myself", "kill himself", "kill herself", "end my life", "end his life", "end her life", "self harm", "self-harm", "hanging", "overdose", "poison"];
        const homicidalKeywords = ["homicid", "kill others", "kill her", "kill him", "harm others", "murder", "intent to kill"];
        
        let suicidalIdeation = client.riskProfile?.suicidalIdeation || false;
        let homicidalIntent = client.riskProfile?.homicidalIntent || false;
        let changed = false;
        
        if (suicidalKeywords.some(keyword => textToAnalyze.includes(keyword))) {
            suicidalIdeation = true;
            changed = true;
        }
        if (homicidalKeywords.some(keyword => textToAnalyze.includes(keyword))) {
            homicidalIntent = true;
            changed = true;
        }

        const updatedRiskProfile = {
            suicidalIdeation,
            homicidalIntent,
            lastAssessmentDate: changed ? new Date().toLocaleDateString() : (client.riskProfile?.lastAssessmentDate || ''),
            safetyPlanGenerated: client.riskProfile?.safetyPlanGenerated || false
        };

        const updated = { 
            ...client, 
            vitals: actualVitals,
            lastVisitDate: new Date().toISOString(),
            riskProfile: updatedRiskProfile
        };
        await updateClientProfile(updated);
    }
  };

  const updateConsultation = async (history: ClinicalHistory, mse: MSEData) => {
    const { diagnosis, vitals, ...restHistory } = history;
    const currentClient = clients.find(c => c.id === history.clientId);
    const actualVitals = vitals || currentClient?.vitals;
    const vitalsStr = actualVitals ? `[VITALS:${JSON.stringify(actualVitals)}]\n` : '';

    const dbHistory = {
        ...restHistory,
        chiefComplaints: `[DIAGNOSIS:${diagnosis || ''}]\n${vitalsStr}${restHistory.chiefComplaints}`
    };

    const cleanDbHistory = cleanHistoryForDb(dbHistory);
    const cleanDbMse = cleanMseForDb(mse);

    const { error: hErr } = await supabase.from('clinical_histories').update(cleanDbHistory).eq('id', history.id);
    const { error: mErr } = await supabase.from('mse_records').update(cleanDbMse).eq('id', mse.id);

    if (hErr || mErr) {
        console.error("Failed to update consultation", hErr, mErr);
        console.error("Error updating consultation data in database.");
        toast.error("Failed to update consultation. Please check database permissions.");
        return;
    }

    setHistories(prev => prev.map(h => h.id === history.id ? { ...history, vitals: actualVitals } : h));
    setMseRecords(prev => prev.map(m => m.id === mse.id ? mse : m));

    const client = clients.find(c => c.id === history.clientId);
    if (client) {
        const textToAnalyze = `${history.chiefComplaints} ${history.durationOfIllness} ${history.pastPsychMedicalHistory} ${mse.thoughtContent} ${mse.thoughtProcess}`.toLowerCase();
        
        const suicidalKeywords = ["suicid", "kill myself", "kill himself", "kill herself", "end my life", "end his life", "end her life", "self harm", "self-harm", "hanging", "overdose", "poison"];
        const homicidalKeywords = ["homicid", "kill others", "kill her", "kill him", "harm others", "murder", "intent to kill"];
        
        let suicidalIdeation = client.riskProfile?.suicidalIdeation || false;
        let homicidalIntent = client.riskProfile?.homicidalIntent || false;
        let changed = false;
        
        if (suicidalKeywords.some(keyword => textToAnalyze.includes(keyword))) {
            suicidalIdeation = true;
            changed = true;
        }
        if (homicidalKeywords.some(keyword => textToAnalyze.includes(keyword))) {
            homicidalIntent = true;
            changed = true;
        }

        const updatedRiskProfile = {
            suicidalIdeation,
            homicidalIntent,
            lastAssessmentDate: changed ? new Date().toLocaleDateString() : (client.riskProfile?.lastAssessmentDate || ''),
            safetyPlanGenerated: client.riskProfile?.safetyPlanGenerated || false
        };

        const updated = { 
            ...client, 
            vitals: actualVitals,
            riskProfile: updatedRiskProfile
        };
        await updateClientProfile(updated);
    }
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
        
        const lowerNote = note.toLowerCase();
        const suicidalKeywords = ["suicid", "kill myself", "kill himself", "kill herself", "end my life", "end his life", "end her life", "self harm", "self-harm", "hanging", "overdose", "poison"];
        const homicidalKeywords = ["homicid", "kill others", "kill her", "kill him", "harm others", "murder", "intent to kill"];
        
        let suicidalIdeation = client.riskProfile?.suicidalIdeation || false;
        let homicidalIntent = client.riskProfile?.homicidalIntent || false;
        let changed = false;
        
        if (suicidalKeywords.some(keyword => lowerNote.includes(keyword))) {
            suicidalIdeation = true;
            changed = true;
        }
        if (homicidalKeywords.some(keyword => lowerNote.includes(keyword))) {
            homicidalIntent = true;
            changed = true;
        }
        
        const updatedRiskProfile = {
            suicidalIdeation,
            homicidalIntent,
            lastAssessmentDate: changed ? new Date().toLocaleDateString() : (client.riskProfile?.lastAssessmentDate || ''),
            safetyPlanGenerated: client.riskProfile?.safetyPlanGenerated || false
        };
        
        const payload: any = { progressNotes: updatedNotes };
        if (changed) {
            payload.riskProfile = updatedRiskProfile;
        }

        const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
        if(!error) {
             setAllClients(prev => prev.map(c => c.id === clientId ? { ...c, progressNotes: updatedNotes, riskProfile: changed ? updatedRiskProfile : c.riskProfile } : c));
        } else {
            toast.error("Failed to save progress note.");
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
          toast.error("Failed to save MHQoL assessment.");
      }
  };

  // --- QUEUE ---
  const addToQueue = async (
      clientId: string, 
      type: 'New' | 'Follow-up', 
      notes?: string, 
      status: 'Waiting' | 'In-Consultation' | 'Completed' = 'Waiting',
      patientNameFallback?: string
  ) => {
      if (!organization) return;
      
      // Fallback matching: Lookup in active clients or allClients or database
      let client = allClients.find(c => c.id === clientId);
      let name = client?.name || patientNameFallback;
      
      if (!name) {
          // If still not found (state updates lagging), fetch directly from Supabase to prevent error
          const { data } = await supabase.from('clients').select('name, organization').eq('id', clientId).single();
          if (data) {
              name = data.name;
          }
      }

      if (!name) {
          console.error("Queue insert failed: Patient name not resolved for ID", clientId);
          return;
      }

      // Prevent duplicates in TODAY'S queue
      // We use the filtered 'patientQueue' which only contains today's items
      const existing = patientQueue.find(q => q.patientId === clientId && q.status !== 'Completed');
      if (existing) {
          if (status !== 'Waiting' && existing.status !== status) {
              await updateQueueStatus(existing.id, status);
          } else if (status === 'Waiting') {
              console.log("Patient is already in the queue.");
          }
          return;
      }

      // Queue should ALWAYS use the current organization, because the queue represents the physical/current waiting room
      const targetOrg = organization;

      const newItem: any = {
          id: `Q-${Date.now()}`,
          patientId: clientId,
          organization: targetOrg,
          type,
          arrivalTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          status
      };
      
      // If the schema supports patientName, add it. (Sending it might fail if table isn't updated)
      newItem.patientName = name;

      // Optimistic Update - Append to allQueue, the derived patientQueue will pick it up
      setAllQueue(prev => [...prev, newItem]);

      const { error } = await supabase.from('patient_queue').insert([newItem]);
      if (error) {
          console.error("Queue Insert Error:", error);
          if (error.message.includes('patientName')) {
             // Fallback for older schemas lacking patientName column
             delete newItem.patientName;
             const { error: retryError } = await supabase.from('patient_queue').insert([newItem]);
             if (!retryError) return; // Succeeded on retry
          }
          setAllQueue(prev => prev.filter(q => q.id !== newItem.id)); // Revert
          console.error(`Failed to add patient to queue in DB. Details: ${error.message}`);
      } 
  };

  const removeFromQueue = async (queueId: string) => {
      const { error } = await supabase.from('patient_queue').delete().eq('id', queueId);
      if (!error) {
          setAllQueue(prev => prev.filter(q => q.id !== queueId));
      }
  };

  const updateQueueStatus = async (queueId: string, status: 'Waiting' | 'In-Consultation' | 'Completed') => {
      // Optimistic update
      setAllQueue(prev => prev.map(q => q.id === queueId ? { ...q, status } : q));
      const { error } = await supabase.from('patient_queue').update({ status }).eq('id', queueId);
      if (error) {
          // If error, polling will fix it shortly, but we could notify
          console.error("Failed to update queue status", error);
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
    const changedDrugIds = new Set<string>();
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
      changedDrugIds.add(drug.id);

      // FEFO: deplete physical batches first-expiry-first so batch/expiry data stays
      // in sync with currentStock, and emptied batches are removed.
      let remaining = item.quantityToDispense;
      drug.batches = (drug.batches || []).sort(
          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      for (const batch of drug.batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantity, remaining);
          batch.quantity -= take;
          remaining -= take;
      }
      drug.batches = drug.batches.filter(b => b.quantity > 0);

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

    // Only write the drugs that actually changed, and do it concurrently.
    const drugsToUpdate = inventoryClone.filter(d => changedDrugIds.has(d.id));
    await Promise.all(drugsToUpdate.map(drug =>
        supabase.from('drug_inventory').update({ currentStock: drug.currentStock, batches: drug.batches }).eq('id', drug.id)
    ));
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
    
    if (error) toast.error("Inventory Action Failed: " + error.message);
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
        toast.error("Restock failed");
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
        toast.error("Failed to log session: " + error.message);
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

          // Quality = how completely the front desk fills out each patient record.
          const completeness = (c: ClientProfile) =>
              [c.cnic, c.contact, c.area, c.emergencyContact, c.age, c.gender, c.education].filter(Boolean).length;
          const MAX_FIELDS = 7;
          quality = myRegs.length > 0
              ? Math.round((myRegs.reduce((a, c) => a + completeness(c), 0) / (myRegs.length * MAX_FIELDS)) * 100)
              : 0;
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

      // Automated coaching tips (drives the "Automated Coaching" panel).
      if (overallScore === 0) {
          feedback.push("No activity recorded for this period yet — log your daily work to start tracking performance.");
      } else {
          if (productivity < 60) feedback.push("Productivity is below target. Aim to increase your daily throughput.");
          if (quality < 60) feedback.push("Quality is low — make sure records and notes are complete and detailed.");
          if (impact < 60) feedback.push("Impact is trending low. Focus on outcomes (assessments completed, people reached).");
          if (productivity >= 90) feedback.push("Outstanding productivity — you're among the top performers this week.");
          if (feedback.length === 0) feedback.push("Solid, well-balanced performance. Keep it up!");
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