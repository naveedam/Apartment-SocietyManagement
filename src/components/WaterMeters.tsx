import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Reading {
  id: string;
  flatId: string | null;
  readingType: string;
  period: string;
  photoUrl: string;
  status: string;
  previousReading: string | null;
  currentReading: string | null;
  unitsConsumed: string | null;
  ratePerUnit: string | null;
  amount: string | null;
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<{ dataUrl: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), fileName: file.name.replace(/\.[^.]+$/, '.jpg') });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function WaterMeters() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(currentPeriod());
  const [uploading, setUploading] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [flatsList, setFlatsList] = useState<{ id: string; flatNumber: string }[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string>(user?.flatId || '');
  const [readingType, setReadingType] = useState<'common_area' | 'tank_inlet'>('common_area');

  useEffect(() => {
    load();
    if (isAdmin) {
      apiFetch('/flats').then((res) => res.json()).then((data) => {
        setFlatsList((data.flats || []).map((f: any) => ({ id: f.id, flatNumber: f.flatNumber })));
      });
    }
  }, []);

  async function load() {
    setLoading(true);
    const res = await apiFetch('/water-readings');
    const data = await res.json();
    setReadings(data.readings || []);
    setLoading(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { dataUrl, fileName } = await compressImage(file);
    const body: any = { period, photoBase64: dataUrl, fileName };
    if (isAdmin) {
      body.flatId = selectedFlatId || null;
      if (!selectedFlatId) body.readingType = readingType;
    } else if (isStaff) {
      body.readingType = readingType;
    }
    await apiFetch('/water-readings', { method: 'POST', body: JSON.stringify(body) });
    setUploading(false);
    load();
  }

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

  function readingLabel(r: Reading) {
    if (r.flatId) return 'Flat';
    return r.readingType === 'tank_inlet' ? 'Tank Inlet' : 'Common Area';
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h2>Water Meter Readings</h2>

      {(user?.flatId || isStaff) && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h4>Upload a meter photo</h4>

          {isAdmin && (
            <div style={{ marginBottom: 8 }}>
              <label>Upload for</label>
              <select value={selectedFlatId} onChange={(e) => setSelectedFlatId(e.target.value)} style={{ display: 'block', padding: 6 }}>
                <option value="">Common Area / Tank Inlet</option>
                {flatsList.map((f) => (
                  <option key={f.id} value={f.id}>{f.flatNumber}{f.id === user?.flatId ? ' (my flat)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {(isStaff || (isAdmin && !selectedFlatId)) && (
            <div style={{ marginBottom: 8 }}>
              <label>Meter type</label>
              <select value={readingType} onChange={(e) => setReadingType(e.target.value as any)} style={{ display: 'block', padding: 6 }}>
                <option value="common_area">Common Area</option>
                <option value="tank_inlet">Tank Inlet (overhead tank delivery)</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <label>Month</label>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ display: 'block', padding: 6 }} />
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={uploading} />
          {uploading && <p>Uploading...</p>}
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {readings.map((r) => (
          <li key={r.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', gap: 12 }}>
            <img src={r.photoUrl} alt="meter" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }} />
            <div style={{ flex: 1 }}>
              <div>{readingLabel(r)} — {r.period}</div>
              {r.status === 'reading_entered' ? (
                <div style={{ color: '#666', fontSize: 14 }}>
                  {r.previousReading} → {r.currentReading} = {r.unitsConsumed} units · ₹{r.amount}
                </div>
              ) : (
                <div style={{ color: '#d97706', fontSize: 14 }}>Awaiting reading entry</div>
              )}
              {isAdmin && r.status !== 'reading_entered' && (
                enteringId === r.id ? (
                  <EnterReadingForm reading={r} onClose={() => setEnteringId(null)} onSaved={() => { setEnteringId(null); load(); }} />
                ) : (
                  <button onClick={() => setEnteringId(r.id)} style={{ marginTop: 6 }}>Enter reading</button>
                )
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnterReadingForm({ reading, onClose, onSaved }: { reading: Reading; onClose: () => void; onSaved: () => void }) {
  const [previousReading, setPreviousReading] = useState('');
  const [currentReading, setCurrentReading] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('0.10');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch(`/water-readings/${reading.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ previousReading, currentReading, ratePerUnit }),
    });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8, padding: 8, background: '#f9f9f9' }}>
      <input placeholder="Previous reading" value={previousReading} onChange={(e) => setPreviousReading(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Current reading" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <input placeholder="Rate per unit (₹)" value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} required style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }} />
      <button type="submit">Save</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}
