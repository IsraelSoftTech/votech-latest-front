import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const YearContext = createContext();

export const useYear = () => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
};

export const YearProvider = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableYears] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear + i);
  });

  const fetchSelectedYear = async () => {
    try {
      console.log('YearContext: Fetching selected year...');
      // Check if we have a token before making the request
      const token = apiService.getToken();
      if (!token) {
        console.log('YearContext: No token available, using current year');
        setSelectedYear(new Date().getFullYear());
        setLoading(false);
        return;
      }

      const data = await apiService.getSelectedYear();
      console.log('YearContext: Received year data:', data);
      setSelectedYear(data.year);
      setError(null);
    } catch (err) {
      console.error('YearContext: Error fetching selected year:', err);
      setError(err.message);
      // Use current year as fallback
      const currentYear = new Date().getFullYear();
      console.log('YearContext: Using fallback year:', currentYear);
      setSelectedYear(currentYear);
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedYear = async (year) => {
    try {
      setLoading(true);
      const token = apiService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      await apiService.updateSelectedYear(year);
      setSelectedYear(year);
      setError(null);
    } catch (err) {
      console.error('YearContext: Error updating year:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelectedYear();
  }, []);

  const value = {
    selectedYear,
    setSelectedYear: updateSelectedYear,
    loading,
    error,
    availableYears,
    refreshYear: fetchSelectedYear
  };

  console.log('YearContext: Current state:', value);

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
}; 