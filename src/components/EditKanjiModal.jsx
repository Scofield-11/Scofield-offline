import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import api from "../api/axiosConfig";

function EditKanjiModal({ kanjiItem, onClose, onUpdateSuccess }) {
  const [kanji, setKanji] = useState(kanjiItem.kanji || kanjiItem.word || "");
  const [onyomi, setOnyomi] = useState(() => {
    if (kanjiItem.onyomi) return kanjiItem.onyomi;
    if (kanjiItem.hiragana) return kanjiItem.hiragana.split("/")[0]?.trim() || "";
    return "";
  });
  const [kunyomi, setKunyomi] = useState(() => {
    if (kanjiItem.kunyomi) return kanjiItem.kunyomi;
    if (kanjiItem.hiragana && kanjiItem.hiragana.includes("/")) {
      return kanjiItem.hiragana.split("/").slice(1).join(", ").trim();
    }
    return "";
  });
  const [hanviet, setHanviet] = useState(kanjiItem.hanviet || "");
  const [meaning, setMeaning] = useState(kanjiItem.meaning || "");
  const [examples, setExamples] = useState(() =>
    Array.isArray(kanjiItem.examples) && kanjiItem.examples.length > 0
      ? kanjiItem.examples.map((ex) => ({
          word: ex.word || "",
          hanviet: ex.hanviet || "",
          reading: ex.reading || ex.hiragana || "",
          meaning: ex.meaning || "",
        }))
      : [{ word: "", hanviet: "", reading: "", meaning: "" }]
  );

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleExampleChange = (idx, field, val) => {
    setExamples((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleAddExampleRow = () => {
    setExamples((prev) => [...prev, { word: "", hanviet: "", reading: "", meaning: "" }]);
  };

  const handleRemoveExampleRow = (idx) => {
    setExamples((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!kanji.trim()) {
      setError("Vui lòng nhập Chữ Hán chủ đạo!");
      return;
    }

    const cleanExamples = examples
      .map((ex) => ({
        word: ex.word.trim(),
        hanviet: (ex.hanviet || "").trim(),
        reading: ex.reading.trim(),
        hiragana: ex.reading.trim(),
        meaning: ex.meaning.trim(),
      }))
      .filter((ex) => ex.word);

    try {
      setSaving(true);
      const res = await api.put(`/kanji/${kanjiItem.id}`, {
        kanji: kanji.trim(),
        onyomi: onyomi.trim(),
        kunyomi: kunyomi.trim(),
        hanviet: hanviet.trim(),
        meaning: meaning.trim() || hanviet.trim() || kanji.trim(),
        examples: cleanExamples,
      });
      onUpdateSuccess(res.data);
    } catch (err) {
      setError("Có lỗi xảy ra khi lưu thay đổi");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="set-sheet-backdrop" style={{ zIndex: 3100 }} onClick={onClose}>
      <div
        className="set-sheet-panel"
        style={{ maxWidth: "600px", height: "auto", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="set-sheet-grabber d-md-none" />
        <div className="set-sheet-header">
          <h6 className="fw-bold mb-0 text-dark">⛩️ Chỉnh sửa Từ điển Kanji</h6>
          <button type="button" className="btn-icon-soft chip-slate" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-3 pt-2 overflow-auto" style={{ maxHeight: "78vh" }}>
          <div className="row g-2 mb-3">
            <div className="col-4">
              <label className="form-label small fw-bold text-muted mb-1">CHỮ HÁN (1 CHỮ)</label>
              <input
                type="text"
                className="form-control bg-light border-0 fw-bold text-center text-dark"
                style={{ fontSize: "1.6rem", height: "52px", fontFamily: "var(--font-jp-serif)" }}
                value={kanji}
                onChange={(e) => setKanji(e.target.value)}
                placeholder="食"
                required
              />
            </div>
            <div className="col-4">
              <label className="form-label small fw-bold text-muted mb-1">HÁN VIỆT</label>
              <input
                type="text"
                className="form-control bg-light border-0 fw-bold text-dark"
                style={{ height: "52px" }}
                value={hanviet}
                onChange={(e) => setHanviet(e.target.value)}
                placeholder="VD: THỰC"
              />
            </div>
            <div className="col-4">
              <label className="form-label small fw-bold text-muted mb-1">Ý NGHĨA GỐC</label>
              <input
                type="text"
                className="form-control bg-light border-0 fw-semibold text-dark"
                style={{ height: "52px" }}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="VD: Ăn"
              />
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small fw-bold text-muted mb-1">ÂM ÔN (ONYOMI)</label>
              <input
                type="text"
                className="form-control bg-light border-0 fw-semibold text-dark"
                value={onyomi}
                onChange={(e) => setOnyomi(e.target.value)}
                placeholder="VD: ショク, ジキ"
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-bold text-muted mb-1">ÂM KUN (KUNYOMI)</label>
              <input
                type="text"
                className="form-control bg-light border-0 fw-semibold text-dark"
                value={kunyomi}
                onChange={(e) => setKunyomi(e.target.value)}
                placeholder="VD: た.べる, く.う"
              />
            </div>
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label small fw-bold text-muted mb-0">
                DANH SÁCH TỪ ĐI KÈM (TỪ VỰNG + HÁN VIỆT + PHIÊN ÂM + Ý NGHĨA)
              </label>
              <button
                type="button"
                className="btn btn-mobile-chip chip-primary py-1 px-2"
                onClick={handleAddExampleRow}
              >
                <Plus size={14} /> <span>Thêm từ đi kèm</span>
              </button>
            </div>

            <div className="d-flex flex-column gap-2">
              {examples.map((ex, idx) => (
                <div key={idx} className="row g-2 align-items-center bg-light p-2 rounded-3 m-0">
                  <div className="col-6 col-md-3 px-1">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white border-0 fw-bold text-dark"
                      placeholder="Từ vựng (食べる)"
                      value={ex.word}
                      onChange={(e) => handleExampleChange(idx, "word", e.target.value)}
                    />
                  </div>
                  <div className="col-6 col-md-3 px-1">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white border-0 fw-semibold text-primary"
                      placeholder="Hán Việt (THỰC)"
                      value={ex.hanviet || ""}
                      onChange={(e) => handleExampleChange(idx, "hanviet", e.target.value)}
                    />
                  </div>
                  <div className="col-5 col-md-3 px-1">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white border-0 text-dark"
                      placeholder="Phiên âm (たべる)"
                      value={ex.reading}
                      onChange={(e) => handleExampleChange(idx, "reading", e.target.value)}
                    />
                  </div>
                  <div className="col-5 col-md-2 px-1">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white border-0 text-dark"
                      placeholder="Ý nghĩa (Ăn)"
                      value={ex.meaning}
                      onChange={(e) => handleExampleChange(idx, "meaning", e.target.value)}
                    />
                  </div>
                  <div className="col-2 col-md-1 px-1 text-end">
                    <button
                      type="button"
                      className="btn-icon-soft chip-danger flex-shrink-0"
                      style={{ width: "32px", height: "32px" }}
                      onClick={() => handleRemoveExampleRow(idx)}
                      title="Xóa dòng này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-danger small fw-bold mb-2">{error}</p>}

          <div className="d-flex gap-2 mt-3">
            <button type="button" className="btn btn-light btn-touch w-50 fw-bold" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary btn-touch w-50 fw-bold text-white" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default EditKanjiModal;