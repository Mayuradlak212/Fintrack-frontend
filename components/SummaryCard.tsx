import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  color: 'accent' | 'credit' | 'debit';
  delay?: number;
  subtitle?: string;
}

const colorMap = {
  accent: {
    wrapper: 'bg-purple-500/10 border border-purple-500/25',
    glow: 'shadow-[0_8px_32px_rgba(124,58,237,0.2)]',
    iconBg: 'bg-gradient-to-br from-accent to-accent-light',
    text: 'text-accent-light',
    blob: 'bg-purple-500/10',
  },
  credit: {
    wrapper: 'bg-emerald-500/10 border border-emerald-500/20',
    glow: 'shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-credit-light',
    text: 'text-credit-light',
    blob: 'bg-emerald-500/10',
  },
  debit: {
    wrapper: 'bg-red-500/10 border border-red-500/20',
    glow: 'shadow-[0_8px_32px_rgba(239,68,68,0.15)]',
    iconBg: 'bg-gradient-to-br from-red-600 to-debit-light',
    text: 'text-debit-light',
    blob: 'bg-red-500/10',
  },
};

export default function SummaryCard({ title, amount, icon: Icon, color, delay = 0, subtitle }: SummaryCardProps) {
  const c = colorMap[color];
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl p-5 cursor-default ${c.wrapper} ${c.glow}`}
    >
      {/* Decorative blob */}
      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl ${c.blob} pointer-events-none`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-txt-muted uppercase tracking-widest mb-2">{title}</p>
          <p className={`text-2xl font-extrabold tracking-tight leading-none ${c.text}`}>{formatted}</p>
          {subtitle && <p className="text-xs text-txt-muted mt-1.5">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.glow}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}
