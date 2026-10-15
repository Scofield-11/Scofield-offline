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
      const y = element.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    const wrongQs = examData.questions.filter((q) => answers[q.id] !== q.correct_ans);
    const scoreCount = examData.questions.length - wrongQs.length;

    if (scoreCount / examData.questions.length >= 0.8) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
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
      'Vui lòng nhập tên cho đề ôn tập:',
      `Ôn tập câu sai - ${examData.title}`
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
      toast.success(`Đã tạo thành công đề thi: ${newTitle.trim()}`);
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
    <div className="container mt-2 has-mobile-bottom-bar" style={{ maxWidth: '950px' }}>
      {/* THANH TRẠNG THÁI GHIM ĐỈNH MÀN HÌNH (MOBILE-STICKY-TOP) */}
      <div className="mobile-sticky-top d-print-none">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <button className="btn btn-light text-dark btn-mobile-chip" onClick={backToList}>
            ← Thoát
          </button>
          <div className="text-truncate fw-bold text-dark px-2" style={{ maxWidth: '50%' }}>
            {examData.title}
          </div>
          <span className="badge bg-primary rounded-pill px-3 py-2 fs-6">
            {isSubmitted ? `Điểm: ${score}/${totalQuestions}` : `${answeredCount}/${totalQuestions}`}
          </span>
        </div>

        <div className="progress mb-2" style={{ height: '6px', borderRadius: '8px' }}>
          <div
            className="progress-bar bg-primary"
            role="progressbar"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* THANH CUỘN NGANG CÂU HỎI */}
        <div className="mobile-question-strip">
          {examData.questions.map((q, idx) => {
            const userAns = answers[q.id];
            const isAnswered = userAns !== undefined;
            let btnColorClass = 'btn-outline-secondary bg-white';
            if (isSubmitted) {
              if (userAns === q.correct_ans) btnColorClass = 'btn-success text-white border-success';
              else btnColorClass = 'btn-danger text-white border-danger';
            } else if (isAnswered) {
              btnColorClass = 'btn-primary text-white';
            }
            return (
              <button
                key={idx}
                className={`btn ${btnColorClass}`}
                onClick={() => scrollToQuestion(idx)}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* KẾT QUẢ TỔNG QUAN NẾU ĐÃ NỘP */}
      {isSubmitted && (
        <div className="alert alert-info mb-4 shadow-sm border-0 rounded-4 p-4">
          <h4 className="fw-bold mb-1">
            🎯 Kết quả: {score} / {totalQuestions} câu đúng
          </h4>
          <p className="mb-0 text-muted">
            {wrongQuestions.length === 0
              ? 'Tuyệt vời! Bạn đã trả lời đúng tuyệt đối 100%.'
              : `Bạn có ${wrongQuestions.length} câu trả lời chưa chính xác.`}
          </p>
        </div>
      )}

      {/* DANH SÁCH CÂU HỎI */}
      <div>
        {examData.questions.map((q, idx) => {
          const userAns = answers[q.id];
          const isAnswered = userAns !== undefined;
          const showResult = isSubmitted || (isInstantFeedback && isAnswered);

          return (
            <div
              id={`question-${idx}`}
              key={q.id}
              className="bg-white rounded-4 shadow-sm mb-3 p-3 p-md-4 fade-in-slide"
              style={{ transform: 'none' }}
            >
              <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                <h5 className="mb-0 fw-bold text-dark" style={{ lineHeight: '1.45' }}>
                  Câu {idx + 1}: {q.question}
                </h5>
                <button
                  className="btn btn-light text-warning fw-bold btn-mobile-chip d-print-none"
                  onClick={() => openSaveModal(q)}
                  title="Lưu câu hỏi này"
                >
                  ⭐ Lưu
                </button>
              </div>
              <div className="row g-2">
                {q.options.map((opt, oIdx) => {
                  const optNumber = oIdx + 1;
                  let btnClass = 'btn-outline-secondary bg-white text-dark';
                  if (showResult) {
                    if (optNumber === q.correct_ans)
                      btnClass = 'btn-success text-white border-success';
                    else if (userAns === optNumber && userAns !== q.correct_ans)
                      btnClass = 'btn-danger text-white border-danger';
                  } else if (userAns === optNumber) {
                    btnClass = 'btn-primary text-white';
                  }

                  return (
                    <div className="col-12 col-sm-6" key={oIdx}>
                      <button
                        className={`btn w-100 text-start px-3 py-3 fw-bold btn-touch justify-content-start ${btnClass}`}
                        onClick={() => handleSelect(q.id, optNumber)}
                      >
                        <span className="badge bg-light text-dark me-2">{optNumber}</span>
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

      {/* THANH CÔNG CỤ GHIM ĐÁY MÀN HÌNH (MOBILE-BOTTOM-BAR) */}
      <div className="mobile-bottom-bar d-print-none">
        <div className="container px-0" style={{ maxWidth: '950px' }}>
          {!isSubmitted ? (
            <div className="d-flex gap-2">
              <button className="btn btn-light text-dark btn-mobile-chip" onClick={backToList}>
                🏠 Danh sách
              </button>
              <button
                className="btn btn-primary btn-touch flex-grow-1 shadow-sm"
                onClick={handleSubmit}
              >
                ✅ Nộp bài ({answeredCount}/{totalQuestions})
              </button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <button
                className="btn btn-warning text-dark btn-mobile-chip flex-fill"
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
                  className="btn btn-primary text-white btn-mobile-chip flex-fill"
                  onClick={handleCreateFromCurrentMistakes}
                >
                  ✨ Tạo đề câu sai
                </button>
              )}
              <button
                className="btn btn-light text-dark btn-mobile-chip"
                onClick={backToList}
              >
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