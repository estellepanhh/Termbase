// src/context/ChildModeContext.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ChildModeContextType {
  isChildMode: boolean;
  toggleChildMode: () => void;
}

const ChildModeContext = createContext<ChildModeContextType | undefined>(undefined);

export const ChildModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isChildMode, setIsChildMode] = useState(false);

  const toggleChildMode = () => setIsChildMode(prev => !prev);

  return (
    <ChildModeContext.Provider value={{ isChildMode, toggleChildMode }}>
      {children}
    </ChildModeContext.Provider>
  );
};

export const useChildMode = () => {
  const context = useContext(ChildModeContext);
  if (context === undefined) {
    throw new Error('useChildMode must be used within a ChildModeProvider');
  }
  return context;
};