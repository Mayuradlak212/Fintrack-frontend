import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, BarChart2, LogOut, Wallet, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { logout, resetStore } from '../store/authSlice';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

interface NavbarProps {
  onHamburger: () => void;
}

export default function Navbar({ onHamburger }: NavbarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
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
            <div className="flex items-center gap-3 pl-4 border-l border-white/[0.05]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-txt-primary">{user.name}</p>
              </div>
              <Link href="/profile">
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20 hover:border-accent/40 transition-colors cursor-pointer overflow-hidden">
                  {user.avatar_base64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:${user.avatar_mime_type};base64,${user.avatar_base64}`} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-accent" />
                  )}
                </div>
              </Link>
            </div>
          )}
          <button
            onClick={() => { dispatch(resetStore()); dispatch(logout()); router.push('/auth/login'); }}
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
