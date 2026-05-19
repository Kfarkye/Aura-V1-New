import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Mail, Archive, Inbox } from 'lucide-react';

// --- Types & Interfaces ---
export interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string; // ISO 8601 string
  isRead: boolean;
}

interface InboxCardProps {
  emails?: EmailSummary[];
  isLoading: boolean;
  onArchive: (emailId: string) => void;
}

// --- The Email Card: A Physical Object ---
const EmailCard = ({ email, onArchive }: { email: EmailSummary; onArchive: (id: string) => void; }) => {
  const x = useMotionValue(0);
  const scale = useTransform(x, [-150, 0, 150], [0.9, 1, 0.9]);
  const rotate = useTransform(x, [-150, 0, 150], [-5, 0, 5]);
  const backgroundOpacity = useTransform(x, [0, 80], [0, 1]);

  return (
    <div className="relative py-1">
      <motion.div
        style={{ opacity: backgroundOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-8 bg-blue-600 rounded-xl"
      >
        <Archive className="h-6 w-6 text-white" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        style={{ x, scale, rotate }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100) {
            onArchive(email.id);
          }
        }}
        className="relative z-10 p-4 bg-white rounded-xl shadow-sm border border-slate-200/80 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between">
          <p className={cn('text-sm font-semibold', email.isRead ? 'text-slate-600' : 'text-slate-900')}>{email.from}</p>
          <p className="text-xs text-slate-500 font-medium">
            {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
          </p>
        </div>
        <p className={cn('text-sm mt-1', email.isRead ? 'text-slate-500' : 'text-slate-800 font-medium')}>{email.subject}</p>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{email.snippet}</p>
      </motion.div>
    </div>
  );
};

// --- The Container & States ---
const InboxSkeleton = () => (
    <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[108px] w-full rounded-xl" />)}
    </div>
);

const EmptyState = () => (
  <div className="flex h-[450px] flex-col items-center justify-center text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
      <Inbox className="h-8 w-8 text-slate-500" />
    </div>
    <h3 className="mt-5 font-semibold text-lg text-slate-900">Inbox clear</h3>
    <p className="mt-1 text-sm text-slate-500">A moment of calm.</p>
  </div>
);

// --- Main Component: The Vision ---
export function InboxSummaryCard({ emails: initialEmails = [], isLoading, onArchive }: InboxCardProps) {
  const [emails, setEmails] = React.useState(initialEmails);

  React.useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);

  const handleArchive = async (id: string) => {
    // Optimistically update the UI
    setEmails(currentEmails => currentEmails.filter(e => e.id !== id));
    
    // Call the provided callback if any parent needs to know
    if (onArchive) {
      onArchive(id);
    }

    try {
      const res = await fetch(`/api/inbox/${id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to archive email');
      }
    } catch (err) {
      console.error('Archive failed:', err);
      // Optional: Revert optimistic update here if needed
    }
  };

  return (
    <Card className="w-full max-w-md bg-slate-50/80 shadow-none border-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Inbox</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {isLoading ? (
          <InboxSkeleton />
        ) : emails.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative h-[450px]">
            <AnimatePresence>
              {emails.slice(0, 4).reverse().map((email, index) => {
                const isTop = index === emails.slice(0, 4).length - 1;
                return (
                  <motion.div
                    key={email.id}
                    className="absolute inset-x-0 top-0"
                    initial={{ scale: 0.9, y: 15, opacity: 0 }}
                    animate={{
                      scale: 1 - (index * 0.05),
                      y: index * 10,
                      opacity: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ zIndex: emails.length - index }}
                  >
                    <EmailCard email={email} onArchive={isTop ? handleArchive : () => {}} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
