// ============================================================================
// SCOFIELD LOCAL OFFLINE ENGINE (100% LOCALSTORAGE + JSON IMPORT/EXPORT)
// Tương thích hoàn toàn với cấu trúc gọi Axios & FastAPI Backend cũ
// ============================================================================

// ============================================================================
// SUPABASE CLOUD SYNC CONFIG (ZERO-LATENCY LOCAL-FIRST)
// Bảng Supabase cần tạo: scofield_sync (sync_key: text PK, data: jsonb, updated_at: timestamptz)
// ============================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'sb_publishable_DS7d-iSQGgksM7LpKyptzQ_YXgGtbZF';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'https://htnzlthwzclkstdwvwya.supabase.co/rest/v1/';
const SYNC_KEY = 'my_secret_key';
const SYNC_TABLE = 'scofield_sync';

const STORAGE_KEYS = {
  SETS: 'scofield_db_sets',
  VOCABS: 'scofield_db_vocabularies',
  TEST_HISTORIES: 'scofield_db_test_histories',
  UPDATED_AT: 'scofield_db_updated_at',
};

const readTable = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Lỗi đọc localStorage [${key}]:`, e);
    return [];
  }
};

let syncPushTimer = null;

const pushToSupabase = async () => {
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  try {
    const updatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT) || new Date().toISOString();
    const payload = {
      sync_key: SYNC_KEY,
      updated_at: updatedAt,
      data: {
        sets: readTable(STORAGE_KEYS.SETS),
        vocabularies: readTable(STORAGE_KEYS.VOCABS),
        test_histories: readTable(STORAGE_KEYS.TEST_HISTORIES),
      },
    };

    await fetch(`${SUPABASE_URL}/rest/v1/${SYNC_TABLE}?on_conflict=sync_key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Cloud Sync Push tạm hoãn (Offline):', err.message);
  }
};

const scheduleDebouncedPush = () => {
  if (syncPushTimer) clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(pushToSupabase, 1500);
};

export const autoPullFromCloud = async () => {
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${SYNC_TABLE}?sync_key=eq.${encodeURIComponent(SYNC_KEY)}&select=data,updated_at&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return false;
    const rows = await res.json();
    if (!rows?.length || !rows[0].data) return false;

    const remote = rows[0];
    const localUpdatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT);
    const isRemoteNewer =
      !localUpdatedAt || new Date(remote.updated_at) > new Date(localUpdatedAt);

    if (isRemoteNewer) {
      const { sets = [], vocabularies = [], test_histories = [] } = remote.data;
      localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(sets));
      localStorage.setItem(STORAGE_KEYS.VOCABS, JSON.stringify(vocabularies));
      localStorage.setItem(STORAGE_KEYS.TEST_HISTORIES, JSON.stringify(test_histories));
      localStorage.setItem(STORAGE_KEYS.UPDATED_AT, remote.updated_at);
      window.dispatchEvent(new Event('scofield-cloud-synced'));
      return true;
    }
  } catch (err) {
    console.warn('Cloud Sync Pull bỏ qua (Offline):', err.message);
  }
  return false;
};

// Tự động kiểm tra và kéo dữ liệu mới về ngay khi mở App
autoPullFromCloud();

const writeTable = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.UPDATED_AT, new Date().toISOString());
    scheduleDebouncedPush();
  } catch (e) {
    console.error(`Lỗi ghi localStorage [${key}]:`, e);
    throw createApiError('Bộ nhớ trình duyệt đã đầy! Hãy xuất file JSON để sao lưu.', 500);
  }
};

const getNextId = (items) => {
  if (!items || items.length === 0) return 1;
  return items.reduce((max, item) => {
    const idNum = Number(item.id) || 0;
    return idNum > max ? idNum : max;
  }, 0) + 1;
};

const createApiError = (detail, status = 400) => {
  const err = new Error(detail);
  err.response = { status, data: { detail } };
  return err;
};

const formatDateShort = (isoStr) => {
  const d = isoStr ? new Date(isoStr) : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateFull = (isoStr) => {
  const d = isoStr ? new Date(isoStr) : new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min} - ${formatDateShort(isoStr)}`;
};

// Hàm bóc tách CSV chuẩn (hỗ trợ dấu ngoặc kép)
const parseCsvText = (csvText) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (char === '\r') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
};

// Logic tạo Set kèm danh sách từ vựng (giống hệt crud.create_set_with_vocabularies)
const createSetWithVocabulariesLocal = (title, rawText, folderPath = '', language = 'ja', setType = 'vocab') => {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) {
    throw createApiError('Tên học phần không được để trống');
  }

  const sets = readTable(STORAGE_KEYS.SETS);
  const vocabs = readTable(STORAGE_KEYS.VOCABS);
  const newSetId = getNextId(sets);
  const nowIso = new Date().toISOString();

  const newSet = {
    id: newSetId,
    title: cleanTitle,
    folder_path: (folderPath || '').trim(),
    language: (language || 'ja').trim() || 'ja',
    type: setType || 'vocab',
    created_at: nowIso,
  };

  // Cho phép tạo học phần rỗng để giữ chỗ cho Thư mục (_Thư mục: ..._)
  if (!rawText || !String(rawText).trim()) {
    sets.push(newSet);
    writeTable(STORAGE_KEYS.SETS, sets);
    return { importedCount: 0, errors: [], set: newSet };
  }

  const lines = String(rawText).trim().split('\n');
  let importedCount = 0;
  const errors = [];
  let nextVocabId = getNextId(vocabs);
  const newVocabs = [];

  lines.forEach((line, idx) => {
    const lineClean = line.trim();
    if (!lineClean) return;
    if (lineClean.startsWith('---') || lineClean.startswith?.('**') || lineClean.startsWith('**')) return;

    if (lineClean.includes('|')) {
      const parts = lineClean.split('|').map((p) => p.trim());
      let word = '';
      let hanviet = '';
      let hiragana = '';
      let meaning = '';

      if (parts.length >= 4) {
        const rawKanji = parts[0];
        const rawHanviet = parts[1];
        const rawHiragana = parts[2];
        meaning = parts[3];

        if (!rawKanji && rawHiragana) {
          word = rawHiragana;
          hiragana = '';
          hanviet = rawHanviet;
        } else {
          word = rawKanji;
          hanviet = rawHanviet;
          hiragana = rawHiragana;
        }
      } else if (parts.length === 3) {
        word = parts[0] ? parts[0] : parts[1];
        hiragana = parts[0] ? parts[1] : '';
        hanviet = '';
        meaning = parts[2];
      } else if (parts.length === 2) {
        word = parts[0];
        hanviet = '';
        hiragana = '';
        meaning = parts[1];
      }

      if (word && meaning) {
        newVocabs.push({
          id: nextVocabId++,
          word,
          hanviet,
          hiragana,
          meaning,
          language: newSet.language,
          set_id: newSetId,
          repetition: 0,
          ease_factor: 2.5,
          interval: 0,
          next_review: nowIso,
          is_starred: false,
        });
        importedCount++;
      } else {
        errors.push(`Dòng ${idx + 1}: Bị trống từ vựng hoặc ý nghĩa.`);
      }
    } else {
      errors.push(`Dòng ${idx + 1}: Thiếu ký tự phân cách '|'.`);
    }
  });

  if (importedCount === 0) {
    return { importedCount: null, errors, set: null };
  }

  sets.push(newSet);
  writeTable(STORAGE_KEYS.SETS, sets);
  writeTable(STORAGE_KEYS.VOCABS, [...vocabs, ...newVocabs]);
  return { importedCount, errors, set: newSet };
};

// ============================================================================
// BỘ HÀM NHẬP / XUẤT DỮ LIỆU BẰNG FILE JSON
// ============================================================================

const triggerJsonDownload = (dataObj, filename) => {
  const jsonStr = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 1. Xuất toàn bộ dữ liệu (Backup tổng)
export const exportAllDataToJson = () => {
  const payload = {
    version: '2.0-offline-pwa',
    exported_at: new Date().toISOString(),
    sets: readTable(STORAGE_KEYS.SETS),
    vocabularies: readTable(STORAGE_KEYS.VOCABS),
    test_histories: readTable(STORAGE_KEYS.TEST_HISTORIES),
  };
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerJsonDownload(payload, `scofield_backup_${dateTag}.json`);
  return payload;
};

// 2. Xuất 1 Học phần đơn lẻ
export const exportSingleItemToJson = (itemType, itemId) => {
  if (itemType === 'set') {
    const sets = readTable(STORAGE_KEYS.SETS);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const targetSet = sets.find((s) => Number(s.id) === Number(itemId));
    if (!targetSet) throw new Error('Không tìm thấy học phần để xuất JSON');
    const setVocabs = vocabs.filter((v) => Number(v.set_id) === Number(targetSet.id));
    const safeName = targetSet.title.replace(/[/\\?%*:|"<>]/g, '-');
    triggerJsonDownload(
      {
        single_type: 'set',
        exported_at: new Date().toISOString(),
        set: { ...targetSet, vocabularies: setVocabs },
      },
      `hoc_phan_${safeName}.json`
    );
  }
};

// 3. Nhập JSON thông minh (Hỗ trợ file backup tổng, mảng nhiều học phần, hoặc 1 học phần đơn lẻ)
export const importDataFromJson = async (fileOrObject, mode = 'merge') => {
  let parsed;
  if (typeof fileOrObject === 'string') {
    parsed = JSON.parse(fileOrObject);
  } else if (fileOrObject instanceof File || fileOrObject instanceof Blob) {
    const text = await fileOrObject.text();
    parsed = JSON.parse(text);
  } else {
    parsed = fileOrObject;
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('File JSON không hợp lệ!');
  }

  let sets = mode === 'replace' ? [] : readTable(STORAGE_KEYS.SETS);
  let vocabs = mode === 'replace' ? [] : readTable(STORAGE_KEYS.VOCABS);
  let testHistories = mode === 'replace' ? [] : readTable(STORAGE_KEYS.TEST_HISTORIES);

  let nextSetId = getNextId(sets);
  let nextVocabId = getNextId(vocabs);
  let nextTestHistId = getNextId(testHistories);

  let addedSets = 0;
  let addedVocabs = 0;

  const nowIso = new Date().toISOString();

  const insertOneSetObject = (rawSet, externalVocabs = []) => {
    const newId = nextSetId++;
    const lang = rawSet.language || 'ja';
    const setObj = {
      id: newId,
      title: String(rawSet.title || `Học phần #${newId}`).trim(),
      folder_path: String(rawSet.folder_path || '').trim(),
      language: lang,
      type: rawSet.type || (Array.isArray(rawSet.kanjis) ? 'kanji' : 'vocab'),
      created_at: rawSet.created_at || nowIso,
    };
    sets.push(setObj);
    addedSets++;

    const embeddedList = Array.isArray(rawSet.vocabularies)
      ? rawSet.vocabularies
      : Array.isArray(rawSet.kanjis)
      ? rawSet.kanjis
      : externalVocabs;

    embeddedList.forEach((v) => {
      const word = String(v.word || v.kanji || '').trim();
      const meaning = String(v.meaning || '').trim();
      if (!word && !meaning) return;
      vocabs.push({
        id: nextVocabId++,
        word,
        hanviet: String(v.hanviet || '').trim(),
        hiragana: String(v.hiragana || '').trim(),
        meaning,
        language: v.language || lang,
        set_id: newId,
        repetition: Number(v.repetition) || 0,
        ease_factor: Number(v.ease_factor) || 2.5,
        interval: Number(v.interval) || 0,
        next_review: v.next_review || nowIso,
        is_starred: Boolean(v.is_starred),
      });
      addedVocabs++;
    });

    return newId;
  };

  // Trường hợp 1: File Backup tổng
  if (Array.isArray(parsed.sets) || Array.isArray(parsed.vocabularies)) {
    const setIdMap = {};
    const externalVocabsBySet = {};

    if (Array.isArray(parsed.vocabularies)) {
      parsed.vocabularies.forEach((v) => {
        const oldSetId = v.set_id ?? v.kanji_set_id ?? '__unassigned__';
        if (!externalVocabsBySet[oldSetId]) externalVocabsBySet[oldSetId] = [];
        externalVocabsBySet[oldSetId].push(v);
      });
    }

    if (Array.isArray(parsed.sets)) {
      parsed.sets.forEach((s) => {
        const ext = externalVocabsBySet[s.id] || [];
        const newId = insertOneSetObject(s, ext);
        if (s.id !== undefined) setIdMap[s.id] = newId;
      });
    }

    if (externalVocabsBySet['__unassigned__']?.length > 0) {
      insertOneSetObject(
        { title: 'Từ vựng nhập từ JSON', folder_path: '', language: 'ja', type: 'vocab' },
        externalVocabsBySet['__unassigned__']
      );
    }

    if (Array.isArray(parsed.test_histories)) {
      parsed.test_histories.forEach((th) => {
        testHistories.push({
          id: nextTestHistId++,
          set_id: setIdMap[th.set_id] || th.set_id || th.setId || null,
          title: th.title || 'Bài kiểm tra',
          score: Number(th.score) || 0,
          total: Number(th.total) || 0,
          wrong_details: th.wrong_details || th.wrongDetails || [],
          created_at: th.created_at || nowIso,
        });
      });
    }
  }
  // Trường hợp 2: File JSON xuất đơn lẻ 1 Học phần
  else if (parsed.single_type === 'set' && parsed.set) {
    insertOneSetObject(parsed.set);
  }
  // Trường hợp 3: Đối tượng đơn lẻ 1 Học phần trực tiếp
  else if (!Array.isArray(parsed) && parsed.title) {
    insertOneSetObject(parsed);
  }
  // Trường hợp 4: Mảng các học phần hoặc mảng từ vựng
  else if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    if (first.title && (Array.isArray(first.vocabularies) || Array.isArray(first.kanjis))) {
      parsed.forEach((s) => insertOneSetObject(s));
    } else if (first.word || first.kanji || first.meaning) {
      insertOneSetObject(
        { title: `Học phần JSON (${new Date().toLocaleDateString('vi-VN')})`, language: 'ja', type: 'vocab' },
        parsed
      );
    }
  } else {
    throw new Error('Cấu trúc file JSON không nhận diện được!');
  }

  writeTable(STORAGE_KEYS.SETS, sets);
  writeTable(STORAGE_KEYS.VOCABS, vocabs);
  writeTable(STORAGE_KEYS.TEST_HISTORIES, testHistories.slice(0, 100));

  return { addedSets, addedVocabs };
};

// ============================================================================
// BỘ GIẢ LẬP AXIOS ENGINE (GET / POST / PUT / DELETE)
// ============================================================================

const parseUrlAndQuery = (rawUrl) => {
  const clean = rawUrl.startsWith('http') ? new URL(rawUrl).pathname + new URL(rawUrl).search : rawUrl;
  const [pathname, queryString] = clean.split('?');
  const params = new URLSearchParams(queryString || '');
  return { pathname, params };
};

const handleRequest = async (method, url, payload = null) => {
  const { pathname, params } = parseUrlAndQuery(url);

  // --------------------------------------------------------------------------
  // 1. STATS & SEARCH
  // --------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/stats/global') {
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    return { data: { total: vocabs.length } };
  }

  if (method === 'GET' && pathname === '/search') {
    const q = (params.get('q') || '').trim().toLowerCase();
    if (!q) return { data: [] };
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const results = vocabs
      .filter(
        (v) =>
          (v.word && v.word.toLowerCase().includes(q)) ||
          (v.hanviet && v.hanviet.toLowerCase().includes(q)) ||
          (v.hiragana && v.hiragana.toLowerCase().includes(q)) ||
          (v.meaning && v.meaning.toLowerCase().includes(q))
      )
      .slice(0, 10);
    return { data: results };
  }

  // --------------------------------------------------------------------------
  // 2. SETS & VOCABULARIES
  // --------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/sets') {
    const skip = parseInt(params.get('skip') || '0', 10);
    const limit = parseInt(params.get('limit') || '1000', 10);
    const sets = readTable(STORAGE_KEYS.SETS);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);

    const countMap = {};
    vocabs.forEach((v) => {
      if (v.set_id != null) {
        countMap[v.set_id] = (countMap[v.set_id] || 0) + 1;
      }
    });

    const sliced = sets.slice(skip, skip + limit).map((s) => ({
      id: s.id,
      title: s.title,
      folder_path: s.folder_path || '',
      language: s.language || 'ja',
      type: s.type || 'vocab',
      created_at: s.created_at,
      vocab_count: countMap[s.id] || 0,
      vocabularies: [],
    }));
    return { data: sliced };
  }

  const setDetailMatch = pathname.match(/^\/sets\/(\d+)$/);
  if (setDetailMatch) {
    const setId = parseInt(setDetailMatch[1], 10);
    const sets = readTable(STORAGE_KEYS.SETS);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const targetSet = sets.find((s) => Number(s.id) === setId);

    if (method === 'GET') {
      if (!targetSet) throw createApiError('Không tìm thấy học phần', 404);
      const setVocabs = vocabs
        .filter((v) => Number(v.set_id) === setId)
        .map((v) => ({ ...v, kanji: v.kanji || v.word }));
      return {
        data: {
          ...targetSet,
          vocab_count: setVocabs.length,
          vocabularies: setVocabs,
        },
      };
    }

    if (method === 'DELETE') {
      if (!targetSet) throw createApiError('Không tìm thấy học phần', 404);
      const testHistories = readTable(STORAGE_KEYS.TEST_HISTORIES);
      writeTable(
        STORAGE_KEYS.SETS,
        sets.filter((s) => Number(s.id) !== setId)
      );
      writeTable(
        STORAGE_KEYS.VOCABS,
        vocabs.filter((v) => Number(v.set_id) !== setId)
      );
      writeTable(
        STORAGE_KEYS.TEST_HISTORIES,
        testHistories.filter((h) => Number(h.set_id) !== setId && Number(h.setId) !== setId)
      );
      return { data: { message: 'Đã xóa học phần thành công' } };
    }
  }

  if (method === 'GET' && pathname === '/vocabularies') {
    const skip = parseInt(params.get('skip') || '0', 10);
    const limit = parseInt(params.get('limit') || '1000', 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    return { data: vocabs.slice(skip, skip + limit) };
  }

  if (method === 'POST' && pathname === '/vocabularies/bulk-import') {
    const { title, raw_text, folder_path, language } = payload || {};
    const { importedCount, errors } = createSetWithVocabulariesLocal(
      title,
      raw_text,
      folder_path || '',
      language || 'ja',
      'vocab'
    );
    if (importedCount === null) {
      throw createApiError('Không tìm thấy từ vựng hợp lệ nào. Kiểm tra lại định dạng.');
    }
    let responseMsg = `Đã tạo học phần '${title.trim()}' với ${importedCount} từ vựng thành công.`;
    if (errors && errors.length > 0) {
      responseMsg += ` Bỏ qua ${errors.length} dòng lỗi.`;
    }
    return { data: { message: responseMsg, errors } };
  }

  if (method === 'POST' && pathname === '/vocabularies/import-csv') {
    let title = '';
    let folderPath = '';
    let language = 'ja';
    let file = null;

    if (payload instanceof FormData) {
      title = payload.get('title') || '';
      folderPath = payload.get('folder_path') || '';
      language = payload.get('language') || 'ja';
      file = payload.get('file');
    } else if (payload) {
      title = payload.title || '';
      folderPath = payload.folder_path || '';
      language = payload.language || 'ja';
      file = payload.file;
    }

    if (!String(title).trim()) {
      throw createApiError('Tên học phần không được để trống');
    }
    if (!file || !file.name || !file.name.toLowerCase().endsWith('.csv')) {
      throw createApiError('Vui lòng tải lên file định dạng CSV');
    }

    const text = await file.text();
    const rows = parseCsvText(text.replace(/^\uFEFF/, ''));
    const headerKeywords = ['word', 'từ vựng', 'chữ hán', 'kanji', 'chữ hán/từ vựng'];
    const rawLines = [];

    for (const row of rows) {
      if (row.length >= 2) {
        const firstCol = (row[0] || '').trim().toLowerCase();
        if (headerKeywords.includes(firstCol)) continue;

        if (row.length >= 4) {
          const [r0, r1, r2, r3] = [row[0].trim(), row[1].trim(), row[2].trim(), row[3].trim()];
          if ((r0 || r2) && r3) rawLines.push(`${r0} | ${r1} | ${r2} | ${r3}`);
        } else if (row.length === 3) {
          const [r0, r1, r2] = [row[0].trim(), row[1].trim(), row[2].trim()];
          if ((r0 || r1) && r2) rawLines.push(`${r0} | ${r1} | ${r2}`);
        } else {
          const word = row[0].trim();
          const meaning = row[1].trim();
          if (word && meaning) rawLines.push(`${word} | ${meaning}`);
        }
      }
    }

    if (rawLines.length === 0) {
      throw createApiError('Không tìm thấy dữ liệu hợp lệ trong file CSV');
    }

    const { importedCount, errors } = createSetWithVocabulariesLocal(
      title.trim(),
      rawLines.join('\n'),
      folderPath,
      language,
      'vocab'
    );

    let responseMsg = `Đã tạo học phần '${title.trim()}' với ${importedCount} từ vựng từ file CSV.`;
    if (errors && errors.length > 0) {
      responseMsg += ` Bỏ qua ${errors.length} dòng lỗi.`;
    }
    return { data: { message: responseMsg, errors } };
  }

  if (method === 'POST' && pathname === '/vocabularies') {
    const { word, hanviet, hiragana, meaning, language, set_id } = payload || {};
    if (!word || !String(word).trim() || !meaning || !String(meaning).trim()) {
      throw createApiError('Từ vựng và ý nghĩa không được để chuỗi rỗng');
    }
    const sets = readTable(STORAGE_KEYS.SETS);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const parentSet = sets.find((s) => Number(s.id) === Number(set_id));
    const lang = parentSet && parentSet.language ? parentSet.language : language || 'ja';

    const newVocab = {
      id: getNextId(vocabs),
      word: String(word).trim(),
      hanviet: String(hanviet || '').trim(),
      hiragana: String(hiragana || '').trim(),
      meaning: String(meaning).trim(),
      language: lang,
      set_id: set_id != null ? Number(set_id) : null,
      repetition: 0,
      ease_factor: 2.5,
      interval: 0,
      next_review: new Date().toISOString(),
      is_starred: false,
    };

    vocabs.push(newVocab);
    writeTable(STORAGE_KEYS.VOCABS, vocabs);
    return { data: newVocab };
  }

  const vocabStarMatch = pathname.match(/^\/vocabularies\/(\d+)\/star$/);
  if (method === 'PUT' && vocabStarMatch) {
    const vocabId = parseInt(vocabStarMatch[1], 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const idx = vocabs.findIndex((v) => Number(v.id) === vocabId);
    if (idx === -1) throw createApiError('Không tìm thấy từ vựng', 404);

    vocabs[idx].is_starred = Boolean(payload?.is_starred);
    writeTable(STORAGE_KEYS.VOCABS, vocabs);
    return { data: { message: 'Đã cập nhật trạng thái sao', is_starred: vocabs[idx].is_starred } };
  }

  const vocabSrsMatch = pathname.match(/^\/vocabularies\/(\d+)\/srs$/);
  if (method === 'PUT' && vocabSrsMatch) {
    const vocabId = parseInt(vocabSrsMatch[1], 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const idx = vocabs.findIndex((v) => Number(v.id) === vocabId);
    if (idx === -1) throw createApiError('Không tìm thấy từ vựng', 404);

    const v = vocabs[idx];
    if (v.repetition == null) v.repetition = 0;
    if (v.ease_factor == null) v.ease_factor = 2.5;
    if (v.interval == null) v.interval = 0;

    if (payload?.is_correct) {
      if (v.repetition === 0) v.interval = 1;
      else if (v.repetition === 1) v.interval = 6;
      else v.interval = Math.round(v.interval * v.ease_factor);
      v.repetition += 1;
    } else {
      v.repetition = 0;
      v.interval = 1;
      v.ease_factor = Math.max(1.3, v.ease_factor - 0.2);
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + v.interval);
    v.next_review = nextDate.toISOString();

    vocabs[idx] = v;
    writeTable(STORAGE_KEYS.VOCABS, vocabs);
    return { data: { message: 'Đã cập nhật trạng thái SRS', next_review: v.next_review } };
  }

  const vocabItemMatch = pathname.match(/^\/vocabularies\/(\d+)$/);
  if (vocabItemMatch) {
    const vocabId = parseInt(vocabItemMatch[1], 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const idx = vocabs.findIndex((v) => Number(v.id) === vocabId);
    if (idx === -1) throw createApiError('Không tìm thấy từ vựng', 404);

    if (method === 'PUT') {
      const { word, hanviet, hiragana, meaning, language } = payload || {};
      if (!word || !String(word).trim() || !meaning || !String(meaning).trim()) {
        throw createApiError('Từ vựng và ý nghĩa không được để chuỗi rỗng');
      }
      vocabs[idx] = {
        ...vocabs[idx],
        word: String(word).trim(),
        hanviet: String(hanviet ?? vocabs[idx].hanviet ?? '').trim(),
        hiragana: String(hiragana ?? vocabs[idx].hiragana ?? '').trim(),
        meaning: String(meaning).trim(),
        language: language ? String(language).trim() : vocabs[idx].language || 'ja',
      };
      writeTable(STORAGE_KEYS.VOCABS, vocabs);
      return { data: vocabs[idx] };
    }

    if (method === 'DELETE') {
      writeTable(
        STORAGE_KEYS.VOCABS,
        vocabs.filter((v) => Number(v.id) !== vocabId)
      );
      return { data: { message: 'Đã xóa từ vựng' } };
    }
  }

  // --------------------------------------------------------------------------
  // 3. KANJI SETS & KANJIS
  // --------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/kanji-sets') {
    const sets = readTable(STORAGE_KEYS.SETS).filter((s) => s.type === 'kanji');
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const result = sets.map((s) => ({
      id: s.id,
      title: s.title,
      folder_path: s.folder_path || '',
      created_at: s.created_at,
      vocab_count: vocabs.filter((v) => Number(v.set_id) === Number(s.id)).length,
      kanjis: [],
    }));
    return { data: result };
  }

  if (method === 'POST' && pathname === '/kanji-sets/bulk-import') {
    const { title, raw_text, folder_path } = payload || {};
    const { importedCount, errors } = createSetWithVocabulariesLocal(
      title,
      raw_text,
      folder_path || '',
      'ja',
      'kanji'
    );
    if (importedCount === null) {
      throw createApiError('Không tìm thấy Kanji hợp lệ nào. Kiểm tra lại định dạng.');
    }
    return { data: { message: `Đã tạo học phần Kanji với ${importedCount} từ.`, errors } };
  }

  const kanjiSetDetailMatch = pathname.match(/^\/kanji-sets\/(\d+)$/);
  if (kanjiSetDetailMatch) {
    const setId = parseInt(kanjiSetDetailMatch[1], 10);
    const sets = readTable(STORAGE_KEYS.SETS);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const dbSet = sets.find((s) => Number(s.id) === setId && s.type === 'kanji');

    if (!dbSet) throw createApiError('Không tìm thấy học phần Kanji', 404);

    if (method === 'GET') {
      const kanjiList = vocabs
        .filter((k) => Number(k.set_id) === setId)
        .map((k) => ({
          id: k.id,
          kanji: k.word,
          hanviet: k.hanviet || '',
          hiragana: k.hiragana || '',
          meaning: k.meaning,
          kanji_set_id: k.set_id,
        }));
      return {
        data: {
          id: dbSet.id,
          title: dbSet.title,
          folder_path: dbSet.folder_path || '',
          created_at: dbSet.created_at,
          kanjis: kanjiList,
        },
      };
    }

    if (method === 'DELETE') {
      writeTable(
        STORAGE_KEYS.SETS,
        sets.filter((s) => Number(s.id) !== setId)
      );
      writeTable(
        STORAGE_KEYS.VOCABS,
        vocabs.filter((v) => Number(v.set_id) !== setId)
      );
      return { data: { message: 'Đã xóa học phần Kanji thành công' } };
    }
  }

  const kanjiItemMatch = pathname.match(/^\/kanji\/(\d+)$/);
  if (kanjiItemMatch) {
    const kanjiId = parseInt(kanjiItemMatch[1], 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const idx = vocabs.findIndex((v) => Number(v.id) === kanjiId);
    if (idx === -1) throw createApiError('Không tìm thấy Kanji', 404);

    if (method === 'DELETE') {
      writeTable(
        STORAGE_KEYS.VOCABS,
        vocabs.filter((v) => Number(v.id) !== kanjiId)
      );
      return { data: { message: 'Đã xóa Kanji' } };
    }

    if (method === 'PUT') {
      const wordVal = String(payload?.kanji ?? payload?.word ?? vocabs[idx].word).trim();
      const hanvietVal = String(payload?.hanviet ?? vocabs[idx].hanviet ?? '').trim();
      const hiraganaVal = String(payload?.hiragana ?? vocabs[idx].hiragana ?? '').trim();
      const meaningVal = String(payload?.meaning ?? vocabs[idx].meaning).trim();

      vocabs[idx] = {
        ...vocabs[idx],
        word: wordVal,
        hanviet: hanvietVal,
        hiragana: hiraganaVal,
        meaning: meaningVal,
      };
      writeTable(STORAGE_KEYS.VOCABS, vocabs);
      return {
        data: {
          id: vocabs[idx].id,
          kanji: vocabs[idx].word,
          hanviet: vocabs[idx].hanviet,
          hiragana: vocabs[idx].hiragana,
          meaning: vocabs[idx].meaning,
          kanji_set_id: vocabs[idx].set_id,
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // 4. TEST HISTORIES
  // --------------------------------------------------------------------------
  if (pathname === '/test-history') {
    if (method === 'POST') {
      const histories = readTable(STORAGE_KEYS.TEST_HISTORIES);
      const newRecord = {
        id: getNextId(histories),
        set_id: payload?.set_id ?? null,
        title: String(payload?.title || 'Bài kiểm tra').trim(),
        score: Number(payload?.score) || 0,
        total: Number(payload?.total) || 0,
        wrong_details: payload?.wrong_details || [],
        created_at: new Date().toISOString(),
      };
      const updated = [newRecord, ...histories].slice(0, 100);
      writeTable(STORAGE_KEYS.TEST_HISTORIES, updated);
      return { data: { message: 'Đã lưu lịch sử test' } };
    }

    if (method === 'GET') {
      const skip = parseInt(params.get('skip') || '0', 10);
      const limit = parseInt(params.get('limit') || '10', 10);
      const histories = readTable(STORAGE_KEYS.TEST_HISTORIES);
      const sorted = [...histories].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const sliced = sorted.slice(skip, skip + limit).map((h) => ({
        id: h.id,
        setId: h.set_id,
        title: h.title,
        score: h.score,
        total: h.total,
        created_at: h.created_at,
        date: formatDateShort(h.created_at),
        full_date: formatDateFull(h.created_at),
        wrongDetails: h.wrong_details || [],
      }));
      return { data: sliced };
    }
  }

  if (method === 'DELETE' && pathname === '/test-history/all') {
    writeTable(STORAGE_KEYS.TEST_HISTORIES, []);
    return { data: { message: 'Đã xóa toàn bộ lịch sử test' } };
  }

  throw createApiError(`Endpoint không tồn tại trong Offline Engine: [${method}] ${pathname}`, 404);
};

const api = {
  get: (url, config) => handleRequest('GET', url, null, config),
  post: (url, data, config) => handleRequest('POST', url, data, config),
  put: (url, data, config) => handleRequest('PUT', url, data, config),
  delete: (url, config) => handleRequest('DELETE', url, null, config),
};

export default api;