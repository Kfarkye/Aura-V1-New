import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Constants ---
interface LandingPageProps {
  onNavigateToApp?: () => void;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
}

const CHAT_DELAY_MS = 800;
const MAX_INTERACTIONS = 3;

const DEMO_SCRIPT = [
  'Processing request. Target workspace defined.',
  'Data compiled. Preparing draft review.',
  'Workflow executed. Launching AURA.',
];

const bubbleVariants: any = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

// --- Child Components ---

const Navbar = memo(({ scrolled, onLaunch }: { scrolled: boolean; onLaunch: () => void }) => (
  <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${scrolled ? 'bg-[var(--aura-bg)]/80 backdrop-blur-md border-b border-[var(--aura-border)]' : 'bg-transparent'}`}>
    <div className="max-w-7xl mx-auto px-8 h-[80px] flex items-center justify-between">
      <div className="flex items-center">
        <span className="font-display font-medium tracking-widest text-[12px] uppercase text-[var(--aura-heading)]">A U R A</span>
      </div>
      <button onClick={onLaunch} className="bg-transparent border border-[var(--aura-heading)] text-[var(--aura-heading)] px-6 py-2 text-[10px] uppercase tracking-widest font-medium hover:bg-[var(--aura-heading)] hover:text-[var(--aura-bg)] transition-all duration-500 rounded-none">
        Launch
      </button>
    </div>
  </nav>
));
Navbar.displayName = 'Navbar';

const HeroSection = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    className="lg:col-span-6 pt-20 lg:pt-0"
  >
    <div className="mb-8">
      <span className="text-[10px] uppercase tracking-widest font-medium text-[var(--aura-text-muted)]">System Architecture</span>
    </div>
    <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] leading-[1.05] font-light tracking-tight mb-8 text-balance text-[var(--aura-heading)]">
      The precision interface for your data.
    </h1>
    <p className="text-lg text-[var(--aura-text-muted)] mb-12 max-w-lg leading-relaxed font-light tracking-wide">
      AURA connects your fragmented ecosystems into a singular, cohesive computational layer. Refined, transparent, and absolutely minimal.
    </p>
  </motion.div>
));
HeroSection.displayName = 'HeroSection';

const ChatMessage = memo(({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user';
  
  if (msg.content === 'q3_graphic') {
    return (
      <motion.div variants={bubbleVariants} initial="hidden" animate="show" className="w-full flex flex-col mt-4">
        <div className="border border-[var(--aura-border)] bg-transparent p-6 w-full flex flex-col gap-4">
          <div className="text-[10px] uppercase tracking-widest font-medium text-[var(--aura-text-muted)]">Document Generated</div>
          <div className="font-light text-[18px] text-[var(--aura-heading)] tracking-wide">Q3 Product Roadmap</div>
          <p className="text-[var(--aura-text-muted)] leading-relaxed text-[13px] font-light">
            Focus areas: unified integrations, mobile precision, and performance architecture.
          </p>
          <div className="h-[1px] w-full bg-[var(--aura-border)] my-2" />
          <button className="text-[10px] uppercase tracking-widest font-medium text-[var(--aura-heading)] hover:text-[var(--aura-text-muted)] transition-colors self-start">
            Review Draft
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={bubbleVariants} initial="hidden" animate="show" className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`px-5 py-3 max-w-[85%] text-[13px] font-light tracking-wide leading-relaxed ${isUser ? 'border border-[var(--aura-heading)] text-[var(--aura-heading)]' : 'text-[var(--aura-text-muted)]'}`}>
        {msg.content}
      </div>
    </motion.div>
  );
});
ChatMessage.displayName = 'ChatMessage';

const TerminalMockup = memo(({ onLaunch }: { onLaunch: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', content: 'Compile the Q3 roadmap into a summary draft.' },
    { role: 'agent', content: 'q3_graphic' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [interactionCount, setInteractionCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || interactionCount >= MAX_INTERACTIONS) return;
    
    const currentInteraction = interactionCount;
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue('');
    setInteractionCount(prev => prev + 1);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', content: DEMO_SCRIPT[currentInteraction] }]);
    }, CHAT_DELAY_MS);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="lg:col-span-6 relative flex justify-center lg:justify-end"
    >
      <div className="w-full max-w-[440px] h-[640px] bg-[var(--aura-bg)] border border-[var(--aura-border)] flex flex-col">
        <div className="h-10 border-b border-[var(--aura-border)] flex items-center px-4">
          <span className="text-[9px] uppercase tracking-widest font-mono text-[var(--aura-text-muted)]">AURA.SYS.STREAM</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => <ChatMessage key={idx} msg={msg} />)}
          </AnimatePresence>
          <div ref={chatBottomRef} className="h-4" />
        </div>

        <div className="p-4 border-t border-[var(--aura-border)]">
          <AnimatePresence mode="popLayout">
            {interactionCount < MAX_INTERACTIONS ? (
              <motion.form key="chat-input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleChatSubmit} className="flex items-center">
                <span className="text-[12px] font-mono text-[var(--aura-heading)] mr-3"></span>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter command..." className="flex-1 bg-transparent border-none outline-none text-[var(--aura-heading)] text-[13px] font-light tracking-wide placeholder:text-[var(--aura-text-muted)]" />
              </motion.form>
            ) : (
              <motion.div key="chat-launch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                <button onClick={onLaunch} className="text-[10px] uppercase tracking-widest font-medium text-[var(--aura-heading)] hover:text-[var(--aura-text-muted)] transition-colors">
                  System Ready. Proceed.
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});
TerminalMockup.displayName = 'TerminalMockup';

// --- Main Component ---

export default function LandingPage({ onNavigateToApp }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  const handleLaunch = useCallback(() => {
    if (onNavigateToApp) {
      onNavigateToApp();
    } else {
      window.history.pushState({}, '', '/app');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onNavigateToApp]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--aura-bg)] text-[var(--aura-text)] selection:bg-[var(--aura-heading)] selection:text-[var(--aura-bg)] font-sans antialiased">
      <Navbar scrolled={scrolled} onLaunch={handleLaunch} />
      
      <main className="pt-32 pb-20 px-8 min-h-screen flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          <HeroSection />
          <TerminalMockup onLaunch={handleLaunch} />
        </div>
      </main>
    </div>
  );
}
