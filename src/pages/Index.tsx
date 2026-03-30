import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Eye,
  MousePointer2,
  Terminal,
  Layout,
  Search,
  Play,
  Settings,
  AlertCircle,
  Activity,
  CheckCircle2,
  Loader2,
  ChevronRight,
  UserCircle,
  Briefcase,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { AGENT_PROFILE } from '@/lib/permanentAgentReference';

// --- Types ---
interface LogEntry {
  id: string;
  agent: 'strategist' | 'executor' | 'system';
  message: string;
  timestamp: string;
}

interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
  hovering: boolean;
}

interface GridTarget {
  target: string;
  grid_id: string;
  action: string;
}

// --- Constants ---
const GRID_COLS = 10;
const GRID_ROWS = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// --- Subcomponents ---

function ProfileItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
      <div className="mt-0.5 text-blue-400">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
        <p className="text-sm text-gray-200">{value}</p>
      </div>
    </div>
  );
}

function Cursor({ color, state, label }: { id: string; color: string; state: CursorState; label: string }) {
  if (!state.visible) return null;

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      animate={{ x: state.x, y: state.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Cursor Orb */}
      <div className={cn('w-4 h-4 rounded-full border-2 shadow-lg', color === 'blue' ? 'bg-blue-500 border-blue-300' : 'bg-red-500 border-red-300')} />

      {/* Label */}
      <div className={cn('mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest whitespace-nowrap', color === 'blue' ? 'bg-blue-500/80 text-white' : 'bg-red-500/80 text-white')}>
        {label}
      </div>

      {/* Click Ripple */}
      <AnimatePresence>
        {state.clicking && (
          <motion.div
            className={cn('absolute -top-3 -left-3 w-10 h-10 rounded-full border-2', color === 'blue' ? 'border-blue-400' : 'border-red-400')}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Hover Pulse */}
      <AnimatePresence>
        {state.hovering && !state.clicking && (
          <motion.div
            className={cn('absolute -top-1 -left-1 w-6 h-6 rounded-full', color === 'blue' ? 'bg-blue-400/30' : 'bg-red-400/30')}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Main App ---

export default function Index() {
  // State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [blueCursor, setBlueCursor] = useState<CursorState>({ x: 100, y: 100, visible: true, clicking: false, hovering: false });
  const [redCursor, setRedCursor] = useState<CursorState>({ x: 200, y: 200, visible: true, clicking: false, hovering: false });
  const [showGrid, setShowGrid] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentTask, setCurrentTask] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [userMistralKey, setUserMistralKey] = useState('');
  const [activeTab, setActiveTab] = useState<'logs' | 'profile'>('logs');

  const browserRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to add logs
  const addLog = useCallback((agent: LogEntry['agent'], message: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        agent,
        message,
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Init logs
  useEffect(() => {
    const hasKey = !!userMistralKey;
    setApiKeySet(hasKey);
    if (logs.length === 0) {
      addLog('system', 'Nexus Dual-Agent OS Initialized.');
      if (!hasKey) {
        addLog('system', 'WARNING: Mistral API Key not found. Please provide one in the Profile tab for full functionality.');
      } else {
        addLog('system', 'Mistral API Connected. Agents ready.');
      }
      addLog('system', `Active Profile: ${AGENT_PROFILE.name} ${AGENT_PROFILE.surname}`);
    }
  }, [addLog, userMistralKey, logs.length]);

  // --- Logic Functions ---

  const getGridCoordinates = (gridId: string) => {
    if (!browserRef.current) return { x: 0, y: 0 };
    const rect = browserRef.current.getBoundingClientRect();
    const col = COL_LABELS.indexOf(gridId[0].toUpperCase());
    const row = parseInt(gridId.substring(1)) - 1;

    if (col === -1 || isNaN(row)) return { x: 0, y: 0 };

    const cellW = rect.width / GRID_COLS;
    const cellH = rect.height / GRID_ROWS;

    return {
      x: (col * cellW) + (cellW / 2),
      y: (row * cellH) + (cellH / 2)
    };
  };

  const moveCursor = async (agent: 'blue' | 'red', gridId: string, click = false) => {
    const coords = getGridCoordinates(gridId);
    const setter = agent === 'blue' ? setBlueCursor : setRedCursor;

    setter(prev => ({ ...prev, x: coords.x, y: coords.y }));
    await new Promise(r => setTimeout(r, 600));

    if (click) {
      setter(prev => ({ ...prev, hovering: true }));
      await new Promise(r => setTimeout(r, 400));
      setter(prev => ({ ...prev, clicking: true }));
      addLog(agent === 'blue' ? 'strategist' : 'executor', `Clicking at ${gridId}`);
      await new Promise(r => setTimeout(r, 200));
      setter(prev => ({ ...prev, clicking: false, hovering: false }));
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const handleRunTask = async () => {
    if (!currentTask) return;
    setIsThinking(true);
    addLog('strategist', `Analyzing task: ${currentTask}`);

    try {
      // Simulated Mode (no backend in Lovable)
      await new Promise(r => setTimeout(r, 1500));
      addLog('strategist', `SIMULATED: Referencing profile for ${AGENT_PROFILE.name}...`);
      addLog('strategist', 'SIMULATED: Analyzing DOM... Found canvas element. Triggering Executor.');
      setShowGrid(true);
      await new Promise(r => setTimeout(r, 1000));
      addLog('executor', 'SIMULATED: Scanning visual grid... Target acquired at D4.');
      await moveCursor('red', 'D4', true);
      await new Promise(r => setTimeout(r, 800));
      addLog('strategist', 'SIMULATED: Task complete. Survey advanced using profile data.');
    } catch (error) {
      addLog('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsThinking(false);
      setShowGrid(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-mono overflow-hidden">
      {/* --- Main View (Simulated Browser) --- */}
      <div className="flex-1 flex flex-col relative">
        {/* Browser Header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-400">
            <Search className="w-3 h-3" />
            https://survey-nexus.io/active-survey
          </div>
        </div>

        {/* Browser Content */}
        <div ref={browserRef} className="flex-1 relative bg-gray-900 overflow-auto p-8">
          {/* Simulated Survey Content */}
          <div className="max-w-xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Survey: IT Infrastructure 2026</h1>

            <div className="space-y-3">
              <p className="text-sm text-gray-300">What is your current primary occupation and industry?</p>
              {[
                'IT Support / Computer Tech Engineer',
                'Retail / Sales',
                'Healthcare / Medical',
                'Education / Teaching'
              ].map(option => (
                <button key={option} className="block w-full text-left px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/80 text-sm text-gray-300 transition-colors">
                  {option}
                </button>
              ))}
            </div>

            <div className="space-y-3 mt-6">
              <p className="text-sm text-yellow-400 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Attention Check: Please select 'CompTIA Security' below.
              </p>
              {['CCNA', 'CompTIA Security', 'AWS Cloud', 'CISSP'].map(cert => (
                <button key={cert} className="block w-full text-left px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500/50 text-sm text-gray-300 transition-colors">
                  {cert}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8">
              <button className="px-6 py-2 rounded-lg bg-gray-700 text-gray-400 text-sm hover:bg-gray-600 transition-colors">Back</button>
              {/* The "Surveyor Arrow" (Target for Vision) */}
              <button className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-blue-500 transition-colors">
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* --- Visual Grid Overlay --- */}
          {showGrid && (
            <div className="absolute inset-0 z-40 pointer-events-none">
              <div className="w-full h-full grid grid-cols-10 grid-rows-[repeat(10,1fr)]">
                {Array.from({ length: 100 }).map((_, i) => {
                  const col = i % 10;
                  const row = Math.floor(i / 10);
                  const id = `${COL_LABELS[col]}${row + 1}`;
                  return (
                    <div key={id} className="border border-red-500/20 flex items-center justify-center">
                      <span className="text-[8px] text-red-500/40 font-mono">{id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- Cursors --- */}
          <Cursor id="blue" color="blue" state={blueCursor} label="Strategist" />
          <Cursor id="red" color="red" state={redCursor} label="Executor" />
        </div>
      </div>

      {/* --- Side Panel (Nexus OS Interface) --- */}
      <div className="w-[420px] flex flex-col bg-gray-950 border-l border-gray-800">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold tracking-tight">Nexus OS</h2>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-green-400 font-semibold flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            Dual-Agent Active
          </span>
        </div>

        {/* Task Input */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-800">
          <input
            type="text"
            placeholder="Enter task (e.g., 'Complete survey')..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            value={currentTask}
            onChange={(e) => setCurrentTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunTask()}
          />
          <button
            onClick={handleRunTask}
            disabled={isThinking}
            className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors",
              activeTab === 'logs' ? "text-blue-500 border-b-2 border-blue-500 bg-blue-500/5" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
            Logs
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors",
              activeTab === 'profile' ? "text-blue-500 border-b-2 border-blue-500 bg-blue-500/5" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <UserCircle className="w-3.5 h-3.5 inline mr-1.5" />
            Profile
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'logs' ? (
            <>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nexus Logs</h3>
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Strat</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Exec</span>
                </div>
              </div>

              <div ref={scrollRef} className="px-4 pb-4 space-y-2 max-h-[calc(100vh-320px)] overflow-auto">
                {logs.map((log) => (
                  <div key={log.id} className={cn(
                    "p-3 rounded-lg border text-xs",
                    log.agent === 'system' ? 'bg-gray-800/50 border-gray-700/50 text-gray-400' :
                    log.agent === 'strategist' ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' :
                    'bg-red-500/5 border-red-500/20 text-red-300'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "font-bold text-[9px] uppercase tracking-widest",
                        log.agent === 'system' ? 'text-gray-500' :
                        log.agent === 'strategist' ? 'text-blue-400' : 'text-red-400'
                      )}>
                        {log.agent === 'system' ? 'SYS' : log.agent === 'strategist' ? 'STRAT' : 'EXEC'}
                      </span>
                      <span className="text-[9px] text-gray-600">{log.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{log.message}</p>
                  </div>
                ))}
              </div>

              {isThinking && (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Nexus is thinking...
                </div>
              )}
            </>
          ) : (
            <div className="p-4 space-y-4">
              <div className="text-center pb-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">{AGENT_PROFILE.name} {AGENT_PROFILE.surname}</h3>
                <p className="text-xs text-blue-400 mt-1">{AGENT_PROFILE.roles}</p>
              </div>

              <ProfileItem icon={<Briefcase className="w-4 h-4" />} label="Occupation" value={AGENT_PROFILE.occupation} />
              <ProfileItem icon={<MapPin className="w-4 h-4" />} label="Location" value={AGENT_PROFILE.location} />
              <ProfileItem icon={<ShieldCheck className="w-4 h-4" />} label="Certifications" value={AGENT_PROFILE.certifications} />

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <p className="text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Employment</p>
                  <p className="text-gray-200 mt-1">{AGENT_PROFILE.employment}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <p className="text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Income</p>
                  <p className="text-gray-200 mt-1">{AGENT_PROFILE.income}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <p className="text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Education</p>
                  <p className="text-gray-200 mt-1">{AGENT_PROFILE.education}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <p className="text-gray-500 font-semibold uppercase text-[10px] tracking-wider">Household</p>
                  <p className="text-gray-200 mt-1">{AGENT_PROFILE.household}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 space-y-3">
                <h4 className="text-sm font-bold text-white">24/7 Autonomy Status</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Current Mode</span><p className="text-green-400">Discovery & Execution</p></div>
                  <div><span className="text-gray-500">Last Action</span><p className="text-gray-300">Just now</p></div>
                  <div><span className="text-gray-500">Uptime</span><p className="text-gray-300">14h 22m</p></div>
                  <div><span className="text-gray-500">Surveys Completed</span><p className="text-gray-300">12</p></div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Task Instructions</h4>
                <p className="text-[11px] text-gray-400 italic leading-relaxed">
                  "Keep answers consistent across demographic and behavior questions. Detect trap/attention-check questions and follow explicit instructions."
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mistral API Configuration</h4>
                <p className="text-[11px] text-gray-500">Enter your API key to enable live agent interactions.</p>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  value={userMistralKey}
                  onChange={(e) => setUserMistralKey(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Status */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Mistral API: {apiKeySet ? 'Connected' : 'Simulated'}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-blue-400" />
            Vision: Ready
          </span>
          <span>v1.0.4</span>
        </div>
      </div>
    </div>
  );
}
