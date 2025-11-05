import React from 'react';
import { useNetworkActivity } from '../context/NetworkActivityContext';

const NetworkIndicator: React.FC = () => {
  const { isActive, message } = useNetworkActivity();

  if (!isActive) {
    return null;
  }

  return (
    <div className="network-indicator">
      <div className="progress-bar"></div>
      <span className="message">{message}</span>
    </div>
  );
};

export default NetworkIndicator;
