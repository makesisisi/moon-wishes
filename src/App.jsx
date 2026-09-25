import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Cookie, HandHeart, ListBullets, MoonStars, Pause, PencilSimple, Play, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react';
import { createWishStore, isLive } from './wishes.js';

const store = createWishStore();
const prefersMotion = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const shorten = text => text.length > 28 ? text.slice(0, 28) + '…' : text;
const focusableSelector = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const ambientSpecks = [
  ['8%', '17%', '0s', '.7'], ['22%', '24%', '-5.1s', '.55'], ['79%', '16%', '-3.7s', '.9'],
  ['68%', '30%', '-6.2s', '.62'], ['12%', '37%', '-8.4s', '.72'], ['88%', '41%', '-1.8s', '.78'],
  ['28%', '48%', '-4.9s', '.65'], ['94%', '53%', '-7.4s', '.58'], ['16%', '59%', '-2.6s', '.7'],
  ['73%', '61%', '-9.1s', '.86'], ['41%', '69%', '-5.5s', '.64'], ['91%', '73%', '-8.1s', '.76'],
  ['58%', '78%', '-3.2s', '.55'], ['31%', '83%', '-6.8s', '.68'], ['83%', '88%', '-10.2s', '.7'],
];
const osmanthusPetals = [
  ['9%', '-3.8s', '13.8s', '8px'], ['24%', '-10.4s', '15.2s', '7px'], ['48%', '-6.6s', '12.9s', '8px'],
  ['66%', '-7.9s', '12.5s', '8px'], ['73%', '-1.1s', '9.8s', '13px'], ['79%', '-12.2s', '14.4s', '7px'],
  ['84%', '-5.7s', '11.2s', '9px'], ['90%', '-3.4s', '9.7s', '11px'], ['96%', '-9.3s', '10.6s', '10px'],
  ['58%', '-13.8s', '16.4s', '7px'], ['34%', '-2.3s', '14.8s', '9px'], ['88%', '-10.8s', '13.4s', '7px'],
];
const backgroundLanterns = [
  ['8%', '29%', '24px', '-1.2s', '5.4s'],
  ['70%', '11.5%', '28px', '-3.7s', '6.1s'],
  ['85%', '32.5%', '20px', '-5.1s', '5.8s'],
  ['78%', '46%', '15px', '-2.8s', '6.9s'],
];

function friendlyError(problem) {
  const message = problem?.message || '';
  if (message.includes('15 seconds')) return '稍等 15 秒，再寄出下一句祝福。';
  if (/anonymous sign-ins are disabled|anonymous provider is disabled/i.test(message)) return '祝福通道还未开放，请在 Supabase 中启用匿名登录。';
  if (/failed to fetch|network|timeout|timed out/i.test(message)) return '月光信号有些微弱，请检查网络后再试。';
  return message || '发送失败，请稍后再试。';
}

export function App() {
  const [wishes, setWishes] = useState([]);
  const [flying, setFlying] = useState([]);
  const [panel, setPanel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState(() => localStorage.getItem('moon-wishes-nickname') || '月下旅人');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [lanternLaunch, setLanternLaunch] = useState(null);
  const [motion, setMotion] = useState(prefersMotion);
  const [ready, setReady] = useState(false);
  const [connection, setConnection] = useState('connecting');
  const [count, setCount] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [invitation, setInvitation] = useState('waiting');
  const [ritualCounts, setRitualCounts] = useState({ mooncake: 0, moonwatch: 0 });
  const [joinedRituals, setJoinedRituals] = useState([]);
  const [ritualSending, setRitualSending] = useState('');
  const [ritualError, setRitualError] = useState('');
  const [ritualPulse, setRitualPulse] = useState('');
  const dialogRef = useRef(null);
  const invitationButtonRef = useRef(null);
  const sceneRef = useRef(null);
  const audioRef = useRef(null);
  const restoreFocus = useRef(null);
  const queue = useRef([]);
  const catalog = useRef([]);
  const activeWishIds = useRef(new Set());
  const replayCursor = useRef(0);
  const nextReplayAt = useRef(0);
  const seen = useRef(new Set());
  const laneFreeAt = useRef([0, 0, 0]);
  const sequence = useRef(0);
  const lanternSequence = useRef(0);
  const toastTimer = useRef();
  const lanternTimer = useRef();
  const invitationTimer = useRef();
  const ritualTimer = useRef();
  const assetStyles = useMemo(() => ({
    '--scene-image': `url("${import.meta.env.BASE_URL}images/moonlit-osmanthus.jpg")`,
    '--wish-button': `url("${import.meta.env.BASE_URL}images/wish-button.png")`,
  }), []);
  const musicSrc = `${import.meta.env.BASE_URL}audio/sanxiang-qitan-ost.mp3`;

  function receive(wish, play = true) {
    if (seen.current.has(wish.id)) return;
    seen.current.add(wish.id);
    catalog.current = [...catalog.current.filter(item => item.id !== wish.id), wish].slice(-80);
    replayCursor.current = Math.max(0, catalog.current.length - 1);
    setWishes(current => [wish, ...current].slice(0, 80));
    setCount(current => current + 1);
    if (play) queue.current.push(wish);
    if (queue.current.length > 80) queue.current.splice(0, queue.current.length - 80);
  }

  function announce(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3800);
  }

  function openPanel(nextPanel) {
    restoreFocus.current = document.activeElement;
    setPanel(nextPanel);
  }

  function openWish(wish) {
    restoreFocus.current = document.activeElement;
    setSelected(wish);
  }

  useEffect(() => {
    let disposed = false;
    const unsubscribe = store.subscribe(
      wish => { if (!disposed) receive(wish); },
      () => { if (!disposed) setConnection('online'); },
      () => { if (!disposed) setConnection('reconnecting'); },
    );
    store.load().then(({ items, total }) => {
      if (disposed) return;
      const chronological = [...items].reverse();
      chronological.forEach((wish, i) => receive(wish, i >= chronological.length - 5));
      nextReplayAt.current = Date.now() + 2800;
      setCount(current => Math.max(current, total));
      setReady(true);
      if (!isLive) setConnection('preview');
    }).catch(() => { if (!disposed) { setReady(true); setConnection('reconnecting'); } });
    return () => {
      disposed = true;
      unsubscribe();
      clearTimeout(toastTimer.current);
      clearTimeout(lanternTimer.current);
      clearTimeout(invitationTimer.current);
      clearTimeout(ritualTimer.current);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const { counts, joined } = await store.loadRituals();
        if (!disposed) {
          setRitualCounts(counts);
          setJoinedRituals(joined);
        }
      } catch {
        // Wishes remain usable when the optional ritual counter is unavailable.
      }
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { disposed = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (invitation === 'waiting') invitationButtonRef.current?.focus({ preventScroll: true });
  }, [invitation]);

  useEffect(() => {
    if (!motion) {
      setFlying([]);
      activeWishIds.current.clear();
      laneFreeAt.current.fill(0);
      return undefined;
    }

    let timer;
    let disposed = false;
    const releaseNext = () => {
      if (disposed) return;
      let released = false;
      const now = Date.now();
      const available = laneFreeAt.current.map((at, index) => ({ at, index })).filter(x => x.at <= now);
      if (available.length) {
        let wish = queue.current.shift();
        if (!wish && catalog.current.length && now >= nextReplayAt.current) {
          for (let attempt = 0; attempt < catalog.current.length; attempt += 1) {
            const index = replayCursor.current % catalog.current.length;
            const candidate = catalog.current[index];
            replayCursor.current = (index + 1) % catalog.current.length;
            if (!activeWishIds.current.has(candidate.id)) {
              wish = candidate;
              nextReplayAt.current = now + 1800 + Math.random() * 1400;
              break;
            }
          }
        }
        if (wish) {
          // Invisible scheduling slots keep random arrivals from colliding; no rails are drawn.
          const lane = available[Math.floor(Math.random() * available.length)].index;
          const label = shorten(wish.content);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          context.font = '17px "Songti SC", serif';
          const width = context.measureText(label).width + Math.min(wish.nickname.length, 8) * 13 + 104;
          const speed = [45, 48, 46][lane];
          const duration = (Math.min(window.innerWidth, 430) + width + 36) / speed;
          const bob = 3 + Math.random() * 4;
          laneFreeAt.current[lane] = now + (width + 86) / speed * 1000;
          activeWishIds.current.add(wish.id);
          setFlying(current => [...current, {
            ...wish,
            label,
            lane,
            duration,
            instance: ++sequence.current,
            top: `${5 + lane * 31 + Math.floor(Math.random() * 5)}%`,
            drift: `${Math.round((Math.random() - .5) * 16)}px`,
            bob: `${bob.toFixed(1)}px`,
            bobDuration: `${(3.8 + Math.random() * 1.8).toFixed(2)}s`,
            glowDelay: `${(-Math.random() * 2.2).toFixed(2)}s`,
          }]);
          released = true;
        }
      }
      const nextDelay = released ? 850 + Math.random() * 850 : 360;
      timer = window.setTimeout(releaseNext, nextDelay);
    };
    timer = window.setTimeout(releaseNext, 180);
    return () => { disposed = true; clearTimeout(timer); };
  }, [motion]);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(async () => {
      try {
        const { items, total } = await store.load();
        const visible = new Set(items.map(x => x.id));
        [...items].reverse().forEach(item => receive(item));
        catalog.current = [...items].reverse();
        replayCursor.current %= Math.max(catalog.current.length, 1);
        queue.current = queue.current.filter(item => visible.has(item.id));
        setWishes(items);
        setCount(total);
        setFlying(current => {
          const kept = current.filter(x => visible.has(x.id));
          activeWishIds.current = new Set(kept.map(x => x.id));
          return kept;
        });
        setConnection('online');
      } catch { setConnection('reconnecting'); }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.volume = .22;
    if (!musicEnabled) {
      audio.pause();
      return undefined;
    }

    let disposed = false;
    const cleanupUnlock = () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
    const startMusic = async () => {
      try {
        await audio.play();
        if (!disposed) cleanupUnlock();
      } catch {
        // Browsers commonly require one real interaction before audible autoplay.
      }
    };
    const unlock = () => { startMusic(); };
    document.addEventListener('pointerdown', unlock, { capture: true, once: true });
    document.addEventListener('keydown', unlock, { capture: true, once: true });
    startMusic();
    return () => {
      disposed = true;
      cleanupUnlock();
    };
  }, [musicEnabled]);

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') { setPanel(null); setSelected(null); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const activeDialog = dialogRef.current;
    if (!activeDialog) return undefined;
    const focusables = [...activeDialog.querySelectorAll(focusableSelector)];
    // Keep mobile browsers from opening the keyboard and resizing the scene
    // while the bottom sheet is still entering.
    if (!activeDialog.contains(document.activeElement)) activeDialog.focus({ preventScroll: true });
    const trapFocus = event => {
      if (event.key !== 'Tab' || !focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    activeDialog.addEventListener('keydown', trapFocus);
    return () => {
      activeDialog.removeEventListener('keydown', trapFocus);
      restoreFocus.current?.focus?.();
    };
  }, [panel, selected]);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicEnabled) {
      setMusicEnabled(false);
      audio.pause();
      return;
    }
    setMusicEnabled(true);
    audio.volume = .22;
    try {
      await audio.play();
    } catch {
      announce('浏览器暂时拦住了音乐，请再轻触一次。');
    }
  }

  function openInvitation() {
    if (invitation !== 'waiting') return;
    setInvitation('opening');
    const delay = prefersMotion() ? 1250 : 80;
    invitationTimer.current = setTimeout(() => {
      setInvitation('hidden');
      requestAnimationFrame(() => sceneRef.current?.focus({ preventScroll: true }));
    }, delay);
  }

  async function send(event) {
    event.preventDefault();
    if (sending) return;
    const message = content.trim();
    const name = nickname.trim() || '月下旅人';
    if (!message || message.length > 60) { setError('请写下 1 到 60 个字的祝福。'); return; }
    if (name.length > 10) { setError('昵称最多 10 个字。'); return; }
    setError(''); setSending(true);
    try {
      const wish = await store.send({ content: message, nickname: name });
      receive(wish); // Subscription may deliver the same row first; receive deduplicates by id.
      localStorage.setItem('moon-wishes-nickname', name);
      setContent(''); setPanel(null);
      if (motion) {
        clearTimeout(lanternTimer.current);
        const launchId = ++lanternSequence.current;
        setLanternLaunch(launchId);
        lanternTimer.current = setTimeout(() => {
          setLanternLaunch(current => current === launchId ? null : current);
        }, 4200);
      }
      announce(isLive ? '祝福已送进今夜的月光里' : '已保存到这台设备的预览中');
    } catch (problem) { setError(friendlyError(problem)); }
    finally { setSending(false); }
  }

  async function joinRitual(kind) {
    if (ritualSending || joinedRituals.includes(kind)) return;
    setRitualError('');
    setRitualSending(kind);
    try {
      const result = await store.sendRitual(kind);
      setJoinedRituals(current => [...new Set([...current, kind])]);
      if (!result.duplicate) {
        setRitualCounts(current => ({ ...current, [kind]: current[kind] + 1 }));
      }
      clearTimeout(ritualTimer.current);
      setRitualPulse(kind);
      ritualTimer.current = setTimeout(() => setRitualPulse(''), 2600);
      announce(kind === 'mooncake' ? '一块月饼，已经送到今夜的相逢里' : '你也坐进了这轮月光里');
    } catch (problem) {
      setRitualError(friendlyError(problem));
    } finally {
      setRitualSending('');
    }
  }

  return <div className="app-shell" style={assetStyles}>
    <audio ref={audioRef} src={musicSrc} loop autoPlay preload="auto" onPlay={() => setMusicOn(true)} onPause={() => setMusicOn(false)} />
    <div className="ambient-image" aria-hidden="true" />
    <div className="ambient-shade" aria-hidden="true" />
    <main ref={sceneRef} tabIndex={-1} aria-hidden={invitation !== 'hidden'} className={`scene${motion ? '' : ' motion-off'}${panel || selected ? ' panel-open' : ''}${ritualPulse ? ` ritual-${ritualPulse}` : ''}`}>
    <div className="scene-image" aria-hidden="true" /><div className="scene-shade" aria-hidden="true" />
    <div className="scene-atmosphere" aria-hidden="true">
      <span className="star-wash" />
      <span className="moon-ring" />
      <span className="moon-aura" />
      <span className="moon-sheen" />
      <span className="cloud-veil" />
      <span className="mist mist-near" />
      <span className="mist mist-far" />
      <span className="water-shimmer" />
      <span className="water-ripple ripple-one" />
      <span className="water-ripple ripple-two" />
      <span className="water-ripple ripple-three" />
      {backgroundLanterns.map(([left, top, size, delay, duration], index) => <span className="background-lantern" key={`lantern-${index}`} style={{ '--lantern-left': left, '--lantern-top': top, '--lantern-size': size, '--lantern-delay': delay, '--lantern-duration': duration }}><i /></span>)}
      {ambientSpecks.map(([left, top, delay, opacity], index) => <span className="ambient-speck" key={`speck-${index}`} style={{ '--speck-left': left, '--speck-top': top, '--speck-delay': delay, '--speck-opacity': opacity }} />)}
      {osmanthusPetals.map(([left, delay, duration, size], index) => <span className="osmanthus-petal" key={`petal-${index}`} style={{ '--petal-left': left, '--petal-delay': delay, '--petal-duration': duration, '--petal-size': size }} />)}
    </div>
    <header className="scene-header"><h1>月下寄愿</h1><p>让心意，随月光抵达远方</p></header>

    <section className="wish-sky" aria-label="正在飘过的中秋祝福">
      {motion && flying.map(item => <button type="button" className="flying-wish" key={item.instance}
        style={{
          top: item.top,
          animationDuration: `${item.duration}s`,
          '--wish-drift': item.drift,
          '--wish-bob': item.bob,
          '--wish-bob-duration': item.bobDuration,
          '--wish-glow-delay': item.glowDelay,
        }}
        onAnimationEnd={() => {
          activeWishIds.current.delete(item.id);
          setFlying(current => current.filter(x => x.instance !== item.instance));
        }}
        onClick={() => openWish(item)} aria-label={`查看${item.nickname}的祝福：${item.content}`}>
        <span className="wish-orbit"><span className="wish-spark" aria-hidden="true">✦</span><span className="wish-copy">{item.label}</span><small>{item.nickname}</small></span>
      </button>)}
      {!motion && wishes[0] && <button type="button" className="still-wish" onClick={() => openWish(wishes[0])}>{shorten(wishes[0].content)}<small>{wishes[0].nickname}</small></button>}
      {ready && !wishes.length && <p className="empty-sky">{connection === 'reconnecting' ? '月光信号有些微弱…' : '夜空正等着第一句祝福'}</p>}
    </section>

    {lanternLaunch && <div className="lantern-flight" key={lanternLaunch} role="img" aria-label="你放飞的一盏祝福灯">
      <span className="lantern-ember ember-one" aria-hidden="true" />
      <span className="lantern-ember ember-two" aria-hidden="true" />
      <span className="lantern-ember ember-three" aria-hidden="true" />
      <img className="lantern-art" src={`${import.meta.env.BASE_URL}images/wish-lantern-256.png`} alt="" />
    </div>}

    {ritualPulse && <div className={`ritual-burst ritual-burst-${ritualPulse}`} aria-hidden="true">
      {ritualPulse === 'mooncake' ? <Cookie size={46} weight="duotone" /> : <MoonStars size={52} weight="duotone" />}
      <span>{ritualPulse === 'mooncake' ? '甜意已送达' : '此刻共赏月'}</span>
    </div>}

    <footer className="scene-footer">
      <div className="sub-actions">
        <button type="button" onClick={() => openPanel('list')} aria-label={`查看今夜的祝福${count ? `，共 ${count} 条` : ''}`}><ListBullets size={17} /> 祝福{count ? ` · ${count}` : ''}</button>
        <button type="button" onClick={() => setMotion(value => !value)} aria-label={motion ? '减少背景动画' : '开启背景动画'}>{motion ? <Pause size={15} /> : <Play size={15} />}{motion ? '动画' : '开动画'}</button>
        <button type="button" onClick={toggleMusic} className={musicEnabled ? 'music-on' : ''} aria-pressed={musicEnabled} aria-label={musicEnabled ? '关闭背景音乐《三相奇谈》游戏原声' : '开启背景音乐《三相奇谈》游戏原声'} title="背景音乐《三相奇谈》游戏原声">{musicEnabled ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} />}{musicOn ? '音乐中' : musicEnabled ? '音乐开' : '音乐关'}</button>
      </div>
      <button type="button" className="ritual-entry" onClick={() => { setRitualError(''); openPanel('rituals'); }}>
        <HandHeart size={18} weight="duotone" /><span>月下相聚</span><small>{ritualCounts.mooncake + ritualCounts.moonwatch ? `${ritualCounts.mooncake + ritualCounts.moonwatch} 份回应` : '送月饼 · 一起赏月'}</small><ArrowRight size={16} />
      </button>
      <button type="button" className="write-button" onClick={() => { setError(''); openPanel('compose'); }}><PencilSimple size={23} weight="light" /><span>写下祝福</span><ArrowRight size={22} /></button>
      <p className="footer-note">匿名发送 · 无需注册</p>
      {connection === 'preview' && <p className="preview-note">本地预览 · 祝福仅在此设备可见</p>}
      {connection === 'connecting' && <p className="preview-note">正在连接祝福夜空…</p>}
      {connection === 'reconnecting' && <p className="preview-note">正在重新连接祝福夜空…</p>}
    </footer>

    {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}

    {panel === 'compose' && <div className="sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPanel(null); }}><section ref={dialogRef} tabIndex={-1} className="sheet composer" role="dialog" aria-modal="true" aria-labelledby="compose-title" aria-describedby="compose-intro">
      <button type="button" className="close-button" onClick={() => setPanel(null)} aria-label="关闭"><X size={21} /></button>
      <span className="sheet-kicker">寄一盏心意</span><h2 id="compose-title">今夜，你想祝福谁？</h2><p className="sheet-intro" id="compose-intro">写给某个人，也可以写给未来的自己。</p>
      <form onSubmit={send}>
        <label htmlFor="wish-content">你的祝福</label><textarea id="wish-content" maxLength={60} value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="愿我们想见的人，终会在月光下重逢。" />
        <div className="field-foot">{content.length} / 60</div>
        <label htmlFor="wish-nickname">落款 <span>可修改</span></label><input id="wish-nickname" maxLength={10} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="月下旅人" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="send-button" disabled={sending || !content.trim()}>{sending ? '正在放飞…' : '放飞祝福'} <ArrowRight size={19} /></button>
      </form><p className="sheet-note">祝福会被大家看到，请温柔表达。</p>
    </section></div>}

    {panel === 'list' && <div className="sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPanel(null); }}><section ref={dialogRef} tabIndex={-1} className="sheet list-sheet" role="dialog" aria-modal="true" aria-labelledby="list-title" aria-describedby="list-intro">
      <button type="button" className="close-button" onClick={() => setPanel(null)} aria-label="关闭"><X size={21} /></button>
      <span className="sheet-kicker">今夜的月光</span><h2 id="list-title">大家的祝福</h2><p className="sheet-intro" id="list-intro">{count ? `共 ${count} 句心意，慢慢读。` : '刚刚送出的心意，都会在这里。'}</p>
      <div className="wish-list">{wishes.length ? wishes.map(wish => <article key={wish.id} className="wish-row"><p>{wish.content}</p><span>{wish.nickname} · {new Date(wish.created_at).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' })}</span></article>) : <p className="list-empty">还没有祝福。你可以写下第一句。</p>}</div>
    </section></div>}

    {panel === 'rituals' && <div className="sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPanel(null); }}><section ref={dialogRef} tabIndex={-1} className="sheet ritual-sheet" role="dialog" aria-modal="true" aria-labelledby="ritual-title" aria-describedby="ritual-intro">
      <button type="button" className="close-button" onClick={() => setPanel(null)} aria-label="关闭"><X size={21} /></button>
      <span className="sheet-kicker">不必写字，也能相聚</span><h2 id="ritual-title">今夜一起做件小事</h2><p className="sheet-intro" id="ritual-intro">轻轻点一下，把同一轮月光分享给陌生人。</p>
      <div className="ritual-options">
        <button type="button" className={joinedRituals.includes('mooncake') ? 'ritual-option is-joined' : 'ritual-option'} onClick={() => joinRitual('mooncake')} disabled={Boolean(ritualSending) || joinedRituals.includes('mooncake')}>
          <span className="ritual-icon"><Cookie size={30} weight="duotone" /></span><span className="ritual-copy"><strong>{joinedRituals.includes('mooncake') ? '月饼已送到' : '送出一块月饼'}</strong><small>给今夜的相逢添一点甜</small></span><span className="ritual-count">{ritualCounts.mooncake}<small>份甜意</small></span>
        </button>
        <button type="button" className={joinedRituals.includes('moonwatch') ? 'ritual-option is-joined' : 'ritual-option'} onClick={() => joinRitual('moonwatch')} disabled={Boolean(ritualSending) || joinedRituals.includes('moonwatch')}>
          <span className="ritual-icon"><MoonStars size={31} weight="duotone" /></span><span className="ritual-copy"><strong>{joinedRituals.includes('moonwatch') ? '正在一起赏月' : '一起赏一会月'}</strong><small>在同一轮月光下坐一会</small></span><span className="ritual-count">{ritualCounts.moonwatch}<small>人共赏</small></span>
        </button>
      </div>
      {ritualSending && <p className="ritual-status" role="status">正在把这份心意送进月光…</p>}
      {ritualError && <p className="form-error" role="alert">{ritualError}</p>}
      <p className="sheet-note">每位访客每项可参与一次，不会公开身份。</p>
    </section></div>}

    {selected && <div className="sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><section ref={dialogRef} tabIndex={-1} className="sheet detail-sheet" role="dialog" aria-modal="true" aria-label="一条祝福">
      <button type="button" className="close-button" onClick={() => setSelected(null)} aria-label="关闭"><X size={21} /></button>
      <span className="sheet-kicker">月下的一句话</span><blockquote>“{selected.content}”</blockquote><p>—— {selected.nickname}</p>
    </section></div>}
    </main>
    {invitation !== 'hidden' && <div className={`invitation-backdrop ${invitation === 'opening' ? 'is-opening' : ''}`}>
      <section className="invitation-stage" role="dialog" aria-modal="true" aria-labelledby="invitation-title" aria-describedby="invitation-copy">
        <span className="invitation-glint glint-one" aria-hidden="true">✦</span>
        <span className="invitation-glint glint-two" aria-hidden="true">✦</span>
        <button ref={invitationButtonRef} type="button" className="invitation-envelope" onClick={openInvitation} aria-label="启封中秋邀请函，进入月下寄愿">
          <span className="invitation-letter">
            <span className="invitation-kicker">中秋雅集 · 邀请函</span>
            <strong id="invitation-title">月下寄愿</strong>
            <span className="invitation-divider" aria-hidden="true"><i />月<i /></span>
            <span id="invitation-copy" className="invitation-copy">邀你共赏今夜月色<br />写下一句温柔祝福</span>
            <span className="invitation-signature">岁次仲秋 · 敬邀</span>
          </span>
          <span className="envelope-back" aria-hidden="true" />
          <span className="envelope-fold fold-left" aria-hidden="true" />
          <span className="envelope-fold fold-right" aria-hidden="true" />
          <span className="envelope-fold fold-bottom" aria-hidden="true" />
          <span className="envelope-flap" aria-hidden="true" />
          <span className="invitation-seal" aria-hidden="true"><b>启</b></span>
          <span className="invitation-hint">轻触启封</span>
        </button>
      </section>
    </div>}
  </div>;
}
