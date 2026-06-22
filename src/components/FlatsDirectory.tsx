import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch } from '../lib/api';

interface Resident {
  id: string;
  name: string;
  phone: string;
  role: string;
  ownershipType: string | null;
  isActive: boolean;
}

interface Flat {
  id: string;
  flatNumber: string;
  floor: number | null;
  flatType: string | null;
  occupancyStatus: string;
  residents: Resident[];
}

export function FlatsDirectory() {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFlat, setShowAddFlat] = useState(false);
  const [addResidentFor, setAddResidentFor] = useState<string | null>(null);
  const [editingFlat, setEditingFlat] = useState<Flat | null>(null);

  useEffect(() => {
    loadFlats();
  }, []);

  async function loadFlats() {
    setLoading(true);
    const res = await apiFetch('/flats');
    const data = await res.json();
    setFlats(data.flats || []);
    setLoading(false);
  }

  if (loading) return <p style={{ padding: 24 }}>Loading flats...</p>;

  const statusColor: Record<string, string> = {
    vacant: '#eee',
    rented: '#fef3c7',
    owner_occupied: '#dcfce7',
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Flats & Residents</h2>
        <button onClick={() => setShowAddFlat(true)}>+ Add Flat</button>
      </div>

      {showAddFlat && (
        <AddFlatForm
          onClose={() => setShowAddFlat(false)}
          onCreated={() => { setShowAddFlat(false); loadFlats(); }}
        />
      )}

      {flats.map((flat) => (
        <div key={flat.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Flat {flat.flatNumber}</strong>{' '}
              <span style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 12,
                background: statusColor[flat.occupancyStatus] || '#eee',
              }}>
                {flat.occupancyStatus.replace('_', ' ')}
              </span>
            </div>
            <div>
              <button onClick={() => setEditingFlat(flat)}>Edit</button>
              <button onClick={() => setAddResidentFor(flat.id)} style={{ marginLeft: 8 }}>+ Add Resident</button>
            </div>
          </div>

          {editingFlat?.id === flat.id && (
            <EditFlatForm
              flat={flat}
              onClose={() => setEditingFlat(null)}
              onSaved={() => { setEditingFlat(null); loadFlats(); }}
            />
          )}

          {flat.residents.length === 0 ? (
            <p style={{ color: '#888', marginTop: 8 }}>No residents added yet</p>
          ) : (
            <ul style={{ marginTop: 8 }}>
              {flat.residents.map((r) => (
                <li key={r.id}>
                  {r.name} — {r.phone} ({r.ownershipType}{r.role === 'admin' ? ', admin' : ''})
                </li>
              ))}
            </ul>
          )}

          {addResidentFor === flat.id && (
            <AddResidentForm
              flatId={flat.id}
              onClose={() => setAddResidentFor(null)}
              onCreated={() => { setAddResidentFor(null); loadFlats(); }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AddFlatForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [flatNumber, setFlatNumber] = useState('');
  const [occupancyStatus, setOccupancyStatus] = useState('owner_occupied');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await apiFetch('/flats', {
      method: 'POST',
      body: JSON.stringify({ flatNumber, occupancyStatus }),
    });
    if (res.ok) onCreated();
    else {
      const data = await res.json();
      setError(data.error || 'Failed to create flat');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h4>Add Flat</h4>
      <div style={{ marginBottom: 8 }}>
        <label>Flat number</label>
        <input value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Occupancy</label>
        <select value={occupancyStatus} onChange={(e) => setOccupancyStatus(e.target.value)} style={{ display: 'block', width: '100%', padding: 6 }}>
          <option value="owner_occupied">Owner occupied</option>
          <option value="rented">Rented</option>
          <option value="vacant">Vacant</option>
        </select>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Save</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}

function EditFlatForm({ flat, onClose, onSaved }: { flat: Flat; onClose: () => void; onSaved: () => void }) {
  const [flatNumber, setFlatNumber] = useState(flat.flatNumber);
  const [floor, setFloor] = useState(flat.floor?.toString() ?? '');
  const [flatType, setFlatType] = useState(flat.flatType ?? '');
  const [occupancyStatus, setOccupancyStatus] = useState(flat.occupancyStatus);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await apiFetch(`/flats/${flat.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        flatNumber,
        floor: floor ? Number(floor) : null,
        flatType: flatType || null,
        occupancyStatus,
      }),
    });
    if (res.ok) onSaved();
    else {
      const data = await res.json();
      setError(data.error || 'Failed to update flat');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, padding: 12, background: '#f0f7ff', borderRadius: 6 }}>
      <div style={{ marginBottom: 8 }}>
        <label>Flat number</label>
        <input value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Floor</label>
        <input value={floor} onChange={(e) => setFloor(e.target.value)} style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Type (e.g. 2BHK)</label>
        <input value={flatType} onChange={(e) => setFlatType(e.target.value)} style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Occupancy</label>
        <select value={occupancyStatus} onChange={(e) => setOccupancyStatus(e.target.value)} style={{ display: 'block', width: '100%', padding: 6 }}>
          <option value="owner_occupied">Owner occupied</option>
          <option value="rented">Rented</option>
          <option value="vacant">Vacant</option>
        </select>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Save changes</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}

function AddResidentForm({ flatId, onClose, onCreated }: { flatId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [ownershipType, setOwnershipType] = useState('owner');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await apiFetch(`/flats/${flatId}/residents`, {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, ownershipType }),
    });
    if (res.ok) onCreated();
    else {
      const data = await res.json();
      setError(data.error || 'Failed to add resident');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, padding: 12, background: '#f9f9f9', borderRadius: 6 }}>
      <div style={{ marginBottom: 8 }}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Temporary password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Type</label>
        <select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} style={{ display: 'block', width: '100%', padding: 6 }}>
          <option value="owner">Owner</option>
          <option value="tenant">Tenant</option>
        </select>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Add resident</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}