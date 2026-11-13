// 챌린지보드 게임 4개 (보완 7). 결과는 배수로만 돌려주고, 돈 계산은 logic.js가 함
// rng: 0 이상 1 미만 숫자를 주는 함수 (테스트에서는 가짜를 넣음)
// 테스트: 10_Projects/challenge-board-dev/games.test.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChallengeGames = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var pick = function (n, rng) { return Math.min(n - 1, Math.floor(rng() * n)); };

  // 받는 돈: 건 돈 × 배수, 10원 단위로 내림
  function prize(bet, 배수) { return Math.floor(Math.round(bet * 배수 * 100) / 100 / 10) * 10; }

  // 1. 룰렛: 8칸. 평균 0.94배라 하면 할수록 조금 잃음
  var ROULETTE = [0, 0, 0, 0.5, 1, 1, 2, 3];
  function spin(rng) {
    var i = pick(ROULETTE.length, rng);
    return { 칸: i, 배수: ROULETTE[i] };
  }

  // 2. 가위바위보: 이기면 2배, 비기면 1배, 지면 0
  var HANDS = ['가위', '바위', '보'];
  function rps(me, rng) {
    var a = HANDS.indexOf(me);
    if (a < 0) throw new Error('가위·바위·보 중에 골라 주세요');
    var b = pick(3, rng);
    var 결과 = a === b ? '무' : (a - b + 3) % 3 === 1 ? '승' : '패';
    return { 컴퓨터: HANDS[b], 결과: 결과, 배수: 결과 === '승' ? 2 : 결과 === '무' ? 1 : 0 };
  }

  // 3. 업다운: 1~100, 6번 안에 맞히면 1.5배
  var UPDOWN_TRIES = 6, UPDOWN_WIN = 1.5;
  function newUpDown(rng) {
    return { 정답: pick(100, rng) + 1, 남은: UPDOWN_TRIES, 힌트: null, 끝: false, 배수: 0, 기록: [] };
  }
  function guessUpDown(g, n) {
    if (g.끝) throw new Error('끝난 게임이에요');
    n = Number(n);
    if (!(n >= 1 && n <= 100 && Math.floor(n) === n)) throw new Error('1~100 사이 정수를 적어 주세요');
    var 힌트 = n === g.정답 ? '정답' : n < g.정답 ? '업' : '다운';
    var 남은 = g.남은 - 1;
    var 끝 = 힌트 === '정답' || 남은 === 0;
    return { 정답: g.정답, 남은: 남은, 힌트: 힌트, 끝: 끝, 배수: 힌트 === '정답' ? UPDOWN_WIN : 0, 기록: g.기록.concat([n + ' ' + 힌트]) };
  }

  // 4. 카드 높낮이: 1~13. 다음 카드가 더 높을지 낮을지. 맞히면 ×1.3, 같거나 틀리면 0. 중간에 받기
  var HL_STEP = 1.3;
  function newHighLow(rng) { return { 카드: pick(13, rng) + 1, 연속: 0, 배수: 1, 끝: false }; }
  function guessHighLow(g, 고름, rng) {
    if (g.끝) throw new Error('끝난 게임이에요');
    if (고름 !== '높다' && 고름 !== '낮다') throw new Error('높다·낮다 중에 골라 주세요');
    var next = pick(13, rng) + 1;
    var ok = 고름 === '높다' ? next > g.카드 : next < g.카드;
    if (!ok) return { 카드: next, 이전: g.카드, 연속: g.연속, 배수: 0, 끝: true };
    return { 카드: next, 이전: g.카드, 연속: g.연속 + 1, 배수: Math.round(g.배수 * HL_STEP * 100) / 100, 끝: false };
  }
  function cashOut(g) {
    if (g.끝) throw new Error('끝난 게임이에요');
    if (g.연속 < 1) throw new Error('한 번은 맞혀야 받을 수 있어요');
    return { 카드: g.카드, 연속: g.연속, 배수: g.배수, 끝: true };
  }

  return {
    prize: prize, ROULETTE: ROULETTE, spin: spin, HANDS: HANDS, rps: rps,
    UPDOWN_TRIES: UPDOWN_TRIES, UPDOWN_WIN: UPDOWN_WIN, newUpDown: newUpDown, guessUpDown: guessUpDown,
    HL_STEP: HL_STEP, newHighLow: newHighLow, guessHighLow: guessHighLow, cashOut: cashOut,
  };
});
