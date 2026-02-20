function getPairKey(userA, userB) {
  const [a, b] = [String(userA), String(userB)].sort();
  return `${a}:${b}`;
}

module.exports = { getPairKey };
