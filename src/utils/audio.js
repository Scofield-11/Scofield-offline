let audioCtx = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playSound = (type) => {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'pop') {
      // Âm thanh lật/chuyển thẻ nhẹ nhàng
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'correct') {
      // Tiếng "Ting!" thanh thúy
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // Nốt E5
      osc.frequency.setValueAtTime(880.00, now + 0.1); // Nốt A5
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      // Tiếng "Buzzer" trầm báo sai
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'win') {
      // Tiếng nhạc hoàn thành bài
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    console.error("Audio playback error:", e);
  }
};

export const speakText = (text, langHint = 'ja', rate = 0.9) => {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const cleanText = String(text).trim();
  if (!cleanText) return;

  const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(cleanText);
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanText);

  let lang = 'ja-JP';
  if (langHint === 'zh' || langHint === 'zh-CN') {
    lang = 'zh-CN';
  } else if (langHint === 'en' || langHint === 'en-US') {
    lang = 'en-US';
  } else if (
    langHint === 'vi-VN' ||
    langHint === 'vi' ||
    langHint === 'meaning' ||
    langHint === 'hanviet' ||
    langHint === 'summary' ||
    hasVietnamese
  ) {
    lang = 'vi-VN';
  } else if (langHint === 'ja' || langHint === 'ja-JP' || hasJapanese) {
    lang = 'ja-JP';
  } else if (/^[a-zA-Z0-9\s.,?!'"()-]+$/.test(cleanText)) {
    lang = 'en-US';
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const langPrefix = lang.split('-')[0].toLowerCase();
    const matchingVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
    if (matchingVoices.length > 0) {
      const preferredVoice =
        matchingVoices.find((v) => /google|microsoft|natural|online/i.test(v.name)) ||
        matchingVoices.find((v) => v.localService) ||
        matchingVoices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
};