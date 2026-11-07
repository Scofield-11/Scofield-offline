import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  X,
  Check,
  Search,
  Folder,
  FolderOpen,
  BookOpen,
  ScrollText,
  Home,
  Clock,
  Layers,
  Sparkles,
  ChevronsUpDown,
} from 'lucide-react';

const MODAL_SPRING = { type: 'spring', stiffness: 280, damping: 28, mass: 0.7 };
const TAB_SPRING = { type: 'spring', stiffness: 300, damping: 28, mass: 0.6 };
const ACCORDION_TRANSITION = { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

// Hàm render Huy hiệu Ngôn ngữ Nổi bật (Vivid Language Badge)
function renderLanguageBadge(kind, lang) {
  if (kind === 'kanji' || lang === 'kanji') {
    return (
      <div className="set-lang-badge set-lang-badge--kanji" title="Kanji / Hán tự">
        <ScrollText size={18} strokeWidth={2.4} />
      </div>
    );
  }
  if (kind === 'zh' || lang === 'zh') {
    return (
      <div className="set-lang-badge set-lang-badge--zh" title="Tiếng Trung (Mandarin)">
        <span className="set-lang-badge-text">中</span>
      </div>
    );
  }
  if (kind === 'en' || lang === 'en') {
    return (
      <div className="set-lang-badge set-lang-badge--en" title="Tiếng Anh (English)">
        <span className="set-lang-badge-text">EN</span>
      </div>
    );
  }
  if (kind === 'folder') {
    return (
      <div className="set-lang-badge set-lang-badge--folder" title="Thư mục học phần">
        <Folder size={18} strokeWidth={2.4} />
      </div>
    );
  }
  if (kind === 'multi') {
    return (
      <div className="set-lang-badge set-lang-badge--ja" title="Gộp nhiều học phần">
        <Layers size={18} strokeWidth={2.4} />
      </div>
    );
  }
  if (kind === 'empty') {
    return (
      <div className="set-lang-badge set-lang-badge--empty position-relative" title="Chưa chọn học phần">
        <FolderOpen size={19} strokeWidth={2.3} color="#FFFFFF" />
        <span className="set-lang-badge-dot">
          <Sparkles size={9} strokeWidth={3} />
        </span>
      </div>
    );
  }
  // Mặc định: Tiếng Nhật (JA Sakura Red/Violet)
  return (
    <div className="set-lang-badge set-lang-badge--ja" title="Tiếng Nhật (Japanese)">
      <span className="set-lang-badge-text">あ</span>
    </div>
  );
}

function SetSelector({ sets, selectedSetId, setSelectedSetId, isOpenExternal, onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [filterType, setFilterType] = useState('ja');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [multiSelectedIds, setMultiSelectedIds] = useState([]);
  const [recentItems, setRecentItems] = useState([]);

  // Đồng bộ prop isOpenExternal nếu có
  useEffect(() => {
    if (typeof isOpenExternal === 'boolean') {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const handleOpenModal = (open) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  // Lắng nghe sự kiện toàn cục mở popup từ bất kỳ nút CTA nào
  useEffect(() => {
    const handleOpen = () => handleOpenModal(true);
    window.addEventListener('scofield-open-set-selector', handleOpen);
    return () => window.removeEventListener('scofield-open-set-selector', handleOpen);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const validSets = useMemo(
    () => (sets || []).filter((s) => !s.title?.startsWith('_Thư mục:')),
    [sets]
  );

  const countsByType = useMemo(() => {
    return {
      ja: validSets.filter((s) => s.type !== 'kanji' && (s.language === 'ja' || !s.language)).length,
      zh: validSets.filter((s) => s.type !== 'kanji' && s.language === 'zh').length,
      en: validSets.filter((s) => s.type !== 'kanji' && s.language === 'en').length,
      kanji: validSets.filter((s) => s.type === 'kanji').length,
    };
  }, [validSets]);

  // Đồng bộ filterType theo selectedSetId (chỉ khi có giá trị hợp lệ, KHÔNG tự mở folder)
  useEffect(() => {
    if (!selectedSetId) return;
    const idStr = String(selectedSetId);
    if (idStr.startsWith('multi_')) {
      const ids = idStr.replace('multi_', '').split(',').map(Number);
      const first = validSets.find((s) => ids.includes(Number(s.id)));
      if (first) {
        if (first.type === 'kanji') setFilterType('kanji');
        else if (first.language === 'en') setFilterType('en');
        else if (first.language === 'zh') setFilterType('zh');
        else setFilterType('ja');
      }
      return;
    }
    if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      const s = validSets.find((x) => (x.folder_path || '🏠 Thư mục gốc') === folderName);
      if (s) {
        if (s.type === 'kanji') setFilterType('kanji');
        else if (s.language === 'en') setFilterType('en');
        else if (s.language === 'zh') setFilterType('zh');
        else setFilterType('ja');
      }
      return;
    }
    const s = validSets.find((set) => String(set.id) === idStr);
    if (s) {
      if (s.type === 'kanji') setFilterType('kanji');
      else if (s.language === 'en') setFilterType('en');
      else if (s.language === 'zh') setFilterType('zh');
      else setFilterType('ja');
    }
  }, [selectedSetId, validSets]);

  // Tự động chuyển sang tab đầu tiên có dữ liệu nếu tab hiện tại trống
  useEffect(() => {
    if (validSets.length === 0) return;
    const availableKeys = ['ja', 'zh', 'en', 'kanji'].filter((k) => countsByType[k] > 0);
    if (availableKeys.length === 0) return;

    if (!availableKeys.includes(filterType)) {
      setFilterType(availableKeys[0]);
    }
  }, [validSets, countsByType, filterType]);

  // LỖI 1 FIX: Khởi tạo multiSelectedIds khi mở popup, CHỈ nạp nếu selectedSetId là multi_
  useEffect(() => {
    if (isOpen) {
      const idStr = String(selectedSetId || '');
      if (idStr.startsWith('multi_')) {
        const ids = idStr.replace('multi_', '').split(',').map(Number).filter(Boolean);
        setMultiSelectedIds(ids);
      } else {
        setMultiSelectedIds([]);
      }
    }
  }, [isOpen, selectedSetId]);

  // Đọc danh sách Recent Sets từ localStorage
  const loadRecentItems = () => {
    try {
      const stored = localStorage.getItem('scofield_recent_set_ids');
      if (!stored) {
        setRecentItems([]);
        return;
      }
      const list = JSON.parse(stored);
      if (!Array.isArray(list)) {
        setRecentItems([]);
        return;
      }
      const parsed = list
        .map((recentId) => {
          const idStr = String(recentId);
          if (idStr.startsWith('multi_')) {
            const ids = idStr.replace('multi_', '').split(',').map(Number);
            const selSets = validSets.filter((s) => ids.includes(Number(s.id)));
            if (selSets.length === 0) return null;
            const count = selSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
            return {
              id: recentId,
              title: `Gộp ${selSets.length} học phần`,
              subtitle: selSets.map((s) => s.title).slice(0, 2).join(', '),
              count,
              type: selSets[0]?.type === 'kanji' ? 'kanji' : (selSets[0]?.language || 'ja'),
            };
          }
          if (idStr.startsWith('folder_')) {
            const fName = idStr.substring(7);
            const folderSets = validSets.filter((s) => (s.folder_path || '🏠 Thư mục gốc') === fName);
            if (folderSets.length === 0) return null;
            const count = folderSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
            return {
              id: recentId,
              title: fName === '🏠 Thư mục gốc' ? 'Thư mục gốc' : fName,
              subtitle: `Thư mục (${folderSets.length} bài)`,
              count,
              type: folderSets[0]?.type === 'kanji' ? 'kanji' : (folderSets[0]?.language || 'ja'),
            };
          }
          const s = validSets.find((x) => String(x.id) === idStr);
          if (!s) return null;
          return {
            id: recentId,
            title: s.title,
            subtitle: s.folder_path || 'Thư mục gốc',
            count: s.vocab_count || 0,
            type: s.type === 'kanji' ? 'kanji' : (s.language || 'ja'),
          };
        })
        .filter(Boolean);
      setRecentItems(parsed);
    } catch (e) {
      setRecentItems([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecentItems();
    }
  }, [isOpen, validSets]);

  // Lưu ID vào recent sets
  const saveToRecent = (id) => {
    if (!id) return;
    try {
      const stored = localStorage.getItem('scofield_recent_set_ids');
      const list = stored ? JSON.parse(stored) : [];
      const next = [id, ...list.filter((x) => String(x) !== String(id))].slice(0, 3);
      localStorage.setItem('scofield_recent_set_ids', JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save recent set', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleOpenModal(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const typeFilteredSets = useMemo(() => {
    return validSets.filter((s) => {
      if (filterType === 'kanji') return s.type === 'kanji';
      if (filterType === 'en') return s.type !== 'kanji' && s.language === 'en';
      if (filterType === 'zh') return s.type !== 'kanji' && s.language === 'zh';
      return s.type !== 'kanji' && (s.language === 'ja' || !s.language);
    });
  }, [validSets, filterType]);

  const filteredSets = useMemo(() => {
    const norm = (str) =>
      String(str || '')
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    const q = norm(searchTerm);
    if (!q) return typeFilteredSets;
    return typeFilteredSets.filter(
      (s) => norm(s.title).includes(q) || norm(s.folder_path).includes(q)
    );
  }, [typeFilteredSets, searchTerm]);

  const groupedSets = useMemo(() => {
    const map = {};
    filteredSets.forEach((set) => {
      const folder = set.folder_path || '🏠 Thư mục gốc';
      if (!map[folder]) map[folder] = [];
      map[folder].push(set);
    });

    const entries = Object.entries(map).sort(([folderA], [folderB]) => {
      if (folderA === '🏠 Thư mục gốc') return -1;
      if (folderB === '🏠 Thư mục gốc') return 1;
      return folderA.localeCompare(folderB);
    });
    return entries;
  }, [filteredSets]);

  const isSearching = searchTerm.trim().length > 0;

  const toggleFolder = (folder) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  // Tính xem tất cả thư mục có đang mở không
  const areAllExpanded = useMemo(() => {
    return groupedSets.length > 0 && groupedSets.every(([f]) => Boolean(expandedFolders[f]));
  }, [groupedSets, expandedFolders]);

  const toggleAllFolders = () => {
    const nextState = !areAllExpanded;
    const updated = {};
    groupedSets.forEach(([f]) => {
      updated[f] = nextState;
    });
    setExpandedFolders(updated);
  };

  // 1-Chạm: Chọn ngay và đóng popup
  const handleSelect = (id) => {
    setSelectedSetId(id);
    saveToRecent(id);
    handleOpenModal(false);
    setSearchTerm('');
  };

  // Toggle Checkbox Multi-select
  const toggleMultiSelect = (id, e) => {
    e.stopPropagation();
    const idNum = Number(id);
    setMultiSelectedIds((prev) => {
      if (prev.includes(idNum)) {
        return prev.filter((x) => x !== idNum);
      } else {
        return [...prev, idNum];
      }
    });
  };

  // Áp dụng danh sách đã tích chọn
  const handleApplyMulti = () => {
    if (multiSelectedIds.length === 0) return;
    if (multiSelectedIds.length === 1) {
      handleSelect(multiSelectedIds[0]);
    } else {
      handleSelect(`multi_${multiSelectedIds.join(',')}`);
    }
  };

  // Tổng số thẻ đã chọn trong multi
  const multiSelectedTotalCards = useMemo(() => {
    if (multiSelectedIds.length === 0) return 0;
    return validSets
      .filter((s) => multiSelectedIds.includes(Number(s.id)))
      .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
  }, [multiSelectedIds, validSets]);

  const triggerInfo = useMemo(() => {
    const idStr = String(selectedSetId || '');
    if (!idStr) {
      return {
        kind: 'empty',
        lang: 'ja',
        title: 'Bấm để chọn học phần...',
        subtitle: 'Chọn 1 bài, nhiều bài hoặc cả thư mục',
        count: 0,
        isEmpty: true,
      };
    }

    if (idStr.startsWith('multi_')) {
      const ids = idStr.replace('multi_', '').split(',').map(Number);
      const selSets = validSets.filter((s) => ids.includes(Number(s.id)));
      const count = selSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      const firstSet = selSets[0];
      const kind = firstSet ? (firstSet.type === 'kanji' ? 'kanji' : (firstSet.language || 'ja')) : 'multi';
      const names = selSets.map((s) => s.title);
      const subtitleText = names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')}... (+${names.length - 2})`;
      return {
        kind: 'multi',
        lang: kind,
        title: `Đã chọn ${selSets.length} học phần`,
        subtitle: subtitleText,
        count,
        isEmpty: false,
      };
    }

    if (idStr.startsWith('folder_')) {
      const fName = idStr.substring(7);
      const folderSets = validSets.filter((s) => (s.folder_path || '🏠 Thư mục gốc') === fName);
      const count = folderSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      const firstSet = folderSets[0];
      const kind = firstSet ? (firstSet.type === 'kanji' ? 'kanji' : (firstSet.language || 'ja')) : 'folder';
      return {
        kind: 'folder',
        lang: kind,
        title: fName === '🏠 Thư mục gốc' ? 'Thư mục gốc' : fName,
        subtitle: `Cả thư mục (${folderSets.length} học phần)`,
        count,
        isEmpty: false,
      };
    }

    const selected = validSets.find((s) => String(s.id) === idStr);
    if (selected) {
      const kind = selected.type === 'kanji' ? 'kanji' : (selected.language || 'ja');
      return {
        kind,
        lang: selected.language || (selected.type === 'kanji' ? 'kanji' : 'ja'),
        title: selected.title,
        subtitle: selected.folder_path ? selected.folder_path : 'Thư mục gốc',
        count: selected.vocab_count || 0,
        isEmpty: false,
      };
    }

    return {
      kind: 'empty',
      lang: 'ja',
      title: 'Bấm để chọn học phần...',
      subtitle: 'Chọn 1 bài, nhiều bài hoặc cả thư mục',
      count: 0,
      isEmpty: true,
    };
  }, [selectedSetId, validSets]);

  const allLangTabs = [
    { key: 'ja', label: 'Tiếng Nhật', count: countsByType.ja },
    { key: 'zh', label: 'Tiếng Trung', count: countsByType.zh },
    { key: 'en', label: 'Tiếng Anh', count: countsByType.en },
    { key: 'kanji', label: 'Kanji', count: countsByType.kanji },
  ];
  const createdLangTabs = allLangTabs.filter((tab) => tab.count > 0);
  const langTabs = createdLangTabs.length > 0 ? createdLangTabs : allLangTabs;

  return (
    <>
      <button
        type="button"
        className={`set-selector-trigger ${triggerInfo.isEmpty ? 'set-selector-trigger--empty' : ''}`}
        onClick={() => handleOpenModal(true)}
      >
        <div className="set-selector-trigger-icon">
          {renderLanguageBadge(triggerInfo.kind, triggerInfo.lang)}
        </div>
        <div className="set-selector-trigger-body">
          <div className="set-selector-trigger-title">{triggerInfo.title}</div>
          <div className="set-selector-trigger-sub">{triggerInfo.subtitle}</div>
        </div>
        <div className="set-selector-trigger-right">
          {triggerInfo.isEmpty ? (
            <span className="set-selector-required-pill">Bắt buộc</span>
          ) : (
            <span className="set-selector-count-pill">{triggerInfo.count} thẻ</span>
          )}
          <ChevronDown size={16} strokeWidth={2.2} className="set-selector-chevron" />
        </div>
      </button>

      {ReactDOM.createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="set-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => handleOpenModal(false)}
            >
              <motion.div
                className="set-sheet-panel"
                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 12 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                transition={MODAL_SPRING}
                drag={isMobile ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 500) {
                    handleOpenModal(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="set-sheet-grabber d-md-none" />

                {/* Header cố định */}
                <div className="set-sheet-header">
                  <div>
                    <h6 className="fw-bold mb-0 text-main">Chọn học phần ôn tập</h6>
                    <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      Bấm vào Thư mục để mở danh sách bài • Tích ô vuông để gộp nhiều bài
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-icon-soft chip-slate"
                    onClick={() => handleOpenModal(false)}
                    aria-label="Đóng"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Segmented Language Tabs cố định */}
                <div
                  className="set-sheet-segmented"
                  style={{ gridTemplateColumns: `repeat(${langTabs.length}, minmax(0, 1fr))` }}
                >
                  {langTabs.map((tab) => {
                    const active = filterType === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        className={`set-seg-btn ${active ? 'active' : ''}`}
                        onClick={() => setFilterType(tab.key)}
                      >
                        {active && (
                          <motion.div
                            layoutId="setLangSegment"
                            className="set-seg-pill"
                            transition={TAB_SPRING}
                          />
                        )}
                        <span>{tab.label}</span>
                        <span className="set-seg-badge">{tab.count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Thanh tìm kiếm & Nút Thu gọn / Mở rộng */}
                <div className="d-flex align-items-center gap-2 mb-2 flex-shrink-0">
                  <div className="set-sheet-search flex-grow-1 mb-0">
                    <Search size={15} strokeWidth={2.2} className="set-sheet-search-icon" />
                    <input
                      type="text"
                      className="set-sheet-search-input"
                      placeholder="Tìm nhanh tên học phần hoặc thư mục..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="set-sheet-search-clear"
                        onClick={() => setSearchTerm('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="set-folder-toggle-all-btn"
                    onClick={toggleAllFolders}
                    title={areAllExpanded ? 'Thu gọn tất cả thư mục' : 'Mở rộng tất cả thư mục'}
                  >
                    <ChevronsUpDown size={15} strokeWidth={2.2} />
                    <span className="d-none d-sm-inline">
                      {areAllExpanded ? 'Thu gọn' : 'Mở rộng'}
                    </span>
                  </button>
                </div>

                {/* Danh sách cuộn mượt */}
                <div className="set-sheet-list">
                  {/* Khu vực "Vừa chọn gần đây" (Recent Sets) */}
                  {!isSearching && recentItems.length > 0 && (
                    <div className="set-recent-section">
                      <div className="set-recent-header">
                        <Clock size={13} strokeWidth={2.2} />
                        <span>Vừa chọn gần đây</span>
                      </div>
                      <div className="set-recent-chips">
                        {recentItems.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className={`set-recent-chip ${String(selectedSetId) === String(item.id) ? 'selected' : ''}`}
                            onClick={() => handleSelect(item.id)}
                            title={item.title}
                          >
                            <span className={`set-item-lang-pill set-item-lang-pill--${item.type}`}>
                              {item.type === 'kanji' ? '漢' : item.type === 'en' ? 'EN' : item.type === 'zh' ? '中' : 'あ'}
                            </span>
                            <span className="set-recent-chip-title">{item.title}</span>
                            <span className="set-recent-chip-count">{item.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Danh sách Thư mục và Học phần */}
                  {groupedSets.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <FolderOpen size={40} strokeWidth={1.8} className="text-secondary opacity-60 mb-2" />
                      <div className="fw-semibold small">Không tìm thấy học phần nào</div>
                    </div>
                  ) : (
                    groupedSets.map(([folder, folderSets]) => {
                      const isExpanded = isSearching || Boolean(expandedFolders[folder]);
                      const folderVocabCount = folderSets.reduce(
                        (sum, s) => sum + (s.vocab_count || 0),
                        0
                      );
                      const isFolderSelected = String(selectedSetId) === `folder_${folder}`;
                      const containsSelectedSet = Boolean(
                        selectedSetId &&
                        !isFolderSelected &&
                        folderSets.some((s) => String(s.id) === String(selectedSetId))
                      );

                      return (
                        <div
                          key={folder}
                          className={`set-folder-group ${containsSelectedSet ? 'has-selected-child' : ''}`}
                        >
                          <div
                            className={`set-folder-header ${isFolderSelected ? 'selected' : ''}`}
                            onClick={() => toggleFolder(folder)}
                          >
                            <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
                              <motion.span
                                animate={{ rotate: isExpanded ? 0 : -90 }}
                                transition={{ duration: 0.18 }}
                                className="d-inline-flex align-items-center text-secondary"
                              >
                                <ChevronDown size={15} strokeWidth={2.2} />
                              </motion.span>

                              {/* Hộp Icon Thư mục với trạng thái Đóng/Mở */}
                              <div className={`set-folder-icon-box ${isExpanded ? 'open' : ''}`}>
                                {isExpanded ? (
                                  <FolderOpen size={17} strokeWidth={2.2} />
                                ) : (
                                  <Folder size={17} strokeWidth={2.2} />
                                )}
                              </div>

                              <div className="d-flex flex-column min-w-0">
                                <div className="d-flex align-items-center gap-1.5">
                                  <span className="text-truncate fw-bold text-main" style={{ fontSize: '0.86rem' }}>
                                    {folder === '🏠 Thư mục gốc' ? 'Thư mục gốc' : folder}
                                  </span>
                                  {containsSelectedSet && (
                                    <span
                                      className="set-folder-active-dot"
                                      title="Có học phần đang được chọn trong thư mục này"
                                    />
                                  )}
                                </div>
                                <span className="text-secondary" style={{ fontSize: '0.72rem' }}>
                                  {folderSets.length} bài • {folderVocabCount} thẻ
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`set-folder-pick-btn ${isFolderSelected ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(`folder_${folder}`);
                              }}
                            >
                              {isFolderSelected ? '✓ Đang chọn' : `Học cả bộ`}
                            </button>
                          </div>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={ACCORDION_TRANSITION}
                                style={{ overflow: 'hidden' }}
                              >
                                <div className="set-folder-items">
                                  {folderSets.map((s) => {
                                    const isSingleSelected = String(selectedSetId) === String(s.id);
                                    const isChecked = multiSelectedIds.includes(Number(s.id));

                                    return (
                                      <div
                                        key={s.id}
                                        className={`set-item-row ${isSingleSelected ? 'selected' : ''} ${isChecked ? 'multi-checked' : ''}`}
                                        onClick={() => handleSelect(s.id)}
                                      >
                                        <div className="d-flex align-items-center gap-2 overflow-hidden pe-2 flex-grow-1">
                                          <span
                                            className={`set-item-lang-pill set-item-lang-pill--${
                                              s.type === 'kanji' ? 'kanji' : s.language || 'ja'
                                            }`}
                                          >
                                            {s.type === 'kanji'
                                              ? '漢'
                                              : s.language === 'en'
                                              ? 'EN'
                                              : s.language === 'zh'
                                              ? '中'
                                              : 'あ'}
                                          </span>
                                          <span className="text-truncate fw-semibold">{s.title}</span>
                                        </div>

                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                          <span className="set-item-badge">{s.vocab_count || 0} thẻ</span>

                                          {/* Checkbox chọn gộp nhiều bài */}
                                          <button
                                            type="button"
                                            className={`set-item-checkbox ${isChecked ? 'checked' : ''}`}
                                            onClick={(e) => toggleMultiSelect(s.id, e)}
                                            title="Tích chọn để gộp nhiều bài"
                                            aria-label={`Tích chọn ${s.title}`}
                                          >
                                            {isChecked && <Check size={12} strokeWidth={3} />}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sticky Footer Bar khi có tích chọn Multi-Select */}
                <AnimatePresence>
                  {multiSelectedIds.length > 0 && (
                    <motion.div
                      className="set-sheet-footer"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="set-sheet-footer-info">
                        <span className="fw-bold text-main">
                          Đã chọn {multiSelectedIds.length} học phần
                        </span>
                        <span className="text-secondary small">
                          • {multiSelectedTotalCards} thẻ tổng cộng
                        </span>
                      </div>
                      <div className="set-sheet-footer-actions">
                        <button
                          type="button"
                          className="set-sheet-footer-clear"
                          onClick={() => setMultiSelectedIds([])}
                        >
                          Bỏ chọn
                        </button>
                        <button
                          type="button"
                          className="set-sheet-footer-apply"
                          onClick={handleApplyMulti}
                        >
                          <Sparkles size={14} strokeWidth={2.4} />
                          <span>Áp dụng ngay</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default SetSelector;
