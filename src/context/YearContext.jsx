import React, { createContext, useContext, useState } from 'react';

const YearContext = createContext();

export const useYear = () => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
};

export const YearProvider = ({ children }) => {
  // Default to current year if in range, else 2025
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => 2025 + i);
  const defaultYear = years.includes(currentYear) ? currentYear : 2025;

  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const value = {
    selectedYear,
    setSelectedYear,
    years,
    loading: false,
    error: null
  };

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
}; 