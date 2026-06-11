import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ToolCall } from '../types';

export function ToolCard({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false);

  const getStatusIcon = () => {
    switch (tool.status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />;
    }
  };

  return (
    <div className="bg-surface-muted border border-ink-300/20 rounded-2xl p-4 my-2 max-w-full overflow-hidden transition-all duration-200">
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-ink-500" />
          <span className="text-sm font-semibold text-ink-900">
            {tool.name === 'write' ? '写入文件' : tool.name === 'read' ? '读取文件' : `调用工具: ${tool.name}`}
          </span>
          <span className="text-xs text-ink-500">
            {tool.status === 'done' ? '已完成' : tool.status === 'error' ? '失败' : '运行中...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {open ? <ChevronUp className="w-4 h-4 text-ink-500" /> : <ChevronDown className="w-4 h-4 text-ink-500" />}
        </div>
      </div>
      
      {open && (
        <div className="mt-3 pt-3 border-t border-ink-300/10 space-y-3 text-xs font-mono">
          <div>
            <div className="text-ink-500 mb-1 font-semibold">输入参数:</div>
            <pre className="bg-surface p-2.5 rounded-xl border border-ink-300/10 overflow-x-auto text-ink-700">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {!!tool.output && (
            <div>
              <div className="text-ink-500 mb-1 font-semibold">执行输出:</div>
              <pre className="bg-surface p-2.5 rounded-xl border border-ink-300/10 overflow-x-auto text-ink-700">
                {typeof tool.output === 'string' ? (tool.output as string) : JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
