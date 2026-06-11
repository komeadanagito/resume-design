import { useEffect, useRef } from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { useChat } from '../state/chat';
import { AssistantMessage } from './AssistantMessage';
import { ChatComposer } from './ChatComposer';

const STARTER_PROMPTS = [
  {
    icon: '▤',
    title: '现代科技风',
    subtitle: '双列 + 蓝色主色',
    prompt: '/skill:resume-modern-tech 帮我把简历修改为适合投递字节跳动后端开发岗位的现代科技风格，突出微服务和Go语言的高并发优化经验。'
  },
  {
    icon: '▦',
    title: '投行咨询经典',
    subtitle: '单列 + 黑色系统字体',
    prompt: '/skill:resume-classic 帮我把简历整理成经典排版，适合投递中金公司或麦肯锡，加强量化数据指标，去掉无关的社团经历。'
  },
  {
    icon: '◈',
    title: '中英双语简历',
    subtitle: '多语言数据对齐',
    prompt: '/skill:resume-bilingual-cn-en 将这份简历进行中英文翻译并排版，对齐中英文的岗位职责，保持ATS友好度。'
  }
];

export function ChatPane() {
  const { messages, status, sendMessage, respondToCard, cancelWorking } = useChat();
  const listRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleSend = (text: string, options?: { skillId?: string; designSystemId?: string }) => {
    sendMessage(text, options);
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-300/10 bg-surface-card">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-brand-500" />
          <h2 className="text-sm font-bold text-ink-900">简历设计师 AI Chat</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-500 font-semibold bg-surface-muted px-2.5 py-1 rounded-xl">
          <div className={`w-2 h-2 rounded-full ${status !== 'idle' && status !== 'error' ? 'bg-brand-500 animate-pulse' : 'bg-ink-300'}`} />
          <span>{status === 'thinking' ? '思考中' : status === 'tooling' ? '执行工具中' : status === 'writing' ? '写入简历中' : '空闲'}</span>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-500/15 flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-900">开始设计您的专业简历</h3>
              <p className="text-xs text-ink-700 mt-1.5 leading-relaxed">
                在下方输入框中粘贴您的简历草稿，或者选择下方的快速引导开始与 AI 进行对话式排版。
              </p>
            </div>

            <div className="w-full space-y-3">
              {STARTER_PROMPTS.map((starter, i) => (
                <div
                  key={i}
                  onClick={() => handleSend(starter.prompt)}
                  className="bg-surface-card border border-ink-300/10 rounded-2xl p-3.5 text-left cursor-pointer hover:border-brand-500 hover:shadow-sm transition-all duration-150 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center font-semibold text-brand-500 group-hover:bg-brand-50 transition">
                      {starter.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink-900">{starter.title}</div>
                      <div className="text-[10px] text-ink-500 mt-0.5">{starter.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <AssistantMessage 
              key={msg.id} 
              message={msg} 
              onCardSubmit={respondToCard} 
            />
          ))
        )}
      </div>

      {/* Composer Input Footer */}
      <div className="p-4 bg-surface-card border-t border-ink-300/10">
        <ChatComposer
          onSend={handleSend}
          onCancel={cancelWorking}
          status={status}
        />
      </div>
    </div>
  );
}
