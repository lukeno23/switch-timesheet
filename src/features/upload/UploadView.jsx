import { Upload } from 'lucide-react';
import { LogoMain } from '../../constants/logos.jsx';
import { Card } from '../../shared/components/Card.jsx';

export const UploadView = ({ onFileUpload }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileUpload(file);
  };

  return (
    <div className="min-h-screen bg-switch-bg flex flex-col items-center justify-center p-6">
      <div className="mb-12 animate-in fade-in zoom-in duration-700 flex flex-col items-center">
        <LogoMain />
        <span className="text-switch-primary font-dm text-xs font-bold tracking-widest uppercase mt-3">
          Workload Dashboard
        </span>
      </div>

      <Card className="max-w-md w-full text-center py-12 px-8 border-t-4 border-switch-primary">
        <div className="w-16 h-16 bg-switch-bg text-switch-secondary rounded-full flex items-center justify-center mx-auto mb-6">
          <Upload size={32} />
        </div>
        <h1 className="text-2xl font-bold text-switch-secondary font-dm mb-3">Upload Timesheet</h1>
        <p className="text-stone-500 mb-8 font-dm">
          Upload your Switch CSV timesheet to visualize performance metrics.
        </p>

        <label className="block w-full cursor-pointer group">
          <div className="w-full bg-switch-secondary text-white py-4 rounded-xl font-bold font-dm transition-transform transform group-hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-switch-secondary/20 flex items-center justify-center gap-2">
            <span>Select CSV File</span>
          </div>
          <input type="file" accept=".csv" onChange={handleChange} className="hidden" />
        </label>
      </Card>
    </div>
  );
};
