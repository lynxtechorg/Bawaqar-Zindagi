
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { MHQoLRecord } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardList, Save, History } from 'lucide-react';

interface Props {
  clientId: string;
}

const QUESTIONS = [
  {
    key: 'selfImage',
    label: 'SELF-IMAGE',
    options: [
      { val: 3, text: 'I think very positively about myself' },
      { val: 2, text: 'I think positively about myself' },
      { val: 1, text: 'I think negatively about myself' },
      { val: 0, text: 'I think very negatively about myself' }
    ]
  },
  {
    key: 'independence',
    label: 'INDEPENDENCE',
    sub: 'For example: freedom of choice, financial, co-decision making',
    options: [
      { val: 3, text: 'I am very satisfied with my level of independence' },
      { val: 2, text: 'I am satisfied with my level of independence' },
      { val: 1, text: 'I am dissatisfied with my level of independence' },
      { val: 0, text: 'I am very dissatisfied with my level of independence' }
    ]
  },
  {
    key: 'mood',
    label: 'MOOD',
    options: [
      { val: 3, text: 'I do not feel anxious, gloomy, or depressed' },
      { val: 2, text: 'I feel a little anxious, gloomy, or depressed' },
      { val: 1, text: 'I feel anxious, gloomy, or depressed' },
      { val: 0, text: 'I feel very anxious, gloomy, or depressed' }
    ]
  },
  {
    key: 'relationships',
    label: 'RELATIONSHIPS',
    sub: 'For example: partner, children, family, friends',
    options: [
      { val: 3, text: 'I am very satisfied with my relationships' },
      { val: 2, text: 'I am satisfied with my relationships' },
      { val: 1, text: 'I am dissatisfied with my relationships' },
      { val: 0, text: 'I am very dissatisfied with my relationships' }
    ]
  },
  {
    key: 'dailyActivities',
    label: 'DAILY ACTIVITIES',
    sub: 'For example: work, study, household, leisure activities',
    options: [
      { val: 3, text: 'I am very satisfied with my daily activities' },
      { val: 2, text: 'I am satisfied with my daily activities' },
      { val: 1, text: 'I am dissatisfied with my daily activities' },
      { val: 0, text: 'I am very dissatisfied with my daily activities' }
    ]
  },
  {
    key: 'physicalHealth',
    label: 'PHYSICAL HEALTH',
    options: [
      { val: 3, text: 'I have no physical health problems' },
      { val: 2, text: 'I have some physical health problems' },
      { val: 1, text: 'I have many physical health problems' },
      { val: 0, text: 'I have a great many physical health problems' }
    ]
  },
  {
    key: 'future',
    label: 'FUTURE',
    options: [
      { val: 3, text: 'I am very optimistic about my future' },
      { val: 2, text: 'I am optimistic about my future' },
      { val: 1, text: 'I am gloomy about my future' },
      { val: 0, text: 'I am very gloomy about my future' }
    ]
  }
];

const MHQoLAssessment: React.FC<Props> = ({ clientId }) => {
  const { mhqolRecords, addMHQoLRecord } = useData();
  const { currentUser } = useAuth();
  
  const [scores, setScores] = useState<Record<string, number>>({
    selfImage: 3, independence: 3, mood: 3, relationships: 3, dailyActivities: 3, physicalHealth: 3, future: 3
  });

  // Reset scores when switching clients
  React.useEffect(() => {
    setScores({
      selfImage: 3, independence: 3, mood: 3, relationships: 3, dailyActivities: 3, physicalHealth: 3, future: 3
    });
  }, [clientId]);

  const clientRecords = mhqolRecords.filter(r => r.clientId === clientId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // FIX: Cast Object.values to number[] to avoid 'unknown' type inference
  const currentTotal = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0);

  const handleSubmit = () => {
    const newRecord: MHQoLRecord = {
      id: `MHQ-${Date.now()}`,
      clientId,
      date: new Date().toISOString(),
      recordedBy: currentUser?.username || 'Unknown',
      scores: scores as any,
      totalScore: currentTotal
    };
    addMHQoLRecord(newRecord);
    alert('MHQoL-7D Assessment Saved!');
  };

  const chartData = clientRecords.map(r => ({
    date: new Date(r.date).toLocaleDateString(),
    score: r.totalScore
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center"><ClipboardList className="mr-2 text-bwz-primary"/> New Assessment</h2>
          <div className="text-right">
             <span className="block text-xs font-bold text-slate-400 uppercase">Current Index</span>
             <span className={`text-2xl font-bold ${currentTotal > 15 ? 'text-green-600' : currentTotal > 10 ? 'text-yellow-600' : 'text-red-600'}`}>{currentTotal} / 21</span>
          </div>
        </div>
        
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
           {QUESTIONS.map((q) => (
             <div key={q.key} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-1">{q.label}</h4>
                {q.sub && <p className="text-xs text-slate-500 mb-2 italic">{q.sub}</p>}
                <div className="space-y-2">
                   {q.options.map((opt) => (
                     <label key={opt.val} className={`flex items-center p-2 rounded cursor-pointer border transition-all ${scores[q.key] === opt.val ? 'bg-white border-bwz-primary shadow-sm' : 'border-transparent hover:bg-slate-100'}`}>
                        <input 
                           type="radio" 
                           name={q.key} 
                           checked={scores[q.key] === opt.val} 
                           onChange={() => setScores({...scores, [q.key]: opt.val})}
                           className="w-4 h-4 text-bwz-primary"
                        />
                        <span className={`ml-3 text-sm ${scores[q.key] === opt.val ? 'font-bold text-bwz-primary' : 'text-slate-600'}`}>{opt.text}</span>
                        <span className="ml-auto text-xs font-mono font-bold text-slate-400">({opt.val})</span>
                     </label>
                   ))}
                </div>
             </div>
           ))}
        </div>

        <button onClick={handleSubmit} className="w-full mt-6 bg-bwz-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex justify-center items-center">
           <Save className="mr-2"/> Save Assessment
        </button>
      </div>

      {/* History & Analytics */}
      <div className="space-y-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><History className="mr-2 text-slate-500"/> MHQoL-7D Progression</h2>
            {chartData.length > 0 ? (
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                      <YAxis domain={[0, 21]} stroke="#94a3b8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#2c7a7b" strokeWidth={3} dot={{r: 4, fill: '#2c7a7b'}} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            ) : (
               <div className="h-32 flex items-center justify-center text-slate-400 italic bg-slate-50 rounded">
                  No previous assessments recorded.
               </div>
            )}
         </div>

         {clientRecords.length > 0 && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold text-slate-800 mb-4">Assessment History Log</h2>
                <div className="space-y-3">
                   {clientRecords.slice().reverse().map(r => (
                      <div key={r.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                         <div>
                            <p className="font-bold text-sm text-slate-700">{new Date(r.date).toLocaleDateString()} <span className="text-xs font-normal text-slate-400">at {new Date(r.date).toLocaleTimeString()}</span></p>
                            <p className="text-xs text-slate-500">Recorded by: {r.recordedBy}</p>
                         </div>
                         <div className="text-right">
                            <span className="block text-xl font-bold text-bwz-primary">{r.totalScore}</span>
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

export default MHQoLAssessment;
