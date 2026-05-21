import React, { memo, useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

// --- Types & Constants ---
interface LandingPageProps {
  onNavigateToApp?: () => void;
}

interface Message {
  role: "user" | "agent";
  content: string;
}

const CHAT_DELAY_MS = 800;
const MAX_INTERACTIONS = 3;

const DEMO_SCRIPT = [
  "Processing request. Target workspace defined.",
  "Data compiled. Preparing draft review.",
  "Workflow executed. Launching AURA.",
];

const bubbleVariants: any = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

// --- Child Components ---

const Navbar = memo(
  ({ scrolled, onLaunch }: { scrolled: boolean; onLaunch: () => void }) => (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${scrolled ? "bg-[#030303]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)]" : "bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-8 h-[80px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full border-[6px] border-white box-border shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
          <span className="font-bold tracking-[-0.04em] text-[22px] text-white ml-1">
            AURA
          </span>
        </div>
        <button
          onClick={onLaunch}
          className="bg-white text-black px-6 py-2.5 text-[11px] uppercase tracking-[0.1em] font-bold hover:bg-[#F5F5F7] transition-all duration-300 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
        >
          Launch
        </button>
      </div>
    </nav>
  ),
);
Navbar.displayName = "Navbar";

const HeroSection = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    className="lg:col-span-6 pt-20 lg:pt-0"
  >
    <div className="mb-8">
      <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/50">
        System Architecture
      </span>
    </div>
    <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[6rem] leading-[1.05] font-semibold tracking-[-0.04em] mb-8 text-balance text-white">
      The precision interface for your data.
    </h1>
    <p className="text-[18px] sm:text-[20px] text-white/50 mb-12 max-w-xl leading-relaxed font-light tracking-wide">
      AURA connects your fragmented ecosystems into a singular, cohesive
      computational layer. Refined, transparent, and absolutely minimal.
    </p>
  </motion.div>
));
HeroSection.displayName = "HeroSection";

const ChatMessage = memo(({ msg }: { msg: Message }) => {
  const isUser = msg.role === "user";

  if (msg.content === "q3_graphic") {
    return (
      <motion.div
        variants={bubbleVariants}
        initial="hidden"
        animate="show"
        className="w-full flex flex-col mt-4"
      >
        <div className="border border-white/[0.05] bg-white/[0.02] shadow-inner backdrop-blur-xl p-8 rounded-3xl w-full flex flex-col gap-5 transition-all hover:border-white/10">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">
            Document Generated
          </div>
          <div className="font-semibold text-[20px] text-white tracking-[-0.02em]">
            Q3 Product Roadmap
          </div>
          <p className="text-white/60 leading-relaxed text-[14px] font-light">
            Focus areas: unified integrations, mobile precision, and performance
            architecture.
          </p>
          <div className="h-[1px] w-full bg-[rgba(255,255,255,0.08)] my-2" />
          <button className="text-[10px] uppercase tracking-[0.15em] font-bold text-white hover:text-white/70 transition-colors self-start">
            Review Draft
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="show"
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`px-5 py-3.5 max-w-[85%] text-[14px] font-light tracking-wide leading-relaxed rounded-2xl ${isUser ? "bg-white/10 border border-white/5 shadow-2xl backdrop-blur-xl text-white rounded-br-sm" : "text-white/90"}`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
});
ChatMessage.displayName = "ChatMessage";

const TerminalMockup = memo(({ onLaunch }: { onLaunch: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", content: "Compile the Q3 roadmap into a summary draft." },
    { role: "agent", content: "q3_graphic" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [interactionCount, setInteractionCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || interactionCount >= MAX_INTERACTIONS) return;

    const currentInteraction = interactionCount;
    setMessages((prev) => [...prev, { role: "user", content: inputValue }]);
    setInputValue("");
    setInteractionCount((prev) => prev + 1);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: DEMO_SCRIPT[currentInteraction] },
      ]);
    }, CHAT_DELAY_MS);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="lg:col-span-6 relative flex justify-center lg:justify-end"
    >
      <div className="w-full max-w-[480px] h-[680px] bg-white/[0.02] border border-white/[0.05] shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-[40px] rounded-[32px] flex flex-col overflow-hidden">
        <div className="h-14 border-b border-white/[0.05] bg-white/[0.01] flex items-center px-6">
          <span className="text-[9px] uppercase tracking-widest font-mono text-[rgba(255,255,255,0.5)]">
            AURA.SYS.STREAM
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} msg={msg} />
            ))}
          </AnimatePresence>
          <div ref={chatBottomRef} className="h-4" />
        </div>

        <div className="p-6 border-t border-white/[0.05] bg-white/[0.01]">
          <AnimatePresence mode="popLayout">
            {interactionCount < MAX_INTERACTIONS ? (
              <motion.form
                key="chat-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleChatSubmit}
                className="flex items-center"
              >
                <span className="text-[12px] font-mono text-[white] mr-3"></span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-none outline-none text-[white] text-[13px] font-light tracking-wide placeholder:text-[rgba(255,255,255,0.5)]"
                />
              </motion.form>
            ) : (
              <motion.div
                key="chat-launch"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center"
              >
                <button
                  onClick={onLaunch}
                  className="text-[10px] uppercase tracking-widest font-medium text-[white] hover:text-[rgba(255,255,255,0.5)] transition-colors"
                >
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
TerminalMockup.displayName = "TerminalMockup";

// --- Main Component ---

export default function LandingPage({ onNavigateToApp }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  const handleLaunch = useCallback(() => {
    if (onNavigateToApp) {
      onNavigateToApp();
    } else {
      window.history.pushState({}, "", "/app");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [onNavigateToApp]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-[#F5F5F7] selection:bg-[white] selection:text-[#030303] font-sans antialiased">
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
