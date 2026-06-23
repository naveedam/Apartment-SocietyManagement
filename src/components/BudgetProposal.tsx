import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LineItem {
  id: string;
  description: string;
  category: 'operational' | 'capital';
  annualAmount: number;
}

interface BudgetProposal {
  id: string;
  financialYear: string;
  operationalBudget: string;
  capitalBudget: string;
  totalBudget: string;
  lineItems: string;
  status: string;
  createdAt: string;
}

interface FlatStatement {
  flatId: string;
  flatNumber: string;
  area: number;
  equalShare: number;
  areaShare: number;
  totalDue: number;
}

interface StatementData {
  financialYear: string;
  period: string;
  operationalBudget: number;
  capitalBudget: number;
  opMonthly: number;
  capMonthly: number;
  equalShare: number;
  totalAreaSqft: number;
  budgetStatus: string;
  flats: FlatStatement[];
}

const CURRENT_FY = '2025-26';
const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

export function BudgetProposal() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<BudgetProposal[]>([]);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'statement'>('list');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [fy, setFy] = useState(CURRENT_FY);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Security Guard Salary', category: 'operational', annualAmount: 120000 },
    { id: '2', description: 'Housekeeping', category: 'operational', annualAmount: 60000 },
    { id: '3', description: 'Electricity (Common Areas)', category: 'operational', annualAmount: 48000 },
    { id: '4', description: 'Water Charges', category: 'operational', annualAmount: 36000 },
    { id: '5', description: 'Lift Maintenance AMC', category: 'operational', annualAmount: 24000 },
    { id: '6', description: 'Sinking Fund', category: 'capital', annualAmount: 60000 },
    { id: '7', description: 'Terrace Waterproofing', category: 'capital', annualAmount: 50000 },
  ]);
  const [stmtYear, setStmtYear] = useState(CURRENT_FY);
  const [stmtPeriod, setStmtPeriod] = useState(CURRENT_PERIOD);
  const [dueDate, setDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchProposals(); }, []);

  async function fetchProposals() {
    const r = await fetch('/api/budget');
    if (r.ok) setProposals(await r.json());
  }

  const opTotal = lineItems.filter(l => l.category === 'operational').reduce((s, l) => s + l.annualAmount, 0);
  const capTotal = lineItems.filter(l => l.category === 'capital').reduce((s, l) => s + l.annualAmount, 0);

  function addLineItem() {
    setLineItems(prev => [...prev, { id: Date.now().toString(), description: '', category: 'operational', annualAmount: 0 }]);
  }
  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }
  function removeItem(id: string) {
    setLineItems(prev => prev.filter(l => l.id !== id));
  }

  async function submitBudget() {
    setLoading(true); setMsg('');
    const r = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ financialYear: fy, operationalBudget: opTotal, capitalBudget: capTotal, lineItems }),
    });
    setLoading(false);
    if (r.ok) { setMsg('Budget proposal saved!'); setView('list'); fetchProposals(); }
    else { const e = await r.json(); setMsg(e.error || 'Error saving'); }
  }

  async function approveBudget(id: string) {
    const r = await fetch(`/api/budget?id=${id}`, { method: 'PATCH' });
    if (r.ok) fetchProposals();
  }

  async function loadStatement() {
    setLoading(true);
    const r = await fetch(`/api/budget/statement?year=${stmtYear}&period=${stmtPeriod}`);
    setLoading(false);
    if (r.ok) { setStatement(await r.json()); setView('statement'); }
    else { const e = await r.json(); setMsg(e.error || 'Error loading statement'); }
  }

  async function generateDues() {
    if (!dueDate) { setMsg('Set a due date first'); return; }
    setGenerating(true); setMsg('');
    const r = await fetch('/api/budget/statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: stmtYear, period: stmtPeriod, dueDate }),
    });
    setGenerating(false);
    const data = await r.json();
    if (r.ok) setMsg(`\u2713 Generated ${data.generated} dues. ${data.skipped} already existed.`);
    else setMsg(data.error || 'Error generating dues');
  }

  const s = { input: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 } as React.CSSProperties };

  if (view === 'create') return (
    <div style={{ padding: 24 }}>
      <button onClick={() => setView('list')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>\u2190 Back</button>
      <h2 style={{ margin: '0 0 20px' }}>New Budget Proposal \u2014 FY
        <input value={fy} onChange={e => setFy(e.target.value)} style={{ ...s.input, marginLeft: 8, width: 90 }} />
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {['Description', 'Category', 'Annual Amount (\u20b9)', ''].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #ddd' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map(item => (
            <tr key={item.id}>
              <td style={{ padding: '6px 8px' }}>
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  style={{ ...s.input, width: '100%' }} placeholder="Description" />
              </td>
              <td style={{ padding: '6px 8px' }}>
                <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value as 'operational' | 'capital')} style={{ ...s.input }}>
                  <option value="operational">Operational</option>
                  <option value="capital">Capital</option>
                </select>
              </td>
              <td style={{ padding: '6px 8px' }}>
                <input type="number" value={item.annualAmount} onChange={e => updateItem(item.id, 'annualAmount', parseFloat(e.target.value) || 0)}
                  style={{ ...s.input, width: 130 }} />
              </td>
              <td style={{ padding: '6px 8px' }}>
                <button onClick={() => removeItem(item.id)} style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>\u00d7</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addLineItem} style={{ padding: '6px 14px', border: '1px dashed #999', background: 'none', cursor: 'pointer', borderRadius: 4, marginBottom: 24 }}>+ Add Line Item</button>
      <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 6, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[['Operational Total', opTotal], ['Capital Total', capTotal], ['Grand Total', opTotal + capTotal]].map(([label, val]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>\u20b9{(val as number).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 11, color: '#888' }}>\u20b9{Math.round((val as number) / 12).toLocaleString('en-IN')}/mo</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={submitBudget} disabled={loading} style={{ padding: '8px 20px', background: '#2d3748', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        {msg && <span style={{ color: msg.includes('saved') ? '#38a169' : '#e53e3e' }}>{msg}</span>}
      </div>
    </div>
  );

  if (view === 'statement' && statement) return (
    <div style={{ padding: 24 }}>
      <button onClick={() => setView('list')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>\u2190 Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Maintenance Statement</h2>
          <div style={{ color: '#666', fontSize: 13 }}>FY {statement.financialYear} \u00b7 Period {statement.period} \u00b7 Budget: <span style={{ color: statement.budgetStatus === 'approved' ? '#38a169' : '#e53e3e', fontWeight: 600 }}>{statement.budgetStatus}</span></div>
        </div>
        {statement.budgetStatus === 'approved' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...s.input }} />
            <button onClick={generateDues} disabled={generating} style={{ padding: '7px 16px', background: '#276749', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              {generating ? 'Generating...' : 'Generate Dues'}
            </button>
          </div>
        )}
      </div>
      {msg && <div style={{ marginBottom: 12, padding: '8px 12px', background: msg.includes('\u2713') ? '#f0fff4' : '#fff5f5', border: '1px solid #9ae6b4', borderRadius: 4, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Monthly Operational', `\u20b9${statement.opMonthly.toLocaleString('en-IN')}`, 'Equal split across 15 flats'],
          ['Monthly Capital', `\u20b9${statement.capMonthly.toLocaleString('en-IN')}`, 'Area-weighted split'],
          ['Equal Share / Flat', `\u20b9${statement.equalShare.toLocaleString('en-IN')}`, `${statement.opMonthly.toFixed(0)} \u00f7 15`],
        ].map(([label, val, sub]) => (
          <div key={label} style={{ padding: 14, background: '#f8f9fa', borderRadius: 6, border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: 11, color: '#666' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>{val}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{sub}</div>
          </div>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#2d3748', color: '#fff' }}>
            {['Flat', 'Area (sqft)', 'Equal Share', 'Area Share', 'Total Due / Month'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Flat' ? 'left' : 'right', fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statement.flats.map((flat, i) => (
            <tr key={flat.flatId} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600 }}>{flat.flatNumber}</td>
              <td style={{ padding: '8px 14px', textAlign: 'right' }}>{flat.area.toLocaleString('en-IN')}</td>
              <td style={{ padding: '8px 14px', textAlign: 'right' }}>\u20b9{flat.equalShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '8px 14px', textAlign: 'right' }}>\u20b9{flat.areaShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700 }}>\u20b9{flat.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#2d3748', color: '#fff' }}>
            <td style={{ padding: '10px 14px', fontWeight: 700 }}>Total</td>
            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{statement.totalAreaSqft.toLocaleString('en-IN')}</td>
            <td colSpan={2} />
            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
              \u20b9{statement.flats.reduce((s, f) => s + f.totalDue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 12, fontSize: 11, color: '#888' }}>
        Formula: Equal share = Operational \u00f7 12 \u00f7 15 \u00b7 Area share = Capital \u00f7 12 \u00d7 (flat area / {statement.totalAreaSqft.toLocaleString('en-IN')} sqft)
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Budget Proposals</h2>
        {user?.role === 'admin' && (
          <button onClick={() => setView('create')} style={{ padding: '8px 16px', background: '#2d3748', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            + New Proposal
          </button>
        )}
      </div>
      <div style={{ marginBottom: 24, padding: 16, background: '#f0f4ff', border: '1px solid #c3d3ff', borderRadius: 6 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>View Maintenance Statement</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>Financial Year</label>
            <input value={stmtYear} onChange={e => setStmtYear(e.target.value)} style={{ ...s.input, width: 90 }} placeholder="2025-26" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>Period</label>
            <input value={stmtPeriod} onChange={e => setStmtPeriod(e.target.value)} style={{ ...s.input, width: 100 }} placeholder="2026-06" />
          </div>
          <button onClick={loadStatement} disabled={loading} style={{ marginTop: 16, padding: '6px 16px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {loading ? 'Loading...' : 'View Statement \u2192'}
          </button>
        </div>
        {msg && <div style={{ marginTop: 8, color: '#e53e3e', fontSize: 13 }}>{msg}</div>}
      </div>
      {proposals.length === 0 ? (
        <p style={{ color: '#666' }}>No budget proposals yet. Create one to start generating maintenance dues.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['Financial Year', 'Operational', 'Capital', 'Total', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #ddd' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposals.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.financialYear}</td>
                <td style={{ padding: '10px 12px' }}>\u20b9{parseFloat(p.operationalBudget).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 12px' }}>\u20b9{parseFloat(p.capitalBudget).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>\u20b9{parseFloat(p.totalBudget).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: p.status === 'approved' ? '#c6f6d5' : '#fefcbf', color: p.status === 'approved' ? '#276749' : '#744210' }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setStmtYear(p.financialYear); loadStatement(); }} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #3b5bdb', color: '#3b5bdb', background: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      Statement
                    </button>
                    {user?.role === 'admin' && p.status === 'draft' && (
                      <button onClick={() => approveBudget(p.id)} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #276749', color: '#276749', background: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        Approve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
