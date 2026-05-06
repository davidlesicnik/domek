"use client";

import { useEffect, useState } from "react";

export function useCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateValue = () => setIsCoarsePointer(mediaQuery.matches);

    updateValue();
    mediaQuery.addEventListener("change", updateValue);

    return () => mediaQuery.removeEventListener("change", updateValue);
  }, []);

  return isCoarsePointer;
}
