/* Salary Engine · local-calendar income visualization. Original implementation. */
(function (root) {
  'use strict';

  const defaults = {
    salary: 15000,
    calendar: 'cn',
    weekDays: [1, 2, 3, 4, 5],
    intervals: [['09:00', '12:00'], ['13:30', '18:00']],
    overrides: {},
    overtimeRecords: {},
    overtimeSession: null,
    extraPay: 0,
    estimatedOvertime: 0,
    configured: false
  };
  const holidayYears = {
    2025: {
      ranges: [
        ['2025-01-01', '2025-01-01', '元旦'],
        ['2025-01-28', '2025-02-04', '春节'],
        ['2025-04-04', '2025-04-06', '清明节'],
        ['2025-05-01', '2025-05-05', '劳动节'],
        ['2025-05-31', '2025-06-02', '端午节'],
        ['2025-10-01', '2025-10-08', '国庆 / 中秋']
      ],
      work: ['2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11'],
      source: 'https://www.hys.gov.cn/hysrmzfw/c116484/zzzq/content/content_1856502837087371264.html'
    },
    2026: {
      ranges: [
        ['2026-01-01', '2026-01-03', '元旦'],
        ['2026-02-15', '2026-02-23', '春节'],
        ['2026-04-04', '2026-04-06', '清明节'],
        ['2026-05-01', '2026-05-05', '劳动节'],
        ['2026-06-19', '2026-06-21', '端午节'],
        ['2026-09-25', '2026-09-27', '中秋节'],
        ['2026-10-01', '2026-10-07', '国庆节']
      ],
      work: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'],
      source: 'https://www.beijing.gov.cn/zhengce/zhengcefagui/202511/t20251104_4258873.html'
    }
  };
  const clamp = (number, low, high) => Math.max(low, Math.min(high, number));
  const pad = number => String(number).padStart(2, '0');
  const finite = (number, fallback = 0) => Number.isFinite(Number(number)) ? Number(number) : fallback;
  const safeRatio = (a, b) => b > 0 ? a / b : 0;

  function validDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new TypeError('需要有效的日期。');
    return date;
  }

  function dateKey(value) {
    const date = validDate(value);
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function readConfig(config) {
    const source = config || {};
    return {
      ...defaults,
      ...source,
      weekDays: Array.isArray(source.weekDays) ? source.weekDays : defaults.weekDays,
      intervals: Array.isArray(source.intervals) ? source.intervals : defaults.intervals,
      overrides: source.overrides && typeof source.overrides === 'object' ? source.overrides : {},
      overtimeRecords: source.overtimeRecords && typeof source.overtimeRecords === 'object' ? source.overtimeRecords : {}
    };
  }

  function timeMinutes(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return NaN;
    const [hour, minute] = value.split(':').map(Number);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? hour * 60 + minute : NaN;
  }

  function intervalsInMinutes(config) {
    return readConfig(config).intervals
      .filter(pair => Array.isArray(pair) && pair.length >= 2)
      .map(pair => [timeMinutes(pair[0]), timeMinutes(pair[1])])
      .filter(pair => Number.isFinite(pair[0]) && Number.isFinite(pair[1]) && pair[1] > pair[0])
      .sort((a, b) => a[0] - b[0]);
  }

  function standardDaySeconds(config) {
    return intervalsInMinutes(config).reduce((seconds, pair) => seconds + (pair[1] - pair[0]) * 60, 0);
  }

  function validateConfig(config) {
    const cfg = readConfig(config);
    const errors = [];
    if (!Number.isFinite(Number(cfg.salary)) || Number(cfg.salary) <= 0 || Number(cfg.salary) > 1e9) {
      errors.push('月薪需大于 0，且不超过 10 亿元。');
    }
    if (!['cn', 'weekdays', 'custom'].includes(cfg.calendar)) errors.push('请选择有效的工作日规则。');
    if (!Array.isArray(cfg.weekDays) || cfg.weekDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      errors.push('每周工作日需为星期日到星期六中的有效日期。');
    }
    if (!Array.isArray(cfg.intervals) || cfg.intervals.length === 0 || cfg.intervals.length > 12) {
      errors.push('请设置 1 至 12 个工作时段。');
    } else {
      let previousEnd = -1;
      let total = 0;
      for (const pair of cfg.intervals) {
        if (!Array.isArray(pair) || pair.length !== 2) {
          errors.push('每个工作时段都需要开始和结束时间。');
          break;
        }
        const start = timeMinutes(pair[0]);
        const end = timeMinutes(pair[1]);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          errors.push('工作时段的结束时间需晚于开始时间，且在同一天内。');
          break;
        }
        if (start < previousEnd) {
          errors.push('工作时段请按时间先后排列，且不能重叠。');
          break;
        }
        total += end - start;
        previousEnd = end;
      }
      if (total <= 0 || total >= 24 * 60) errors.push('每日工作时长需大于 0 且小于 24 小时。');
    }
    return {valid: errors.length === 0, errors: [...new Set(errors)]};
  }

  function dayInfo(value, config) {
    const date = validDate(value);
    const cfg = readConfig(config);
    const key = dateKey(date);
    if (cfg.overrides[key] === 'work') return {work: true, kind: 'override', name: '自定上班'};
    if (cfg.overrides[key] === 'rest') return {work: false, kind: 'override', name: '自定休息'};
    if (cfg.calendar === 'cn' && holidayYears[date.getFullYear()]) {
      const data = holidayYears[date.getFullYear()];
      if (data.work.includes(key)) return {work: true, kind: 'makeup', name: '调休上班'};
      const holiday = data.ranges.find(range => key >= range[0] && key <= range[1]);
      if (holiday) return {work: false, kind: 'holiday', name: holiday[2]};
    }
    const activeDays = cfg.calendar === 'custom' ? cfg.weekDays : defaults.weekDays;
    const work = activeDays.includes(date.getDay());
    return {work, kind: work ? 'work' : 'weekend', name: work ? '工作日' : '休息日'};
  }

  function monthInfo(value, config) {
    const date = validDate(value);
    const cfg = readConfig(config);
    const year = date.getFullYear();
    const month = date.getMonth();
    let workdays = 0;
    let elapsedWorkdays = 0;
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      if (dayInfo(new Date(year, month, day, 12), cfg).work) {
        workdays++;
        if (day < date.getDate()) elapsedWorkdays++;
      }
    }
    const daySeconds = standardDaySeconds(cfg);
    const plannedHours = workdays * daySeconds / 3600;
    const salary = Math.max(0, finite(cfg.salary));
    const daySalary = safeRatio(salary, workdays);
    const hourSalary = safeRatio(salary, plannedHours);
    return {
      workdays,
      plannedHours,
      daySalary,
      hourSalary,
      secondSalary: hourSalary / 3600,
      elapsedWorkdays,
      standardDaySeconds: daySeconds,
      hoursPerDay: daySeconds / 3600,
      calendarKnown: cfg.calendar !== 'cn' || Boolean(holidayYears[year])
    };
  }

  function dayIntervals(value, config) {
    const date = validDate(value);
    return intervalsInMinutes(config).map(pair => pair.map(minutes =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60).getTime()
    ));
  }

  function overlapSeconds(aStart, aEnd, bStart, bEnd) {
    return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / 1000;
  }

  // Split a timer by local dates, counting only time outside scheduled paid intervals.
  function overtimeSegments(start, end, config) {
    start = finite(start);
    end = finite(end);
    if (!(start > 0) || end <= start) return {};
    const cfg = readConfig(config);
    const first = new Date(start);
    let day = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    const result = {};
    while (day.getTime() < end) {
      const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      const from = Math.max(start, day.getTime());
      const to = Math.min(end, next.getTime());
      let seconds = Math.max(0, to - from) / 1000;
      if (dayInfo(day, cfg).work) {
        for (const [paidStart, paidEnd] of dayIntervals(day, cfg)) {
          seconds -= overlapSeconds(from, to, paidStart, paidEnd);
        }
      }
      if (seconds > 0) result[dateKey(day)] = seconds / 3600;
      day = next;
    }
    return result;
  }

  function nextWorkStart(value, config) {
    const date = validDate(value);
    const intervals = intervalsInMinutes(config);
    if (!intervals.length) return null;
    // A full year also finds sparse explicit calendar overrides.
    for (let offset = 1; offset <= 370; offset++) {
      const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
      if (dayInfo(candidate, config).work) return dayIntervals(candidate, config)[0][0];
    }
    return null;
  }

  function snapshot(value, config) {
    const date = validDate(value);
    const cfg = readConfig(config);
    const now = date.getTime();
    const key = dateKey(date);
    const info = dayInfo(date, cfg);
    const month = monthInfo(date, cfg);
    const intervals = dayIntervals(date, cfg);
    // Real elapsed seconds between today's interval timestamps — stays correct
    // across DST shifts, unlike the wall-clock month.standardDaySeconds.
    const daySeconds = intervals.reduce((sum, pair) => sum + (pair[1] - pair[0]) / 1000, 0);
    const workSecondsToday = info.work ? daySeconds : 0;
    let elapsedSecondsToday = 0;
    let status = 'off';
    let nextBoundary = null;
    let untilClockOutSeconds = 0;

    if (info.work && intervals.length) {
      for (const [start, end] of intervals) {
        elapsedSecondsToday += clamp((now - start) / 1000, 0, (end - start) / 1000);
      }
      elapsedSecondsToday = clamp(elapsedSecondsToday, 0, workSecondsToday);
      const firstStart = intervals[0][0];
      const lastEnd = intervals[intervals.length - 1][1];
      untilClockOutSeconds = Math.max(0, lastEnd - now) / 1000;
      if (now < firstStart) {
        status = 'before';
        nextBoundary = firstStart;
      } else if (now >= lastEnd) {
        status = 'finished';
        nextBoundary = nextWorkStart(date, cfg);
      } else {
        const active = intervals.find(([start, end]) => now >= start && now < end);
        if (active) {
          status = 'working';
          nextBoundary = active[1];
        } else {
          status = 'break';
          nextBoundary = intervals.find(([start]) => start > now)[0];
        }
      }
    } else {
      nextBoundary = nextWorkStart(date, cfg);
    }

    const salary = Math.max(0, finite(cfg.salary));
    const todayEarned = Math.min(month.daySalary, elapsedSecondsToday * month.secondSalary);
    const monthEarned = clamp(month.elapsedWorkdays * month.daySalary + todayEarned, 0, salary);
    const monthPrefix = key.slice(0, 7) + '-';
    let dayOvertimeHours = Math.max(0, finite(cfg.overtimeRecords[key]));
    let monthOvertimeHours = 0;
    for (const recordKey of Object.keys(cfg.overtimeRecords)) {
      if (recordKey.startsWith(monthPrefix) && recordKey <= key) {
        monthOvertimeHours += Math.max(0, finite(cfg.overtimeRecords[recordKey]));
      }
    }
    const session = cfg.overtimeSession;
    if (session && Number.isFinite(Number(session.start)) && Number(session.start) < now) {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const active = overtimeSegments(Math.max(Number(session.start), monthStart), now, cfg);
      dayOvertimeHours += active[key] || 0;
      monthOvertimeHours += Object.values(active).reduce((sum, hours) => sum + hours, 0);
    }
    const actualHourSalary = month.workdays ? safeRatio(salary, month.plannedHours + monthOvertimeHours) : 0;
    const actualDayHourSalary = info.work
      ? safeRatio(month.daySalary, daySeconds / 3600 + dayOvertimeHours)
      : 0;
    const statusLabels = {
      working: '正在入账', break: '休息时间', before: '还未开工', finished: '今日已收工', off: info.name
    };
    return {
      dayKey: key,
      isWorkday: info.work,
      dayInfo: info,
      workSecondsToday,
      elapsedSecondsToday,
      progress: safeRatio(elapsedSecondsToday, workSecondsToday),
      daySalary: month.daySalary,
      hourSalary: month.hourSalary,
      secondSalary: month.secondSalary,
      todayEarned,
      monthEarned,
      monthProgress: safeRatio(monthEarned, salary),
      status,
      untilSeconds: nextBoundary === null ? 0 : Math.max(0, nextBoundary - now) / 1000,
      statusLabel: statusLabels[status],
      monthOvertimeHours,
      dayOvertimeHours,
      actualHourSalary,
      actualDayHourSalary,
      dilutionPercent: month.hourSalary > 0 ? (1 - actualHourSalary / month.hourSalary) * 100 : 0,
      workdays: month.workdays,
      plannedHours: month.plannedHours,
      monthPlannedSeconds: month.plannedHours * 3600,
      nextBoundary,
      workedSecondsMonth: month.elapsedWorkdays * daySeconds + elapsedSecondsToday,
      standardDaySeconds: daySeconds,
      hoursPerDay: daySeconds / 3600,
      remainingWorkSeconds: Math.max(0, workSecondsToday - elapsedSecondsToday),
      untilClockOutSeconds,
      calendarKnown: month.calendarKnown,
      elapsedWorkdays: month.elapsedWorkdays
    };
  }

  // What-if inputs are additional hours and additional pay PER WORKDAY.
  function overtimeScenario(config, value, hours, extraPay = 0) {
    const month = monthInfo(value, config);
    const overtime = Math.max(0, finite(hours));
    const pay = Math.max(0, finite(extraPay));
    const totalHours = month.hoursPerDay + overtime;
    const actualHourly = month.workdays ? safeRatio(month.daySalary + pay, totalHours) : 0;
    return {
      baseHourly: month.hourSalary,
      actualHourly,
      lossPercent: month.hourSalary ? (1 - actualHourly / month.hourSalary) * 100 : 0,
      totalHours,
      extraPay: pay,
      overtimeHours: overtime,
      hoursPerDay: month.hoursPerDay,
      daySalary: month.daySalary
    };
  }

  root.SalaryEngine = {
    defaults, holidayYears, dateKey, daysInMonth, dayInfo, monthInfo, snapshot,
    overtimeScenario, overtimeSegments, validateConfig, timeMinutes, standardDaySeconds
  };
})(typeof window !== 'undefined' ? window : globalThis);
