import { useEffect, useState } from 'react';

export const useWindowsWith = (): number => {
  const [modalWidth, setModalWidth] = useState(300);

  useEffect(() => {
    const updateWidth = () => {
      setModalWidth(window.innerWidth < 1400 ? 220 : 300);
    };

    updateWidth();

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return modalWidth;
};
