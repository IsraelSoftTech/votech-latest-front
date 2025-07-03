import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/api';

const ExchangeRateContext = createContext();

export const useExchangeRate = () => {
  return useContext(ExchangeRateContext);
};

export const ExchangeRateProvider = ({ children }) => {
  const [rates, setRates] = useState(() => {
    const savedRates = localStorage.getItem('exchangeRates');
    return savedRates ? JSON.parse(savedRates) : {
      usd: 600, // Default: 1 USD = 600 FCFA
      eur: 655  // Default: 1 EUR = 655 FCFA
    };
  });

  // Load rates from server on mount
  useEffect(() => {
    const loadRates = async () => {
      try {
        const response = await ApiService.getExchangeRates();
        if (response && response.usd && response.eur) {
          const newRates = {
            usd: parseFloat(response.usd),
            eur: parseFloat(response.eur)
          };
          setRates(newRates);
          localStorage.setItem('exchangeRates', JSON.stringify(newRates));
        }
      } catch (error) {
        console.error('Error loading exchange rates:', error);
      }
    };
    loadRates();
  }, []);

  const updateRates = async (newRates) => {
    try {
      await ApiService.updateExchangeRates(newRates);
      setRates(newRates);
      localStorage.setItem('exchangeRates', JSON.stringify(newRates));
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      throw error;
    }
  };

  const convertAmount = (amount, fromCurrency = 'XAF', toCurrency = 'USD') => {
    const xafAmount = parseFloat(amount);
    if (isNaN(xafAmount)) return 0;

    // First convert to XAF if not already
    let inXaf = xafAmount;
    if (fromCurrency === 'USD') {
      inXaf = xafAmount * rates.usd;
    } else if (fromCurrency === 'EUR') {
      inXaf = xafAmount * rates.eur;
    }

    // Then convert to target currency
    switch (toCurrency) {
      case 'USD':
        return inXaf / rates.usd;
      case 'EUR':
        return inXaf / rates.eur;
      case 'XAF':
        return inXaf;
      default:
        return inXaf;
    }
  };

  const formatAmount = (amount, currency = 'XAF') => {
    const convertedAmount = convertAmount(amount, 'XAF', currency);
    switch (currency) {
      case 'USD':
        return `$${convertedAmount.toFixed(2)}`;
      case 'EUR':
        return `€${convertedAmount.toFixed(2)}`;
      case 'XAF':
        return `${convertedAmount.toFixed(0)} FCFA`;
      default:
        return `${convertedAmount.toFixed(0)} FCFA`;
    }
  };

  return (
    <ExchangeRateContext.Provider value={{ 
      rates, 
      updateRates, 
      convertAmount,
      formatAmount
    }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}; 