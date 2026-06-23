import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { Category } from '../types';
import { formatIST } from '../lib/dateUtils';

const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Dining': '#f59e0b',
  'Transport': '#3b82f6',
  'Shopping': '#a855f7',
  'Entertainment': '#ec4899',
  'Healthcare': '#14b8a6',
  'Housing': '#f97316',
  'Salary': '#10b981',
  'Investment': '#6366f1',
  'Transfer': '#94a3b8',
  'Other': '#64748b',
};

export default function AnalyticsPage() {
  const { transactions } = useTransactions();
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebit  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  // Category breakdown (debits only)
  const categoryTotals = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    transactions.filter(t => t.type === 'debit').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8) as [Category, number][];
  }, [transactions]);

  // Monthly totals
  const monthlyData = useMemo(() => {
    const map: Record<string, { credit: number; debit: number }> = {};
    transactions.forEach(t => {
      const m = formatIST(t.date, { month: 'short', year: '2-digit' });
      if (!map[m]) map[m] = { credit: 0, debit: 0 };
      map[m][t.type] += t.amount;
    });
    return Object.entries(map).slice(-6);
  }, [transactions]);

  const maxMonthly = Math.max(...monthlyData.flatMap(([, d]) => [d.credit, d.debit]), 1);
  const maxCat = categoryTotals[0]?.[1] || 1;
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (!user) return null;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-txt-primary tracking-tight">Analytics</h1>
        <p className="text-sm text-txt-muted mt-0.5">Insights from your {transactions.length} transactions</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Net Balance', val: totalCredit - totalDebit, cls: 'text-accent-light', icon: BarChart2 },
          { label: 'Total Income', val: totalCredit, cls: 'text-credit-light', icon: TrendingUp },
          { label: 'Total Expenses', val: totalDebit, cls: 'text-debit-light', icon: TrendingDown },
        ].map(({ label, val, cls, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-bg-card border border-white/[0.07] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={15} className="text-txt-muted" />
              <p className="text-xs font-medium text-txt-muted uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-extrabold tracking-tight ${cls}`}>{fmt(val)}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-bg-card border border-white/[0.07] rounded-2xl p-5"
        >
          <h2 className="text-sm font-bold text-txt-primary mb-4">Monthly Overview</h2>
          {monthlyData.length === 0 ? (
            <p className="text-txt-muted text-sm text-center py-8">Not enough data</p>
          ) : (
            <div className="flex items-end gap-3 h-48 overflow-x-auto pb-1">
              {monthlyData.map(([month, data]) => (
                <div key={month} className="flex flex-col items-center gap-1 min-w-[52px] flex-1">
                  <div className="flex items-end gap-0.5 h-36 w-full">
                    {/* Credit bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.credit / maxMonthly) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="flex-1 bg-gradient-to-t from-credit to-credit-light rounded-t-lg min-h-[2px]"
                      title={`Income: ${fmt(data.credit)}`}
                    />
                    {/* Debit bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.debit / maxMonthly) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className="flex-1 bg-gradient-to-t from-debit to-debit-light rounded-t-lg min-h-[2px]"
                      title={`Expenses: ${fmt(data.debit)}`}
                    />
                  </div>
                  <span className="text-[10px] text-txt-muted text-center whitespace-nowrap">{month}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-txt-muted"><span className="w-3 h-3 rounded-sm bg-credit-light" /> Income</span>
            <span className="flex items-center gap-1.5 text-xs text-txt-muted"><span className="w-3 h-3 rounded-sm bg-debit-light" /> Expenses</span>
          </div>
        </motion.div>

        {/* Category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-bg-card border border-white/[0.07] rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={15} className="text-txt-muted" />
            <h2 className="text-sm font-bold text-txt-primary">Spending by Category</h2>
          </div>
          {categoryTotals.length === 0 ? (
            <p className="text-txt-muted text-sm text-center py-8">No expenses recorded yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {categoryTotals.map(([cat, amt], i) => {
                const pct = (amt / maxCat) * 100;
                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-txt-secondary font-medium">{cat}</span>
                      <span className="text-txt-muted">{fmt(amt)}</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 + i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: CATEGORY_COLORS[cat] }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
