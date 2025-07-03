import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const navigateWithLoader = (path) => {
    setIsLoading(true);
    // Wait for loader to complete (1.5 seconds) before navigating
    setTimeout(() => {
      navigate(path);
      // Reset loading state after navigation
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }, 1500);
  };

  return (
    <NavigationContext.Provider value={{ navigateWithLoader }}>
      {isLoading && <Loader />}
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext; 