import React, { FC, ReactNode } from 'react';

export const LibraryButton: FC<{ children: ReactNode }> = ({ children }) => (
  <button type="button">{children}</button>
);
