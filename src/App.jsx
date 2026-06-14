import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  Cloud,
  CloudOff,
  Clock3,
  Flame,
  Headphones,
  Keyboard,
  LayoutDashboard,
  ListFilter,
  Menu,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  RefreshCcw,
  Search,
  Settings,
  LogIn,
  LogOut,
  Sparkles,
  Speaker,
  Star,
  Target,
  Volume2,
  X,
  Zap,
} from 'lucide-react'
import { supabase } from './supabase'
import { useCloudSync } from './useCloudSync'

const STORAGE_KEY = 'word-sprint-state-v1'
const LEARN_SESSION_KEY = 'word-sprint-learn-session-v1'
const DAY = 24 * 60 * 60 * 1000
let currentAudio = null

const defaultState = {
  dailyGoal: 40,
  learned: {},
  activity: {},
  sessionCount: 0,
  sentenceCount: 0,
  speechRate: 0.85,
}

const reviewIntervals = [0, 10 * 60 * 1000, DAY, 3 * DAY, 7 * DAY, 15 * DAY, 30 * DAY]

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  } catch {
    return defaultState
  }
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5)
}

function sentenceTokens(sentence) {
  return sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)*|\d+(?:[.,]\d+)*|[^\sA-Za-z\d]/g) || []
}

function joinSentence(tokens) {
  return tokens.join(' ')
    .replace(/\s+([,.;!?:"')\]])/g, '$1')
    .replace(/([(“])\s+/g, '$1')
}

function loadLearnSession() {
  try {
    return JSON.parse(localStorage.getItem(LEARN_SESSION_KEY))
  } catch {
    return null
  }
}

function saveLearnSession(queue, practiceWords, index, stage, spellingIndex = 0) {
  localStorage.setItem(LEARN_SESSION_KEY, JSON.stringify({
    date: dayKey(),
    queue: queue.map((word) => word.name),
    practiceWords: practiceWords.map((word) => word.name),
    index,
    stage,
    spellingIndex,
  }))
}

function WordDetails({ word }) {
  return (
    <div className={`answer-area ${word.example ? '' : 'without-example'}`}>
      <div className="meaning"><small>核心释义</small>{word.trans.map((text) => <p key={text}>{text}</p>)}</div>
      {word.example && <div className="example-block">
        <small>例句</small>
        <p>{word.example.c}</p>
        <span>{word.example.cn}</span>
      </div>}
    </div>
  )
}

function App() {
  const [words, setWords] = useState([])
  const [state, setState] = useState(loadState)
  const [view, setView] = useState('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const cloud = useCloudSync(state, setState)

  useEffect(() => {
    fetch('/data/gaokao3500.json')
      .then((response) => response.json())
      .then(setWords)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(timer)
  }, [toast])

  const progress = useMemo(() => getProgress(words, state), [words, state])
  const navigate = (next) => {
    setView(next)
    setMobileNav(false)
  }

  const navItems = [
    ['dashboard', LayoutDashboard, '今日'],
    ['learn', Zap, '速记'],
    ['sentence', MessageSquareText, '造句'],
    ['review', RotateCcw, '复习'],
    ['wordbook', BookMarked, '生词本'],
    ['stats', BarChart3, '进度'],
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <button className="brand" onClick={() => navigate('dashboard')}>
          <span className="brand-mark"><Zap size={18} fill="currentColor" /></span>
          <span><strong>词冲</strong><small>高考词汇速记</small></span>
        </button>
        <nav>
          {navItems.map(([id, Icon, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={19} strokeWidth={2.2} /><span>{label}</span>
              {id === 'review' && progress.dueCount > 0 && <b>{progress.dueCount}</b>}
            </button>
          ))}
        </nav>
        <div className="side-summary">
          <div className="side-summary-top"><span>总进度</span><strong>{progress.rememberedCount}/{words.length || 3875}</strong></div>
          <div className="thin-progress"><i style={{ width: `${progress.coverageExact}%` }} /></div>
          <p>每天多记一点，高考少慌一点。</p>
        </div>
        <button className="side-settings" onClick={() => navigate('settings')}>
          <Settings size={18} /><span>学习设置</span>
        </button>
      </aside>

      <div className="main-frame">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMobileNav(!mobileNav)} aria-label="打开导航">
            {mobileNav ? <X /> : <Menu />}
          </button>
          <div className="topbar-title">
            <span>{formatDate()}</span>
            <strong>{pageTitle(view)}</strong>
          </div>
          <div className="topbar-stats">
            <span><Flame size={18} fill="currentColor" /> 连续 {progress.streak} 天</span>
            <span><Target size={18} /> 今日 {progress.todayCount}/{state.dailyGoal}</span>
            <button className={`cloud-button ${cloud.status}`} onClick={() => cloud.user ? navigate('settings') : cloud.cloudEnabled ? setAuthOpen(true) : navigate('settings')}>
              {cloud.user ? <Cloud size={17} /> : <CloudOff size={17} />}
              <span>{cloud.user ? syncLabel(cloud.status) : '本地记录'}</span>
            </button>
          </div>
        </header>

        <main>
          {view === 'dashboard' && <Dashboard words={words} state={state} progress={progress} navigate={navigate} />}
          {view === 'learn' && <Study words={words} state={state} setState={setState} mode="learn" navigate={navigate} toast={setToast} />}
          {view === 'sentence' && <SentencePractice words={words} state={state} setState={setState} navigate={navigate} />}
          {view === 'review' && <Study words={words} state={state} setState={setState} mode="review" navigate={navigate} toast={setToast} />}
          {view === 'wordbook' && <Wordbook words={words} state={state} setState={setState} toast={setToast} />}
          {view === 'stats' && <Stats words={words} state={state} progress={progress} />}
          {view === 'settings' && <SettingsView state={state} setState={setState} words={words} toast={setToast} cloud={cloud} openAuth={() => setAuthOpen(true)} />}
        </main>
      </div>
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
      {authOpen && <AuthDialog close={() => setAuthOpen(false)} toast={setToast} />}
    </div>
  )
}

function Dashboard({ words, state, progress, navigate }) {
  const todayPercent = Math.min(100, Math.round((progress.todayCount / state.dailyGoal) * 100))
  const week = getWeekActivity(state)
  const maxDay = Math.max(...week.map((item) => item.value), state.dailyGoal)
  const nextWord = words.find((word) => !state.learned[word.name])

  return (
    <div className="page dashboard-page">
      <section className="dashboard-head">
        <div>
          <span className="eyebrow"><Sparkles size={15} /> 今天的大脑很适合记单词</span>
          <h1>先冲 <em>{Math.max(0, state.dailyGoal - progress.todayCount)}</em> 个，<br />把进步变成手感。</h1>
        </div>
        <div className="today-ring" style={{ '--progress': `${todayPercent * 3.6}deg` }}>
          <div><strong>{progress.todayCount}</strong><span>今日已学</span></div>
        </div>
      </section>

      <section className="action-strip">
        <button className="primary-action" onClick={() => navigate('learn')}>
          <span className="action-icon"><Zap size={25} fill="currentColor" /></span>
          <span><small>继续高考 3500</small><strong>{nextWord ? `从 ${nextWord.name} 开始` : '今日目标已完成'}</strong></span>
          <ArrowRight size={22} />
        </button>
        <button className="review-action" onClick={() => navigate('review')}>
          <span className="action-icon"><RotateCcw size={24} /></span>
          <span><small>记忆回访</small><strong>{progress.dueCount} 个词待复习</strong></span>
          <ChevronRight size={20} />
        </button>
      </section>

      <section className="metric-grid">
        <div className="metric">
          <span className="metric-icon coral"><BookOpen size={19} /></span><small>已记住</small>
          <strong>{progress.rememberedCount}</strong><p>覆盖词表 {progress.coverage}%</p>
        </div>
        <div className="metric">
          <span className="metric-icon green"><Check size={19} /></span><small>已掌握</small>
          <strong>{progress.masteredCount}</strong><p>稳定记忆 3 次以上</p>
        </div>
        <div className="metric">
          <span className="metric-icon yellow"><BookMarked size={19} /></span><small>生词本</small>
          <strong>{progress.hardCount}</strong><p>重点词自动聚合</p>
        </div>
        <div className="metric">
          <span className="metric-icon blue"><Clock3 size={19} /></span><small>预计完成</small>
          <strong>{progress.daysLeft}<sup>天</sup></strong><p>按当前每日目标</p>
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel week-panel">
          <div className="panel-head"><div><small>学习节奏</small><h2>最近 7 天</h2></div><strong>{week.reduce((sum, item) => sum + item.value, 0)}<small>词</small></strong></div>
          <div className="week-chart">
            {week.map((item) => (
              <div className="bar-column" key={item.date}>
                <span className="bar-value">{item.value || ''}</span>
                <i style={{ height: `${Math.max(8, (item.value / maxDay) * 100)}%` }} className={item.today ? 'today' : ''} />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="panel method-panel">
          <div className="panel-head"><div><small>记忆策略</small><h2>今天这样背</h2></div><Headphones size={22} /></div>
          <ol>
            <li><b>01</b><span><strong>需要时听音</strong><small>点击卡片右上角播放美式发音</small></span></li>
            <li><b>02</b><span><strong>快速判断</strong><small>3 秒内决定认识或模糊</small></span></li>
            <li><b>03</b><span><strong>主动造句</strong><small>把单词放回完整语境中使用</small></span></li>
            <li><b>04</b><span><strong>最后拼写</strong><small>完成今日词汇后，集中听音拼写</small></span></li>
          </ol>
        </div>
      </section>
    </div>
  )
}

function Study({ words, state, setState, mode, navigate, toast }) {
  const [queue, setQueue] = useState([])
  const [practiceWords, setPracticeWords] = useState([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [stage, setStage] = useState('study')
  const [spellingIndex, setSpellingIndex] = useState(0)
  const isReview = mode === 'review'

  useEffect(() => {
    if (!words.length) return
    const byName = new Map(words.map((word) => [word.name, word]))
    const saved = isReview ? null : loadLearnSession()
    if (saved?.date === dayKey() && Array.isArray(saved.queue) && Array.isArray(saved.practiceWords)) {
      const savedQueue = saved.queue.map((name) => byName.get(name)).filter(Boolean)
      const savedPracticeWords = saved.practiceWords.map((name) => byName.get(name)).filter(Boolean)
      setQueue(savedQueue)
      setPracticeWords(savedPracticeWords)
      setIndex(Math.min(saved.index || 0, savedQueue.length))
      setStage(saved.stage || 'study')
      setSpellingIndex(Math.min(saved.spellingIndex || 0, Math.max(0, savedPracticeWords.length - 1)))
      return
    }

    const now = Date.now()
    const source = isReview
      ? words.filter((word) => state.learned[word.name]?.nextReview <= now || state.learned[word.name]?.hard)
      : words.filter((word) => !state.learned[word.name]?.mastered)
    const nextQueue = shuffle(source).slice(0, isReview ? 60 : state.dailyGoal)
    setQueue(nextQueue)
    setPracticeWords(isReview ? [] : nextQueue)
    setIndex(0)
    setStage('study')
    setSpellingIndex(0)
    if (!isReview) saveLearnSession(nextQueue, nextQueue, 0, 'study')
  }, [words, mode])

  const word = queue[index]

  useEffect(() => {
    setRevealed(false)
  }, [index, word?.name])

  useEffect(() => {
    const handler = (event) => {
      if (!word || paused) return
      if (event.code === 'Space') {
        event.preventDefault()
        setRevealed(true)
      }
      if (revealed && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
        grade(Number(event.code.replace('Digit', '')) - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [word, revealed, paused])

  function grade(score) {
    const now = Date.now()
    const current = state.learned[word.name] || { strength: 0, attempts: 0, hard: false }
    const strength = score === 0 ? 0 : Math.min(6, current.strength + score)
    const hard = score === 0 ? true : score === 2 && strength >= 3 ? false : current.hard
    const learned = {
      ...state.learned,
      [word.name]: {
        ...current,
        strength,
        attempts: current.attempts + 1,
        hard,
        remembered: score === 2,
        rememberedAt: score === 2 ? now : current.rememberedAt,
        mastered: score === 2 && strength >= 3,
        lastSeen: now,
        nextReview: now + reviewIntervals[strength],
      },
    }
    const today = dayKey()
    const activity = {
      ...state.activity,
      [today]: Object.values(learned).filter((item) => item.remembered && item.rememberedAt && dayKey(new Date(item.rememberedAt)) === today).length,
    }
    const nextQueue = score === 0 ? [...queue, word] : queue
    const nextIndex = index + 1
    setState({ ...state, learned, activity, sessionCount: state.sessionCount + 1 })
    if (score === 0) {
      toast('已加入生词本，稍后再见')
    }
    setQueue(nextQueue)
    setIndex(nextIndex)
    if (!isReview) saveLearnSession(nextQueue, practiceWords, nextIndex, 'study', spellingIndex)
  }

  if (!words.length) return <Loading />
  if (!word) {
    if (!isReview && stage === 'study' && practiceWords.length) {
      return <SpellingPractice
        words={practiceWords}
        state={state}
        setState={setState}
        toast={toast}
        startIndex={spellingIndex}
        onProgress={(nextIndex) => {
          setSpellingIndex(nextIndex)
          saveLearnSession(queue, practiceWords, index, 'study', nextIndex)
        }}
        onComplete={() => {
          setStage('done')
          saveLearnSession(queue, practiceWords, index, 'done', practiceWords.length)
        }}
      />
    }
    return (
      <div className="page empty-study">
        <span className="finish-mark"><Check size={34} /></span>
        <h1>{isReview ? '这轮复习清空了' : '今天的学习完成了'}</h1>
        <p>{isReview ? '刚才的判断已经保存，下一轮会优先安排薄弱词。' : '单词学习和拼写练习都已完成，今天辛苦了。'}</p>
        <button className="solid-button" onClick={() => navigate('dashboard')}>回到今日面板</button>
      </div>
    )
  }

  return (
    <div className="study-page">
      <div className="study-toolbar">
        <div>
          <span>{isReview ? '记忆回访' : '极速记忆'}</span>
          <strong>{Math.min(index + 1, queue.length)} / {queue.length}</strong>
        </div>
        <div className="study-progress"><i style={{ width: `${(index / queue.length) * 100}%` }} /></div>
        <button className="icon-button" onClick={() => setPaused(!paused)} aria-label={paused ? '继续' : '暂停'}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
      </div>

      <div className={`study-card ${revealed ? 'revealed' : ''}`}>
        <div className="word-topline">
          <span>高考核心词 · {String(words.findIndex((item) => item.name === word.name) + 1).padStart(4, '0')}</span>
          <button className="sound-button" onClick={() => speak(word.name, state.speechRate)} aria-label="播放美式发音" title="播放美式发音"><Volume2 size={20} /></button>
        </div>
        <div className="word-main">
          <h1>{word.name}</h1>
          <span className="phonetic">/ {word.usphone || '暂无音标'} /</span>
        </div>

        {!revealed ? (
          <div className="recall-gate">
            <p>在脑中说出它的意思，然后揭晓</p>
            <button className="reveal-button" onClick={() => setRevealed(true)}>查看释义 <ArrowRight size={18} /></button>
          </div>
        ) : (
          <WordDetails word={word} />
        )}
      </div>

      <div className="grade-row">
        <button disabled={!revealed} onClick={() => grade(0)} className="again"><CircleAlert size={19} /><span><strong>没记住</strong><small>稍后再来</small></span></button>
        <button disabled={!revealed} onClick={() => grade(1)} className="fuzzy"><Clock3 size={19} /><span><strong>有点模糊</strong><small>10 分钟后</small></span></button>
        <button disabled={!revealed} onClick={() => grade(2)} className="know"><Check size={19} /><span><strong>我记住了</strong><small>拉长间隔</small></span></button>
      </div>
    </div>
  )
}

function SentencePractice({ words, state, setState, navigate }) {
  const queue = useMemo(() => {
    const candidates = words.filter((word) => {
      const count = sentenceTokens(word.example?.c || '').length
      return word.example?.c && word.example?.cn && count >= 3 && count <= 24
    })
    const prioritized = [
      ...candidates.filter((word) => state.learned[word.name]?.hard),
      ...candidates.filter((word) => state.learned[word.name] && !state.learned[word.name]?.hard),
      ...candidates.filter((word) => !state.learned[word.name]),
    ]
    return shuffle([...new Map(prioritized.map((word) => [word.name, word])).values()]).slice(0, Math.min(20, state.dailyGoal))
  }, [words])
  const [index, setIndex] = useState(0)
  const [tiles, setTiles] = useState([])
  const [selected, setSelected] = useState([])
  const [wrongId, setWrongId] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  const [combo, setCombo] = useState(0)
  const [recorded, setRecorded] = useState(false)
  const word = queue[index]
  const targetTokens = sentenceTokens(word?.example?.c || '')
  const complete = Boolean(word && selected.length === targetTokens.length)

  useEffect(() => {
    if (!word) return
    setTiles(shuffle(targetTokens.map((text, id) => ({ id, text }))))
    setSelected([])
    setWrongId(null)
    setMistakes(0)
    setRecorded(false)
  }, [word?.name])

  useEffect(() => {
    if (!complete || recorded) return
    const now = Date.now()
    const current = state.learned[word.name] || { strength: 0, attempts: 0, hard: false, sentenceWins: 0 }
    const strength = Math.min(6, (current.strength || 0) + 1)
    const sentenceWins = (current.sentenceWins || 0) + 1
    const learned = {
      ...state.learned,
      [word.name]: {
        ...current,
        strength,
        attempts: (current.attempts || 0) + 1,
        sentenceWins,
        hard: sentenceWins >= 2 ? false : current.hard,
        mastered: current.mastered || false,
        lastSeen: now,
        nextReview: now + reviewIntervals[strength],
      },
    }
    setState({ ...state, learned, sentenceCount: (state.sentenceCount || 0) + 1 })
    setCombo((value) => mistakes === 0 ? value + 1 : 0)
    setRecorded(true)
  }, [complete, recorded])

  function choose(tile) {
    const expected = targetTokens[selected.length]
    if (tile.text !== expected) {
      setWrongId(tile.id)
      setMistakes((value) => value + 1)
      setTimeout(() => setWrongId(null), 350)
      return
    }
    setTiles((current) => current.filter((item) => item.id !== tile.id))
    setSelected((current) => [...current, tile])
  }

  function undo() {
    const previous = selected.at(-1)
    if (!previous || complete) return
    setSelected((current) => current.slice(0, -1))
    setTiles((current) => [...current, previous])
  }

  function reset() {
    setTiles(shuffle(targetTokens.map((text, id) => ({ id, text }))))
    setSelected([])
    setWrongId(null)
    setMistakes(0)
  }

  function next() {
    setIndex((value) => value + 1)
  }

  if (!words.length) return <Loading />
  if (!word) {
    return (
      <div className="page empty-study">
        <span className="finish-mark"><MessageSquareText size={34} /></span>
        <h1>这轮造句完成了</h1>
        <p>你已经把高考词汇放进完整句子里主动使用了一遍。</p>
        <button className="solid-button" onClick={() => navigate('dashboard')}>回到今日面板</button>
      </div>
    )
  }

  return (
    <div className="sentence-page">
      <div className="sentence-toolbar">
        <div><span>语境造句</span><strong>{index + 1} / {queue.length}</strong></div>
        <div className="study-progress"><i style={{ width: `${(index / queue.length) * 100}%` }} /></div>
        <span className="combo-badge"><Flame size={16} fill="currentColor" /> {combo} 连击</span>
      </div>

      <section className={`sentence-card ${complete ? 'complete' : ''}`}>
        <div className="sentence-prompt">
          <div>
            <small>用这个高考词完成句子</small>
            <h1>{word.name}</h1>
            <span>/ {word.usphone || '暂无音标'} /</span>
          </div>
          <button className="sound-button" onClick={() => speak(word.name, state.speechRate)} aria-label="播放美式发音"><Volume2 size={21} /></button>
        </div>

        <div className="sentence-context">
          <small>中文语境</small>
          <p>{word.example.cn}</p>
          <div className="sentence-meaning">{word.trans.slice(0, 2).map((text) => <span key={text}>{text}</span>)}</div>
        </div>

        <div className="sentence-answer">
          <small>{complete ? '完成得很好' : '依次点击词块，组成完整英文句子'}</small>
          <p>{selected.length ? joinSentence(selected.map((tile) => tile.text)) : '从下方选择第一个词块…'}</p>
          {complete && <button onClick={() => speak(word.example.c, state.speechRate)}><Volume2 size={17} /> 听完整句子</button>}
        </div>

        {!complete ? (
          <div className="sentence-builder">
            <div className="sentence-tiles">
              {tiles.map((tile) => <button key={tile.id} className={wrongId === tile.id ? 'wrong' : ''} onClick={() => choose(tile)}>{tile.text}</button>)}
            </div>
            <div className="sentence-tools">
              <button onClick={undo} disabled={!selected.length}><RotateCcw size={16} /> 撤回</button>
              <button onClick={reset}><RefreshCcw size={16} /> 重排</button>
              <span>{mistakes ? `已即时纠正 ${mistakes} 次` : '保持连击：一次拼对'}</span>
            </div>
          </div>
        ) : (
          <div className="sentence-success">
            <span><Check size={20} /> {mistakes === 0 ? '一次拼对，连击 +1' : '句子完成，错误已纠正'}</span>
            <button className="solid-button" onClick={next}>下一句 <ArrowRight size={17} /></button>
          </div>
        )}
      </section>
    </div>
  )
}

function SpellingPractice({ words, state, setState, toast, startIndex = 0, onProgress, onComplete }) {
  const [index, setIndex] = useState(startIndex)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  const inputRef = useRef(null)
  const word = words[index]

  useEffect(() => {
    setAnswer('')
    setChecked(null)
    setMistakes(0)
    if (word) setTimeout(() => inputRef.current?.focus(), 100)
  }, [index, word?.name])

  function saveResult(result) {
    const now = Date.now()
    const current = state.learned[word.name] || { strength: 0, attempts: 0, hard: false }
    const skipped = result === 'skipped'
    const learned = {
      ...state.learned,
      [word.name]: {
        ...current,
        strength: skipped && mistakes === 0 ? Math.max(0, (current.strength || 0) - 1) : current.strength || 0,
        hard: skipped ? true : current.hard,
        remembered: skipped ? false : current.remembered,
        mastered: skipped ? false : current.mastered,
        spellingAttempts: (current.spellingAttempts || 0) + 1,
        spellingWins: (current.spellingWins || 0) + (result === 'correct' ? 1 : 0),
        spellingSkips: (current.spellingSkips || 0) + (result === 'skipped' ? 1 : 0),
        lastSpelling: now,
        lastSpellingResult: result,
        nextReview: failed ? now : current.nextReview,
      },
    }
    setState({ ...state, learned })
  }

  function saveMistake() {
    const now = Date.now()
    const current = state.learned[word.name] || { strength: 0, attempts: 0, hard: false }
    const learned = {
      ...state.learned,
      [word.name]: {
        ...current,
        strength: mistakes === 0 ? Math.max(0, (current.strength || 0) - 1) : current.strength || 0,
        hard: true,
        remembered: false,
        mastered: false,
        spellingMistakes: (current.spellingMistakes || 0) + 1,
        lastSpelling: now,
        lastSpellingResult: 'incorrect',
        nextReview: now,
      },
    }
    setState({ ...state, learned })
  }

  function next(result) {
    saveResult(result)
    if (index + 1 >= words.length) onComplete()
    else {
      const nextIndex = index + 1
      setIndex(nextIndex)
      onProgress?.(nextIndex)
    }
  }

  function check() {
    if (!answer.trim()) return
    const success = answer.trim().toLowerCase() === word.name.toLowerCase()
    setChecked(success)
    if (success) setTimeout(() => next('correct'), 450)
    else {
      saveMistake()
      setMistakes((value) => value + 1)
    }
  }

  function skip() {
    saveResult('skipped')
    toast?.('已记录为薄弱词，并加入生词本')
    if (index + 1 >= words.length) onComplete()
    else {
      const nextIndex = index + 1
      setIndex(nextIndex)
      onProgress?.(nextIndex)
    }
  }

  return (
    <div className="spelling-page">
      <div className="study-toolbar">
        <div><span>今日拼写</span><strong>{index + 1} / {words.length}</strong></div>
        <div className="study-progress"><i style={{ width: `${(index / words.length) * 100}%` }} /></div>
        <button className="icon-button" onClick={() => speak(word.name, state.speechRate)} aria-label="播放读音"><Volume2 size={18} /></button>
      </div>
      <section className="spelling-card">
        <span className="spelling-mark"><Keyboard size={25} /></span>
        <small>听读音，根据音标拼写单词</small>
        <button className="spelling-phonetic" onClick={() => speak(word.name, state.speechRate)}>
          / {word.usphone || '点击听发音'} / <Speaker size={20} />
        </button>
        <div className="spelling-meaning">
          <small>中文释义</small>
          {word.trans.map((text) => <p key={text}>{text}</p>)}
        </div>
        <div className={`spelling-input ${checked === false ? 'wrong' : checked === true ? 'correct' : ''}`}>
          <input
            ref={inputRef}
            value={answer}
            onChange={(event) => { setAnswer(event.target.value); setChecked(null) }}
            onKeyDown={(event) => event.key === 'Enter' && check()}
            placeholder="输入你听到的单词"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
          />
          <button onClick={check}><Check size={20} /></button>
        </div>
        <p className={checked === false ? 'spelling-feedback show' : 'spelling-feedback'}>
          拼写还不对，再听一次试试。
        </p>
        <button className="skip-spelling" onClick={skip}>暂时跳过</button>
      </section>
    </div>
  )
}

function Wordbook({ words, state, setState, toast }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('hard')
  const [limit, setLimit] = useState(80)
  const filtered = useMemo(() => {
    const lower = query.toLowerCase().trim()
    return words.filter((word) => {
      const record = state.learned[word.name]
      const matchesQuery = !lower || word.name.toLowerCase().includes(lower) || word.trans.join('').includes(lower)
      const matchesFilter = filter === 'all' || (filter === 'hard' && record?.hard) || (filter === 'mastered' && record?.mastered)
      return matchesQuery && matchesFilter
    })
  }, [words, state, query, filter])

  function toggleHard(name) {
    const current = state.learned[name] || { strength: 0, attempts: 0, nextReview: Date.now() }
    setState({ ...state, learned: { ...state.learned, [name]: { ...current, hard: !current.hard } } })
    toast(current.hard ? '已移出生词本' : '已加入生词本')
  }

  return (
    <div className="page">
      <section className="library-head">
        <div><span className="eyebrow">把薄弱处练成得分点</span><h1>生词本</h1><p>越是记不住的词，越值得多见几次。</p></div>
        <div className="library-count"><strong>{filtered.length}</strong><span>当前词条</span></div>
      </section>
      <section className="word-controls">
        <label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索单词或中文释义" /></label>
        <div className="segmented">
          {[['hard', '生词'], ['mastered', '已掌握'], ['all', '全部']].map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={filter === id ? 'active' : ''}>{label}</button>)}
        </div>
      </section>
      <div className="word-list">
        {filtered.slice(0, limit).map((word) => {
          const record = state.learned[word.name]
          return (
            <div className="word-row" key={word.name}>
              <button className="row-sound" onClick={() => speak(word.name, state.speechRate)}><Volume2 size={18} /></button>
              <div className="row-word"><strong>{word.name}</strong><small>/{word.usphone}/</small></div>
              <p>{word.trans.join('；')}</p>
              <span className={`strength s${Math.min(3, record?.strength || 0)}`}><i /><i /><i /></span>
              <button className={`star-button ${record?.hard ? 'active' : ''}`} onClick={() => toggleHard(word.name)}><Star size={18} fill={record?.hard ? 'currentColor' : 'none'} /></button>
            </div>
          )
        })}
        {!filtered.length && <div className="list-empty"><BookMarked size={26} /><strong>这里还很干净</strong><span>在速记中点“没记住”，单词就会来到这里。</span></div>}
      </div>
      {limit < filtered.length && <button className="load-more" onClick={() => setLimit(limit + 80)}>再显示 80 个</button>}
    </div>
  )
}

function Stats({ words, state, progress }) {
  const levels = [0, 1, 2, 3, 4, 5, 6].map((level) => Object.values(state.learned).filter((item) => Math.min(6, item.strength || 0) === level).length)
  const max = Math.max(...levels, 1)
  return (
    <div className="page">
      <section className="stats-head">
        <div><span className="eyebrow">你的每一次判断都在留下轨迹</span><h1>学习进度</h1></div>
        <div className="big-progress"><strong>{progress.percent}%</strong><span>词表掌握度</span></div>
      </section>
      <section className="stats-grid">
        <div className="panel retention-panel">
          <div className="panel-head"><div><small>记忆分布</small><h2>熟悉度阶梯</h2></div><ListFilter size={20} /></div>
          <div className="level-chart">
            {levels.map((count, level) => <div key={level}><span>{count}</span><i style={{ height: `${Math.max(5, count / max * 100)}%` }} /><small>L{level}</small></div>)}
          </div>
        </div>
        <div className="panel forecast-panel">
          <span className="metric-icon coral"><Target size={21} /></span>
          <small>完成预测</small><h2>{progress.daysLeft} 天</h2>
          <p>保持每天 {state.dailyGoal} 个新词，大约在 <strong>{futureDate(progress.daysLeft)}</strong> 完成首轮。</p>
          <div className="forecast-line"><i style={{ width: `${progress.coverage}%` }} /></div>
        </div>
      </section>
      <section className="insight-strip">
        <div><Flame size={21} /><span><small>最长连续</small><strong>{progress.streak} 天</strong></span></div>
        <div><MessageSquareText size={21} /><span><small>完成造句</small><strong>{state.sentenceCount || 0} 句</strong></span></div>
        <div><BookMarked size={21} /><span><small>重点攻克</small><strong>{progress.hardCount} 词</strong></span></div>
        <div><Check size={21} /><span><small>稳定掌握</small><strong>{progress.masteredCount} 词</strong></span></div>
      </section>
    </div>
  )
}

function SettingsView({ state, setState, words, toast, cloud, openAuth }) {
  const [goal, setGoal] = useState(state.dailyGoal)
  function reset() {
    if (window.confirm('确定清空全部学习记录吗？词表不会被删除。')) {
      localStorage.removeItem(LEARN_SESSION_KEY)
      setState(defaultState)
      toast('学习记录已清空')
    }
  }
  return (
    <div className="page settings-page">
      <section className="library-head"><div><span className="eyebrow">按你的节奏来</span><h1>学习设置</h1><p>少一点摩擦，多一点真正记住。</p></div></section>
      <section className="settings-list">
        <div className="setting-row account-row">
          <span className="metric-icon blue">{cloud.user ? <Cloud size={19} /> : <CloudOff size={19} />}</span>
          <div>
            <strong>{cloud.user ? '学习记录已开启云同步' : '当前仅保存在此设备'}</strong>
            <small>{cloud.user ? `${cloud.user.email} · ${syncLabel(cloud.status)}` : cloud.cloudEnabled ? '登录后可在其他设备继续学习' : '配置 Supabase 后即可登录并跨设备同步'}</small>
          </div>
          {cloud.user
            ? <button className="account-button" onClick={cloud.signOut}><LogOut size={16} />退出登录</button>
            : <button className="account-button primary" onClick={openAuth} disabled={!cloud.cloudEnabled}><LogIn size={16} />登录同步</button>}
        </div>
        <div className="setting-row">
          <span className="metric-icon coral"><Target size={19} /></span>
          <div><strong>每日新词目标</strong><small>决定每天速记队列的长度</small></div>
          <div className="stepper"><button onClick={() => setGoal(Math.max(10, goal - 10))}>−</button><b>{goal}</b><button onClick={() => setGoal(Math.min(200, goal + 10))}>+</button></div>
        </div>
        <div className="setting-row range-row">
          <span className="metric-icon green"><Headphones size={19} /></span>
          <div><strong>发音速度</strong><small>{state.speechRate === 1 ? '标准速度' : `${state.speechRate} 倍速`}</small></div>
          <input type="range" min="0.6" max="1.1" step="0.05" value={state.speechRate} onChange={(event) => setState({ ...state, speechRate: Number(event.target.value) })} />
        </div>
        <div className="setting-row source-row">
          <span className="metric-icon yellow"><BookOpen size={19} /></span>
          <div><strong>当前词库</strong><small>TypeWords 高考 3500 · 实收 {words.length || 3875} 个词条 · 仅美式音标</small></div>
          <span className="source-badge">GPL-3.0</span>
        </div>
      </section>
      <div className="settings-actions">
        <button className="solid-button" onClick={() => { setState({ ...state, dailyGoal: goal }); toast('设置已保存') }}>保存设置</button>
        <button className="danger-button" onClick={reset}>清空学习记录</button>
      </div>
    </div>
  )
}

function AuthDialog({ close, toast }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    toast(mode === 'login' ? '登录成功，正在同步' : '注册成功，请按邮件提示确认账号')
    close()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <form className="auth-dialog" onSubmit={submit}>
        <button type="button" className="dialog-close" onClick={close}><X size={18} /></button>
        <span className="auth-mark"><Cloud size={23} /></span>
        <h2>{mode === 'login' ? '登录并继续背词' : '创建同步账号'}</h2>
        <p>学习记录会自动同步到你的其他设备。</p>
        <label>邮箱<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label>密码<input required minLength="6" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" /></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" disabled={busy}>{busy ? '请稍候…' : mode === 'login' ? '登录并同步' : '注册账号'}</button>
        <button type="button" className="auth-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? '没有账号？立即注册' : '已经注册？返回登录'}
        </button>
      </form>
    </div>
  )
}

function Loading() {
  return <div className="page-loading"><span /><p>正在装入高考词库…</p></div>
}

function speak(text, rate = 0.85) {
  currentAudio?.pause()
  currentAudio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`)
  let fellBack = false
  const fallback = () => {
    if (fellBack) return
    fellBack = true
    speakWithDeviceVoice(text, rate)
  }
  currentAudio.addEventListener('error', fallback, { once: true })
  currentAudio.play().catch(fallback)
}

function speakWithDeviceVoice(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  utterance.voice = voices.find((voice) => voice.lang === 'en-US' && /natural|google|samantha|zira/i.test(voice.name))
    || voices.find((voice) => voice.lang === 'en-US')
    || null
  utterance.lang = 'en-US'
  utterance.rate = rate
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}

function getProgress(words, state) {
  const records = Object.values(state.learned)
  const rememberedRecords = records.filter((item) => item.remembered === true)
  const todayCount = rememberedRecords.filter((item) => item.rememberedAt && dayKey(new Date(item.rememberedAt)) === dayKey()).length
  const masteredCount = rememberedRecords.filter((item) => item.mastered).length
  const dueCount = records.filter((item) => item.nextReview <= Date.now() || item.hard).length
  const hardCount = records.filter((item) => item.hard).length
  const rememberedCount = rememberedRecords.length
  const remaining = Math.max(0, words.length - rememberedCount)
  return {
    todayCount,
    masteredCount,
    dueCount,
    hardCount,
    rememberedCount,
    coverage: words.length ? Number((rememberedCount / words.length * 100).toFixed(1)) : 0,
    coverageExact: words.length ? rememberedCount / words.length * 100 : 0,
    percent: words.length ? Number((masteredCount / words.length * 100).toFixed(1)) : 0,
    daysLeft: Math.max(1, Math.ceil(remaining / state.dailyGoal)),
    streak: getStreak(state.activity),
  }
}

function getStreak(activity) {
  let streak = 0
  const cursor = new Date()
  if (!activity[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1)
  while (activity[dayKey(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function getWeekActivity(state) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + index)
    return {
      date: dayKey(date),
      label: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
      value: state.activity[dayKey(date)] || 0,
      today: index === 6,
    }
  })
}

function formatDate() {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
}

function futureDate(days) {
  const date = new Date(Date.now() + days * DAY)
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date)
}

function pageTitle(view) {
  return { dashboard: '今日学习', learn: '极速记忆', sentence: '语境造句', review: '记忆回访', wordbook: '生词本', stats: '学习进度', settings: '学习设置' }[view]
}

function syncLabel(status) {
  return { loading: '正在读取云端', saving: '正在同步', synced: '已同步', error: '同步失败', local: '本地记录' }[status] || '云同步'
}

export default App
