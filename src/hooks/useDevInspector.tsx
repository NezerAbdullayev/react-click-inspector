import { useContext } from 'react';
import { DevInspectorContext } from '../context/';

export const useDevInspector = () => {
  const context = useContext(DevInspectorContext);
  if (!context) throw new Error('useDevInspector must be used within a DevInspectorProvider');
  return context;
};
