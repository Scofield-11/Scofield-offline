import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { extractHanCharacters, loadHanziData } from '../utils/hanziData';
import { createAnimationTarget } from '../utils/hanziRenderTarget';

function HanziCharacter({ character, index }) {
  const targetRef = useRef(null);
  const writerRef = useRef(null);
  const runRef = useRef(0);
  const [speed, setSpeed] = useState(1);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState('loading');
  const [playState, setPlayState] = useState('idle');
  const [strokeCount, setStrokeCount] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let alive = true;
    let writer;
    const target = targetRef.current;
    const mount = document.createElement('div');
    mount.className = 'hanzi-writer-mount';
    target.appendChild(mount);
    setStatus('loading');
    setPlayState('idle');
    Promise.all([import('hanzi-writer'), loadHanziData(character)]).then(async ([module, data]) => {
      if (!alive) return;
      const style = getComputedStyle(target);
      writer = module.default.create(mount, character, {
        width: 300, height: 300, padding: 22,
        strokeColor: style.getPropertyValue('--brand-primary').trim(),
        outlineColor: style.getPropertyValue('--text-secondary').trim(),
        showOutline: false, showCharacter: true, strokeAnimationSpeed: speed,
        delayBetweenStrokes: 180 / speed, strokeFadeDuration: 0,
        charDataLoader: () => data,
        rendererOverride: { createRenderTarget: createAnimationTarget },
      });
      await writer.getCharacterData();
      if (!alive) { writer.hideCharacter({ duration: 0 }); mount.remove(); return; }
      writerRef.current = writer;
      setStrokeCount(data.strokes.length);
      setStatus('ready');
    }).catch(() => { if (alive) setStatus('error'); });
    return () => {
      alive = false;
      runRef.current += 1;
      writerRef.current = null;
      // 3.5.0 has no public destroy. A zero-duration hide cancels main-stroke
      // mutations (including paused RAFs), then remove the owned DOM target.
      writer?.hideCharacter({ duration: 0 }).catch(() => {});
      mount.remove();
    };
  }, [character, speed, retry]);

  const replay = () => {
    const writer = writerRef.current;
    if (!writer) return;
    const run = ++runRef.current;
    setPlayState('playing');
    writer.animateCharacter().then(() => { if (run === runRef.current) setPlayState('idle'); });
  };
  const toggle = () => {
    if (!writerRef.current) return;
    if (playState === 'idle') replay();
    else if (playState === 'playing') { writerRef.current.pauseAnimation(); setPlayState('paused'); }
    else { writerRef.current.resumeAnimation(); setPlayState('playing'); }
  };

  // Manual playback only; reduced-motion users never get unsolicited animation.
  return <div className="hanzi-player">
    <div className="hanzi-practice-frame" role="img" aria-label={`Chữ ${character}, vị trí ${index + 1}`}>
      <div className="hanzi-writer-target" ref={targetRef} />
      {status !== 'ready' && <span className="hanzi-static-character" lang="zh">{character}</span>}
    </div>
    <p className="hanzi-status" role="status">{status === 'loading' ? 'Đang tải nét viết…' : status === 'error' ? 'Không có dữ liệu nét viết hoặc chưa tải được khi offline.' : `${strokeCount} nét · ${playState === 'playing' ? 'Đang vẽ' : playState === 'paused' ? 'Đã tạm dừng' : 'Sẵn sàng'}`}</p>
    {status === 'error' ? <button className="btn btn-mobile-chip chip-primary" onClick={() => setRetry((value) => value + 1)}>Thử lại</button> : <div className="hanzi-controls">
      <button className="btn btn-mobile-chip chip-primary" disabled={status !== 'ready'} onClick={toggle}>{playState === 'playing' ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} {playState === 'playing' ? 'Tạm dừng' : playState === 'paused' ? 'Tiếp tục' : 'Phát nét'}</button>
      <button className="btn-icon-soft chip-slate" disabled={status !== 'ready'} onClick={replay} aria-label="Vẽ lại từ đầu"><RotateCcw size={18} aria-hidden="true" /></button>
      <label className="hanzi-speed">Tốc độ<select className="form-select" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
    </div>}
    {reducedMotion && <p className="small text-secondary mt-2">Nét viết chỉ chuyển động khi bạn nhấn Phát.</p>}
  </div>;
}

export default function HanziStrokeOrder({ text }) {
  const chars = extractHanCharacters(text);
  const [selected, setSelected] = useState(0);
  const activeIndex = Math.min(selected, Math.max(0, chars.length - 1));
  if (!chars.length) return <p className="text-secondary">Từ này không có chữ Hán để hiển thị nét viết.</p>;
  return <div className="hanzi-stroke-widget">
    <div className="hanzi-character-tabs" role="group" aria-label="Chọn chữ Hán">
      {chars.map((char, index) => <button key={`${char}-${index}`} type="button" className={`btn btn-mobile-chip ${activeIndex === index ? 'btn-primary' : 'chip-slate'}`} aria-pressed={activeIndex === index} aria-label={`${char}, ký tự ${index + 1}`} onClick={() => setSelected(index)}>{char}<small>{index + 1}</small></button>)}
    </div>
    <HanziCharacter key={`${text}-${activeIndex}`} character={chars[activeIndex]} index={activeIndex} />
    <p className="hanzi-attribution">Nét chữ: <a href="https://hanziwriter.org" target="_blank" rel="noreferrer">Hanzi Writer</a> · <a href="https://github.com/skishore/makemeahanzi" target="_blank" rel="noreferrer">Make Me a Hanzi / Arphic</a> · <a href="/licenses/ARPHICPL.txt" target="_blank" rel="noreferrer">Giấy phép dữ liệu</a></p>
  </div>;
}
