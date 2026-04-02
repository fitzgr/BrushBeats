import { useEffect, useState } from "react";

function readDeviceContext() {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isTouch: false,
      mode: "desktop"
    };
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.matchMedia("(max-width: 980px)").matches;
  const uaMobile = Boolean(window.navigator.userAgentData?.mobile);
  const uaFallback = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);
  const isMobile = uaMobile || uaFallback || (coarsePointer && smallViewport);

  return {
    isMobile,
    isTouch: coarsePointer,
    mode: isMobile ? "mobile" : "desktop"
  };
}

export function useDeviceContext() {
  const [device, setDevice] = useState(() => readDeviceContext());

  useEffect(() => {
    const coarseMq = window.matchMedia("(pointer: coarse)");
    const widthMq = window.matchMedia("(max-width: 980px)");

    const handleChange = () => {
      setDevice(readDeviceContext());
    };

    coarseMq.addEventListener("change", handleChange);
    widthMq.addEventListener("change", handleChange);
    window.addEventListener("resize", handleChange);

    return () => {
      coarseMq.removeEventListener("change", handleChange);
      widthMq.removeEventListener("change", handleChange);
      window.removeEventListener("resize", handleChange);
    };
  }, []);

  return device;
}
