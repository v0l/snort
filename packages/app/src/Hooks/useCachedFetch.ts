import { useEffect, useMemo, useState } from "react";

const useCachedFetch = (url, storageKey, dataProcessor = data => data) => {
  const cachedData = useMemo(() => {
    const cached = localStorage.getItem(storageKey);
    return cached ? JSON.parse(cached) : null;
  }, [storageKey]);

  const initialData = cachedData ? cachedData.data : null;
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const fetchedData = await res.json();
        const processedData = dataProcessor(fetchedData);
        setData(processedData);
        localStorage.setItem(storageKey, JSON.stringify({ data: processedData, timestamp: new Date().getTime() }));
      } catch (e) {
        setError(e);
        if (cachedData?.data) {
          setData(cachedData.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (!cachedData || (new Date().getTime() - cachedData.timestamp) / 1000 / 60 >= 15) {
      fetchData();
    }
  }, [url, storageKey, dataProcessor]);

  return { data, isLoading, error };
};

export default useCachedFetch;
