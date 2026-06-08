import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  LayoutDashboard, Database, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, AlertCircle, Menu, X, Calendar, Filter, Briefcase, Users, Bell, Layers
} from 'lucide-react';

// --- CONFIGURATION ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLSY4ZgGWGCTe5oTtwp8rXS8HrU6dQsBUDKIt0GckZvZ4pS6fX0XShrhoM0AfVxFJiIod-sd9nf2Su/pub?output=csv';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// --- UTILITIES ---
const parseFlexibleDate = (dateStr) => {
  if (dateStr === null || dateStr === undefined) return null;
  let str = String(dateStr).trim();
  if (!str) return null;

  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  let cleanStr = str.replace(/([a-zA-Z]+)[-/](\d+)/g, '$1 $2');
  cleanStr = cleanStr.replace(/(\d+)[-/]([a-zA-Z]+)/g, '$1 $2');
  cleanStr = cleanStr.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');

  d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;

  const myMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
  if (myMatch) {
    d = new Date(`${myMatch[2]}-${myMatch[1].padStart(2, '0')}-01T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

// Exact strings for RT Dashboard & RT Details
const KNOWN_RT_TYPES = [
  "Inside - No employer",
  "Inside - Wait Contract Expiry",
  "Inside - Will Cancel Visa",
  "Inside - With Flight Tx",
  "Inside - With Flight Tx Within 7 days",
  "Inside - Wants to go home",
  "Outside - No employer",
  "Outside - Wait Contract Expiry",
  "Outside - Vacation",
  "Outside - Will Cancel Visa",
  "Outside - Wants to go home (no visa, unknown visa)",
  "Outside - With Flight Tx",
  "Outside - With Flight Tx Within 7 days",
  "Outside - Request Tx",
  "In Philippines",
  "In Philippines with Flight Tx",
  "Recruited",
  "Not Interested",
  "Inactive"
];

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = '' }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold tracking-tight text-slate-900 ${className}`}>{children}</h3>
);
const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 pt-0 flex-1 flex flex-col ${className}`}>{children}</div>
);

const Input = ({ className = '', icon: Icon, ...props }) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />}
    <input
      className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${Icon ? 'pl-10' : ''} ${className}`}
      {...props}
    />
  </div>
);

const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-700",
    ghost: "hover:bg-slate-100 text-slate-700",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    icon: "h-10 w-10",
  };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      let csvText = await response.text();
      
      if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
        throw new Error("Received HTML instead of data. Please ensure the Google Sheet is published to the web as a CSV.");
      }

      const parseCSV = (text) => {
        const results = [];
        let row = [];
        let val = '';
        let inQuotes = false;
        
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (inQuotes) {
            if (char === '"' && nextChar === '"') {
              val += '"';
              i++; 
            } else if (char === '"') {
              inQuotes = false;
            } else {
              val += char;
            }
          } else {
            if (char === '"') {
              inQuotes = true;
            } else if (char === ',') {
              row.push(val);
              val = '';
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
              row.push(val);
              results.push(row);
              row = [];
              val = '';
              if (char === '\r') i++; 
            } else {
              val += char;
            }
          }
        }
        
        row.push(val); 
        if (row.length > 0 || val !== '') results.push(row);
        
        return results.filter(r => r.some(cell => cell && cell.trim() !== ''));
      };

      const parsedRows = parseCSV(csvText);
      
      if (parsedRows.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const headers = parsedRows[0].map(h => h ? h.trim() : '');
      const parsedData = [];

      for (let i = 1; i < parsedRows.length; i++) {
        const currentLine = parsedRows[i];
        const row = {};
        headers.forEach((header, index) => {
          if (!header) return; 
          let val = currentLine[index] !== undefined ? currentLine[index].trim() : null;
          if (val !== null && val !== '') {
            if (!isNaN(Number(val))) {
              val = Number(val);
            } else if (val.toLowerCase() === 'true') {
              val = true;
            } else if (val.toLowerCase() === 'false') {
              val = false;
            }
          }
          row[header] = val;
        });
        parsedData.push(row);
      }

      setData(parsedData);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load data. Please check the data source connection.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const getNavClass = (tabId) => `
    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
    ${activeTab === tabId ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
  `;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-700 tracking-tight">
            <LayoutDashboard className="h-6 w-6" />
            <span>Maids and Cleaners</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={getNavClass('analytics')}>
            <Briefcase className="h-5 w-5" /> Analytics
          </button>
          <button onClick={() => { setActiveTab('rt_details'); setIsMobileMenuOpen(false); }} className={getNavClass('rt_details')}>
            <Users className="h-5 w-5" /> RT Details Pull
          </button>
          <button onClick={() => { setActiveTab('follow_ups'); setIsMobileMenuOpen(false); }} className={getNavClass('follow_ups')}>
            <Bell className="h-5 w-5" /> Follow ups
          </button>
          <button onClick={() => { setActiveTab('dropout_stage'); setIsMobileMenuOpen(false); }} className={getNavClass('dropout_stage')}>
            <Layers className="h-5 w-5" /> Dropout Stage
          </button>
          <button onClick={() => { setActiveTab('database'); setIsMobileMenuOpen(false); }} className={getNavClass('database')}>
            <Database className="h-5 w-5" /> Full Database
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          <p>Last updated:</p>
          <p className="font-medium text-slate-700">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {activeTab.replace(/_/g, ' ')} Overview
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {loading && <RefreshCw className="h-5 w-5 text-slate-400 animate-spin" />}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="hidden sm:flex gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 flex flex-col">
          {error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchData} variant="outline" className="bg-white border-red-200 text-red-700 hover:bg-red-50">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : loading && data.length === 0 ? (
            <LoadingState />
          ) : data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <Database className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">No data found in the spreadsheet.</p>
                <p className="text-sm mt-1">Make sure the Google Sheet is published and contains data.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeTab === 'analytics' && <AnalyticsView data={data} />}
              {activeTab === 'rt_details' && <RTDetailsView data={data} />}
              {activeTab === 'follow_ups' && <FollowUpsView data={data} />}
              {activeTab === 'dropout_stage' && <DropoutStageView data={data} />}
              {activeTab === 'database' && <DatabaseView data={data} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-VIEWS ---

function AnalyticsView({ data }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const COLORS = [
    '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#84cc16',
    '#f43f5e', '#a855f7', '#06b6d4', '#eab308', '#22c55e',
    '#6366f1', '#d946ef', '#0ea5e9', '#cbd5e1'
  ];

  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null;

    const sample = data[0];
    const columns = Object.keys(sample).filter(k => k.trim() !== ''); 
    
    const dateCol = columns.find(c => /date|time|timestamp/i.test(c));
    const rtCol = columns.find(c => 
      c.toLowerCase().includes('rt - recruitment') || 
      c.toLowerCase().includes('recruitment type') || 
      c.toLowerCase() === 'rt'
    ); 
    const countryCol = columns.find(c => c.trim().toLowerCase() === 'country') || columns.find(c => c.toLowerCase().includes('country') && !c.toLowerCase().includes('nationality'));
    const cancelledCol = columns.find(c => c.toLowerCase().includes('cancelled') || c.toLowerCase().includes('cancel'));
    const phoneCol = columns.find(c => /phone|contact|mobile|cell/i.test(c));
    const ageCol = columns.find(c => /age/i.test(c));

    let filteredData = data;
    if (dateCol && (startDate || endDate)) {
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      start.setHours(0,0,0,0);
      const end = endDate ? new Date(endDate) : new Date('2100-01-01');
      end.setHours(23,59,59,999);

      filteredData = data.filter(row => {
        if (!row[dateCol]) return false;
        const rowDate = parseFlexibleDate(row[dateCol]); 
        if (!rowDate) return false; 
        return rowDate >= start && rowDate <= end;
      });
    }

    const rtCounts = {};
    const countryCounts = {};
    const cancelledCounts = {};
    
    filteredData.forEach(row => {
      // RT Aggregation
      if (rtCol) {
        let val = row[rtCol];
        let finalCategory = 'Unspecified';
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          const cleanVal = String(val).trim().toLowerCase();
          const match = KNOWN_RT_TYPES.find(k => k.toLowerCase() === cleanVal);
          finalCategory = match || String(val).trim();
        }
        rtCounts[finalCategory] = (rtCounts[finalCategory] || 0) + 1;
      }
      
      // Country Aggregation
      if (countryCol) {
        let val = row[countryCol];
        let country = (val !== null && val !== undefined && String(val).trim() !== '') ? String(val).trim() : 'Unknown';
        
        const excludedTerms = ['filipina', 'kenyan', 'ethiopian', 'ugandan', 'other nationalities', 'other', 'others'];
        if (!excludedTerms.includes(country.toLowerCase())) {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      }

      // Cancelled Applicants Aggregation
      if (cancelledCol) {
        let val = row[cancelledCol];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          let status = String(val).trim();
          cancelledCounts[status] = (cancelledCounts[status] || 0) + 1;
        }
      }
    });

    const rtData = Object.entries(rtCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const countryData = Object.entries(countryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const cancelledData = Object.entries(cancelledCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const totalValid = filteredData.length;
    const kpis = [];
    
    kpis.push({ title: startDate || endDate ? "Filtered Candidates" : "Total Candidates", value: totalValid.toLocaleString() });

    if (phoneCol) {
      const uniqueContacts = new Set(filteredData.map(r => r[phoneCol]).filter(Boolean));
      kpis.push({ title: "Unique Contacts", value: uniqueContacts.size.toLocaleString() });
    }

    if (ageCol) {
      const validAges = filteredData.map(r => Number(r[ageCol])).filter(a => !isNaN(a) && a > 0);
      const avgAge = validAges.length > 0 ? (validAges.reduce((a,b) => a+b, 0) / validAges.length) : 0;
      kpis.push({ title: "Average Age", value: avgAge.toFixed(1) });
    }

    if (rtCol) {
      const topRT = rtData.length > 0 ? rtData[0] : { name: 'N/A', count: 0 };
      kpis.push({ title: "Primary Recruitment Type", value: topRT.name });
    }

    if (countryCol && countryData.length > 0) {
      const topCountry = countryData.find(c => c.name !== 'Unknown') || countryData[0];
      if (topCountry) kpis.push({ title: "Top Country", value: topCountry.name });
    }

    if (cancelledCol) {
      const totalCancelled = filteredData.filter(r => r[cancelledCol] && String(r[cancelledCol]).trim() !== '').length;
      kpis.push({ title: "Total Cancelled", value: totalCancelled.toLocaleString() });
    }

    return { 
      kpis, rtData, countryData, cancelledData, dateCol, 
      hasRt: !!rtCol, hasCountry: !!countryCol, hasCancelled: !!cancelledCol 
    };
  }, [data, startDate, endDate]);

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {analysis.dateCol && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} icon={Calendar} />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} icon={Calendar} />
            </div>
            {(startDate || endDate) && (
              <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); }} className="w-full sm:w-auto h-10">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid dynamically adjusts based on the number of generated KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {analysis.kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <p className="text-sm font-medium text-slate-500 mb-1 line-clamp-1" title={kpi.title}>{kpi.title}</p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-900 truncate" title={kpi.value}>{kpi.value}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* RT Breakdown Chart */}
        {analysis.hasRt && (
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recruitment Type Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.rtData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis 
                      type="category" dataKey="name" axisLine={false} tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }} width={200} 
                      tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} 
                    />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                       {analysis.rtData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Country Breakdown Chart */}
        {analysis.hasCountry && (
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Country Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.countryData} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" axisLine={false} tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} dy={10} angle={-45} textAnchor="end"
                      tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} 
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled Applicant Breakdown Chart */}
        {analysis.hasCancelled && analysis.cancelledData.length > 0 && (
          <Card className="col-span-1 xl:col-span-2">
            <CardHeader>
              <CardTitle>Cancelled Applicant Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.cancelledData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis 
                      type="category" dataKey="name" axisLine={false} tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11 }} width={240} 
                      tickFormatter={(val) => val.length > 35 ? val.substring(0, 35) + '...' : val} 
                    />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RTDetailsView({ data }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRT, setSelectedRT] = useState('All');

  // Compute all global columns from dataset so table headers render even if empty
  const allColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(k => k && k.trim() !== '');
  }, [data]);

  const analysis = useMemo(() => {
    if (!data || data.length === 0) return { missing: false, filteredData: [] };

    const dateCol = allColumns.find(c => /date|time|timestamp/i.test(c));
    const rtCol = allColumns.find(c => 
      c.toLowerCase().includes('rt - recruitment') || 
      c.toLowerCase().includes('recruitment type') || 
      c.toLowerCase() === 'rt'
    );

    let filteredData = data;
    
    // Apply Date filter
    if (dateCol && (startDate || endDate)) {
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      start.setHours(0,0,0,0);
      const end = endDate ? new Date(endDate) : new Date('2100-01-01');
      end.setHours(23,59,59,999);

      filteredData = filteredData.filter(row => {
        if (!row[dateCol]) return false;
        const rowDate = parseFlexibleDate(row[dateCol]); 
        if (!rowDate) return false; 
        return rowDate >= start && rowDate <= end;
      });
    }

    if (!rtCol) {
      return { missing: true, filteredData: [] };
    }

    // Apply exact RT match filter if not 'All'
    if (selectedRT !== 'All') {
      filteredData = filteredData.filter(row => {
        let val = row[rtCol];
        if (val === null || val === undefined || String(val).trim() === '') {
          return selectedRT === 'Unspecified';
        }
        const cleanVal = String(val).trim().toLowerCase();
        const match = KNOWN_RT_TYPES.find(k => k.toLowerCase() === cleanVal);
        const finalCategory = match || String(val).trim();
        return finalCategory === selectedRT;
      });
    }

    return { filteredData, dateCol, missing: false };
  }, [data, allColumns, startDate, endDate, selectedRT]);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Filter Bar */}
      <Card className="shrink-0">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1 w-full max-w-sm">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Recruitment Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedRT}
              onChange={(e) => setSelectedRT(e.target.value)}
            >
              <option value="All">All Types (Everything)</option>
              {KNOWN_RT_TYPES.map(rt => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
              <option value="Unspecified">Unspecified (Blank/Null)</option>
            </select>
          </div>

          {analysis.dateCol && (
            <>
              <div className="flex-1 w-full max-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} icon={Calendar} />
              </div>
              <div className="flex-1 w-full max-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} icon={Calendar} />
              </div>
              {(startDate || endDate) && (
                <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); }} className="w-full md:w-auto h-10">
                  Clear Dates
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {analysis.missing ? (
        <Card className="border-amber-200 bg-amber-50 shrink-0">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">RT Column Not Detected</h3>
            <p className="text-amber-700 max-w-lg">
              We couldn't automatically locate a column named "RT" or "Recruitment Type".
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Render embedded DatabaseView with only the specific filtered data subset */
        <div className="flex-1 relative">
          <DatabaseView data={analysis.filteredData} allColumns={allColumns} />
        </div>
      )}
    </div>
  );
}

function DatabaseView({ data, allColumns = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const rowsPerPage = 15;

  const columns = useMemo(() => {
    if (allColumns) return allColumns;
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(k => k && k.trim() !== '');
  }, [data, allColumns]);

  const columnTypes = useMemo(() => {
    const types = {};
    columns.forEach(col => {
      if (/date|time|timestamp/i.test(col)) {
        types[col] = 'date';
      } else {
        types[col] = 'text'; 
      }
    });
    return types;
  }, [columns]);

  const handleFilterChange = (col, value, isDateRange = false) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (isDateRange) {
        newFilters[col] = { ...(newFilters[col] || {}), ...value };
      } else {
        newFilters[col] = value;
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setColumnFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(columnFilters).some(v => 
    (typeof v === 'string' && v !== '') || 
    (v && typeof v === 'object' && (v.start || v.end))
  ) || searchTerm !== '';

  const processedData = useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    Object.entries(columnFilters).forEach(([col, filterVal]) => {
      if (!filterVal) return;

      if (columnTypes[col] === 'date' && typeof filterVal === 'object') {
        const { start, end } = filterVal;
        
        if (start || end) {
          result = result.filter(row => {
            if (!row[col]) return false; 
            
            const d = parseFlexibleDate(row[col]); 
            if (!d) return false; 
            
            d.setHours(0, 0, 0, 0);
            let isValid = true;
            
            if (start) {
              const s = new Date(start);
              if (!isNaN(s.getTime())) {
                s.setHours(0, 0, 0, 0);
                if (d < s) isValid = false;
              }
            }
            if (end) {
              const e = new Date(end);
              if (!isNaN(e.getTime())) {
                e.setHours(23, 59, 59, 999);
                if (d > e) isValid = false;
              }
            }
            return isValid;
          });
        }
      } else {
        if (typeof filterVal === 'string' && filterVal.trim() !== '') {
          const lowerFilter = filterVal.toLowerCase();
          result = result.filter(row => 
            row[col] !== null && row[col] !== undefined && 
            String(row[col]).toLowerCase().includes(lowerFilter)
          );
        }
      }
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (columnTypes[sortConfig.key] === 'date') {
          const dA = parseFlexibleDate(aVal);
          const dB = parseFlexibleDate(bVal);
          const tA = dA ? dA.getTime() : 0;
          const tB = dB ? dB.getTime() : 0;
          if (tA < tB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (tA > tB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, columnFilters, columnTypes]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, data]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <Card className="flex flex-col h-full min-h-[500px]">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-t-xl shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
          <Input 
            placeholder="Search across all fields..." 
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button 
              variant={showFilters ? 'primary' : 'outline'} 
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-2" />
              Columns
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
          Showing {processedData.length} records
        </div>
      </div>

      <div className="flex-1 overflow-x-auto relative">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-600 bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((col) => (
                <th 
                  key={col} 
                  className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200 select-none align-top"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1 justify-between">
                    <span>{col}</span>
                    {sortConfig.key === col ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {showFilters && (
              <tr className="bg-slate-100/50 border-b border-slate-200">
                {columns.map(col => (
                  <th key={`filter-${col}`} className="px-4 py-2 font-normal">
                    {columnTypes[col] === 'date' ? (
                      <div className="flex flex-col gap-1 min-w-[130px]">
                        <input 
                          type="date" 
                          className="text-xs border border-slate-300 rounded px-2 py-1.5 w-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={(columnFilters[col] && columnFilters[col].start) || ''}
                          onChange={(e) => handleFilterChange(col, { start: e.target.value }, true)}
                          title="Start Date"
                        />
                        <input 
                          type="date" 
                          className="text-xs border border-slate-300 rounded px-2 py-1.5 w-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={(columnFilters[col] && columnFilters[col].end) || ''}
                          onChange={(e) => handleFilterChange(col, { end: e.target.value }, true)}
                          title="End Date"
                        />
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        className="text-xs border border-slate-300 rounded px-2 py-1.5 w-full min-w-[120px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={`Filter...`}
                        value={(typeof columnFilters[col] === 'string' ? columnFilters[col] : '')}
                        onChange={(e) => handleFilterChange(col, e.target.value)}
                        onClick={(e) => e.stopPropagation()} 
                      />
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columns.map(col => (
                    <td key={col} className="px-6 py-4 text-slate-700 max-w-[250px] truncate">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length || 1} className="px-6 py-12 text-center text-slate-500">
                  {data.length === 0 ? "Select a Recruitment Type to view data." : "No matching records found based on your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl flex items-center justify-between shrink-0">
        <div className="text-sm text-slate-500">
          Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || totalPages === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || totalPages === 0}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-200/50 rounded-xl h-28 w-full"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-200/50 rounded-xl h-[400px] w-full"></div>
        <div className="bg-slate-200/50 rounded-xl h-[400px] w-full"></div>
      </div>
    </div>
  );
}

// --- NEW DROPOUT STAGE COMPONENT ---
function DropoutStageView({ data }) {
  const [selectedStage, setSelectedStage] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');

  const allColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(k => k && k.trim() !== '');
  }, [data]);

  const dateCol = allColumns.find(c => /date|time|timestamp/i.test(c));
  const countryCol = allColumns.find(c => c.trim().toLowerCase() === 'country') || allColumns.find(c => c.toLowerCase().includes('country') && !c.toLowerCase().includes('nationality'));

  const uniqueCountries = useMemo(() => {
    if (!data || data.length === 0 || !countryCol) return [];
    const countries = new Set();
    data.forEach(row => {
      let val = row[countryCol];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        countries.add(String(val).trim());
      }
    });
    return Array.from(countries).sort();
  }, [data, countryCol]);

  const analysis = useMemo(() => {
    if (!data || data.length === 0) return { stages: {}, filteredData: [], missing: true };

    const ageCol = allColumns.find(c => /age/i.test(c));
    const summaryCol = allColumns.find(c => /summary/i.test(c)) || allColumns.find(c => /note|remark/i.test(c));
    const rtCol = allColumns.find(c => 
      c.toLowerCase().includes('rt - recruitment') || 
      c.toLowerCase().includes('recruitment type') || 
      c.toLowerCase() === 'rt'
    );

    let filteredData = data;

    // Apply Date filter
    if (dateCol && (startDate || endDate)) {
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      start.setHours(0,0,0,0);
      const end = endDate ? new Date(endDate) : new Date('2100-01-01');
      end.setHours(23,59,59,999);

      filteredData = filteredData.filter(row => {
        if (!row[dateCol]) return false;
        const rowDate = parseFlexibleDate(row[dateCol]); 
        if (!rowDate) return false; 
        return rowDate >= start && rowDate <= end;
      });
    }

    // Apply Country filter
    if (countryCol && selectedCountry !== 'All') {
      filteredData = filteredData.filter(row => {
        let val = row[countryCol];
        if (selectedCountry === 'Unspecified') {
          return val === null || val === undefined || String(val).trim() === '';
        }
        return val !== null && val !== undefined && String(val).trim() === selectedCountry;
      });
    }

    const stages = {
      'Stage 1': [],
      'Stage 2': [],
      'Stage 3': []
    };

    filteredData.forEach(row => {
      const hasAge = ageCol && row[ageCol] !== null && row[ageCol] !== undefined && String(row[ageCol]).trim() !== '';
      const hasSummary = summaryCol && row[summaryCol] !== null && row[summaryCol] !== undefined && String(row[summaryCol]).trim() !== '';
      const hasRT = rtCol && row[rtCol] !== null && row[rtCol] !== undefined && String(row[rtCol]).trim() !== '';

      if (hasAge && hasSummary && hasRT) {
        // Stage 3: Everything is filled
        stages['Stage 3'].push(row);
      } else if (hasAge && hasSummary && !hasRT) {
        // Stage 2: Age and Summary are filled but Recruitment Type is not
        stages['Stage 2'].push(row);
      } else {
        // Stage 1: Age, Summary, RT are not filled (or basic info incomplete)
        stages['Stage 1'].push(row);
      }
    });

    return { stages, filteredData, missing: false, ageCol, summaryCol, rtCol };
  }, [data, allColumns, startDate, endDate, selectedCountry, dateCol, countryCol]);

  const displayData = selectedStage === 'All' ? analysis.filteredData : analysis.stages[selectedStage] || [];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Filter Bar */}
      <Card className="shrink-0">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-end">
          {countryCol && (
            <div className="flex-1 w-full max-w-[250px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="All">All Countries</option>
                {uniqueCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Unspecified">Unspecified (Blank/Null)</option>
              </select>
            </div>
          )}

          {dateCol && (
            <>
              <div className="flex-1 w-full max-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} icon={Calendar} />
              </div>
              <div className="flex-1 w-full max-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} icon={Calendar} />
              </div>
            </>
          )}

          {(startDate || endDate || selectedCountry !== 'All') && (
            <Button 
              variant="outline" 
              onClick={() => { setStartDate(''); setEndDate(''); setSelectedCountry('All'); }} 
              className="w-full md:w-auto h-10"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <Card 
          className={`cursor-pointer transition-colors ${selectedStage === 'All' ? 'ring-2 ring-blue-500 shadow-md' : 'hover:bg-slate-50'}`} 
          onClick={() => setSelectedStage('All')}
        >
          <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
            <p className="text-sm font-medium text-slate-500 mb-1">Filtered Candidates</p>
            <h4 className="text-3xl font-bold text-slate-900">{analysis.filteredData.length}</h4>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors ${selectedStage === 'Stage 1' ? 'ring-2 ring-red-500 shadow-md' : 'hover:bg-red-50/50'}`} 
          onClick={() => setSelectedStage('Stage 1')}
        >
          <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
            <p className="text-sm font-medium text-red-600 mb-1">Stage 1 Dropout</p>
            <h4 className="text-3xl font-bold text-slate-900">{analysis.stages['Stage 1']?.length || 0}</h4>
            <p className="text-xs text-slate-500 mt-2">Age, Summary, RT missing</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${selectedStage === 'Stage 2' ? 'ring-2 ring-amber-500 shadow-md' : 'hover:bg-amber-50/50'}`} 
          onClick={() => setSelectedStage('Stage 2')}
        >
          <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
            <p className="text-sm font-medium text-amber-600 mb-1">Stage 2 Dropout</p>
            <h4 className="text-3xl font-bold text-slate-900">{analysis.stages['Stage 2']?.length || 0}</h4>
            <p className="text-xs text-slate-500 mt-2">Has Age & Summary, No RT</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${selectedStage === 'Stage 3' ? 'ring-2 ring-green-500 shadow-md' : 'hover:bg-green-50/50'}`} 
          onClick={() => setSelectedStage('Stage 3')}
        >
          <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
            <p className="text-sm font-medium text-green-600 mb-1">Stage 3 Complete</p>
            <h4 className="text-3xl font-bold text-slate-900">{analysis.stages['Stage 3']?.length || 0}</h4>
            <p className="text-xs text-slate-500 mt-2">All Info Filled</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 relative min-h-[400px]">
        {analysis.missing ? (
          <Card className="h-full flex items-center justify-center">
            <p className="text-slate-500">Not enough data to calculate dropout stages.</p>
          </Card>
        ) : (
          <DatabaseView data={displayData} allColumns={allColumns} />
        )}
      </div>
    </div>
  );
}

// --- NEW FOLLOW UPS COMPONENT ---

function FollowUpsView({ data }) {
  const [selectedDateCol, setSelectedDateCol] = useState('');
  const [expandedGroup, setExpandedGroup] = useState('All Upcoming');

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(k => k && k.trim() !== '');
  }, [data]);

  // Auto-detect a reasonable joining date column on load
  useEffect(() => {
    if (columns.length > 0 && !selectedDateCol) {
      const bestMatch = columns.find(c => 
        c.toLowerCase().includes('estimated joining') ||
        c.toLowerCase().includes('join date') ||
        c.toLowerCase().includes('joining date') ||
        c.toLowerCase().includes('expected')
      );
      
      if (bestMatch) {
        setSelectedDateCol(bestMatch);
      } else {
        const fallback = columns.find(c => /date|time/i.test(c));
        if (fallback) setSelectedDateCol(fallback);
      }
    }
  }, [columns, selectedDateCol]);

  const analysis = useMemo(() => {
    if (!data || data.length === 0 || !selectedDateCol) return { rows: [], groups: {}, missing: true };

    const rtCol = columns.find(c => 
      c.toLowerCase().includes('rt - recruitment') || 
      c.toLowerCase().includes('recruitment type') || 
      c.toLowerCase() === 'rt'
    );

    // Define "Today" at 00:00:00 to filter out past dates reliably
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Define "Day After Tomorrow" for the blinking urgency
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    dayAfterTomorrow.setHours(23, 59, 59, 999);

    let validRows = [];

    data.forEach(row => {
      const rawVal = row[selectedDateCol];
      const parsedDate = parseFlexibleDate(rawVal);
      
      if (parsedDate) {
        parsedDate.setHours(0, 0, 0, 0); // Normalize time for exact date comparison
        
        // Present or future only
        if (parsedDate >= today) {
          validRows.push({
            ...row,
            _parsedDate: parsedDate,
            _isUrgent: parsedDate <= dayAfterTomorrow,
            _displayDate: parsedDate.toLocaleDateString(undefined, { 
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
            })
          });
        }
      }
    });

    // Sort Ascending (Soonest first)
    validRows.sort((a, b) => a._parsedDate.getTime() - b._parsedDate.getTime());

    const groups = { 'All Upcoming': validRows };
    KNOWN_RT_TYPES.forEach(rt => groups[rt] = []);
    groups['Unspecified'] = [];
    
    validRows.forEach(row => {
      let val = rtCol ? row[rtCol] : null;
      let finalCategory = 'Unspecified';
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        const cleanVal = String(val).trim().toLowerCase();
        const match = KNOWN_RT_TYPES.find(k => k.toLowerCase() === cleanVal);
        finalCategory = match || String(val).trim();
      }
      if (!groups[finalCategory]) groups[finalCategory] = [];
      groups[finalCategory].push(row);
    });

    return { rows: validRows, groups, missing: false };
  }, [data, selectedDateCol, columns]);

  const sectionsToRender = useMemo(() => {
    if (!analysis || analysis.missing) return [];
    const base = ['All Upcoming', ...KNOWN_RT_TYPES];
    const extraKeys = Object.keys(analysis.groups).filter(k => !base.includes(k) && k !== 'Unspecified');
    
    return [...base, ...extraKeys, 'Unspecified'].filter(k => {
        // Hide empty unspecified or unknown groups to avoid clutter
        if ((k === 'Unspecified' || extraKeys.includes(k)) && (!analysis.groups[k] || analysis.groups[k].length === 0)) return false;
        return true;
    });
  }, [analysis]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <style>{`
        @keyframes urgentRowBlink {
          0%, 100% { background-color: rgba(254, 226, 226, 0.4); } /* soft red */
          50% { background-color: rgba(255, 255, 255, 1); } /* white */
        }
        .urgent-row {
          animation: urgentRowBlink 2s ease-in-out infinite;
        }
      `}</style>

      {/* Configuration Header - Simplified */}
      <Card className="shrink-0">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="font-semibold text-slate-800">Timeline Schedule</h2>
              <p className="text-sm text-slate-500 hidden sm:block">Showing present and future dates. Blinking red = due within 2 days.</p>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-600 bg-slate-100 px-4 py-2 rounded-lg">
            Total Upcoming: <span className="text-blue-700 font-bold">{analysis.rows?.length || 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Accordions */}
      {analysis.missing ? (
        <Card className="p-8 text-center text-slate-500">
          No date column detected to track follow-ups.
        </Card>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {sectionsToRender.map(groupName => {
            const groupRows = analysis.groups[groupName] || [];
            const isExpanded = expandedGroup === groupName;
            
            return (
              <Card key={groupName} className="flex flex-col shrink-0 overflow-hidden">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : groupName)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">{groupName}</span>
                    <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
                      {groupRows.length}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50">
                    <div className="overflow-x-auto relative max-h-[500px]">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-slate-600 bg-slate-100 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-6 py-3 font-semibold border-b border-slate-200 z-20">Status</th>
                            <th className="px-6 py-3 font-semibold border-b border-slate-200">Date ({selectedDateCol})</th>
                            {columns.filter(c => c !== selectedDateCol).slice(0, 7).map((col) => (
                              <th key={col} className="px-6 py-3 font-semibold border-b border-slate-200">{col}</th>
                            ))}
                            {columns.length > 8 && (
                              <th className="px-6 py-3 font-semibold border-b border-slate-200 italic text-slate-400">...more columns</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {groupRows.length > 0 ? (
                            groupRows.map((row, i) => (
                              <tr 
                                key={i} 
                                className={`border-b border-slate-200 transition-colors hover:bg-white bg-slate-50/30 ${row._isUrgent ? 'urgent-row' : ''}`}
                                style={row._isUrgent ? { borderLeft: '4px solid #ef4444' } : { borderLeft: '4px solid transparent' }}
                              >
                                <td className="px-6 py-4">
                                  {row._isUrgent ? (
                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                      Urgent
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      Upcoming
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                  {row._displayDate}
                                </td>
                                {columns.filter(c => c !== selectedDateCol).slice(0, 7).map(col => (
                                  <td key={col} className="px-6 py-4 text-slate-700 max-w-[200px] truncate">
                                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                                  </td>
                                ))}
                                {columns.length > 8 && <td className="px-6 py-4 text-slate-400">...</td>}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                No upcoming applications found for this category.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}