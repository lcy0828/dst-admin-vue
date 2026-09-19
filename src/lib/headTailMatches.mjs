// Search the original text so ^/$ retain their line boundaries. A zero-width
// match advances by one code point and the scan ends at the end of the input.
export function headTailMatches(content, headPattern, tailPattern) {
  const head = searchable(headPattern)
  const tail = searchable(tailPattern)
  const matches = []
  const unicode = head.unicode || head.unicodeSets
  while (head.lastIndex <= content.length) {
    const start = head.exec(content)
    if (!start) break
    tail.lastIndex = start.index + start[0].length
    const end = tail.exec(content)
    if (end) matches.push(content.slice(start.index, end.index + end[0].length))
    const width = unicode && content.codePointAt(start.index) > 0xffff ? 2 : 1
    head.lastIndex = start.index + width
  }
  return matches
}

function searchable(pattern) {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '') + 'g')
}
