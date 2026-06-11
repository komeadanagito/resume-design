import { ArrowLeft, Sparkles, Sliders } from 'lucide-react';
import { useProjects } from '../state/projects';
import { ChatProvider } from '../state/chat';
import { ChatPane } from './ChatPane';
import { FileWorkspace } from './FileWorkspace';
import { navigate } from '../router';

interface Props {
  projectId: string;
}

export function ProjectView({ projectId }: Props) {
  const { projects } = useProjects();
  const currentProject = projects.find((p) => p.id === projectId);

  const handleBack = () => {
    navigate({ kind: 'home' });
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface">
        <div className="text-sm text-ink-500 font-semibold mb-4">加载项目失败或项目不存在</div>
        <button
          onClick={handleBack}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <ChatProvider projectId={projectId}>
      <div className="flex flex-col h-full bg-surface text-ink-900 font-sans">
        {/* Workspace Top Header Bar */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-surface-card border-b border-ink-300/10 shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-surface-muted rounded-xl transition border border-ink-300/10 text-ink-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink-900">{currentProject.name}</h2>
                <span className="text-[9px] bg-brand-50 text-brand-500 font-bold px-1.5 py-0.5 rounded-full uppercase">
                  {currentProject.locale}
                </span>
              </div>
              <p className="text-[10px] text-ink-500 font-mono mt-0.5">
                项目ID: {currentProject.id}
              </p>
            </div>
          </div>

          {/* Config states details */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-ink-700 bg-surface-muted px-2.5 py-1.5 rounded-xl border border-ink-300/10">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>风格由对话决定</span>
            </div>
            <div className="flex items-center gap-1.5 text-ink-700 bg-surface-muted px-2.5 py-1.5 rounded-xl border border-ink-300/10">
              <Sliders className="w-3.5 h-3.5 text-brand-500" />
              <span>{currentProject.designSystemId || '默认调色板'}</span>
            </div>
          </div>
        </header>

        {/* Two-Column split workspace */}
        <div className="flex-1 flex min-h-0">
          {/* Left Side: Chat timeline */}
          <div className="w-[480px] flex-shrink-0 h-full border-r border-ink-300/10">
            <ChatPane />
          </div>

          {/* Right Side: Design Workspace, Files tree, Iframe preview */}
          <div className="flex-1 h-full min-w-0">
            <FileWorkspace />
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}
