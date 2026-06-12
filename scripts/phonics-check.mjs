import { buildPhonicsCue } from '../src/phonics.js'

const examples = [
  ['would', 'wəd, wʊd', 'would'],
  ['through', 'θruː', 'through'],
  ['teacher', 'ˈtiːtʃə(r)', 'teach · er'],
  ['reading', 'ˈriːdɪŋ', 'read · ing'],
  ['beautiful', 'ˈbjuːtɪf(ə)l', 'beau · ti · ful'],
  ['computer', 'kəmˈpjuːtə(r)', 'com · pu · ter'],
  ['important', 'ɪmˈpɔːt(ə)nt', 'im · por · tant'],
  ['education', 'ˌedʒuˈkeɪʃ(ə)n', 'e · du · ca · tion'],
  ['station', 'ˈsteɪʃ(ə)n', 'sta · tion'],
  ['people', 'ˈpiːp(ə)l', 'peo · ple'],
  ['apple', 'ˈæp(ə)l', 'ap · ple'],
]

let failed = 0
for (const [word, phone, expected] of examples) {
  const actual = buildPhonicsCue(word, phone)
  const pass = actual === expected
  console.log(`${pass ? 'OK' : 'FAIL'}  ${word.padEnd(12)} ${actual}`)
  if (!pass) failed += 1
}
if (failed) process.exit(1)
