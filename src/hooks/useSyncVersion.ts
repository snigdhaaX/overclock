import { useEffect, useState } from 'react';
import operationsService from '@/features/operations-analyst/services/operationsService';
import managerService from '@/features/supply-chain-manager/services/managerService';

/**
 * Hook to subscribe components to live observable updates from
 * operationsService and managerService, triggering re-renders
 * whenever underlying data changes.
 */
export function useSyncVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubOps = operationsService.subscribe(() => {
      setVersion((v) => v + 1);
    });
    const unsubMgr = managerService.subscribe(() => {
      setVersion((v) => v + 1);
    });

    return () => {
      unsubOps();
      unsubMgr();
    };
  }, []);

  return version;
}

export default useSyncVersion;

