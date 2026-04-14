# Code Conventions

## Language & Runtime

- **Language:** JavaScript (JSX) — no TypeScript
- **React version:** 18.2 with hooks (no class components)
- **Module system:** ES Modules (`"type": "module"` in package.json)

## Component Patterns

### Arrow Function Components
All components are arrow function expressions, not function declarations:
```jsx
const Card = ({ children, className = "", onClick }) => (
  <div className={`bg-white rounded-2xl ${className}`}>{children}</div>
);
```

### Props Destructuring
Props are always destructured in the function signature:
```jsx
const DetailStat = ({ label, value, sub }) => (...)
```

### Default Props via Defaults
Default values use JS defaults in destructuring, not `defaultProps`:
```jsx
const AllocationChart = ({ data, dataKey = "hours", nameKey = "name", color = null, limit = null, onClick }) => {...}
```

### Early Return for Conditional Rendering
Modals and conditional components use early return:
```jsx
const SettingsModal = ({ isOpen, onClose, ... }) => {
    if (!isOpen) return null;
    return (...);
};
```

## State Management Patterns

### useMemo for All Derived Data
Every piece of derived/aggregated data uses `useMemo`:
```jsx
const stats = useMemo(() => {
    // Heavy computation
    return { totalHours, switcherCount, ... };
}, [filteredData]);
```

This is applied consistently throughout `src/App.jsx` for:
- Filtered data (`filteredData`)
- Statistics (`stats`, `detailStats`)
- List data (`listData`)
- Chart data (`trendData`, `clientAllocation`, `categoryAllocation`)
- Entity lists (`entityLists`, `breakdownList`)

### useState for UI State
Simple state with `useState` — no reducers or context:
```jsx
const [view, setView] = useState({ type: 'dashboard', id: null });
const [sortOrder, setSortOrder] = useState('alpha');
```

### useEffect for Side Effects
Used sparingly:
- Click-outside detection for dropdowns (`src/App.jsx:267`)
- Default selection when trend mode changes (`src/App.jsx:1038`, `src/App.jsx:1579`)
- Syncing settings modal input with stored API key (`src/App.jsx:143`)

## Styling Conventions

### Tailwind CSS with Arbitrary Values
Brand colors are hardcoded as Tailwind arbitrary values rather than extending the theme:
```jsx
className="text-[#2f3f28] bg-[#a5c869] text-[#d2beff]"
```

### COLORS Constant for Dynamic Use
Chart colors and programmatic styling use the `COLORS` constant (`src/App.jsx:13`):
```jsx
const COLORS = {
  bg: '#edf4ed',
  primary: '#a5c869',
  secondary: '#2f3f28',
  tertiary: '#d2beff',
  chartPalette: [...]
};
```

### Google Fonts via Inline Style Tags
Fonts imported inside JSX render via `<style>` tags:
```jsx
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:...');
  .font-dm { font-family: 'DM Sans', sans-serif; }
  .font-playfair { font-family: 'Playfair Display', serif; }
`}</style>
```

### Animation Classes
Uses Tailwind `animate-in` classes for page transitions:
```jsx
className="animate-in fade-in slide-in-from-bottom-4 duration-500"
```

## Error Handling

### Try/Catch for API Calls
The `callGemini` function uses try/catch with console.error logging:
```jsx
try {
    const response = await fetch(...);
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "API request failed");
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
} catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
}
```

### UI Error State
AI features display errors inline via `aiError` state:
```jsx
error ? (
    <div className="text-center py-8">
        <p className="text-red-500 font-bold mb-2">Analysis Failed</p>
        <p className="text-stone-500 text-sm">{error}</p>
    </div>
) : (...)
```

### No Global Error Boundary
No React error boundary is implemented. Unhandled errors will crash the app.

## Code Organization

### Section Comments
The file uses `// --- Section Name ---` comments to delimit logical sections:
- `// --- Assets & Constants ---`
- `// --- Helpers ---`
- `// --- API Service ---`
- `// --- Components ---`
- `// --- View Components ---`
- `// --- Main App Logic ---`

### No Imports Between Files
All code lives in `src/App.jsx`. There are no internal imports or module boundaries.
