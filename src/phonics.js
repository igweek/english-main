const PHONICS_EXCEPTIONS = {
  beautiful: ['beau', 'ti', 'ful'],
  business: ['busi', 'ness'],
  chocolate: ['choc', 'o', 'late'],
  computer: ['com', 'pu', 'ter'],
  different: ['dif', 'fer', 'ent'],
  education: ['e', 'du', 'ca', 'tion'],
  environment: ['en', 'vi', 'ron', 'ment'],
  every: ['ev', 'ery'],
  everyone: ['ev', 'ery', 'one'],
  family: ['fam', 'i', 'ly'],
  important: ['im', 'por', 'tant'],
  inter: ['in', 'ter'],
  interesting: ['in', 'ter', 'est', 'ing'],
  over: ['o', 'ver'],
  people: ['peo', 'ple'],
  picture: ['pic', 'ture'],
  reading: ['read', 'ing'],
  several: ['sev', 'er', 'al'],
  station: ['sta', 'tion'],
  super: ['su', 'per'],
  under: ['un', 'der'],
  vegetable: ['veg', 'e', 'ta', 'ble'],
}

const PREFIXES = [
  ['under', 2], ['inter', 2], ['over', 2], ['anti', 2], ['auto', 2], ['super', 2],
  ['trans', 1], ['pre', 1], ['pro', 1], ['sub', 1], ['dis', 1], ['mis', 1],
  ['non', 1], ['com', 1], ['con', 1], ['de', 1], ['en', 1], ['ex', 1],
  ['im', 1], ['in', 1], ['un', 1], ['re', 1],
]
const SUFFIXES = [
  ['ability', 4], ['ibility', 4], ['tion', 1], ['sion', 1], ['cian', 1],
  ['ation', 2], ['ition', 2], ['ology', 3],
  ['fully', 2], ['lessly', 2], ['able', 2], ['ible', 2], ['ity', 2],
  ['ture', 1], ['ment', 1],
  ['ness', 1], ['ful', 1], ['less', 1], ['ous', 1], ['ive', 1],
  ['ing', 1], ['est', 1], ['ant', 1], ['ent', 1], ['al', 1], ['er', 1], ['ly', 1],
]
const VOWEL = /[aeiouy]/
const IPA_VOWEL = /[iɪeɛæɑɒɔʊuʌəɜɚɝɐ]/u

function countPronouncedSyllables(phone) {
  const firstPronunciation = (phone || '').split(/[,;]/)[0]
    .replace(/[()]/g, '')
    .replace(/[ˈˌ:ː]/g, '')
  let count = 0
  let inVowel = false
  for (const character of firstPronunciation) {
    const isVowel = IPA_VOWEL.test(character)
    if (isVowel && !inVowel) count += 1
    inVowel = isVowel
  }
  return count
}

function vowelNuclei(word) {
  const nuclei = []
  let index = 0
  while (index < word.length) {
    if (!VOWEL.test(word[index])) {
      index += 1
      continue
    }
    const start = index
    while (index + 1 < word.length && VOWEL.test(word[index + 1])) index += 1
    nuclei.push([start, index])
    index += 1
  }

  if (word.endsWith('e') && !word.endsWith('le') && nuclei.length > 1) nuclei.pop()
  if (word.endsWith('le') && word.length > 2 && !VOWEL.test(word.at(-3))) {
    const finalE = word.length - 1
    if (!nuclei.some(([start]) => start === finalE)) nuclei.push([finalE, finalE])
  }
  return nuclei
}

function splitByNuclei(word) {
  const nuclei = vowelNuclei(word)
  if (nuclei.length < 2) return [word]
  const boundaries = []

  for (let index = 0; index < nuclei.length - 1; index += 1) {
    const gapStart = nuclei[index][1] + 1
    const gapEnd = nuclei[index + 1][0]
    const consonants = word.slice(gapStart, gapEnd)
    if (!consonants) boundaries.push(gapEnd)
    else if (consonants.length === 1) boundaries.push(gapStart)
    else if (word.endsWith('le') && index === nuclei.length - 2) boundaries.push(Math.max(gapStart, gapEnd - 2))
    else boundaries.push(gapStart + 1)
  }

  return boundaries.reduce((parts, boundary) => {
    const used = parts.slice(0, -1).join('').length
    const tail = parts.at(-1)
    return [...parts.slice(0, -1), tail.slice(0, boundary - used), tail.slice(boundary - used)]
  }, [word]).filter(Boolean)
}

function fitSyllableCount(parts, target) {
  const result = [...parts]
  while (result.length > target) {
    let mergeAt = 0
    for (let index = 1; index < result.length - 1; index += 1) {
      if (result[index].length < result[mergeAt].length) mergeAt = index
    }
    const left = mergeAt === result.length - 1 ? mergeAt - 1 : mergeAt
    result.splice(left, 2, result[left] + result[left + 1])
  }
  return result
}

function splitPhonicsWord(word, syllableCount) {
  if (syllableCount <= 1 || word.length <= 3) return [word]
  if (PHONICS_EXCEPTIONS[word]) return PHONICS_EXCEPTIONS[word]

  const prefix = PREFIXES.find(([item, count]) => word.startsWith(item) && word.length - item.length >= 3 && syllableCount > count)
  if (prefix) {
    const [opening, count] = prefix
    return [...splitPhonicsWord(opening, count), ...splitPhonicsWord(word.slice(opening.length), syllableCount - count)]
  }

  const suffix = SUFFIXES.find(([item, count]) => word.endsWith(item) && word.length - item.length >= 3 && syllableCount > count)
  if (suffix) {
    const [ending, count] = suffix
    return [...splitPhonicsWord(word.slice(0, -ending.length), syllableCount - count), ...fitSyllableCount(splitByNuclei(ending), count)]
  }

  return fitSyllableCount(splitByNuclei(word), syllableCount)
}

export function buildPhonicsCue(word, phone) {
  return word.split(/([\s-]+)/).map((part) => {
    if (/^[\s-]+$/.test(part)) return part
    const normalized = part.toLowerCase()
    const syllableCount = countPronouncedSyllables(phone) || vowelNuclei(normalized).length
    return splitPhonicsWord(normalized, syllableCount).join(' · ')
  }).join('')
}
