import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';
import confetti from 'canvas-confetti';

function ExamTaking({
  examData,
  isInstantFeedback,
  backToList,
  fetchHistory,
  openSaveModal,
  startExam,
}) {
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (qId, optIndex) => {
    if (isSubmitted) return;
    setAnswers({ ...answers, [qId]: optIndex });
  };

  const scrollToQuestion = (idx) => {
    const element = document.getElementById(`question-${idx}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 125;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    const wrongQs = examData.questions.filter((q) => answers[q.id] !== q.correct_ans);
    const scoreCount = examData.questions.length - wrongQs.length;

    if (scoreCount / examData.questions.length >= 0.8) {
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
    }

    const wrongDetails = wrongQs.map((q) => ({
      question: q.question,
      options: [...q.options],
      correct_ans: q.correct_ans,
      user_ans: answers[q.id],
    }));

    try {
      await api.post(`/exams/${examData.id}/history`, {
        score: scoreCount,
        total: examData.questions.length,
        wrong_details: wrongDetails,
      });
      fetchHistory();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error('Lỗi khi lưu lịch sử làm bài!');
    }
  };

  const handleCreateFromCurrentMistakes = async () => {
    const wrongQs = examData.questions.filter((q) => answers[q.id] !== q.correct_ans);
    const newTitle = window.prompt(
      'Nhập tên cho đề ôn tập câu sai:',
      `Ôn câu sai - ${examData.title}`
    );
    if (!newTitle || !newTitle.trim()) return;

    const rawText = wrongQs
      .map(
        (q) =>
          `${q.question} | ${q.options[0]} | ${q.options[1]} | ${q.options[2]} | ${q.options[3]} | ${q.correct_ans}`
      )
      .join('\n');

    try {
      await api.post('/exams/import', { title: newTitle.trim(), raw_text: rawText });
      toast.success(`Đã tạo đề: ${newTitle.trim()}`);
      backToList();
      window.scrollTo(0, 0);
    } catch (error) {
      toast.error('Lỗi khi tạo bài test ôn tập.');
    }
  };

  const wrongQuestions = examData.questions.filter((q) => answers[q.id] !== q.correct_ans);
  const score = examData.questions.length - wrongQuestions.length;
  const totalQuestions = examData.questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="container mt-1 has-mobile-bottom-bar px-2 px-md-3" style={{ maxWidth: '900px' }}>
      {/* THANH TRẠNG THÁI GHIM ĐỈNH */}
      <div className="mobile-sticky-top d-print-none">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <button className="btn btn-mobile-chip chip-slate" onClick={backToList}>
            ← Thoát
          </button>
          <div className="text-truncate fw-bold text-dark small px-2" style={{ maxWidth: '52%' }}>
            {examData.title}
          </div>
          <span className="badge chip-primary rounded-pill px-2 py-1">
            {isSubmitted ? `${score}/${totalQuestions} điểm` : `${answeredCount}/${totalQuestions} câu`}
          </span>
        </div>

        <div className="progress mb-2" style={{ height: '5px', borderRadius: '6px' }}>
          <div
            className="progress-bar bg-primary"
            role="progressbar"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="mobile-question-strip">
          {examData.questions.map((q, idx) => {
            const userAns = answers[q.id];
            const isAnswered = userAns !== undefined;
            let btnColorClass = 'chip-slate';
            if (isSubmitted) {
              btnColorClass = userAns === q.correct_ans ? 'btn-success text-white' : 'btn-danger text-white';
            } else if (isAnswered) {
              btnColorClass = 'btn-primary text-white';
            }
            return (
              <button key={idx} className={`btn ${btnColorClass}`} onClick={() => scrollToQuestion(idx)}>
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {isSubmitted && (
        <div className="card border-0 rounded-4 p-3 mb-3 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold text-primary mb-1">
                🎯 Kết quả: {score} / {totalQuestions}
              </h5>
              <p className="text-muted small mb-0">
                {wrongQuestions.length === 0
                  ? 'Xuất sắc! Bạn đúng tuyệt đối 100%.'
                  : `Cần ôn lại ${wrongQuestions.length} câu chưa chính xác.`}
              </p>
            </div>
            <span className="fs-2">{score / totalQuestions >= 0.8 ? '🏆' : '💪'}</span>
          </div>
        </div>
      )}

      {/* DANH SÁCH CÂU HỎI */}
      <div>
        {examData.questions.map((q, idx) => {
          const userAns = answers[q.id];
          const isAnswered = userAns !== undefined;
          const showResult = isSubmitted || (isInstantFeedback && isAnswered);

          return (
            <div id={`question-${idx}`} key={q.id} className="card border-0 rounded-4 mb-3 p-3">
              <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                <h6 className="mb-0 fw-bold text-dark" style={{ lineHeight: '1.45' }}>
                  <span className="text-primary me-1">Câu {idx + 1}:</span> {q.question}
                </h6>
                <button
                  className="btn-icon-soft chip-warning d-print-none"
                  onClick={() => openSaveModal(q)}
                  title="Lưu câu hỏi này"
                >
                  ⭐
                </button>
              </div>

              <div className="row g-2">
                {q.options.map((opt, oIdx) => {
                  const optNumber = oIdx + 1;
                  let btnClass = 'bg-light text-dark border';
                  if (showResult) {
                    if (optNumber === q.correct_ans) btnClass = 'btn-success text-white border-success';
                    else if (userAns === optNumber && userAns !== q.correct_ans)
                      btnClass = 'btn-danger text-white border-danger';
                  } else if (userAns === optNumber) {
                    btnClass = 'btn-primary text-white';
                  }

                  return (
                    <div className="col-12 col-sm-6" key={oIdx}>
                      <button
                        className={`btn w-100 text-start px-3 py-2 fw-semibold justify-content-start ${btnClass}`}
                        style={{ minHeight: '42px', borderRadius: '10px' }}
                        onClick={() => handleSelect(q.id, optNumber)}
                      >
                        <span
                          className="badge rounded-circle me-2 d-inline-flex align-items-center justify-content-center"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'rgba(0,0,0,0.08)',
                            color: 'inherit',
                          }}
                        >
                          {optNumber}
                        </span>
                        <span className="text-wrap">{opt}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* THANH CÔNG CỤ GHIM ĐÁY */}
      <div className="mobile-bottom-bar d-print-none">
        <div className="container px-0" style={{ maxWidth: '900px' }}>
          {!isSubmitted ? (
            <div className="d-flex gap-2">
              <button className="btn btn-mobile-chip chip-slate px-3" onClick={backToList}>
                ← Danh sách
              </button>
              <button className="btn btn-primary btn-touch flex-grow-1" onClick={handleSubmit}>
                ✅ Nộp bài ({answeredCount}/{totalQuestions})
              </button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <button
                className="btn btn-mobile-chip chip-warning flex-fill"
                onClick={() => {
                  setAnswers({});
                  setIsSubmitted(false);
                  startExam(examData.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                🔄 Làm lại
              </button>
              {wrongQuestions.length > 0 && (
                <button
                  className="btn btn-mobile-chip btn-primary text-white flex-fill"
                  onClick={handleCreateFromCurrentMistakes}
                >
                  ✨ Tạo đề câu sai
                </button>
              )}
              <button className="btn btn-mobile-chip chip-slate" onClick={backToList}>
                🏠 Xong
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExamTaking;