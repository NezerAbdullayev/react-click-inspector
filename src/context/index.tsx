import React, { createContext, useEffect, useState, FC } from 'react';
import { useClickInspector } from '../hooks/useClickInspector';
import { IdeType } from '../utils';
import { DevInspectorContextType, IDevInspectorProvider } from '../models';

export const DevInspectorContext = createContext<DevInspectorContextType | undefined>(undefined);

export const DevInspectorProvider: FC<IDevInspectorProvider> = ({
  children,
  ignoredPaths,
  showPopup,
}) => {
  const [logOnly, setLogOnly] = useState<boolean>(false);
  const [openInVSCode, setOpenInVSCode] = useState<boolean>(false);
  const [IDEType, setIDEType] = useState<IdeType>(undefined);

  useClickInspector({
    setOpenInVSCode,
    setLogOnly,
    openInVSCode,
    ignoredPaths,
    showPopup,
    logOnly,
    IDEType,
  });

  const isInspecting = logOnly || openInVSCode;
  useEffect(() => {
    if (!isInspecting) return;

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [isInspecting]);

  return (
    <DevInspectorContext.Provider
      value={{
        logOnly,
        IDEType,
        setLogOnly,
        setIDEType,
        openInVSCode,
        setOpenInVSCode,
      }}
    >
      {children}
    </DevInspectorContext.Provider>
  );
};
