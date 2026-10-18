import React, { createContext, useState, useCallback } from 'react';
import api from '../api/axiosConfig';

export const VocabContext = createContext();

export const VocabProvider = ({ children }) => {
  const [sets, setSets] = useState([]);
  const [globalStats, setGlobalStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 1000;
  const [studyProgress, setStudyProgress] = useState(0);

  const [hasFetchedSets, setHasFetchedSets] = useState(false);

  // Tải danh sách Học phần (Chỉ load tên và thông tin cơ bản, không load chi tiết từ vựng)
  const fetchSets = useCallback(async (isLoadMore = false, forceRefresh = false) => {
    if (hasFetchedSets && !isLoadMore && !forceRefresh) return;
    if (!isLoadMore) setLoading(true);
    try {
      const currentSkip = isLoadMore ? (page + 1) * LIMIT : 0;
      const res = await api.get(`/sets?skip=${currentSkip}&limit=${LIMIT}`);
      if (isLoadMore) {
        setSets(prev => [...prev, ...res.data]);
        setPage(page + 1);
      } else {
        setSets(res.data);
        setPage(0);
      }
      setHasMore(res.data.length === LIMIT);
      setHasFetchedSets(true);
    } catch (error) {
      console.error("Lỗi khi tải danh sách học phần:", error);
    } finally {
      if (!isLoadMore) setLoading(false);
    }
  }, [hasFetchedSets, page]);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const res = await api.get('/stats/global');
      setGlobalStats(res.data);
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error);
    }
  }, []);

  React.useEffect(() => {
    const handleCloudSynced = () => {
      fetchSets(false, true);
      fetchGlobalStats();
    };
    window.addEventListener('scofield-cloud-synced', handleCloudSynced);
    window.addEventListener('scofield-auth-changed', handleCloudSynced);
    return () => {
      window.removeEventListener('scofield-cloud-synced', handleCloudSynced);
      window.removeEventListener('scofield-auth-changed', handleCloudSynced);
    };
  }, [fetchSets, fetchGlobalStats]);

  return (
    <VocabContext.Provider value={{ 
      sets, setSets, 
      globalStats, fetchGlobalStats, 
      loading, setLoading,
      fetchSets, 
      hasMore, 
      studyProgress, setStudyProgress 
    }}>
      {children}
    </VocabContext.Provider>
  );
};