// 챌린지보드 계산 (브라우저와 Node 테스트에서 같이 씀)
// 테스트: 10_Projects/challenge-board-dev/logic.test.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChallengeLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // 매일 목표와 금액 (2026-11-13 R5·R6)
  var GOALS = [
    { key: '영양제', label: '영양제 아침·저녁', money: 1000 },
    { key: '운동', label: '운동 30분', minutes: 30, field: '운동_분', money: 2000 },
    { key: '공부', label: '코드·AI 공부 60분', minutes: 60, field: '공부_분', money: 3000 },
  ];

  function isBlank(v) { return v === undefined || v === null || v === ''; }

  function judgeSupplements(am, pm) {
    if (am === false || pm === false) return false;
    if (am === true && pm === true) return true;
    return null;
  }

  // 하루 기록 → 목표별 달성 (true / false / null=기록 없음)
  function judgeDay(rec) {
    rec = rec || {};
    var out = { 영양제: judgeSupplements(rec.영양제_아침, rec.영양제_저녁) };
    GOALS.forEach(function (g) {
      if (g.field) out[g.key] = isBlank(rec[g.field]) ? null : Number(rec[g.field]) >= g.minutes;
    });
    return out;
  }

  // 그날 모은 돈: 달성한 목표 금액의 합. 지원 건수는 돈 없음 (R7)
  function dayMoney(rec) {
    var j = judgeDay(rec);
    return GOALS.reduce(function (sum, g) { return sum + (j[g.key] === true ? g.money : 0); }, 0);
  }

  // ── 날짜: 'YYYY-MM-DD' 글자로 다룸. 시간대 문제를 피하려고 UTC로 계산 ──
  function toUTC(d) { return new Date(d + 'T00:00:00Z'); }
  function fmt(dt) { return dt.toISOString().slice(0, 10); }

  function isDate(d) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    var dt = toUTC(d);
    return !isNaN(dt) && fmt(dt) === d; // 2026-02-30 같은 없는 날짜는 거름
  }

  function addDays(d, n) {
    var dt = toUTC(d);
    dt.setUTCDate(dt.getUTCDate() + n);
    return fmt(dt);
  }

  // 이번 주 시작 = 월요일 (R13)
  function weekStart(d) {
    var dow = toUTC(d).getUTCDay(); // 0=일 … 6=토
    return addDays(d, dow === 0 ? -6 : 1 - dow);
  }

  function monthOf(d) { return d.slice(0, 7); }

  // ── 미션: 완료형·횟수형. 추가할 때 금액을 정하고 완료하면 그 금액 (R8·R9) ──
  var TYPES = ['완료형', '횟수형'];

  function newMission(input, id) {
    var 이름 = String(input.이름 || '').trim();
    if (!이름) throw new Error('미션 이름을 적어 주세요');
    if (TYPES.indexOf(input.종류) < 0) throw new Error('종류는 완료형 또는 횟수형이에요');
    if (!isDate(input.시작일)) throw new Error('시작일 날짜를 확인해 주세요');
    if (!isBlank(input.마감일) && !isDate(input.마감일)) throw new Error('마감일 날짜를 확인해 주세요');
    var 금액 = Number(input.금액);
    if (!(금액 >= 0) || Math.floor(금액) !== 금액) throw new Error('금액은 0 이상의 정수예요');
    var isCount = input.종류 === '횟수형';
    var 목표 = Number(input.목표_횟수);
    if (isCount && !(목표 >= 1 && Math.floor(목표) === 목표)) throw new Error('횟수형은 목표 횟수(1 이상)가 필요해요');
    return {
      id: id, 이름: 이름, 종류: input.종류, 상태: '진행 중',
      시작일: input.시작일, 마감일: isBlank(input.마감일) ? null : input.마감일,
      목표_횟수: isCount ? 목표 : null, 현재_횟수: isCount ? 0 : null,
      금액: 금액, 완료일: null, 기록: [],
    };
  }

  function copy(m) {
    var out = {};
    for (var k in m) out[k] = m[k];
    out.기록 = (m.기록 || []).slice();
    return out;
  }

  function finish(m, 상태, date) {
    if (m.상태 !== '진행 중') throw new Error('이미 끝난 미션이에요 (' + m.상태 + ')');
    var out = copy(m);
    out.상태 = 상태;
    out.완료일 = date;
    return out;
  }

  // 진행 추가: 횟수형은 n만큼, 다 채우면 완료. 완료형은 done이면 완료
  function addProgress(m, p) {
    if (m.상태 !== '진행 중') throw new Error('이미 끝난 미션이에요 (' + m.상태 + ')');
    if (!isDate(p.date)) throw new Error('날짜를 확인해 주세요');
    var out = copy(m);
    var entry = { date: p.date };
    if (out.종류 === '횟수형') {
      var n = p.n === undefined ? 1 : Number(p.n);
      if (!(n >= 1)) throw new Error('횟수는 1 이상이에요');
      out.현재_횟수 += n;
      entry.n = n;
    } else {
      entry.done = p.done === true;
    }
    if (p.memo) entry.memo = p.memo;
    out.기록.push(entry);
    var complete = out.종류 === '횟수형' ? out.현재_횟수 >= out.목표_횟수 : p.done === true;
    return complete ? finish(out, '완료', p.date) : out;
  }

  function giveUp(m, date) { return finish(m, '포기', date); }

  function missionMoney(m) { return m.상태 === '완료' ? m.금액 : 0; }

  // ── 저장 형식: 브라우저에 { version, days: {날짜: 기록}, missions: [] } 로 저장 (R2) ──
  var FIELDS = {
    영양제_아침: 'bool', 영양제_저녁: 'bool',
    운동_분: 'int', 운동_내용: 'text',
    공부_분: 'int', 공부_내용: 'text',
    지원_건수: 'int',
  };

  function emptyState() { return { version: 1, days: {}, missions: [] }; }

  function parseState(text) {
    if (!text) return emptyState();
    try {
      var s = JSON.parse(text);
      return {
        version: 1,
        days: s && typeof s.days === 'object' && s.days ? s.days : {},
        missions: s && Array.isArray(s.missions) ? s.missions : [],
      };
    } catch (e) {
      return emptyState();
    }
  }

  // 하루 기록 넣기·고치기: 그날 기록을 통째로 바꿈. 빈 칸은 저장하지 않고, 다 비면 그날을 지움 (R17)
  function setDay(state, date, rec) {
    if (!isDate(date)) throw new Error('날짜를 확인해 주세요: ' + date);
    var clean = {};
    Object.keys(rec || {}).forEach(function (k) {
      var type = FIELDS[k];
      if (!type) throw new Error('모르는 항목이에요: ' + k);
      var v = rec[k];
      if (isBlank(v)) return;
      if (type === 'int') {
        var n = Number(v);
        if (isNaN(n) || n < 0) throw new Error(k + '는 0 이상이어야 해요');
        if (Math.floor(n) !== n) throw new Error(k + '는 정수로 적어 주세요');
        clean[k] = n;
      } else if (type === 'bool') {
        clean[k] = v === true;
      } else {
        clean[k] = String(v).trim();
        if (!clean[k]) delete clean[k];
      }
    });
    var days = {};
    Object.keys(state.days).forEach(function (d) { days[d] = state.days[d]; });
    if (Object.keys(clean).length) days[date] = clean;
    else delete days[date];
    return { version: 1, days: days, missions: state.missions };
  }

  // ── 미션 목록을 기록에 넣고 고치기 ──
  function withMissions(state, missions) {
    return { version: 1, days: state.days, missions: missions };
  }

  function addMission(state, input) {
    var max = state.missions.reduce(function (n, m) {
      var k = Number(String(m.id).replace(/^m/, ''));
      return isNaN(k) ? n : Math.max(n, k);
    }, 0);
    return withMissions(state, state.missions.concat([newMission(input, 'm' + (max + 1))]));
  }

  function updateMission(state, id, fn) {
    var found = false;
    var list = state.missions.map(function (m) {
      if (m.id !== id) return m;
      found = true;
      return fn(m);
    });
    if (!found) throw new Error('미션을 찾을 수 없어요: ' + id);
    return withMissions(state, list);
  }

  function progressMission(state, id, p) {
    return updateMission(state, id, function (m) { return addProgress(m, p); });
  }

  function giveUpMission(state, id, date) {
    return updateMission(state, id, function (m) { return giveUp(m, date); });
  }

  // ── 집계: 이번 주(월요일 시작)·이번 달·전체 (R11). 미션 돈은 완료일 기준 ──
  function num(v) { return isBlank(v) ? 0 : Number(v) || 0; }

  function total(state, inRange) {
    var s = { 운동_분: 0, 공부_분: 0, 지원_건수: 0, 돈: 0 };
    var days = state.days || {};
    Object.keys(days).forEach(function (d) {
      if (!inRange(d)) return;
      var r = days[d];
      s.운동_분 += num(r.운동_분);
      s.공부_분 += num(r.공부_분);
      s.지원_건수 += num(r.지원_건수);
      s.돈 += dayMoney(r);
    });
    (state.missions || []).forEach(function (m) {
      if (m.상태 === '완료' && inRange(m.완료일)) s.돈 += missionMoney(m);
    });
    return s;
  }

  function summarize(state, today) {
    var w0 = weekStart(today), w1 = addDays(w0, 6), mon = monthOf(today);
    return {
      이번주: total(state, function (d) { return d >= w0 && d <= w1; }),
      이번달: total(state, function (d) { return monthOf(d) === mon; }),
      전체: total(state, function () { return true; }),
    };
  }

  return {
    GOALS: GOALS, judgeDay: judgeDay, dayMoney: dayMoney,
    isDate: isDate, addDays: addDays, weekStart: weekStart, monthOf: monthOf,
    newMission: newMission, addProgress: addProgress, giveUp: giveUp, missionMoney: missionMoney,
    summarize: summarize,
    FIELDS: FIELDS, parseState: parseState, setDay: setDay,
    addMission: addMission, progressMission: progressMission, giveUpMission: giveUpMission,
  };
});
