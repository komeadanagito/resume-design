import { useState } from 'react';
import { 
  Plus, 
  Trash, 
  Sparkles, 
  Sliders, 
  FileText,
  User,
  Globe,
  Monitor
} from 'lucide-react';
import { useProjects } from '../state/projects';
import { navigate } from '../router';

const BUILTIN_SKILLS = [
  { id: 'resume-modern-tech', name: '现代科技公司风格', description: '双列，主色蓝色，适合后端/PM岗位。' },
  { id: 'resume-classic', name: '经典金融风', description: '单列，主色深黑/灰色，适合投行/咨询公司。' },
  { id: 'resume-editorial-academic', name: '学术研究体', description: '衬线字体，纸张质感底色，适合硕博/教职申请。' },
  { id: 'resume-bilingual-cn-en', name: '中英双语同源', description: '自适应双语排版，方便同时审查。' }
];

const BUILTIN_DS = [
  { id: 'linear-style', name: 'Linear Design', colors: ['#635BFF', '#1D102C', '#F4F0E8', '#00D4B2'], fonts: 'Inter / PingFang' },
  { id: 'stripe-style', name: 'Stripe Corporate', colors: ['#00D4B2', '#0A2540', '#F8F9FA', '#635BFF'], fonts: 'Charter / System' },
  { id: 'anthropic-style', name: 'Anthropic Editorial', colors: ['#E0533C', '#191919', '#F9F6F0', '#3B82F6'], fonts: 'Tiempos / Inter' },
  { id: 'minimal-mono', name: 'Minimalist Monospace', colors: ['#111111', '#111111', '#FFFFFF', '#111111'], fonts: 'Monaco / JetBrains' }
];

export function EntryView() {
  const { projects, createProject, deleteProject } = useProjects();
  
  // Creation panel form state
  const [name, setName] = useState('');
  const [skillId, setSkillId] = useState('resume-modern-tech');
  const [dsId, setDsId] = useState('linear-style');
  const [fidelity, setFidelity] = useState<'wireframe' | 'high'>('high');

  // Active library tab
  const [activeTab, setActiveTab] = useState<'designs' | 'skills' | 'ds'>('designs');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const project = await createProject(name, skillId, dsId, fidelity);
    if (project) {
      navigate({ kind: 'project', projectId: project.id, fileName: null });
    }
  };

  const handleOpen = (id: string) => {
    navigate({ kind: 'project', projectId: id, fileName: null });
  };

  return (
    <div className="flex flex-col h-full bg-surface text-ink-900 font-sans">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-8 py-5 bg-surface-card border-b border-ink-300/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Resume Studio</h1>
            <p className="text-[10px] text-brand-500 font-bold tracking-widest uppercase mt-0.5">
              Agentic CV compiler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-xs text-ink-700 font-semibold bg-surface-muted hover:bg-surface-tag px-3.5 py-2 rounded-xl transition border border-ink-300/10">
            <Globe className="w-3.5 h-3.5" />
            <span>简体中文</span>
          </button>
          <button className="w-8 h-8 rounded-full bg-surface-muted hover:bg-surface-tag flex items-center justify-center border border-ink-300/10 transition">
            <User className="w-4 h-4 text-ink-700" />
          </button>
        </div>
      </header>

      {/* Main Body Split */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Side: Create panel */}
        <aside className="w-[360px] bg-surface-card border-r border-ink-300/10 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-extrabold text-ink-900">新建简历项目</h2>
              <p className="text-[11px] text-ink-500 mt-1 leading-normal">
                通过指定风格和设计规范启动您的简历编译工作区。
              </p>
            </div>

            {/* Input name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink-700">项目名称</label>
              <input
                type="text"
                placeholder="我的个人简历 - 后端岗位"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Select templates/skills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink-700">简历预设风格 (Skills)</label>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-500"
              >
                {BUILTIN_SKILLS.map((sk) => (
                  <option key={sk.id} value={sk.id}>{sk.name}</option>
                ))}
              </select>
            </div>

            {/* Select design systems */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink-700">设计规范 (Design Systems)</label>
              <select
                value={dsId}
                onChange={(e) => setDsId(e.target.value)}
                className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-500"
              >
                {BUILTIN_DS.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </div>

            {/* Fidelity selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-700">保真度 (Fidelity)</label>
              <div className="grid grid-cols-2 gap-2 bg-surface-muted p-1 rounded-xl border border-ink-300/10">
                <button
                  onClick={() => setFidelity('wireframe')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    fidelity === 'wireframe' 
                      ? 'bg-surface-card text-brand-500 shadow-sm font-bold' 
                      : 'text-ink-700 hover:text-ink-900'
                  }`}
                >
                  线框图风格
                </button>
                <button
                  onClick={() => setFidelity('high')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    fidelity === 'high' 
                      ? 'bg-surface-card text-brand-500 shadow-sm font-bold' 
                      : 'text-ink-700 hover:text-ink-900'
                  }`}
                >
                  高保真输出
                </button>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>新建并进入工作区</span>
            </button>
          </div>

          {/* Settings consent reminder */}
          <div className="text-[10px] text-ink-500 mt-6 pt-4 border-t border-ink-300/10 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-ink-500" />
            <span>本地引擎模式运行中</span>
          </div>
        </aside>

        {/* Right Side: Tab Contents */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 border-b border-ink-300/10 pb-3">
            {[
              { id: 'designs', label: '我的简历 (Designs)', icon: FileText },
              { id: 'skills', label: '内置风格 (Skills)', icon: Sparkles },
              { id: 'ds', label: '设计系统 (Design Systems)', icon: Sliders },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-500 font-bold'
                      : 'text-ink-700 hover:bg-surface-muted'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* tab pane: My Designs */}
          {activeTab === 'designs' && (
            <div className="grid grid-cols-2 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-2 border-2 border-dashed border-ink-300/20 rounded-2xl p-12 text-center text-ink-500">
                  您还没有创建过简历项目，请在左侧侧边栏新建。
                </div>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-surface-card border border-ink-300/10 rounded-2xl p-5 hover:shadow-cardHover hover:border-brand-500/30 transition duration-200 cursor-pointer flex flex-col justify-between h-[160px]"
                    onClick={() => handleOpen(proj.id)}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-ink-900 group-hover:text-brand-500">
                          {proj.name}
                        </h3>
                        <span className="text-[10px] bg-brand-50 text-brand-500 font-semibold px-2 py-0.5 rounded-full">
                          {proj.fidelity === 'wireframe' ? '线框' : '高保真'}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-500 font-mono mt-1">
                        已绑定: {proj.skillId} · {proj.designSystemId}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-ink-300/10 pt-3 text-[10px] text-ink-500">
                      <span>修改于: {new Date(proj.updatedAt).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(proj.id);
                        }}
                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* tab pane: Skills */}
          {activeTab === 'skills' && (
            <div className="grid grid-cols-2 gap-4">
              {BUILTIN_SKILLS.map((sk) => (
                <div key={sk.id} className="bg-surface-card border border-ink-300/10 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <h3 className="text-xs font-bold text-ink-900">{sk.name}</h3>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed">{sk.description}</p>
                  <div className="text-[10px] text-ink-500 font-mono bg-surface p-2 rounded">
                    rs:mode: resume · ats_target: high
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* tab pane: Design Systems */}
          {activeTab === 'ds' && (
            <div className="grid grid-cols-2 gap-4">
              {BUILTIN_DS.map((ds) => (
                <div key={ds.id} className="bg-surface-card border border-ink-300/10 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-ink-900">{ds.name}</h3>
                    <span className="text-[9px] text-ink-500 font-mono">{ds.fonts}</span>
                  </div>
                  
                  {/* Colors Preview row */}
                  <div className="flex h-5 rounded-lg overflow-hidden border border-ink-300/10">
                    {ds.colors.map((c, idx) => (
                      <div key={idx} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-ink-500 font-semibold font-mono">
                    {ds.colors.map((c, idx) => (
                      <span key={idx}>{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
