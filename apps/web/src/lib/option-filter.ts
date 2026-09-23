const baseLetters = new Map([
  ["á", "a"],
  ["č", "c"],
  ["ď", "d"],
  ["é", "e"],
  ["ě", "e"],
  ["í", "i"],
  ["ň", "n"],
  ["ó", "o"],
  ["ř", "r"],
  ["š", "s"],
  ["ť", "t"],
  ["ú", "u"],
  ["ů", "u"],
  ["ý", "y"],
  ["ž", "z"],
]);

const isWordSeparator = (char: string) => char === " " || char === "-";

const matchesChar = ({ typed, actual }: { typed: string; actual: string }) =>
  typed === actual || typed === baseLetters.get(actual);

const matchesAt = ({ text, typed, start }: { text: string; typed: string; start: number }) => {
  let offset = 0;
  while (
    offset < typed.length &&
    matchesChar({ typed: typed.charAt(offset), actual: text.charAt(start + offset) })
  )
    offset++;
  const matches = offset === typed.length;

  return matches;
};

export const matchesWordStart = ({ label, query }: { label: string; query: string }) => {
  const text = label.toLowerCase();
  const typed = query.trim().toLowerCase();
  let matches = false;
  for (let start = 0; start < text.length && !matches; start++) {
    const isWordStart = start === 0 || isWordSeparator(text.charAt(start - 1));
    matches = isWordStart && matchesAt({ text, typed, start });
  }

  return matches;
};
