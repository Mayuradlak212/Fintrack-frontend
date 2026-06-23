import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, BarChart2, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

interface NavbarProps {
  onHamburger: () => void;
}

export default function Navbar({ onHamburger }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-bg-primary/90 backdrop-blur-2xl">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">

        {/* Left: hamburger (mobile/tablet) + logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onHamburger}
            aria-label="Open menu"
            className="lg:hidden flex flex-col gap-[5px] p-2 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-white/5 transition-colors"
          >
            <span className="w-[22px] h-0.5 bg-current rounded-full" />
            <span className="w-[15px] h-0.5 bg-current rounded-full" />
            <span className="w-[22px] h-0.5 bg-current rounded-full" />
          </button>

          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.45)]">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-accent-light to-credit-light bg-clip-text text-transparent select-none">
              FinTrack
            </span>
          </Link>
        </div>

        {/* Center: desktop tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = router.pathname === href;
            return (
              <Link key={href} href={href} className="no-underline">
                <motion.div
                  whileHover={{ y: -1 }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer select-none
                    ${active
                      ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_4px_14px_rgba(124,58,237,0.4)]'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-white/5'
                    }`}
                >
                  <Icon size={15} />
                  {label}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Right: avatar + logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-pink-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-txt-secondary max-w-[100px] truncate hidden xl:block">
                {user.name}
              </span>
            </div>
          )}
          <button
            onClick={() => { logout(); router.push('/auth/login'); }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-debit-light text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}
