import { AlertTriangle } from 'lucide-react';

interface MaintenanceModalProps {
  title: string;
  message: string;
  onClose: () => void;
}

export default function MaintenanceModal({ title, message, onClose }: MaintenanceModalProps) {
  return (
    <div 
      id="maintenance-modal"
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-5 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-250">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
