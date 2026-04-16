# Phase 4: Polish & Interactivity — Pattern Map

**Mapped:** 2026-04-16
**Files analyzed:** 15 new/modified files
**Analogs found:** 14 / 15

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/shared/components/ChartDrilldownModal.jsx` | component | request-response | `src/shared/components/TaskDrilldownModal.jsx` | exact |
| `src/features/task-explorer/TaskExplorerView.jsx` | component (view) | CRUD | `src/features/categories/CategoriesView.jsx` | role-match |
| `src/shared/components/HistoricalUpcomingToggle.jsx` | component | event-driven | `src/shared/components/TimeFrameToggle.jsx` | exact |
| `src/shared/components/ClassificationOverridePanel.jsx` | component | request-response | `src/features/admin/AdminModal.jsx` + `src/shared/services/adminApi.js` | role-match |
| `src/shared/components/FilterDropdown.jsx` | component | request-response | `src/shared/components/MultiSelect.jsx` + `src/shared/components/DropdownFilter.jsx` | role-match |
| `src/shared/components/TaskTable.jsx` (modify) | component | CRUD | self (existing) | exact |
| `src/shared/components/TaskDrilldownModal.jsx` (modify) | component | request-response | self (existing) | exact |
| `src/shared/components/WeeklyCalendar.jsx` (modify) | component | event-driven | self (existing) | exact |
| `src/features/categories/CategoriesView.jsx` (modify) | component (view) | CRUD | `src/features/detail/DetailView.jsx` | role-match |
| `src/features/detail/DetailView.jsx` (modify) | component (view) | CRUD | self (existing) | exact |
| `src/App.jsx` (modify) | component (root) | event-driven | self (existing) | exact |
| `supabase/functions/sync/index.ts` (modify) | service | batch | self (existing) | exact |
| `supabase/functions/_shared/ruleEngine.ts` (modify) | utility | transform | self (existing) | exact |
| `supabase/functions/_shared/eventFilter.ts` (modify) | utility | transform | self (existing) | exact |
| `supabase/migrations/0009_override_columns.sql` | migration | CRUD | `supabase/migrations/0007_admin_columns.sql` | exact |

---

## Pattern Assignments

### `src/shared/components/ChartDrilldownModal.jsx` (new — component, request-response)

**Analog:** `src/shared/components/TaskDrilldownModal.jsx`

This is a direct extension of TaskDrilldownModal. Copy the entire structure and add:
1. A `detailLink` / `onNavigate` prop for the entity header link
2. A total hours summary line above the event list
3. The `ClassificationOverridePanel` slot per row

**Full analog to copy from** (`src/shared/components/TaskDrilldownModal.jsx` lines 1-39):
```jsx
import { X } from 'lucide-react';

export const TaskDrilldownModal = ({ isOpen, onClose, title, tasks }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-switch-secondary font-dm">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          ...
        </div>
      </div>
    </div>
  );
};
```

**Header entity link addition** — replace the `<h3>` in the header with:
```jsx
<div className="flex flex-col gap-0.5">
  <h3 className="text-xl font-bold text-switch-secondary font-dm">{title}</h3>
  {onNavigate && (
    <button
      onClick={() => { onNavigate(); onClose(); }}
      className="text-xs text-switch-primary font-dm hover:underline text-left"
    >
      View full breakdown →
    </button>
  )}
</div>
```

**Total hours summary line** — add above the `<ul>` list:
```jsx
<div className="flex justify-between items-center mb-3 px-1">
  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">
    {tasks.length} events
  </span>
  <span className="text-sm font-bold text-switch-primary font-dm">
    {(tasks.reduce((s, t) => s + t.minutes, 0) / 60).toFixed(1)}h total
  </span>
</div>
```

**Event row pattern** (lines 20-30 of TaskDrilldownModal.jsx):
```jsx
<li key={i} className="bg-stone-50 rounded-lg p-3">
  <div className="flex justify-between items-start gap-2">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-switch-secondary font-dm truncate">{task.task}</p>
      <p className="text-xs text-stone-500 font-dm mt-0.5">{task.client} · {task.dateStr}</p>
    </div>
    <span className="text-sm font-bold text-switch-primary font-dm whitespace-nowrap">
      {(task.minutes / 60).toFixed(1)}h
    </span>
  </div>
</li>
```

---

### `src/features/task-explorer/TaskExplorerView.jsx` (new — component/view, CRUD)

**Analog:** `src/features/categories/CategoriesView.jsx` (view-level structure) + `src/shared/components/TaskTable.jsx` (table rendering)

**View-level imports pattern** (`src/features/detail/DetailView.jsx` lines 1-18):
```jsx
import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ... } from 'lucide-react';
import { COLORS } from '../../constants/colors.js';
import { Card } from '../../shared/components/Card.jsx';
import { TaskTable } from '../../shared/components/TaskTable.jsx';
```

**View heading + stat cards pattern** (`src/features/categories/CategoriesView.jsx` lines 106-148):
```jsx
export const CategoriesView = ({ data, onSelectCategory }) => {
  // ...
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-switch-secondary font-dm">Categories</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Layers size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Label</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm">{value}</p>
            </div>
          </div>
        </Card>
      </div>
```

**Search input pattern** — use from `src/features/admin/AdminView.jsx` or adapt the existing filter row pattern in `src/features/admin/AdminTable.jsx`. Pattern (input styling):
```jsx
<input
  type="text"
  value={search}
  onChange={e => setSearch(e.target.value)}
  placeholder="Search events..."
  className="px-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors w-64"
/>
```

**useMemo for filtered/derived data** (`src/features/categories/CategoriesView.jsx` lines 63-78):
```jsx
const categoryStats = useMemo(() => {
  const acc = {};
  (data || []).forEach(d => {
    const cat = d.categoryName || 'Misc';
    if (!acc[cat]) acc[cat] = { name: cat, minutes: 0, count: 0, ... };
    acc[cat].minutes += d.minutes;
    // ...
  });
  return Object.values(acc).sort((a, b) => b.minutes - a.minutes);
}, [data]);
```

For TaskExplorerView, apply global search + per-column filter state in the same useMemo chain — filter first, then sort.

**Empty state pattern** (`src/shared/components/TaskDrilldownModal.jsx` lines 17-19):
```jsx
{(!tasks || tasks.length === 0) ? (
  <p className="text-stone-400 text-sm font-dm">No tasks to display.</p>
) : (
```

For Task Explorer: "No events match your filters. Try clearing one or more column filters to see results."

**Row count indicator** — add below the TaskTable card:
```jsx
<p className="text-xs text-stone-400 font-dm mt-2">
  Showing {filteredData.length} of {data.length} events
</p>
```

---

### `src/shared/components/HistoricalUpcomingToggle.jsx` (new — component, event-driven)

**Analog:** `src/shared/components/TimeFrameToggle.jsx` (lines 1-17) — copy the entire pill toggle structure and adapt for two states with different active/inactive colors.

**Full analog** (`src/shared/components/TimeFrameToggle.jsx` lines 1-17):
```jsx
export const TimeFrameToggle = ({ current, onChange }) => (
  <div className="flex bg-stone-100 p-1 rounded-lg">
    {['day', 'week', 'month'].map((tf) => (
      <button
        key={tf}
        onClick={() => onChange(tf)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
          current === tf
            ? 'bg-white text-switch-secondary shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {tf}
      </button>
    ))}
  </div>
);
```

**Modified active/inactive classes for Historical/Upcoming** (per UI-SPEC.md):
- Inactive pill: `bg-white text-stone-400 border border-stone-200`
- Active pill: `bg-switch-primary text-white`

Replace `bg-white text-switch-secondary shadow-sm` with `bg-switch-primary text-white` for the active state.

**Prop signature:**
```jsx
export const HistoricalUpcomingToggle = ({ upcomingMode, onChange }) => (
  <div className="flex bg-stone-100 p-1 rounded-lg">
    {[{ label: 'Historical', value: false }, { label: 'Upcoming', value: true }].map(({ label, value }) => (
      <button
        key={label}
        onClick={() => onChange(value)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
          upcomingMode === value
            ? 'bg-switch-primary text-white shadow-sm'
            : 'bg-white text-stone-400 border border-stone-200'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
```

---

### `src/shared/components/ClassificationOverridePanel.jsx` (new — component, request-response)

**Analogs:**
1. `src/shared/services/adminApi.js` — API call pattern (lines 1-20)
2. `src/shared/components/Toast.jsx` — success/error notification (lines 1-18)

**API call pattern** (`src/shared/services/adminApi.js` lines 1-20):
```jsx
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const getAuthHash = () => sessionStorage.getItem('switch_auth_hash');

export const adminApi = async (action, payload = {}) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'x-switch-auth': getAuthHash(),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
};
```

**Save button styling** (per UI-SPEC.md):
```jsx
<button
  onClick={handleSave}
  className="bg-switch-primary text-white text-xs px-3 py-1 rounded-lg font-dm font-bold hover:opacity-90 transition-opacity"
>
  Save Override
</button>
<button
  onClick={() => setExpanded(false)}
  className="text-stone-400 text-xs font-dm ml-2"
>
  Cancel
</button>
```

**Override badge** (per UI-SPEC.md — purple variant, analogous to DEPT_COLORS pattern in `src/features/categories/CategoriesView.jsx` lines 46-53):
```jsx
<span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 font-dm">
  Overridden
</span>
```

DEPT_COLORS badge pattern reference (`src/features/categories/CategoriesView.jsx` lines 46-53):
```jsx
const DEPT_COLORS = {
  'Design': 'bg-purple-50 text-purple-700 border-purple-200',
  'Marketing': 'bg-blue-50 text-blue-700 border-blue-200',
  // ...
};
// Usage:
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClasses}`}>
```

**Error handling pattern** for API save (from `src/features/detail/DetailView.jsx` lines 158-165):
```jsx
try {
  const result = await callGemini(apiKey, prompt);
  // ... success
} catch (e) {
  setAiError('Failed to generate report. Please check your API key.');
}
```

**Toast pattern** (`src/shared/components/Toast.jsx` lines 1-18):
```jsx
import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onDismiss, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className={`fixed bottom-6 right-6 ${isError ? 'bg-red-600' : 'bg-switch-secondary'} text-white rounded-xl px-5 py-3 shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {isError ? <X size={18} /> : <Check size={18} className="text-switch-primary" />}
      <span className="text-sm font-dm font-bold">{message}</span>
    </div>
  );
};
```

**Component skeleton:**
```jsx
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { adminApi } from '../services/adminApi.js';
import { Toast } from './Toast.jsx';

export const ClassificationOverridePanel = ({ event, clients, categories, departments, onSaved }) => {
  const [expanded, setExpanded] = useState(false);
  const [overrideClient, setOverrideClient] = useState(event.client);
  const [overrideCategory, setOverrideCategory] = useState(event.categoryName);
  const [overrideDept, setOverrideDept] = useState(event.department);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  // ...
};
```

---

### `src/shared/components/FilterDropdown.jsx` (new — component, request-response)

**Primary analog:** `src/shared/components/MultiSelect.jsx` (lines 1-54) — checkbox multi-select with `useClickOutside`

**Full analog** (`src/shared/components/MultiSelect.jsx` lines 1-54):
```jsx
import { useState, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside.js';

export const MultiSelect = ({ options, selected, onChange, label, maxLimit = 6 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, useCallback(() => setIsOpen(false), []));

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
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium hover:border-switch-primary transition-colors min-w-[130px] justify-between h-full"
      >
        ...
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-50 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleToggle(option)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-stone-50 transition-colors ${
                selected.includes(option) ? 'bg-switch-bg text-switch-secondary font-medium' : 'text-stone-600'
              }`}
            >
              <span className="truncate">{option}</span>
              {selected.includes(option) && <Check size={14} className="text-switch-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Secondary analog:** `src/shared/components/DropdownFilter.jsx` — for the trigger button styling and `useClickOutside` pattern

**FilterDropdown differences from MultiSelect:**
- `type` prop: `'categorical'` (checkbox list) | `'date'` (two date inputs)
- No `maxLimit` — all values checkable
- "Clear" button at bottom that resets to all checked
- Active filter state: the `Filter` icon in the column header changes color (passed back as `hasActiveFilter` return or via parent state)

**Filter icon active state** (per UI-SPEC.md — use `Filter` from lucide-react):
```jsx
<Filter
  size={12}
  className={hasActiveFilter ? 'text-switch-primary' : 'text-stone-300'}
/>
```

**Minimum row height for checkboxes** (per UI-SPEC.md — 36px):
```jsx
className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-stone-50 transition-colors min-h-[36px]"
```

---

### `src/shared/components/TaskTable.jsx` (modify — component, CRUD)

**Analog:** self — add FilterDropdown alongside existing ArrowUpDown icons

**Current sort icon pattern** (lines 33-43):
```jsx
const getSortIcon = (name) => {
  if (sortConfig.key !== name) {
    return <ArrowUpDown size={14} className="text-stone-300 ml-1 inline-block" />;
  }
  return (
    <ArrowUpDown
      size={14}
      className={`text-switch-primary ml-1 inline-block ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
    />
  );
};
```

**Column header pattern to extend** (lines 50-55):
```jsx
<th
  className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
  onClick={() => requestSort('dateObj')}
>
  <div className="flex items-center gap-1">Date {getSortIcon('dateObj')}</div>
</th>
```

**Add FilterDropdown trigger after sort icon:**
```jsx
<div className="flex items-center gap-1">
  Date {getSortIcon('dateObj')}
  <button
    onClick={(e) => { e.stopPropagation(); openFilter('dateObj'); }}
    className="ml-0.5"
  >
    <Filter size={12} className={activeFilters.dateObj ? 'text-switch-primary' : 'text-stone-300'} />
  </button>
</div>
```

**Filter state additions** (new useState at top of component):
```jsx
const [activeFilters, setActiveFilters] = useState({});
const [openFilterCol, setOpenFilterCol] = useState(null);
```

**Filtered + sorted data** (extend existing `sortedData` useMemo at lines 7-23):
```jsx
const filteredData = useMemo(() => {
  let items = [...data];
  // Apply each active column filter
  Object.entries(activeFilters).forEach(([col, values]) => {
    if (!values || values.length === 0) return;
    if (col === 'dateRange') {
      const { start, end } = values;
      if (start) items = items.filter(d => d.dateObj >= new Date(start));
      if (end) items = items.filter(d => d.dateObj <= new Date(end));
    } else {
      items = items.filter(d => values.includes(d[col]));
    }
  });
  return items;
}, [data, activeFilters]);
```

**Row count indicator** (add below `</table>`):
```jsx
{Object.keys(activeFilters).some(k => activeFilters[k]?.length > 0) && (
  <p className="text-xs text-stone-400 font-dm mt-2 px-1">
    Showing {sortedData.length} of {data.length} events
  </p>
)}
```

**Optional override prop additions:**
```jsx
export const TaskTable = ({ data, showContext = false, showOverride = false, onRowClick }) => {
```

---

### `src/shared/components/TaskDrilldownModal.jsx` (modify — component, request-response)

**Analog:** self — minimal change, add `detailLink` prop

Add `onNavigate` prop and entity link in header (see ChartDrilldownModal section above for the exact markup pattern). The modal body and event list remain unchanged.

---

### `src/shared/components/WeeklyCalendar.jsx` (modify — component, event-driven)

**Analog:** self — upgrade existing component

**Current component structure** (lines 1-99):
- Week navigation state: `const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));`
- `tasksByDay` useMemo: groups events into a Map keyed by `date.toDateString()`
- `weekDays` useMemo: generates array of `{ name, date }` for Mon–Sun (7 columns)

**Changes needed:**
1. Change `DAYS_OF_WEEK` from 7 days to 4: `['Mon', 'Tue', 'Wed', 'Thu']`
2. Replace `grid-cols-7` with `grid-cols-4`
3. Add `onEventClick` prop to component signature
4. Add event block height from duration
5. Add day column warning for >8h

**Current event block** (lines 82-90) — replace with height-proportional block:
```jsx
{tasks.map((task, i) => (
  <div
    key={i}
    onClick={() => onEventClick && onEventClick(task)}
    className="rounded px-1 py-0.5 text-xs truncate cursor-pointer"
    style={{
      backgroundColor: COLORS.chartPalette[clientIndex % COLORS.chartPalette.length],
      color: '#fff',
      minHeight: `${Math.max(20, (task.minutes / 60) * 48)}px`,
    }}
    title={task.task}
  >
    <p className="font-bold text-xs truncate">{task.client}</p>
    <p className="text-xs text-white/80 truncate">{task.categoryName}</p>
  </div>
))}
```

**Day column >8h warning** — wrap day container with conditional class:
```jsx
const dailyHours = tasks.reduce((acc, t) => acc + t.minutes / 60, 0);
const warningClass = dailyHours > 10
  ? 'bg-red-50 border border-red-200'
  : dailyHours > 8
    ? 'bg-amber-50 border border-amber-200'
    : 'bg-stone-50';
// Apply to the day column div:
<div key={name} className={`min-h-[120px] rounded-xl p-2 ${warningClass}`}>
```

**Navigation upgrade** (lines 47-62) — replace text arrows with ChevronLeft/ChevronRight icons:
```jsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

<button onClick={prevWeek} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-switch-secondary transition-colors">
  <ChevronLeft size={16} />
</button>
<span className="text-sm font-bold text-switch-secondary font-dm">
  Week of {currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
</span>
<button onClick={nextWeek} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-switch-secondary transition-colors">
  <ChevronRight size={16} />
</button>
```

**Import addition needed:**
```jsx
import { COLORS } from '../../constants/colors.js';
```

---

### `src/features/categories/CategoriesView.jsx` (modify — component/view, CRUD)

**Analog:** `src/features/detail/DetailView.jsx` — for chart + breakdown section patterns

**Existing category detail routing** (`src/App.jsx` lines 184-191):
```jsx
const categoryDetailData = useMemo(() => {
  if (view.type !== 'category_detail' || !filteredData) return null;
  const events = filteredData.filter(d => d.categoryName === view.id);
  const totalMinutes = events.reduce((sum, d) => sum + d.minutes, 0);
  const switchers = new Set(events.map(d => d.switcher));
  const clients = new Set(events.map(d => d.client));
  return { events, totalHours: (totalMinutes / 60).toFixed(1), switcherCount: switchers.size, clientCount: clients.size };
}, [filteredData, view]);
```

**Switcher breakdown bar chart** — copy from `DetailView.jsx` AllocationChart usage (lines 455-465):
```jsx
<Card>
  <h3 className="text-lg font-bold text-switch-secondary mb-1">Switcher Breakdown</h3>
  <p className="font-playfair text-sm text-stone-400 mb-6">Hours by team member</p>
  <AllocationChart data={switcherAllocation} limit={10} />
</Card>
```

**Client distribution donut** — copy from `DetailView.jsx` ClientDistributionChart usage (lines 460-465):
```jsx
<Card>
  <h3 className="text-lg font-bold text-switch-secondary mb-1">Client Distribution</h3>
  <p className="font-playfair text-sm text-stone-400 mb-6">Share of total hours (Pie)</p>
  <ClientDistributionChart data={clientAllocation} />
</Card>
```

**Trend line** — copy SimpleTrendChart usage pattern from `DetailView.jsx` lines 444-448:
```jsx
<Card className="w-full">
  <h3 className="text-lg font-bold text-switch-secondary mb-4">Time Trend</h3>
  <SimpleTrendChart data={trendData} timeframe={timeframe} />
</Card>
```

**useMemo aggregation pattern** for switcher/client breakdown (`CategoriesView.jsx` lines 63-78 as model):
```jsx
const switcherAllocation = useMemo(() => {
  const grouped = {};
  (events || []).forEach(d => {
    grouped[d.switcher] = (grouped[d.switcher] || 0) + d.minutes / 60;
  });
  return Object.entries(grouped)
    .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours);
}, [events]);
```

**DEPT_COLORS and CATEGORY_DEPARTMENTS** — already defined in `CategoriesView.jsx` lines 6-53. Reuse for department badge rendering in enriched drilldowns.

---

### `src/features/detail/DetailView.jsx` (modify — component/view, CRUD)

**Analog:** self — add two sections

**Calendar section** — collapsible, within `type === 'switcher'` branch (lines 452-471). Add before existing AllocationChart cards:
```jsx
{/* Weekly Calendar Section — switcher type only */}
{type === 'switcher' && (
  <Card className="mb-6">
    <button
      onClick={() => setCalendarOpen(v => !v)}
      className="w-full flex items-center justify-between cursor-pointer select-none"
    >
      <h3 className="text-lg font-bold text-switch-secondary font-dm">Weekly Calendar</h3>
      {calendarOpen ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
    </button>
    {calendarOpen && <WeeklyCalendar data={data} onEventClick={handleCalendarEventClick} />}
  </Card>
)}
```

**New state for calendar toggle:**
```jsx
const [calendarOpen, setCalendarOpen] = useState(true);
```

**Per-client category breakdown** (D-17) — for `type === 'switcher'`, add after category breakdown section (lines 584-604). Pattern mirrors existing category breakdown:
```jsx
const clientCategoryBreakdown = useMemo(() => {
  if (type !== 'switcher') return {};
  const byClient = {};
  data.forEach(d => {
    const client = d.client || 'Unknown';
    if (!byClient[client]) byClient[client] = {};
    const cat = d.categoryName || 'Misc';
    byClient[client][cat] = (byClient[client][cat] || 0) + d.minutes / 60;
  });
  return byClient;
}, [data, type]);
```

**ChartDrilldownModal state** for calendar event click:
```jsx
const [chartModal, setChartModal] = useState({ isOpen: false, title: '', tasks: [], onNavigate: null });

const handleCalendarEventClick = (event) => {
  setChartModal({ isOpen: true, title: event.task, tasks: [event], onNavigate: null });
};
```

---

### `src/App.jsx` (modify — component/root, event-driven)

**Analog:** self — add toggle state, Task Explorer nav entry, chart click wiring, remove UpcomingEvents import

**New state at top of AuthenticatedApp** (lines 101-108 pattern):
```jsx
const [upcomingMode, setUpcomingMode] = useState(false);
```

**upcomingMode filter** — extend `filteredData` useMemo (lines 121-132) with upcoming branch:
```jsx
const filteredData = useMemo(() => {
  if (!data) return null;
  let items = data;

  // Historical/Upcoming toggle filter (D-12, D-13)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (upcomingMode) {
    items = items.filter(d => d.dateObj >= today);
  } else {
    // Historical: also apply date range
    if (!dateRange.start || !dateRange.end) return items;
    const [sY, sM, sD] = dateRange.start.split('-').map(Number);
    const start = new Date(sY, sM - 1, sD);
    const [eY, eM, eD] = dateRange.end.split('-').map(Number);
    const end = new Date(eY, eM - 1, eD);
    end.setHours(23, 59, 59, 999);
    items = items.filter(d => d.dateObj >= start && d.dateObj <= end);
  }
  return items;
}, [data, dateRange, upcomingMode]);
```

**HistoricalUpcomingToggle placement** — add in header next to date range controls. Nav rendering pattern (lines ~200-250 in App.jsx, exact lines vary):
```jsx
import { HistoricalUpcomingToggle } from './shared/components/HistoricalUpcomingToggle.jsx';
// In header:
<HistoricalUpcomingToggle upcomingMode={upcomingMode} onChange={setUpcomingMode} />
```

**Task Explorer nav entry** — add alongside existing nav items. Current nav pattern (`src/App.jsx` ListView usage):
```jsx
{ type: 'task-explorer', icon: Search, label: 'Task Explorer' }
// Renders:
<TaskExplorerView data={filteredData} />
```

**UpcomingEvents removal** — delete the import line (`import { UpcomingEvents } from './shared/components/UpcomingEvents.jsx';`) and all `<UpcomingEvents ... />` JSX usages across all view renders.

---

### `supabase/functions/sync/index.ts` (modify — service, batch)

**Analog:** self — add declined meeting filter in the per-Switcher event processing loop

**Current pipeline imports** (lines 14-32):
```typescript
import { filterEvents, isWeekendEvent, isZeroDuration, isPersonalEvent } from "../_shared/eventFilter.ts";
```

**Declined meeting filter** (D-19) — add after `filterEvents()` call in the per-Switcher loop. Pattern mirrors existing `isPersonalEvent` check:
```typescript
// Filter declined meetings (D-19): if Switcher's responseStatus === 'declined', exclude
const declinedFiltered = rawFiltered.filter(event => {
  const switcherAttendee = (event.attendees || []).find(a => a.email === switcher.email);
  if (switcherAttendee && switcherAttendee.responseStatus === 'declined') {
    return false;
  }
  return true;
});
```

**Override persistence** (D-23) — in the upsert logic, add a guard: if `existing_classification_method === 'user_override'`, skip re-classifying and preserve the override columns. Pattern mirrors the existing upsert conflict resolution.

---

### `supabase/functions/_shared/ruleEngine.ts` (modify — utility, transform)

**Analog:** self — add new keyword arrays and update `classifyEvent` / `getDepartment`

**Current keyword array pattern** (lines 23-37):
```typescript
const ACCOUNTS_KEYWORDS = [
  "billing",
  "payroll",
  // ...
];
```

**Internal catch-all keywords to add** (D-18, D-21) — new constant following same pattern:
```typescript
const INTERNAL_CATCH_ALL_KEYWORDS = [
  "break",
  "changes & output",
  "changes and output",
  "inbox",
  "inbox management",
  "hr admin",
  "small tasks",
  "buffer time",
  "downtime",
];
```

**Management dept restriction** (D-20) — update `getDepartment` (lines 905-988). After Rule 1, add:
```typescript
// Rule 1b: Management categories for non-management members -> primary_dept
if (MANAGEMENT_CATEGORIES.has(taskCategory) && !isManagementMember) {
  return switcherDept;
}
```

---

### `supabase/functions/_shared/eventFilter.ts` (modify — utility, transform)

**Analog:** self — sharpen personal vs internal boundary

**Current PERSONAL_CONTAINS** (lines 23-53):
```typescript
const PERSONAL_CONTAINS: string[] = [
  "lunch",
  "gym",
  "out of office",
  // ...
];
```

**Additions** (D-21) — extend `PERSONAL_CONTAINS` with:
```typescript
"breakfast",
"commute",
"school run",
"personal errand",
```

**Internal events** (D-18/D-21) — these must NOT be in `PERSONAL_CONTAINS`. Instead they reach `ruleEngine.ts` and get classified as Internal client. Ensure the following are absent from `PERSONAL_CONTAINS`: `"break"`, `"inbox"`, `"emails"`, `"small tasks"`, `"hr admin"`, `"changes & output"`.

**`isRemovableEvent`** (lines 141-151) — no changes needed; "switch off" and "ph" remain removable.

---

### `supabase/migrations/0009_override_columns.sql` (new — migration, CRUD)

**Analog:** `supabase/migrations/0007_admin_columns.sql` (full file) — exact same structure: comment header, one `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` per new column

**Full analog** (`supabase/migrations/0007_admin_columns.sql` lines 1-13):
```sql
-- =============================================================
-- 0007_admin_columns.sql
-- Add columns required by Phase 3 admin features:
--   - active boolean on categories for soft delete (D-08)
--   - target_hourly_rate on clients for billing analytics (D-15)
-- =============================================================

-- Add active to categories (D-08)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Add target_hourly_rate to clients (D-15)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_hourly_rate numeric;
```

**New migration content:**
```sql
-- =============================================================
-- 0009_override_columns.sql
-- Add classification override columns for user override system (D-22, D-23):
--   - override_client_id: nullable FK to clients
--   - override_category_id: nullable FK to categories
--   - override_department: nullable text
-- Also extend classification_method enum with 'user_override'.
-- =============================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS override_client_id uuid REFERENCES clients(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS override_category_id uuid REFERENCES categories(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS override_department text;

-- Extend the classification_method check constraint to allow 'user_override'
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_classification_method_check;
ALTER TABLE events ADD CONSTRAINT events_classification_method_check
  CHECK (classification_method IN ('rule', 'llm', 'llm_corrected', 'misc', 'user_override'));
```

---

## Shared Patterns

### Dropdown / Popover (useClickOutside)
**Source:** `src/shared/hooks/useClickOutside.js` (lines 1-12) + `src/shared/components/MultiSelect.jsx` (lines 1-10)
**Apply to:** `FilterDropdown.jsx`, `ClassificationOverridePanel.jsx`
```jsx
import { useRef, useCallback } from 'react';
import { useClickOutside } from '../hooks/useClickOutside.js';

const dropdownRef = useRef(null);
useClickOutside(dropdownRef, useCallback(() => setIsOpen(false), []));
// Wrap trigger + panel in: <div className="relative" ref={dropdownRef}>
```

### API Error Handling
**Source:** `src/shared/services/adminApi.js` (lines 15-20)
**Apply to:** `ClassificationOverridePanel.jsx` (override save), any new admin Edge Function action
```jsx
const body = await res.json();
if (!res.ok) throw new Error(body.error || 'Request failed');
return body;
```

### useMemo Aggregation Chain
**Source:** `src/features/categories/CategoriesView.jsx` (lines 63-98) + `src/features/detail/DetailView.jsx` (lines 170-231)
**Apply to:** `TaskExplorerView.jsx` (filter → sort chain), `CategoriesView.jsx` drilldown additions
```jsx
const derivedData = useMemo(() => {
  const acc = {};
  (data || []).forEach(d => {
    // group, aggregate, accumulate
  });
  return Object.values(acc).sort((a, b) => b.minutes - a.minutes);
}, [data, ...dependencies]);
```

### Toast Notification
**Source:** `src/shared/components/Toast.jsx` (lines 1-18)
**Apply to:** `ClassificationOverridePanel.jsx` (save confirmation), any new async user action
```jsx
import { Toast } from './Toast.jsx';
// In component state:
const [toast, setToast] = useState(null);
// After successful async action:
setToast({ message: 'Override saved.', type: 'success' });
// In JSX:
{toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
```

### Recharts Chart Click Handler
**Source:** `src/features/dashboard/AllocationChart.jsx` or `src/features/dashboard/DonutChart.jsx` — Recharts `onClick` prop
**Apply to:** All chart components across Dashboard, DetailView, CategoriesView, TaskExplorerView
```jsx
// On <Bar>, <Cell>, <Area>, <Line>:
onClick={(data, index) => onChartClick(data.name, filteredEventsForEntity)}
// Cursor pointer:
style={{ cursor: 'pointer' }}
```

### Admin Edge Function Action Pattern
**Source:** `supabase/functions/admin/index.ts` (lines 722-778)
**Apply to:** New `'save-override'` action in admin Edge Function
```typescript
case 'save-override':
  return handleSaveOverride(payload);
// Handler follows the same pattern:
async function handleSaveOverride(payload: Record<string, unknown>): Promise<Response> {
  const { event_id, client_id, category_id, department } = payload;
  if (!event_id) return jsonResponse({ error: 'Event ID is required.' }, 400);
  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      override_client_id: client_id ?? null,
      override_category_id: category_id ?? null,
      override_department: department ?? null,
      classification_method: 'user_override',
    })
    .eq('id', event_id)
    .select()
    .single();
  if (error) return jsonResponse({ error: 'Could not save override. Check your connection and try again.' }, 500);
  return jsonResponse({ ok: true, data });
}
```

### COLORS.chartPalette for Client Color Mapping
**Source:** `src/constants/colors.js` (lines 1-20)
**Apply to:** `WeeklyCalendar.jsx` (event block background), `ChartDrilldownModal.jsx` (future chart elements)
```jsx
import { COLORS } from '../../constants/colors.js';
// Usage: COLORS.chartPalette[clientIndex % COLORS.chartPalette.length]
```

### Collapsible Section Toggle
**Source:** `src/features/categories/CategoriesView.jsx` (lines 57-62, 158-175)
**Apply to:** `WeeklyCalendar.jsx` within DetailView (calendar section), `ClassificationOverridePanel.jsx` (expand/collapse)
```jsx
const [isCollapsed, setIsCollapsed] = useState(false);
// Header:
<button onClick={() => setIsCollapsed(v => !v)} className="w-full flex items-center justify-between ...">
  <span>Section Title</span>
  {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
</button>
{!isCollapsed && <div>content</div>}
```

### mapSupabaseRow Override Fields
**Source:** `src/shared/utils/mapSupabaseRow.js` (lines 1-24)
**Apply to:** `mapSupabaseRow.js` (add override fields)
```jsx
// Add to return object:
overrideClientId: row.override_client_id ?? null,
overrideCategoryId: row.override_category_id ?? null,
overrideDepartment: row.override_department ?? null,
isUserOverride: row.classification_method === 'user_override',
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/functions/_shared/llmClassifier.ts` (context injection for D-24) | utility | transform | LLM context injection from override audit_log has no prior analog — new pattern. Follow existing `buildSystemPrompt` function in `llmClassifier.ts` (lines 30-92) and append a "Recent corrections" section built from `audit_log` query results. |

---

## Metadata

**Analog search scope:** `src/`, `supabase/functions/`, `supabase/migrations/`
**Files scanned:** 55
**Pattern extraction date:** 2026-04-16
