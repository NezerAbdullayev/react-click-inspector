import React, { FC, useState, CSSProperties } from 'react';
import { useDevInspector } from '../hooks';
import { ISettingsModalProps } from '../models';

export const SettingsModal: FC<ISettingsModalProps> = ({ icon, modalCss, toggleBtnCss }) => {
  const [isActive, setIsActive] = useState(false);

  const { IDEType, logOnly, setIDEType, setLogOnly, setOpenInVSCode, openInVSCode } =
    useDevInspector();

  const onLogOnlyToggle = () => {
    setLogOnly(prev => !prev);
    if (!logOnly) setIsActive(prev => !prev);
  };

  const onOpenInVSCode = () => {
    setIDEType('vsCode');
    setOpenInVSCode(prev => !prev);
    if (!openInVSCode) setIsActive(prev => !prev);
  };

  const toggleButtonStyle: CSSProperties = {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 999999,
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
    padding: '10px',
    borderRadius: 8,
    cursor: 'pointer',
    ...toggleBtnCss,
  };

  const modalStyle: CSSProperties = {
    position: 'fixed',
    bottom: 80,
    right: isActive ? 20 : -300,
    width: 300,
    height: 'auto',
    background: '#ffffff',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    zIndex: 999999,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'right 0.3s ease-in-out',
    ...modalCss,
  };

  const isVSCode = IDEType !== 'webstorm';

  return (
    <div style={{ position: 'relative' }} data-id="continue-element_debbug">
      <button style={toggleButtonStyle} onClick={() => setIsActive(!isActive)} type="button">
        {icon || (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        )}
      </button>

      <div style={modalStyle}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Settings</h2>

        <button
          type="button"
          onClick={onLogOnlyToggle}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: logOnly ? '#4caf50' : '#e0e0e0',
            color: logOnly ? 'white' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            marginBottom: 12,
          }}
        >
          Copy file path to Clipboard
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <label
            htmlFor="vsCode"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 6,
              border: `2px solid ${openInVSCode ? '#007acc' : '#ccc'}`,
              backgroundColor: openInVSCode ? '#e3f2fd' : '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: openInVSCode ? 600 : 400,
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
          >
            <input
              type="button"
              name="ide"
              id="vsCode"
              value="vsCode"
              checked={isVSCode}
              onClick={onOpenInVSCode}
              style={{ display: 'none' }}
            />
            VSCode
          </label>

          {/* // TODO: This WebStorm button is currently inactive and should be implemented later. */}
          {/* <label
            htmlFor="webstorm"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 6,
              border: `2px solid ${isWebStorm ? '#008cff' : '#ccc'}`,
              backgroundColor: isWebStorm ? '#e1f5fe' : '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: isWebStorm ? 600 : 400,
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
          >
            <input
              id="webstorm"
              type="radio"
              name="ide"
              value="webstorm"
              checked={isWebStorm}
              onChange={() => {
                setOpenInWebStorm(prev => !prev);
              }}
              style={{ display: 'none' }}
            />
            WebStorm
          </label> */}
        </div>
      </div>
    </div>
  );
};
