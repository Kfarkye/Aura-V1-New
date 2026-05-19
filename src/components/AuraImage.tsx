import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AuraImageProps {
  prompt: string;
}

export const AuraImage: React.FC<AuraImageProps> = ({ prompt }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Image generation failed' }));
        throw new Error(err.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      if (!data.data) {
        throw new Error('No image was generated. Please try a different prompt.');
      }

      const mimeType = data.mimeType || 'image/png';
      setImageUrl(`data:${mimeType};base64,${data.data}`);
    } catch (err: unknown) {
      console.error('Image Generation Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateImage();
  }, [prompt]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `aura-gen-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
      className="bg-[var(--aura-surface)] rounded-[24px] overflow-hidden my-6 border border-[var(--aura-border)] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] w-full"
    >
      <div className="bg-[color-mix(in_oklch,var(--aura-text)_2%,transparent)] px-4 py-3 flex items-center justify-between border-b border-[var(--aura-border)]">
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-bold tracking-[0.2em] text-[var(--aura-text-secondary)] uppercase">Generated Image</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--aura-text-secondary)]">
          {imageUrl && (
            <button
              onClick={handleDownload}
              className="px-2 py-1 hover:bg-[color-mix(in_oklch,var(--aura-text)_5%,transparent)] hover:text-[var(--aura-text)] rounded transition-colors text-[0.65rem] font-bold uppercase tracking-wider"
            >
              Download
            </button>
          )}
          <button
            onClick={() => generateImage()}
            className={`px-2 py-1 hover:bg-[color-mix(in_oklch,var(--aura-text)_5%,transparent)] hover:text-[var(--aura-text)] rounded transition-colors text-[0.65rem] font-bold uppercase tracking-wider ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            disabled={loading}
          >
            {loading ? 'Processing' : 'Regenerate'}
          </button>
        </div>
      </div>

      <div className="relative w-full min-h-[400px] bg-[var(--aura-bg)] flex items-center justify-center overflow-hidden group border-b border-[var(--aura-border)] p-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-6 h-6 border-2 border-[var(--aura-text)]/10 border-t-[var(--aura-text)]/40 rounded-full animate-spin" />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center"
            >
              <p className="text-[0.8rem] text-[var(--aura-text)] font-medium mb-4">{error}</p>
              <button
                onClick={() => generateImage()}
                className="px-4 py-2 bg-[var(--aura-text)] text-[var(--aura-bg)] rounded-[12px] text-[0.8rem] font-semibold hover:scale-[1.02] transition-transform shadow-[var(--shadow-contact)]"
              >
                Retry
              </button>
            </motion.div>
          ) : (
            <motion.img
              key="image"
              src={imageUrl!}
              alt={prompt}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-auto max-h-[80vh] object-contain transition-transform duration-700 group-hover:scale-[1.02] rounded-[16px]"
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                const parent = e.currentTarget.closest('.overflow-y-auto');
                if (parent) {
                  parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-4 bg-[color-mix(in_oklch,var(--aura-text)_2%,transparent)]">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--aura-text-secondary)] mb-1.5 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[var(--aura-text)]/20" />
          Prompt
        </p>
        <p className="text-[0.8rem] text-[var(--aura-text)] leading-relaxed line-clamp-3">
          {prompt}
        </p>
      </div>
    </motion.div>
  );
};
