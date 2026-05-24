import React, { createContext, useContext, useState, useEffect } from 'react';
import { ENTERPRISES, Enterprise } from '../data/enterprises';

interface EnterpriseContextType {
  currentEnterpriseId: string;
  currentEnterprise: Enterprise;
  setEnterpriseId: (id: string) => void;
  enterprises: Enterprise[];
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined);

export function EnterpriseProvider({ children }: { children: React.ReactNode }) {
  const [currentEnterpriseId, setCurrentEnterpriseId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('current_enterprise_id');
      if (saved && ENTERPRISES.some(e => e.id === saved)) {
        return saved;
      }
    }
    return ENTERPRISES[0].id; // default to xingleyingai
  });

  useEffect(() => {
    localStorage.setItem('current_enterprise_id', currentEnterpriseId);
    
    // Dispatch a custom event so other listeners can react to it if needed
    const event = new CustomEvent('enterpriseChanged', { detail: currentEnterpriseId });
    window.dispatchEvent(event);
  }, [currentEnterpriseId]);

  const setEnterpriseId = (id: string) => {
    if (ENTERPRISES.some(e => e.id === id)) {
      setCurrentEnterpriseId(id);
    }
  };

  const currentEnterprise = ENTERPRISES.find(e => e.id === currentEnterpriseId) || ENTERPRISES[0];

  return (
    <EnterpriseContext.Provider value={{
      currentEnterpriseId,
      currentEnterprise,
      setEnterpriseId,
      enterprises: ENTERPRISES
    }}>
      {children}
    </EnterpriseContext.Provider>
  );
}

export function useEnterprise() {
  const context = useContext(EnterpriseContext);
  if (context === undefined) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider');
  }
  return context;
}
