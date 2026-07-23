import {
  Bot,
  ChevronRight,
  GripVertical,
  History,
  Lightbulb,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useOps } from '../../contexts/OpsContext';
import {
  PROACTIVE_TIPS,
  PROACTIVE_TIPS_ID,
  SUGGESTED_PROMPTS,
  SUGGESTED_PROMPTS_ID,
  runCopilot,
  type CopilotAction,
  type CopilotReply,
} from '../../lib/copilotEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: CopilotAction[];
  suggestions?: string[];
  ts: number;
}

const MIN_W = 300;
const MAX_W = 480;
const DEFAULT_W = 360;

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Lightweight markdown → React-ish HTML (safe subset) */
function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const nodes: ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="my-1.5 list-disc space-y-1 pl-4">
        {listBuf.map((item, i) => (
          <li
            key={i}
            className="text-[12px] leading-relaxed text-[#C8D0D6]"
            dangerouslySetInnerHTML={{ __html: inline(item) }}
          />
        ))}
      </ul>,
    );
    listBuf = [];
  };

  const inline = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#E8ECEF] font-semibold">$1</strong>')
      .replace(
        /`(.+?)`/g,
        '<code class="rounded bg-[#0D1116] px-1 py-0.5 font-mono text-[11px] text-[#1ADBDE]">$1</code>',
      );

  lines.forEach((line, idx) => {
    if (line.startsWith('### ')) {
      flushList();
      nodes.push(
        <h3 key={idx} className="mb-1 mt-2 text-[12px] font-semibold tracking-wide text-[#E8ECEF]">
          {line.slice(4)}
        </h3>,
      );
      return;
    }
    if (line.startsWith('|')) {
      flushList();
      const cells = line.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return;
      nodes.push(
        <div key={idx} className="grid grid-cols-2 gap-x-2 border-b border-[#1E242A] py-0.5 text-[11px]">
          <span className="text-[#6A737C]" dangerouslySetInnerHTML={{ __html: inline(cells[0] ?? '') }} />
          <span className="text-[#C8D0D6]" dangerouslySetInnerHTML={{ __html: inline(cells[1] ?? '') }} />
        </div>,
      );
      return;
    }
    if (line.startsWith('- ')) {
      listBuf.push(line.slice(2));
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      flushList();
      nodes.push(
        <div
          key={idx}
          className="my-0.5 text-[12px] leading-relaxed text-[#C8D0D6]"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />,
      );
      return;
    }
    flushList();
    if (!line.trim()) {
      nodes.push(<div key={idx} className="h-1.5" />);
      return;
    }
    if (line.startsWith('_') && line.endsWith('_')) {
      nodes.push(
        <p key={idx} className="text-[12px] italic text-[#7A848C]">
          {line.slice(1, -1)}
        </p>,
      );
      return;
    }
    nodes.push(
      <p
        key={idx}
        className="text-[12px] leading-relaxed text-[#C8D0D6]"
        dangerouslySetInnerHTML={{ __html: inline(line) }}
      />,
    );
  });
  flushList();
  return nodes;
}

/**
 * Docked Operations Copilot — does NOT overlay the board.
 * When open, parent layout reserves `copilotWidth` so content reflows.
 * Collapsed: compact FAB only (no tip bubble covering the board).
 */
export default function OpsCopilot() {
  const {
    activeNav,
    setActiveNav,
    openAssetDetail,
    openModal,
    pushToast,
    selectedAssetId,
    mine,
    shift,
    settings,
    alertCount,
    copilotOpen: open,
    setCopilotOpen: setOpen,
    toggleCopilot,
    copilotWidth: width,
    setCopilotWidth: setWidth,
    t,
    locale,
  } = useOps();

  const tips = locale === 'id' ? PROACTIVE_TIPS_ID : PROACTIVE_TIPS;
  const prompts = locale === 'id' ? SUGGESTED_PROMPTS_ID : SUGGESTED_PROMPTS;

  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Welcome message follows language setting
  useEffect(() => {
    setMessages([
      {
        id: uid(),
        role: 'assistant',
        content: [
          `### ${t('copilot.online')}`,
          '',
          `Site **${mine.name}** · **${shift.code}** · docked panel.`,
          '',
          t('copilot.welcomeBody'),
          '',
          t('copilot.shortcut'),
        ].join('\n'),
        suggestions: locale === 'id' ? SUGGESTED_PROMPTS_ID : SUGGESTED_PROMPTS,
        actions: [
          {
            id: 'a1',
            label: locale === 'id' ? 'Alert aktif' : 'Active alerts',
            kind: 'nav',
            nav: 'alerts',
          },
          {
            id: 'a2',
            label: locale === 'id' ? 'Truk idle' : 'Idle trucks',
            kind: 'nav',
            nav: 'live-ops',
          },
          {
            id: 'a3',
            label: locale === 'id' ? 'Laporan shift' : 'Shift report',
            kind: 'modal',
            modal: 'shift-report',
          },
        ],
        ts: Date.now(),
      },
    ]);
    // only when language changes or site labels change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, mine.name, shift.code]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyTimerRef = useRef<number | null>(null);

  const panelW = expanded ? Math.min(MAX_W + 40, 440) : width;

  // Keep layout width in sync when expanded/compact changes
  useEffect(() => {
    if (open) setWidth(panelW);
  }, [open, panelW, setWidth]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        toggleCopilot();
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen, toggleCopilot]);

  useEffect(() => {
    if (!open) return;
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Rotate tip index without covering UI (shown only inside panel header strip)
  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIdx((i) => (i + 1) % tips.length);
    }, 45000);
    return () => window.clearInterval(id);
  }, [tips.length]);

  useEffect(() => {
    return () => {
      if (busyTimerRef.current) window.clearTimeout(busyTimerRef.current);
    };
  }, []);

  const ctx = useMemo(
    () => ({
      activeNav,
      selectedAssetId,
      mineName: mine.name,
      shiftCode: shift.code,
      opsLead: settings.opsLead,
      alertCount,
      locale,
    }),
    [activeNav, selectedAssetId, mine.name, shift.code, settings.opsLead, alertCount, locale],
  );

  const runAction = useCallback(
    (action: CopilotAction) => {
      if (action.kind === 'nav' && action.nav) {
        setActiveNav(action.nav);
        pushToast({ tone: 'info', title: 'Copilot navigation', message: `Opened ${action.label}` });
        return;
      }
      if (action.kind === 'detail' && action.assetId) {
        openAssetDetail(action.assetId);
        pushToast({ tone: 'success', title: 'Unit opened', message: action.label });
        return;
      }
      if (action.kind === 'modal') {
        if (action.modal === 'shift-report') openModal({ type: 'shift-report' });
        if (action.modal === 'assign') openModal({ type: 'assign', unit: action.unit });
        if (action.modal === 'service')
          openModal({
            type: 'service',
            unit: action.unit ?? 'HT-04',
            driver: action.driver ?? 'Operator',
          });
      }
    },
    [setActiveNav, openAssetDetail, openModal, pushToast],
  );

  const respond = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, ts: Date.now() };
      setMessages((m) => [...m, userMsg]);
      setBusy(true);
      if (busyTimerRef.current) window.clearTimeout(busyTimerRef.current);
      busyTimerRef.current = window.setTimeout(() => {
        const reply: CopilotReply = runCopilot(text, ctx);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            content: reply.markdown,
            actions: reply.actions,
            suggestions: reply.suggestions,
            ts: Date.now(),
          },
        ]);
        setBusy(false);
        busyTimerRef.current = null;
      }, 220);
    },
    [ctx],
  );

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    respond(text);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const next = Math.min(MAX_W, Math.max(MIN_W, dragRef.current.startW + delta));
      setWidth(next);
      setExpanded(false);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Collapsed: compact FAB only — no tip bubble covering the board
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-[#1ADBDE]/35 bg-[#12171C] text-[#1ADBDE] shadow-lg transition hover:border-[#1ADBDE] hover:bg-[#152024] hover:shadow-[0_0_16px_#1ADBDE33]"
        title="Operations Copilot (Ctrl+Space)"
        aria-label="Open Operations Copilot"
      >
        <Sparkles className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </button>
    );
  }

  // Open: in-flow docked panel (parent reserves width) — zero overlay on board
  return (
    <aside
      className="flex h-full shrink-0 border-l border-[#2A3036] bg-[#0F1419]"
      style={{ width: panelW }}
      aria-label="Operations Copilot panel"
    >
      <button
        type="button"
        onMouseDown={onResizeStart}
        className="flex w-2.5 shrink-0 cursor-col-resize items-center justify-center border-r border-[#1E242A] bg-[#12171C] text-[#4A545C] hover:text-[#1ADBDE]"
        title="Drag to resize"
        aria-label="Resize copilot panel"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#2A3036] px-2.5 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#1ADBDE]/20 to-[#3AC7A3]/10 ring-1 ring-[#1ADBDE]/30">
            <Bot className="h-3.5 w-3.5 text-[#1ADBDE]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold text-[#E8ECEF]">{t('copilot.title')}</div>
            <div className="truncate text-[9px] text-[#6A737C]">
              {activeNav} · {mine.code}
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1 text-[#6A737C] hover:bg-[#1A2026] hover:text-[#C8D0D6]"
            title={showHistory ? 'Hide history' : 'Show history'}
            onClick={() => setShowHistory((s) => !s)}
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-[#6A737C] hover:bg-[#1A2026] hover:text-[#C8D0D6]"
            title={expanded ? 'Compact' : 'Wider'}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="rounded p-1 text-[#6A737C] hover:bg-[#1A2026] hover:text-[#C8D0D6]"
            onClick={() => setOpen(false)}
            title="Close copilot"
            aria-label="Close copilot"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tip lives inside panel — never floats over the board */}
        <div className="shrink-0 border-b border-[#1E242A] bg-[#12171C] px-2.5 py-1.5">
          <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold tracking-[0.1em] text-[#5A636C]">
            <Lightbulb className="h-3 w-3 text-[#F6A214]" />
            TIP
          </div>
          <button
            type="button"
            onClick={() => respond(tips[tipIdx])}
            className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-2 py-1.5 text-left text-[10px] leading-snug text-[#A8B0B7] hover:border-[#F6A214]/40 hover:text-[#E8ECEF]"
          >
            {tips[tipIdx]}
          </button>
        </div>

        <div ref={scrollerRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 py-2.5">
          {showHistory &&
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[96%] rounded-lg px-2.5 py-1.5 ${
                    m.role === 'user'
                      ? 'bg-[#1A3A3C] text-[12px] text-[#E8ECEF] ring-1 ring-[#1ADBDE]/25'
                      : 'bg-[#151A1F] ring-1 ring-[#2A3036]'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="leading-relaxed">{m.content}</p>
                  ) : (
                    <div className="space-y-0.5">{renderMarkdown(m.content)}</div>
                  )}

                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#1E242A] pt-2">
                      {m.actions.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => runAction(a)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#1ADBDE]/12 px-2 py-1 text-[10px] font-semibold text-[#1ADBDE] ring-1 ring-[#1ADBDE]/25 transition hover:bg-[#1ADBDE]/22"
                        >
                          {a.label}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => respond(s)}
                          className="rounded-full bg-[#0D1116] px-2 py-0.5 text-[10px] text-[#8A949C] ring-1 ring-[#2A3036] hover:text-[#C8D0D6]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {busy && (
            <div className="flex items-center gap-2 text-[11px] text-[#6A737C]">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1ADBDE]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1ADBDE] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1ADBDE] [animation-delay:300ms]" />
              </span>
              Analyzing…
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="shrink-0 border-t border-[#2A3036] bg-[#12171C] p-2">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {prompts.slice(0, 3).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => respond(s)}
                className="rounded-md px-1.5 py-0.5 text-[9px] text-[#6A737C] hover:bg-[#1A2026] hover:text-[#A8B0B7]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-1.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              rows={2}
              placeholder={t('copilot.placeholder')}
              className="min-h-[40px] flex-1 resize-none rounded-md border border-[#2A3036] bg-[#0D1116] px-2 py-1.5 text-[12px] text-[#E8ECEF] outline-none placeholder:text-[#4A545C] focus:border-[#1ADBDE]/50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1ADBDE] text-[#0D1116] transition hover:bg-[#4AE5E8] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
