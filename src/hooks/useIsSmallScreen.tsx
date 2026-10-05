import { useEffect, useState } from 'react';

const getIsSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 1500;

export const useIsSmallScreen = (): boolean => {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(getIsSmallScreen);

  useEffect(() => {
    const updateWidth = () => {
      setIsSmallScreen(getIsSmallScreen());
    };

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return isSmallScreen;
};
