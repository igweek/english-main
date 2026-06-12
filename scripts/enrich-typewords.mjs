import { readFile, writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://files.typewords.cc/dicts/en/word/GaoKao_3500.json'
const TARGET_PATH = new URL('../public/data/gaokao3500.json', import.meta.url)

const current = JSON.parse(await readFile(TARGET_PATH, 'utf8'))
const typeWords = await fetch(SOURCE_URL).then((response) => {
  if (!response.ok) throw new Error(`TypeWords download failed: ${response.status}`)
  return response.json()
})
const typeWordsMap = new Map(typeWords.map((item) => [item.word.toLowerCase(), item]))

let sentenceCount = 0
let translationCount = 0
const enriched = current.map((word) => {
  const source = typeWordsMap.get(word.name.toLowerCase())
  if (!source) return word

  const translations = source.trans?.length
    ? source.trans.map((item) => `${item.pos ? `${item.pos} ` : ''}${item.cn}`.trim())
    : word.trans
  const sentences = (source.sentences || [])
    .filter((item) => item.c && item.cn)
    .map((item) => ({ c: item.c, cn: item.cn }))

  if (source.trans?.length) translationCount += 1
  if (sentences.length) sentenceCount += 1

  return {
    name: word.name,
    usphone: source.phonetic0 || word.usphone,
    ukphone: source.phonetic1 || word.ukphone,
    trans: translations,
    sentences,
  }
})

await writeFile(TARGET_PATH, `${JSON.stringify(enriched, null, 2)}\n`)
console.log(JSON.stringify({
  entries: enriched.length,
  enrichedTranslations: translationCount,
  entriesWithSentences: sentenceCount,
  source: SOURCE_URL,
}, null, 2))
