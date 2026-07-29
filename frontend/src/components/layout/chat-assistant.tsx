import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, X, Send, Loader2, ChevronDown,
  AlertTriangle, Camera, ShieldAlert, RotateCcw, Bot,
  Minimize2, Mic, MicOff,
} from 'lucide-react';
import { getAuthHeaders } from '@/services/api/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  data?: Record<string, unknown> | null;
  timestamp: Date;
  isStreaming?: boolean;
}

// ─── Markdown renderer (lightweight, no extra deps) ──────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-xs font-mono text-emerald-300">$1</code>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul class="space-y-0.5 my-1">$1</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

// ─── Suggestion chips ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'System status', icon: <ShieldAlert size={12} />, msg: "What's the current system status?" },
  { label: 'Open incidents', icon: <AlertTriangle size={12} />, msg: 'Show me all open incidents' },
  { label: 'Camera health', icon: <Camera size={12} />, msg: 'Are any cameras offline?' },
  { label: 'Active threats', icon: <BrainCircuit size={12} />, msg: 'What threats are currently active?' },
];

// ─── Individual message bubble ────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[10px] text-zinc-600 px-3 py-1 bg-zinc-900/60 rounded-full border border-white/5">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
          <Bot size={13} className="text-white" />
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
            isUser
              ? 'bg-white text-black rounded-tr-sm font-medium'
              : 'bg-zinc-800/80 text-zinc-100 rounded-tl-sm border border-white/5'
          } ${msg.isStreaming ? 'animate-pulse' : ''}`}
        >
          {isUser ? (
            <span>{msg.content}</span>
          ) : (
            <div
              className="prose-sm"
              dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(msg.content)}</p>` }}
            />
          )}
          {msg.isStreaming && (
            <span className="inline-block ml-1 w-1 h-3.5 bg-blue-400 rounded-sm animate-pulse" />
          )}
        </div>
        <span className="text-[10px] text-zinc-600 px-1">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex gap-2.5"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
        <Bot size={13} className="text-white" />
      </div>
      <div className="bg-zinc-800/80 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map(delay => (
          <motion.span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-zinc-400"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Chat Assistant ──────────────────────────────────────────────────────

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your **Sentinel-AI Assistant**. I have live access to your platform data — incidents, cameras, threats, and more.\n\nHow can I help you today?",
  timestamp: new Date(),
};

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const history = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, open, scrollToBottom]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const isListeningRef = useRef(false);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in your browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };
    
    let finalTranscript = '';
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = (finalTranscript + ' ' + interimTranscript).toLowerCase();
      
      // Wake word detection
      if (currentText.includes('og ') || currentText.endsWith('og') || currentText.includes('o.g.')) {
        setOpen(true);
        setMinimized(false);
        const commandMatch = currentText.split(/(?:og|o\.g\.)\s*/i);
        const command = commandMatch.length > 1 ? commandMatch[1].trim() : '';
        
        if (command.length > 5) {
          // A command was spoken after the wake word!
          setInput(command);
          
          // Pause listening temporarily to avoid hearing itself speak
          recognition.stop();
          finalTranscript = '';
          
          sendMessage(command, true); // true = voice triggered
        } else {
          setInput('OG is listening...');
          
          if ('speechSynthesis' in window && !window.speechSynthesis.speaking) {
            const utterance = new SpeechSynthesisUtterance("I'm listening. What do you need?");
            utterance.lang = 'en-US';
            utterance.rate = 1.05;
            
            // Pause listening while it speaks, resume after
            recognition.stop();
            isListeningRef.current = false;
            finalTranscript = '';
            
            utterance.onend = () => {
              isListeningRef.current = true;
              if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch(e) {}
              }
            };
            window.speechSynthesis.speak(utterance);
          } else {
            // fallback if no TTS
            finalTranscript = '';
          }
        }
      } else {
         setInput(currentText);
      }
    };
    
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        isListeningRef.current = false;
      }
    };
    
    recognition.onend = () => {
      if (isListeningRef.current) {
        // Automatically restart if it was stopped but we still want to listen
        setTimeout(() => {
            try { recognition.start(); } catch(e) {}
        }, 100);
      }
    };
    
    recognition.start();
  };

  const sendMessage = useCallback(async (text: string, wasVoiceTriggered: boolean = false) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    if (wasVoiceTriggered) {
      isListeningRef.current = false; // suspend mic temporarily
    }

    try {
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          message: trimmed,
          history: history.slice(-10),
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        data: data.data,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (!open) setUnreadCount(prev => prev + 1);

      // Text-To-Speech (Siri/ChatGPT voice mode)
      if (wasVoiceTriggered && 'speechSynthesis' in window) {
        const cleanText = data.reply.replace(/[*#]/g, ''); // strip markdown
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 1.05;
        
        utterance.onend = () => {
          // Resume listening after OG finishes speaking
          isListeningRef.current = true;
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch(e) {}
          }
        };
        
        window.speechSynthesis.speak(utterance);
      } else if (wasVoiceTriggered) {
        // Resume immediately if no TTS
        isListeningRef.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch(e) {}
        }
      }

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I could not connect to the backend. Make sure the server is running.',
          timestamp: new Date(),
        },
      ]);
      if (wasVoiceTriggered) {
        isListeningRef.current = true;
        try { recognitionRef.current.start(); } catch(e) {}
      }
    } finally {
      setLoading(false);
    }
  }, [loading, history, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };

  return (
    <>
      {/* ── FAB Button ──────────────────────────────────────── */}
      <motion.button
        onClick={() => { setOpen(true); setMinimized(false); }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-900/40 transition-all ${
          open ? 'pointer-events-none opacity-0 scale-75' : 'opacity-100 scale-100'
        }`}
        style={{ transitionDuration: '200ms' }}
      >
        <BrainCircuit size={24} className="text-white" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {unreadCount}
            </motion.span>
          )}
          {isListening && unreadCount === 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            >
              <Mic size={10} className="text-white animate-pulse" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 flex flex-col"
            style={{
              height: minimized ? 'auto' : '560px',
              background: 'linear-gradient(180deg, #0f0f12 0%, #09090b 100%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">OG Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <p className="text-[11px] text-zinc-500">Live platform data</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  title="Reset conversation"
                  className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setMinimized(v => !v)}
                  title={minimized ? 'Expand' : 'Minimize'}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {minimized ? <ChevronDown size={14} /> : <Minimize2 size={14} />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  title="Close"
                  className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
                    {messages.map(msg => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    <AnimatePresence>
                      {loading && <TypingIndicator />}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestion chips — only show if first message */}
                  {messages.length === 1 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s.label}
                          onClick={() => sendMessage(s.msg)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-white/5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-700/60 hover:border-white/10 transition-all"
                        >
                          <span className="text-zinc-500">{s.icon}</span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 flex-shrink-0">
                    <div className="flex items-end gap-2 bg-zinc-800/60 border border-white/8 rounded-xl px-3 py-2 focus-within:border-white/20 transition-colors">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about incidents, cameras, threats…"
                        rows={1}
                        className="flex-1 bg-transparent text-[13px] text-white placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed max-h-24 overflow-y-auto custom-scrollbar"
                        style={{ minHeight: '20px' }}
                      />
                      <button
                        onClick={toggleListening}
                        className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isListening ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                        title="Voice Input"
                      >
                        {isListening ? <Mic size={13} className="animate-pulse" /> : <MicOff size={13} />}
                      </button>
                      <button
                        onClick={() => sendMessage(input)}
                        disabled={loading || !input.trim()}
                        className="flex-shrink-0 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {loading
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Send size={13} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
                      Press <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
