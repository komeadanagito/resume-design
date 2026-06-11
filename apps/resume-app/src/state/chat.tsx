import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ChatMessage, HumanLoopCard } from '../types';

export type ChatContextValue = {
  messages: ChatMessage[];
  status: 'idle' | 'thinking' | 'tooling' | 'writing' | 'error';
  activeTool?: string;
  activeTodoIndex?: number;
  files: string[];
  tabs: string[];
  activeTab: string | null;
  addTab: (tab: string) => void;
  removeTab: (tab: string) => void;
  setActiveTab: (tab: string | null) => void;
  sendMessage: (text: string, options?: { skillId?: string; designSystemId?: string }) => Promise<void>;
  respondToCard: (cardId: string, payload: unknown) => Promise<void>;
  cancelWorking: () => void;
  triggerTweak: (key: string, value: unknown) => Promise<void>;
  loadProjectWorkspace: (projectId: string) => Promise<void>;
};

export const ChatContext = createContext<ChatContextValue | null>(null);

// Mock initial resume data
const initialResumeHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; color: #1D102C; margin: 40px; background: #FFF; }
    h1 { font-size: 28px; font-weight: bold; border-bottom: 2px solid #0066FF; padding-bottom: 8px; color: #1D102C; }
    .section { margin-top: 24px; }
    .section-title { font-size: 18px; font-weight: 600; color: #0066FF; text-transform: uppercase; margin-bottom: 12px; }
    .item { margin-top: 16px; margin-bottom: 16px; }
    .item-header { display: flex; justify-content: space-between; font-weight: bold; }
    .item-meta { display: flex; justify-content: space-between; color: #5C5564; font-size: 14px; margin-bottom: 4px; }
    .bullets { margin-top: 6px; padding-left: 20px; }
    .bullets li { margin-bottom: 4px; font-size: 14px; color: #5C5564; }
  </style>
</head>
<body>
  <h1>张小明 (Alex Zhang)</h1>
  <div style="display: flex; gap: 16px; color: #5C5564; font-size: 14px; margin-top: 8px;">
    <span>xiaoming@email.com</span> | <span>+86 138-0000-0000</span> | <span>上海</span>
  </div>

  <div class="section">
    <div class="section-title">工作经历</div>
    <div class="item">
      <div class="item-header">
        <span>高级后端工程师 @ 字节跳动</span>
        <span>2024.03 - 至今</span>
      </div>
      <ul class="bullets">
        <li>主导核心交易系统的微服务重构，支撑日常 QPS 翻倍至 50,000+。</li>
        <li>使用 Go / gRPC 重构订单服务，将接口响应时间 (P99) 从 180ms 降低至 45ms。</li>
        <li>优化分布式锁机制，彻底解决并发秒杀场景下的超卖问题。</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">教育背景</div>
    <div class="item">
      <div class="item-header">
        <span>上海交通大学</span>
        <span>2020.09 - 2024.06</span>
      </div>
      <div class="item-meta">
        <span>计算机科学与技术 · 工学学士</span>
        <span>GPA: 3.8 / 4.0</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

export function ChatProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'tooling' | 'writing' | 'error'>('idle');
  const [activeTool, setActiveTool] = useState<string | undefined>();
  const [files] = useState<string[]>(['resume.html', 'resume.json', 'styles.css']);
  const [tabs, setTabs] = useState<string[]>(['Design Files', 'resume.html']);
  const [activeTab, setActiveTab] = useState<string | null>('resume.html');
  const [artifacts, setArtifacts] = useState<Record<string, string>>({
    'resume.html': initialResumeHtml,
    'resume.json': '{\n  "name": "张小明",\n  "email": "xiaoming@email.com"\n}',
    'styles.css': '/* Global styles */',
  });

  const addTab = (tab: string) => {
    if (!tabs.includes(tab)) {
      setTabs((prev) => [...prev, tab]);
    }
    setActiveTab(tab);
  };

  const removeTab = (tab: string) => {
    setTabs((prev) => prev.filter((t) => t !== tab));
    if (activeTab === tab) {
      setActiveTab('Design Files');
    }
  };

  const loadProjectWorkspace = async () => {
    setMessages([
      {
        id: 'init-msg',
        role: 'assistant',
        kind: 'assistant',
        content: '你好！我是你的简历制作助手。我们可以通过自然语言对话来撰写或优化你的简历。你可以：\\n- 直接粘贴你目前的中文/英文简历草稿。\\n- 告诉我你想要申请的岗位和目标公司，让就细节提出建议。\\n- 告诉我你要使用的风格，比如“stripe 科技风”或“学术经典”。',
        createdAt: Date.now() - 60000,
      },
    ]);
    setStatus('idle');
  };

  useEffect(() => {
    if (projectId) {
      loadProjectWorkspace();
    }
  }, [projectId]);

  // Mocking SSE stream for frontend testing
  const simulateAgentStream = async (text: string, _options?: { skillId?: string; designSystemId?: string }) => {
    setStatus('thinking');
    
    // Add user message
    const userMsgId = `msg-${Math.random()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      kind: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    await delay(1000);
    setStatus('tooling');
    setActiveTool('Critique');

    // Add Tool call event
    const toolMsgId = `tool-${Math.random()}`;
    const toolMsg: ChatMessage = {
      id: toolMsgId,
      role: 'assistant',
      kind: 'tool_call',
      content: 'Using tool Critique...',
      createdAt: Date.now(),
      toolCall: {
        id: 'crit-1',
        name: 'Critique',
        input: { prompt: text },
        status: 'pending',
      },
    };
    setMessages((prev) => [...prev, toolMsg]);

    await delay(1200);
    // Mark tool call done
    setMessages((prev) =>
      prev.map((m) =>
        m.id === toolMsgId
          ? {
              ...m,
              toolCall: m.toolCall ? { ...m.toolCall, status: 'done', output: 'Found experience sections' } : undefined,
            }
          : m
      )
    );

    if (text.includes('英文') || text.toLowerCase().includes('english') || text.includes('翻译')) {
      setStatus('writing');
      const responseMsgId = `resp-${Math.random()}`;
      const responseMsg: ChatMessage = {
        id: responseMsgId,
        role: 'assistant',
        kind: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, responseMsg]);

      const fullResponse = '我已收到您的请求，开始将您的简历翻译为英文，并应用 \`resume-bilingual-cn-en\` 风格以对齐现代双语招聘规范。\\n\\n我们将主要修改核心工作条目，将其中的技术贡献量化。以下是翻译对比，您是否确认应用该翻译？';
      let delta = '';
      for (let k = 0; k < fullResponse.length; k += 4) {
        delta += fullResponse.slice(k, k + 4);
        setMessages((prev) =>
          prev.map((m) => (m.id === responseMsgId ? { ...m, content: delta } : m))
        );
        await delay(50);
      }

      await delay(500);
      const cardMsgId = `card-${Math.random()}`;
      const cardMsg: ChatMessage = {
        id: cardMsgId,
        role: 'assistant',
        kind: 'diff_card',
        content: 'Please confirm translation',
        createdAt: Date.now(),
        card: {
          id: 'card-diff-1',
          conversationId: 'conv-1',
          createdAt: Date.now(),
          status: 'pending',
          prompt: '工作经历第一条改写对比：',
          kind: 'diff_card',
          before: '主导核心交易系统的微服务重构，支撑日常 QPS 翻倍至 50,000+。',
          after: 'Led the microservices architecture refactoring of core trading systems, successfully handling 2x peak daily QPS of 50,000+.',
          field: '工作经历 · 字节跳动',
          acceptLabel: '接受修改',
          rejectLabel: '保留原文',
        },
      };
      setMessages((prev) => [...prev, cardMsg]);
      setStatus('idle');
    } else if (text.includes('岗位') || text.includes('方向') || text.includes('新建')) {
      setStatus('writing');
      const cardMsgId = `card-${Math.random()}`;
      const cardMsg: ChatMessage = {
        id: cardMsgId,
        role: 'assistant',
        kind: 'question_form',
        content: 'Please fill in details',
        createdAt: Date.now(),
        card: {
          id: 'card-qform-1',
          conversationId: 'conv-1',
          createdAt: Date.now(),
          status: 'pending',
          prompt: '为了给您设计最适合的简历排版，请填写以下偏好表单：',
          kind: 'question_form',
          fields: [
            {
              key: 'lang',
              label: '简历语言',
              type: 'select',
              options: [
                { value: 'zh', label: '中文' },
                { value: 'en', label: '英文' },
                { value: 'bilingual', label: '中英双语' },
              ],
              required: true,
            },
            {
              key: 'industry',
              label: '目标岗位行业',
              type: 'radio',
              options: [
                { value: 'tech', label: '互联网科技 / 后端 / 前端' },
                { value: 'finance', label: '金融 / 投行 / 咨询' },
                { value: 'academic', label: '学术 / 研究生申请' },
                { value: 'creative', label: '创意设计 / 艺术' },
              ],
              required: true,
            },
            {
              key: 'photo',
              label: '是否显示头像照片',
              type: 'checkbox',
            },
          ],
        },
      };
      setMessages((prev) => [...prev, cardMsg]);
      setStatus('idle');
    } else {
      setStatus('writing');
      const responseMsgId = `resp-${Math.random()}`;
      const responseMsg: ChatMessage = {
        id: responseMsgId,
        role: 'assistant',
        kind: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, responseMsg]);

      const fullResponse = '没问题，我们来微调你的简历，将“主导核心交易系统的微服务重构”这一句改写得更有说服力。正在为你生成新的 HTML 简历，应用 \`stripe-style\` 的现代扁平风格布局...';
      let delta = '';
      for (let k = 0; k < fullResponse.length; k += 5) {
        delta += fullResponse.slice(k, k + 5);
        setMessages((prev) =>
          prev.map((m) => (m.id === responseMsgId ? { ...m, content: delta } : m))
        );
        await delay(40);
      }

      await delay(500);
      setStatus('writing');
      setActiveTool('Write resume.html');

      const newHtml = initialResumeHtml.replace(
        '<h1>张小明 (Alex Zhang)</h1>',
        '<h1>张小明 (Senior Software Engineer)</h1>'
      ).replace('#0066FF', '#635BFF');

      await delay(1000);
      setArtifacts((prev) => ({
        ...prev,
        'resume.html': newHtml,
      }));
      
      const doneMsg: ChatMessage = {
        id: `done-${Math.random()}`,
        role: 'assistant',
        kind: 'done',
        content: 'Working finished in 3.2 seconds. Successfully compiled v2 of resume.html.',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, doneMsg]);
      setStatus('idle');
      setActiveTool(undefined);
    }
  };

  const sendMessage = async (text: string, options?: { skillId?: string; designSystemId?: string }) => {
    await simulateAgentStream(text, options);
  };

  const respondToCard = async (cardId: string, payload: unknown) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.card && m.card.id === cardId
          ? { ...m, card: { ...m.card, status: 'responded' } as HumanLoopCard }
          : m
      )
    );

    const answerText = `[Form Response] Confirmed choices: ${JSON.stringify(payload)}`;
    await simulateAgentStream(answerText);
  };

  const cancelWorking = () => {
    setStatus('idle');
    setActiveTool(undefined);
  };

  const triggerTweak = async (key: string, value: unknown) => {
    setStatus('tooling');
    setActiveTool('Tweak CSS');
    await new Promise((r) => setTimeout(r, 600));
    
    if (key === 'accent_color') {
      const colorVal = String(value);
      setArtifacts((prev) => {
        const oldHtml = prev['resume.html'] || '';
        const updatedHtml = oldHtml.replace(/#635BFF|#0066FF/g, colorVal);
        return {
          ...prev,
          'resume.html': updatedHtml,
        };
      });
    }
    
    setStatus('idle');
    setActiveTool(undefined);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        status,
        activeTool,
        files,
        tabs,
        activeTab,
        addTab,
        removeTab,
        setActiveTab,
        sendMessage,
        respondToCard,
        cancelWorking,
        triggerTweak,
        loadProjectWorkspace,
      }}
    >
      {children}
      <div style={{ display: 'none' }} id="resume-artifacts-holder">
        {Object.entries(artifacts).map(([k, v]) => (
          <div key={k} id={`art-${k}`}>
            {v}
          </div>
        ))}
      </div>
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within <ChatProvider>');
  return ctx;
}

export function getArtifactContent(key: string): string {
  const el = document.getElementById(`art-${key}`);
  return el ? el.textContent || '' : '';
}
