import React, { memo } from 'react';
import { motion } from 'motion/react';
export interface ExternalCursor {
  x: number;
  y: number;
  name?: string;
}

export const CollaborativeCursor = memo(({ cursor }: { cursor: ExternalCursor }) => (
  <motion.div
    className="fixed pointer-events-none z-[100] transition-transform duration-75"
    style={{ left: `${cursor.x * 100}vw`, top: `${cursor.y * 100}vh` }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="relative">
      <svg className="w-5 h-5 text-indigo-600 fill-current drop-shadow-md" viewBox="0 0 20 20">
        <path d="M5.223 3.012a.5.5 0 0 0-.825.56l4.5 12a.5.5 0 0 0 .914-.029l1.716-4.57 4.542-1.615a.5.5 0 0 0 .048-.918l-10.895-5.428Z" />
      </svg>
      <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-lg whitespace-nowrap">
        {cursor.name || 'Anonymous'}
      </div>
    </div>
  </motion.div>
));
CollaborativeCursor.displayName = 'CollaborativeCursor';
