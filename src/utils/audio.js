// ============================================================================
// BỘ XỬ LÝ ÂM THANH HIỆU ỨNG (WEB AUDIO API) & GIỌNG ĐỌC TTS ĐA NGÔN NGỮ
// ============================================================================

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const playSound = (type = 'pop') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'correct') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.15, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.18);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.22);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    }
  } catch (e) {
    // Bỏ qua nếu trình duyệt chặn autoplay âm thanh
  }
};

// Kiểm tra chuỗi có chứa ký tự dấu đặc trưng của Tiếng Việt không
const isVietnameseText = (str) => {
  if (!str) return false;
  const vnRegex =
    /[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
  // Loại trừ các dấu thanh Pinyin tiếng Trung phổ biến (ā, ē, ī, ō, ū, ǖ, ǎ, ě, ǐ, ǒ, ǔ, ǚ)
  const hasUniqueVnChars =
    /[ăâđêôơưĂÂĐÊÔƠƯảãạắằẳẵặấầẩẫậẻẽẹếềểễệỉĩịỏõọốồổỗộớờởỡợủũụứừửữựỳỷỹỵ]/i.test(str);
  if (hasUniqueVnChars) return true;
  return vnRegex.test(str) && !/[āēīōūǖǎěǐǒǔǚ]/i.test(str);
};

// Chuẩn hóa mã ngôn ngữ và tự động phát hiện ngôn ngữ thực tế của văn bản
const resolveTargetLocale = (text, rawLang = 'ja') => {
  const cleanText = String(text || '').trim();
  const langLower = String(rawLang || 'ja').toLowerCase();

  // 1. Nếu chỉ định rõ là Tiếng Việt
  if (langLower.startsWith('vi') || langLower === 'vn') {
    return 'vi-VN';
  }

  // 2. Nếu văn bản có chứa Hiragana / Katakana -> Chắc chắn là Tiếng Nhật
  if (/[\u3040-\u30ff]/.test(cleanText)) {
    return 'ja-JP';
  }

  // 3. Nếu văn bản chứa chữ Hán (CJK)
  if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(cleanText)) {
    if (langLower.startsWith('zh') || langLower === 'cn') {
      return 'zh-CN';
    }
    return 'ja-JP';
  }

  // 4. Nếu văn bản không có chữ Hán nhưng mang dấu Tiếng Việt đặc trưng -> Đọc bằng Tiếng Việt
  if (isVietnameseText(cleanText)) {
    return 'vi-VN';
  }

  // 5. Chuẩn hóa theo mã ngôn ngữ truyền vào
  if (langLower.startsWith('zh') || langLower === 'cn') return 'zh-CN';
  if (langLower.startsWith('en')) return 'en-US';
  if (langLower.startsWith('ja') || langLower === 'jp') return 'ja-JP';

  return 'vi-VN';
};

const pickBestVoice = (voices, locale) => {
  if (!voices || voices.length === 0) return null;
  const langPrefix = locale.split('-')[0].toLowerCase();
  const localeLower = locale.toLowerCase();

  // Tìm danh sách các voice khớp ngôn ngữ
  const matching = voices.filter((v) => {
    const vLang = (v.lang || '').replace('_', '-').toLowerCase();
    return vLang === localeLower || vLang.startsWith(langPrefix + '-') || vLang === langPrefix;
  });

  if (matching.length === 0) return null;

  // Ưu tiên giọng Google / Microsoft / Natural / Siri chất lượng cao
  const preferred = matching.find((v) =>
    /google|microsoft|natural|online|siri|kyoko|otoya|ting-ting|meijia|hoai|an/i.test(v.name)
  );
  if (preferred) return preferred;

  // Ưu tiên khớp chính xác mã vùng (VD: zh-CN, vi-VN, ja-JP)
  const exactLocale = matching.find(
    (v) => (v.lang || '').replace('_', '-').toLowerCase() === localeLower
  );
  return exactLocale || matching[0];
};

export const speakText = (text, lang = 'ja', rate = 0.92) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const targetLocale = resolveTargetLocale(cleanText, lang);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetLocale;
    utterance.rate = rate;

    const voices = synth.getVoices();
    const chosenVoice = pickBestVoice(voices, targetLocale);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang || targetLocale;
    }

    // Timeout nhỏ giúp tránh lỗi nuốt âm sau khi gọi synth.cancel() trên Chrome/Mobile
    setTimeout(() => {
      synth.speak(utterance);
    }, 35);
  } catch (e) {
    console.warn('Lỗi phát âm TTS:', e);
  }
};