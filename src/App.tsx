import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { FlatsDirectory } from './components/FlatsDirectory';
import { AssociationInfo } from './components/AssociationInfo';
import { Vendors } from './components/Vendors';
import { WaterMeters } from './components/WaterMeters';

type Tab = 'flats' | 'association' | 'vendors'|'water';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('flats');

  if (loading) return <p>Loading...</p>;
  if (!user) return <LoginForm />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'flats', label: 'Flats' },
    { id: 'association', label: 'Association' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'water', label: 'Water Meters' },
  ];

  return (
    <div>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <strong>Emerald Grandeur</strong>
        <span>{user.name} ({user.role}) <button onClick={logout} style={{ marginLeft: 12 }}>Log out</button></span>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 24px', borderBottom: '1px solid #eee' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 12px', border: 'none', borderBottom: tab === t.id ? '2px solid #333' : '2px solid transparent',
            background: 'none', fontWeight: tab === t.id ? 'bold' : 'normal', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'flats' && (user.role === 'admin' ? <FlatsDirectory /> : <p style={{ padding: 24 }}>Coming soon</p>)}
      {tab === 'association' && <AssociationInfo />}
      {tab === 'vendors' && <Vendors />}
      {tab === 'water' && <WaterMeters />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
