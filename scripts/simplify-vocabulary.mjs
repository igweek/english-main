import { readFile, writeFile } from 'node:fs/promises'

const TARGET_PATH = new URL('../public/data/gaokao3500.json', import.meta.url)
const RARE_LABEL = /<(?:古|旧|史|非正式|方|文|书面)[^>]*>/
const SPECIAL_TRANSLATIONS = {
  a: ['art. 一（个）'],
  'a.m.': ['abbr. 上午'],
  'ad.': ['n. 广告'],
  bookshelf: ['n. 书架'],
  iron: ['n. 铁；熨斗', 'v. 熨，烫平'],
  'little less least': ['adj. 小的，少的', 'adv. 很少地，稍许'],
  'Miss.': ['n. 小姐'],
  'Mr.': ['n. 先生'],
  'Mrs.': ['n. 夫人'],
  'Ms.': ['n. 女士'],
  'P.C.': ['abbr. 个人电脑'],
  'P.E.': ['abbr. 体育'],
  'P.M.': ['abbr. 下午'],
  'set set set': ['v. 释放，安置', 'n. 装备，设备'],
  'turning n': ['n. 转弯处'],
  'U.K.': ['abbr. 英国'],
  'U.N.': ['abbr. 联合国'],
  'U.S.A.': ['abbr. 美国'],
  yours: ['pron. 你的东西；你们的东西'],
}
const SPECIAL_POS = {
  iron: 'n.',
  thus: 'adv.',
  yours: 'pron.',
}

function removeParenthetical(text) {
  let depth = 0
  let result = ''
  for (const character of text) {
    if (character === '(' || character === '（') {
      depth += 1
      continue
    }
    if (character === ')' || character === '）') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (depth === 0) result += character
  }
  return result
}

function fallbackPos(word) {
  if (SPECIAL_POS[word]) return SPECIAL_POS[word]
  return /[\s&=-]/.test(word) ? 'phr.' : 'n.'
}

function simplifyTranslation(translation, word) {
  const match = translation.match(/^(\S+)\s+(.+)$/)
  if (match?.[1] === '【名】' || /[人姓]名/.test(translation)) return ''
  const pos = match ? match[1] : fallbackPos(word)
  const sourceMeaning = match ? match[2] : translation
  const meanings = sourceMeaning
    .split(/[；;]/)
    .filter((item) => item && !RARE_LABEL.test(item))
    .map((item) => removeParenthetical(item)
      .replace(/<[^>]+>/g, '')
      .replace(/[：:].*$/, '')
      .replace(/\s+/g, ' ')
      .replace(/^[，、；:：\s]+|[，、；:：\s]+$/g, '')
      .trim())
    .filter((item) => item && item !== 'undefined' && item.length <= 28)
  const concise = [...new Set(meanings)].slice(0, 3)
  return concise.length ? `${pos} ${concise.join('；')}` : ''
}

const words = JSON.parse(await readFile(TARGET_PATH, 'utf8')).map((word) => {
  const usable = word.trans.filter((translation) => !/^【名】/.test(translation) && !/[人姓]名/.test(translation))
  const structured = usable.filter((translation) => /^(\S+)\s+(.+)$/.test(translation))
  const source = structured.length ? structured : usable
  return {
    ...word,
    trans: SPECIAL_TRANSLATIONS[word.name] || source.map((translation) => simplifyTranslation(translation, word.name)).filter(Boolean).slice(0, 4),
  }
})

await writeFile(TARGET_PATH, `${JSON.stringify(words, null, 2)}\n`)
console.log(JSON.stringify({
  entries: words.length,
  translations: words.reduce((sum, word) => sum + word.trans.length, 0),
  entriesWithoutTranslations: words.filter((word) => !word.trans.length).length,
}, null, 2))
