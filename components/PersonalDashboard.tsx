
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { TrendingUp, TrendingDown, Minus, Award, Activity, AlertCircle, Zap, FileText, CheckCircle, Users, Globe, Star } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const PersonalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { calculateEmployeePerformance } = useData();

  if (!currentUser) return null;

  const performance = calculateEmployeePerformance(currentUser);

  const getIcon = (name: string) => {
      switch(name) {
          case 'Zap': return <Zap size={20} className="text-yellow-500"/>;
          case 'FileText': return <FileText size={20} className="text-blue-500"/>;
          case 'CheckCircle': return <CheckCircle size={20} className="text-green-500"/>;
          case 'Users': return <Users size={20} className="text-purple-500"/>;
          case 'Globe': return <Globe size={20} className="text-indigo-500"/>;
          default: return <Star size={20} className="text-orange-500"/>;
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header Block */}
      <div className="card p-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5">
            <Award size={200} />
        </div>
        <div className="z-10">
          <h1 className="text-3xl font-bold text-slate-800">Welcome, {currentUser.name}</h1>
          <p className="text-slate-500 mt-2 flex items-center">
              {currentUser.organization} Performance Dashboard • {currentUser.role.replace('_', ' ')}
              <span className="ml-3 px-2 py-0.5 rounded bg-slate-100 text-xs font-bold uppercase border border-slate-200">{performance.ratingLabel}</span>
          </p>
        </div>
        <div className="text-right z-10 mt-6 md:mt-0 flex items-center space-x-6">
             <div className="text-center">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trend</div>
                 <div className={`text-xl font-bold flex items-center justify-center ${performance.trend === 'UP' ? 'text-green-500' : performance.trend === 'DOWN' ? 'text-red-500' : 'text-slate-500'}`}>
                     {performance.trend === 'UP' ? <TrendingUp size={20} className="mr-1"/> : performance.trend === 'DOWN' ? <TrendingDown size={20} className="mr-1"/> : <Minus size={20} className="mr-1"/>}
                     {performance.trend === 'UP' ? '+' : ''}{performance.trendValue.toFixed(1)}
                 </div>
             </div>
             <div className="text-right pl-6 border-l border-slate-100">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</div>
                 <div className={`text-6xl font-black ${performance.overallScore >= 90 ? 'text-green-500' : performance.overallScore >= 75 ? 'text-blue-600' : 'text-orange-500'}`}>
                     {performance.overallScore}
                 </div>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Detailed Metrics */}
          <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-3 gap-4">
                  <div className="card p-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Productivity</h4>
                      <div className="text-3xl font-bold text-slate-800">{performance.productivityScore}%</div>
                      <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${performance.productivityScore}%` }}></div>
                      </div>
                  </div>
                  <div className="card p-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Quality</h4>
                      <div className="text-3xl font-bold text-slate-800">{performance.qualityScore}%</div>
                      <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${performance.qualityScore}%` }}></div>
                      </div>
                  </div>
                  <div className="card p-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Impact</h4>
                      <div className="text-3xl font-bold text-slate-800">{performance.impactScore}%</div>
                      <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${performance.impactScore}%` }}></div>
                      </div>
                  </div>
              </div>

              {/* History Chart */}
              <div className="card p-6">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center"><Activity className="mr-2 text-bwz-primary"/> Performance Velocity</h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performance.history}>
                              <defs>
                                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#2c7a7b" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#2c7a7b" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <XAxis dataKey="date" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Area type="monotone" dataKey="score" stroke="#2c7a7b" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* Right Column: Badges & Feedback */}
          <div className="space-y-8">
              {/* Badges */}
              <div className="card p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Award className="mr-2 text-yellow-500"/> Achievements</h3>
                  {performance.badges.length === 0 ? (
                      <p className="text-slate-400 text-sm italic text-center py-4">No badges earned yet. Keep pushing!</p>
                  ) : (
                      <div className="grid grid-cols-1 gap-3">
                          {performance.badges.map(b => (
                              <div key={b.id} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100 transition-transform hover:scale-105">
                                  <div className="mr-3 bg-white p-2 rounded-full shadow-sm">{getIcon(b.icon)}</div>
                                  <div>
                                      <div className="font-bold text-slate-700 text-sm">{b.label}</div>
                                      <div className="text-[10px] text-slate-400 uppercase font-bold">Earned</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Feedback */}
              <div className="card p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Zap className="mr-2 text-blue-500"/> Automated Coaching</h3>
                  <div className="space-y-3">
                      {performance.actionableFeedback.map((fb, i) => (
                          <div key={i} className="flex items-start text-sm text-slate-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-500 flex-shrink-0"/>
                              {fb}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default PersonalDashboard;
