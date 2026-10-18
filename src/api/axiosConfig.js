// ============================================================================
// SCOFIELD LOCAL-FIRST + SUPABASE CLOUD ENGINE (TABLE: sync_data)
// ============================================================================

const SUPABASE_REST_URL = 'https://htnzlthwzclkstdwvwya.supabase.co/rest/v1/sync_data';
const SUPABASE_USERS_URL = 'https://htnzlthwzclkstdwvwya.supabase.co/rest/v1/app_users';
const SUPABASE_PUB_KEY = 'sb_publishable_DS7d-iSQGgksM7LpKyptzQ_YXgGtbZF';
const SUPABASE_SEC_KEY = 'sb_secret_O7fSZVJgpOygD4T08JK22A_fguUsNvC';

const STORAGE_KEYS = {
  SETS: 'scofield_db_sets',
  VOCABS: 'scofield_db_vocabularies',
  TEST_HISTORIES: 'scofield_db_test_histories',
  UPDATED_AT: 'scofield_db_updated_at',
  AUTH_USER: 'scofield_auth_user',
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const getSyncUserKey = () => {
  const user = getCurrentUser();
  return user && user.sync_user_key ? user.sync_user_key : null;
};

export const clearLocalDatabase = () => {
  localStorage.removeItem(STORAGE_KEYS.SETS);
  localStorage.removeItem(STORAGE_KEYS.VOCABS);
  localStorage.removeItem(STORAGE_KEYS.TEST_HISTORIES);
  localStorage.removeItem(STORAGE_KEYS.UPDATED_AT);
  localStorage.removeItem('scofieldSetOrder');
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  clearLocalDatabase();
  window.dispatchEvent(new Event('scofield-auth-changed'));
};

let currentSyncStatus = { state: 'idle', lastSynced: null, message: 'Sẵn sàng' };

const notifySyncStatus = (state, message = '') => {
  currentSyncStatus = {
    state,
    lastSynced:
      state === 'synced'
        ? new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : currentSyncStatus.lastSynced,
    message,
  };
  window.dispatchEvent(new CustomEvent('scofield-sync-status', { detail: currentSyncStatus }));
};

export const getSyncStatus = () => currentSyncStatus;

const supabaseFetch = async (url, options = {}) => {
  const isJwtKey = SUPABASE_PUB_KEY.startsWith('eyJ');

  const doCall = (apiKey, includeBearer) => {
    const headers = {
      'Content-Type': 'application/json',
      apikey: apiKey,
      ...(options.headers || {}),
    };
    if (includeBearer) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return fetch(url, {
      ...options,
      headers,
    });
  };

  // Chỉ đính kèm Bearer ở lần gọi đầu nếu key là chuẩn JWT (eyJ...)
  let res = await doCall(SUPABASE_PUB_KEY, isJwtKey);
  if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 400)) {
    const retryRes = await doCall(SUPABASE_PUB_KEY, !isJwtKey);
    return retryRes;
  }
  return res;
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

export const pushToSupabase = async () => {
  const syncUserKey = getSyncUserKey();
  if (!syncUserKey) {
    notifySyncStatus('idle', 'Chưa đăng nhập');
    return false;
  }

  notifySyncStatus('syncing', 'Đang đẩy lên Cloud...');
  try {
    const updatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT) || new Date().toISOString();
    const backupPayload = {
      sets: readTable(STORAGE_KEYS.SETS),
      vocabularies: readTable(STORAGE_KEYS.VOCABS),
      test_histories: readTable(STORAGE_KEYS.TEST_HISTORIES),
      set_order: JSON.parse(localStorage.getItem('scofieldSetOrder') || '[]'),
    };

    const checkUrl = `${SUPABASE_REST_URL}?user_key=eq.${encodeURIComponent(syncUserKey)}&select=user_key&limit=1`;
    const checkRes = await supabaseFetch(checkUrl, { method: 'GET' });
    if (!checkRes.ok) throw new Error(`HTTP ${checkRes.status}`);
    const existing = await checkRes.json();

    let writeRes;
    if (Array.isArray(existing) && existing.length > 0) {
      writeRes = await supabaseFetch(
        `${SUPABASE_REST_URL}?user_key=eq.${encodeURIComponent(syncUserKey)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            backup_json: backupPayload,
            updated_at: updatedAt,
          }),
        }
      );
    } else {
      writeRes = await supabaseFetch(SUPABASE_REST_URL, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_key: syncUserKey,
          backup_json: backupPayload,
          updated_at: updatedAt,
        }),
      });
    }

    if (!writeRes.ok) throw new Error(`Push thất bại (${writeRes.status})`);
    notifySyncStatus('synced', 'Đã đồng bộ Cloud');
    return true;
  } catch (err) {
    console.warn('Cloud Sync Push lỗi:', err.message);
    notifySyncStatus('error', 'Offline / Chờ mạng');
    return false;
  }
};

export const scheduleDebouncedPush = () => {
  if (!getSyncUserKey()) return;
  notifySyncStatus('syncing', 'Chờ lưu ngầm...');
  if (syncPushTimer) clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(() => {
    pushToSupabase();
  }, 1200);
};

export const autoPullFromCloud = async (forcePull = false) => {
  const syncUserKey = getSyncUserKey();
  if (!syncUserKey) {
    notifySyncStatus('idle', 'Chưa đăng nhập');
    return false;
  }

  notifySyncStatus('syncing', 'Đang kiểm tra Cloud...');
  try {
    const queryUrl = `${SUPABASE_REST_URL}?user_key=eq.${encodeURIComponent(syncUserKey)}&select=user_key,backup_json,updated_at&order=updated_at.desc&limit=1`;
    const res = await supabaseFetch(queryUrl, { method: 'GET' });
    if (!res.ok) throw new Error(`Pull HTTP ${res.status}`);

    const rows = await res.json();
    const localSets = readTable(STORAGE_KEYS.SETS);
    const localVocabs = readTable(STORAGE_KEYS.VOCABS);

    if (!rows || rows.length === 0 || !rows[0].backup_json) {
      if (localSets.length > 0 || localVocabs.length > 0) {
        await pushToSupabase();
      } else {
        localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.VOCABS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.TEST_HISTORIES, JSON.stringify([]));
        notifySyncStatus('synced', 'Cloud sẵn sàng');
        window.dispatchEvent(new Event('scofield-cloud-synced'));
      }
      return false;
    }

    const remote = rows[0];
    const remoteData =
      typeof remote.backup_json === 'string'
        ? JSON.parse(remote.backup_json)
        : remote.backup_json;

    const localUpdatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT);
    const isLocalEmpty = localSets.length === 0 && localVocabs.length === 0;
    const isRemoteNewer =
      forcePull ||
      isLocalEmpty ||
      !localUpdatedAt ||
      (remote.updated_at && new Date(remote.updated_at) > new Date(localUpdatedAt));

    if (isRemoteNewer && remoteData) {
      const { sets = [], vocabularies = [], test_histories = [], set_order } = remoteData;
      localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(sets));
      localStorage.setItem(STORAGE_KEYS.VOCABS, JSON.stringify(vocabularies));
      localStorage.setItem(STORAGE_KEYS.TEST_HISTORIES, JSON.stringify(test_histories));
      if (Array.isArray(set_order) && set_order.length > 0) {
        localStorage.setItem('scofieldSetOrder', JSON.stringify(set_order));
      } else {
        localStorage.removeItem('scofieldSetOrder');
      }
      localStorage.setItem(
        STORAGE_KEYS.UPDATED_AT,
        remote.updated_at || new Date().toISOString()
      );
      notifySyncStatus('synced', 'Đã tải dữ liệu mới');
      window.dispatchEvent(new Event('scofield-cloud-synced'));
      return true;
    } else if (
      localUpdatedAt &&
      remote.updated_at &&
      new Date(localUpdatedAt) > new Date(remote.updated_at)
    ) {
      await pushToSupabase();
      return false;
    }

    notifySyncStatus('synced', 'Đã đồng bộ Cloud');
    return false;
  } catch (err) {
    console.warn('Cloud Sync Pull lỗi:', err.message);
    notifySyncStatus('error', 'Chế độ Offline');
    return false;
  }
};

setTimeout(() => {
  if (getSyncUserKey()) {
    autoPullFromCloud();
  }
}, 100);

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
  return (
    items.reduce((max, item) => {
      const idNum = Number(item.id) || 0;
      return idNum > max ? idNum : max;
    }, 0) + 1
  );
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

const createSetWithVocabulariesLocal = (
  title,
  rawText,
  folderPath = '',
  language = 'ja',
  setType = 'vocab'
) => {
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

  // Hỗ trợ phân tích cú pháp từ đi kèm trên 1 dòng (4 trường: Từ:Hán Việt:Phiên âm:Nghĩa hoặc 3 trường: Từ:Phiên âm:Nghĩa)
  const parseInlineExamples = (rawStr) => {
    if (!rawStr || !rawStr.trim()) return [];
    return rawStr
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const segs = item.split(':').map((s) => s.trim());
        if (segs.length >= 4) {
          return {
            word: segs[0] || '',
            hanviet: segs[1] || '',
            reading: segs[2] || '',
            hiragana: segs[2] || '',
            meaning: segs.slice(3).join(': ') || '',
          };
        }
        if (segs.length === 3) {
          return {
            word: segs[0] || '',
            hanviet: '',
            reading: segs[1] || '',
            hiragana: segs[1] || '',
            meaning: segs[2] || '',
          };
        }
        return {
          word: segs[0] || '',
          hanviet: '',
          reading: '',
          hiragana: '',
          meaning: segs[1] || '',
        };
      })
      .filter((ex) => ex.word);
  };

  if (setType === 'kanji') {
    let currentKanjiObj = null;

    lines.forEach((line, idx) => {
      const lineClean = line.trim();
      if (!lineClean || lineClean.startsWith('---') || lineClean.startsWith('**')) return;

      // Dòng bắt đầu bằng '-' hoặc '+' là từ ghép Kanji đi kèm (Từ vựng | Hán Việt | Phiên âm | Ý nghĩa)
      if ((lineClean.startsWith('-') || lineClean.startsWith('+')) && currentKanjiObj) {
        const subLine = lineClean.replace(/^[-+]+\s*/, '');
        const subParts = subLine.split('|').map((p) => p.trim());
        if (subParts[0]) {
          let exItem;
          if (subParts.length >= 4) {
            exItem = {
              word: subParts[0] || '',
              hanviet: subParts[1] || '',
              reading: subParts[2] || '',
              hiragana: subParts[2] || '',
              meaning: subParts.slice(3).join(' | ') || '',
            };
          } else if (subParts.length === 3) {
            exItem = {
              word: subParts[0] || '',
              hanviet: '',
              reading: subParts[1] || '',
              hiragana: subParts[1] || '',
              meaning: subParts[2] || '',
            };
          } else {
            exItem = {
              word: subParts[0] || '',
              hanviet: '',
              reading: '',
              hiragana: '',
              meaning: subParts[1] || '',
            };
          }
          currentKanjiObj.examples.push(exItem);
          if (!currentKanjiObj.meaning && exItem.meaning) {
            currentKanjiObj.meaning = exItem.meaning;
          }
        }
        return;
      }

      if (lineClean.includes('|')) {
        const parts = lineClean.split('|').map((p) => p.trim());
        const word = parts[0] || '';
        let onyomi = '';
        let kunyomi = '';
        let hanviet = '';
        let meaning = '';
        let inlineExamples = [];

        if (parts.length >= 5) {
          // Định dạng: Chữ Hán | Âm On | Âm Kun | Hán Việt / Nghĩa | Từ đi kèm (hoặc Nghĩa)
          onyomi = parts[1];
          kunyomi = parts[2];
          hanviet = parts[3];
          if (parts[4].includes(':')) {
            meaning = parts[3] || word;
            inlineExamples = parseInlineExamples(parts[4]);
          } else {
            meaning = parts[4];
            if (parts[5]) inlineExamples = parseInlineExamples(parts[5]);
          }
        } else if (parts.length === 4) {
          // Hỗ trợ cả định dạng mới: Chữ Hán | Âm On | Âm Kun | Nghĩa (hoặc Hán Việt - Nghĩa)
          // và định dạng cũ: Chữ Hán | Hán Việt | Hiragana | Nghĩa
          const p1IsKana = /[\u3040-\u30ff]/.test(parts[1]);
          if (p1IsKana) {
            onyomi = parts[1];
            kunyomi = parts[2];
            if (parts[3].includes('-')) {
              const [hv, ...mn] = parts[3].split('-');
              hanviet = hv.trim();
              meaning = mn.join('-').trim() || hv.trim();
            } else {
              meaning = parts[3];
            }
          } else {
            hanviet = parts[1];
            const readings = parts[2].split('/').map((r) => r.trim());
            onyomi = readings[0] || '';
            kunyomi = readings.slice(1).join(', ') || '';
            meaning = parts[3];
          }
        } else if (parts.length === 3) {
          onyomi = parts[1];
          kunyomi = parts[2];
          meaning = parts[2] || parts[1] || word;
        } else if (parts.length === 2) {
          onyomi = parts[1];
          meaning = parts[1] || word;
        }

        const combinedReading = [onyomi, kunyomi].filter(Boolean).join(' / ');

        if (word) {
          currentKanjiObj = {
            id: nextVocabId++,
            word,
            onyomi,
            kunyomi,
            examples: inlineExamples,
            hanviet,
            hiragana: combinedReading,
            meaning: meaning || hanviet || combinedReading || word,
            language: 'ja',
            set_id: newSetId,
            repetition: 0,
            ease_factor: 2.5,
            interval: 0,
            next_review: nowIso,
            is_starred: false,
          };
          newVocabs.push(currentKanjiObj);
          importedCount++;
        } else {
          errors.push(`Dòng ${idx + 1}: Thiếu chữ Hán.`);
        }
      } else {
        errors.push(`Dòng ${idx + 1}: Thiếu ký tự phân cách '|'.`);
      }
    });
  } else {
    lines.forEach((line, idx) => {
      const lineClean = line.trim();
      if (!lineClean) return;
      if (lineClean.startsWith('---') || lineClean.startsWith('**')) return;

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
            hiragana = rawHiragana;
            hanviet = rawHanviet;
          } else {
            word = rawKanji;
            hanviet = rawHanviet;
            hiragana = rawHiragana;
          }
        } else if (parts.length === 3) {
          word = parts[0] ? parts[0] : parts[1];
          hiragana = parts[1] || '';
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
  }

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
        onyomi: String(v.onyomi || '').trim(),
        kunyomi: String(v.kunyomi || '').trim(),
        examples: Array.isArray(v.examples) ? v.examples : [],
        hanviet: String(v.hanviet || '').trim(),
        hiragana: String(v.hiragana || [v.onyomi, v.kunyomi].filter(Boolean).join(' / ') || '').trim(),
        meaning: meaning || word,
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
  } else if (parsed.single_type === 'set' && parsed.set) {
    insertOneSetObject(parsed.set);
  } else if (!Array.isArray(parsed) && parsed.title) {
    insertOneSetObject(parsed);
  } else if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0];
    if (first.title && (Array.isArray(first.vocabularies) || Array.isArray(first.kanjis))) {
      parsed.forEach((s) => insertOneSetObject(s));
    } else if (first.word || first.kanji || first.meaning) {
      insertOneSetObject(
        {
          title: `Học phần JSON (${new Date().toLocaleDateString('vi-VN')})`,
          language: 'ja',
          type: 'vocab',
        },
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
  const clean = rawUrl.startsWith('http')
    ? new URL(rawUrl).pathname + new URL(rawUrl).search
    : rawUrl;
  const [pathname, queryString] = clean.split('?');
  const params = new URLSearchParams(queryString || '');
  return { pathname, params };
};

const handleRequest = async (method, url, payload = null) => {
  const { pathname, params } = parseUrlAndQuery(url);

  // 0. AUTHENTICATION & ADMIN USERS (SUPABASE app_users)
  if (method === 'POST' && pathname === '/auth/login') {
    const { username, password } = payload || {};
    const cleanUsername = String(username || '').trim().toLowerCase();
    if (!cleanUsername || !password) {
      throw createApiError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
    }

    const queryUrl = `${SUPABASE_USERS_URL}?username=ilike.${encodeURIComponent(cleanUsername)}&select=*&limit=1`;
    const res = await supabaseFetch(queryUrl, { method: 'GET' });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Supabase Login Error:', res.status, errText);
      throw createApiError(`Không thể kết nối máy chủ xác thực Supabase (HTTP ${res.status})!`, 500);
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createApiError('Tài khoản không tồn tại!', 401);
    }

    const user = rows[0];
    if (String(user.password) !== String(password)) {
      throw createApiError('Mật khẩu không chính xác!', 401);
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name || user.username,
      role: user.role || 'user',
      sync_user_key: user.sync_user_key,
    };

    clearLocalDatabase();
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(safeUser));
    await autoPullFromCloud(true);
    window.dispatchEvent(new Event('scofield-auth-changed'));

    return { data: { message: 'Đăng nhập thành công!', user: safeUser } };
  }

  if (method === 'POST' && pathname === '/auth/register') {
    const { username, password, display_name } = payload || {};
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanDisplayName = String(display_name || username || '').trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw createApiError('Tên đăng nhập phải có ít nhất 3 ký tự!');
    }
    if (/\s/.test(cleanUsername)) {
      throw createApiError('Tên đăng nhập không được chứa khoảng trắng!');
    }
    if (!password || String(password).length < 4) {
      throw createApiError('Mật khẩu phải có ít nhất 4 ký tự!');
    }

    const checkUrl = `${SUPABASE_USERS_URL}?username=eq.${encodeURIComponent(cleanUsername)}&select=id&limit=1`;
    const checkRes = await supabaseFetch(checkUrl, { method: 'GET' });
    if (!checkRes.ok) {
      const errText = await checkRes.text().catch(() => '');
      console.error('Supabase Register Check Error:', checkRes.status, errText);
      throw createApiError(`Lỗi kiểm tra tài khoản trên Supabase (HTTP ${checkRes.status})!`, 500);
    }
    const existing = await checkRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      throw createApiError('Tên đăng nhập này đã có người sử dụng!');
    }

    const syncUserKey = `user_${cleanUsername}`;
    const createRes = await supabaseFetch(SUPABASE_USERS_URL, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        username: cleanUsername,
        password: String(password),
        display_name: cleanDisplayName,
        role: 'user',
        sync_user_key: syncUserKey,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => '');
      console.error('Supabase Register Create Error:', createRes.status, errText);
      throw createApiError(`Không thể tạo tài khoản mới (HTTP ${createRes.status}). Hãy kiểm tra bảng app_users và RLS trên Supabase!`, 500);
    }

    const createdRows = await createRes.json();
    const createdUser = Array.isArray(createdRows) && createdRows[0] ? createdRows[0] : {
      username: cleanUsername,
      display_name: cleanDisplayName,
      role: 'user',
      sync_user_key: syncUserKey,
    };

    const safeUser = {
      id: createdUser.id,
      username: createdUser.username,
      display_name: createdUser.display_name || cleanDisplayName,
      role: createdUser.role || 'user',
      sync_user_key: createdUser.sync_user_key || syncUserKey,
    };

    clearLocalDatabase();
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(safeUser));
    localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VOCABS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TEST_HISTORIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.UPDATED_AT, new Date().toISOString());

    await autoPullFromCloud(true);
    window.dispatchEvent(new Event('scofield-auth-changed'));

    return { data: { message: 'Đăng ký tài khoản thành công!', user: safeUser } };
  }

  if (method === 'PUT' && pathname === '/auth/change-password') {
    const currentUser = getCurrentUser();
    if (!currentUser) throw createApiError('Vui lòng đăng nhập!', 401);

    const { old_password, new_password } = payload || {};
    if (!new_password || String(new_password).trim().length < 4) {
      throw createApiError('Mật khẩu mới phải có ít nhất 4 ký tự!');
    }

    const checkUrl = `${SUPABASE_USERS_URL}?id=eq.${currentUser.id}&select=id,password&limit=1`;
    const checkRes = await supabaseFetch(checkUrl, { method: 'GET' });
    if (!checkRes.ok) throw createApiError('Lỗi xác thực người dùng!', 500);
    const rows = await checkRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createApiError('Không tìm thấy tài khoản!', 404);
    }

    if (old_password !== undefined && String(rows[0].password) !== String(old_password)) {
      throw createApiError('Mật khẩu hiện tại không đúng!', 400);
    }

    const updateRes = await supabaseFetch(`${SUPABASE_USERS_URL}?id=eq.${currentUser.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ password: String(new_password).trim() }),
    });

    if (!updateRes.ok) throw createApiError('Lỗi cập nhật mật khẩu!', 500);
    return { data: { message: 'Đổi mật khẩu thành công!' } };
  }

  if (method === 'GET' && pathname === '/admin/users') {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw createApiError('Bạn không có quyền truy cập trang Quản trị!', 403);
    }
    const res = await supabaseFetch(
      `${SUPABASE_USERS_URL}?select=id,username,display_name,role,sync_user_key,created_at&order=created_at.desc`,
      { method: 'GET' }
    );
    if (!res.ok) throw createApiError('Không thể tải danh sách tài khoản!', 500);
    const users = await res.json();
    return { data: Array.isArray(users) ? users : [] };
  }

  const adminResetMatch = pathname.match(/^\/admin\/users\/(\d+)\/reset-password$/);
  if (method === 'PUT' && adminResetMatch) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw createApiError('Không có quyền thực hiện!', 403);
    }
    const targetUserId = parseInt(adminResetMatch[1], 10);
    const newPassword = payload?.new_password || '123456';

    const res = await supabaseFetch(`${SUPABASE_USERS_URL}?id=eq.${targetUserId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ password: String(newPassword) }),
    });
    if (!res.ok) throw createApiError('Reset mật khẩu thất bại!', 500);
    return { data: { message: `Đã reset mật khẩu về ${newPassword}!` } };
  }

  const adminDeleteUserMatch = pathname.match(/^\/admin\/users\/(\d+)$/);
  if (method === 'DELETE' && adminDeleteUserMatch) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw createApiError('Không có quyền thực hiện!', 403);
    }
    const targetUserId = parseInt(adminDeleteUserMatch[1], 10);

    const checkRes = await supabaseFetch(
      `${SUPABASE_USERS_URL}?id=eq.${targetUserId}&select=id,role,username&limit=1`,
      { method: 'GET' }
    );
    const rows = await checkRes.json();
    if (Array.isArray(rows) && rows[0]?.role === 'admin') {
      throw createApiError('Không thể xóa tài khoản Quản trị viên (Admin)!', 400);
    }

    const delRes = await supabaseFetch(`${SUPABASE_USERS_URL}?id=eq.${targetUserId}`, {
      method: 'DELETE',
    });
    if (!delRes.ok) throw createApiError('Xóa tài khoản thất bại!', 500);
    return { data: { message: 'Đã xóa tài khoản người dùng!' } };
  }

  // 1. STATS & SEARCH
  if (method === 'GET' && pathname === '/stats/global') {
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const now = new Date();
    const dueCount = vocabs.filter(
      (v) => v.next_review && new Date(v.next_review) <= now
    ).length;
    return { data: { total: vocabs.length, dueCount } };
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

  // 2. SETS & VOCABULARIES
  if (method === 'GET' && pathname === '/sets') {
    const skip = parseInt(params.get('skip') || '0', 10);
    const limit = parseInt(params.get('limit') || '1000', 10);
    const sets = readTable(STORAGE_KEYS.SETS);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);

    const setTypeMap = {};
    sets.forEach((s) => {
      setTypeMap[s.id] = s.type || 'vocab';
    });

    const countMap = {};
    vocabs.forEach((v) => {
      if (v.set_id != null) {
        if (setTypeMap[v.set_id] === 'kanji') {
          const exCount = Array.isArray(v.examples)
            ? v.examples.filter((ex) => ex && String(ex.word || '').trim()).length
            : 0;
          countMap[v.set_id] = (countMap[v.set_id] || 0) + exCount;
        } else {
          countMap[v.set_id] = (countMap[v.set_id] || 0) + 1;
        }
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

      if (targetSet.type === 'kanji') {
        const kanjiRecords = vocabs.filter((v) => Number(v.set_id) === setId);
        const exampleVocabs = [];
        kanjiRecords.forEach((k) => {
          if (Array.isArray(k.examples)) {
            k.examples.forEach((ex, exIdx) => {
              const w = String(ex?.word || '').trim();
              if (!w) return;
              const hv = String(ex.hanviet || '').trim();
              const hira = String(ex.hiragana || ex.reading || '').trim();
              const mn = String(ex.meaning || '').trim();
              exampleVocabs.push({
                id: `${k.id}_ex_${exIdx}`,
                parent_kanji_id: k.id,
                example_index: exIdx,
                word: w,
                kanji: w,
                hanviet: hv,
                hiragana: hira,
                meaning: mn || hv || w,
                language: 'ja',
                set_id: setId,
                is_starred: Boolean(ex.is_starred ?? k.is_starred),
              });
            });
          }
        });
        return {
          data: {
            ...targetSet,
            vocab_count: exampleVocabs.length,
            vocabularies: exampleVocabs,
          },
        };
      }

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

  const vocabExStarMatch = pathname.match(/^\/vocabularies\/(\d+)_ex_(\d+)\/star$/);
  if (method === 'PUT' && vocabExStarMatch) {
    const kanjiId = parseInt(vocabExStarMatch[1], 10);
    const exIdx = parseInt(vocabExStarMatch[2], 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const idx = vocabs.findIndex((v) => Number(v.id) === kanjiId);
    if (idx === -1 || !Array.isArray(vocabs[idx].examples) || !vocabs[idx].examples[exIdx]) {
      throw createApiError('Không tìm thấy từ đi kèm', 404);
    }
    vocabs[idx].examples[exIdx].is_starred = Boolean(payload?.is_starred);
    writeTable(STORAGE_KEYS.VOCABS, vocabs);
    return {
      data: {
        message: 'Đã cập nhật trạng thái sao',
        is_starred: vocabs[idx].examples[exIdx].is_starred,
      },
    };
  }

  const vocabExEditMatch = pathname.match(/^\/(?:vocabularies|kanji)\/(\d+)_ex_(\d+)$/);
  if (method === 'PUT' && vocabExEditMatch) {
    const kanjiId = parseInt(vocabExEditMatch[1], 10);
    const exIdx = parseInt(vocabExEditMatch[2], 10);
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const idx = vocabs.findIndex((v) => Number(v.id) === kanjiId);
    if (idx === -1 || !Array.isArray(vocabs[idx].examples) || !vocabs[idx].examples[exIdx]) {
      throw createApiError('Không tìm thấy từ đi kèm', 404);
    }
    const wordVal = String(payload?.word ?? payload?.kanji ?? vocabs[idx].examples[exIdx].word ?? '').trim();
    const hanvietVal = String(payload?.hanviet ?? vocabs[idx].examples[exIdx].hanviet ?? '').trim();
    const hiraVal = String(payload?.hiragana ?? payload?.reading ?? vocabs[idx].examples[exIdx].hiragana ?? vocabs[idx].examples[exIdx].reading ?? '').trim();
    const meaningVal = String(payload?.meaning ?? vocabs[idx].examples[exIdx].meaning ?? '').trim();

    vocabs[idx].examples[exIdx] = {
      ...vocabs[idx].examples[exIdx],
      word: wordVal,
      hanviet: hanvietVal,
      reading: hiraVal,
      hiragana: hiraVal,
      meaning: meaningVal,
    };
    writeTable(STORAGE_KEYS.VOCABS, vocabs);
    return { data: vocabs[idx].examples[exIdx] };
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

  // Helper chuẩn hóa dữ liệu 1 chữ Kanji
  const formatKanjiRecord = (k, setMap = {}) => {
    let onyomi = k.onyomi || '';
    let kunyomi = k.kunyomi || '';
    if (!onyomi && !kunyomi && k.hiragana) {
      const parts = k.hiragana.split('/').map((s) => s.trim());
      onyomi = parts[0] || '';
      kunyomi = parts.slice(1).join(', ') || '';
    }
    return {
      id: k.id,
      kanji: k.word,
      word: k.word,
      onyomi,
      kunyomi,
      examples: Array.isArray(k.examples)
        ? k.examples.map((ex) => ({
            word: String(ex.word || '').trim(),
            hanviet: String(ex.hanviet || '').trim(),
            reading: String(ex.reading || ex.hiragana || '').trim(),
            hiragana: String(ex.hiragana || ex.reading || '').trim(),
            meaning: String(ex.meaning || '').trim(),
            is_starred: Boolean(ex.is_starred),
          }))
        : [],
      hanviet: k.hanviet || '',
      hiragana: k.hiragana || [onyomi, kunyomi].filter(Boolean).join(' / ') || '',
      meaning: k.meaning || '',
      kanji_set_id: k.set_id,
      set_id: k.set_id,
      set_title: setMap[k.set_id]?.title || 'Học phần Kanji',
      folder_path: setMap[k.set_id]?.folder_path || '',
      is_starred: Boolean(k.is_starred),
    };
  };

  // 3. KANJI SETS & KANJIS
  if (method === 'GET' && pathname === '/kanji/all') {
    const sets = readTable(STORAGE_KEYS.SETS).filter(
      (s) => s.type === 'kanji' && !s.title?.startsWith('_Thư mục:')
    );
    const setMap = {};
    sets.forEach((s) => {
      setMap[s.id] = s;
    });
    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const allKanjis = vocabs
      .filter((v) => setMap[v.set_id])
      .map((k) => formatKanjiRecord(k, setMap));
    return { data: allKanjis };
  }

  if (method === 'POST' && pathname === '/kanji') {
    const { kanji, word, onyomi, kunyomi, examples, hanviet, hiragana, meaning, set_id } =
      payload || {};
    const charVal = String(kanji || word || '').trim();
    if (!charVal) {
      throw createApiError('Chữ Hán không được để trống');
    }
    const cleanOnyomi = String(onyomi || '').trim();
    const cleanKunyomi = String(kunyomi || '').trim();
    const cleanExamples = Array.isArray(examples)
      ? examples
          .map((ex) => ({
            word: String(ex.word || '').trim(),
            hanviet: String(ex.hanviet || '').trim(),
            reading: String(ex.reading || ex.hiragana || '').trim(),
            hiragana: String(ex.hiragana || ex.reading || '').trim(),
            meaning: String(ex.meaning || '').trim(),
          }))
          .filter((ex) => ex.word)
      : [];
    const combinedReading =
      String(hiragana || '').trim() || [cleanOnyomi, cleanKunyomi].filter(Boolean).join(' / ');
    const fallbackMeaning =
      String(meaning || '').trim() ||
      (cleanExamples[0]?.meaning ? cleanExamples[0].meaning : '') ||
      String(hanviet || '').trim() ||
      combinedReading ||
      charVal;

    const vocabs = readTable(STORAGE_KEYS.VOCABS);
    const newKanji = {
      id: getNextId(vocabs),
      word: charVal,
      onyomi: cleanOnyomi,
      kunyomi: cleanKunyomi,
      examples: cleanExamples,
      hanviet: String(hanviet || '').trim(),
      hiragana: combinedReading,
      meaning: fallbackMeaning,
      language: 'ja',
      set_id: set_id != null ? Number(set_id) : null,
      repetition: 0,
      ease_factor: 2.5,
      interval: 0,
      next_review: new Date().toISOString(),
      is_starred: false,
    };
    vocabs.push(newKanji);
    writeTable(STORAGE_KEYS.VOCABS, vocabs);
    return { data: formatKanjiRecord(newKanji) };
  }

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
    return { data: { message: `Đã tạo học phần Kanji với ${importedCount} chữ Hán.`, errors } };
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
        .map((k) => formatKanjiRecord(k, { [dbSet.id]: dbSet }));
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
      const onyomiVal = String(payload?.onyomi ?? vocabs[idx].onyomi ?? '').trim();
      const kunyomiVal = String(payload?.kunyomi ?? vocabs[idx].kunyomi ?? '').trim();
      const examplesVal = Array.isArray(payload?.examples)
        ? payload.examples
            .map((ex) => ({
              word: String(ex.word || '').trim(),
              hanviet: String(ex.hanviet || '').trim(),
              reading: String(ex.reading || ex.hiragana || '').trim(),
              hiragana: String(ex.hiragana || ex.reading || '').trim(),
              meaning: String(ex.meaning || '').trim(),
            }))
            .filter((ex) => ex.word)
        : Array.isArray(vocabs[idx].examples)
        ? vocabs[idx].examples
        : [];
      const hanvietVal = String(payload?.hanviet ?? vocabs[idx].hanviet ?? '').trim();
      const combinedReading =
        [onyomiVal, kunyomiVal].filter(Boolean).join(' / ') ||
        String(payload?.hiragana ?? vocabs[idx].hiragana ?? '').trim();
      const meaningVal =
        String(payload?.meaning ?? vocabs[idx].meaning ?? '').trim() ||
        (examplesVal[0]?.meaning ? examplesVal[0].meaning : '') ||
        hanvietVal ||
        wordVal;

      vocabs[idx] = {
        ...vocabs[idx],
        word: wordVal,
        onyomi: onyomiVal,
        kunyomi: kunyomiVal,
        examples: examplesVal,
        hanviet: hanvietVal,
        hiragana: combinedReading,
        meaning: meaningVal,
      };
      writeTable(STORAGE_KEYS.VOCABS, vocabs);
      return { data: formatKanjiRecord(vocabs[idx]) };
    }
  }

  // 4. TEST HISTORIES
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