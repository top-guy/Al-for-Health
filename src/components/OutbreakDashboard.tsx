import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { Bell, AlertCircle, TrendingUp, Map, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { cn } from '../lib/utils';

interface OutbreakDashboardProps {
  profile: any;
}

export function OutbreakDashboard({ profile }: OutbreakDashboardProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for alerts
    const alertsQuery = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Aggregate cases for stats (simplified for prototype)
    const casesQuery = query(
      collection(db, 'cases'), 
      orderBy('timestamp', 'desc'), 
      limit(100)
    );
    
    const unsubscribeStats = onSnapshot(casesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      
      // Group by day
      const dailyCounts: Record<string, number> = {};
      data.forEach(c => {
        const date = c.timestamp?.toDate().toLocaleDateString() || 'Unknown';
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const chartData = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count
      })).reverse();

      setStats(chartData);
      setLoading(false);
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeStats();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Outbreak Monitoring</h2>
        <p className="text-slate-500">Real-time surveillance for {profile?.village || 'your district'}.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={<TrendingUp className="text-blue-600" />} 
          label="Total Cases (30d)" 
          value="124" 
          trend="+12% from last week" 
        />
        <StatCard 
          icon={<ShieldAlert className="text-red-600" />} 
          label="Active Alerts" 
          value={alerts.filter(a => a.status === 'active').length.toString()} 
          trend="2 Critical referrals" 
        />
        <StatCard 
          icon={<CheckCircle2 className="text-green-600" />} 
          label="Resolved Cases" 
          value="89" 
          trend="92% follow-up rate" 
        />
      </div>

      {/* Chart Section */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Case Volume Trend
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Alerts Section */}
      <section className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-600" />
          Recent Alerts
        </h3>
        
        {alerts.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm">No active alerts detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={cn(
                  "p-4 rounded-2xl border flex items-start gap-4 transition-all",
                  alert.status === 'active' ? "bg-red-50 border-red-100" : "bg-white border-slate-200"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl shrink-0",
                  alert.status === 'active' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                )}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900">{alert.type} Spike</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {alert.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {alert.caseCount} cases reported in <span className="font-semibold">{alert.village}</span> within 48 hours.
                  </p>
                  {alert.status === 'active' && (
                    <div className="mt-3 flex gap-2">
                      <button className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm">
                        Notify District
                      </button>
                      <button className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold">
                        View Map
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-slate-50 rounded-lg">
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-[10px] font-medium text-slate-400">{trend}</span>
      </div>
    </div>
  );
}
