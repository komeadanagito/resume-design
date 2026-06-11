import { Bot, User, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ChatMessage } from '../types';
import { renderMarkdown } from '../runtime/markdown';
import { ToolCard } from './ToolCard';
import { TodoCard } from './TodoCard';
import {
  QuestionForm,
  DirectionPicker,
  OptionCard,
  ConfirmCard,
  DiffCard,
} from './HumanLoopCards';

interface Props {
  message: ChatMessage;
  onCardSubmit: (cardId: string, payload: unknown) => void;
}

export function AssistantMessage({ message, onCardSubmit }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3 max-w-full">
        <div className="flex flex-col items-end max-w-[85%]">
          <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm">
            {message.content}
          </div>
          <span className="text-[10px] text-ink-500 mt-1 font-semibold">你</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-500/10 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-brand-500" />
        </div>
      </div>
    );
  }

  // Render assistant message types
  const renderMessageContent = () => {
    switch (message.kind) {
      case 'assistant':
        return (
          <div className="bg-surface-card border border-ink-300/10 shadow-card rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed text-ink-900 max-w-full overflow-hidden">
            {renderMarkdown(message.content)}
          </div>
        );
      case 'tool_call':
        return message.toolCall ? <ToolCard tool={message.toolCall} /> : null;
      case 'todo_update':
        return message.todos ? <TodoCard todos={message.todos} /> : null;
      case 'question_form':
        return message.card && message.card.kind === 'question_form' ? (
          <QuestionForm 
            card={message.card} 
            onSubmit={(payload) => onCardSubmit(message.card!.id, payload)} 
          />
        ) : null;
      case 'direction_pick':
        return message.card && message.card.kind === 'direction_pick' ? (
          <DirectionPicker 
            card={message.card} 
            onSubmit={(id) => onCardSubmit(message.card!.id, id)} 
          />
        ) : null;
      case 'option_card':
        return message.card && message.card.kind === 'option_card' ? (
          <OptionCard 
            card={message.card} 
            onSubmit={(val) => onCardSubmit(message.card!.id, val)} 
          />
        ) : null;
      case 'confirm_card':
        return message.card && message.card.kind === 'confirm_card' ? (
          <ConfirmCard 
            card={message.card} 
            onSubmit={(val) => onCardSubmit(message.card!.id, val)} 
          />
        ) : null;
      case 'diff_card':
        return message.card && message.card.kind === 'diff_card' ? (
          <DiffCard 
            card={message.card} 
            onSubmit={(val) => onCardSubmit(message.card!.id, val)} 
          />
        ) : null;
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200/30 rounded-2xl px-4 py-3 flex items-start gap-2.5 max-w-md">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-red-900">执行出错: {message.error?.code}</div>
              <p className="text-xs text-red-700 mt-0.5 leading-normal">{message.error?.message}</p>
            </div>
          </div>
        );
      case 'done':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50/50 border border-green-200/10 rounded-xl max-w-fit text-xs text-green-600 font-medium font-sans my-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{message.content}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start gap-3 max-w-full">
      <div className="w-8 h-8 rounded-full bg-surface-muted border border-ink-300/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-ink-700" />
      </div>
      <div className="flex flex-col items-start max-w-[85%] space-y-1">
        {renderMessageContent()}
        <span className="text-[10px] text-ink-500 mt-1 pl-1 font-semibold">
          {message.agentName || 'Resume Studio Agent'}
        </span>
      </div>
    </div>
  );
}
