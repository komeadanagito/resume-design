import { useEffect, useState } from 'react';
import { X, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react';

type DaemonConfigView = {
  hasApiKey: boolean;
  apiKeyLast4?: string;
  model: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6（推荐）' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8（更强，更贵）' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5（更快，更便宜）' },
];

export function SettingsDialog({ open, onClose }: Props) {
  const [config, setConfig] = useState<DaemonConfigView | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setApiKey('');
    void fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DaemonConfigView | null) => {
        if (data) {
          setConfig(data);
          setModel(data.model);
        }
      })
      .catch(() => {
        setFeedback({ tone: 'error', text: '无法连接本地服务（daemon）。请确认它正在运行。' });
      });
  }, [open]);

  const handleSave = async () => {
    if (!apiKey.trim() && model === config?.model) {
      onClose();
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const payload: Record<string, string> = {};
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      if (model !== config?.model || !config) payload.model = model;
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(detail.message ?? '保存失败');
      }
      const next = (await res.json()) as DaemonConfigView;
      setConfig(next);
      setApiKey('');
      setFeedback({ tone: 'ok', text: '已保存。新配置即刻生效，无需重启。' });
    } catch (err) {
      setFeedback({ tone: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] bg-surface-card rounded-3xl shadow-modal p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-500" />
            设置
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-muted rounded-xl text-ink-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink-700">Anthropic API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              config?.hasApiKey ? `已配置（尾号 ${config.apiKeyLast4}）— 输入新 Key 可替换` : 'sk-ant-...'
            }
            className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:border-brand-500 font-mono"
          />
          <p className="text-[10px] text-ink-500 leading-relaxed">
            Key 仅保存在本机的本地服务配置中，不会进入浏览器存储或上传到任何服务器。
            调用 AI 时，你的简历内容会发送至 Anthropic API。
          </p>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink-700">模型</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-surface-muted border border-ink-300/20 rounded-xl px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-500"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 ${
              feedback.tone === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.tone === 'ok' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted rounded-xl transition"
          >
            关闭
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
