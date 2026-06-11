import { useState } from 'react';
import { 
  FileText, 
  Folder, 
  ChevronRight, 
  Download, 
  Sliders, 
  Code, 
  Eye, 
  X,
  UploadCloud,
  FileCode,
  FileJson
} from 'lucide-react';
import { useChat, getArtifactContent } from '../state/chat';

export function FileWorkspace() {
  const { 
    files, 
    tabs, 
    activeTab, 
    addTab, 
    removeTab, 
    setActiveTab, 
    triggerTweak 
  } = useChat();

  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [showTweaks, setShowTweaks] = useState(false);
  
  // Tweak variables
  const [accentColor, setAccentColor] = useState('#635BFF');
  const [fontSize, setFontSize] = useState(14);
  const [margins, setMargins] = useState(40);

  const handleDownload = (format: 'html' | 'pdf' | 'json') => {
    if (!activeTab || activeTab === 'Design Files') return;
    const content = getArtifactContent(activeTab);
    
    if (format === 'html') {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeTab;
      a.click();
    } else if (format === 'json') {
      const jsonContent = getArtifactContent('resume.json') || '{}';
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.json';
      a.click();
    } else {
      // Mock PDF export using window.print() of target iframe
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
      }
    }
  };

  const handleTweakChange = (key: string, value: any) => {
    if (key === 'accent_color') {
      setAccentColor(value);
      triggerTweak('accent_color', value);
    }
  };

  const activeContent = activeTab ? getArtifactContent(activeTab) : '';

  return (
    <div className="flex flex-col h-full bg-surface-card border-l border-ink-300/10">
      {/* Tabs list */}
      <div className="flex items-center justify-between border-b border-ink-300/10 bg-surface px-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 pt-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const isHome = tab === 'Design Files';
            return (
              <div
                key={tab}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-xl border-t border-x cursor-pointer transition ${
                  isActive
                    ? 'bg-surface-card border-ink-300/10 text-brand-500 font-bold'
                    : 'bg-surface-muted/50 border-transparent text-ink-700 hover:bg-surface-muted'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {isHome ? <Folder className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{tab === 'Design Files' ? '设计文件树' : tab}</span>
                {!isHome && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(tab);
                    }}
                    className="p-0.5 hover:bg-ink-300/10 rounded-full"
                  >
                    <X className="w-2.5 h-2.5 text-ink-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {activeTab === 'Design Files' ? (
          /* File tree tab */
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2">
                <Folder className="w-4 h-4 text-brand-500" />
                <span>项目工作区文件 (projects/default/)</span>
              </h3>
              
              <div className="border border-ink-300/10 rounded-2xl overflow-hidden divide-y divide-ink-300/10 bg-surface-muted/30">
                {files.map((file) => {
                  const isHtml = file.endsWith('.html');
                  const isJson = file.endsWith('.json');
                  const IconComp = isHtml ? FileCode : isJson ? FileJson : FileText;
                  
                  return (
                    <div
                      key={file}
                      onClick={() => addTab(file)}
                      className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-surface transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComp className="w-4 h-4 text-ink-500 group-hover:text-brand-500" />
                        <span className="text-xs font-semibold text-ink-900 font-mono">{file}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-300 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drop Zone */}
            <div className="border-2 border-dashed border-ink-300/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 hover:bg-surface-muted/20 transition cursor-pointer">
              <UploadCloud className="w-8 h-8 text-ink-500" />
              <div>
                <h4 className="text-xs font-bold text-ink-900">上传参考简历或职位 JD (PDF / TXT)</h4>
                <p className="text-[10px] text-ink-500 mt-1 leading-normal">
                  拖拽文件至此处，AI 将分析文本并用于简历定制。
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Open artifact tab */
          <div className="flex-1 flex flex-col min-h-0 bg-surface">
            {/* View controllers */}
            <div className="flex items-center justify-between px-4 py-2 bg-surface-card border-b border-ink-300/10">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    viewMode === 'preview' ? 'bg-brand-50 text-brand-500' : 'text-ink-700 hover:bg-surface-muted'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>渲染视图</span>
                </button>
                <button
                  onClick={() => setViewMode('source')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    viewMode === 'source' ? 'bg-brand-50 text-brand-500' : 'text-ink-700 hover:bg-surface-muted'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>查看源码</span>
                </button>
                {activeTab === 'resume.html' && (
                  <button
                    onClick={() => setShowTweaks(!showTweaks)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      showTweaks ? 'bg-brand-50 text-brand-500' : 'text-ink-700 hover:bg-surface-muted'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>视觉调参</span>
                  </button>
                )}
              </div>

              {/* Downloads */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload('html')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-muted hover:bg-surface-tag rounded-xl text-[10px] font-bold text-ink-900 border border-ink-300/10 transition"
                >
                  <Download className="w-3 h-3 text-ink-500" />
                  <span>HTML</span>
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-[10px] font-bold text-white transition"
                >
                  <Download className="w-3 h-3 text-white" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* View body */}
            <div className="flex-1 flex min-h-0 relative">
              {/* Iframe Preview */}
              {viewMode === 'preview' && (
                <div className="flex-1 h-full bg-white relative flex flex-col justify-center items-center overflow-auto p-4">
                  <iframe
                    id="preview-iframe"
                    srcDoc={activeContent}
                    sandbox="allow-same-origin allow-modals"
                    className="w-[210mm] h-[297mm] shadow-lg border border-ink-300/10 bg-white"
                  />
                </div>
              )}

              {/* Source View */}
              {viewMode === 'source' && (
                <pre className="flex-1 h-full overflow-auto p-6 bg-surface-muted/30 text-xs font-mono text-ink-900 border-none select-text">
                  <code>{activeContent}</code>
                </pre>
              )}

              {/* Tweak sidebar */}
              {showTweaks && viewMode === 'preview' && (
                <div className="w-64 border-l border-ink-300/10 bg-surface-card p-4 space-y-4 shadow-sm z-10">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-ink-300/10">
                    <Sliders className="w-4 h-4 text-brand-500" />
                    <h4 className="text-xs font-bold text-ink-900">视觉微调 (Tweaks)</h4>
                  </div>
                  
                  {/* Accent Color picker */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-ink-700 uppercase">主题主色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => handleTweakChange('accent_color', e.target.value)}
                        className="w-8 h-8 rounded border border-ink-300/10 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-semibold text-ink-900">{accentColor}</span>
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-ink-700 uppercase">正文字号</label>
                    <input
                      type="range"
                      min={12}
                      max={18}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full text-brand-500 focus:ring-brand-500"
                    />
                    <div className="flex justify-between text-[10px] text-ink-500 font-semibold font-mono">
                      <span>12px</span>
                      <span>{fontSize}px</span>
                      <span>18px</span>
                    </div>
                  </div>

                  {/* Margins */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-ink-700 uppercase">上下页边距</label>
                    <input
                      type="range"
                      min={20}
                      max={60}
                      value={margins}
                      onChange={(e) => setMargins(parseInt(e.target.value))}
                      className="w-full text-brand-500"
                    />
                    <div className="flex justify-between text-[10px] text-ink-500 font-semibold font-mono">
                      <span>20px</span>
                      <span>{margins}px</span>
                      <span>60px</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
