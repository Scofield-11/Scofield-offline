import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';
import EditKanjiModal from '../components/EditKanjiModal';
import LoadingSkeleton from '../components/LoadingSkeleton';

function KanjiDictionary() {
  const [kanjiSets, setKanjiSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isImportExpanded, setIsImportExpanded] = useState(false);
  const [expandedSets, setExpandedSets] = useState({});
  
  const [importTitle, setImportTitle] = useState("");
  const [importText, setImportText] = useState("");
  const [editingKanji, setEditingKanji] = useState(null);

  // State hỗ trợ Thư mục
  const [currentPath, setCurrentPath] = useState("");
  const [customFolders, setCustomFolders] = useState([]);
  const [importFolderPath, setImportFolderPath] = useState("");

  useEffect(() => {
    setImportFolderPath(currentPath);
  }, [currentPath]);

  const fetchKanjiSets = async () => {
    try {
      const res = await api.get('/kanji-sets');
      setKanjiSets(res.data);
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu Kanji");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKanjiSets();
  }, []);

  const handleImport = async () => {
    if (!importTitle.trim()) return toast.warning("Vui lòng nhập tên học phần Kanji!");
    if (!importText.trim()) return toast.warning("Vui lòng nhập nội dung Import!");

    try {
      const res = await api.post("/kanji-sets/bulk-import", {
        title: importTitle.trim(),
        raw_text: importText,
        folder_path: importFolderPath.trim()
      });
      toast.success(res.data.message);
      setImportTitle("");
      setImportText("");
      setIsImportExpanded(false);
      fetchKanjiSets();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Lỗi tạo học phần. Hãy kiểm tra lại định dạng.");
    }
  };

  const handleDeleteSet = async (e, setId, title) => {
    e.stopPropagation();
    if (window.confirm(`Xóa toàn bộ học phần "${title}"?`)) {
      try {
        await api.delete(`/kanji-sets/${setId}`);
        toast.success("Đã xóa học phần!");
        fetchKanjiSets();
      } catch (error) {
        toast.error("Xóa thất bại!");
      }
    }
  };

  const handleDeleteKanji = async (kanjiId) => {
    if (window.confirm("Xóa chữ Kanji này?")) {
      try {
        await api.delete(`/kanji/${kanjiId}`);
        toast.success("Đã xóa chữ Kanji!");
        fetchKanjiSets();
      } catch (error) {
        toast.error("Lỗi xóa chữ Kanji");
      }
    }
  };

  const handleUpdateSuccess = (updatedKanji) => {
    setEditingKanji(null);
    toast.success("Cập nhật thành công!");
    fetchKanjiSets();
  };

  const handleDownloadKanji = async (e, set, format) => {
    e.stopPropagation();
    
    let kanjisToExport = set.kanjis;
    if (!kanjisToExport) {
      try {
        const res = await api.get(`/kanji-sets/${set.id}`);
        kanjisToExport = res.data.kanjis;
      } catch (error) {
        toast.error("Lỗi tải dữ liệu để xuất file!");
        return;
      }
    }

    if (!kanjisToExport || kanjisToExport.length === 0) {
      toast.warning("Học phần này chưa có chữ Kanji!");
      return;
    }

    let content = "";
    let filename = `${set.title.replace(/[/\\?%*:|"<>]/g, '-')}.${format}`;

    if (format === 'txt') {
      content = kanjisToExport.map(k => `${k.kanji} | ${k.hanviet} | ${k.hiragana} | ${k.meaning}`).join('\n');
    } else if (format === 'csv') {
      content = '\uFEFF' + "Chữ Hán,Hán Việt,Cách đọc,Ý nghĩa\n" + kanjisToExport.map(k => `"${k.kanji.replace(/"/g, '""')}","${k.hanviet.replace(/"/g, '""')}","${k.hiragana.replace(/"/g, '""')}","${k.meaning.replace(/"/g, '""')}"`).join('\n');
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateFolder = async () => {
    const newFolder = window.prompt("Nhập tên thư mục con mới:");
    if (newFolder && newFolder.trim()) {
      const folderName = newFolder.trim();
      const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      if (!customFolders.includes(fullPath) && !allExistingFolders.includes(fullPath)) {
        try {
          await api.post("/kanji-sets/bulk-import", {
            title: `_Thư mục: ${folderName}_`, 
            raw_text: " ", 
            folder_path: fullPath
          });
          setCustomFolders([...customFolders, fullPath]);
          toast.success(`Đã tạo thư mục: ${folderName}`);
          fetchKanjiSets(); 
        } catch (error) { toast.error("Lỗi khi tạo thư mục!"); }
      } else { toast.warning("Thư mục này đã tồn tại!"); }
    }
  };

  const handleDeleteFolder = async (e, folderName) => {
    e.stopPropagation(); 
    const targetPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    if (window.confirm(`Xóa thư mục "${folderName}" sẽ xóa TOÀN BỘ các học phần bên trong. Chắc chắn chứ?`)) {
      try {
        const setsToDelete = kanjiSets.filter(s => s.folder_path === targetPath || (s.folder_path && s.folder_path.startsWith(targetPath + '/')));
        await Promise.all(setsToDelete.map(s => api.delete(`/kanji-sets/${s.id}`)));
        setCustomFolders(prev => prev.filter(p => p !== targetPath && !p.startsWith(targetPath + '/')));
        toast.success(`Đã xóa thư mục: ${folderName}`);
        fetchKanjiSets();
      } catch (error) { toast.error("Có lỗi xảy ra khi xóa thư mục!"); }
    }
  };

  const toggleSet = async (setId) => {
    if (expandedSets[setId]) {
      setExpandedSets(prev => ({ ...prev, [setId]: false }));
      return;
    }
    
    const targetSet = kanjiSets.find(s => s.id === setId);
    if (targetSet && !targetSet.kanjis) {
      try {
        const res = await api.get(`/kanji-sets/${setId}`);
        setKanjiSets(prev => prev.map(s => s.id === setId ? { ...s, kanjis: res.data.kanjis } : s));
      } catch (error) {
        toast.error("Lỗi tải chi tiết Kanji!");
      }
    }
    setExpandedSets(prev => ({ ...prev, [setId]: true }));
  };

  const allExistingFolders = Array.from(new Set([
    ...kanjiSets.map(s => s.folder_path).filter(p => p),
    ...customFolders
  ])).sort();

  const currentLevelSets = [];
  const subfolders = new Set();

  const checkPathForFolders = (path) => {
    if (!path) return;
    if (path === currentPath) {
    } else if (path.startsWith(currentPath ? currentPath + '/' : '')) {
      const remainingPath = currentPath ? path.substring(currentPath.length + 1) : path;
      const nextFolder = remainingPath.split('/')[0];
      if (nextFolder) subfolders.add(nextFolder);
    }
  };

  kanjiSets.forEach(set => {
    const path = (set.folder_path || "").trim();
    if (path === currentPath) currentLevelSets.push(set); 
    checkPathForFolders(path);
  });

  customFolders.forEach(path => checkPathForFolders(path));
  const displayFolders = Array.from(subfolders);
  const displaySets = currentLevelSets.filter(set => !set.title.startsWith('_Thư mục:'));

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="container-fluid mt-2 mb-5 mx-auto" style={{ maxWidth: '1000px' }}>
      
      {editingKanji && (
        <EditKanjiModal 
          kanjiItem={editingKanji} 
          onClose={() => setEditingKanji(null)} 
          onUpdateSuccess={handleUpdateSuccess} 
        />
      )}

      {/* KHU VỰC IMPORT */}
      <div className="card shadow-sm mb-4 border-0 rounded-4 fade-in-slide">
        <div 
          className="card-header bg-white py-4 border-0 d-flex justify-content-between align-items-center rounded-4 transition-all hover-bg-light"
          style={{ cursor: 'pointer' }}
          onClick={() => setIsImportExpanded(!isImportExpanded)}
        >
          <h5 className="mb-0 fw-bold text-primary">
            {isImportExpanded ? '➖' : '➕'} Tạo học phần Kanji (Dán nhanh)
          </h5>
        </div>
        
        {isImportExpanded && (
          <div className="card-body p-4 border-top bg-light rounded-bottom-4">
            <input 
              type="text" 
              className="form-control form-control-lg mb-3 fw-bold border-0 shadow-sm" 
              placeholder="Tên học phần (VD: Từ vựng Kanji - Bài 3)..." 
              value={importTitle} onChange={(e) => setImportTitle(e.target.value)}
              style={{ borderRadius: '12px' }}
            />

            <div className="mb-3">
              <label className="text-muted small fw-bold mb-2">LƯU VÀO THƯ MỤC</label>
              <div className="input-group input-group-lg shadow-sm rounded-4">
                <span className="input-group-text bg-white border-0">📁</span>
                <select 
                  className="form-select bg-white border-0 fw-bold text-dark"
                  value={importFolderPath}
                  onChange={(e) => setImportFolderPath(e.target.value)}
                >
                  <option value="">-- Thư mục gốc (Mặc định) --</option>
                  {allExistingFolders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="text-muted small fw-bold mb-2">
                ĐỊNH DẠNG (4 Cột): <code className="bg-white px-2 py-1 rounded">Chữ Hán | Hán Việt | Cách đọc | Nghĩa</code>
              </label>
              <textarea 
                className="form-control border-0 shadow-sm p-3 fw-bold" 
                rows="5" 
                placeholder="家族 | GIA TỘC | かぞく | Gia đình&#10;旅行 | LỮ HÀNH | りょこう | Du lịch"
                value={importText} onChange={(e) => setImportText(e.target.value)}
                style={{ borderRadius: '12px', lineHeight: '1.6', fontSize: '0.95rem' }}
              ></textarea>
            </div>
            
            <div className="d-flex justify-content-end">
              <button className="btn btn-primary px-5 py-2 fw-bold rounded-pill shadow-sm hover-scale" onClick={handleImport}>
                Tạo học phần
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TÊU ĐỀ */}
      <div className="card shadow-sm border-0 rounded-4 bg-primary text-white mb-4 p-4 fade-in-slide">
        <h3 className="fw-bold m-0">Kanji ⛩️</h3>
      </div>

      {/* THANH ĐIỀU HƯỚNG THƯ MỤC */}
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white px-4 py-3 rounded-pill shadow-sm fade-in-slide">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <button className={`btn btn-sm rounded-pill fw-bold ${currentPath === "" ? 'btn-primary shadow-sm' : 'btn-light'}`} onClick={() => setCurrentPath("")}>
            🏠 Gốc
          </button>
          {currentPath && currentPath.split('/').map((part, idx, arr) => {
            const pathToHere = arr.slice(0, idx + 1).join('/');
            const isLast = idx === arr.length - 1;
            return (
              <React.Fragment key={idx}>
                <span className="text-muted fw-bold">/</span>
                <button className={`btn btn-sm rounded-pill fw-bold ${isLast ? 'btn-primary shadow-sm' : 'btn-light'}`} onClick={() => setCurrentPath(pathToHere)}>
                  {part}
                </button>
              </React.Fragment>
            )
          })}
        </div>
        
        <button className="btn btn-outline-primary btn-sm rounded-pill fw-bold px-3 d-flex align-items-center gap-2 transition-all hover-bg-light" onClick={handleCreateFolder}>
          <span className="fs-6">📁</span> <span className="d-none d-sm-block">Thư mục mới</span>
        </button>
      </div>

      {/* DANH SÁCH THƯ MỤC CON */}
      {displayFolders.length > 0 && (
        <div className="row g-3 mb-4 fade-in">
          {displayFolders.map(folderName => (
            <div key={folderName} className="col-6 col-md-4 col-lg-3">
              <div 
                className="card shadow-sm border-0 rounded-4 h-100 bg-white transition-all hover-scale" 
                style={{cursor: 'pointer'}}
                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)}
              >
                <div className="card-body d-flex align-items-center justify-content-between p-3">
                  <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1" style={{ minWidth: 0 }}>
                    <span className="fs-3">📁</span>
                    <h6 className="fw-bold mb-0 text-dark text-truncate" title={folderName}>{folderName}</h6>
                  </div>
                  <button 
                    className="btn btn-sm btn-light text-danger rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm ms-2 transition-all hover-bg-danger hover-text-white"
                    style={{ width: '32px', height: '32px', flexShrink: 0 }}
                    onClick={(e) => handleDeleteFolder(e, folderName)}
                    title="Xóa thư mục này"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DANH SÁCH CÁC HỌC PHẦN (ACCORDION) */}
      <div className="d-flex flex-column gap-3 fade-in-slide">
        {displaySets.length === 0 ? (
          <div className="text-center text-muted mt-5 fw-bold fs-5">Không tìm thấy kết quả phù hợp.</div>
        ) : (
          displaySets.map((set) => {
            const isExpanded = expandedSets[set.id];

            return (
              <div key={set.id} className="card shadow-sm border-0 rounded-4 overflow-hidden">
                
                <div 
                  className="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center transition-all hover-bg-light"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleSet(set.id)}
                >
                  <div>
                    <h5 className="mb-0 fw-bold text-dark d-inline-block me-3">{set.title}</h5>
                    <span className="badge bg-light text-primary border px-2 py-1 fs-6">{set.vocab_count} từ</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-light text-primary fw-bold border-0 px-2 py-2" onClick={(e) => handleDownloadKanji(e, set, 'txt')} title="Tải file Text">⬇️ TXT</button>
                    <button className="btn btn-sm btn-light text-success fw-bold border-0 px-2 py-2" onClick={(e) => handleDownloadKanji(e, set, 'csv')} title="Tải file Excel">⬇️ Excel</button>
                    <button className="btn btn-sm btn-light text-danger fw-bold border-0 px-3 py-2" onClick={(e) => handleDeleteSet(e, set.id, set.title)}>🗑️ Xóa</button>
                    <span className="text-muted fs-5 bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="card-body p-0 border-top bg-light fade-in">
                    <div className="list-group list-group-flush rounded-bottom-4">
                      {set.kanjis?.map((item) => (
                        <div key={item.id} className="list-group-item bg-white p-4 border-bottom border-light hover-bg-light transition-all position-relative">
                          <div className="row align-items-center g-3 text-center text-md-start">
                            
                            <div className="col-12 col-md-3 border-end-md">
                              <div className="fw-bold text-dark" style={{ fontSize: '2rem', fontFamily: 'var(--font-jp-serif)' }}>
                                {item.kanji}
                              </div>
                            </div>
                            
                            <div className="col-12 col-md-3">
                              <div className="fw-bold text-primary" style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>
                                {item.hanviet}
                              </div>
                            </div>
                            
                            <div className="col-12 col-md-3">
                              <div className="text-muted fw-bold fs-5">
                                {item.hiragana}
                              </div>
                            </div>
                            
                            <div className="col-12 col-md-2">
                              <div className="text-dark fw-bold fs-5">
                                {item.meaning}
                              </div>
                            </div>

                            <div className="col-12 col-md-1 text-end">
                              <div className="d-flex flex-md-column justify-content-center gap-2">
                                <button className="btn btn-sm btn-light text-primary fw-bold" onClick={() => setEditingKanji(item)}>✏️</button>
                                <button className="btn btn-sm btn-light text-danger fw-bold" onClick={() => handleDeleteKanji(item.id)}>🗑️</button>
                              </div>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default KanjiDictionary;