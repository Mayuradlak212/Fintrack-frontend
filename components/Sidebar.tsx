import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, BarChart2, LogOut, X, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleNav = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 left-0 h-full w-72 bg-bg-surface/95 backdrop-blur-2xl border-r border-white/[0.07] z-50 flex flex-col p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.45)]">
                  <Wallet size={17} className="text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-accent-light to-credit-light bg-clip-text text-transparent">
                  FinTrack
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-txt-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* User card */}
            {user && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-pink-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-txt-primary truncate">{user.name}</p>
                  <p className="text-xs text-txt-muted truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 flex flex-col gap-1.5">
              {navItems.map(({ href, label, icon: Icon }, i) => {
                const active = router.pathname === href;
                return (
                  <motion.button
                    key={href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.08 }}
                    whileHover={{ x: 3 }}
                    onClick={() => handleNav(href)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left w-full border-none cursor-pointer transition-all
                      ${active
                        ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)]'
                        : 'text-txt-secondary hover:text-txt-primary hover:bg-white/5'
                      }`}
                  >
                    <Icon size={17} />
                    {label}
                  </motion.button>
                );
              })}
            </nav>

            {/* Logout */}
            <button
              onClick={() => { logout(); router.push('/auth/login'); onClose(); }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/8 text-debit-light text-sm font-medium hover:bg-red-500/15 transition-colors mt-2 w-full cursor-pointer"
            >
              <LogOut size={15} />
              Logout
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
