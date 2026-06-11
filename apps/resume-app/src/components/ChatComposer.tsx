import { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, Paperclip, ChevronUp } from 'lucide-react';
import { useConfig } from '../state/config';

interface Props {
  onSend: (text: string, options?: { skillId?: string; designSystemId?: string }) => void;
  onCancel: () => void;
  status: 'idle' | 'thinking' | 'tooling' | 'writing' | 'error';
}

export function ChatComposer({ onSend, onCancel, status }: Props) {
  const { config, updateConfig } = useConfig();
  const [text, setText] = useState('');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
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
    
    // Parse manual skill overwrite e.g. /skill:resume-modern-tech
    let skillId: string | undefined;
    let cleanText = text;
    const match = /^\/skill:([a-zA-Z0-9-]+)\s*/.exec(text);
    if (match) {
      skillId = match[1];
      cleanText = text.replace(/^\/skill:[a-zA-Z0-9-]+\s*/, '');
    }

    onSend(cleanText, { skillId });
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
          {/* Agent Selector Button */}
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-surface-tag border border-ink-300/10 rounded-xl text-xs font-semibold text-ink-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>
                {config.mode === 'daemon' ? `Local · ${config.agentId}` : `API · ${config.model}`}
              </span>
              <ChevronUp className="w-3 h-3 text-ink-500" />
            </button>

            {showAgentMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface-card border border-ink-300/20 rounded-2xl shadow-card p-3 z-50 space-y-1">
                <div className="text-[10px] font-bold text-ink-500 px-2.5 py-1 uppercase tracking-wider">
                  本地 Agent CLI
                </div>
                {[
                  { id: 'claude-code', label: 'Claude Code CLI' },
                  { id: 'codex', label: 'Codex CLI' },
                  { id: 'gemini', label: 'Gemini CLI' }
                ].map((cli) => (
                  <div
                    key={cli.id}
                    onClick={() => {
                      updateConfig({ mode: 'daemon', agentId: cli.id });
                      setShowAgentMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-xl cursor-pointer hover:bg-surface-muted ${
                      config.mode === 'daemon' && config.agentId === cli.id
                        ? 'text-brand-500 bg-brand-50/25'
                        : 'text-ink-700'
                    }`}
                  >
                    <span>{cli.label}</span>
                    <span className="text-[10px] text-green-500 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
                      已安装
                    </span>
                  </div>
                ))}
                
                <div className="h-px bg-ink-300/10 my-2" />
                
                <div className="text-[10px] font-bold text-ink-500 px-2.5 py-1 uppercase tracking-wider">
                  API 转发 (BYOK)
                </div>
                {[
                  { model: 'claude-3-5-sonnet-latest', label: 'Anthropic Sonnet 3.5' },
                  { model: 'gpt-4o', label: 'OpenAI GPT-4o' },
                  { model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
                ].map((byok) => (
                  <div
                    key={byok.model}
                    onClick={() => {
                      updateConfig({ mode: 'api', model: byok.model });
                      setShowAgentMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-xl cursor-pointer hover:bg-surface-muted ${
                      config.mode === 'api' && config.model === byok.model
                        ? 'text-brand-500 bg-brand-50/25'
                        : 'text-ink-700'
                    }`}
                  >
                    <span>{byok.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
