import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

function SetSelector({ sets, selectedSetId, setSelectedSetId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({ '🏠 Thư mục gốc': true });
  const [filterType, setFilterType] = useState('ja'); // 'ja' | 'en' | 'kanji'

  // Loại bỏ các bản ghi giữ chỗ thư mục rỗng
  const validSets = useMemo(
    () => (sets || []).filter((s) => !s.title?.startsWith('_Thư mục:')),
    [sets]
  );

  // Tự động đồng bộ tab ngôn ngữ và mở sẵn thư mục chứa học phần đang chọn
  useEffect(() => {
    const idStr = String(selectedSetId);
    if (idStr === 'lang_ja' || idStr === 'all_ja') {
      setFilterType('ja');
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
        else setFilterType('ja');
      }
    } else {
      const s = validSets.find((set) => String(set.id) === idStr);
      if (s) {
        const folderName = s.folder_path || '🏠 Thư mục gốc';
        setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
        if (s.type === 'kanji') setFilterType('kanji');
        else if (s.language === 'en') setFilterType('en');
        else setFilterType('ja');
      }
    }
  }, [selectedSetId, validSets]);

  // Đóng bằng phím ESC & khóa cuộn trang nền khi mở bảng chọn
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

  // Đếm số lượng học phần theo từng phân loại ngôn ngữ
  const countsByType = useMemo(() => {
    return {
      ja: validSets.filter((s) => s.type !== 'kanji' && (s.language === 'ja' || !s.language)).length,
      en: validSets.filter((s) => s.type !== 'kanji' && s.language === 'en').length,
      kanji: validSets.filter((s) => s.type === 'kanji').length,
    };
  }, [validSets]);

  // Lọc học phần theo tab ngôn ngữ
  const typeFilteredSets = useMemo(() => {
    return validSets.filter((s) => {
      if (filterType === 'kanji') return s.type === 'kanji';
      if (filterType === 'en') return s.type !== 'kanji' && s.language === 'en';
      return s.type !== 'kanji' && (s.language === 'ja' || !s.language);
    });
  }, [validSets, filterType]);

  // Tổng số từ vựng trong tab hiện tại
  const totalVocabsInType = useMemo(
    () => typeFilteredSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0),
    [typeFilteredSets]
  );

  // Lọc theo từ khóa tìm kiếm
  const filteredSets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return typeFilteredSets;
    return typeFilteredSets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.folder_path && s.folder_path.toLowerCase().includes(q))
    );
  }, [typeFilteredSets, searchTerm]);

  // Gom nhóm theo Thư mục (Đưa Thư mục gốc lên đầu tiên)
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

  // Tính toán thông tin hiển thị trên thanh Trigger
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
      const icon = selected.type === 'kanji' ? '⛩️' : selected.language === 'en' ? '🇬🇧' : '🇯🇵';
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
    (filterType === 'en' && ['lang_en', 'all_en'].includes(String(selectedSetId))) ||
    (filterType === 'kanji' && ['lang_kanji', 'all_kanji'].includes(String(selectedSetId)));

  return (
    <>
      {/* NÚT BẤM CHỌN HỌC PHẦN (TRIGGER BAR) */}
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
          <span className="set-selector-chevron">▾</span>
        </div>
      </button>

      {/* BOTTOM SHEET (MOBILE) / MODAL PICKER (DESKTOP) QUA PORTAL */}
      {isOpen &&
        ReactDOM.createPortal(
          <div className="set-sheet-backdrop" onClick={() => setIsOpen(false)}>
            <div
              className="set-sheet-panel"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Thanh kéo giả lập trên Mobile */}
              <div className="set-sheet-grabber d-md-none"></div>

              {/* Header */}
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
                  ✕
                </button>
              </div>

              {/* Segmented Tabs Ngôn ngữ */}
              <div className="set-sheet-segmented">
                <button
                  type="button"
                  className={`set-seg-btn ${filterType === 'ja' ? 'active' : ''}`}
                  onClick={() => setFilterType('ja')}
                >
                  <span>🇯🇵 Nhật</span>
                  <span className="set-seg-badge">{countsByType.ja}</span>
                </button>
                <button
                  type="button"
                  className={`set-seg-btn ${filterType === 'en' ? 'active' : ''}`}
                  onClick={() => setFilterType('en')}
                >
                  <span>🇬🇧 Anh</span>
                  <span className="set-seg-badge">{countsByType.en}</span>
                </button>
                <button
                  type="button"
                  className={`set-seg-btn ${filterType === 'kanji' ? 'active' : ''}`}
                  onClick={() => setFilterType('kanji')}
                >
                  <span>⛩️ Kanji</span>
                  <span className="set-seg-badge">{countsByType.kanji}</span>
                </button>
              </div>

              {/* Ô tìm kiếm (Không autoFocus để tránh bật bàn phím che màn hình trên điện thoại) */}
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
                    ✕
                  </button>
                )}
              </div>

              {/* Danh sách cuộn */}
              <div className="set-sheet-list">
                {/* Tùy chọn Học tất cả */}
                {!isSearching && typeFilteredSets.length > 0 && (
                  <button
                    type="button"
                    className={`set-sheet-all-btn ${isAllTypeSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(`lang_${filterType}`)}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="fs-5">
                        {filterType === 'kanji' ? '⛩️' : filterType === 'en' ? '🇬🇧' : '🇯🇵'}
                      </span>
                      <div className="text-start">
                        <div className="fw-bold" style={{ fontSize: '0.88rem' }}>
                          {filterType === 'kanji'
                            ? 'Học tất cả Kanji'
                            : filterType === 'en'
                            ? 'Học tất cả Tiếng Anh'
                            : 'Học tất cả Tiếng Nhật'}
                        </div>
                        <div className="opacity-75" style={{ fontSize: '0.72rem' }}>
                          Gộp {typeFilteredSets.length} học phần
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="set-selector-count-pill">{totalVocabsInType} thẻ</span>
                      {isAllTypeSelected && <span className="fw-bold">✓</span>}
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
                        {/* Thanh tiêu đề Thư mục */}
                        <div
                          className={`set-folder-header ${isFolderSelected ? 'selected' : ''}`}
                          onClick={() => toggleFolder(folder)}
                        >
                          <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
                            <span className="set-folder-arrow">{isExpanded ? '▾' : '▸'}</span>
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

                        {/* Danh sách học phần bên trong thư mục */}
                        {isExpanded && (
                          <div className="set-folder-items">
                            {folderSets.map((s) => {
                              const isSelected = String(selectedSetId) === String(s.id);
                              const prefix =
                                s.type === 'kanji' ? '⛩️' : s.language === 'en' ? '🇬🇧' : '🇯🇵';
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
                                    {isSelected && <span className="set-item-check">✓</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default SetSelector;