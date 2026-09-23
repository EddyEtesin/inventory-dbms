'use client';

import { useEffect } from 'react';

export function useAutoDismissMessage(
  message: string,
  setMessage: (message: string) => void,
  duration = 4000,
) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        setMessage('');
      }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    message,
    setMessage,
    duration,
  ]);
}