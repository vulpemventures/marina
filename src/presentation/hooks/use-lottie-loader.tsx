import lottie from 'lottie-web';
import { useCallback, useEffect } from 'react';

const useLottieLoader = (marinaLoaderRef: any) => {
  const createAnimation = () =>
    lottie.loadAnimation({
      container: marinaLoaderRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/assets/marina-lottie-loader.json',
    });
  const animationCb = useCallback(createAnimation, [createAnimation]);
  useEffect(() => {
    const anim = animationCb();
    anim.play();
    return () => lottie.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marinaLoaderRef]);
};

export default useLottieLoader;
