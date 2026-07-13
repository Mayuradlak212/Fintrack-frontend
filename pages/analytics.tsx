import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, PieChart, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchSummary } from '../store/transactionSlice';
import { Category } from '../types';

const CATEGORY_COLORS: Record<Category | string, string> = {
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
  const dispatch = useAppDispatch();
  const { summary, isLoading } = useAppSelector((state) => state.transactions);
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    } else if (!summary && !isLoading) {
      dispatch(fetchSummary());
    }
  }, [user, router, dispatch, summary, isLoading]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (!user) return null;

  if (isLoading && !summary) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm text-txt-muted">Loading analytics...</p>
        </div>
      </Layout>
    );
  }

  if (!summary) return null;

  const { total_credit, total_debit, balance, count, monthly, categories } = summary;

  const maxMonthly = Math.max(...monthly.flatMap(d => [d.credit, d.debit]), 1);
  const maxCat = categories.length > 0 ? categories[0].amount : 1;
  const topCategories = categories.slice(0, 8);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-txt-primary tracking-tight">Analytics</h1>
        <p className="text-sm text-txt-muted mt-0.5">Insights from your {count} transactions</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Net Balance', val: balance, cls: 'text-accent-light', icon: BarChart2 },
          { label: 'Total Income', val: total_credit, cls: 'text-credit-light', icon: TrendingUp },
          { label: 'Total Expenses', val: total_debit, cls: 'text-debit-light', icon: TrendingDown },
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
          {monthly.length === 0 ? (
            <p className="text-txt-muted text-sm text-center py-8">Not enough data</p>
          ) : (
            <div className="flex items-end gap-3 h-48 overflow-x-auto pb-1">
              {monthly.map((data) => (
                <div key={data.month} className="flex flex-col items-center gap-1 min-w-[52px] flex-1">
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
                  <span className="text-[10px] text-txt-muted text-center whitespace-nowrap">{data.month}</span>
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
          {topCategories.length === 0 ? (
            <p className="text-txt-muted text-sm text-center py-8">No expenses recorded yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topCategories.map((cat, i) => {
                const pct = (cat.amount / maxCat) * 100;
                const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Other'];
                return (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-txt-secondary font-medium">{cat.category}</span>
                      <span className="text-txt-muted">{fmt(cat.amount)}</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 + i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: color }}
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
