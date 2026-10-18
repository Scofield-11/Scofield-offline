import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Check } from 'lucide-react';

const MODAL_SPRING = { type: 'spring', stiffness: 280, damping: 28, mass: 0.7 };
const TAB_SPRING = { type: 'spring', stiffness: 300, damping: 28, mass: 0.6 };
const ACCORDION_TRANSITION = { duration: 0.26, ease: [0.16, 1, 0.3, 1] };

function SetSelector({ sets, selectedSetId, setSelectedSetId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({ '🏠 Thư mục gốc': true });
  const [filterType, setFilterType] = useState('ja');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const validSets = useMemo(
    () => (sets || []).filter((s) => !s.title?.startsWith('_Thư mục:')),
    [sets]
  );

  useEffect(() => {
    const idStr = String(selectedSetId);
    if (idStr === 'lang_ja' || idStr === 'all_ja') {
      setFilterType('ja');
    } else if (idStr === 'lang_zh' || idStr === 'all_zh') {
      setFilterType('zh');
    } else if (idStr === 'lang_en' || idStr === 'all_en') {
      setFilterType('en');
    } else if (idStr === 'lang_kanji' || idStr === 'all_kanji') {
      setFilterType('kanji');
    } else if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
      const s = validSets.find((x) => (x.folder_path || '🏠 Thư mục gốc') === folderName);
      if (s) {
        if (s.type === 'kanji') setFilterType('kanji');
        else if (s.language === 'en') setFilterType('en');
        else if (s.language === 'zh') setFilterType('zh');
        else setFilterType('ja');
      }
    } else {
      const s = validSets.find((set) => String(set.id) === idStr);
      if (s) {
        const folderName = s.folder_path || '🏠 Thư mục gốc';
        setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
        if (s.type === 'kanji') setFilterType('kanji');
        else if (s.language === 'en') setFilterType('en');
        else if (s.language === 'zh') setFilterType('zh');
        else setFilterType('ja');
      }
    }
  }, [selectedSetId, validSets]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const countsByType = useMemo(() => {
    return {
      ja: validSets.filter((s) => s.type !== 'kanji' && (s.language === 'ja' || !s.language)).length,
      zh: validSets.filter((s) => s.type !== 'kanji' && s.language === 'zh').length,
      en: validSets.filter((s) => s.type !== 'kanji' && s.language === 'en').length,
      kanji: validSets.filter((s) => s.type === 'kanji').length,
    };
  }, [validSets]);

  const typeFilteredSets = useMemo(() => {
    return validSets.filter((s) => {
      if (filterType === 'kanji') return s.type === 'kanji';
      if (filterType === 'en') return s.type !== 'kanji' && s.language === 'en';
      if (filterType === 'zh') return s.type !== 'kanji' && s.language === 'zh';
      return s.type !== 'kanji' && (s.language === 'ja' || !s.language);
    });
  }, [validSets, filterType]);

  const totalVocabsInType = useMemo(
    () => typeFilteredSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0),
    [typeFilteredSets]
  );

  const filteredSets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return typeFilteredSets;
    return typeFilteredSets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.folder_path && s.folder_path.toLowerCase().includes(q))
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

  const handleSelect = (id) => {
    setSelectedSetId(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const triggerInfo = useMemo(() => {
    const idStr = String(selectedSetId);
    if (idStr === 'lang_kanji' || idStr === 'all_kanji') {
      const count = validSets
        .filter((s) => s.type === 'kanji')
        .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      return { icon: '⛩️', title: 'Tất cả Kanji', subtitle: 'Toàn bộ học phần Hán tự', count };
    }
    if (idStr === 'lang_ja' || idStr === 'all_ja') {
      const count = validSets
        .filter((s) => s.type !== 'kanji' && (s.language === 'ja' || !s.language))
        .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      return { icon: '🇯🇵', title: 'Tất cả từ vựng Tiếng Nhật', subtitle: 'Gộp toàn bộ học phần JA', count };
    }
    if (idStr === 'lang_zh' || idStr === 'all_zh') {
      const count = validSets
        .filter((s) => s.type !== 'kanji' && s.language === 'zh')
        .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      return { icon: '🇨🇳', title: 'Tất cả từ vựng Tiếng Trung', subtitle: 'Gộp toàn bộ học phần ZH', count };
    }
    if (idStr === 'lang_en' || idStr === 'all_en') {
      const count = validSets
        .filter((s) => s.type !== 'kanji' && s.language === 'en')
        .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      return { icon: '🇬🇧', title: 'Tất cả từ vựng Tiếng Anh', subtitle: 'Gộp toàn bộ học phần EN', count };
    }
    if (idStr.startsWith('folder_')) {
      const fName = idStr.substring(7);
      const folderSets = validSets.filter((s) => (s.folder_path || '🏠 Thư mục gốc') === fName);
      const count = folderSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
      return {
        icon: '📁',
        title: fName,
        subtitle: `Thư mục (${folderSets.length} học phần)`,
        count,
      };
    }

    const selected = validSets.find((s) => String(s.id) === idStr);
    if (selected) {
      const icon =
        selected.type === 'kanji'
          ? '⛩️'
          : selected.language === 'en'
          ? '🇬🇧'
          : selected.language === 'zh'
          ? '🇨🇳'
          : '🇯🇵';
      return {
        icon,
        title: selected.title,
        subtitle: selected.folder_path ? `📁 ${selected.folder_path}` : '🏠 Thư mục gốc',
        count: selected.vocab_count || 0,
      };
    }

    return { icon: '📚', title: 'Chọn học phần...', subtitle: 'Chạm để chọn bộ từ vựng', count: 0 };
  }, [selectedSetId, validSets]);

  const isAllTypeSelected =
    (filterType === 'ja' && ['lang_ja', 'all_ja'].includes(String(selectedSetId))) ||
    (filterType === 'zh' && ['lang_zh', 'all_zh'].includes(String(selectedSetId))) ||
    (filterType === 'en' && ['lang_en', 'all_en'].includes(String(selectedSetId))) ||
    (filterType === 'kanji' && ['lang_kanji', 'all_kanji'].includes(String(selectedSetId)));

  const langTabs = [
    { key: 'ja', label: '🇯🇵 Nhật', count: countsByType.ja },
    { key: 'zh', label: '🇨🇳 Trung', count: countsByType.zh },
    { key: 'en', label: '🇬🇧 Anh', count: countsByType.en },
    { key: 'kanji', label: '⛩️ Kanji', count: countsByType.kanji },
  ];

  return (
    <>
      <button
        type="button"
        className="set-selector-trigger"
        onClick={() => setIsOpen(true)}
      >
        <div className="set-selector-trigger-icon">{triggerInfo.icon}</div>
        <div className="set-selector-trigger-body">
          <div className="set-selector-trigger-title">{triggerInfo.title}</div>
          <div className="set-selector-trigger-sub">{triggerInfo.subtitle}</div>
        </div>
        <div className="set-selector-trigger-right">
          <span className="set-selector-count-pill">{triggerInfo.count} thẻ</span>
          <ChevronDown size={16} className="set-selector-chevron" />
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
              onClick={() => setIsOpen(false)}
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
                    setIsOpen(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="set-sheet-grabber d-md-none" />

                <div className="set-sheet-header">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">Chọn học phần ôn tập</h6>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Chọn toàn bộ, theo thư mục hoặc từng bài lẻ
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-icon-soft chip-slate"
                    onClick={() => setIsOpen(false)}
                    aria-label="Đóng"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="set-sheet-segmented">
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

                <div className="set-sheet-search">
                  <span className="set-sheet-search-icon">🔍</span>
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

                <div className="set-sheet-list">
                  {!isSearching && typeFilteredSets.length > 0 && (
                    <button
                      type="button"
                      className={`set-sheet-all-btn ${isAllTypeSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(`lang_${filterType}`)}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className="fs-5">
                          {filterType === 'kanji'
                            ? '⛩️'
                            : filterType === 'en'
                            ? '🇬🇧'
                            : filterType === 'zh'
                            ? '🇨🇳'
                            : '🇯🇵'}
                        </span>
                        <div className="text-start">
                          <div className="fw-bold" style={{ fontSize: '0.88rem' }}>
                            {filterType === 'kanji'
                              ? 'Học tất cả Kanji'
                              : filterType === 'en'
                              ? 'Học tất cả Tiếng Anh'
                              : filterType === 'zh'
                              ? 'Học tất cả Tiếng Trung'
                              : 'Học tất cả Tiếng Nhật'}
                          </div>
                          <div className="opacity-75" style={{ fontSize: '0.72rem' }}>
                            Gộp {typeFilteredSets.length} học phần
                          </div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="set-selector-count-pill">{totalVocabsInType} thẻ</span>
                        {isAllTypeSelected && <Check size={16} />}
                      </div>
                    </button>
                  )}

                  {groupedSets.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <div className="fs-2 mb-2">📭</div>
                      <div className="fw-semibold small">Không có học phần nào trong mục này</div>
                    </div>
                  ) : (
                    groupedSets.map(([folder, folderSets]) => {
                      const isExpanded = isSearching || !!expandedFolders[folder];
                      const folderVocabCount = folderSets.reduce(
                        (sum, s) => sum + (s.vocab_count || 0),
                        0
                      );
                      const isFolderSelected = String(selectedSetId) === `folder_${folder}`;

                      return (
                        <div key={folder} className="set-folder-group">
                          <div
                            className={`set-folder-header ${isFolderSelected ? 'selected' : ''}`}
                            onClick={() => toggleFolder(folder)}
                          >
                            <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
                              <motion.span
                                animate={{ rotate: isExpanded ? 0 : -90 }}
                                transition={{ duration: 0.18 }}
                                className="d-inline-flex align-items-center"
                              >
                                <ChevronDown size={15} />
                              </motion.span>
                              <span className="text-truncate fw-bold" style={{ fontSize: '0.85rem' }}>
                                {folder === '🏠 Thư mục gốc' ? '🏠 Thư mục gốc' : `📁 ${folder}`}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.74rem', flexShrink: 0 }}>
                                ({folderSets.length})
                              </span>
                            </div>

                            <button
                              type="button"
                              className={`set-folder-pick-btn ${isFolderSelected ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(`folder_${folder}`);
                              }}
                            >
                              {isFolderSelected ? '✓ Đang chọn' : `Học cả bộ (${folderVocabCount})`}
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
                                    const isSelected = String(selectedSetId) === String(s.id);
                                    const prefix =
                                      s.type === 'kanji'
                                        ? '⛩️'
                                        : s.language === 'en'
                                        ? '🇬🇧'
                                        : s.language === 'zh'
                                        ? '🇨🇳'
                                        : '🇯🇵';
                                    return (
                                      <button
                                        type="button"
                                        key={s.id}
                                        className={`set-item-row ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(s.id)}
                                      >
                                        <div className="d-flex align-items-center gap-2 overflow-hidden pe-2">
                                          <span style={{ fontSize: '0.95rem' }}>{prefix}</span>
                                          <span className="text-truncate fw-semibold">{s.title}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                          <span className="set-item-badge">{s.vocab_count || 0} thẻ</span>
                                          {isSelected && <Check size={15} className="set-item-check" />}
                                        </div>
                                      </button>
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