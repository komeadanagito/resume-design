import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Square, Loader2 } from 'lucide-react';
import type { Todo } from '../types';

export function TodoCard({ todos }: { todos: Todo[] }) {
  const [open, setOpen] = useState(true);
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const progressPercent = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  const getStatusIcon = (status: Todo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckSquare className="w-4 h-4 text-brand-500 fill-brand-50" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-ink-300 line-through" />;
      default:
        return <Square className="w-4 h-4 text-ink-500" />;
    }
  };

  return (
    <div className="bg-surface-card border border-ink-300/10 shadow-card rounded-2xl p-4 my-3 max-w-full overflow-hidden">
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between text-sm font-semibold text-ink-900 mb-1.5">
            <span>正在执行计划进度</span>
            <span>{completedCount} / {todos.length}</span>
          </div>
          <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-brand-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div>
          {open ? <ChevronUp className="w-4 h-4 text-ink-500" /> : <ChevronDown className="w-4 h-4 text-ink-500" />}
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-3 border-t border-ink-300/10 space-y-2.5">
          {todos.map((todo) => (
            <div 
              key={todo.id} 
              className={`flex items-start gap-2.5 text-xs text-ink-700 ${
                todo.status === 'completed' ? 'opacity-70' : todo.status === 'in_progress' ? 'font-semibold' : ''
              }`}
            >
              <div className="mt-0.5">{getStatusIcon(todo.status)}</div>
              <span className={todo.status === 'completed' ? 'line-through' : ''}>{todo.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
