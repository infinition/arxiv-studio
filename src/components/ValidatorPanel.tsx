import type { LintWarning } from '../types';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Props {
  warnings: LintWarning[];
}

const icons = {
  error: { icon: AlertCircle, color: '#ef4444' },
  warning: { icon: AlertTriangle, color: '#f59e0b' },
  info: { icon: Info, color: '#3b82f6' },
};

export default function ValidatorPanel({ warnings }: Props) {
  return (
    <div className="p-3">
      <div className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>
        arXiv Validator
      </div>

      {warnings.length === 0 ? (
        <div className="flex items-center gap-2 px-2 py-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400">All checks passed</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {warnings.map((w, i) => {
            const { icon: Icon, color } = icons[w.type];
            return (
              <div
                key={i}
                className="flex items-start gap-2 px-2 py-1.5 rounded-md text-xs"
                style={{ background: 'var(--hover-bg)' }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} />
                <span style={{ color: 'var(--text-primary)' }}>{w.message}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 px-1">
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Summary</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(['error', 'warning', 'info'] as const).map((type) => {
            const count = warnings.filter((w) => w.type === type).length;
            const { color } = icons[type];
            return (
              <div key={type} className="px-2 py-1.5 rounded-md" style={{ background: 'var(--hover-bg)' }}>
                <div className="text-lg font-bold" style={{ color }}>{count}</div>
                <div className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{type}s</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
