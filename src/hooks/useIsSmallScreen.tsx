import { useEffect, useState } from 'react';

export const useIsSmallScreen = (): boolean => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  const updateWidth = () => {
    setIsSmallScreen(window.innerWidth < 1500);
  };

  useEffect(() => {
    updateWidth();

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return isSmallScreen;
};
