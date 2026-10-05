import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Popup } from './Popup';
import { useIsLocalhost } from '../hooks';
import { DevInspectorProvider } from '../context';
import { IReactClickInspector } from '../models';

export const ReactClickInspector: FC<IReactClickInspector> = ({
  icon,
  children,
  modalCss,
  toggleBtnCss,
  ignoredPaths,
}) => {
  const permissions = useIsLocalhost();
  const [popupVisible, setPopupVisible] = useState(false);
  const popupTimer = useRef<ReturnType<typeof setTimeout>>();

  const showPopup = useCallback(() => {
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
        <DevInspectorProvider {...{ icon, modalCss, toggleBtnCss, ignoredPaths, showPopup }}>
          {children}
          <Popup message="success" visible={popupVisible} />
        </DevInspectorProvider>
      ) : (
        children
      )}
    </>
  );
};
