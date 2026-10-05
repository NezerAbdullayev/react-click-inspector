import React, { createContext, useEffect, useState, FC } from 'react';
import { SettingsModal } from '../components';
import { useGetPatchClickedElement } from '../hooks';
import { IdeType } from '../utils';
import { DevInspectorContextType, IDevInspectorProvider } from '../models';

export const DevInspectorContext = createContext<DevInspectorContextType | undefined>(undefined);

export const DevInspectorProvider: FC<IDevInspectorProvider> = ({
  icon,
  children,
  modalCss,
  toggleBtnCss,
  ignoredPaths,
  showPopup,
}) => {
  const [logOnly, setLogOnly] = useState<boolean>(false);
  const [openInVSCode, setOpenInVSCode] = useState<boolean>(false);
  const [openInWebStorm, setOpenInWebStorm] = useState<boolean>(false);
  const [visbTool, setVisbTool] = useState<boolean>(false);
  const [IDEType, setIDEType] = useState<IdeType>(undefined);

  useGetPatchClickedElement({
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
        visbTool,
        setLogOnly,
        setIDEType,
        setVisbTool,
        openInVSCode,
        openInWebStorm,
        setOpenInVSCode,
        setOpenInWebStorm,
      }}
    >
      {children}
      <SettingsModal {...{ icon, toggleBtnCss, modalCss }} />
    </DevInspectorContext.Provider>
  );
};
