import React, { createContext, useEffect, useState, FC } from 'react';
import { useClickInspector } from '../hooks/useClickInspector';
import { DevInspectorContextType, IDevInspectorProvider, InspectorMode } from '../models';

export const DevInspectorContext = createContext<DevInspectorContextType | undefined>(undefined);

export const DevInspectorProvider: FC<IDevInspectorProvider> = ({
  children,
  ignoredPaths,
  openInEditorPath,
  showPopup,
}) => {
  const [mode, setMode] = useState<InspectorMode>(null);

  useClickInspector({
    mode,
    setMode,
    ignoredPaths,
    showPopup,
    openInEditorPath,
  });

  const isInspecting = mode !== null;
  useEffect(() => {
    if (!isInspecting) return;

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode(null);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.cursor = previousCursor;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isInspecting]);

  return (
    <DevInspectorContext.Provider
      value={{
        mode,
        setMode,
      }}
    >
      {children}
    </DevInspectorContext.Provider>
  );
};
