import { useEffect, useState } from 'react';

export const useWindowsWith = (): boolean => {
  const [modalWidth, setModalWidth] = useState<boolean>(false);

  const updateWidth = () => {
    setModalWidth(window.innerWidth < 1500);
  };

  useEffect(() => {
    updateWidth();

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return modalWidth;
};
