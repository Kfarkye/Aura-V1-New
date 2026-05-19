import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Terminal, Activity, Database, Server, Trophy, Target, TrendingUp, Users, ChevronRight } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const OPERATOR_ACTIONS = [
  {
    icon: Terminal,
    title: "System Diagnostics",
    desc: "Run fleet health check",
    prompt: "Run a full system diagnostic and check fleet health across all deployed Cloud Run services.",
  },
  {
    icon: Activity,
    title: "Ingestion Pipeline",
    desc: "Monitor data streams",
    prompt: "Check the status of the sports data ingestion pipeline. Are there any stalled workers?",
  },
  {
    icon: Database,
    title: "Database Sync",
    desc: "Verify SSOT integrity",
    prompt: "Verify the integrity of the Spanner graph registry and ensure all nodes are synchronized.",
  },
  {
    icon: Server,
    title: "Edge Orchestration",
    desc: "Deploy worker nodes",
    prompt: "Prepare a deployment manifest for the Edge AI workers. We need to scale up for the weekend games.",
  },
];

const PRODUCT_ACTIONS = [
  {
    icon: Trophy,
    title: "Pregame Intel",
    desc: "Generate match insights",
    prompt: "Give me the pregame intelligence report for tonight's Lakers vs. Warriors game.",
  },
  {
    icon: TrendingUp,
    title: "Live Markets",
    desc: "Scan odds movement",
    prompt: "Scan the live odds markets. Are there any significant line movements in the NFL games?",
  },
  {
    icon: Target,
    title: "Player Props",
    desc: "Analyze player matchups",
    prompt: "Analyze the player props for LeBron James. What are the key matchups to watch?",
  },
  {
    icon: Users,
    title: "Fantasy Lineups",
    desc: "Optimize roster selection",
    prompt: "Help me optimize my DFS lineup for the main slate today based on projected usage rates.",
  },
];

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)', 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  },
};

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const [activeStory, setActiveStory] = useState<'product' | 'operator'>('product');

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 lg:py-16 w-full mt-4 lg:-mt-8">
      <div className="w-full max-w-[840px] flex flex-col items-center">
        
        {/* The Stage Toggle - Series A Grade */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex p-1.5 bg-[#F5F5F7] border border-black/[0.03] rounded-2xl mb-14 relative w-full max-w-[420px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
        >
          <div
            className="absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.04] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: activeStory === 'operator' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button
            onClick={() => setActiveStory('product')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-[14px] font-medium transition-colors duration-300 relative z-10 ${
              activeStory === 'product' ? 'text-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Product Story
          </button>
          <button
            onClick={() => setActiveStory('operator')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-[14px] font-medium transition-colors duration-300 relative z-10 ${
              activeStory === 'operator' ? 'text-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Operator Story
          </button>
        </motion.div>

        {/* Dynamic Content */}
        <div className="w-full relative h-[440px]">
          <AnimatePresence mode="wait">
            {activeStory === 'product' ? (
              <motion.div
                key="product"
                initial={{ opacity: 0, x: -30, filter: 'blur(12px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 30, filter: 'blur(12px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col items-center"
              >
                <div className="mb-10 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-indigo-50/50 border border-indigo-100/60 shadow-[0_8px_16px_-6px_rgba(79,70,229,0.15),inset_0_1px_0_rgba(255,255,255,1)] flex items-center justify-center mb-5">
                     <Trophy className="w-6 h-6 text-indigo-600 drop-shadow-sm" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[34px] font-semibold text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 tracking-[-0.035em] leading-tight mb-2.5">
                    Sports Desk Intelligence
                  </h2>
                  <p className="text-[16px] font-normal text-slate-500 tracking-[-0.015em] max-w-md leading-relaxed">
                    Actionable insights, live markets, and pregame narratives tailored for the end user.
                  </p>
                </div>

                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {PRODUCT_ACTIONS.map((action, i) => (
                    <motion.button
                      key={i}
                      variants={itemVariants}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onSelectPrompt(action.prompt)}
                      className="cursor-pointer p-5 bg-white rounded-[20px] border border-black/[0.04] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.04)] hover:border-black/[0.08] transition-all duration-500 flex items-start gap-4.5 text-left group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/50 group-hover:to-transparent transition-colors duration-500" />
                      
                      <div className="relative p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100/60 transition-all duration-500 shadow-sm">
                        <action.icon size={20} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 pt-1 relative">
                        <p className="font-semibold text-slate-900 text-[15px] leading-tight tracking-[-0.015em] mb-1.5 group-hover:text-indigo-950 transition-colors duration-300">{action.title}</p>
                        <p className="text-[14px] text-slate-500 leading-relaxed font-normal">{action.desc}</p>
                      </div>
                      <div className="relative pt-1">
                        <ChevronRight className="w-5 h-5 text-slate-300 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-indigo-400 transition-all duration-500 ease-out" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="operator"
                initial={{ opacity: 0, x: 30, filter: 'blur(12px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -30, filter: 'blur(12px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col items-center"
              >
                <div className="mb-10 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] border border-[#262626] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] flex items-center justify-center mb-5 relative">
                     <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-md" />
                     <Server className="w-6 h-6 text-emerald-400 relative z-10" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[34px] font-semibold text-transparent bg-clip-text bg-gradient-to-b from-slate-800 to-slate-500 tracking-[-0.035em] leading-tight mb-2.5">
                    Fleet Command Center
                  </h2>
                  <p className="text-[16px] font-normal text-slate-500 tracking-[-0.015em] max-w-md leading-relaxed">
                    Infrastructure diagnostics, agent orchestration, and edge deployment for operators.
                  </p>
                </div>

                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {OPERATOR_ACTIONS.map((action, i) => (
                    <motion.button
                      key={i}
                      variants={itemVariants}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onSelectPrompt(action.prompt)}
                      className="cursor-pointer p-5 bg-[#121212] rounded-[20px] border border-[#262626] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.4),0_0_24px_-8px_rgba(16,185,129,0.15)] hover:border-[#333333] transition-all duration-500 flex items-start gap-4.5 text-left group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/0 to-emerald-900/0 group-hover:from-emerald-900/10 group-hover:to-transparent transition-colors duration-500" />
                      
                      <div className="relative p-3 rounded-xl bg-[#1A1A1A] border border-[#333] text-slate-400 group-hover:bg-[#0A0A0A] group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all duration-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                        <action.icon size={20} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 pt-1 relative">
                        <p className="font-semibold text-slate-200 text-[15px] leading-tight tracking-[-0.015em] mb-1.5 group-hover:text-white transition-colors duration-300">{action.title}</p>
                        <p className="text-[14px] text-slate-500 leading-relaxed font-normal group-hover:text-slate-400 transition-colors duration-300">{action.desc}</p>
                      </div>
                      <div className="relative pt-1">
                        <ChevronRight className="w-5 h-5 text-slate-600 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-emerald-500 transition-all duration-500 ease-out" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
