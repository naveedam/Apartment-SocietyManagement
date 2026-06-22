import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Vendor { id: string; category: string; name: string; phone: string | null; notes: string | null; }

const CATEGORY_LABELS: Record<string, string> = {
  water_tanker: 'Water Tanker', electrician: 'Electrician', plumber: 'Plumber',
  lift_amc: 'Lift AMC', ups: 'UPS', cctv: 'CCTV', other: 'Other',
};

export function Vendors() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiFetch('/vendors');
    const data = await res.json();
    setVendors(data.vendors || []);
    setLoading(false);
  }

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Vendors</h2>
        {isAdmin && <button onClick={() => setShowAdd(true)}>+ Add Vendor</button>}
      </div>
      {showAdd && <AddVendorForm onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />}
      {vendors.length === 0 ? (
        <p style={{ color: '#888' }}>No vendors added yet</p>
      ) : (
        <ul>
          {vendors.map((v) => (
            <li key={v.id} style={{ marginBottom: 8 }}>
              <strong>{CATEGORY_LABELS[v.category] || v.category}</strong>: {v.name} {v.phone ? `— ${v.phone}` : ''}
              {v.notes && <div style={{ color: '#888', fontSize: 13 }}>{v.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddVendorForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [category, setCategory] = useState('plumber');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/vendors', { method: 'POST', body: JSON.stringify({ category, name, phone, notes }) });
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }}>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
      </select>
      <input placeholder="Name / company" value={name} onChange={(e) => setName(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Notes (rates, contract details, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <button type="submit">Add</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}
