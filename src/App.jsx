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
  Heart,
  Home,
  Keyboard,
  LayoutDashboard,
  Lightbulb,
  ListFilter,
  MapPin,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  LogIn,
  LogOut,
  Sparkles,
  Speaker,
  Star,
  Target,
  Users,
  Volume2,
  X,
  Zap,
} from 'lucide-react'
import { supabase } from './supabase'
import { useCloudSync } from './useCloudSync'
import { buildPhonicsCue } from './phonics'

const STORAGE_KEY = 'word-sprint-state-v1'
const DAY = 24 * 60 * 60 * 1000

const defaultState = {
  dailyGoal: 40,
  learned: {},
  activity: {},
  sessionCount: 0,
  autoSpeak: true,
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

function cleanMeaning(word) {
  return word.trans.join('；').replace(/\b(modal|art|n|v|vt|vi|a|adj|ad|adv|prep|pron|conj|num|int)\.?\s*/gi, '').trim()
}

function getExample(word) {
  const sourceExample = [...(word.sentences || [])]
    .filter((item) => item.c && item.cn)
    .sort((left, right) => left.c.length - right.c.length)[0]
  if (sourceExample) return { english: sourceExample.c, chinese: sourceExample.cn }

  const meaning = cleanMeaning(word).split(/[；，,]/)[0]
  const entry = word.name

  if (/^modal\b/i.test(word.trans[0])) {
    return { english: `We ${entry} finish this task together.`, chinese: `我们${meaning}一起完成这项任务。` }
  }
  if (/^(v|vt|vi)\./i.test(word.trans[0])) {
    return { english: `They will ${entry} when the time is right.`, chinese: `时机合适时，他们会${meaning}。` }
  }
  if (/^(a|adj)\./i.test(word.trans[0])) {
    return { english: `The result seems ${entry} to everyone.`, chinese: `这个结果在大家看来很${meaning}。` }
  }
  if (/^(ad|adv)\./i.test(word.trans[0])) {
    return { english: `She answered the question ${entry}.`, chinese: `她${meaning}回答了这个问题。` }
  }
  if (/^(n|num)\./i.test(word.trans[0])) {
    return { english: `The ${entry} is important in our daily life.`, chinese: `这个${meaning}在日常生活中很重要。` }
  }
  return { english: `Can you use “${entry}” in a short sentence?`, chinese: `你能用表示“${meaning}”的 ${entry} 造一个短句吗？` }
}

function getMemoryTheme(word) {
  const meaning = cleanMeaning(word)
  const themes = [
    [/人|学生|老师|朋友|家庭|成员|孩子|男人|女人/, Users, '人物'],
    [/爱|喜欢|快乐|高兴|感情|心|善良/, Heart, '感受'],
    [/家|房|建筑|学校|教室|医院|商店/, Home, '地点'],
    [/位置|地方|方向|路|街|城市|国家|世界|旅行/, MapPin, '方位'],
    [/想|知道|理解|聪明|主意|知识|学习|思考/, Lightbulb, '想法'],
    [/声音|说|听|音乐|唱|语言|读/, Volume2, '声音'],
    [/时间|分钟|小时|日期|早|晚|过去|未来/, Clock3, '时间'],
    [/火|热|光|太阳|能量|燃烧/, Flame, '能量'],
    [/目标|成功|完成|达到|赢|比赛/, Target, '目标'],
    [/书|文章|词|写|阅读|故事|纸/, BookOpen, '文字'],
  ]
  const match = themes.find(([pattern]) => pattern.test(meaning))
  const hue = [...word.name].reduce((total, letter) => total + letter.charCodeAt(0), 0) % 360
  return { Icon: match?.[1] || Sparkles, label: match?.[2] || '联想', hue }
}

function MemoryPicture({ word }) {
  const { Icon, label, hue } = getMemoryTheme(word)
  return (
    <div className="memory-picture" style={{ '--memory-hue': hue }} aria-label={`${word.name} 的记忆图`}>
      <i className="memory-orbit one" /><i className="memory-orbit two" />
      <Icon size={42} strokeWidth={1.7} />
      <span>{label}</span>
      <small>{cleanMeaning(word).slice(0, 18)}</small>
    </div>
  )
}

function WordDetails({ word }) {
  const example = getExample(word)
  return (
    <div className="answer-area">
      <div className="meaning"><small>核心释义</small>{word.trans.map((text) => <p key={text}>{text}</p>)}</div>
      <div className="example-block">
        <small>语境例句</small>
        <p>{example.english}</p>
        <span>{example.chinese}</span>
      </div>
      <MemoryPicture word={word} />
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
          <div className="side-summary-top"><span>总进度</span><strong>{progress.seenCount}/{words.length || 3893}</strong></div>
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
          <span className="metric-icon coral"><BookOpen size={19} /></span><small>已见过</small>
          <strong>{progress.seenCount}</strong><p>覆盖词表 {progress.coverage}%</p>
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
            <li><b>01</b><span><strong>听音先行</strong><small>先让耳朵认出它，再看释义</small></span></li>
            <li><b>02</b><span><strong>快速判断</strong><small>3 秒内决定认识或模糊</small></span></li>
            <li><b>03</b><span><strong>最后拼写</strong><small>完成今日词汇后，集中听音拼写</small></span></li>
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
  const isReview = mode === 'review'

  useEffect(() => {
    if (!words.length) return
    const now = Date.now()
    const source = isReview
      ? words.filter((word) => state.learned[word.name]?.nextReview <= now || state.learned[word.name]?.hard)
      : words.filter((word) => !state.learned[word.name]?.mastered)
    const nextQueue = shuffle(source).slice(0, isReview ? 60 : state.dailyGoal)
    setQueue(nextQueue)
    setPracticeWords(isReview ? [] : nextQueue)
    setIndex(0)
    setStage('study')
  }, [words, mode])

  const word = queue[index]

  useEffect(() => {
    setRevealed(false)
    if (word && state.autoSpeak && !paused) setTimeout(() => speak(word.name, state.speechRate), 250)
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
        mastered: strength >= 3,
        lastSeen: now,
        nextReview: now + reviewIntervals[strength],
      },
    }
    const today = dayKey()
    const activity = {
      ...state.activity,
      [today]: Math.max(state.activity[today] || 0, Object.values(learned).filter((item) => dayKey(new Date(item.lastSeen)) === today).length),
    }
    setState({ ...state, learned, activity, sessionCount: state.sessionCount + 1 })
    if (score === 0) {
      setQueue((currentQueue) => [...currentQueue, word])
      toast('已加入生词本，稍后再见')
    }
    setIndex((value) => value + 1)
  }

  if (!words.length) return <Loading />
  if (!word) {
    if (!isReview && stage === 'study' && practiceWords.length) {
      return <SpellingPractice words={practiceWords} state={state} onComplete={() => setStage('done')} />
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
          <button className="sound-button" onClick={() => speak(word.name, state.speechRate)}><Volume2 size={20} /> 美音</button>
        </div>
        <div className="word-main">
          <h1>{word.name}</h1>
          <button className="phonetic" onClick={() => speak(word.name, state.speechRate)}>/ {word.usphone || '点击听发音'} / <Speaker size={17} /></button>
          <div className="memory-cue">
            <small>自然拼读</small><strong>{buildPhonicsCue(word.name, word.usphone)}</strong>
          </div>
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

function SpellingPractice({ words, state, onComplete }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(null)
  const inputRef = useRef(null)
  const word = words[index]

  useEffect(() => {
    setAnswer('')
    setChecked(null)
    if (word) {
      setTimeout(() => speak(word.name, state.speechRate), 250)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [index, word?.name])

  function next() {
    if (index + 1 >= words.length) onComplete()
    else setIndex((value) => value + 1)
  }

  function check() {
    if (!answer.trim()) return
    const success = answer.trim().toLowerCase() === word.name.toLowerCase()
    setChecked(success)
    if (success) setTimeout(next, 450)
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
        <button className="skip-spelling" onClick={next}>暂时跳过</button>
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
        <div><Zap size={21} /><span><small>累计判断</small><strong>{state.sessionCount} 次</strong></span></div>
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
        <div className="setting-row">
          <span className="metric-icon blue"><Volume2 size={19} /></span>
          <div><strong>出现单词时自动发音</strong><small>优先调用设备中的 en-US 美式语音</small></div>
          <button className={`toggle ${state.autoSpeak ? 'on' : ''}`} onClick={() => setState({ ...state, autoSpeak: !state.autoSpeak })}><i /></button>
        </div>
        <div className="setting-row range-row">
          <span className="metric-icon green"><Headphones size={19} /></span>
          <div><strong>发音速度</strong><small>{state.speechRate === 1 ? '标准速度' : `${state.speechRate} 倍速`}</small></div>
          <input type="range" min="0.6" max="1.1" step="0.05" value={state.speechRate} onChange={(event) => setState({ ...state, speechRate: Number(event.target.value) })} />
        </div>
        <div className="setting-row source-row">
          <span className="metric-icon yellow"><BookOpen size={19} /></span>
          <div><strong>当前词库</strong><small>高考 3500 · 实收 {words.length || 3893} 个词条 · 含美音音标与中文释义</small></div>
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
  const todayCount = records.filter((item) => item.lastSeen && dayKey(new Date(item.lastSeen)) === dayKey()).length
  const masteredCount = records.filter((item) => item.mastered).length
  const dueCount = records.filter((item) => item.nextReview <= Date.now() || item.hard).length
  const hardCount = records.filter((item) => item.hard).length
  const remaining = Math.max(0, words.length - records.length)
  return {
    todayCount,
    masteredCount,
    dueCount,
    hardCount,
    seenCount: records.length,
    coverage: words.length ? Number((records.length / words.length * 100).toFixed(1)) : 0,
    coverageExact: words.length ? records.length / words.length * 100 : 0,
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
  return { dashboard: '今日学习', learn: '极速记忆', review: '记忆回访', wordbook: '生词本', stats: '学习进度', settings: '学习设置' }[view]
}

function syncLabel(status) {
  return { loading: '正在读取云端', saving: '正在同步', synced: '已同步', error: '同步失败', local: '本地记录' }[status] || '云同步'
}

export default App
