'use client';

import { useRouter } from 'next/navigation';

interface UniversalHeaderProps {
  title: string;
  backPath: string;
  actions?: React.ReactNode;
}

export default function UniversalHeader({ title, backPath, actions }: UniversalHeaderProps) {
  const router = useRouter();

  return (
    <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm sticky top-0 z-10 no-print">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <div className="flex justify-between items-center py-6">
          <div className="flex flex-col">
            <div className="text-6xl font-bold text-[#475569] tracking-tight">
              DELIVERY
            </div>
            <h1 className="text-apple-subheadline text-slate-500 mt-1">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {actions}
            <button
              onClick={() => router.push(backPath)}
              className="px-4 py-2 text-apple-subheadline font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
