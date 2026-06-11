import { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, Paperclip } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  status: 'idle' | 'thinking' | 'tooling' | 'writing' | 'error';
}

export function ChatComposer({ onSend, onCancel, status }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isWorking = status !== 'idle' && status !== 'error';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isWorking) return;
    onSend(text);
    setText('');
  };

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [text]);

  return (
    <div className="relative bg-surface-card border border-ink-300/20 rounded-2xl p-3 shadow-card transition-all duration-200">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="描述你想要的简历修改，或者在此粘贴你的经历草稿... (⌘+Enter 发送)"
        className="w-full bg-transparent text-sm text-ink-900 placeholder-ink-500 focus:outline-none resize-none pb-12 pr-12 min-h-[44px]"
      />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between border-t border-ink-300/10 pt-3">
        <div className="flex items-center gap-2">
          {/* Real AgentPicker (CLI detection + BYOK config) lands in slice 7. */}
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-500 border border-ink-300/10">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            Anthropic Sonnet 4.6 (BYOK)
          </span>

          <button className="p-1.5 hover:bg-surface-muted rounded-xl text-ink-500 transition">
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button */}
        <div>
          {isWorking ? (
            <button
              onClick={onCancel}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition flex items-center justify-center shadow-sm"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white p-2 rounded-xl transition flex items-center justify-center shadow-sm"
            >
              <Send className="w-4 h-4 fill-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
