import React, { createContext, useState, useContext, type ReactNode } from 'react';

interface NetworkActivityState {
  isActive: boolean;
  message: string;
  startActivity: (message: string) => void;
  endActivity: () => void;
}

const NetworkActivityContext = createContext<NetworkActivityState | undefined>(undefined);

export const NetworkActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');

  const startActivity = (msg: string) => {
    setMessage(msg);
    setIsActive(true);
  };

  const endActivity = () => {
    setIsActive(false);
    setMessage('');
  };

  return (
    <NetworkActivityContext.Provider value={{ isActive, message, startActivity, endActivity }}>
      {children}
    </NetworkActivityContext.Provider>
  );
};

export const useNetworkActivity = () => {
  const context = useContext(NetworkActivityContext);
  if (context === undefined) {
    throw new Error('useNetworkActivity must be used within a NetworkActivityProvider');
  }
  return context;
};
