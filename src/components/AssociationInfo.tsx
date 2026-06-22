import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Association {
  id: string; name: string; address: string | null; registrationNo: string | null;
  bankAccountName: string | null; bankAccountNumber: string | null; bankIfsc: string | null; bankName: string | null;
  waterDiffEqualWeight: number; waterDiffAreaWeight: number; waterDiffConsumptionWeight: number;
}
interface OfficeBearer { id: string; designation: string; name: string; phone: string | null; email: string | null; }
interface Utility { id: string; utilityType: string; providerName: string | null; accountNumber: string | null; notes: string | null; }

export function AssociationInfo() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [association, setAssociation] = useState<Association | null>(null);
  const [officeBearers, setOfficeBearers] = useState<OfficeBearer[]>([]);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBank, setEditingBank] = useState(false);
  const [showAddBearer, setShowAddBearer] = useState(false);
  const [showAddUtility, setShowAddUtility] = useState(false);
  const [editingWeights, setEditingWeights] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiFetch('/association');
    const data = await res.json();
    setAssociation(data.association);
    setOfficeBearers(data.officeBearers || []);
    setUtilities(data.utilities || []);
    setLoading(false);
  }

  if (loading || !association) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h2>{association.name}</h2>
      <p style={{ color: '#666' }}>{association.address}</p>
      {association.registrationNo && <p style={{ color: '#666' }}>Registration No: {association.registrationNo}</p>}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>Bank Account</h3>
          {isAdmin && <button onClick={() => setEditingBank(true)}>Edit</button>}
        </div>
        {editingBank ? (
          <BankEditForm association={association} onClose={() => setEditingBank(false)} onSaved={() => { setEditingBank(false); load(); }} />
        ) : (
          <>
            <p>{association.bankAccountName || '—'}</p>
            <p>{association.bankName || '—'} {association.bankAccountNumber ? `· A/c ${association.bankAccountNumber}` : ''}</p>
            <p>{association.bankIfsc ? `IFSC: ${association.bankIfsc}` : ''}</p>
          </>
        )}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>Office Bearers</h3>
          {isAdmin && <button onClick={() => setShowAddBearer(true)}>+ Add</button>}
        </div>
        {showAddBearer && <AddBearerForm onClose={() => setShowAddBearer(false)} onCreated={() => { setShowAddBearer(false); load(); }} />}
        <ul>{officeBearers.map((b) => (<li key={b.id}>{b.designation}: {b.name} {b.phone ? `— ${b.phone}` : ''}</li>))}</ul>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>Utilities</h3>
          {isAdmin && <button onClick={() => setShowAddUtility(true)}>+ Add</button>}
        </div>
        {showAddUtility && <AddUtilityForm onClose={() => setShowAddUtility(false)} onCreated={() => { setShowAddUtility(false); load(); }} />}
        <ul>{utilities.map((u) => (<li key={u.id}>{u.utilityType}: {u.providerName || '—'} {u.accountNumber ? `(${u.accountNumber})` : ''}</li>))}</ul>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>Water Difference Cost Allocation</h3>
          {isAdmin && <button onClick={() => setEditingWeights(true)}>Edit</button>}
        </div>
        {editingWeights ? (
          <WeightsEditForm association={association} onClose={() => setEditingWeights(false)} onSaved={() => { setEditingWeights(false); load(); }} />
        ) : (
          <p>Equal: {association.waterDiffEqualWeight}% · By area: {association.waterDiffAreaWeight}% · By consumption: {association.waterDiffConsumptionWeight}%</p>
        )}
      </div>
    </div>
  );
}

function BankEditForm({ association, onClose, onSaved }: { association: Association; onClose: () => void; onSaved: () => void }) {
  const [bankAccountName, setBankAccountName] = useState(association.bankAccountName ?? '');
  const [bankName, setBankName] = useState(association.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(association.bankAccountNumber ?? '');
  const [bankIfsc, setBankIfsc] = useState(association.bankIfsc ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/association', { method: 'PATCH', body: JSON.stringify({ bankAccountName, bankName, bankAccountNumber, bankIfsc }) });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <input placeholder="Account holder name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Account number" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="IFSC" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <button type="submit">Save</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}

function AddBearerForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [designation, setDesignation] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/association/office-bearers', { method: 'POST', body: JSON.stringify({ designation, name, phone }) });
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8, padding: 8, background: '#f9f9f9' }}>
      <input placeholder="Designation (e.g. President)" value={designation} onChange={(e) => setDesignation(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <button type="submit">Add</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}

function AddUtilityForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [utilityType, setUtilityType] = useState('electricity');
  const [providerName, setProviderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/association/utilities', { method: 'POST', body: JSON.stringify({ utilityType, providerName, accountNumber }) });
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8, padding: 8, background: '#f9f9f9' }}>
      <select value={utilityType} onChange={(e) => setUtilityType(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }}>
        <option value="electricity">Electricity (BESCOM)</option>
        <option value="water">Water</option>
        <option value="gas">Gas</option>
        <option value="other">Other</option>
      </select>
      <input placeholder="Provider name" value={providerName} onChange={(e) => setProviderName(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <button type="submit">Add</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}

function WeightsEditForm({ association, onClose, onSaved }: { association: Association; onClose: () => void; onSaved: () => void }) {
  const [equalWeight, setEqualWeight] = useState(association.waterDiffEqualWeight);
  const [areaWeight, setAreaWeight] = useState(association.waterDiffAreaWeight);
  const [consumptionWeight, setConsumptionWeight] = useState(association.waterDiffConsumptionWeight);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/association', {
      method: 'PATCH',
      body: JSON.stringify({
        waterDiffEqualWeight: Number(equalWeight),
        waterDiffAreaWeight: Number(areaWeight),
        waterDiffConsumptionWeight: Number(consumptionWeight),
      }),
    });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <label>Equal split %</label>
      <input type="number" value={equalWeight} onChange={(e) => setEqualWeight(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <label>By flat area %</label>
      <input type="number" value={areaWeight} onChange={(e) => setAreaWeight(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <label>By consumption %</label>
      <input type="number" value={consumptionWeight} onChange={(e) => setConsumptionWeight(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <p style={{ fontSize: 12, color: '#888' }}>These don't need to sum to exactly 100 — they'll be normalized automatically.</p>
      <button type="submit">Save</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}
