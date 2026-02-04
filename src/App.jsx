import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Upload, Users, Briefcase, Building2, ChevronLeft, Clock, 
  BarChart2, ArrowRight, Filter, ChevronDown, Check, X, ArrowUpDown, Calendar as CalendarIcon, Sparkles, Settings, Loader2, Table, PieChart as PieChartIcon
} from 'lucide-react';

// --- Assets & Constants ---

const COLORS = {
  bg: '#edf4ed',
  primary: '#a5c869',
  secondary: '#2f3f28',
  tertiary: '#d2beff',
  text: '#2f3f28',
  white: '#ffffff',
  chartPalette: [
    '#2f3f28', // Dark Green
    '#a5c869', // Primary Green
    '#563f7a', // Deep Purple
    '#d2beff', // Lavender
    '#e07a5f', // Terracotta (Contrast)
    '#3d405b', // Slate
    '#81b29a', // Sage
    '#f2cc8f', // Sand
    '#9980cc', // Rich Lavender
    '#4a6741', // Forest
  ]
};

const LogoMain = () => (
  <svg viewBox="0 0 196 46" className="h-10 w-auto">
    <path fill={COLORS.secondary} d="M146.85,40.97c-4.91,1.07-9.54-1.15-11.72-5.63-1.95-4.03-1.87-10.51.64-14.92,1.86-3.26,5.53-5.15,9.26-4.72,1.64.19,3.37.87,4.54,2.64-2.33.93-3.09,3.89-1.65,5.94,2.4,3.41,7.38,1.54,7.44-2.59.07-4.53-4.8-7.47-8.74-8.17-8.43-1.51-17.36,2.86-19.37,11.53-2.59,11.19,6.03,20.59,17.35,19.54,6.44-.6,11.05-5.03,11.52-11.55l-2.37-.6c-.55,4.07-2.65,7.62-6.89,8.54Z"/>
    <polygon fill={COLORS.secondary} points="95.99 13.83 85.68 13.83 85.68 16.21 89.22 16.21 89.23 41.69 85.68 41.69 85.68 44.07 99.58 44.07 99.58 41.69 95.99 41.69 95.99 13.83"/>
    <path fill={COLORS.secondary} d="M121.84,32.86c0,3.02-.28,8.14-4.21,8.49-2.96.27-4.72-1.27-4.89-4.2v-20.94h10.3v-2.38h-10.29V5.67h-2.19c-.81,4.63-4.85,8.16-9.72,8.16v2.38h5.27v20.35c.29,6.15,5.55,8.91,11.25,7.91,5.69-.99,6.86-6.65,6.79-11.61h-2.3Z"/>
    <path fill={COLORS.secondary} d="M21.16,19.41c-4.58-1.04-13.19-1.4-13.26-7.75-.05-5.56,5.94-6.94,10.4-6.04,5.72,1.15,9.4,6.32,11.46,11.41l2.47-.82-1.79-12.83h-2.3c-.12,1.09-.26,2.35-1.66,2.3-1.17-.04-3.69-1.52-4.99-1.98C13.13.75.67,4.71,1.7,15.31c.61,6.22,7.16,8.9,12.43,10.18,4.56,1.11,13.05,1.33,14,7.09,1.12,6.83-5.09,10.48-11.22,9.25-6.35-1.27-11.11-7.6-13.68-13.14l-2.47.83,2.31,14.54h2.38c.07-2,.9-3.73,3.21-2.9,2.4.86,4.23,2.53,6.99,3.13,9.72,2.13,21.59-4.73,18.57-15.83-1.57-5.77-7.81-7.88-13.04-9.06Z"/>
    <ellipse fill={COLORS.secondary} cx="92.62" cy="6.28" rx="4.66" ry="4.62"/>
    <path fill={COLORS.secondary} d="M193.12,35.41c-.03,1.54.01,5.05-1.59,5.85-1.34.67-2.85-.02-3.01-1.55-.21-5.43.29-11.42,0-16.83-.22-4.36-2.39-7.87-6.7-9.1,0,0-8.89-3.11-13.46,5.33V1h-10.31v2.38h3.67l-.05,38.31h-3.63v2.38h13.98v-2.38h-3.67v-16.44c.15-4.85,3.1-9.2,8.46-8.44,3.87.55,4.92,3.81,5.07,7.25.21,4.77-.39,10.34,0,15.03.36,4.25,3.8,6.34,7.86,5.83,4.89-.62,5.51-5.44,5.49-9.51h-2.13Z"/>
    <path fill={COLORS.secondary} d="M58.35,21.78l8.96,22.88h1.88c2.72-6.84,5.24-14.99,7.87-21.82.68-1.77,1.58-4.25,3.07-5.47.81-.66,1.93-1.01,2.9-1.36v-2.21h-12.28v2.21c1.1.18,2.37.34,3.24,1.11,1.56,1.39.82,3.85.32,5.58-1.14,3.95-2.71,7.88-3.93,11.81l-6.83-18.32h2.88v-2.37h-12.28v2.37h3.52l-6.63,18.08-5.62-18.08h3.53v-2.37h-13.48v2.37h2.7l9.42,28.48h1.89l8.87-22.88Z"/>
  </svg>
);

const LogoSquare = () => (
  <svg viewBox="0 0 512 512" className="w-full h-full">
    <path fill={COLORS.secondary} d="M292.53,210.27c-48.63-11-140.01-14.83-140.66-82.25-.57-59.05,63-73.68,110.32-64.14,60.69,12.24,99.76,67.11,121.62,121.05l26.22-8.65-18.96-136.11h-24.37c-1.28,11.59-2.81,24.9-17.63,24.38-12.43-.43-39.16-16.16-52.97-21.02-88.77-31.25-221.02,10.75-210.06,123.28,6.43,66.05,75.99,94.39,131.91,108.03,48.42,11.8,138.49,14.15,148.51,75.23,11.89,72.45-54.05,111.23-119.07,98.2-67.41-13.51-117.87-80.63-145.14-139.46l-26.25,8.84,24.46,154.33h25.27c.69-21.27,9.58-39.63,34.01-30.82,25.43,9.17,44.87,26.84,74.12,33.24,103.11,22.56,229.1-50.17,197.05-167.97-16.64-61.17-82.92-83.62-138.38-96.16Z"/>
  </svg>
);

// --- Helpers ---

const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = [];
    let currentVal = '';
    let inQuotes = false;
    for(let i=0; i<line.length; i++) {
      if(line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += line[i];
      }
    }
    values.push(currentVal.trim());

    const entry = {};
    headers.forEach((h, i) => {
      let val = values[i] || '';
      if (h.includes('switcher')) entry.switcher = val;
      else if (h.includes('date')) entry.dateStr = val;
      else if (h.includes('department')) entry.department = val;
      else if (h.includes('client')) entry.client = val;
      else if (h.includes('task')) entry.task = val;
      else if (h.includes('time') || h.includes('spent')) entry.minutes = parseInt(val) || 0;
      else entry[h] = val;
    });

    if (entry.dateStr) {
      const parts = entry.dateStr.split('/');
      if (parts.length === 3) {
        entry.dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        // Adjust month to 0-indexed for JS Date
      } else {
        entry.dateObj = new Date(); 
      }
    }
    
    return entry;
  }).filter(e => e.switcher && e.client && e.dateObj instanceof Date && !isNaN(e.dateObj));
};

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
};

// --- API Service ---

const callGemini = async (apiKey, prompt) => {
    try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );
    
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "API request failed");
        }
    
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

// --- Components ---

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey }) => {
    const [inputKey, setInputKey] = useState(apiKey);

    useEffect(() => {
        setInputKey(apiKey);
    }, [apiKey, isOpen]);

    const handleSave = () => {
        setApiKey(inputKey);
        localStorage.setItem('switch_ai_key', inputKey);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-[#2f3f28] font-dm mb-4">Settings</h3>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Gemini API Key</label>
                    <input 
                        type="password"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="Paste your AIza... key here"
                        className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-[#a5c869] font-dm"
                    />
                    <p className="text-xs text-stone-400 mt-2">
                        Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#a5c869] hover:underline">Google AI Studio</a>. 
                        It is stored locally in your browser.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg transition-colors font-dm">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-[#2f3f28] text-white rounded-lg hover:bg-[#1a2416] transition-colors font-dm font-bold">Save Key</button>
                </div>
            </div>
        </div>
    );
};

const AIInsightsModal = ({ isOpen, onClose, title, content, isLoading, error }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="bg-[#a5c869] text-white p-2 rounded-lg">
                  <Sparkles size={20} />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-[#2f3f28] font-dm">{title}</h3>
                  <p className="text-xs text-stone-500 font-dm">AI Generated Analysis</p>
               </div>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-8 overflow-y-auto flex-1 font-dm text-[#2f3f28] leading-relaxed">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                 <Loader2 size={48} className="text-[#a5c869] animate-spin mb-4" />
                 <p className="text-stone-500 font-medium">Analyzing data...</p>
                 <p className="text-stone-400 text-sm mt-1">This may take a few seconds.</p>
              </div>
            ) : error ? (
                <div className="text-center py-8">
                    <p className="text-red-500 font-bold mb-2">Analysis Failed</p>
                    <p className="text-stone-500 text-sm">{error}</p>
                </div>
            ) : (
               <div 
                 className="prose prose-stone max-w-none"
                 dangerouslySetInnerHTML={{ __html: content }} 
               />
            )}
          </div>
        </div>
      </div>
    );
};

const Card = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-stone-100 p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
  >
    {children}
  </div>
);

const DetailStat = ({ label, value, sub }) => (
  <div className="flex flex-col">
    <span className="font-playfair text-stone-500 text-sm mb-1">{label}</span>
    <span className="font-dm text-2xl font-bold text-[#2f3f28]">{value}</span>
    {sub && <span className="font-dm text-xs text-[#a5c869] font-medium">{sub}</span>}
  </div>
);

const TimeFrameToggle = ({ current, onChange }) => (
  <div className="flex bg-stone-100 p-1 rounded-lg">
    {['day', 'week', 'month'].map((tf) => (
      <button
        key={tf}
        onClick={() => onChange(tf)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
          current === tf 
            ? 'bg-white text-[#2f3f28] shadow-sm' 
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {tf}
      </button>
    ))}
  </div>
);

const MultiSelect = ({ options, selected, onChange, label, maxLimit = 6 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      if (selected.length < maxLimit) {
        onChange([...selected, option]);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium hover:border-[#a5c869] transition-colors min-w-[130px] justify-between h-full"
      >
        <span className="truncate max-w-[100px]">
          {selected.length === 0 ? `Select ${label}` : `${selected.length} ${label}s`}
        </span>
        <ChevronDown size={14} className="text-stone-400" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-50 max-h-64 overflow-y-auto">
          <div className="px-2 py-1.5 text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
             Max {maxLimit} selections
          </div>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleToggle(option)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-stone-50 transition-colors ${
                selected.includes(option) ? 'bg-[#edf4ed] text-[#2f3f28] font-medium' : 'text-stone-600'
              }`}
            >
              <span className="truncate">{option}</span>
              {selected.includes(option) && <Check size={14} className="text-[#a5c869]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MultiLineTrendChart = ({ data, lines, timeframe }) => {
  if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-stone-400">No Data</div>;

  return (
    <div className="h-80 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 12, fill: '#888'}} 
            dy={10}
            interval={timeframe === 'day' ? 'preserveStartEnd' : 0} 
            minTickGap={30}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 12, fill: '#888'}} 
          />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            labelStyle={{ fontFamily: 'DM Sans', color: '#666', marginBottom: '0.25rem' }}
            formatter={(value) => value.toFixed(1)}
          />
          <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontFamily: 'DM Sans'}} iconType="circle" />
          {lines.map((lineKey, index) => (
            <Line 
              key={lineKey}
              type="monotone" 
              dataKey={lineKey} 
              stroke={COLORS.chartPalette[index % COLORS.chartPalette.length]} 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const SimpleTrendChart = ({ data, timeframe, color = COLORS.primary }) => {
  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`color${timeframe}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 12, fill: '#888'}} 
            dy={10}
            interval={timeframe === 'day' ? 2 : 0} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 12, fill: '#888'}} 
          />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            labelStyle={{ fontFamily: 'DM Sans', color: '#666', marginBottom: '0.25rem' }}
            formatter={(value) => value.toFixed(1)}
          />
          <Area 
            type="monotone" 
            dataKey="hours" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#color${timeframe})`} 
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Modified AllocationChart for Scrollable Clients with larger labels
const AllocationChart = ({ data, dataKey = "hours", nameKey = "name", color = null, limit = null, onClick }) => {
  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]);
  const displayData = limit ? sortedData.slice(0, limit) : sortedData;
  const chartHeight = Math.max(displayData.length * 40, 300); // Dynamic height
  
  return (
    <div className={`w-full mt-4 ${!limit ? 'overflow-y-auto max-h-[400px]' : 'h-72'}`}>
      <div style={{ height: !limit ? chartHeight : '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            layout="vertical" 
            data={displayData} 
            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0"/>
            <XAxis type="number" hide />
            <YAxis 
              dataKey={nameKey} 
              type="category" 
              width={100} 
              // INCREASED FONT SIZE HERE
              tick={{fontSize: 13, fill: '#444', fontFamily: 'DM Sans', cursor: onClick ? 'pointer' : 'default'}} 
              interval={0}
              onClick={(e) => onClick && onClick(e.value)}
            />
            <RechartsTooltip 
               cursor={{fill: 'transparent'}}
               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
               formatter={(value) => value.toFixed(1)}
            />
            <Bar 
              dataKey={dataKey} 
              radius={[0, 4, 4, 0]} 
              barSize={20} 
              onClick={(e) => onClick && onClick(e[nameKey])}
              cursor={onClick ? 'pointer' : 'default'}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color || COLORS.chartPalette[index % COLORS.chartPalette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const VerticalBarChart = ({ data, dataKey = "hours", nameKey = "name", height = 300, onClick }) => {
    const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]).slice(0, 15);
    
    return (
      <div style={{ height: `${height}px` }} className="w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
            <XAxis 
                dataKey={nameKey} 
                tick={{fontSize: 10, fill: '#444', fontFamily: 'DM Sans', cursor: onClick ? 'pointer' : 'default'}} 
                interval={0}
                height={30}
                onClick={(e) => onClick && onClick(e.value)}
            />
            <YAxis hide />
            <RechartsTooltip 
               cursor={{fill: 'transparent'}}
               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
               formatter={(value) => value.toFixed(1)}
            />
            <Bar 
              dataKey={dataKey} 
              radius={[4, 4, 0, 0]} 
              onClick={(e) => onClick && onClick(e[nameKey])}
              cursor={onClick ? 'pointer' : 'default'}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
};

const TopSwitchersGrid = ({ data, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {data.map((person, idx) => (
         <div 
           key={idx} 
           onClick={() => onNavigate && onNavigate(person.switcher)}
           className="bg-stone-50 p-4 rounded-xl flex flex-col cursor-pointer hover:bg-stone-100 transition-colors border border-transparent hover:border-[#a5c869]"
         >
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{person.dept}</span>
            <div className="flex items-end justify-between mt-auto">
               <div>
                 <span className="block text-xl font-bold text-[#2f3f28]">{person.switcher}</span>
                 <span className="block text-sm text-[#a5c869] font-medium">{person.avgDailyHours.toFixed(1)}h / day</span>
               </div>
               <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-stone-300 shadow-sm">
                  <Users size={16} />
               </div>
            </div>
         </div>
       ))}
    </div>
  );
};

const DonutChart = ({ data, nameKey = "name", dataKey = "hours" }) => {
  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={5}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
             formatter={(value) => value.toFixed(1)}
          />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Custom Pie Chart with Tooltip for Client Distribution
const ClientDistributionChart = ({ data }) => {
  // Sort and group data: Top 6 + Others
  const processedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.hours - a.hours);
    const top6 = sorted.slice(0, 6);
    const others = sorted.slice(6);
    
    const result = [...top6];
    if (others.length > 0) {
      const othersHours = others.reduce((sum, item) => sum + item.hours, 0);
      result.push({ name: 'Other Clients', hours: othersHours });
    }
    return result;
  }, [data]);

  const totalHours = processedData.reduce((sum, item) => sum + item.hours, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const percentage = totalHours > 0 ? ((dataPoint.hours / totalHours) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-white p-3 border border-stone-100 shadow-lg rounded-xl">
          <p className="font-bold text-[#2f3f28] text-sm mb-1">{dataPoint.name}</p>
          <div className="text-xs text-stone-600 space-y-0.5">
             <p>Hours: <span className="font-medium text-[#a5c869]">{dataPoint.hours.toFixed(1)}h</span></p>
             <p>Share: <span className="font-medium text-[#a5c869]">{percentage}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="hours"
            nameKey="name"
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
            ))}
          </Pie>
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            wrapperStyle={{ fontSize: '14px', fontFamily: 'DM Sans' }} // removed maxWidth constraint
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const TaskTable = ({ data, showContext = false }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'dateObj', direction: 'desc' });

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle string comparison case-insensitive
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return <ArrowUpDown size={14} className="text-stone-300 ml-1 inline-block" />;
        return <ArrowUpDown size={14} className={`text-[#a5c869] ml-1 inline-block ${sortConfig.direction === 'asc' ? "rotate-180" : ""}`} />;
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm font-dm">
                <thead className="bg-stone-50 border-b border-stone-100 text-[#2f3f28]">
                    <tr>
                        <th 
                            className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                            onClick={() => requestSort('dateObj')}
                        >
                            <div className="flex items-center gap-1">
                                Date {getSortIcon('dateObj')}
                            </div>
                        </th>
                        {showContext && (
                            <>
                                <th 
                                    className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                                    onClick={() => requestSort('department')}
                                >
                                    <div className="flex items-center gap-1">
                                        Team {getSortIcon('department')}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                                    onClick={() => requestSort('switcher')}
                                >
                                    <div className="flex items-center gap-1">
                                        Switcher {getSortIcon('switcher')}
                                    </div>
                                </th>
                            </>
                        )}
                        <th 
                            className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                            onClick={() => requestSort('client')}
                        >
                            <div className="flex items-center gap-1">
                                Client {getSortIcon('client')}
                            </div>
                        </th>
                        <th 
                            className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                            onClick={() => requestSort('task')}
                        >
                            <div className="flex items-center gap-1">
                                Task Details {getSortIcon('task')}
                            </div>
                        </th>
                        <th 
                            className="px-4 py-3 font-bold text-right cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                            onClick={() => requestSort('minutes')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Hours {getSortIcon('minutes')}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                    {sortedData.map((item, i) => (
                        <tr key={i} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{item.dateStr}</td>
                            {showContext && (
                                <>
                                    <td className="px-4 py-3 text-stone-600">{item.department}</td>
                                    <td className="px-4 py-3 text-stone-600 font-medium">{item.switcher}</td>
                                </>
                            )}
                            <td className="px-4 py-3 font-medium text-[#2f3f28]">{item.client}</td>
                            <td className="px-4 py-3 text-stone-600 max-w-xs truncate" title={item.task}>{item.task}</td>
                            <td className="px-4 py-3 text-right font-medium text-[#a5c869]">{(item.minutes/60).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- View Components ---

const DetailView = ({ title, type, data, onBack, apiKey, onOpenSettings }) => {
  const [timeframe, setTimeframe] = useState('day');
  const [trendMode, setTrendMode] = useState('total'); 
  const [selectedLines, setSelectedLines] = useState([]);
  const [allocationChartType, setAllocationChartType] = useState('bar'); // Toggle state for allocation chart
  
  // AI State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Calculate detailed stats for the new banner
  const detailStats = useMemo(() => {
      const totalHours = data.reduce((acc, curr) => acc + curr.minutes, 0) / 60;
      const uniqueClients = new Set(data.map(d => d.client)).size;
      const uniqueSwitchers = new Set(data.map(d => d.switcher)).size;
      const totalTasks = data.length;
      
      // Calculate avg daily hours
      const uniqueDays = new Set(data.map(d => d.dateStr)).size;
      const avgDaily = uniqueDays > 0 ? totalHours / uniqueDays : 0;

      // Find longest task
      let longestTask = { task: '-', minutes: 0 };
      data.forEach(d => {
          if (d.minutes > longestTask.minutes) longestTask = d;
      });

      // Find top contributor (Switcher or Client depending on view)
      const topEntity = {};
      const entityKey = type === 'client' ? 'switcher' : 'client'; // If client view, find top switcher. If switcher/dept view, find top client (simplification)
      
      data.forEach(d => {
          const k = d[entityKey];
          topEntity[k] = (topEntity[k] || 0) + d.minutes;
      });
      const sortedEntities = Object.entries(topEntity).sort((a, b) => b[1] - a[1]);
      const topContributor = sortedEntities.length > 0 ? { name: sortedEntities[0][0], hours: sortedEntities[0][1]/60 } : { name: '-', hours: 0 };

      // Busiest Day
      const dailyHours = {};
      data.forEach(d => {
          const k = d.dateStr;
          dailyHours[k] = (dailyHours[k] || 0) + d.minutes;
      });
      const sortedDays = Object.entries(dailyHours).sort((a,b) => b[1] - a[1]);
      const busiestDay = sortedDays.length > 0 ? { date: sortedDays[0][0], hours: sortedDays[0][1]/60 } : { date: '-', hours: 0 };

      return {
          totalHours,
          uniqueClients,
          uniqueSwitchers,
          totalTasks,
          avgDaily,
          longestTask,
          topContributor,
          busiestDay
      };
  }, [data, type]);

  // Determine available breakdown options based on view type
  const breakdownOptions = useMemo(() => {
      const options = ['total'];
      if (type === 'switcher') {
          options.push('client');
      } else if (type === 'department') {
          options.push('client', 'switcher');
      } else if (type === 'client') {
          options.push('switcher', 'department');
      }
      return options;
  }, [type]);

  // Derive breakdown list items for multiselect
  const breakdownList = useMemo(() => {
      if (trendMode === 'total') return [];
      
      const getSortedKeys = (key) => {
        const counts = {};
        data.forEach(d => counts[d[key]] = (counts[d[key]] || 0) + d.minutes);
        return Object.entries(counts)
          .sort((a,b) => b[1] - a[1]) 
          .map(e => e[0]);
      };

      if (trendMode === 'client') return getSortedKeys('client');
      if (trendMode === 'switcher') return getSortedKeys('switcher');
      if (trendMode === 'department') return getSortedKeys('department');
      return [];
  }, [data, trendMode]);

  // Default selection when mode changes
  useEffect(() => {
      if (breakdownList.length > 0) {
          setSelectedLines(breakdownList.slice(0, 3)); // Select top 3 by default
      }
  }, [breakdownList]);

  const handleGenerateReport = async () => {
    if (!apiKey) {
        onOpenSettings();
        return;
    }
    
    setIsAIModalOpen(true);
    if(aiReport) return; // Cached
    setIsAiLoading(true);
    setAiError(null);

    const summaryData = {
        title,
        type,
        totalTasks: data.length,
        totalHours: (data.reduce((acc, curr) => acc + curr.minutes, 0) / 60).toFixed(1),
        // Aggregate for token efficiency
        breakdown: Object.entries(data.reduce((acc, curr) => {
            const k = type === 'client' ? curr.department : curr.client;
            acc[k] = (acc[k] || 0) + curr.minutes;
            return acc;
        }, {})).map(([k, v]) => `${k}: ${(v/60).toFixed(1)}h`).join(', ')
    };

    const prompt = `
        You are a senior data analyst at 'Switch', a marketing agency.
        Analyze the following performance data for ${type}: "${title}".
        
        Data Summary:
        ${JSON.stringify(summaryData)}

        Please provide a concise, professional performance analysis formatted with simple HTML tags (<b>, <br>, <ul>, <li>).
        Focus on:
        1. <b>Key Focus Areas:</b> Where is the time being spent?
        2. <b>Efficiency Observations:</b> Any patterns?
        3. <b>Recommendations:</b> Quick tips for improvement or resource allocation.
    `;

    try {
        const result = await callGemini(apiKey, prompt);
        setAiReport(result || "No insights could be generated.");
    } catch (e) {
        setAiError("Failed to generate report. Please check your API key.");
    }
    setIsAiLoading(false);
  };

  // 1. Process Trend Data (Dynamic for MultiLine or Simple)
  const trendData = useMemo(() => {
    const grouped = {};
    data.forEach(item => {
      if (!item.dateObj) return;
      let key;
      const d = item.dateObj;
      // Readable Key for X Axis
      if (timeframe === 'day') key = `${d.getDate()}/${d.getMonth()+1}`;
      else if (timeframe === 'week') key = `W${getWeekNumber(d)}`;
      else key = d.toLocaleString('default', { month: 'short' });

      if (!grouped[key]) grouped[key] = { name: key, label: key, hours: 0 };
      
      // Always calc total for SimpleChart
      grouped[key].hours += item.minutes / 60;

      // Calc breakdown for MultiLine
      if (trendMode !== 'total') {
          const entity = item[trendMode]; // e.g. item['client']
          if (selectedLines.includes(entity)) {
              grouped[key][entity] = (grouped[key][entity] || 0) + item.minutes/60;
          }
      }
    });

    return Object.values(grouped); // Return array
  }, [data, timeframe, trendMode, selectedLines]);

  // 2. Process Allocations
  const clientAllocation = useMemo(() => {
    const grouped = {};
    data.forEach(item => {
      const k = item.client || 'Unknown';
      if (!grouped[k]) grouped[k] = 0;
      grouped[k] += item.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a,b) => b.hours - a.hours);
  }, [data]);
  
  const switcherSplit = useMemo(() => {
    if (type !== 'client') return [];
    const grouped = {};
    data.forEach(item => {
      const k = item.switcher || 'Unknown';
      if (!grouped[k]) grouped[k] = 0;
      grouped[k] += item.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a,b) => b.hours - a.hours);
  }, [data, type]);

  const secondaryAllocation = useMemo(() => {
    const grouped = {};
    const targetKey = type === 'department' ? 'switcher' : 'department';
    data.forEach(item => {
      const k = item[targetKey] || 'Unknown';
      if (!grouped[k]) grouped[k] = 0;
      grouped[k] += item.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a,b) => b.hours - a.hours);
  }, [data, type]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AIInsightsModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        title={`${title} Analysis`} 
        content={aiReport}
        isLoading={isAiLoading}
        error={aiError}
      />

      <div className="flex justify-between items-center mb-6">
        <button 
            onClick={onBack}
            className="flex items-center text-[#2f3f28] opacity-60 hover:opacity-100 transition-opacity font-medium"
        >
            <ChevronLeft size={18} className="mr-1" /> Back to Dashboard
        </button>

        <button 
            onClick={handleGenerateReport}
            className="bg-white border border-[#a5c869] text-[#2f3f28] px-4 py-2 rounded-xl font-bold font-dm hover:bg-[#a5c869] hover:text-white transition-all flex items-center gap-2 shadow-sm"
        >
            <Sparkles size={16} /> 
            {apiKey ? "Analyze Performance" : "Enable AI Insights"}
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          {/* Renamed Department to Team */}
          <span className="font-playfair text-[#d2beff] text-lg capitalize">{type === 'department' ? 'Team' : type} Report</span>
          <h1 className="text-4xl font-bold text-[#2f3f28] font-dm">{title}</h1>
        </div>
      </div>

      {/* New Detail Banner */}
      <div className="bg-gradient-to-br from-[#2f3f28] to-[#455a3f] rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden font-dm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#a5c869] rounded-full opacity-10 blur-2xl"></div>
          
          <h2 className="font-playfair text-2xl mb-4 relative z-10 text-[#a5c869]">Performance Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm opacity-90 relative z-10">
              {type === 'switcher' && (
                  <>
                    <p className="text-lg leading-relaxed mb-2 md:col-span-2">
                        {title} has logged <span className="font-bold text-[#d2beff]">{detailStats.totalHours.toFixed(1)}</span> hours across <span className="font-bold text-[#d2beff]">{detailStats.uniqueClients}</span> clients.
                    </p>
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                        <p>Completed <strong className="text-white">{detailStats.totalTasks}</strong> tasks with an average of <strong className="text-white">{detailStats.avgDaily.toFixed(1)}</strong> hours per day.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                        <p>Longest single task: <strong className="text-white">{detailStats.longestTask.task}</strong> ({ (detailStats.longestTask.minutes/60).toFixed(1) }h).</p>
                    </div>
                  </>
              )}

              {type === 'client' && (
                  <>
                    <p className="text-lg leading-relaxed mb-2 md:col-span-2">
                        {title} received <span className="font-bold text-[#d2beff]">{detailStats.totalHours.toFixed(1)}</span> hours of service from <span className="font-bold text-[#d2beff]">{detailStats.uniqueSwitchers}</span> team members.
                    </p>
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                        <p>Top contributor: <strong className="text-white">{detailStats.topContributor.name}</strong> ({detailStats.topContributor.hours.toFixed(1)}h).</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                        <p>Busiest day: <strong className="text-white">{detailStats.busiestDay.date}</strong> ({detailStats.busiestDay.hours.toFixed(1)}h logged).</p>
                    </div>
                  </>
              )}

              {type === 'department' && (
                  <>
                    <p className="text-lg leading-relaxed mb-2 md:col-span-2">
                        The {title} team logged <span className="font-bold text-[#d2beff]">{detailStats.totalHours.toFixed(1)}</span> hours with <span className="font-bold text-[#d2beff]">{detailStats.uniqueSwitchers}</span> active members.
                    </p>
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                        <p>Primary focus: <strong className="text-white">{detailStats.topContributor.name}</strong> ({(detailStats.topContributor.hours / detailStats.totalHours * 100).toFixed(0)}% of time).</p>
                    </div>
                    {/* Reuse switcher calculation for top member in dept */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                        {/* Changed label from "Top performing member" to "Highest hours logged" */}
                        <p>Highest hours logged: <strong className="text-white">{ 
                            Object.entries(data.reduce((acc, curr) => { acc[curr.switcher] = (acc[curr.switcher] || 0) + curr.minutes; return acc; }, {}))
                            .sort((a,b) => b[1] - a[1])[0]?.[0] || '-' 
                        }</strong>.</p>
                    </div>
                  </>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-lg font-bold text-[#2f3f28]">Time Trends</h3>
            <div className="flex flex-wrap items-center gap-2">
                {/* Breakdown Toggles */}
                <div className="flex bg-stone-100 p-1 rounded-lg">
                    {breakdownOptions.map(opt => (
                        <button
                            key={opt}
                            onClick={() => setTrendMode(opt)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                                trendMode === opt ? 'bg-white shadow-sm text-[#2f3f28]' : 'text-stone-500'
                            }`}
                        >
                            {opt === 'total' ? 'Total' : `By ${opt === 'department' ? 'Team' : opt}`}
                        </button>
                    ))}
                </div>

                {trendMode !== 'total' && (
                    <div className="h-8">
                        <MultiSelect 
                            label={trendMode === 'department' ? 'team' : trendMode} 
                            options={breakdownList} 
                            selected={selectedLines}
                            onChange={setSelectedLines}
                        />
                    </div>
                )}

                <TimeFrameToggle current={timeframe} onChange={setTimeframe} />
            </div>
          </div>
          
          {trendMode === 'total' ? (
             <SimpleTrendChart data={trendData} timeframe={timeframe} />
          ) : (
             <MultiLineTrendChart data={trendData} lines={selectedLines} timeframe={timeframe} />
          )}
        </Card>
      </div>

      {type === 'switcher' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             <Card>
                <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Client Allocation</h3>
                <p className="font-playfair text-sm text-stone-400 mb-6">Hours by Client (Bar)</p>
                <AllocationChart data={clientAllocation} limit={10} />
             </Card>
             <Card>
                <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Client Distribution</h3>
                <p className="font-playfair text-sm text-stone-400 mb-6">Share of total hours (Pie)</p>
                <ClientDistributionChart data={clientAllocation} />
             </Card>
          </div>
          <Card className="max-h-[35rem] overflow-auto">
             <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Task History</h3>
             <p className="font-playfair text-sm text-stone-400 mb-6">Complete log of tasks performed</p>
             <TaskTable data={data} />
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {type === 'client' ? (
                <Card>
                  <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Switcher Split</h3>
                  <p className="font-playfair text-sm text-stone-400 mb-6">Hours logged by team members</p>
                  <AllocationChart data={switcherSplit} limit={10} />
                </Card>
            ) : (
                <Card>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-bold text-[#2f3f28]">Client Allocation</h3>
                    <div className="flex bg-stone-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setAllocationChartType('bar')}
                        className={`p-1.5 rounded-md transition-all ${allocationChartType === 'bar' ? 'bg-white text-[#2f3f28] shadow-sm' : 'text-stone-400'}`}
                      >
                        <BarChart2 size={16} />
                      </button>
                      <button 
                        onClick={() => setAllocationChartType('pie')}
                        className={`p-1.5 rounded-md transition-all ${allocationChartType === 'pie' ? 'bg-white text-[#2f3f28] shadow-sm' : 'text-stone-400'}`}
                      >
                        <PieChartIcon size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="font-playfair text-sm text-stone-400 mb-6">Distribution of time across clients</p>
                  
                  {allocationChartType === 'bar' ? (
                     <AllocationChart data={clientAllocation} limit={10} />
                  ) : (
                     <ClientDistributionChart data={clientAllocation} />
                  )}
                </Card>
            )}
            
            <Card>
                <h3 className="text-lg font-bold text-[#2f3f28] mb-1">
                    {type === 'department' ? 'Team Contribution' : 'Team Split'}
                </h3>
                <p className="font-playfair text-sm text-stone-400 mb-6">Internal breakdown</p>
                <DonutChart data={secondaryAllocation} />
            </Card>
          </div>
          
          <Card className="max-h-[35rem] overflow-auto">
               <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Task History</h3>
               <p className="font-playfair text-sm text-stone-400 mb-6">Complete log of tasks performed</p>
               <TaskTable data={data} />
          </Card>
        </>
      )}

    </div>
  );
};

const ListView = ({ title, items, onItemClick, icon: Icon, sortBy, onSortChange }) => {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'hours') return b.hours - a.hours;
      return a.id.localeCompare(b.id);
    });
  }, [items, sortBy]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#2f3f28] font-dm">{title}</h2>
        <div className="flex bg-white rounded-lg border border-stone-200 p-1">
            <button 
              onClick={() => onSortChange('alpha')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${sortBy === 'alpha' ? 'bg-[#edf4ed] text-[#2f3f28]' : 'text-stone-400'}`}
            >
              A-Z
            </button>
            <button 
              onClick={() => onSortChange('hours')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${sortBy === 'hours' ? 'bg-[#edf4ed] text-[#2f3f28]' : 'text-stone-400'}`}
            >
              <ArrowUpDown size={12} /> Hours
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className="group bg-white p-5 rounded-xl border border-stone-100 shadow-sm hover:shadow-md hover:border-[#a5c869] transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#edf4ed] flex items-center justify-center text-[#2f3f28] group-hover:bg-[#a5c869] group-hover:text-white transition-colors">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[#2f3f28] font-dm">{item.id}</h3>
                <div className="flex gap-3 text-xs text-stone-500 font-dm mt-0.5">
                   <span>{item.count} tasks</span>
                   <span>•</span>
                   <span className="font-bold text-[#a5c869]">{item.hours.toFixed(1)} hrs</span>
                </div>
              </div>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-[#a5c869] transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main App Logic ---

const App = () => {
  const [data, setData] = useState(null);
  const [view, setView] = useState({ type: 'dashboard', id: null });
  const [sortOrder, setSortOrder] = useState('alpha'); 
  
  // Date Range State
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Trend State
  const [trendMetric, setTrendMetric] = useState('total'); // Changed default to 'total'
  const [trendTimeframe, setTrendTimeframe] = useState('day');
  const [selectedLines, setSelectedLines] = useState([]);

  // AI & Settings
  const [apiKey, setApiKey] = useState(localStorage.getItem('switch_ai_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsedData = parseCSV(e.target.result);
        
        // Find min/max dates for default range
        if (parsedData.length > 0) {
            const dates = parsedData.map(d => d.dateObj.getTime());
            const min = new Date(Math.min(...dates));
            const max = new Date(Math.max(...dates));
            
            // Format to YYYY-MM-DD for input using local time to avoid timezone shifts
            const toInputDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            setDateRange({ start: toInputDate(min), end: toInputDate(max) });
        }
        
        setData(parsedData);
      };
      reader.readAsText(file);
    }
  };

  const handleNavigate = (type, id) => {
    setView({ type: type + '_detail', id });
  };

  // --- FILTERING DATA BASED ON DATE RANGE ---
  const filteredData = useMemo(() => {
      if (!data) return null;
      if (!dateRange.start || !dateRange.end) return data;

      // Manually parse YYYY-MM-DD string to ensure local midnight creation
      const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      
      const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);
      const end = new Date(endYear, endMonth - 1, endDay);
      end.setHours(23, 59, 59, 999); // Include full end day

      return data.filter(d => d.dateObj >= start && d.dateObj <= end);
  }, [data, dateRange]);

  // Pre-calculate lists for the trend dropdown sorted by volume
  const entityLists = useMemo(() => {
     if(!filteredData) return { department: [], client: [], switcher: [], total: [] };
     
     const getSortedKeys = (key) => {
       const counts = {};
       filteredData.forEach(d => counts[d[key]] = (counts[d[key]] || 0) + d.minutes);
       return Object.entries(counts)
         .sort((a,b) => b[1] - a[1]) // Sort by hours desc
         .map(e => e[0]);
     };

     return {
       total: ['Total Agency Hours'],
       department: getSortedKeys('department'),
       client: getSortedKeys('client'),
       switcher: getSortedKeys('switcher')
     };
  }, [filteredData]);

  // Default selection when metric changes
  useEffect(() => {
    if(entityLists[trendMetric] && entityLists[trendMetric].length > 0) {
       setSelectedLines(entityLists[trendMetric].slice(0, 1)); // Default select first 1
    }
  }, [trendMetric, entityLists]);

  // --- Process Multi-line Trend Data ---
  const multiLineTrendData = useMemo(() => {
    if(!filteredData) return [];
    
    // Group by timeframe
    const grouped = {};
    filteredData.forEach(item => {
      if(!item.dateObj) return;
      let timeKey;
      const d = item.dateObj;
      // Get readable key
      if (trendTimeframe === 'day') timeKey = `${d.getDate()}/${d.getMonth()+1}`;
      else if (trendTimeframe === 'week') timeKey = `W${getWeekNumber(d)}`;
      else timeKey = d.toLocaleString('default', { month: 'short' });

      if (!grouped[timeKey]) grouped[timeKey] = { name: timeKey };
      
      if (trendMetric === 'total') {
          const key = 'Total Agency Hours';
          if (selectedLines.includes(key)) {
             grouped[timeKey][key] = (grouped[timeKey][key] || 0) + item.minutes/60;
          }
      } else {
          const entity = item[trendMetric];
          if (selectedLines.includes(entity)) {
             grouped[timeKey][entity] = (grouped[timeKey][entity] || 0) + item.minutes/60;
          }
      }
    });

    return Object.values(grouped);
  }, [filteredData, trendMetric, trendTimeframe, selectedLines]);

  // --- Derived Stats for Dashboard ---
  const stats = useMemo(() => {
    if (!filteredData) return null;
    const totalHours = filteredData.reduce((acc, curr) => acc + curr.minutes, 0) / 60;
    const switchers = [...new Set(filteredData.map(d => d.switcher))];
    const departments = [...new Set(filteredData.map(d => d.department))];
    const clients = [...new Set(filteredData.map(d => d.client))];
    
    // Calculate date range for weekly average based on FILTERED data
    const dates = filteredData.map(d => d.dateObj).filter(Boolean);
    const minDate = dates.length ? new Date(Math.min.apply(null, dates)) : new Date();
    const maxDate = dates.length ? new Date(Math.max.apply(null, dates)) : new Date();
    const dayDiff = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1; // +1 inclusive
    const weeksDiff = Math.max(1, dayDiff / 7);

    // Top Clients (Avg Weekly Hours)
    const clientHours = {};
    filteredData.forEach(d => clientHours[d.client] = (clientHours[d.client] || 0) + d.minutes);
    const topClients = Object.entries(clientHours)
        .map(([name, mins]) => ({ name, hours: parseFloat((mins/60 / weeksDiff).toFixed(1)) }))
        .sort((a,b) => b.hours - a.hours);

    // Workload by Department
    const deptHours = {};
    filteredData.forEach(d => deptHours[d.department] = (deptHours[d.department] || 0) + d.minutes);
    const deptWorkload = Object.entries(deptHours)
        .map(([name, mins]) => ({ name, hours: parseFloat((mins/60).toFixed(1)) }));

    // Workload by Switcher
    const switcherHours = {};
    filteredData.forEach(d => switcherHours[d.switcher] = (switcherHours[d.switcher] || 0) + d.minutes);
    const switcherWorkload = Object.entries(switcherHours)
        .map(([name, mins]) => ({ name, hours: parseFloat((mins/60).toFixed(1)) }));

    // Top 6 Switchers Global (Avg Daily Hours)
    const switcherStats = {};
    filteredData.forEach(d => {
       const sw = d.switcher;
       if (!switcherStats[sw]) switcherStats[sw] = { minutes: 0, days: new Set(), dept: d.department };
       switcherStats[sw].minutes += d.minutes;
       if(d.dateStr) switcherStats[sw].days.add(d.dateStr);
    });

    const sortedSwitchers = Object.entries(switcherStats)
        .map(([name, stat]) => ({ 
            switcher: name, 
            dept: stat.dept,
            totalHours: stat.minutes / 60,
            avgDailyHours: (stat.minutes / 60) / (stat.days.size || 1)
        }))
        .sort((a,b) => b.totalHours - a.totalHours);

    const topSwitchers = sortedSwitchers.slice(0, 6);

    // Insights Generation
    const top3Switchers = sortedSwitchers.slice(0, 3).map(s => s.switcher).join(', ');
    const top5ClientsNames = topClients.slice(0, 5).map(c => c.name).join(', '); // UPDATED to 5
    
    // Overworked logic
    const overworkedSwitchers = sortedSwitchers
        .filter(s => s.avgDailyHours > 7) // UPDATED to 7
        .map(s => s.switcher);
    
    // Sort department workload for insights
    const sortedDepts = [...deptWorkload].sort((a,b) => b.hours - a.hours);
    const topDept = sortedDepts[0];
    const topDeptShare = totalHours > 0 ? ((topDept.hours / totalHours) * 100).toFixed(0) : 0;

    // Total Client Hours for Pie Chart (New)
    const totalClientHours = Object.entries(clientHours)
        .map(([name, mins]) => ({ name, hours: mins / 60 }));

    return { 
      totalHours, 
      switcherCount: switchers.length, 
      deptCount: departments.length, 
      clientCount: clients.length,
      topClients,
      deptWorkload,
      switcherWorkload,
      topSwitchers,
      // Insight Strings
      top3Switchers,
      top5ClientsNames, // Updated
      topDept,
      topDeptShare,
      overworkedSwitchers, // New
      totalClientHours // For Pie Chart
    };
  }, [filteredData]);

  // AI Dashboard Handler
  const handleGenerateDashboardReport = async () => {
    if (!apiKey) {
        setIsSettingsOpen(true);
        return;
    }

    setIsAIModalOpen(true);
    if(aiReport) return; // Cached if not refreshed
    setIsAiLoading(true);
    setAiError(null);

    // Simplify stats for prompt to save tokens
    const simpleStats = {
        totalHours: stats.totalHours.toFixed(0),
        activeClients: stats.clientCount,
        activeSwitchers: stats.switcherCount,
        topClients: stats.topClients.slice(0, 5).map(c => `${c.name} (${c.hours}h/wk)`),
        deptWorkload: stats.deptWorkload.map(d => `${d.name}: ${d.hours}h`),
        topSwitchers: stats.topSwitchers.map(s => `${s.switcher} (${s.avgDailyHours.toFixed(1)}h/day)`)
    };

    const prompt = `
        You are a strategic data analyst for 'Switch' Agency. 
        Analyze the following high-level timesheet data:
        ${JSON.stringify(simpleStats)}

        Generate an Executive Summary formatted with HTML tags (<b>, <br>, <ul>, <li>).
        Structure:
        1. <b>Health Check:</b> Overall activity levels.
        2. <b>Risk Assessment:</b> Identify potential burnout (high daily hours) or client over-dependency.
        3. <b>Strategic Recommendations:</b> Resource allocation suggestions.
    `;

    try {
        const result = await callGemini(apiKey, prompt);
        setAiReport(result || "No insights could be generated.");
    } catch (e) {
        setAiError("Failed to generate report. Please check your API key.");
    }
    setIsAiLoading(false);
  };

  const listData = useMemo(() => {
    if (!filteredData) return {};
    const process = (key) => {
      const stats = {};
      filteredData.forEach(d => {
         if(!stats[d[key]]) stats[d[key]] = { count: 0, minutes: 0 };
         stats[d[key]].count += 1;
         stats[d[key]].minutes += d.minutes;
      });
      return Object.entries(stats).map(([id, val]) => ({ 
          id, 
          count: val.count, 
          hours: val.minutes/60 
      }));
    };
    return {
      switchers: process('switcher'),
      departments: process('department'),
      clients: process('client')
    };
  }, [filteredData]);

  // --- Filtering Data for Detail View ---
  const detailData = useMemo(() => {
    if (!filteredData || view.type === 'dashboard' || !view.id) return [];
    if (view.type === 'switcher_detail') return filteredData.filter(d => d.switcher === view.id);
    if (view.type === 'dept_detail') return filteredData.filter(d => d.department === view.id);
    if (view.type === 'client_detail') return filteredData.filter(d => d.client === view.id);
    return [];
  }, [filteredData, view]);

  // --- Render Logic ---

  if (!data) {
    return (
      <div className="min-h-screen bg-[#edf4ed] flex flex-col items-center justify-center p-6">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
          .font-dm { font-family: 'DM Sans', sans-serif; }
          .font-playfair { font-family: 'Playfair Display', serif; }
        `}</style>
        <div className="mb-12 animate-in fade-in zoom-in duration-700 flex flex-col items-center">
           <LogoMain />
           <span className="text-[#a5c869] font-dm text-xs font-bold tracking-widest uppercase mt-3">Workload Dashboard</span>
        </div>
        
        <Card className="max-w-md w-full text-center py-12 px-8 border-t-4 border-[#a5c869]">
          <div className="w-16 h-16 bg-[#edf4ed] text-[#2f3f28] rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#2f3f28] font-dm mb-3">Upload Timesheet</h1>
          <p className="text-stone-500 mb-8 font-dm">Upload your Switch CSV timesheet to visualize performance metrics.</p>
          
          <label className="block w-full cursor-pointer group">
            <div className="w-full bg-[#2f3f28] text-white py-4 rounded-xl font-bold font-dm transition-transform transform group-hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#2f3f28]/20 flex items-center justify-center gap-2">
              <span>Select CSV File</span>
            </div>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf4ed] flex font-dm text-[#2f3f28]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        .font-dm { font-family: 'DM Sans', sans-serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
      
      {/* AI Report Modal */}
      <AIInsightsModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        title={view.type === 'dashboard' ? "Executive Summary" : `${view.id} Analysis`}
        content={aiReport}
        isLoading={isAiLoading}
        error={aiError}
      />

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-stone-100 flex-shrink-0 flex flex-col sticky top-0 h-screen z-10 transition-all">
        {/* Header with Logo and Text */}
        <div className="flex flex-col justify-center items-center lg:items-start lg:px-8 py-6 border-b border-stone-50">
            <div className="hidden lg:block mb-1"><LogoMain /></div>
            <div className="lg:hidden"><LogoSquare /></div>
            {/* Added mt-3 for spacing and lighter color */}
            <span className="hidden lg:block text-[#a5c869] font-dm text-xs font-bold tracking-widest uppercase w-full mt-3">Workload Dashboard</span>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'switchers', label: 'Switchers', icon: Users },
            { id: 'departments', label: 'Teams', icon: Building2 }, // Renamed to Teams
            { id: 'clients', label: 'Clients', icon: Briefcase },
            { id: 'tasks', label: 'Task Explorer', icon: Table },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                  setView({ type: item.id, id: null });
                  setAiReport(null); // Clear report on navigation
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                view.type === item.id || view.type.startsWith(item.id.slice(0, -1)) // rough active match
                  ? 'bg-[#edf4ed] text-[#2f3f28]' 
                  : 'text-stone-500 hover:bg-stone-50 hover:text-[#2f3f28]'
              }`}
            >
              <item.icon size={20} />
              <span className="hidden lg:block">{item.label}</span>
              {view.type === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#a5c869] hidden lg:block" />}
            </button>
          ))}
        </nav>

        {/* Global Date Filter in Sidebar */}
        <div className="px-6 py-4 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-2 text-stone-400">
               <CalendarIcon size={14} />
               <span className="text-xs font-bold uppercase tracking-wider">Date Range</span>
            </div>
            <div className="flex flex-col gap-2">
               <input 
                 type="date" 
                 value={dateRange.start} 
                 onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                 className="w-full text-xs p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-[#a5c869] font-dm text-stone-600"
               />
               <input 
                 type="date" 
                 value={dateRange.end} 
                 onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                 className="w-full text-xs p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-[#a5c869] font-dm text-stone-600"
               />
            </div>
        </div>

        <div className="p-4 lg:p-6 border-t border-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#edf4ed] flex items-center justify-center">
                 <div className="w-6 h-6"><LogoSquare /></div>
             </div>
             <div className="hidden lg:block">
               <p className="text-sm font-bold text-[#2f3f28]">Switch Admin</p>
               <button onClick={() => setData(null)} className="text-xs text-stone-400 hover:text-red-500">Change File</button>
             </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="text-stone-400 hover:text-[#2f3f28]">
             <Settings size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-w-7xl mx-auto w-full relative">
        
        {view.type === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                 {/* Increased size for Overview title */}
                 <h1 className="text-5xl font-bold text-[#2f3f28] font-dm tracking-tight">Overview</h1>
              </div>
              <button 
                onClick={handleGenerateDashboardReport}
                className="mt-4 md:mt-0 bg-white border border-[#a5c869] text-[#2f3f28] px-4 py-2 rounded-xl font-bold font-dm hover:bg-[#a5c869] hover:text-white transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles size={16} /> 
                {apiKey ? "Generate AI Report" : "Enable AI Insights"}
              </button>
            </header>

            {/* KPI Banner - High Contrast with Gradient */}
            <div className="bg-gradient-to-br from-[#2f3f28] to-[#455a3f] rounded-2xl p-8 mb-10 text-white shadow-lg relative overflow-hidden font-dm">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#a5c869] rounded-full opacity-10 blur-2xl"></div>
              
              <h2 className="font-playfair text-3xl mb-4 relative z-10 text-[#a5c869]">Let's deliver clarity.</h2>
              
              <p className="text-xl opacity-90 relative z-10 leading-relaxed max-w-4xl mb-6">
                Switch has logged <span className="font-bold text-[#d2beff]">{stats.totalHours.toFixed(0)}</span> total hours across <span className="font-bold text-[#d2beff]">{stats.switcherCount}</span> Switchers, <span className="font-bold text-[#d2beff]">{stats.clientCount}</span> active clients, and <span className="font-bold text-[#d2beff]">{stats.deptCount}</span> teams.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-6 border-t border-white/10 text-sm opacity-80">
                  <div className="flex items-start gap-3">
                     <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                     <p className="leading-snug">The top 5 clients by hours logged were <strong className="text-white">{stats.top5ClientsNames}</strong>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                     <p className="leading-snug">The 3 busiest Switchers were <strong className="text-white">{stats.top3Switchers}</strong>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-[#d2beff] flex-shrink-0" />
                     <p className="leading-snug">The <strong className="text-white">{stats.topDept.name}</strong> team carried <strong className="text-white">{stats.topDeptShare}%</strong> of the total workload.</p>
                  </div>
                  {stats.overworkedSwitchers.length > 0 && (
                      <div className="flex items-start gap-3">
                         <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-red-400 flex-shrink-0" />
                         <p className="leading-snug">Attention: <strong className="text-white">{stats.overworkedSwitchers.join(', ')}</strong> are averaging more than 7 hours per day.</p>
                      </div>
                  )}
              </div>
            </div>

            {/* Global Trend Row (Interactive Multi-line) */}
            <Card className="mb-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                   <div>
                      <h3 className="text-lg font-bold text-[#2f3f28]">Global Hours Trend</h3>
                      <p className="text-stone-500 text-sm max-w-xl mt-1">
                          Compare performance trends over time. Select a category below to split the data.
                      </p>
                   </div>
                   <div className="flex flex-wrap gap-3 items-center">
                      <div className="flex bg-stone-100 p-1 rounded-lg">
                         <button onClick={() => setTrendMetric('total')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'total' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>Total</button>
                         <button onClick={() => setTrendMetric('department')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'department' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>By Team</button>
                         <button onClick={() => setTrendMetric('client')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'client' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>By Client</button>
                         <button onClick={() => setTrendMetric('switcher')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'switcher' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>By Switcher</button>
                      </div>
                      
                      <div className="border-l border-stone-200 h-6 mx-1 hidden md:block"></div>

                      <MultiSelect 
                         label={trendMetric} 
                         options={entityLists[trendMetric]} 
                         selected={selectedLines}
                         onChange={setSelectedLines}
                      />

                      <TimeFrameToggle current={trendTimeframe} onChange={setTrendTimeframe} />
                   </div>
               </div>
               
               <MultiLineTrendChart data={multiLineTrendData} lines={selectedLines} timeframe={trendTimeframe} />
            </Card>

            {/* Client Charts Section */}
            {/* Client Workload Bar Chart - Full Width Row */}
            <div className="mb-8">
                 <Card>
                    <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Client Workload</h3>
                    <p className="font-playfair text-sm text-stone-400 mb-4">Average weekly hours logged per client</p>
                    <AllocationChart 
                      data={stats.topClients} 
                      color={COLORS.primary} 
                      onClick={(clientId) => handleNavigate('client', clientId)}
                    />
                 </Card>
            </div>

            {/* Client Distribution Pie Chart - Full Width Row */}
            <div className="mb-8">
                 <Card>
                    <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Client Distribution</h3>
                    <p className="font-playfair text-sm text-stone-400 mb-4">Share of total hours logged</p>
                    <ClientDistributionChart data={stats.totalClientHours} />
                 </Card>
            </div>

            {/* Top Switchers Grid */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-[#2f3f28] mb-4">Top 6 Switchers by Hours Logged</h3>
                <TopSwitchersGrid data={stats.topSwitchers} onNavigate={(id) => handleNavigate('switcher', id)} />
            </div>

            {/* Workload Row */}
            <div className="flex flex-col gap-8">
                 <Card>
                    <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Team Workload</h3>
                    <p className="font-playfair text-sm text-stone-400 mb-2">Total hours per team</p>
                    <VerticalBarChart 
                      data={stats.deptWorkload} 
                      height={350} 
                      onClick={(id) => handleNavigate('dept', id)}
                    />
                 </Card>
                 <Card>
                    <h3 className="text-lg font-bold text-[#2f3f28] mb-1">Switcher Workload</h3>
                    <p className="font-playfair text-sm text-stone-400 mb-2">Total hours per employee</p>
                    <VerticalBarChart 
                      data={stats.switcherWorkload} 
                      height={350} 
                      onClick={(id) => handleNavigate('switcher', id)}
                    />
                 </Card>
            </div>

          </div>
        )}

        {view.type === 'switchers' && (
          <ListView 
            title="All Switchers" 
            items={listData.switchers} 
            icon={Users}
            onItemClick={(id) => setView({ type: 'switcher_detail', id })} 
            sortBy={sortOrder}
            onSortChange={setSortOrder}
          />
        )}

        {view.type === 'departments' && (
          <ListView 
            title="All Teams" 
            items={listData.departments} 
            icon={Building2}
            onItemClick={(id) => setView({ type: 'dept_detail', id })} 
            sortBy={sortOrder}
            onSortChange={setSortOrder}
          />
        )}

        {view.type === 'clients' && (
          <ListView 
            title="All Clients" 
            items={listData.clients} 
            icon={Briefcase}
            onItemClick={(id) => setView({ type: 'client_detail', id })} 
            sortBy={sortOrder}
            onSortChange={setSortOrder}
          />
        )}
        
        {view.type === 'tasks' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-[#2f3f28] font-dm">Task Explorer</h2>
             </div>
             <Card>
               <TaskTable data={filteredData || []} showContext />
             </Card>
          </div>
        )}

        {(view.type.endsWith('_detail')) && (
          <DetailView 
            title={view.id} 
            type={view.type.replace('_detail', '').replace('dept', 'department')} // Clean up type string
            data={detailData}
            onBack={() => {
                setView({ type: view.type.endsWith('client_detail') ? 'clients' : view.type.endsWith('dept_detail') ? 'departments' : 'switchers', id: null });
            }}
            apiKey={apiKey}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

      </main>
    </div>
  );
};

export default App;