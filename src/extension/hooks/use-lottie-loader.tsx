import lottie from 'lottie-web';
import { useCallback, useEffect } from 'react';

const useLottieLoader = (marinaLoaderRef: any, path: string) => {
  const createAnimation = () =>
    lottie.loadAnimation({
      container: marinaLoaderRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: path,
    });
  const animationCb = useCallback(createAnimation, [createAnimation]);
  useEffect(() => {
    const anim = animationCb();
    anim.play();
    return () => lottie.destroy();
  }, [animationCb, marinaLoaderRef]);
};

export default useLottieLoader;
