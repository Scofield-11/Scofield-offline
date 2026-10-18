// ============================================================================
// BỘ XỬ LÝ ÂM THANH HIỆU ỨNG (WEB AUDIO API) & GIỌNG ĐỌC TTS ĐA NGÔN NGỮ
// ============================================================================

let audioCtx = null;
let activeUtterance = null; // Giữ tham chiếu toàn cục tránh lỗi Chrome V8 ngắt giọng đọc giữa chừng
let cachedVoices = [];
let ttsIframe = null;

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

// Nạp trước danh sách giọng đọc ngay khi khởi chạy
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

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
    // Bỏ qua nếu trình duyệt chặn autoplay
  }
};

// Kiểm tra chuỗi có chứa ký tự dấu đặc trưng của Tiếng Việt không
const isVietnameseText = (str) => {
  if (!str) return false;
  // Loại trừ các dấu thanh ngang/hỏi đặc thù của Pinyin (ā, ē, ī, ō, ū, ǖ, ǎ, ě, ǐ, ǒ, ǔ, ǚ)
  if (/[āēīōūǖǎěǐǒǔǚ]/i.test(str)) return false;
  return /[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    str
  );
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

  // 4. Nếu văn bản mang dấu Tiếng Việt
  if (isVietnameseText(cleanText)) {
    return 'vi-VN';
  }

  // 5. Nếu đang ở học phần Tiếng Trung / Tiếng Nhật nhưng chuỗi KHÔNG có chữ Hán hay Kana
  // (tức là chữ Latin/Tiếng Việt không dấu hoặc âm Hán Việt) -> Bắt buộc đọc bằng Tiếng Việt!
  if (
    langLower.startsWith('zh') ||
    langLower === 'cn' ||
    langLower.startsWith('ja') ||
    langLower === 'jp'
  ) {
    return 'vi-VN';
  }

  if (langLower.startsWith('en')) return 'en-US';
  return 'vi-VN';
};

const pickBestVoice = (voices, locale) => {
  if (!voices || voices.length === 0) return null;
  const langPrefix = locale.split('-')[0].toLowerCase();
  const localeLower = locale.toLowerCase();

  const matching = voices.filter((v) => {
    const vLang = (v.lang || '').replace('_', '-').toLowerCase();
    return vLang === localeLower || vLang.startsWith(langPrefix + '-') || vLang === langPrefix;
  });

  if (matching.length === 0) return null;

  const preferred = matching.find((v) =>
    /google|microsoft|natural|online|siri|kyoko|otoya|ting-ting|meijia|hoai|an|linh/i.test(v.name)
  );
  if (preferred) return preferred;

  const exactLocale = matching.find(
    (v) => (v.lang || '').replace('_', '-').toLowerCase() === localeLower
  );
  return exactLocale || matching[0];
};

// Phát âm dự phòng qua luồng Google TTS (dùng iframe ẩn no-referrer để không bị chặn 403/CORS trên PC không có giọng vi-VN)
const playCloudTtsFallback = (text, locale, rate = 1.0) => {
  if (typeof document === 'undefined') return false;
  try {
    if (!ttsIframe) {
      ttsIframe = document.createElement('iframe');
      ttsIframe.style.display = 'none';
      ttsIframe.srcdoc =
        '<!DOCTYPE html><html><head><meta name="referrer" content="no-referrer"></head><body><audio id="scofield-tts-audio"></audio></body></html>';
      document.body.appendChild(ttsIframe);
    }

    const triggerAudio = () => {
      const doc = ttsIframe.contentDocument || ttsIframe.contentWindow?.document;
      if (!doc) return;
      let audio = doc.getElementById('scofield-tts-audio');
      if (!audio) {
        audio = doc.createElement('audio');
        audio.id = 'scofield-tts-audio';
        doc.body.appendChild(audio);
      }
      audio.pause();
      const tl = locale.split('-')[0].toLowerCase();
      const shortText = text.slice(0, 180);
      audio.src = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${tl}&q=${encodeURIComponent(
        shortText
      )}`;
      audio.playbackRate = Math.min(Math.max(rate, 0.6), 1.4);
      audio.play().catch(() => {});
    };

    if (ttsIframe.contentDocument && ttsIframe.contentDocument.readyState === 'complete') {
      triggerAudio();
    } else {
      ttsIframe.onload = triggerAudio;
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const speakText = (text, lang = 'ja', rate = 0.92) => {
  if (typeof window === 'undefined') return;

  // Làm sạch các ký tự ngoặc, gạch chéo để bộ đọc không bị vấp
  const cleanText = String(text || '')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[()[\]{}|•~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const targetLocale = resolveTargetLocale(cleanText, lang);

  try {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.cancel();

      const voices = cachedVoices.length > 0 ? cachedVoices : synth.getVoices();
      const chosenVoice = pickBestVoice(voices, targetLocale);

      // Nếu cần đọc Tiếng Việt (hoặc ngôn ngữ bất kỳ) mà trình duyệt trên máy KHÔNG có voice đó -> Dùng Cloud TTS
      if (!chosenVoice) {
        const usedCloud = playCloudTtsFallback(cleanText, targetLocale, rate);
        if (usedCloud) return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      activeUtterance = utterance;
      utterance.lang = targetLocale;
      utterance.rate = rate;

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang || targetLocale;
      }

      utterance.onerror = () => {
        playCloudTtsFallback(cleanText, targetLocale, rate);
      };

      synth.speak(utterance);
    } else {
      playCloudTtsFallback(cleanText, targetLocale, rate);
    }
  } catch (e) {
    playCloudTtsFallback(cleanText, targetLocale, rate);
  }
};