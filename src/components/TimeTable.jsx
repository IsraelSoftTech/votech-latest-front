import React, { useEffect, useMemo, useRef, useState } from 'react';
import SideTop from './SideTop';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
import TimeTableReport from './TimeTableReport.jsx';

export default function TimeTable() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());

  const [daysConfig, setDaysConfig] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false });
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = dayOrder.filter(d => daysConfig[d]);

  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [periodDurationMin, setPeriodDurationMin] = useState(45);
  const [breakDurationMin, setBreakDurationMin] = useState(30);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [breakIndexes, setBreakIndexes] = useState(new Set());

  // Per-class, per-subject requirements and teacher assignments
  // classPlans[classId] = { [subjectId]: { weeklyPeriods: number, preferred: number[] (1-based), teacherIds: string[] } }
  const [classPlans, setClassPlans] = useState({});

  // Generated timetables
  // timetables[classId] = Slot[days][periods]
  const [timetables, setTimetables] = useState({});

  const printRef = useRef(null);
  const reportRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [cls, subs, savedSettings, savedAll] = await Promise.all([
          api.getClasses().catch(() => []),
          api.getSubjects().catch(() => []),
          api.getTimetableSettings().catch(() => null),
          api.getAllTimetables().catch(() => []),
        ]);
        const clsList = Array.isArray(cls) ? cls : (cls?.data || []);
        const subList = Array.isArray(subs) ? subs : (subs?.data || []);
        setClasses(clsList);
        setSubjects(subList);

        // Load users (fallback chain)
        let allUsers = [];
        try { allUsers = await api.getAllUsersForChat(); } catch (_) {}
        if (!Array.isArray(allUsers) || allUsers.length === 0) {
          try { allUsers = await api.getUsers(); } catch (_) {}
        }
        setUsers(Array.isArray(allUsers) ? allUsers : []);

        // apply saved settings
        if (savedSettings) {
          const { days, periodsPerDay: spd, periodDurationMin: pdm, breakDurationMin: bdm, startTime: st, endTime: et, breakIndexes: bIdx, classPlans: cp, selectedClassIds: sids } = savedSettings || {};
          if (days && typeof days === 'object') setDaysConfig(prev => ({ ...prev, ...days }));
          if (spd) setPeriodsPerDay(spd);
          if (pdm) setPeriodDurationMin(pdm);
          if (bdm) setBreakDurationMin(bdm);
          if (st) setStartTime(st);
          if (et) setEndTime(et);
          if (Array.isArray(bIdx)) setBreakIndexes(new Set(bIdx));
          if (cp && typeof cp === 'object') setClassPlans(cp);
          if (Array.isArray(sids)) setSelectedClassIds(new Set(sids));
        }

        // apply persisted timetables
        if (Array.isArray(savedAll) && savedAll.length > 0) {
          const mapped = {};
          savedAll.forEach(row => {
            if (row.class_id && row.data) mapped[row.class_id] = Array.isArray(row.data.grid) ? row.data.grid : row.data;
          });
          if (Object.keys(mapped).length > 0) setTimetables(mapped);
        }
      } catch (e) {
        console.error('Failed to load timetable data', e);
      }
    };
    load();
  }, []);

  const toggleClassSelected = (classId) => {
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  const upsertPlan = (classId, subjectId, updates) => {
    setClassPlans(prev => {
      const current = prev[classId] ? { ...prev[classId] } : {};
      const existing = current[subjectId] || { weeklyPeriods: 2, preferred: [], teacherIds: [] };
      current[subjectId] = { ...existing, ...updates };
      return { ...prev, [classId]: current };
    });
  };

  const toggleTeacherFor = (classId, subjectId, teacherId) => {
    setClassPlans(prev => {
      const current = prev[classId] ? { ...prev[classId] } : {};
      const existing = current[subjectId] || { weeklyPeriods: 2, preferred: [], teacherIds: [] };
      const set = new Set(existing.teacherIds || []);
      if (set.has(teacherId)) set.delete(teacherId); else set.add(teacherId);
      current[subjectId] = { ...existing, teacherIds: Array.from(set) };
      return { ...prev, [classId]: current };
    });
  };

  const togglePreferredIndex = (classId, subjectId, idx1) => {
    setClassPlans(prev => {
      const current = prev[classId] ? { ...prev[classId] } : {};
      const existing = current[subjectId] || { weeklyPeriods: 2, preferred: [], teacherIds: [] };
      const set = new Set(existing.preferred || []);
      if (set.has(idx1)) set.delete(idx1); else set.add(idx1);
      current[subjectId] = { ...existing, preferred: Array.from(set).sort((a,b)=>a-b) };
      return { ...prev, [classId]: current };
    });
  };

  const buildEmptyGrid = (numDays, periods) => Array.from({ length: numDays }, () => Array.from({ length: periods }, () => null));

  const parseTimeToMinutes = (hhmm) => {
    const [h, m] = (hhmm || '08:00').split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const minutesToHHMM = (total) => {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };
  const getPeriodStartLabel = (pIndex) => {
    let t = parseTimeToMinutes(startTime);
    for (let i = 0; i < pIndex; i += 1) {
      const idx1 = i + 1;
      if (breakIndexes.has(idx1)) t += breakDurationMin; else t += periodDurationMin;
    }
    return minutesToHHMM(t);
  };

  const handleGenerate = () => {
    const selected = classes.filter(c => selectedClassIds.has(c.id));
    if (selected.length === 0) return;

    const numDays = days.length;
    const periods = periodsPerDay;
    const teacherBusy = {}; // teacherBusy[teacherId][day][period] = true
    const nextTables = {};

    const ensureTeacherBusy = (teacherId) => {
      const key = String(teacherId);
      if (!teacherBusy[key]) teacherBusy[key] = Array.from({ length: numDays }, () => Array.from({ length: periods }, () => false));
      return teacherBusy[key];
    };

    selected.forEach(cls => {
      const plan = classPlans[cls.id] || {};
      const grid = buildEmptyGrid(numDays, periods);
      // mark breaks
      breakIndexes.forEach(idx1 => {
        const p = idx1 - 1;
        if (p >= 0 && p < periods) for (let d = 0; d < numDays; d += 1) grid[d][p] = { isBreak: true };
      });

      const subjectIds = Object.keys(plan).map(Number);
      subjectIds.forEach(sid => {
        const { weeklyPeriods, preferred = [], teacherIds = [] } = plan[sid] || {};
        const teachers = (teacherIds || []).map(String);
        let placed = 0;

        const periodOrder = [
          ...preferred.filter(v => v >= 1 && v <= periods),
          ...Array.from({ length: periods }, (_, i) => i + 1).filter(v => !preferred.includes(v)),
        ];

        outer: for (let w = 0; w < (Number(weeklyPeriods) || 0); w += 1) {
          for (let d = 0; d < numDays; d += 1) {
            for (const idx1 of periodOrder) {
              const p = idx1 - 1;
              if (grid[d][p]) continue; // occupied or break
              // find an available teacher
              for (const tid of teachers) {
                const busy = ensureTeacherBusy(tid);
                if (!busy[d][p]) {
                  grid[d][p] = { subjectId: sid, subjectName: getSubjectName(sid), teacherId: tid, teacherName: getUserName(tid) };
                  busy[d][p] = true;
                  placed += 1;
                  if (placed >= weeklyPeriods) continue outer;
                break;
      }
            }
            }
          }
        }
      });

      nextTables[cls.id] = grid;
    });

    setTimetables(nextTables);
    // persist generated timetables per class
    (async () => {
      try {
        const entries = Object.entries(nextTables);
        for (const [classId, grid] of entries) {
          await api.saveClassTimetable(classId, { grid });
        }
      } catch (e) {
        console.error('Persist generated timetables failed', e);
      }
    })();
  };

  const getUserName = (userId) => {
    const u = users.find(u => String(u.id) === String(userId));
    return u?.name || u?.username || `User ${userId}`;
  };
  const getSubjectName = (sid) => subjects.find(s => Number(s.id) === Number(sid))?.name || 'Subject';
  const getClassName = (cid) => classes.find(c => Number(c.id) === Number(cid))?.name || 'Class';

  const handleEditCell = (classId, dayIndex, periodIndex) => {
    const current = timetables[classId]?.[dayIndex]?.[periodIndex];
    if (current?.isBreak) return;
    const sid = window.prompt('Enter subject ID to assign (leave blank to clear):', current?.subjectId || '');
    if (sid === null) return;
    setTimetables(prev => {
      const next = { ...prev };
      const grid = (next[classId] || []).map(row => row.slice());
      if (!sid) {
        grid[dayIndex][periodIndex] = null;
      } else {
        const tid = window.prompt('Enter teacher ID for this subject:', current?.teacherId || '');
        grid[dayIndex][periodIndex] = {
          subjectId: Number(sid),
          subjectName: getSubjectName(Number(sid)),
          teacherId: tid,
          teacherName: getUserName(tid)
        };
      }
      next[classId] = grid;
      return next;
    });
  };

  const handleExport = async () => {
    try {
      // Save timetables to backend per class
      const entries = Object.entries(timetables);
      for (const [classId, grid] of entries) {
        await api.saveClassTimetable(classId, { grid });
      }
      // Download PDF via TimeTableReport (html2canvas/jsPDF)
      if (reportRef.current && typeof reportRef.current.downloadPDF === 'function') {
        await reportRef.current.downloadPDF();
      } else {
        window.print();
      }
    } catch (e) {
      console.error('Export failed', e);
      if (reportRef.current && typeof reportRef.current.downloadPDF === 'function') {
        await reportRef.current.downloadPDF();
      } else {
        window.print();
      }
  }
  };

  const handleSaveSettings = async () => {
    try {
      await api.saveTimetableSettings({
        days: dayOrder.reduce((acc, d) => (acc[d] = !!daysConfig[d], acc), {}),
        periodsPerDay,
        periodDurationMin,
        breakDurationMin,
        startTime,
        endTime,
        breakIndexes: Array.from(breakIndexes),
        classPlans,
        selectedClassIds: Array.from(selectedClassIds),
      });
      // persist teacher assignments derived from classPlans
      const assignments = [];
      Object.entries(classPlans || {}).forEach(([cid, subjMap]) => {
        Object.entries(subjMap || {}).forEach(([sid, cfg]) => {
          const weekly = Number(cfg?.weeklyPeriods) || 1;
          (cfg?.teacherIds || []).forEach(tid => {
            assignments.push({ teacher_id: Number(tid) || tid, class_id: Number(cid), subject_id: Number(sid), periods_per_week: weekly });
          });
        });
      });
      if (assignments.length > 0) {
        await api.saveTeacherAssignments(assignments);
      }
      setSuccessMessage('success');
    } catch (e) {
      console.error('Save settings failed', e);
      setSuccessMessage('failed');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all timetable settings and saved timetables?')) return;
    try {
      await Promise.all([
        api.deleteAllTimetables(),
        api.deleteTimetableSettings()
      ]);
      setSuccessMessage('success');
    } catch (e) {
      console.error('Delete all failed', e);
      setSuccessMessage('failed');
    }
  };

  const periodsArray = useMemo(() => Array.from({ length: periodsPerDay }, (_, i) => i + 1), [periodsPerDay]);

    return (
    <SideTop>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .tt-no-print { display: none !important; }
          .tt-print-page { page-break-after: always; }
        }
        .tt-container { padding: 16px; display: grid; gap: 16px; }
        .tt-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
        .tt-panel-header { padding: 12px 16px; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
        .tt-panel-body { padding: 12px 16px; }
        .tt-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .tt-grid th, .tt-grid td { border: 1px solid #e5e7eb; padding: 6px; font-size: 12px; }
        .tt-break { background: #f3f4f6; text-align: center; font-weight: 600; }
        .tt-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 8px; }
        .tt-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #e5e7eb; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
        .tt-chip input { margin: 0; }
        .tt-controls input, .tt-controls select { padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; }
        .tt-btn { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
        .tt-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .tt-flex { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 900px) { .tt-flex { grid-template-columns: 1.1fr 1fr; } }
        .tt-assignment { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; margin-bottom: 8px; }
        .tt-scroll { overflow: auto; }
      `}</style>

      <div className="tt-container" ref={printRef}>
        <div className="tt-flex">
          <div className="tt-panel">
            <div className="tt-panel-header">Classes to Generate</div>
            <div className="tt-panel-body tt-scroll" style={{ maxHeight: 320 }}>
              <div className="tt-row" style={{ gap: 8 }}>
                {classes.map(c => (
                  <label key={c.id} className="tt-chip">
                    <input type="checkbox" checked={selectedClassIds.has(c.id)} onChange={() => toggleClassSelected(c.id)} /> {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="tt-panel">
            <div className="tt-panel-header">General Settings</div>
            <div className="tt-panel-body tt-controls">
        {successMessage && (
                <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />
              )}
              <div className="tt-row">
                {dayOrder.map(d => (
                  <label key={d} className="tt-chip">
                    <input type="checkbox" checked={!!daysConfig[d]} onChange={() => setDaysConfig(prev => ({ ...prev, [d]: !prev[d] }))} /> {d}
                  </label>
                ))}
          </div>
              <div className="tt-row">
                <label>Periods/day
            <input type="number" min={1} max={12} value={periodsPerDay} onChange={e => setPeriodsPerDay(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
                </label>
                <label>Period duration (min)
            <input type="number" min={20} max={120} value={periodDurationMin} onChange={e => setPeriodDurationMin(Math.max(20, Math.min(120, Number(e.target.value) || 45)))} />
                </label>
                <label>Break duration (min)
                  <input type="number" min={5} max={120} value={breakDurationMin} onChange={e => setBreakDurationMin(Math.max(5, Math.min(120, Number(e.target.value) || 30)))} />
                </label>
          </div>
              <div className="tt-row">
                <label>Start time <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></label>
                <label>End time <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
              </div>
              <div className="tt-row">
                <div>Break periods:</div>
                {periodsArray.map(idx1 => (
                  <label key={idx1} className="tt-chip">
                    <input type="checkbox" checked={breakIndexes.has(idx1)} onChange={() => setBreakIndexes(prev => { const n = new Set(prev); n.has(idx1) ? n.delete(idx1) : n.add(idx1); return n; })} /> P{idx1}
                </label>
              ))}
            </div>
              <div className="tt-row">
                <button className="tt-btn" onClick={() => setTimetables({})}>Clear Generated</button>
                <button className="tt-btn primary tt-no-print" onClick={handleGenerate}>Generate Timetables</button>
                <button className="tt-btn tt-no-print" onClick={handleExport}>Download PDF</button>
                <button className="tt-btn tt-no-print" onClick={handleSaveSettings}>Save Settings</button>
                <button className="tt-btn tt-no-print" onClick={handleDeleteAll}>Delete All Settings</button>
          </div>
          </div>
          </div>
          </div>

          <div className="tt-panel">
          <div className="tt-panel-header">Assignments per Class and Subject</div>
          <div className="tt-panel-body tt-scroll" style={{ maxHeight: 420 }}>
            {classes.filter(c => selectedClassIds.has(c.id)).map(c => (
              <div key={c.id} className="tt-assignment">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{c.name}</div>
                {subjects.map(s => {
                  const data = classPlans[c.id]?.[s.id] || { weeklyPeriods: 2, preferred: [], teacherIds: [] };
                  return (
                    <div key={s.id} style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 8, marginTop: 8 }}>
                      <div className="tt-row">
                        <div style={{ fontWeight: 600, minWidth: 160 }}>{s.name}</div>
                        <label>Weekly periods
                          <input
                            type="number"
                            min={0}
                            max={periodsPerDay * Math.max(1, days.length)}
                            value={data.weeklyPeriods}
                            onChange={e => upsertPlan(c.id, s.id, { weeklyPeriods: Math.max(0, Number(e.target.value) || 0) })}
                          />
                        </label>
                        <div className="tt-row" style={{ gap: 6 }}>
                          <span>Preferred periods:</span>
                          {periodsArray.map(idx1 => (
                            <label key={idx1} className="tt-chip">
                              <input type="checkbox" checked={data.preferred?.includes(idx1)} onChange={() => togglePreferredIndex(c.id, s.id, idx1)} /> P{idx1}
                        </label>
                          ))}
                      </div>
                      </div>
                      <div className="tt-row" style={{ gap: 6 }}>
                        <span style={{ minWidth: 160 }}>Teachers:</span>
                        {(users || []).map(u => (
                          <label key={u.id} className="tt-chip">
                                <input
                                  type="checkbox"
                              checked={(data.teacherIds || []).map(String).includes(String(u.id))}
                              onChange={() => toggleTeacherFor(c.id, s.id, String(u.id))}
                            /> {u.name || u.username}
                              </label>
                            ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {classes.filter(c => selectedClassIds.has(c.id)).length === 0 && (
              <div style={{ color: '#6b7280' }}>Select at least one class to configure assignments.</div>
            )}
          </div>
        </div>
        
        {Object.keys(timetables).length > 0 && (
          <div className="tt-panel">
            <div className="tt-panel-header">Generated Timetables</div>
            <div className="tt-panel-body">
              {classes.filter(c => selectedClassIds.has(c.id)).map(c => (
                <div key={c.id} className="tt-print-page" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{c.name} - Timetable</div>
                    <div style={{ color: '#6b7280' }}>Periods/day: {periodsPerDay} • Period: {periodDurationMin} min • Break: {breakDurationMin} min</div>
                      </div>
                  <div className="tt-scroll">
                    <table className="tt-grid" role="grid" aria-label={`Timetable for ${getClassName(c.id)}`}>
          <thead>
            <tr>
                          <th style={{ width: 140 }}>Time</th>
                          {days.map(d => (
                            <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
                        {Array.from({ length: periodsPerDay }, (_, p) => (
                          <tr key={p}>
                            <td style={{ fontWeight: 600 }}>
                              P{p + 1}
                              <div style={{ color: '#6b7280', fontWeight: 400 }}>{getPeriodStartLabel(p)}</div>
                        </td>
                            {days.map((_, dIndex) => {
                              const slot = timetables[c.id]?.[dIndex]?.[p];
                              if (slot?.isBreak) return <td key={dIndex} className="tt-break">BREAK</td>;
                              const subj = slot?.subjectName || '';
                              const teacher = slot?.teacherName || '';
                    return (
                                <td key={dIndex} onClick={() => handleEditCell(c.id, dIndex, p)} style={{ cursor: 'pointer' }}>
                                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj}</div>
                                  <div style={{ color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacher}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                          </div>
              ))}
      </div>
          </div>
        )}

        {/* Hidden report builder for PDF download */}
        <div style={{ position: 'absolute', left: -9999, top: -9999 }}>
              <TimeTableReport
                ref={reportRef}
                data={{
                  classes,
                  subjects,
              timetable: Object.fromEntries(Object.entries(timetables).map(([cid, grid]) => [cid, { grid }])),
              dayLabels: days,
                  periodsPerDay,
                  periodDurationMin,
              breakPeriodIndexes: Array.from(breakIndexes),
                  breakDurationMin,
                  startTime,
                  getClassName,
                  getSubjectName,
              formatTeacherName: getUserName,
              reportScopeAll: true,
                }}
              />
            </div>
      </div>
    </SideTop>
  );
}


