import React, { useMemo, useEffect } from 'react';
import {
  ListChecks,
  Keyboard,
  Shuffle,
  Check,
  BookOpen,
  Clock,
  Zap,
  Compass,
  ArrowRight,
} from 'lucide-react';
import SetSelector from './SetSelector';
import GameModeSelector from './GameModeSelector';

function TestSetup({
  sets,
  currentContentType,
  selectedSetId,
  setSelectedSetId,
  questionCount,
  setQuestionCount,
  poolSize,
  questionFormat,
  setQuestionFormat,
  isReversed,
  setIsReversed,
  kanjiFront,
  setKanjiFront,
  kanjiBack,
  setKanjiBack,
  generateTest,
}) {
  // Logic kiểm tra chế độ 4 trường (Kanji / Tiếng Nhật / Tiếng Trung) nguyên bản
  const hasFourFields = useMemo(() => {
    if (currentContentType === 'kanji') return true;
    if (
      String(selectedSetId).includes('ja') ||
      String(selectedSetId).includes('zh') ||
      String(selectedSetId).includes('kanji')
    ) {
      return true;
    }

    let targetSets = [];
    if (String(selectedSetId).startsWith('folder_')) {
      const folderName = String(selectedSetId).substring(7);
      targetSets = (sets || []).filter((s) => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    } else {
      const s = (sets || []).find((set) => set.id == selectedSetId);
      if (s) targetSets = [s];
    }

    if (targetSets.length > 0) {
      return targetSets.some(
        (s) =>
          s.language === 'ja' ||
          s.language === 'zh' ||
          s.type === 'kanji' ||
          (s.vocabularies && s.vocabularies.some((v) => v.hanviet || v.hiragana))
      );
    }
    return false;
  }, [currentContentType, selectedSetId, sets]);

  const handleSwap = () => {
    if (hasFourFields) {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };

  // Giới hạn số câu hỏi khi poolSize thay đổi
  useEffect(() => {
    if (poolSize > 0 && questionCount > poolSize) {
      setQuestionCount(poolSize);
    }
  }, [poolSize, questionCount, setQuestionCount]);

  // Kiểm tra ngôn ngữ tiếng Trung
  const isChinese = useMemo(() => {
    return (
      String(selectedSetId).includes('zh') ||
      (sets || []).find((s) => String(s.id) === String(selectedSetId))?.language === 'zh'
    );
  }, [selectedSetId, sets]);

  // Thông tin học phần đang chọn
  const currentSet = useMemo(() => {
    const idStr = String(selectedSetId);
    if (!sets || sets.length === 0) return null;
    return sets.find((s) => String(s.id) === idStr);
  }, [sets, selectedSetId]);

  const currentSetDisplay = useMemo(() => {
    const idStr = String(selectedSetId);
    if (idStr === 'lang_ja' || idStr === 'all_ja') return { title: 'Tất cả tiếng Nhật' };
    if (idStr === 'lang_zh' || idStr === 'all_zh') return { title: 'Tất cả tiếng Trung' };
    if (idStr === 'lang_en' || idStr === 'all_en') return { title: 'Tất cả tiếng Anh' };
    if (idStr === 'lang_kanji' || idStr === 'all_kanji') return { title: 'Tất cả Kanji' };
    if (idStr.startsWith('folder_')) {
      return { title: idStr.substring(7) };
    }
    if (currentSet) {
      return { title: currentSet.title || 'Học phần không tên' };
    }
    return { title: 'Chưa chọn học phần' };
  }, [selectedSetId, currentSet]);

  // Hiển thị chiều dịch đang kích hoạt
  const currentDirectionText = useMemo(() => {
    if (hasFourFields) {
      const map = isChinese
        ? {
            kanji: 'Chữ Hán',
            word: 'Chữ Hán',
            hanviet: 'Hán Việt',
            hiragana: 'Pinyin',
            meaning: 'Ý nghĩa',
          }
        : {
            kanji: 'Từ vựng',
            word: 'Từ vựng',
            hanviet: 'Hán Việt',
            hiragana: 'Phiên âm',
            meaning: 'Ý nghĩa',
          };
      const front = map[kanjiFront] || 'Từ vựng';
      const back = map[kanjiBack] || 'Ý nghĩa';
      return `${front} ➔ ${back}`;
    }
    return isReversed ? 'Nghĩa ➔ Từ vựng' : 'Từ vựng ➔ Nghĩa';
  }, [hasFourFields, isChinese, kanjiFront, kanjiBack, isReversed]);

  // 3 Hình thức thi có Tonal Palette & thông số tốc độ
  const formatOptions = useMemo(
    () => [
      {
        id: 'choice',
        title: 'Trắc nghiệm',
        tag: 'Phản xạ',
        desc: 'Chọn 1 trong 4 đáp án đúng',
        icon: ListChecks,
        speedSeconds: 6,
        colorKey: 'choice',
        badgeClass: 'icon-badge-violet',
      },
      {
        id: 'typing',
        title: 'Tự luận',
        tag: 'Nhớ sâu',
        desc: 'Gõ phím đáp án chính xác',
        icon: Keyboard,
        speedSeconds: 12,
        colorKey: 'typing',
        badgeClass: 'icon-badge-sky',
      },
      {
        id: 'mixed',
        title: 'Hỗn hợp',
        tag: 'Toàn diện',
        desc: '50% trắc nghiệm & 50% tự luận',
        icon: Shuffle,
        speedSeconds: 9,
        colorKey: 'mixed',
        badgeClass: 'icon-badge-rose',
      },
    ],
    []
  );

  const activeFormatObj = useMemo(() => {
    return formatOptions.find((f) => f.id === questionFormat) || formatOptions[0];
  }, [questionFormat, formatOptions]);

  // Ước tính thời gian
  const estimatedTime = useMemo(() => {
    const qCount = Number(questionCount) || 0;
    if (qCount <= 0) return { text: '~0 phút' };
    const sec = qCount * activeFormatObj.speedSeconds;
    const mins = Math.floor(sec / 60);
    const remainSec = sec % 60;
    if (mins === 0) {
      return { text: `~${remainSec} giây` };
    }
    if (remainSec === 0) {
      return { text: `~${mins} phút` };
    }
    return { text: `~${mins}p ${remainSec}s` };
  }, [questionCount, activeFormatObj]);

  // Quick-Pick pills: 10, 20, 30 và Tất cả
  const quickPillOptions = useMemo(() => {
    const pSize = Number(poolSize) || 0;
    if (pSize <= 0) return [];
    return [10, 20, 30].filter((n) => n < pSize);
  }, [poolSize]);

  // Xử lý input số câu
  const handleNumberChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setQuestionCount('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (poolSize > 0) {
        setQuestionCount(Math.min(num, poolSize));
      } else {
        setQuestionCount(num);
      }
    }
  };

  const handleNumberBlur = () => {
    const num = Number(questionCount);
    if (isNaN(num) || num < 1) {
      setQuestionCount(1);
    } else if (poolSize > 0 && num > poolSize) {
      setQuestionCount(poolSize);
    }
  };

  return (
    <div className="test-lobby-container">
      {/* Tiêu đề trang tối giản */}
      <div className="test-lobby-header">
        <h2 className="test-lobby-title">Thiết lập Bài Thi</h2>
      </div>

      {/* Bố cục 2 Cột Tinh Gọn (Max 960px) */}
      <div className="test-lobby-layout">
        {/* CỘT TRÁI (7/12): CẤU HÌNH CHIẾN THUẬT */}
        <div className="test-lobby-config-col">
          {/* KHU VỰC 1: HỌC PHẦN */}
          <div className="test-lobby-card">
            <div className="test-lobby-card-title">Học phần mục tiêu</div>
            <SetSelector
              sets={sets}
              selectedSetId={selectedSetId}
              setSelectedSetId={setSelectedSetId}
            />
          </div>

          {/* KHU VỰC 2: SỐ LƯỢNG CÂU HỎI (Gộp Slider & Quick-Pick trên cùng khối) */}
          <div className="test-lobby-card">
            <div className="test-lobby-card-title d-flex justify-content-between align-items-center">
              <span>Số lượng câu hỏi</span>
              <span className="text-secondary fw-normal">
                Tối đa: <strong className="text-primary">{poolSize || 0}</strong> câu
              </span>
            </div>

            <div className="test-lobby-count-wrapper">
              <div className="test-lobby-count-top">
                <div className="test-lobby-slider-container">
                  <input
                    type="range"
                    className="test-lobby-range"
                    min={1}
                    max={Math.max(1, poolSize || 1)}
                    value={Math.min(Number(questionCount) || 1, Math.max(1, poolSize || 1))}
                    disabled={!poolSize || poolSize <= 0}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                </div>
                <div className="test-lobby-stepper">
                  <input
                    type="number"
                    className="test-lobby-stepper-input"
                    min={1}
                    max={poolSize || 1}
                    value={questionCount}
                    disabled={!poolSize || poolSize <= 0}
                    onChange={handleNumberChange}
                    onBlur={handleNumberBlur}
                  />
                  <span className="test-lobby-stepper-unit">câu</span>
                </div>
              </div>

              <div className="test-lobby-pills-row">
                {quickPillOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`test-lobby-pill ${questionCount === num ? 'active' : ''}`}
                    onClick={() => setQuestionCount(num)}
                    disabled={!poolSize || poolSize <= 0}
                  >
                    {num} câu
                  </button>
                ))}
                <button
                  type="button"
                  className={`test-lobby-pill ${
                    questionCount === poolSize && poolSize > 0 ? 'active' : ''
                  }`}
                  onClick={() => poolSize > 0 && setQuestionCount(poolSize)}
                  disabled={!poolSize || poolSize <= 0}
                >
                  Tất cả ({poolSize || 0})
                </button>
              </div>
            </div>
          </div>

          {/* KHU VỰC 3: HÌNH THỨC LÀM BÀI (3 Thẻ Tonal Violet) */}
          <div className="test-lobby-card">
            <div className="test-lobby-card-title">Hình thức làm bài</div>
            <div className="test-lobby-format-grid">
              {formatOptions.map((fmt) => {
                const IconComponent = fmt.icon;
                const isSelected = questionFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    className={`test-lobby-format-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setQuestionFormat(fmt.id)}
                  >
                    <div className="test-lobby-format-top">
                      <div className={`test-lobby-format-icon icon-badge ${fmt.badgeClass || fmt.colorKey}`}>
                        <IconComponent size={20} strokeWidth={2.2} />
                      </div>
                      <span className="test-lobby-format-tag">{fmt.tag}</span>
                    </div>

                    {isSelected && (
                      <div className="test-lobby-format-check" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}

                    <div className="test-lobby-format-title">{fmt.title}</div>
                    <div className="test-lobby-format-desc">{fmt.desc}</div>
                    <div className="test-lobby-format-speed">
                      <Clock size={12} strokeWidth={2.2} />
                      <span>~{fmt.speedSeconds}s/câu</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KHU VỰC 4: KỸ NĂNG & DẠNG CÂU HỎI */}
          <div className="test-lobby-card">
            <GameModeSelector
              hasFourFields={hasFourFields}
              currentContentType={currentContentType}
              currentLanguage={
                String(selectedSetId).includes('zh') ||
                (sets || []).find((s) => String(s.id) === String(selectedSetId))?.language === 'zh'
                  ? 'zh'
                  : String(selectedSetId).includes('en')
                  ? 'en'
                  : 'ja'
              }
              isReversed={isReversed}
              setIsReversed={setIsReversed}
              kanjiFront={kanjiFront}
              setKanjiFront={setKanjiFront}
              kanjiBack={kanjiBack}
              setKanjiBack={setKanjiBack}
              onSwap={handleSwap}
              sectionLabel="Kỹ năng & Chiều dịch"
            />
          </div>
        </div>

        {/* CỘT PHẢI (5/12, Sticky): TẤM VÉ VÀO PHÒNG THI (HERO BATTLE TICKET) */}
        <div className="test-lobby-ticket-col">
          <div className="test-lobby-hero-card">
            {/* Họa tiết chữ Hán chìm '試' */}
            <div className="test-lobby-watermark-kanji" aria-hidden="true">
              試
            </div>

            <div className="test-lobby-hero-content">
              {/* Header */}
              <div className="test-lobby-hero-header">
                <span className="test-lobby-hero-title">Tấm vé vào phòng thi</span>
                <span
                  className="badge bg-secondary-subtle text-secondary"
                  style={{ fontSize: '0.68rem', fontWeight: 600 }}
                >
                  Live Summary
                </span>
              </div>

              {/* Khối hiển thị số câu hỏi lớn + Progress Bar */}
              <div className="test-lobby-count-hero-block">
                <div className="test-lobby-hero-count-label">Quy mô bài thi</div>
                <div className="d-flex align-items-baseline">
                  <span className="test-lobby-hero-count-number">{questionCount || 0}</span>
                  <span className="test-lobby-hero-count-unit">/ {poolSize || 0} câu</span>
                </div>
                <div className="test-lobby-progress-track">
                  <div
                    className="test-lobby-progress-fill"
                    style={{
                      width: `${
                        poolSize > 0
                          ? Math.min(
                              100,
                              Math.round(((Number(questionCount) || 0) / poolSize) * 100)
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="test-lobby-progress-sublabel">
                  {poolSize > 0
                    ? `${Math.min(
                        100,
                        Math.round(((Number(questionCount) || 0) / poolSize) * 100)
                      )}% ngân hàng câu hỏi sẵn sàng`
                    : 'Chưa có câu hỏi'}
                </div>
              </div>

              {/* Thông số chi tiết đặt trong các bề mặt elevated */}
              <div className="test-lobby-params-list">
                <div className="test-lobby-param-item">
                  <div className="test-lobby-param-icon">
                    <BookOpen size={16} strokeWidth={2.2} />
                  </div>
                  <div className="test-lobby-param-details">
                    <div className="test-lobby-param-label">Học phần</div>
                    <div className="test-lobby-param-value" title={currentSetDisplay.title}>
                      {currentSetDisplay.title}
                    </div>
                  </div>
                </div>

                <div className="test-lobby-param-item">
                  <div className="test-lobby-param-icon">
                    <Clock size={16} strokeWidth={2.2} />
                  </div>
                  <div className="test-lobby-param-details">
                    <div className="test-lobby-param-label">Thời gian dự kiến</div>
                    <div className="test-lobby-param-value">{estimatedTime.text}</div>
                  </div>
                </div>

                <div className="test-lobby-param-item">
                  <div className="test-lobby-param-icon">
                    <Zap size={16} strokeWidth={2.2} />
                  </div>
                  <div className="test-lobby-param-details">
                    <div className="test-lobby-param-label">Hình thức</div>
                    <div className="test-lobby-param-value">
                      {activeFormatObj.title} ({activeFormatObj.tag})
                    </div>
                  </div>
                </div>

                <div className="test-lobby-param-item">
                  <div className="test-lobby-param-icon">
                    <Compass size={16} strokeWidth={2.2} />
                  </div>
                  <div className="test-lobby-param-details">
                    <div className="test-lobby-param-label">Chiều hỏi</div>
                    <div className="test-lobby-param-value" title={currentDirectionText}>
                      {currentDirectionText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nút CTA chuẩn phong cách Linear */}
              <button
                type="button"
                className="test-lobby-cta-btn"
                onClick={generateTest}
                disabled={!poolSize || poolSize <= 0 || !questionCount || questionCount <= 0}
              >
                <span>Bắt đầu làm bài</span>
                <ArrowRight size={18} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestSetup;
