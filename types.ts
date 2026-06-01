

export type Organization = 'BWZ' | 'COP';

export enum UserRole {
  ADMIN = 'ADMIN', // Master Admin
  DOCTOR = 'DOCTOR',
  PHARMACIST = 'PHARMACIST',
  RECEPTIONIST = 'RECEPTIONIST',
  EXECUTIVE = 'EXECUTIVE',
  PRP_SPECIALIST = 'PRP_SPECIALIST', // BWZ Only
  OUTREACH_SPECIALIST = 'OUTR_SPECIALIST' // COP Only
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string; // In a real app, this would be hashed
  role: UserRole;
  organization: Organization | 'UNIVERSAL'; // Admin is Universal
  createdAt: string;
}

export interface PerformanceBadge {
  id: string;
  icon: string; // Lucide icon name
  label: string;
  color: string;
}

export interface EmployeePerformance {
  overallScore: number; // 0-100
  ratingLabel: string; // "Top Performer", "Meeting Expectations", etc.
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendValue: number; // e.g., +5%
  
  // Detailed breakdowns
  productivityScore: number;
  qualityScore: number;
  impactScore: number;

  history: { date: string; score: number }[]; // For trend charts
  badges: PerformanceBadge[];
  actionableFeedback: string[];
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum PatientStatus {
  NEW = 'New Patient',
  FOLLOW_UP = 'Follow-up',
  DROPPED_OUT = 'Dropped Out', // > 6 months no show
  RELAPSE = 'Relapse', // Returns after > 1 year
  TERMINATED = 'Terminated' // Formal completion
}

export type ReferenceSource = 'Marketing' | 'Patient to Patient' | 'Community' | 'MOU Partner' | 'Other';

export interface VitalsData {
  temperature: string;
  pulse: string;
  respRate: string;
  bp: string;
  weight: string; // Added field
}

export interface ClientProfile {
  id: string; // Reg #
  organization: Organization;
  cnic: string;
  name: string;
  age: number;
  gender: Gender;
  religion: string;
  sect: string;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  contact: string;
  
  // Address Fields
  address: string; // Full string for display
  area: string; // Broad area for analytics
  sectorBlock?: string; // Specifics
  street?: string; // NEW: Specific street/house info for editing
  
  // Reference
  referenceSource: ReferenceSource;
  referenceDetail?: string; // Name of MOU partner etc.

  // Clinical / Triage
  vitals?: VitalsData;

  familyType: 'Nuclear' | 'Extended';
  education: string;
  employmentStatus: string;
  emergencyContact: string;
  registrationDate: string;
  isLegacy: boolean; // True if registered before system existed
  lastVisitDate: string;
  status: PatientStatus;
  riskProfile: RiskProfile;
  exitPlanEligible: boolean;
  totalSpend: number; // Financial Intelligence
  progressNotes: ProgressNote[];
  registeredBy?: string; // Track who added the patient
}

export interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  organization: Organization;
  type: 'New' | 'Follow-up';
  arrivalTime: string;
  status: 'Waiting' | 'In-Consultation' | 'Completed';
}

export interface ProgressNote {
  id: string;
  date: string;
  note: string;
  author: string; // Username or ID
}

export interface RiskProfile {
  suicidalIdeation: boolean;
  homicidalIntent: boolean;
  lastAssessmentDate: string;
  safetyPlanGenerated: boolean;
}

export interface ClinicalHistory {
  id: string;
  clientId: string;
  diagnosis: string; // NEW: Diagnosis field
  chiefComplaints: string;
  durationOfIllness: string;
  familyHistory: string;
  pastPsychMedicalHistory: string;
  substanceAbuseHistory: string;
}

export interface MSEData {
  id: string;
  clientId: string;
  date: string;
  appearance: string;
  behavior: string;
  eyeContact: string;
  speechRate: string;
  speechVolume: string;
  mood: string;
  affect: string;
  thoughtProcess: string;
  thoughtContent: string;
  perceptualDisturbances: string;
  orientation: string;
  attention: string;
  memory: string;
  insight: 1 | 2 | 3 | 4 | 5 | 6;
  judgment: string;
}

export interface RehabMetrics {
  id: string;
  clientId: string;
  snapshotType: 'Registration' | '3-Months' | '6-Months';
  date: string;
  livingScore: number; 
  learningScore: number;
  workingScore: number;
  socialScore: number;
}

// --- MHQoL TYPES ---
export interface MHQoLRecord {
  id: string;
  clientId: string;
  date: string;
  recordedBy: string;
  scores: {
    selfImage: number; // 0-3
    independence: number;
    mood: number;
    relationships: number;
    dailyActivities: number;
    physicalHealth: number;
    future: number;
  };
  totalScore: number; // 0-21
}

export interface DrugBatch {
  batchId: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
}

export type DrugCategory = 
  | 'Antipsychotic (Schizophrenia/Bipolar)' 
  | 'Antidepressant (Depression/Anxiety)' 
  | 'Mood Stabilizer (Bipolar)' 
  | 'Anxiolytic/Hypnotic (Anxiety/Sleep)' 
  | 'Anticholinergic (Side Effect Mgmt)' 
  | 'Supplement/General';

export interface Drug {
  id: string;
  organization: Organization;
  name: string;
  category: DrugCategory; // UPDATED
  molecule: string; 
  strength: string; 
  brand: string;
  
  // Enhanced Fields
  manufacturer: string;
  rackLocation: string; // e.g. "A-04"
  formulation: 'Tablet' | 'Syrup' | 'Injection' | 'Capsule' | 'Drops';
  reorderLevel: number; // Renamed from lowStockThreshold
  
  currentStock: number;
  unit: string;
  batches: DrugBatch[];
  packetCost: number; 
  unitsPerPacket: number; 
  costPerUnit: number; 
  tags: string[]; 
}

export interface Prescription {
  id: string;
  organization: Organization;
  clientId: string;
  clientName: string; 
  doctorId: string; // Username/ID of prescriber
  date: string;
  items: PrescriptionItem[];
  status: 'Pending' | 'Dispensed' | 'Cancelled';
  totalCost: number;
  // NEW
  specialRisks?: string; // Open text field for investigations/risks
}

export interface PrescriptionItem {
  drugId: string;
  drugName: string;
  strength?: string; // Added strength
  dosage: string;
  frequency: string;
  duration: string;
  quantityToDispense: number;
  cost: number;
  substitutionNote?: string;
  freqDetail?: {
      morning: number;
      afternoon: number;
      evening: number;
      night: number;
  };
}

export interface DispenseLogEntry {
  id: string;
  date: string;
  prescriptionId: string;
  drugName: string;
  quantity: number;
  cost: number;
  patientName: string;
  organization?: string;
}

export interface PharmacyFeedback {
  id: string;
  date: string;
  organization: Organization;
  clientId: string;
  rxId: string;
  questions: {
    doctorHelpful: boolean;
    instructionsClear: boolean;
    waitTimeAcceptable: boolean;
    staffPolite: boolean;
  };
  rating: number; // 1-5 Star rating
}

export interface OutreachSession {
  id: string;
  organization: Organization;
  location: string;
  date: string;
  nextScheduledDate?: string; 
  conductedBy?: string; 
  
  // Shared Type or Specific
  type: string; 
  
  // BWZ Specific
  newPatientCount?: number;
  followUpPatientCount?: number;

  // COP Specific
  copDivision?: 'Campsite' | 'Field';
  fieldActivityType?: 'Pamphlet Distribution' | 'Awareness Session' | 'Home Visit'; // Added Home Visit
  fieldSessionFormat?: 'Group' | 'Individual';
  
  // Demographics for Field/Home Visits
  genderBreakdown?: {
      male: number;
      female: number;
  };

  pamphletsDistributed?: number;

  domainFocus?: 'Living' | 'Learning' | 'Working' | 'Socializing';
  participantCount: number; 
  resourcesUtilized: string;
  notes: string;
}