
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toast';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Activity, Calendar, Download, 
  Filter, Layers, PieChart as PieIcon, BarChart as BarIcon, 
  FileText, Briefcase, CheckSquare, Square, Printer, AlertCircle, ArrowRight, Heart 
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

// --- COLORS & THEME ---
const COLORS = ['#2c7a7b', '#f59e0b', '#805ad5', '#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// --- TYPES ---
type MetricID = 
  | 'PATIENT_GROWTH' | 'PATIENT_DEMO' | 'PATIENT_STATUS' | 'PATIENT_DIAGNOSIS'
  | 'FINANCE_REVENUE' | 'FINANCE_SPEND' | 'DISPENSED_MEDICINES'
  | 'INVENTORY_VALUE' | 'INVENTORY_STOCK'
  | 'OPS_VOLUME' | 'OPS_LOCATIONS'
  | 'PATIENT_SATISFACTION';

type DateRange = 'ALL' | 'DAILY' | '30_DAYS' | '90_DAYS' | 'YEAR';

const ExecutiveView: React.FC = () => {
  const { sessions, clients, inventory, prescriptions, getInventoryValuation, dispenseLogs, pharmacyFeedbacks, histories } = useData();
  const { organization } = useAuth();
  
  // --- STATE ---
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricID>>(new Set(['PATIENT_GROWTH', 'PATIENT_DIAGNOSIS', 'FINANCE_REVENUE', 'DISPENSED_MEDICINES', 'OPS_VOLUME']));
  const [dateRange, setDateRange] = useState<DateRange>('ALL');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // --- HELPER: DATE FILTERING ---
  const filterByDate = (dateString: string) => {
      if (dateRange === 'ALL') return true;
      const date = new Date(dateString);
      const now = new Date();
      
      if (dateRange === 'DAILY') {
          return date.toDateString() === now.toDateString();
      }
      
      let daysToSubtract = 0;
      if (dateRange === '30_DAYS') daysToSubtract = 30;
      if (dateRange === '90_DAYS') daysToSubtract = 90;
      if (dateRange === 'YEAR') daysToSubtract = 365;
      
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - daysToSubtract);
      
      return date >= pastDate;
  };

  // --- ENGINE: DATA AGGREGATION ---
  const generateChartData = (metric: MetricID) => {
    let rawData: any[] = [];
    let summary = { title: '', value: '', insight: '' };
    let chartType: 'AREA' | 'BAR' | 'PIE' | 'LINE' | 'COMBO' = 'AREA';
    let columns: {key: string, label: string}[] = [];

    switch (metric) {
        // 1. PATIENT GROWTH (Area)
        case 'PATIENT_GROWTH':
            chartType = 'AREA';
            summary.title = 'Patient Registration Trend';
            const growthGroup = clients.filter(c => filterByDate(c.registrationDate)).reduce((acc, c) => {
                const d = new Date(c.registrationDate).toLocaleString('default', { month: 'short', year: '2-digit' });
                acc[d] = (acc[d] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(growthGroup).map(([name, value]) => ({ name, value }));
            summary.value = clients.filter(c => filterByDate(c.registrationDate)).length.toString();
            summary.insight = "Tracks the influx of new patients over the selected period.";
            columns = [{key: 'name', label: 'Month'}, {key: 'value', label: 'New Patients'}];
            break;

        // 2. PATIENT DEMOGRAPHICS (Pie)
        case 'PATIENT_DEMO':
            chartType = 'PIE';
            summary.title = 'Demographics Distribution (Gender)';
            const genderGroup = clients.filter(c => filterByDate(c.registrationDate)).reduce((acc, c) => {
                acc[c.gender] = (acc[c.gender] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(genderGroup).map(([name, value]) => ({ name, value }));
            summary.value = clients.length.toString();
            summary.insight = "Breakdown of patient population by gender identity.";
            columns = [{key: 'name', label: 'Gender'}, {key: 'value', label: 'Count'}];
            break;

        // 3. PATIENT STATUS (Bar)
        case 'PATIENT_STATUS':
            chartType = 'BAR';
            summary.title = 'Patient Status Breakdown';
            const statusGroup = clients.reduce((acc, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(statusGroup).map(([name, value]) => ({ name, value }));
            summary.value = clients.length.toString();
            summary.insight = "Current standing of all registered patients in the system.";
            columns = [{key: 'name', label: 'Status'}, {key: 'value', label: 'Count'}];
            break;

        // 3.5 PATIENT DIAGNOSIS (Bar)
        case 'PATIENT_DIAGNOSIS':
            chartType = 'BAR';
            summary.title = 'OPD Diagnosis Breakdown';
            const diagCounts = {
                'MDD (Depression)': 0,
                'BAD (Bipolar)': 0,
                'Anxiety': 0,
                'Schizophrenia': 0,
                'Other / Custom': 0
            };
            
            // Collect patient's diagnosis from histories (linked to patients)
            const filteredHistories = histories.filter(h => filterByDate(h.created_at || new Date().toISOString()));
            
            filteredHistories.forEach(h => {
                const diag = (h.diagnosis || '').toLowerCase().trim();
                if (!diag) return;
                
                if (diag.includes('mdd') || diag.includes('depress')) {
                    diagCounts['MDD (Depression)']++;
                } else if (diag.includes('bad') || diag.includes('bipolar')) {
                    diagCounts['BAD (Bipolar)']++;
                } else if (diag.includes('anxiety') || diag.includes('panic') || diag.includes('phobia')) {
                    diagCounts['Anxiety']++;
                } else if (diag.includes('schizo')) {
                    diagCounts['Schizophrenia']++;
                } else {
                    diagCounts['Other / Custom']++;
                }
            });
            
            rawData = Object.entries(diagCounts)
                .map(([name, value]) => ({ name, value }));
                
            const totalDiagnosed = Object.values(diagCounts).reduce((a,b) => a + b, 0);
            summary.value = `${totalDiagnosed} Patients`;
            summary.insight = "OPD Patients categorized by their primary clinical diagnosis.";
            columns = [{key: 'name', label: 'Diagnosis'}, {key: 'value', label: 'Patient Count'}];
            break;

        // 4. FINANCIAL REVENUE (Area - Green)
        case 'FINANCE_REVENUE':
            chartType = 'AREA';
            summary.title = 'Pharmacy Revenue Stream';
            // Revenue is only realised once a prescription is actually dispensed.
            const dispensedRx = prescriptions.filter(p => p.status === 'Dispensed' && filterByDate(p.date));
            const revGroup = dispensedRx.reduce((acc, p) => {
                 const d = new Date(p.date).toLocaleString('default', { month: 'short', year: '2-digit' });
                 acc[d] = (acc[d] || 0) + Math.round(p.totalCost);
                 return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(revGroup).map(([name, value]) => ({ name, value }));
            const totalRev = dispensedRx.reduce((a,b) => a + Math.round(b.totalCost), 0);
            summary.value = `PKR ${totalRev.toLocaleString()}`;
            summary.insight = "Gross revenue from dispensed pharmacy prescriptions.";
            columns = [{key: 'name', label: 'Month'}, {key: 'value', label: 'Revenue (PKR)'}];
            break;

        // 5. FINANCIAL SPEND (Bar - Red)
        case 'FINANCE_SPEND':
            chartType = 'BAR';
            summary.title = 'Cost of Goods Sold (Drugs)';
            const spendGroup = dispenseLogs.filter(l => filterByDate(l.date)).reduce((acc, l) => {
                 const d = new Date(l.date).toLocaleString('default', { month: 'short', year: '2-digit' });
                 acc[d] = (acc[d] || 0) + Math.round(l.cost);
                 return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(spendGroup).map(([name, value]) => ({ name, value }));
            const totalSpend = dispenseLogs.filter(l => filterByDate(l.date)).reduce((a,b) => a + Math.round(b.cost), 0);
            summary.value = `PKR ${totalSpend.toLocaleString()}`;
            summary.insight = "Total cost value of inventory items dispensed.";
            columns = [{key: 'name', label: 'Month'}, {key: 'value', label: 'COGS (PKR)'}];
            break;

        // 5.5 DISPENSED MEDICINES (Bar)
        case 'DISPENSED_MEDICINES':
            chartType = 'BAR';
            summary.title = 'Dispensed Drugs Breakdown';
            const medicineQtyGroup = dispenseLogs.filter(l => filterByDate(l.date)).reduce((acc, l) => {
                 acc[l.drugName] = (acc[l.drugName] || 0) + Number(l.quantity);
                 return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(medicineQtyGroup).map(([name, value]) => ({ name, value }));
            const medTotalQty = (Object.values(medicineQtyGroup) as number[]).reduce((a,b) => a + b, 0);
            summary.value = `${medTotalQty.toLocaleString()} Units`;
            summary.insight = "Quantity of drugs dispensed to patients over the selected period.";
            columns = [{key: 'name', label: 'Medicine Name'}, {key: 'value', label: 'Quantity Dispensed'}];
            break;

        // 6. INVENTORY VALUE (Pie)
        case 'INVENTORY_VALUE':
            chartType = 'PIE';
            summary.title = 'Capital Allocation (Inventory)';
            const invGroup = inventory.reduce((acc, item) => {
                acc[item.category] = (acc[item.category] || 0) + Math.round(item.currentStock * item.costPerUnit);
                return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(invGroup).map(([name, value]) => ({ name, value }));
            summary.value = `PKR ${Math.round(getInventoryValuation()).toLocaleString()}`;
            summary.insight = "Current value of stock on hand, categorized by drug type.";
            columns = [{key: 'name', label: 'Category'}, {key: 'value', label: 'Value (PKR)'}];
            break;

        // 7. INVENTORY STOCK HEALTH (Bar)
        case 'INVENTORY_STOCK':
            chartType = 'BAR';
            summary.title = 'Stock Health Analysis';
            let critical = 0;
            let low = 0;
            let healthy = 0;
            inventory.forEach(i => {
                if (i.currentStock === 0) critical++;
                else if (i.currentStock < i.reorderLevel) low++;
                else healthy++;
            });
            rawData = [
                { name: 'Critical (Out)', value: critical },
                { name: 'Low Stock', value: low },
                { name: 'Healthy', value: healthy }
            ];
            summary.value = `${critical + low} Alerts`;
            summary.insight = "Categorization of inventory items by stock availability status.";
            columns = [{key: 'name', label: 'Status'}, {key: 'value', label: 'SKU Count'}];
            break;
            
        // 8. OPS LOCATIONS (Bar)
        case 'OPS_LOCATIONS':
            chartType = 'BAR';
            summary.title = 'Outreach by Location';
            const locGroup = sessions.filter(s => filterByDate(s.date)).reduce((acc, s) => {
                acc[s.location] = (acc[s.location] || 0) + s.participantCount;
                return acc;
            }, {} as Record<string, number>);
            rawData = Object.entries(locGroup).map(([name, value]) => ({ name, value }));
            const totalHeadcount = sessions.filter(s => filterByDate(s.date)).reduce((a,b) => a + b.participantCount, 0);
            summary.value = totalHeadcount.toString();
            summary.insight = "Total headcount engagement distributed by geographical location.";
            columns = [{key: 'name', label: 'Location'}, {key: 'value', label: 'Participants'}];
            break;

        // 9. OPS VOLUME (Line / Combo)
        case 'OPS_VOLUME':
            chartType = 'LINE';
            summary.title = 'Operational Volume';
            const opsData: Record<string, number> = {};
            
            // Registrations
            clients.filter(c => filterByDate(c.registrationDate)).forEach(c => {
                const d = new Date(c.registrationDate).toLocaleDateString();
                opsData[d] = (opsData[d] || 0) + 1;
            });
            // Prescriptions
            prescriptions.filter(p => filterByDate(p.date)).forEach(p => {
                const d = new Date(p.date).toLocaleDateString();
                opsData[d] = (opsData[d] || 0) + 1;
            });
            // Sessions
            sessions.filter(s => filterByDate(s.date)).forEach(s => {
                const d = new Date(s.date).toLocaleDateString();
                opsData[d] = (opsData[d] || 0) + 1;
            });

            // Sort by date
            rawData = Object.entries(opsData)
                .sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                .map(([name, value]) => ({ name, value }));

            const totalOps = Object.values(opsData).reduce((a,b) => a + b, 0);
            summary.value = totalOps.toString();
            summary.insight = "Aggregate count of major system events (Admissions, Scripts, Sessions) per day.";
            columns = [{key: 'name', label: 'Date'}, {key: 'value', label: 'Total Events'}];
            break;
            
        // 10. PATIENT SATISFACTION (Bar)
        case 'PATIENT_SATISFACTION':
            chartType = 'BAR';
            summary.title = 'Pharmacy Feedback Sentiment';
            
            const filteredFeedbacks = pharmacyFeedbacks.filter(f => filterByDate(f.date));
            const totalFeedback = filteredFeedbacks.length;
            
            if (totalFeedback > 0) {
                 const docScore = (filteredFeedbacks.filter(f => f.questions.doctorHelpful).length / totalFeedback) * 100;
                 const instrScore = (filteredFeedbacks.filter(f => f.questions.instructionsClear).length / totalFeedback) * 100;
                 const waitScore = (filteredFeedbacks.filter(f => f.questions.waitTimeAcceptable).length / totalFeedback) * 100;
                 const staffScore = (filteredFeedbacks.filter(f => f.questions.staffPolite).length / totalFeedback) * 100;
                 
                 rawData = [
                     { name: 'Doctor Helpful', value: Math.round(docScore) },
                     { name: 'Clear Instr.', value: Math.round(instrScore) },
                     { name: 'Wait Time', value: Math.round(waitScore) },
                     { name: 'Staff Polite', value: Math.round(staffScore) }
                 ];
                 
                 const avgRating = filteredFeedbacks.reduce((a,b) => a + b.rating, 0) / totalFeedback;
                 summary.value = `${avgRating.toFixed(1)} / 5.0`;
                 summary.insight = `Based on ${totalFeedback} patient feedbacks collected at pharmacy checkout.`;
            } else {
                 summary.value = "N/A";
                 summary.insight = "No feedback data collected for this period.";
            }

            columns = [{key: 'name', label: 'Metric'}, {key: 'value', label: 'Satisfaction %'}];
            break;
    }

    return { rawData, summary, chartType, columns };
  };

  const toggleMetric = (id: MetricID) => {
      const newSet = new Set(selectedMetrics);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedMetrics(newSet);
  };

  const handleDownloadExcel = () => {
    if (!organization) return;
    let csvContent = "";
    
    // Title of the entire report deck
    csvContent += `EXECUTIVE REPORT DECK - ${organization.toUpperCase()} - GENERATED ON ${new Date().toLocaleDateString()}\r\n`;
    csvContent += `Date Filter: ${dateRange}\r\n\r\n`;
    
    Array.from(selectedMetrics).forEach(metricId => {
        const data = generateChartData(metricId as MetricID);
        if (data.rawData.length === 0) return;
        
        csvContent += `SECTION: ${data.summary.title.toUpperCase()}\r\n`;
        csvContent += `Summary Value: "${String(data.summary.value || '').replace(/"/g, '""')}"\r\n`;
        csvContent += `Insight: "${String(data.summary.insight || '').replace(/"/g, '""')}"\r\n`;
        
        // Headers
        const headers = data.columns.map(c => `"${String(c.label || '').replace(/"/g, '""')}"`).join(",");
        csvContent += headers + "\r\n";
        
        // Data Rows
        data.rawData.forEach(row => {
            const line = [
                `"${String(row.name || '').replace(/"/g, '""')}"`,
                typeof row.value === 'number' ? row.value : `"${String(row.value || '').replace(/"/g, '""')}"`
            ].join(",");
            csvContent += line + "\r\n";
        });
        
        csvContent += "\r\n"; // extra line between chapters
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${organization}_Executive_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    const input = document.getElementById('report-container');
    if (!input) return;

    setIsGeneratingPDF(true);
    
    try {
        const canvas = await html2canvas(input, {
            scale: 2, // Higher resolution
            useCORS: true,
            logging: false,
            windowWidth: input.scrollWidth,
            windowHeight: input.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width
        const pageHeight = 297; // A4 height
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add subsequent pages if content overflows
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`${organization}_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        console.error("PDF Generation Error", err);
        toast.error("Failed to generate PDF. Please try printing to PDF instead.");
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  // --- RENDER COMPONENT ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 no-print">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Analytics Studio</h1>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{organization} Reporting Engine</p>
              </div>
              <div className="flex space-x-3">
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                      {['ALL', 'DAILY', '30_DAYS', '90_DAYS', 'YEAR'].map(r => (
                          <button 
                            key={r}
                            onClick={() => setDateRange(r as DateRange)} 
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${dateRange === r ? 'bg-white shadow text-bwz-primary' : 'text-slate-500'}`}
                          >
                            {r.replace('_', ' ')}
                          </button>
                      ))}
                  </div>
                  <button 
                    onClick={handleDownloadExcel}
                    className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 flex items-center shadow-lg transition-transform active:scale-95 shadow-green-700/10 mr-1"
                  >
                    <Download size={16} className="mr-2"/> Export Excel (CSV)
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-700 flex items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                        <span className="flex items-center"><Activity className="animate-spin mr-2" size={16}/> Generating...</span>
                    ) : (
                        <><Download size={16} className="mr-2"/> Download Report PDF</>
                    )}
                  </button>
              </div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden">
          
          {/* LEFT SIDEBAR: BUILDER */}
          <div className="w-full lg:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto no-print shadow-xl z-10">
             <h3 className="font-bold text-slate-800 mb-6 flex items-center"><Filter size={18} className="mr-2"/> Report Builder</h3>
             
             <div className="space-y-8">
                {/* Section: Clinical */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center"><Users size={12} className="mr-1"/> Clinical Metrics</h4>
                    <div className="space-y-2">
                        {[
                            { id: 'PATIENT_GROWTH', label: 'Registration Growth' },
                            { id: 'PATIENT_DEMO', label: 'Demographics' },
                            { id: 'PATIENT_STATUS', label: 'Patient Status' },
                            { id: 'PATIENT_DIAGNOSIS', label: 'OPD Diagnosis Breakdown' },
                            { id: 'PATIENT_SATISFACTION', label: 'Satisfaction Score' }
                        ].map(m => (
                            <div key={m.id} onClick={() => toggleMetric(m.id as MetricID)} className={`cursor-pointer p-3 rounded-lg border transition-all flex items-center ${selectedMetrics.has(m.id as MetricID) ? 'bg-bwz-primary/5 border-bwz-primary text-bwz-primary font-bold' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}`}>
                                {selectedMetrics.has(m.id as MetricID) ? <CheckSquare size={16} className="mr-2"/> : <Square size={16} className="mr-2"/>}
                                <span className="text-sm">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Financial */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center"><DollarSign size={12} className="mr-1"/> Financial Metrics</h4>
                    <div className="space-y-2">
                        {[
                            { id: 'FINANCE_REVENUE', label: 'Pharmacy Revenue' },
                            { id: 'FINANCE_SPEND', label: 'Pharmacy Spend (COGS)' },
                            { id: 'DISPENSED_MEDICINES', label: 'Dispensed Drugs Breakdown' },
                            { id: 'INVENTORY_VALUE', label: 'Inventory Valuation' },
                            { id: 'INVENTORY_STOCK', label: 'Stock Health' },
                        ].map(m => (
                            <div key={m.id} onClick={() => toggleMetric(m.id as MetricID)} className={`cursor-pointer p-3 rounded-lg border transition-all flex items-center ${selectedMetrics.has(m.id as MetricID) ? 'bg-green-50 border-green-600 text-green-700 font-bold' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}`}>
                                {selectedMetrics.has(m.id as MetricID) ? <CheckSquare size={16} className="mr-2"/> : <Square size={16} className="mr-2"/>}
                                <span className="text-sm">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Operations */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center"><Briefcase size={12} className="mr-1"/> Operational Metrics</h4>
                    <div className="space-y-2">
                        {[
                            { id: 'OPS_VOLUME', label: 'Daily Ops Volume' },
                            { id: 'OPS_LOCATIONS', label: 'Outreach by Location' },
                        ].map(m => (
                            <div key={m.id} onClick={() => toggleMetric(m.id as MetricID)} className={`cursor-pointer p-3 rounded-lg border transition-all flex items-center ${selectedMetrics.has(m.id as MetricID) ? 'bg-purple-50 border-purple-600 text-purple-700 font-bold' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}`}>
                                {selectedMetrics.has(m.id as MetricID) ? <CheckSquare size={16} className="mr-2"/> : <Square size={16} className="mr-2"/>}
                                <span className="text-sm">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>

          {/* RIGHT CANVAS: REPORT PREVIEW */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-8" id="report-container">
              {/* Cover Page for Print (Visual Only on Screen as Header) */}
              <div className="mb-8 border-b pb-8">
                  <h1 className="text-4xl font-black text-slate-900">{organization} Executive Report</h1>
                  <p className="text-xl text-slate-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                  <div className="flex gap-4 mt-6">
                      <div className="bg-white px-4 py-2 rounded shadow text-sm font-bold border">
                          Range: <span className="text-bwz-primary">{dateRange}</span>
                      </div>
                      <div className="bg-white px-4 py-2 rounded shadow text-sm font-bold border">
                          Metrics: <span className="text-bwz-primary">{selectedMetrics.size} Selected</span>
                      </div>
                  </div>
              </div>

              {/* Dynamic Report Sections */}
              <div className="space-y-12">
                  {selectedMetrics.size === 0 && (
                      <div className="text-center py-20 opacity-40">
                          <Layers size={64} className="mx-auto mb-4"/>
                          <p className="text-2xl font-bold">Select metrics from the left sidebar to build your report.</p>
                      </div>
                  )}

                  {Array.from(selectedMetrics).map(metricId => {
                      const data = generateChartData(metricId as MetricID);
                      if (data.rawData.length === 0) return null; // Skip empty
                      
                      return (
                        <div key={metricId} className="card p-8 break-inside-avoid print:shadow-none print:border-none print:p-0 print:mb-10">
                            {/* Section Header */}
                            <div className="flex justify-between items-end mb-6 border-b pb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{data.summary.title}</h2>
                                    <p className="text-slate-500 text-sm mt-1">{data.summary.insight}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-slate-400 uppercase">
                                        {metricId === 'PATIENT_SATISFACTION' ? 'Avg Rating' : metricId === 'INVENTORY_STOCK' ? 'Total SKUs' : 'Total Value'}
                                    </span>
                                    <span className="block text-3xl font-mono font-bold text-bwz-primary">{data.summary.value}</span>
                                </div>
                            </div>

                            {/* Visualization */}
                            <div className="h-80 w-full bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6 print:bg-white print:border-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    {data.chartType === 'PIE' ? (
                                        <PieChart>
                                            <Pie data={data.rawData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                {data.rawData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    ) : (
                                        <ComposedChart data={data.rawData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                            <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
                                            <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                                            <Tooltip />
                                            {data.chartType === 'BAR' && <Bar dataKey="value" fill={metricId === 'FINANCE_SPEND' ? '#e53e3e' : '#2c7a7b'} radius={[4, 4, 0, 0]} barSize={50} />}
                                            {data.chartType === 'AREA' && <Area type="monotone" dataKey="value" stroke="#2c7a7b" fill="#2c7a7b" fillOpacity={0.2} />}
                                            {data.chartType === 'LINE' && <Line type="monotone" dataKey="value" stroke="#805ad5" strokeWidth={3} dot={{r:4}} />}
                                        </ComposedChart>
                                    )}
                                </ResponsiveContainer>
                            </div>

                            {/* Data Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            {data.columns.map(col => <th key={col.key} className="py-2 font-bold text-slate-500">{col.label}</th>)}
                                            {metricId !== 'PATIENT_SATISFACTION' && metricId !== 'INVENTORY_STOCK' && <th className="py-2 font-bold text-slate-500 text-right">Contribution</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.rawData.map((row, i) => {
                                            // Calculate generic total for percentage
                                            let pct = '-';
                                            if (metricId !== 'PATIENT_SATISFACTION' && metricId !== 'INVENTORY_STOCK') {
                                                const total = data.rawData.reduce((a, b) => a + (typeof b.value === 'number' ? b.value : 0), 0);
                                                pct = total ? ((row.value / total) * 100).toFixed(1) + '%' : '-';
                                            }
                                            
                                            return (
                                                <tr key={i} className="border-b border-slate-50 last:border-0">
                                                    <td className="py-3 font-medium text-slate-700">{row.name}</td>
                                                    <td className="py-3 font-mono">{typeof row.value === 'number' ? row.value.toLocaleString() : row.value} {metricId === 'PATIENT_SATISFACTION' ? '%' : ''}</td>
                                                    {metricId !== 'PATIENT_SATISFACTION' && metricId !== 'INVENTORY_STOCK' && <td className="py-3 text-right font-mono text-slate-400">{pct}</td>}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                      );
                  })}
              </div>

              <div className="mt-20 text-center text-slate-400 text-sm font-mono print:block hidden">
                  CONFIDENTIAL REPORT • Generated by {organization} System
              </div>
          </div>
      </div>
    </div>
  );
};

export default ExecutiveView;
