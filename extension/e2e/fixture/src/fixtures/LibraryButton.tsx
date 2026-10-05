import { ReactNode } from 'react';

interface ILibraryButtonProps {
  testId: string;
  onClick: () => void;
  children: ReactNode;
}

export const LibraryButton = ({ testId, onClick, children }: ILibraryButtonProps) => (
  <button type="button" className="library-button" data-testid={testId} onClick={onClick}>
    {children}
  </button>
);
