import React from 'react';

interface PopupProps {
  message: string;
  visible: boolean;
}

export const Popup: React.FC<PopupProps> = ({ message, visible }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: "12%",
        right: '40px',
        padding: '5px 10px',
        backgroundColor: '#fff',
        color: 'black',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: 14,
        fontWeight: '600',
      }}
    >
      <span>{message}</span>
    </div>
  );
};
