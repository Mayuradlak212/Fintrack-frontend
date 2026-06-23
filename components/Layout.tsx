import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-primary to-bg-surface">
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full bg-credit/4 blur-[100px]" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-debit/3 blur-[90px]" />
      </div>

      <Navbar onHamburger={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={typeof window !== 'undefined' ? window.location.pathname : 'page'}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
