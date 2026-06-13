"use client";

// Visual-preview route renders the authenticated dashboard layout with mock data
// so the design can be screenshot-verified without a Supabase login.

import dynamic from "next/dynamic";

const CashFlowChart = dynamic(() => import("../cash-flow-chart"), {
  ssr: false,
  loading: () => <div className="chart-card-body chart-loading" aria-hidden="true" />,
});

const idr = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const series = [
  { label: "Jan", income: 7200000, expense: 4100000, net: 3100000 },
  { label: "Feb", income: 6800000, expense: 4600000, net: 2200000 },
  { label: "Mar", income: 9100000, expense: 5200000, net: 3900000 },
  { label: "Apr", income: 8200000, expense: 3800000, net: 4400000 },
  { label: "May", income: 9600000, expense: 5400000, net: 4200000 },
  { label: "Jun", income: 8800000, expense: 4300000, net: 4500000 },
];

const tabs: Array<[string, string]> = [
  ["overview", "Overview"],
  ["transactions", "Transactions"],
  ["wallets", "Wallets"],
  ["budgets", "Budgets"],
  ["reports", "Reports"],
  ["profile", "Profile"],
];

const wallets = [
  { name: "BCA", type: "bank", balance: 12400000, color: "#2563eb" },
  { name: "GoPay", type: "e-wallet", balance: 1850000, color: "#16a34a" },
  { name: "Cash", type: "cash", balance: 640000, color: "#f59e0b" },
];

const categories = [
  { name: "Food & Drink", total: 2150000, pct: 100, color: "#dc2626" },
  { name: "Transport", total: 1240000, pct: 58, color: "#f59e0b" },
  { name: "Shopping", total: 920000, pct: 43, color: "#7c3aed" },
  { name: "Bills", total: 680000, pct: 32, color: "#2563eb" },
];

const txns = [
  { note: "Client invoice", date: "12 Jun, 09:24", wallet: "BCA", cat: "Income", color: "#16a34a", amount: "+Rp4.800.000", positive: true },
  { note: "Groceries", date: "11 Jun, 18:02", wallet: "GoPay", cat: "Food & Drink", color: "#dc2626", amount: "-Rp412.000", positive: false },
  { note: "Grab to office", date: "11 Jun, 08:15", wallet: "GoPay", cat: "Transport", color: "#f59e0b", amount: "-Rp38.000", positive: false },
  { note: "Coffee", date: "10 Jun, 15:40", wallet: "Cash", cat: "Food & Drink", color: "#dc2626", amount: "-Rp32.000", positive: false },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function PreviewPage() {
  return (
    <main className="app-shell">
      <header className="product-nav app-nav">
        <div className="nav-brand">
          <span className="brand-mark">PF</span>
          <span>PocketFlow</span>
        </div>
        <nav className="nav-links app-tabs">
          {tabs.map(([key, label], index) => (
            <button key={key} className={index === 0 ? "nav-tab active" : "nav-tab"} type="button">
              <span aria-hidden="true">
                <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </span>
              <b>{label}</b>
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <span className="nav-email">arman@example.com</span>
          <button className="theme-toggle" type="button">
            <span className="theme-toggle-dot" />
            <span>Light</span>
          </button>
          <button className="ghost-button" type="button">Sign out</button>
        </div>
      </header>

      <section className="workspace">
        <header className="command-header">
          <div>
            <span className="workspace-label">Welcome back</span>
            <h1>Dashboard</h1>
            <p>Track your income, expenses, and balance.</p>
          </div>
          <div className="topbar-actions">
            <div className="period-control">
              <button className="segmented" type="button">daily</button>
              <button className="segmented" type="button">weekly</button>
              <button className="segmented active" type="button">monthly</button>
              <button className="segmented" type="button">yearly</button>
            </div>
            <button className="secondary-button" type="button">Sync</button>
            <button className="primary-button" type="button">+ Add transaction</button>
          </div>
        </header>

        <div className="view-stack">
          <section className="stat-grid">
            <article className="stat-card stat-brand">
              <div className="stat-card-head"><span className="stat-dot" /><span className="stat-label">Total Balance</span></div>
              <strong className="stat-value">{idr(14890000)}</strong>
              <span className="stat-helper">3 active wallets</span>
            </article>
            <article className="stat-card stat-income">
              <div className="stat-card-head"><span className="stat-dot" /><span className="stat-label">Income</span></div>
              <strong className="stat-value">{idr(8800000)}</strong>
              <span className="stat-helper">This month</span>
            </article>
            <article className="stat-card stat-expense">
              <div className="stat-card-head"><span className="stat-dot" /><span className="stat-label">Expenses</span></div>
              <strong className="stat-value">{idr(4300000)}</strong>
              <span className="stat-helper">This month</span>
            </article>
            <article className="stat-card stat-income">
              <div className="stat-card-head"><span className="stat-dot" /><span className="stat-label">Net Savings</span></div>
              <strong className="stat-value">{idr(4500000)}</strong>
              <span className="stat-helper">Income − expenses</span>
            </article>
          </section>

          <section className="panel chart-card">
            <div className="chart-card-header">
              <div className="chart-card-heading">
                <h2>Cash Flow Overview</h2>
                <p>Income, expenses, and balance trend over time.</p>
              </div>
              <div className="chart-legend">
                <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: "#16a34a" }} />Income</span>
                <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: "#dc2626" }} />Expenses</span>
                <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: "#2563eb" }} />Net</span>
              </div>
            </div>
            <CashFlowChart data={series} />
          </section>

          <section className="dashboard-grid">
            <section className="panel">
              <div className="panel-header"><h2>Expense by Category</h2><span>4 categories</span></div>
              <div className="chart-list">
                {categories.map((c) => (
                  <div className="chart-row" key={c.name}>
                    <div className="chart-row-top"><span>{c.name}</span><strong>{idr(c.total)}</strong></div>
                    <div className="progress-track"><span style={{ width: `${c.pct}%`, backgroundColor: c.color }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header"><h2>Wallets</h2><span>3 wallets</span></div>
              <div className="wallet-list">
                {wallets.map((w) => (
                  <div className="wallet-row" key={w.name}>
                    <span className="wallet-dot" style={{ backgroundColor: w.color }} />
                    <div><strong>{w.name}</strong><span>{w.type}</span></div>
                    <b>{idr(w.balance)}</b>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <section className="panel table-panel">
            <div className="panel-header"><h2>Recent Transactions</h2><span>4 items</span></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Transaction</th><th>Wallet</th><th>Category</th><th>Amount</th><th /></tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.note}>
                      <td><div className="table-primary"><strong>{t.note}</strong><span>{t.date}</span></div></td>
                      <td>{t.wallet}</td>
                      <td><span className="badge" style={{ backgroundColor: `color-mix(in srgb, ${t.color} 14%, var(--color-bg-surface))`, color: t.color }}>{t.cat}</span></td>
                      <td><b className={t.positive ? "amount good-text" : "amount bad-text"}>{t.amount}</b></td>
                      <td>
                        <div className="table-actions">
                          <button className="icon-button" type="button">Edit</button>
                          <button className="icon-button danger" type="button">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
