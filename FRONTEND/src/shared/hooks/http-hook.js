import { useCallback, useRef, useState, useEffect } from "react";

export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState();

  // useRef - will make sure array will not change acroos reneder cycles
  const activeHttpRequests = useRef([]);

  // useCallback - makes sure function wont get re-created, wont inefficient reneder cycles
  const sendRequest = useCallback(
    async (url, method = "GET", body = null, headers = {}) => {
      try {
        setIsLoading(true);

        const httpAbortCtrll = new AbortController();
        activeHttpRequests.current.push(httpAbortCtrll);

        const response = await fetch(url, {
          method,
          body,
          headers,
          signal: httpAbortCtrll.signal,
        });

        const responseData = await response.json();

        activeHttpRequests.current = activeHttpRequests.current.filter(
          (reqCtrl) => reqCtrl !== httpAbortCtrll
        );

        if (!response.ok) {
          throw new Error(responseData.message);
        }

        setIsLoading(false);
        return responseData;
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    return () => {
      // cleanup
      activeHttpRequests.current.forEach((abortCtrll) => abortCtrll.abort());
    };
  }, []);

  return { isLoading, error, sendRequest, clearError };
};
