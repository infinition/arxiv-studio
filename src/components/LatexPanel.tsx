import { Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  latex: string;
  onDownload: () => void;
}

export default function LatexPanel({ latex, onDownload }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>LaTeX Source</span>
        <div className="flex gap-1">
          <button onClick={handleCopy} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Copy to clipboard">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDownload} className="p-1.5 rounded cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Download .tex">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={latex}
        className="flex-1 w-full rounded-lg p-2 text-xs font-mono resize-none border outline-none min-h-[200px]"
        style={{
          background: 'var(--hover-bg)',
          borderColor: 'var(--panel-border)',
          color: 'var(--text-primary)',
        }}
      />
      <button
        onClick={onDownload}
        className="mt-2 w-full py-2 rounded-lg text-xs font-medium bg-blue-500 text-white cursor-pointer hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-3.5 h-3.5" /> Download .tex
      </button>
    </div>
  );
}
