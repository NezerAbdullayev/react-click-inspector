import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Popup } from './Popup';
import { SettingsModal } from './SettingsModal';
import { useIsLocalhost } from '../hooks';
import { DevInspectorProvider } from '../context';
import { IReactClickInspector } from '../models';

export const ReactClickInspector: FC<IReactClickInspector> = ({
  icon,
  children,
  modalCss,
  toggleBtnCss,
  ignoredPaths,
  enabled,
  openInEditorPath,
}) => {
  const isLocalhost = useIsLocalhost();
  const permissions = enabled ?? isLocalhost;
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('success');
  const popupTimer = useRef<ReturnType<typeof setTimeout>>();

  const showPopup = useCallback((message = 'success') => {
    setPopupMessage(message);
    setPopupVisible(true);
    clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => {
      setPopupVisible(false);
    }, 2000);
  }, []);

  useEffect(() => () => clearTimeout(popupTimer.current), []);

  return (
    <>
      {permissions ? (
        <DevInspectorProvider {...{ ignoredPaths, openInEditorPath, showPopup }}>
          {children}
          <SettingsModal {...{ icon, toggleBtnCss, modalCss }} />
          <Popup message={popupMessage} visible={popupVisible} />
        </DevInspectorProvider>
      ) : (
        children
      )}
    </>
  );
};
