import { useCallback } from 'react';
import { useNetworkActivity } from '../context/NetworkActivityContext';

export const useNetworkMonitor = () => {
  const { startActivity, endActivity } = useNetworkActivity();

  const monitorPromise = useCallback(
    async <T,>(promise: Promise<T>, message: string): Promise<T> => {
      startActivity(message);
      try {
        return await promise;
      } finally {
        endActivity();
      }
    },
    [startActivity, endActivity]
  );

  return { monitorPromise };
};
