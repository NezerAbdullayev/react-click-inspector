import React, { CSSProperties, FC, useState } from 'react';
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

  const showPopup = () => {
    setPopupVisible(true);
    setTimeout(() => {
      setPopupVisible(false);
    }, 2000);
  };

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
