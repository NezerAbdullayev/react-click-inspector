import React, { CSSProperties, FC, useState } from 'react';
import { Popup } from './components';
import { useIsLocalhost } from './hooks/useIsLocalhost';
import { DevInspectorProvider } from './context';

export interface ISettingsModalProps {
  icon?: React.ReactNode;
  toggleBtnCss?: CSSProperties;
  modalCss?: CSSProperties;
  showPopup: () => void;
}

export interface IProps extends ISettingsModalProps {
  children: React.ReactNode;
  ignoredPaths?: string | string[];
}

export const ReactClickInspector: FC<IProps> = ({
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
