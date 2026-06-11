import { useState } from 'react';
import { Check, CheckCircle2, ChevronRight, X } from 'lucide-react';
import type { 
  QuestionFormCard, 
  DirectionPickerCard, 
  OptionCardData, 
  ConfirmCardData, 
  DiffCardData 
} from '../types';

// ==========================================
// 1. QuestionForm Component
// ==========================================
export function QuestionForm({ card, onSubmit }: { card: QuestionFormCard; onSubmit: (payload: Record<string, any>) => void }) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    card.fields.forEach((f) => {
      if (f.type === 'checkbox') initial[f.key] = false;
      else initial[f.key] = f.options?.[0]?.value || '';
    });
    return initial;
  });

  const handleChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (card.status === 'pending') {
      onSubmit(formData);
    }
  };

  const isResponded = card.status !== 'pending';

  return (
    <div className="bg-surface-card border border-brand-500/20 shadow-card rounded-2xl p-5 my-4 max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-brand-50 text-brand-500 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
          表单问询
        </span>
        {isResponded && (
          <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已提交
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-4">{card.prompt}</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {card.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-700">{field.label}</label>
            
            {field.type === 'select' && (
              <select
                disabled={isResponded}
                value={formData[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {field.type === 'radio' && (
              <div className="space-y-2">
                {field.options?.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                    <input
                      type="radio"
                      disabled={isResponded}
                      name={field.key}
                      value={opt.value}
                      checked={formData[field.key] === opt.value}
                      onChange={() => handleChange(field.key, opt.value)}
                      className="text-brand-500 focus:ring-brand-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === 'checkbox' && (
              <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isResponded}
                  checked={!!formData[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-500"
                />
                <span>显示在简历中</span>
              </label>
            )}

            {field.type === 'text' && (
              <input
                type="text"
                disabled={isResponded}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3 py-2 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-brand-500 disabled:opacity-60"
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                disabled={isResponded}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                rows={3}
                className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3 py-2 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-brand-500 disabled:opacity-60 resize-none"
              />
            )}
          </div>
        ))}

        {!isResponded && (
          <button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>提交偏好</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}

// ==========================================
// 2. DirectionPicker Component
// ==========================================
export function DirectionPicker({ card, onSubmit }: { card: DirectionPickerCard; onSubmit: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const isResponded = card.status !== 'pending';

  const handleSelect = (id: string) => {
    if (!isResponded) {
      setSelected(id);
      onSubmit(id);
    }
  };

  return (
    <div className="bg-surface-card border border-brand-500/20 shadow-card rounded-2xl p-5 my-4 max-w-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-brand-550/10 text-brand-500 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase bg-brand-50">
          视觉方向选择
        </span>
        {isResponded && (
          <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已选定
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-4">{card.prompt}</p>

      <div className="grid grid-cols-2 gap-3.5">
        {card.directions.map((dir) => {
          const isSelected = selected === dir.id || (isResponded && card.status === 'responded'); // mock selection representation
          return (
            <div
              key={dir.id}
              onClick={() => handleSelect(dir.id)}
              className={`border rounded-2xl p-3 cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'border-brand-500 bg-brand-50/20 shadow-sm' 
                  : 'border-ink-300/20 hover:border-ink-300/40 bg-surface-muted/50'
              } ${isResponded ? 'opacity-80 pointer-events-none' : ''}`}
            >
              <div className="w-full aspect-video rounded-lg bg-surface border border-ink-300/10 flex items-center justify-center font-bold text-ink-500 text-xs mb-2.5 overflow-hidden relative">
                <span className="z-10">{dir.name}</span>
                {/* 4 Color Palette visualizer */}
                <div className="absolute bottom-0 left-0 right-0 h-2 flex">
                  {dir.palette.map((color, idx) => (
                    <div key={idx} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-ink-900">{dir.name}</div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
              </div>
              <div className="text-[10px] text-ink-500 mt-1">
                {dir.fonts.display} / {dir.fonts.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 3. OptionCard Component
// ==========================================
export function OptionCard({ card, onSubmit }: { card: OptionCardData; onSubmit: (value: string | string[]) => void }) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const isResponded = card.status !== 'pending';

  const handleSelect = (val: string) => {
    if (isResponded) return;

    if (card.multiple) {
      const next = selectedValues.includes(val) 
        ? selectedValues.filter((v) => v !== val)
        : [...selectedValues, val];
      setSelectedValues(next);
    } else {
      setSelectedValues([val]);
      onSubmit(val);
    }
  };

  const handleMultiSubmit = () => {
    if (selectedValues.length > 0) {
      onSubmit(selectedValues);
    }
  };

  return (
    <div className="bg-surface-card border border-brand-500/20 shadow-card rounded-2xl p-5 my-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-brand-50 text-brand-500 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
          快速选项
        </span>
        {isResponded && (
          <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已答复
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-3.5">{card.prompt}</p>

      <div className="space-y-2">
        {card.options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value);
          return (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`border rounded-xl p-3 cursor-pointer transition-all duration-150 flex items-start justify-between ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/10'
                  : 'border-ink-300/10 hover:border-ink-300/30 bg-surface'
              } ${isResponded ? 'opacity-80 pointer-events-none' : ''}`}
            >
              <div>
                <div className="text-xs font-semibold text-ink-900">{opt.label}</div>
                {opt.description && <div className="text-[10px] text-ink-500 mt-0.5">{opt.description}</div>}
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 mt-0.5 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {card.multiple && !isResponded && (
        <button
          onClick={handleMultiSubmit}
          disabled={selectedValues.length === 0}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl mt-4 transition shadow-sm"
        >
          确认选择
        </button>
      )}
    </div>
  );
}

// ==========================================
// 4. ConfirmCard Component
// ==========================================
export function ConfirmCard({ card, onSubmit }: { card: ConfirmCardData; onSubmit: (value: 'apply' | 'reject' | 'modify') => void }) {
  const isResponded = card.status !== 'pending';

  return (
    <div className="bg-surface-card border border-brand-500/20 shadow-card rounded-2xl p-5 my-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-brand-50 text-brand-500 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
          二元决策确认
        </span>
        {isResponded && (
          <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 决策已应用
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-4">{card.prompt}</p>

      <div className="flex gap-2">
        {card.actions.map((act) => {
          const btnClass = 
            act.variant === 'primary' 
              ? 'bg-brand-500 hover:bg-brand-600 text-white flex-1 font-semibold text-sm py-2.5 rounded-xl shadow-sm'
              : act.variant === 'danger'
              ? 'bg-red-500 hover:bg-red-600 text-white flex-1 font-semibold text-sm py-2.5 rounded-xl shadow-sm'
              : 'bg-surface hover:bg-surface-tag border border-ink-300/20 text-ink-700 font-semibold text-sm py-2.5 px-4 rounded-xl';
          
          return (
            <button
              key={act.value}
              disabled={isResponded}
              onClick={() => onSubmit(act.value)}
              className={`${btnClass} disabled:opacity-60 transition`}
            >
              {act.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 5. DiffCard Component
// ==========================================
export function DiffCard({ card, onSubmit }: { card: DiffCardData; onSubmit: (decision: 'apply' | 'reject') => void }) {
  const isResponded = card.status !== 'pending';

  return (
    <div className="bg-surface-card border border-brand-500/20 shadow-card rounded-2xl p-5 my-4 max-w-md overflow-hidden">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="bg-brand-555/10 text-brand-500 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase bg-brand-50">
            简历改写对比
          </span>
          <span className="text-[10px] text-ink-500 font-mono font-semibold bg-surface px-2 py-0.5 rounded border border-ink-300/10">
            {card.field}
          </span>
        </div>
        {isResponded && (
          <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已完成
          </span>
        )}
      </div>

      <div className="space-y-3 mb-4.5">
        <div className="bg-red-50/30 border border-red-200/20 rounded-xl p-3 text-xs">
          <div className="text-red-500 font-semibold mb-1 flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> 修改前
          </div>
          <p className="text-ink-700 leading-relaxed font-sans">{card.before}</p>
        </div>
        
        <div className="bg-green-50/30 border border-green-200/20 rounded-xl p-3 text-xs">
          <div className="text-green-600 font-semibold mb-1 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> 修改后
          </div>
          <p className="text-ink-900 leading-relaxed font-sans font-semibold">{card.after}</p>
        </div>
      </div>

      {!isResponded ? (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSubmit('apply')}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-2.5 rounded-xl transition shadow-sm"
          >
            {card.acceptLabel}
          </button>
          <button
            onClick={() => onSubmit('reject')}
            className="border border-ink-300/20 text-ink-700 hover:bg-surface font-semibold text-sm py-2.5 px-4 rounded-xl transition"
          >
            {card.rejectLabel}
          </button>
        </div>
      ) : (
        <div className="text-xs text-ink-500 italic mt-3 bg-surface p-2 rounded text-center">
          已确认该对比并写入项目工作区
        </div>
      )}
    </div>
  );
}
