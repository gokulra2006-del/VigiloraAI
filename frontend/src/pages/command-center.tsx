import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Terminal, ShieldAlert, Activity, CheckCircle2, XCircle, Play, Globe } from 'lucide-react';
import { 
  parseVoiceCommand, executeVoiceCommand, fetchCommandStatus, 
  fetchCommandHistory, startDemoSequence, 
  ParsedCommand, CommandAudit 
} from '@/services/api/commands';

export function CommandCenterPage() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [supportSpeech, setSupportSpeech] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  
  const [status, setStatus] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<CommandAudit[]>([]);
  
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [novaResponse, setNovaResponse] = useState<string | null>(null);
  
  const [demoActive, setDemoActive] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const currentTranscript = event.results[current][0].transcript;
          setTranscript(currentTranscript);
        };
        
        recognition.onend = () => {
          setIsListening(false);
          // If we have a transcript and not in demo mode, parse it
          if (recognitionRef.current?.finalTranscript && !demoActive) {
            handleParse(recognitionRef.current.finalTranscript);
          }
        };
        
        recognition.onerror = (e: any) => {
          console.error("Speech recognition error", e);
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      } else {
        setSupportSpeech(false);
      }
    }
    
    // Load initial data
    fetchCommandStatus().then(setStatus).catch(console.error);
    fetchCommandHistory().then(setHistory).catch(console.error);
  }, []);
  
  // Track final transcript separately to avoid stale closures in onend
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.finalTranscript = transcript;
    }
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setParsedCommand(null);
      setNovaResponse(null);
      recognitionRef.current?.start();
      setIsListening(true);
      addTerminalLine("> Voice input started. Listening...");
    }
  };

  const addTerminalLine = (line: string) => {
    setTerminalLines(prev => [...prev, line]);
  };

  const handleParse = async (text: string) => {
    if (!text.trim()) return;
    addTerminalLine(`> Transcript captured: "${text}"`);
    addTerminalLine("> Parsing intent via NLP engine...");
    try {
      const parsed = await parseVoiceCommand(text);
      setParsedCommand(parsed);
      addTerminalLine(`> Intent detected: ${parsed.intent}`);
      addTerminalLine(`> Confidence: ${(parsed.confidence * 100).toFixed(0)}% | Risk Level: ${parsed.risk_level}`);
      
      if (parsed.intent === 'UNKNOWN') {
        setNovaResponse("I couldn't determine the requested security action. Please try again.");
      } else if (!parsed.confirmation_required) {
        // Auto execute safe commands
        await execute(parsed);
      }
    } catch (e) {
      addTerminalLine("> Error parsing command.");
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleParse(textInput);
    setTextInput('');
  };

  const execute = async (cmd: ParsedCommand) => {
    addTerminalLine("> Authorization verified.");
    if (cmd.confirmation_required) addTerminalLine("> Confirmation received.");
    
    // Handle Navigation Commands directly
    if (cmd.intent === "NAVIGATE" && cmd.target) {
      addTerminalLine("> Executing navigation.");
      setNovaResponse(`Opening ${cmd.target.replace('/', '')}...`);
      setTimeout(() => navigate(cmd.target!), 1500);
      return;
    }
    
    addTerminalLine("> Simulation started.");
    
    try {
      const result = await executeVoiceCommand(cmd);
      result.action_log.forEach(l => addTerminalLine(`> ${l}`));
      setNovaResponse(result.message);
      addTerminalLine(`> Execution complete: ${result.status}`);
      // Refresh history
      fetchCommandHistory().then(setHistory).catch(console.error);
    } catch (e) {
      addTerminalLine("> Execution failed.");
      setNovaResponse("Failed to execute the command due to a system error.");
    }
  };

  const runDemoSequence = async () => {
    setDemoActive(true);
    setTranscript('');
    setParsedCommand(null);
    setNovaResponse(null);
    setTerminalLines([]);
    
    addTerminalLine("> STARTING GOD MODE DEMO SEQUENCE");
    addTerminalLine("> VOICE CHANNEL READY");
    
    try {
      const { sequence } = await startDemoSequence();
      
      for (const step of sequence) {
        await new Promise(r => setTimeout(r, step.delay));
        
        if (step.type === "VOICE") {
          setTranscript(step.text);
          addTerminalLine(`> Transcript: "${step.text}"`);
        } else if (step.type === "RESPONSE") {
          const mockParsed: ParsedCommand = {
            transcript: transcript, intent: step.intent, confidence: 0.95, 
            risk_level: "LOW", simulation: true, confirmation_required: false
          };
          setParsedCommand(mockParsed);
          await execute(mockParsed);
        } else if (step.type === "CONFIRMATION") {
          addTerminalLine("> Awaiting confirmation for destructive action...");
          await new Promise(r => setTimeout(r, 1500));
        } else if (step.type === "EXECUTE") {
          await execute(parsedCommand || {
            transcript: "Nova, run the ransomware response simulation.", 
            intent: "RUN_PLAYBOOK", confidence: 0.98, risk_level: "HIGH", 
            simulation: true, confirmation_required: true, target: "RANSOMWARE-CONTAINMENT"
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    setDemoActive(false);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="text-purple-500" /> VIGILORA COMMAND CENTER
          </h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">Voice-driven security orchestration and intelligence.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 h-8 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md text-[12px] font-mono tracking-widest">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> VOICE SYSTEM ONLINE
          </div>
          <button
            onClick={runDemoSequence}
            disabled={demoActive}
            className="flex items-center gap-2 px-4 h-8 bg-white text-black hover:bg-zinc-200 rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" /> START GOD MODE DEMO
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Column: Voice Control & Nova */}
        <div className="w-1/3 flex flex-col gap-4">
          <Card className="bg-zinc-900 border-white/5 p-6 flex flex-col items-center justify-center flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
            
            <div className="text-[11px] font-bold text-white tracking-widest uppercase mb-8 opacity-50">VOICE CONTROL</div>
            
            <button 
              onClick={toggleListening}
              disabled={!supportSpeech || demoActive}
              className={`relative group w-32 h-32 rounded-full flex items-center justify-center border transition-all ${
                isListening 
                  ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]' 
                  : 'bg-zinc-800 border-white/10 hover:border-white/30'
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full border border-purple-500 animate-ping opacity-50"></span>
              )}
              {isListening ? <Mic size={48} className="text-purple-400" /> : <MicOff size={48} className="text-muted-foreground group-hover:text-white" />}
            </button>
            
            <div className="mt-8 text-center h-16 flex flex-col justify-end">
              {!supportSpeech ? (
                <div className="text-red-400 text-sm">Voice recognition is not supported in this browser.</div>
              ) : (
                <>
                  <div className={`text-xs font-mono font-bold tracking-widest mb-2 ${isListening ? 'text-purple-400' : 'text-muted-foreground'}`}>
                    {isListening ? 'LISTENING' : 'IDLE'}
                  </div>
                  {isListening && (
                    <div className="flex items-end justify-center gap-1 h-6">
                      {[...Array(10)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [8, Math.random() * 24 + 8, 8] }}
                          transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5 }}
                          className="w-1.5 bg-purple-500 rounded-t-sm"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="mt-8 w-full">
              <div className="text-[10px] text-muted-foreground font-mono mb-2">TRANSCRIPT:</div>
              <div className="min-h-[60px] bg-black/40 border border-white/5 rounded-lg p-3 text-sm text-white italic border-l-4 border-l-purple-500 flex items-center">
                {transcript ? `"${transcript}"` : <span className="text-muted-foreground">Awaiting input...</span>}
              </div>
            </div>
            
            {!supportSpeech && (
              <form onSubmit={handleTextSubmit} className="mt-4 w-full flex gap-2">
                <input 
                  type="text" 
                  value={textInput} 
                  onChange={e => setTextInput(e.target.value)} 
                  placeholder="Type command here..." 
                  className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                />
                <button type="submit" className="px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-sm font-bold">SEND</button>
              </form>
            )}
          </Card>

          <Card className="bg-zinc-900 border-white/5 flex-1 p-6 flex flex-col relative overflow-hidden">
            <div className="text-[11px] font-bold text-white tracking-widest uppercase mb-4 flex items-center gap-2">
              <Activity size={14} className="text-blue-400" /> NOVA RESPONSE
            </div>
            <div className="flex-1 bg-black/40 border border-white/5 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-y-auto">
              {novaResponse ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-blue-300">
                  <span className="text-white font-bold">NOVA: </span> {novaResponse}
                </motion.div>
              ) : (
                <div className="text-zinc-600 flex items-center justify-center h-full">Standing by.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Status & Terminal */}
        <div className="w-2/3 flex flex-col gap-4">
          <div className="flex gap-4 h-32 shrink-0">
            {/* Interpretation Panel */}
            <Card className="bg-zinc-900 border-white/5 flex-1 p-4 flex flex-col justify-between">
              <div className="text-[11px] font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" /> NOVA INTERPRETATION
              </div>
              {parsedCommand ? (
                <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
                  <div><span className="text-muted-foreground">Intent:</span> <span className="text-white font-bold">{parsedCommand.intent}</span></div>
                  <div><span className="text-muted-foreground">Mode:</span> <span className="text-amber-400">SIMULATION</span></div>
                  <div><span className="text-muted-foreground">Target:</span> <span className="text-white">{parsedCommand.target || '--'}</span></div>
                  <div><span className="text-muted-foreground">Confidence:</span> <span className="text-white">{(parsedCommand.confidence * 100).toFixed(0)}%</span></div>
                </div>
              ) : (
                <div className="text-zinc-600 text-sm italic">Waiting for command...</div>
              )}
            </Card>

            {/* System Status */}
            <Card className="bg-zinc-900 border-white/5 w-64 p-4 flex flex-col">
              <div className="text-[11px] font-bold text-white tracking-widest uppercase mb-3">SYSTEM STATUS</div>
              <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {Object.entries(status).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">{key.replace('_', ' ')}</span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {val}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Action Confirmation Panel */}
          <AnimatePresence>
            {parsedCommand?.confirmation_required && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="text-red-400 font-bold text-sm flex items-center gap-2"><ShieldAlert size={16} /> SECURITY ACTION REQUIRES CONFIRMATION</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">Execute {parsedCommand.intent} in SIMULATION mode?</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => execute(parsedCommand)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold">CONFIRM</button>
                    <button onClick={() => { setParsedCommand(null); addTerminalLine("> Command cancelled."); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs">CANCEL</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Terminal */}
          <Card className="bg-black border-white/10 flex-1 p-0 flex flex-col overflow-hidden relative">
            <div className="bg-zinc-900 border-b border-white/10 p-2 flex items-center gap-2">
              <div className="flex gap-1.5 ml-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <div className="text-[11px] font-mono text-zinc-500 font-bold ml-4">VIGILORA COMMAND TERMINAL</div>
            </div>
            <div className="flex-1 p-4 font-mono text-[12px] text-green-400 overflow-y-auto space-y-1.5 leading-relaxed">
              {terminalLines.map((line, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>
                  {line}
                </motion.div>
              ))}
              {/* Fake cursor */}
              <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-3.5 bg-green-400 ml-1 translate-y-[2px]" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
