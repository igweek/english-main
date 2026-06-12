import { writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://files.typewords.cc/dicts/en/word/GaoKao_3500.json'
const TARGET_PATH = new URL('../public/data/gaokao3500.json', import.meta.url)

const typeWords = await fetch(SOURCE_URL).then((response) => {
  if (!response.ok) throw new Error(`TypeWords download failed: ${response.status}`)
  return response.json()
})
let sentenceCount = 0
const words = typeWords.map((source) => {
  const translations = (source.trans || []).map((item) => `${item.pos ? `${item.pos} ` : ''}${item.cn}`.trim())
  const example = (source.sentences || []).find((item) => item.c && item.cn)
  if (example) sentenceCount += 1

  return {
    name: source.word,
    usphone: source.phonetic0 || '',
    trans: translations,
    ...(example ? { example: { c: example.c, cn: example.cn } } : {}),
  }
})

await writeFile(TARGET_PATH, `${JSON.stringify(words, null, 2)}\n`)
console.log(JSON.stringify({
  entries: words.length,
  entriesWithSentences: sentenceCount,
  source: SOURCE_URL,
}, null, 2))
