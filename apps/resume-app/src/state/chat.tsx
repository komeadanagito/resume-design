import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ChatMessage } from '../types';
import { cancelRun, getProjectState, sendMessage as postMessage } from '../lib/api';
import { subscribeToConversation, type SseSubscription } from '../runtime/sse-client';

export type ChatStatus = 'idle' | 'thinking' | 'tooling' | 'writing' | 'error';

export type ChatContextValue = {
  messages: ChatMessage[];
  status: ChatStatus;
  errorMessage?: string;
  activeTool?: string;
  files: string[];
  tabs: string[];
  activeTab: string | null;
  addTab: (tab: string) => void;
  removeTab: (tab: string) => void;
  setActiveTab: (tab: string | null) => void;
  sendMessage: (text: string) => Promise<void>;
  respondToCard: (cardId: string, payload: unknown) => Promise<void>;
  cancelWorking: () => void;
  triggerTweak: (key: string, value: unknown) => Promise<void>;
};

export const ChatContext = createContext<ChatContextValue | null>(null);

const EMPTY_PREVIEW =
  '<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;color:#5C5564;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>简历 artifact 将在生成后显示在这里。</p></body></html>';

// Mirrors the daemon's ArtifactStore.fileNameFor so tabs and on-disk files agree.
function fileNameFor(tabId: string): string {
  return tabId.startsWith('resume') ? 'resume.html' : `${tabId}.html`;
}

export function ChatProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [activeTool] = useState<string | undefined>(undefined);
  const [artifacts, setArtifacts] = useState<Record<string, string>>({ 'resume.html': EMPTY_PREVIEW });
  const [tabs, setTabs] = useState<string[]>(['Design Files', 'resume.html']);
  const [activeTab, setActiveTab] = useState<string | null>('resume.html');
  const files = Object.keys(artifacts);
  const subscriptionRef = useRef<SseSubscription | null>(null);
  const inflightContentRef = useRef('');
  const inflightIdRef = useRef<string | null>(null);

  const addTab = (tab: string) => {
    setTabs((prev) => (prev.includes(tab) ? prev : [...prev, tab]));
    setActiveTab(tab);
  };

  const removeTab = (tab: string) => {
    setTabs((prev) => prev.filter((t) => t !== tab));
    if (activeTab === tab) setActiveTab('Design Files');
  };

  // Load persisted history from the daemon on project switch.
  useEffect(() => {
    let stale = false;
    setMessages([]);
    setStatus('idle');
    setErrorMessage(undefined);
    void getProjectState(projectId)
      .then((state) => {
        if (stale) return;
        setMessages(
          state.messages.map((m): ChatMessage => ({
            id: m.id,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            kind: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
            createdAt: Date.parse(m.createdAt),
          }))
        );
        if (state.artifacts.length > 0) {
          const restored: Record<string, string> = {};
          for (const artifact of state.artifacts) {
            restored[fileNameFor(artifact.tabId)] = artifact.content;
          }
          setArtifacts((prev) => ({ ...prev, ...restored }));
        }
      })
      .catch(() => {
        // First launch without daemon history is not an error surface.
      });
    return () => {
      stale = true;
      subscriptionRef.current?.cancel();
      subscriptionRef.current = null;
    };
  }, [projectId]);

  const finishInflight = useCallback(() => {
    const id = inflightIdRef.current;
    const content = inflightContentRef.current;
    if (id && content) {
      setMessages((prev) => {
        // Replace the streaming bubble with the final message.
        const withoutPending = prev.filter((m) => m.id !== `pending-${id}`);
        return [
          ...withoutPending,
          { id, role: 'assistant', kind: 'assistant', content, createdAt: Date.now() },
        ];
      });
    }
    inflightIdRef.current = null;
    inflightContentRef.current = '';
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        kind: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus('thinking');
      setErrorMessage(undefined);

      try {
        await postMessage(projectId, { text: trimmed });
      } catch (err) {
        setStatus('error');
        setErrorMessage((err as Error).message);
        return;
      }

      subscriptionRef.current?.cancel();
      subscriptionRef.current = subscribeToConversation(projectId, (event) => {
        switch (event.type) {
          case 'message_started': {
            inflightIdRef.current = event.id;
            inflightContentRef.current = '';
            setStatus('writing');
            setMessages((prev) => [
              ...prev,
              { id: `pending-${event.id}`, role: 'assistant', kind: 'assistant', content: '', createdAt: Date.now() },
            ]);
            break;
          }
          case 'message_delta': {
            inflightContentRef.current += event.delta;
            const pendingId = `pending-${inflightIdRef.current}`;
            const content = inflightContentRef.current;
            setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, content } : m)));
            break;
          }
          case 'message_completed': {
            finishInflight();
            break;
          }
          case 'artifact_done': {
            const fileName = fileNameFor(event.tabId);
            setArtifacts((prev) => ({ ...prev, [fileName]: event.final.content }));
            setTabs((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
            setActiveTab(fileName);
            break;
          }
          case 'done': {
            setStatus('idle');
            subscriptionRef.current?.cancel();
            subscriptionRef.current = null;
            break;
          }
          case 'error': {
            finishInflight();
            setStatus('error');
            setErrorMessage(event.message);
            subscriptionRef.current?.cancel();
            subscriptionRef.current = null;
            break;
          }
          default:
            // tool_call / todo_update / card / artifact_* land in slice 3-4.
            break;
        }
      });
    },
    [projectId, finishInflight]
  );

  // Card responses round-trip as plain user text until slice 4 adds the
  // dedicated /cards/:id/respond endpoint.
  const respondToCard = useCallback(
    async (cardId: string, payload: unknown) => {
      await sendMessage(`[card:${cardId}] ${JSON.stringify(payload)}`);
    },
    [sendMessage]
  );

  const cancelWorking = useCallback(() => {
    subscriptionRef.current?.cancel();
    subscriptionRef.current = null;
    setStatus('idle');
    void cancelRun(projectId).catch(() => {
      // Daemon idle-cancel returns { cancelled: false }; network errors are non-fatal here.
    });
  }, [projectId]);

  // Tweaks panel is wired to real artifacts in slice 3.
  const triggerTweak = useCallback(async (_key: string, _value: unknown) => {}, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        status,
        errorMessage,
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
