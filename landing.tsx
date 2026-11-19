import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from './components/LandingPage';
import { LegalModal, type LegalDocType } from './components/LegalModal';
import './index.css';

async function request<T>(path: string, payload?: object): Promise<T | null> {
  const response = await fetch('/api/landing/waitlist' + path, payload && {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.ok ? response.json() : null;
}

type Signup = { name: string; position: number; referralCode: string };
const waitlist = {
  getWaitlistCount: async () => (await request<{ count: number }>('/count'))?.count ?? 0,
  addToWaitlist: (name: string, email: string, referralCode?: string | null) =>
    request<Signup>('/join', { name, email, referralCode }),
  getWaitlistPosition: (email: string) => request<Signup>('/position', { email }),
};

function App() {
  const [legal, setLegal] = useState<LegalDocType | null>(null);
  return <>
    <LandingPage waitlist={waitlist} onOpenDocs={() => {}} onDevAdminLogin={() => {}} onOpenLegal={setLegal} />
    <LegalModal type={legal} onClose={() => setLegal(null)} />
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
