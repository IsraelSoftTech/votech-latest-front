import React, { useEffect, useMemo, useRef, useState } from 'react';
import SideTop from './SideTop';
import './TimeTable.css';
import { FaCogs, FaDownload, FaLock, FaLockOpen, FaPlay, FaSearch, FaTimes, FaTrash, FaSave } from 'react-icons/fa';
import api from '../services/api';
import TimeTableReport from './TimeTableReport.jsx';
import SuccessMessage from './SuccessMessage';

function generateColorForString(input) {
  // Deterministic pastel color by hashing the input string
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash &= hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 86%)`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

const DEFAULT_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Slot structure: { subjectId, subjectName, teacherId, teacherName, isBreak, locked, doubleId? }
// Grid shape: timetable[classId].grid[dayIndex][periodIndex] = Slot | null

export default function TimeTable({ authUser }) {
  const isAdmin4 = authUser?.role === 'Admin4';

  // Source data
  const [subjects, setSubjects] = useState([]); // [{id, name, code}]
  const [classes, setClasses] = useState([]); // [{id, name}]
  const [approvedStaff, setApprovedStaff] = useState([]); // From approved applications

  // UI state
  const [activeTab, setActiveTab] = useState('setup'); // setup | generate | preview
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [searchFilter, setSearchFilter] = useState({ teacher: '', subject: '' });

  // Global constraints
  const [numDays, setNumDays] = useState(5);
  const [dayLabels, setDayLabels] = useState(DEFAULT_DAY_LABELS);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [periodDurationMin, setPeriodDurationMin] = useState(45);
  const [breakPeriodIndexes, setBreakPeriodIndexes] = useState([3]); // 1-indexed display, 0-indexed storage
  const [breakDurationMin, setBreakDurationMin] = useState(30);
  const [startTime, setStartTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('16:00');

  // Per-subject metadata
  const [heavySubjectIds, setHeavySubjectIds] = useState(new Set());

  // Per-class subject requirements
  // classRequirements[classId] = [{ subjectId, weeklyPeriods, maxPerDay, requiresDouble }]
  const [classRequirements, setClassRequirements] = useState({});

  // Per-class assigned teachers for subjects
  // classSubjectTeachers[classId][subjectId] = Set(teacherId)
  const [classSubjectTeachers, setClassSubjectTeachers] = useState({});

  // Teacher availability and mapping
  // teacherAvailability[teacherId] = boolean[numDays]
  const [teacherAvailability, setTeacherAvailability] = useState({});
  // teacherSubjects[teacherId] = Set(subjectId)
  const [teacherSubjects, setTeacherSubjects] = useState({});
  // teacherDailyMaxLoad[teacherId] = number
  const [teacherDailyMaxLoad, setTeacherDailyMaxLoad] = useState({});

  // Timetable state
  // timetable[classId] = { grid: Slot[numDays][periodsPerDay] }
  const [timetable, setTimetable] = useState({});
  const [warnings, setWarnings] = useState([]);

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportScopeAll, setReportScopeAll] = useState(false);
  const reportRef = useRef();

  // Success message
  const [successMessage, setSuccessMessage] = useState('');

  // Flag to prevent overwriting loaded data
  const [dataLoaded, setDataLoaded] = useState(false);

  // Drag & drop state
  const dragStateRef = useRef(null); // { classId, dayIndex, periodIndex }

  // Load data
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [subjectsRes, classesRes, applicationsRes, settingsRes, assignmentsRes, classReqsRes, heavySubjectsRes] = await Promise.all([
          api.getSubjects(),
          api.getClasses(),
          api.getApplications(),
          api.getTimetableSettings().catch(() => null),
          api.getTeacherAssignments().catch(() => []),
          api.getClassRequirements().catch(() => ({})),
          api.getHeavySubjects().catch(() => []),
        ]);

        setSubjects(subjectsRes || []);
        setClasses(classesRes || []);

        // Apply saved settings if any
        if (settingsRes) {
          const cfg = settingsRes;
          if (Array.isArray(cfg.dayLabels)) setDayLabels(cfg.dayLabels);
          if (cfg.numDays) setNumDays(cfg.numDays);
          if (cfg.periodsPerDay) setPeriodsPerDay(cfg.periodsPerDay);
          if (cfg.periodDurationMin) setPeriodDurationMin(cfg.periodDurationMin);
          if (Array.isArray(cfg.breakPeriodIndexes)) setBreakPeriodIndexes(cfg.breakPeriodIndexes);
          if (cfg.breakDurationMin) setBreakDurationMin(cfg.breakDurationMin);
          if (cfg.startTime) setStartTime(cfg.startTime);
          if (cfg.closingTime) setClosingTime(cfg.closingTime);
        }

        // Load class requirements
        if (classReqsRes && Object.keys(classReqsRes).length > 0) {
          setClassRequirements(classReqsRes);
        }

        // Load heavy subjects
        if (Array.isArray(heavySubjectsRes) && heavySubjectsRes.length > 0) {
          setHeavySubjectIds(new Set(heavySubjectsRes));
        }

        // Filter approved staff from applications
        const approved = (applicationsRes || []).filter(app => app.status === 'approved');
        setApprovedStaff(approved);

        // Load teacher assignments into classSubjectTeachers
        if (Array.isArray(assignmentsRes) && assignmentsRes.length > 0) {
          const byClass = {};
          assignmentsRes.forEach(row => {
            const cid = String(row.class_id);
            const sid = Number(row.subject_id);
            const tid = String(row.teacher_id);
            if (!byClass[cid]) byClass[cid] = {};
            const set = new Set(byClass[cid][sid] || []);
            set.add(tid);
            byClass[cid][sid] = Array.from(set);
          });
          setClassSubjectTeachers(byClass);
        }

        // Load already saved timetables for all classes
        const all = await api.getAllTimetables().catch(() => []);
        console.log('Loaded timetables from DB:', all);
        if (Array.isArray(all)) {
          const mapped = {};
          all.forEach(row => { 
            if (row.class_id && row.data) {
              // row.data is now { grid: [...] }
              if (row.data.grid) {
                mapped[row.class_id] = { grid: row.data.grid }; 
                console.log(`Loaded timetable for class ${row.class_id}:`, row.data.grid);
              } else {
                // Handle legacy format where data was the grid directly
                mapped[row.class_id] = { grid: row.data }; 
                console.log(`Loaded legacy timetable for class ${row.class_id}:`, row.data);
              }
            }
          });
          if (Object.keys(mapped).length > 0) {
            console.log('Setting timetable state with:', mapped);
            setTimetable(mapped); // Use setTimetable directly instead of merging
            setDataLoaded(true);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadAll();
  }, []);

  // Initialize defaults when classes or numDays/periods change
  useEffect(() => {
    if (!classes || classes.length === 0) return;
    setSelectedClassId(prev => prev ?? classes[0]?.id);

    // Only create empty grids if no data has been loaded from database
    if (!dataLoaded) {
    setTimetable(prev => {
      const updated = { ...prev };
      classes.forEach(cls => {
        if (!updated[cls.id]) {
            // Only create empty grid if no timetable exists for this class
          updated[cls.id] = { grid: buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes) };
          } else if (updated[cls.id].grid) {
            // Only resize if the grid dimensions have changed
            const currentGrid = updated[cls.id].grid;
            const currentDays = currentGrid.length;
            const currentPeriods = currentGrid[0]?.length || 0;
            
            if (currentDays !== numDays || currentPeriods !== periodsPerDay) {
              const resized = resizeGrid(currentGrid, numDays, periodsPerDay, breakPeriodIndexes);
          updated[cls.id] = { grid: resized };
            }
          } else {
            // If grid is missing, create it
            updated[cls.id] = { grid: buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes) };
        }
      });
      return updated;
    });
    }
  }, [classes, numDays, periodsPerDay, breakPeriodIndexes, dataLoaded]);

  // Build teacher subjects and default availability after sources load
  useEffect(() => {
    if (approvedStaff.length === 0 || subjects.length === 0) return;

    const nameToId = Object.fromEntries(subjects.map(s => [s.name?.trim().toLowerCase(), s.id]));

    const tSubjects = {};
    const tAvail = {};
    const tDailyMax = {};
    approvedStaff.forEach(staff => {
      const teacherId = String(staff.applicant_id ?? staff.id ?? staff.applicant_username ?? staff.applicant_name);
      const teacherSubNames = (staff.subjects || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const subjectIds = new Set(
        teacherSubNames
          .map(n => nameToId[n.toLowerCase()])
          .filter(Boolean)
      );
      tSubjects[teacherId] = subjectIds;
      tAvail[teacherId] = Array.from({ length: numDays }, () => true);
      tDailyMax[teacherId] = 6; // sensible default
    });
    setTeacherSubjects(tSubjects);
    setTeacherAvailability(tAvail);
    setTeacherDailyMaxLoad(tDailyMax);
  }, [approvedStaff, subjects, numDays]);

  // Helpers to build and resize grids
  function buildEmptyGrid(days, periods, breakIdxs) {
    const grid = Array.from({ length: days }, () => Array.from({ length: periods }, () => null));
    // Mark breaks
    breakIdxs.forEach(pIdx => {
      const idx = Number(pIdx) - 1; // stored as 1-based in UI, keep zero-index here safely
      if (idx >= 0 && idx < periods) {
        for (let d = 0; d < days; d += 1) {
          grid[d][idx] = { isBreak: true, locked: true };
        }
      }
    });
    return grid;
  }

  function resizeGrid(oldGrid, days, periods, breakIdxs) {
    const grid = buildEmptyGrid(days, periods, breakIdxs);
    if (!oldGrid) return grid;
    for (let d = 0; d < Math.min(days, oldGrid.length); d += 1) {
      for (let p = 0; p < Math.min(periods, oldGrid[d].length); p += 1) {
        if (!grid[d][p] || grid[d][p].isBreak) continue;
        const slot = oldGrid[d][p];
        if (slot && !slot.isBreak) grid[d][p] = { ...slot };
      }
    }
    return grid;
  }

  // UI: Update classRequirements for a class
  function upsertClassRequirement(classId, subjectId, updates) {
    setClassRequirements(prev => {
      const list = prev[classId] ? [...prev[classId]] : [];
      const idx = list.findIndex(r => r.subjectId === subjectId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
      } else {
        list.push({ subjectId, weeklyPeriods: 3, maxPerDay: 2, requiresDouble: false, ...updates });
      }
      return { ...prev, [classId]: list };
    });
  }

  function removeClassRequirement(classId, subjectId) {
    setClassRequirements(prev => {
      const list = prev[classId] ? prev[classId].filter(r => r.subjectId !== subjectId) : [];
      return { ...prev, [classId]: list };
    });
  }

  function toggleHeavySubject(subjectId) {
    setHeavySubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }

  function toggleBreakIndexUI(idx1Based) {
    setBreakPeriodIndexes(prev => {
      const next = new Set(prev);
      if (next.has(idx1Based)) next.delete(idx1Based);
      else next.add(idx1Based);
      return Array.from(next).sort((a, b) => a - b);
    });
  }

  function setTeacherAvailabilityDay(teacherId, dayIndex, available) {
    setTeacherAvailability(prev => {
      const arr = prev[teacherId] ? [...prev[teacherId]] : Array.from({ length: numDays }, () => true);
      arr[dayIndex] = available;
      return { ...prev, [teacherId]: arr };
    });
  }

  function setTeacherDailyMax(teacherId, maxLoad) {
    setTeacherDailyMaxLoad(prev => ({ ...prev, [teacherId]: Number(maxLoad) || 0 }));
  }

  // Assign teachers per class-subject
  function toggleClassSubjectTeacher(classId, subjectId, teacherId, checked) {
    setClassSubjectTeachers(prev => {
      const forClass = prev[classId] ? { ...prev[classId] } : {};
      const set = new Set(forClass[subjectId] || []);
      if (checked) set.add(teacherId);
      else set.delete(teacherId);
      forClass[subjectId] = Array.from(set);
      return { ...prev, [classId]: forClass };
    });
  }

  // Validation across timetable
  function computeWarnings(currentTimetable) {
    const issues = [];
    if (!currentTimetable) return issues;

    // Teacher overlap map: key = `${day}:${period}` -> Set(teacherId)
    const overlapMap = new Map();

    Object.entries(currentTimetable).forEach(([classId, { grid }]) => {
      for (let d = 0; d < grid.length; d += 1) {
        const row = grid[d];
        for (let p = 0; p < row.length; p += 1) {
          const slot = row[p];
          if (!slot || slot.isBreak || !slot.teacherId) continue;
          const key = `${d}:${p}`;
          if (!overlapMap.has(key)) overlapMap.set(key, new Map());
          const tMap = overlapMap.get(key);
          const num = (tMap.get(slot.teacherId) || 0) + 1;
          tMap.set(slot.teacherId, num);
        }
      }
    });

    overlapMap.forEach((tMap, key) => {
      tMap.forEach((count, teacherId) => {
        if (count > 1) {
          const [d, p] = key.split(':').map(n => Number(n));
          issues.push(`Teacher overlap at ${dayLabels[d]} P${p + 1}: Teacher ${formatTeacherName(teacherId)} in multiple classes.`);
        }
      });
    });

    // Subject max-per-day and heavy adjacency per class
    Object.entries(currentTimetable).forEach(([classId, { grid }]) => {
      for (let d = 0; d < grid.length; d += 1) {
        const row = grid[d];
        const perSubjectCount = new Map();
        for (let p = 0; p < row.length; p += 1) {
          const slot = row[p];
          if (!slot || slot.isBreak || !slot.subjectId) continue;
          perSubjectCount.set(slot.subjectId, (perSubjectCount.get(slot.subjectId) || 0) + 1);
          // Heavy back-to-back
          const prev = p > 0 ? row[p - 1] : null;
          if (
            prev &&
            !prev.isBreak &&
            prev.subjectId &&
            heavySubjectIds.has(prev.subjectId) &&
            heavySubjectIds.has(slot.subjectId)
          ) {
            issues.push(
              `${getClassName(classId)}: heavy subjects back-to-back on ${dayLabels[d]} (P${p}/${p + 1}).`
            );
          }
        }
        (classRequirements[classId] || []).forEach(r => {
          if (r.maxPerDay && (perSubjectCount.get(r.subjectId) || 0) > r.maxPerDay) {
            const subj = getSubjectName(r.subjectId);
            issues.push(`${getClassName(classId)}: ${subj} exceeds max/day on ${dayLabels[d]}.`);
          }
        });
      }
    });

    setWarnings(issues);
  }

  useEffect(() => {
    computeWarnings(timetable);
  }, [timetable, heavySubjectIds, classRequirements, dayLabels]);

  // Update day labels when numDays changes
  useEffect(() => {
    if (numDays === 5) {
      setDayLabels(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    } else if (numDays === 6) {
      setDayLabels(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    } else if (numDays === 7) {
      setDayLabels(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    }
  }, [numDays]);

  // Generation engine (CSP-like with retries)
  function handleGenerate(autoRetry = 4) {
    console.log('Starting timetable generation...');
    console.log('Current state:', {
      classes: classes.length,
      subjects: subjects.length,
      approvedStaff: approvedStaff.length,
      classRequirements,
      classSubjectTeachers,
      heavySubjectIds: Array.from(heavySubjectIds)
    });

    // Build effective requirements from current state; if none set for a class, derive from assigned teachers
    const effectiveRequirements = computeEffectiveRequirements();
    console.log('Effective requirements:', effectiveRequirements);

    if (Object.keys(effectiveRequirements).length === 0) {
      setSuccessMessage('failed');
      return;
    }

    // Create a simple timetable based on requirements with teacher conflict prevention
    const generatedTimetable = {};

    // Track teacher availability across all classes: teacherBusy[teacherId][dayIndex][periodIndex] = true
    const teacherBusy = {};
    
    // Initialize teacher busy tracking
    approvedStaff.forEach(staff => {
      const teacherId = String(staff.applicant_id || staff.id);
      teacherBusy[teacherId] = Array.from({ length: numDays }, () => 
        Array.from({ length: periodsPerDay }, () => false)
      );
    });
    
    classes.forEach(cls => {
      console.log(`Creating timetable for class: ${cls.name} (ID: ${cls.id})`);
      const grid = buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes);
      console.log(`Built empty grid for class ${cls.id}:`, grid);
      
      const requirements = effectiveRequirements[cls.id] || [];
      let periodCount = 0;
      
      requirements.forEach(req => {
        const subject = subjects.find(s => s.id === req.subjectId);
        if (!subject) return;
        
        const teachers = getTeachersForSubject(req.subjectId, cls.id);
        if (teachers.length === 0) return;
        
        console.log(`Placing subject ${subject.name} for class ${cls.name}`);
        
        // Place the required number of periods
        for (let i = 0; i < req.weeklyPeriods && periodCount < numDays * periodsPerDay; i++) {
          let placed = false;
          
          // Try to find an available slot for this teacher
          for (let attempt = 0; attempt < numDays * periodsPerDay && !placed; attempt++) {
            const dayIndex = Math.floor(attempt / periodsPerDay);
            const periodIndex = attempt % periodsPerDay;
            
            // Skip if it's a break period
            if (breakPeriodIndexes.includes(periodIndex + 1)) {
              continue;
            }
            
            // Check if slot is available in this class
            if (grid[dayIndex][periodIndex] !== null) {
              continue;
            }
            
            // Try each available teacher for this subject
            for (const teacher of teachers) {
              const teacherName = formatTeacherName(teacher);
              
              // Check if this teacher is available at this time across all classes
              if (!teacherBusy[teacher] || !teacherBusy[teacher][dayIndex] || !teacherBusy[teacher][dayIndex][periodIndex]) {
                // Place the subject
                const slotData = {
                  subjectId: subject.id,
                  subjectName: subject.name,
                  teacherId: teacher,
                  teacherName: teacherName,
                  locked: false
                };
                
                console.log(`Placing subject in slot [${dayIndex}][${periodIndex}] with teacher ${teacherName}:`, slotData);
                grid[dayIndex][periodIndex] = slotData;
                
                // Mark teacher as busy at this time
                if (!teacherBusy[teacher]) {
                  teacherBusy[teacher] = Array.from({ length: numDays }, () => 
                    Array.from({ length: periodsPerDay }, () => false)
                  );
                }
                teacherBusy[teacher][dayIndex][periodIndex] = true;
                
                placed = true;
                break;
      }
            }
            
            if (placed) break;
          }
          
          if (!placed) {
            console.warn(`Could not place ${subject.name} for class ${cls.name} - no available slots`);
          }
          
          periodCount++;
        }
      });
      
      generatedTimetable[cls.id] = { grid };
      console.log(`Final grid for class ${cls.id}:`, grid);
    });
    
    console.log('=== FINAL GENERATED TIMETABLE ===');
    console.log(generatedTimetable);
    console.log('Teacher busy tracking:', teacherBusy);
    
    if (Object.keys(generatedTimetable).length > 0) {
      setTimetable(generatedTimetable);
    // Persist generated timetables and settings to server
      persistTimetablesAndSettings(generatedTimetable).catch(err => console.error('Persist after generate failed:', err));
      setSuccessMessage('success');
    } else {
      setSuccessMessage('failed');
    }
  }

  async function persistTimetablesAndSettings(currentTimetable) {
    try {
      console.log('Persisting timetables:', currentTimetable);
      await api.saveTimetableSettings({
        numDays,
        dayLabels,
        periodsPerDay,
        periodDurationMin,
        breakPeriodIndexes,
        breakDurationMin,
        startTime,
        closingTime,
      });
      const entries = Object.entries(currentTimetable || timetable);
      console.log('Saving timetable entries:', entries);
      for (const [classId, data] of entries) {
        if (data?.grid) {
          console.log(`Saving timetable for class ${classId}:`, data.grid);
          await api.saveClassTimetable(classId, { grid: data.grid });
        }
      }
      // Persist teacher assignments roughly based on current selections
      const assignments = [];
      const effectiveReqs = computeEffectiveRequirements();
      Object.entries(classSubjectTeachers).forEach(([cid, subjMap]) => {
        Object.entries(subjMap).forEach(([sid, teachers]) => {
          const periods = (effectiveReqs[cid]?.find(r => r.subjectId === Number(sid))?.weeklyPeriods) || 1;
          (teachers || []).forEach(tid => {
            assignments.push({ teacher_id: Number(tid) || tid, class_id: Number(cid), subject_id: Number(sid), periods_per_week: periods });
          });
        });
      });
      if (assignments.length > 0) await api.saveTeacherAssignments(assignments);
      setSuccessMessage('success');
    } catch (e) {
      console.error('Persist error:', e);
      setSuccessMessage('failed');
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm('Are you sure you want to delete all timetable data? This action cannot be undone.')) {
      return;
    }

    try {
      await Promise.all([
        api.deleteAllTimetables(),
        api.deleteTimetableSettings(),
        api.deleteTeacherAssignments(),
        api.deleteClassRequirements(),
        api.deleteHeavySubjects()
      ]);

      // Reset local state
      setTimetable({});
      setClassRequirements({});
      setClassSubjectTeachers({});
      setHeavySubjectIds(new Set());
      setNumDays(5);
      setDayLabels(DEFAULT_DAY_LABELS);
      setPeriodsPerDay(8);
      setPeriodDurationMin(45);
      setBreakPeriodIndexes([3]);
      setBreakDurationMin(30);
      setStartTime('08:00');
      setClosingTime('16:00');
      setTeacherAvailability({});
      setTeacherSubjects({});
      setTeacherDailyMaxLoad({});
      setDataLoaded(false);

      setSuccessMessage('success');
    } catch (error) {
      console.error('Delete all failed:', error);
      setSuccessMessage('failed');
    }
  }

  function checkPlacementConstraints({ grid, dayIndex, periodIndex, isDouble, subjectId, teacherId, perDaySubjectCount, maxPerDay }) {
    // Break and locked checked in canPlaceAt

    // Teacher availability
    const avail = teacherAvailability[teacherId];
    if (!avail || !avail[dayIndex]) return false;

    // Teacher daily max load
    const teacherLoadToday = countTeacherLoadForDay(teacherId, grid, dayIndex);
    const teacherDailyMax = Number(teacherDailyMaxLoad[teacherId] || 0) || 99;
    const inc = isDouble ? 2 : 1;
    if (teacherLoadToday + inc > teacherDailyMax) return false;

    // Same class heavy adjacency
    if (heavySubjectIds.has(subjectId)) {
      const prev = grid[dayIndex][periodIndex - 1];
      const next = grid[dayIndex][periodIndex + 1];
      if (prev && !prev.isBreak && prev.subjectId && heavySubjectIds.has(prev.subjectId)) return false;
      if (!isDouble && next && !next.isBreak && next.subjectId && heavySubjectIds.has(next.subjectId)) return false;
      if (isDouble) {
        // also look around the second period
        const next2 = grid[dayIndex][periodIndex + 2];
        if (next2 && !next2.isBreak && next2.subjectId && heavySubjectIds.has(next2.subjectId)) return false;
      }
    }

    // Subject max per day
    if (maxPerDay && perDaySubjectCount) {
      const current = perDaySubjectCount[dayIndex].get(subjectId) || 0;
      if (current + inc > maxPerDay) return false;
    }

    // Double check for double periods contiguous and not across break
    if (isDouble) {
      const cell2 = grid[dayIndex][periodIndex + 1];
      if (!cell2 || cell2.isBreak || cell2?.locked) return false;
    }

    return true;
  }

  function countTeacherLoadForDay(teacherId, grid, dayIndex) {
    let count = 0;
    const row = grid[dayIndex] || [];
    for (let p = 0; p < row.length; p += 1) {
      const slot = row[p];
      if (slot && !slot.isBreak && slot.teacherId === teacherId) count += 1;
    }
    return count;
  }

  // Build effective requirements for all classes. If a class has no explicit requirements,
  // derive from its assigned classSubjectTeachers with sensible defaults.
  function computeEffectiveRequirements() {
    const out = {};
    (classes || []).forEach(cls => {
      const cid = cls.id;
      const explicit = classRequirements[cid] || [];
      if (explicit.length > 0) {
        out[cid] = explicit.map(r => ({
          subjectId: Number(r.subjectId),
          weeklyPeriods: Number(r.weeklyPeriods) || 1,
          maxPerDay: Number(r.maxPerDay) || 2,
          requiresDouble: !!r.requiresDouble,
        }));
      } else {
        // Derive from teacher assignments
        const subjMap = classSubjectTeachers[cid] || {};
        const reqs = Object.keys(subjMap).map(sid => ({
          subjectId: Number(sid),
          weeklyPeriods: 3, // Default 3 periods per week
          maxPerDay: 2,     // Default max 2 per day
          requiresDouble: false,
        }));
        if (reqs.length > 0) {
        out[cid] = reqs;
        }
      }
    });
    console.log('Computed effective requirements:', out);
    return out;
  }

  // Manual edits: drag & drop
  function onDragStart(classId, dayIndex, periodIndex) {
    dragStateRef.current = { classId, dayIndex, periodIndex };
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function onDrop(targetClassId, targetDayIndex, targetPeriodIndex) {
    const start = dragStateRef.current;
    dragStateRef.current = null;
    if (!start) return;

    // Prevent dropping on breaks or locked
    const sourceSlot = timetable[start.classId]?.grid[start.dayIndex]?.[start.periodIndex];
    const targetSlot = timetable[targetClassId]?.grid[targetDayIndex]?.[targetPeriodIndex];

    if ((targetSlot && targetSlot.isBreak) || (targetSlot && targetSlot.locked)) return;

    // Allow swap or move
    const next = deepClone(timetable);

    // Handle double blocks coherently (move both)
    const movingDoubleId = sourceSlot?.doubleId;

    const performMove = () => {
      next[targetClassId].grid[targetDayIndex][targetPeriodIndex] = sourceSlot ? { ...sourceSlot, locked: false } : null;
      next[start.classId].grid[start.dayIndex][start.periodIndex] = targetSlot ? { ...targetSlot, locked: false } : null;
    };

    if (movingDoubleId) {
      // Determine pair indices in source and target
      const isLeft = isLeftOfDouble(sourceSlot, start, timetable);
      const sourceSecondIndex = isLeft ? start.periodIndex + 1 : start.periodIndex - 1;

      const targetSecondIndex = targetPeriodIndex + (isLeft ? 1 : -1);
      const targetSecondSlot = next[targetClassId]?.grid[targetDayIndex]?.[targetSecondIndex];
      if (!canPlaceAt(next[targetClassId].grid, targetDayIndex, targetSecondIndex)) return;
      if (targetSecondSlot && targetSecondSlot.locked) return;

      // Move both
      const sourceSecondSlot = next[start.classId].grid[start.dayIndex][sourceSecondIndex];

      next[targetClassId].grid[targetDayIndex][targetSecondIndex] = sourceSecondSlot ? { ...sourceSecondSlot, locked: false } : null;
      next[start.classId].grid[start.dayIndex][sourceSecondIndex] = null;

      performMove();
    } else {
      performMove();
    }

    // Validate after move
    setTimetable(prev => next);
  }

  function isLeftOfDouble(slot, start, table) {
    if (!slot?.doubleId) return true;
    const { grid } = table[start.classId];
    const other = grid[start.dayIndex][start.periodIndex + 1];
    if (other?.doubleId === slot.doubleId) return true;
    return false;
  }

  // Manual actions on slot
  function toggleLock(classId, dayIdx, periodIdx) {
    setTimetable(prev => {
      const next = deepClone(prev);
      const slot = next[classId].grid[dayIdx][periodIdx];
      if (!slot || slot.isBreak) return prev;
      slot.locked = !slot.locked;
      return next;
    });
  }

  function clearSlot(classId, dayIdx, periodIdx) {
    setTimetable(prev => {
      const next = deepClone(prev);
      const slot = next[classId].grid[dayIdx][periodIdx];
      if (!slot || slot.isBreak || slot.locked) return prev;

      if (slot.doubleId) {
        // Clear both halves
        const isLeft = isLeftOfDouble(slot, { classId, dayIndex: dayIdx, periodIndex: periodIdx }, prev);
        const otherIdx = isLeft ? periodIdx + 1 : periodIdx - 1;
        next[classId].grid[dayIdx][otherIdx] = null;
      }
      next[classId].grid[dayIdx][periodIdx] = null;
      return next;
    });
  }

  function quickAssign(classId, dayIdx, periodIdx, subjectId, teacherId, makeDouble = false) {
    setTimetable(prev => {
      const next = deepClone(prev);
      const grid = next[classId].grid;
      if (!canPlaceAt(grid, dayIdx, periodIdx)) return prev;

      const subjectName = getSubjectName(subjectId);
      const teacherName = formatTeacherName(teacherId);

      if (makeDouble) {
        if (!canPlaceAt(grid, dayIdx, periodIdx + 1)) return prev;
        const doubleId = `${classId}:${subjectId}:${dayIdx}:${periodIdx}`;
        grid[dayIdx][periodIdx] = { subjectId, subjectName, teacherId, teacherName, locked: false, doubleId };
        grid[dayIdx][periodIdx + 1] = { subjectId, subjectName, teacherId, teacherName, locked: false, doubleId };
      } else {
        grid[dayIdx][periodIdx] = { subjectId, subjectName, teacherId, teacherName, locked: false };
      }
      return next;
    });
  }

  async function handleSaveCloud() {
    // Save global settings and each class timetable to backend
    try {
      await api.saveTimetableSettings({
        numDays,
        dayLabels,
        periodsPerDay,
        periodDurationMin,
        breakPeriodIndexes,
        breakDurationMin,
        startTime,
        closingTime,
      });
      const entries = Object.entries(timetable);
      for (const [classId, data] of entries) {
        if (data?.grid) {
          console.log(`Saving timetable for class ${classId}:`, data.grid);
          await api.saveClassTimetable(classId, data.grid);
        }
      }
      // Persist teacher assignments roughly based on current selections
      const assignments = [];
      const effectiveReqs = computeEffectiveRequirements();
      Object.entries(classSubjectTeachers).forEach(([cid, subjMap]) => {
        Object.entries(subjMap).forEach(([sid, teachers]) => {
          const periods = (effectiveReqs[cid]?.find(r => r.subjectId === Number(sid))?.weeklyPeriods) || 1;
          (teachers || []).forEach(tid => {
            assignments.push({ teacher_id: Number(tid) || tid, class_id: Number(cid), subject_id: Number(sid), periods_per_week: periods });
          });
        });
      });
      if (assignments.length > 0) await api.saveTeacherAssignments(assignments);
      setSuccessMessage('success');
    } catch (e) {
      console.error('Save cloud failed', e);
      setSuccessMessage('failed');
    }
  }

  // Time utils
  function parseHHMM(str) {
    const [h, m] = (str || '08:00').split(':').map(Number);
    return (h * 60) + (m || 0);
  }
  function formatHHMM(totalMin) {
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  function getPeriodStartMinutes(periodIndex) {
    let t = parseHHMM(startTime);
    for (let i = 0; i < periodIndex; i += 1) {
      const idx1 = i + 1;
      if (breakPeriodIndexes.includes(idx1)) t += breakDurationMin;
      else t += periodDurationMin;
    }
    return t;
  }
  function getPeriodLabel(periodIndex) {
    const t = getPeriodStartMinutes(periodIndex);
    return formatHHMM(t);
  }
  // Keep computed closing time in case needed
  function getComputedClosingTime() {
    let t = parseHHMM(startTime);
    for (let i = 0; i < periodsPerDay; i += 1) {
      const idx1 = i + 1;
      if (breakPeriodIndexes.includes(idx1)) t += breakDurationMin;
      else t += periodDurationMin;
    }
    return formatHHMM(t);
  }

  // Utilities: names
  function getSubjectName(subjectId) {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  }
  function getClassName(classId) {
    return classes.find(c => c.id === Number(classId) || c.id === classId)?.name || 'Class';
  }
  function formatTeacherName(teacherId) {
    const t = approvedStaff.find(s => String(s.applicant_id ?? s.id ?? s.applicant_username) === teacherId);
    return t?.applicant_name || t?.applicant_full_name || t?.applicant_username || String(teacherId);
  }
  function getTeachersForSubject(subjectId, classId) {
    console.log(`Getting teachers for subject ${subjectId} in class ${classId}`);
    
    // If admin assigned specific teachers for this class-subject, use them
    const forClass = classSubjectTeachers[classId] || {};
    const assigned = forClass[subjectId];
    if (assigned && assigned.length > 0) {
      console.log(`Found assigned teachers: ${assigned}`);
      return assigned;
    }

    // Fallback to any teacher with the subject
    const out = [];
    Object.entries(teacherSubjects).forEach(([tId, set]) => {
      if (set.has(subjectId)) out.push(tId);
    });
    console.log(`Found fallback teachers: ${out}`);
    return out;
  }

  // Derived lists
  const currentClassRequirements = useMemo(() => classRequirements[selectedClassId] || [], [classRequirements, selectedClassId]);

  // Report builder
  function openReport() {
    setReportScopeAll(false);
    setShowReportModal(true);
  }

  async function handleSaveSetup() {
    try {
      // Save timetable settings
      await api.saveTimetableSettings({
        numDays,
        dayLabels,
        periodsPerDay,
        periodDurationMin,
        breakPeriodIndexes,
        breakDurationMin,
        startTime,
        closingTime,
      });

      // Save class requirements
      await api.saveClassRequirements(classRequirements);

      // Save heavy subjects
      await api.saveHeavySubjects(heavySubjectIds);

      // Save teacher assignments
      const assignments = [];
      const effectiveReqs = computeEffectiveRequirements();
      Object.entries(classSubjectTeachers).forEach(([cid, subjMap]) => {
        Object.entries(subjMap).forEach(([sid, teachers]) => {
          const periods = (effectiveReqs[cid]?.find(r => r.subjectId === Number(sid))?.weeklyPeriods) || 1;
          (teachers || []).forEach(tid => {
            assignments.push({ 
              teacher_id: Number(tid) || tid, 
              class_id: Number(cid), 
              subject_id: Number(sid), 
              periods_per_week: periods 
            });
          });
        });
      });
      
      if (assignments.length > 0) {
        await api.saveTeacherAssignments(assignments);
      }

      setSuccessMessage('success');
    } catch (error) {
      console.error('Save setup failed:', error);
      setSuccessMessage('failed');
    }
  }

  function renderControls() {
    return (
      <div className="tt-controls">
        {successMessage && (
          <SuccessMessage 
            message={successMessage} 
            onClose={() => setSuccessMessage('')}
          />
        )}
        <div className="tt-controls-row">
          <div className="tt-control">
            <label>Days per week</label>
            <input type="number" min={1} max={7} value={numDays} onChange={e => setNumDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))} />
          </div>
          <div className="tt-control">
            <label>Periods per day</label>
            <input type="number" min={1} max={12} value={periodsPerDay} onChange={e => setPeriodsPerDay(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          </div>
          <div className="tt-control">
            <label>Period duration (min)</label>
            <input type="number" min={20} max={120} value={periodDurationMin} onChange={e => setPeriodDurationMin(Math.max(20, Math.min(120, Number(e.target.value) || 45)))} />
          </div>
          <div className="tt-control">
            <label>Breaks (period indexes)</label>
            <div className="tt-breaks">
              {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(idx => (
                <label key={idx} className={`tt-break-chip ${breakPeriodIndexes.includes(idx) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={breakPeriodIndexes.includes(idx)} onChange={() => toggleBreakIndexUI(idx)} /> P{idx}
                </label>
              ))}
            </div>
          </div>
          <div className="tt-control">
            <label>Break duration (min)</label>
            <input type="number" min={5} max={90} value={breakDurationMin} onChange={e => setBreakDurationMin(Math.max(5, Math.min(90, Number(e.target.value) || 5)))} />
          </div>
          <div className="tt-control">
            <label>Start time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="tt-control">
            <label>Closing time</label>
            <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} />
            <div className="tt-period-sub">Computed: {getComputedClosingTime()}</div>
          </div>
        </div>
        <div className="tt-controls-row">
          <button className="tt-btn" onClick={() => setActiveTab('setup')}><FaCogs /> Setup</button>
          <button className="tt-btn" onClick={handleSaveSetup}><FaSave /> Save Setup</button>
          <button className="tt-btn primary" title={'Auto-generate'} onClick={() => handleGenerate()}><FaPlay /> Generate</button>
          <button className="tt-btn" onClick={() => setActiveTab('preview')}><FaSearch /> Edit & Preview</button>
          <button className="tt-btn" onClick={openReport}><FaDownload /> Export PDF</button>
          <button className="tt-btn danger" onClick={handleDeleteAll}><FaTrash /> Delete All</button>
        </div>
        {warnings.length > 0 && (
          <div className="tt-warnings" role="alert">
            {warnings.slice(0, 5).map((w, i) => (
              <div key={i} className="tt-warning-item">{w}</div>
            ))}
            {warnings.length > 5 && <div className="tt-warning-more">+{warnings.length - 5} more</div>}
          </div>
        )}
      </div>
    );
  }

  function renderSetup() {
  return (
      <div className="tt-setup">
        <div className="tt-setup-left">
          <div className="tt-panel">
            <div className="tt-panel-header">Classes & Subjects</div>
            <div className="tt-panel-body">
              <div className="tt-row">
                <label>Class</label>
                <select value={selectedClassId || ''} onChange={e => setSelectedClassId(e.target.value)}>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="tt-row">
                <label>Add subject to class</label>
                <div className="tt-add-subject">
                  <select id="tt-add-subject-select">
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button className="tt-btn" onClick={() => {
                    const el = document.getElementById('tt-add-subject-select');
                    if (!el || !selectedClassId) return;
                    const subjectId = Number(el.value);
                    upsertClassRequirement(selectedClassId, subjectId, {});
                  }}>Add</button>
                </div>
              </div>
              <div className="tt-req-list">
                {(classRequirements[selectedClassId] || []).map(req => {
                  const candidates = getTeachersForSubject(req.subjectId, selectedClassId).length > 0 ? getTeachersForSubject(req.subjectId, selectedClassId)
                    : Object.keys(teacherSubjects).filter(tid => teacherSubjects[tid]?.has(req.subjectId));
                  const assigned = new Set((classSubjectTeachers[selectedClassId] || {})[req.subjectId] || []);
                  return (
                    <div key={req.subjectId} className="tt-req-item">
                      <div className="tt-req-title" style={{ background: generateColorForString(getSubjectName(req.subjectId)) }}>
                        {getSubjectName(req.subjectId)}
                      </div>
                      <div className="tt-req-fields">
                        <label>Weekly periods
                          <input type="number" min={1} max={40} value={req.weeklyPeriods}
                            onChange={e => upsertClassRequirement(selectedClassId, req.subjectId, { weeklyPeriods: Math.max(1, Number(e.target.value) || 1) })}
                          />
                        </label>
                        <label>Max per day
                          <input type="number" min={1} max={8} value={req.maxPerDay}
                            onChange={e => upsertClassRequirement(selectedClassId, req.subjectId, { maxPerDay: Math.max(1, Number(e.target.value) || 1) })}
                          />
                        </label>
                        <label className="tt-checkbox">
                          <input type="checkbox" checked={!!req.requiresDouble}
                            onChange={e => upsertClassRequirement(selectedClassId, req.subjectId, { requiresDouble: e.target.checked })}
                          /> Double period
                        </label>
                        <button className="tt-icon-btn danger" title="Remove" onClick={() => removeClassRequirement(selectedClassId, req.subjectId)}><FaTimes /></button>
                      </div>
                      <div className="tt-req-fields">
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>Teachers for this class</div>
                          <div className="tt-chip-list">
                            {candidates.length === 0 && <div className="tt-empty">No teachers found for this subject.</div>}
                            {candidates.map(tid => (
                              <label key={tid} className={`tt-chip ${assigned.has(tid) ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={assigned.has(tid)}
                                  onChange={e => toggleClassSubjectTeacher(selectedClassId, req.subjectId, tid, e.target.checked)}
                                /> {formatTeacherName(tid)}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(classRequirements[selectedClassId] || []).length === 0 && (
                  <div className="tt-empty">No subjects added for this class yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="tt-panel">
            <div className="tt-panel-header">Subject Properties</div>
            <div className="tt-panel-body">
              <div className="tt-chip-list">
                {subjects.map(s => (
                  <label key={s.id} className={`tt-chip ${heavySubjectIds.has(s.id) ? 'selected' : ''}`}>
                    <input type="checkbox" checked={heavySubjectIds.has(s.id)} onChange={() => toggleHeavySubject(s.id)} /> Heavy: {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="tt-setup-right">
          <div className="tt-panel">
            <div className="tt-panel-header">Teachers & Availability</div>
            <div className="tt-panel-body">
              <div className="tt-teacher-list">
                {approvedStaff.length === 0 && <div className="tt-empty">No approved staff found. Approve applications to populate teachers.</div>}
                {approvedStaff.map(t => {
                  const teacherId = String(t.applicant_id ?? t.id ?? t.applicant_username ?? t.applicant_name);
                  const days = teacherAvailability[teacherId] || Array.from({ length: numDays }, () => true);
                  const maxDaily = teacherDailyMaxLoad[teacherId] ?? 6;
                  const subNames = Array.from(teacherSubjects[teacherId] || [])
                    .map(id => getSubjectName(id))
                    .join(', ');
                  return (
                    <div key={teacherId} className="tt-teacher-item">
                      <div className="tt-teacher-title">
                        <div className="tt-teacher-name">{t.applicant_name || t.applicant_full_name || t.applicant_username}</div>
                        <div className="tt-teacher-subjects">{subNames || '—'}</div>
                      </div>
                      <div className="tt-teacher-availability">
                        {Array.from({ length: numDays }, (_, d) => (
                          <label key={d} className={`tt-day-chip ${days[d] ? 'selected' : ''}`}>
                            <input type="checkbox" checked={!!days[d]} onChange={e => setTeacherAvailabilityDay(teacherId, d, e.target.checked)} /> {dayLabels[d] || `Day ${d + 1}`}
                          </label>
                        ))}
                      </div>
                      <div className="tt-row compact">
                        <label>Max periods/day</label>
                        <input type="number" min={1} max={12} value={maxDaily} onChange={e => setTeacherDailyMax(teacherId, e.target.value)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderGrid(classId) {
    const t = timetable[classId] || { grid: buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes) };
    const grid = t.grid || buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes);

    // Ensure grid has the correct structure
    if (!Array.isArray(grid) || grid.length === 0) {
      const emptyGrid = buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes);
    return (
      <div className="tt-grid-wrapper">
        <table className="tt-grid" role="grid" aria-label={`Timetable for ${getClassName(classId)}`}>
          <thead>
            <tr>
              <th className="tt-sticky">Day / Period</th>
              {Array.from({ length: periodsPerDay }, (_, i) => (
                <th key={i} className="tt-period-head">P{i + 1}<div className="tt-period-sub">{getPeriodLabel(i)}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numDays }, (_, d) => (
              <tr key={d}>
                <th className="tt-sticky">{dayLabels[d] || `Day ${d + 1}`}</th>
                {Array.from({ length: periodsPerDay }, (_, p) => {
                    const slot = emptyGrid[d]?.[p];
                    const startMin = getPeriodStartMinutes(p);
                    if (slot?.isBreak) {
                      const endMin = startMin + breakDurationMin;
                      return (
                        <td key={p} className="tt-cell break" title="Break">
                          Break
                          <div className="tt-period-sub">{formatHHMM(startMin)}–{formatHHMM(endMin)}</div>
                        </td>
                      );
                    }
                    return (
                      <td key={p} className="tt-cell">
                        <InlineAssign
                          subjects={subjects}
                          getTeachersForSubject={(sid) => getTeachersForSubject(sid, classId)}
                          getTeacherLabel={formatTeacherName}
                          onAssign={(subjectId, teacherId, makeDouble) => quickAssign(classId, d, p, subjectId, teacherId, makeDouble)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="tt-grid-wrapper">
        <table className="tt-grid" role="grid" aria-label={`Timetable for ${getClassName(classId)}`}>
          <thead>
            <tr>
              <th className="tt-sticky">Day / Period</th>
              {Array.from({ length: periodsPerDay }, (_, i) => (
                <th key={i} className="tt-period-head">P{i + 1}<div className="tt-period-sub">{getPeriodLabel(i)}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numDays }, (_, d) => (
              <tr key={d}>
                <th className="tt-sticky">{dayLabels[d] || `Day ${d + 1}`}</th>
                {Array.from({ length: periodsPerDay }, (_, p) => {
                  const slot = grid[d]?.[p];
                  const startMin = getPeriodStartMinutes(p);
                  if (slot?.isBreak) {
                    const endMin = startMin + breakDurationMin;
                    return (
                      <td key={p} className="tt-cell break" title="Break">
                        Break
                        <div className="tt-period-sub">{formatHHMM(startMin)}–{formatHHMM(endMin)}</div>
                      </td>
                    );
                  }

                  const subjectLabel = slot?.subjectName || '';
                  const teacherLabel = slot?.teacherName || '';

                  const matchesFilter = (() => {
                    const s = (searchFilter.subject || '').toLowerCase();
                    const t = (searchFilter.teacher || '').toLowerCase();
                    const subjectOk = !s || subjectLabel.toLowerCase().includes(s);
                    const teacherOk = !t || teacherLabel.toLowerCase().includes(t);
                    return subjectOk && teacherOk;
                  })();

                  const cellStyle = subjectLabel ? { background: generateColorForString(subjectLabel) } : undefined;

                  return (
                    <td
                      key={p}
                      className={`tt-cell ${slot?.locked ? 'locked' : ''} ${matchesFilter ? '' : 'dimmed'}`}
                      style={cellStyle}
                      draggable={!!slot && !slot.locked}
                      onDragStart={() => onDragStart(classId, d, p)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(classId, d, p)}
                    >
                      {slot && (
                        <div className="tt-cell-content">
                          <div className="tt-cell-line tt-subject" title={subjectLabel}>{subjectLabel}</div>
                          <div className="tt-cell-line tt-teacher" title={teacherLabel}>{teacherLabel}</div>
                          <div className="tt-cell-actions">
                            <button className="tt-icon-btn" title={slot.locked ? 'Unlock' : 'Lock'} onClick={() => toggleLock(classId, d, p)}>
                              {slot.locked ? <FaLock /> : <FaLockOpen />}
                            </button>
                            {!slot.locked && (
                              <button className="tt-icon-btn danger" title="Clear" onClick={() => clearSlot(classId, d, p)}>
                                <FaTimes />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {!slot && (
                        <InlineAssign
                          subjects={subjects}
                          getTeachersForSubject={(sid) => getTeachersForSubject(sid, classId)}
                          getTeacherLabel={formatTeacherName}
                          onAssign={(subjectId, teacherId, makeDouble) => quickAssign(classId, d, p, subjectId, teacherId, makeDouble)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderPreview() {
    return (
      <div className="tt-preview">
        <div className="tt-filter-bar no-print">
          <div className="tt-row">
            <label>Class</label>
            <select value={selectedClassId || ''} onChange={e => setSelectedClassId(e.target.value)}>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="tt-row">
            <label>Filter by subject</label>
            <input value={searchFilter.subject} onChange={e => setSearchFilter(s => ({ ...s, subject: e.target.value }))} placeholder="e.g. Math" />
          </div>
          <div className="tt-row">
            <label>Filter by teacher</label>
            <input value={searchFilter.teacher} onChange={e => setSearchFilter(s => ({ ...s, teacher: e.target.value }))} placeholder="e.g. John" />
          </div>
        </div>
        
        {/* Professional Timetable Display */}
        <div className="tt-professional-timetable">
          <div className="tt-timetable-header">
            <h2 className="tt-school-name">VOTECH INSTITUTE</h2>
            <h3 className="tt-class-name">{getClassName(selectedClassId)} - Academic Timetable</h3>
            <div className="tt-timetable-info">
              <span>Academic Year: {new Date().getFullYear()}</span>
              <span>Periods per Day: {periodsPerDay}</span>
              <span>Period Duration: {periodDurationMin} minutes</span>
            </div>
          </div>
          
          <div className="tt-timetable-container">
            {renderProfessionalGrid(selectedClassId)}
          </div>
        </div>
      </div>
    );
  }

  function renderProfessionalGrid(classId) {
    const t = timetable[classId] || { grid: buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes) };
    const grid = t.grid || buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes);
    
    // Ensure grid has the correct structure
    if (!Array.isArray(grid) || grid.length === 0) {
      const emptyGrid = buildEmptyGrid(numDays, periodsPerDay, breakPeriodIndexes);
      return renderProfessionalTable(emptyGrid, classId);
    }

    return renderProfessionalTable(grid, classId);
  }

  function renderProfessionalTable(grid, classId) {
    return (
      <div className="tt-professional-table-wrapper">
        <table className="tt-professional-table">
          <thead>
            <tr className="tt-header-row">
              <th className="tt-time-header">Time</th>
              {dayLabels.slice(0, numDays).map((day, index) => (
                <th key={index} className="tt-day-header">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periodsPerDay }, (_, periodIndex) => (
              <tr key={periodIndex} className="tt-period-row">
                <td className="tt-time-cell">
                  <div className="tt-period-number">P{periodIndex + 1}</div>
                  <div className="tt-period-time">{getPeriodLabel(periodIndex)}</div>
                </td>
                {Array.from({ length: numDays }, (_, dayIndex) => {
                  const slot = grid[dayIndex]?.[periodIndex];
                  const startMin = getPeriodStartMinutes(periodIndex);
                  
                  if (slot?.isBreak) {
                    const endMin = startMin + breakDurationMin;
                    return (
                      <td key={dayIndex} className="tt-break-cell">
                        <div className="tt-break-label">BREAK</div>
                        <div className="tt-break-time">{formatHHMM(startMin)}-{formatHHMM(endMin)}</div>
                      </td>
                    );
                  }

                  const subjectLabel = slot?.subjectName || '';
                  const teacherLabel = slot?.teacherName || '';

                  const matchesFilter = (() => {
                    const s = (searchFilter.subject || '').toLowerCase();
                    const t = (searchFilter.teacher || '').toLowerCase();
                    const subjectOk = !s || subjectLabel.toLowerCase().includes(s);
                    const teacherOk = !t || teacherLabel.toLowerCase().includes(t);
                    return subjectOk && teacherOk;
                  })();

                  const cellStyle = subjectLabel ? { 
                    background: generateColorForString(subjectLabel),
                    border: slot?.locked ? '2px solid #dc2626' : '1px solid #e5e7eb'
                  } : undefined;

                  return (
                    <td 
                      key={dayIndex} 
                      className={`tt-subject-cell ${matchesFilter ? '' : 'dimmed'} ${slot?.locked ? 'locked' : ''}`}
                      style={cellStyle}
                    >
                      {slot ? (
                        <div className="tt-subject-content">
                          <div className="tt-subject-name">{subjectLabel}</div>
                          <div className="tt-teacher-name">{teacherLabel}</div>
                          {slot.locked && <div className="tt-locked-indicator">🔒</div>}
                        </div>
                      ) : (
                        <div className="tt-empty-cell">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <SideTop>
      <div className="timetable-auto-container">
        <div className="tt-header">
          <div className="tt-title">Automatic Timetable Generator</div>
          <div className="tt-subtitle">Assign teachers per class & subject, set times, auto-generate, drag-and-drop adjust, and export PDF</div>
        </div>

        {renderControls()}

        <div className="tt-tabs no-print">
          <button className={`tt-tab ${activeTab === 'setup' ? 'active' : ''}`} onClick={() => setActiveTab('setup')}>Setup</button>
          <button className={`tt-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Edit & Preview</button>
        </div>

        {activeTab === 'setup' && renderSetup()}
        {activeTab === 'preview' && renderPreview()}

        {showReportModal && (
          <div className="inventory-report-modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="inventory-report-modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label className="tt-checkbox"><input type="checkbox" checked={reportScopeAll} onChange={e => setReportScopeAll(e.target.checked)} /> Export all classes</label>
                </div>
                <button className="tt-icon-btn" onClick={() => setShowReportModal(false)}><FaTimes /></button>
              </div>
              <TimeTableReport
                ref={reportRef}
                data={{
                  classes,
                  subjects,
                  timetable,
                  classRequirements,
                  dayLabels,
                  periodsPerDay,
                  periodDurationMin,
                  breakPeriodIndexes,
                  breakDurationMin,
                  startTime,
                  getClassName,
                  getSubjectName,
                  formatTeacherName,
                  reportScopeAll,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
}

function InlineAssign({ subjects, getTeachersForSubject, getTeacherLabel, onAssign }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id);
  const [teacherId, setTeacherId] = useState('');
  const [doublePeriod, setDoublePeriod] = useState(false);

  const teacherOptions = useMemo(() => {
    if (!subjectId) return [];
    return getTeachersForSubject(subjectId);
  }, [subjectId, getTeachersForSubject]);

  useEffect(() => {
    setTeacherId(prev => (teacherOptions.includes(prev) ? prev : (teacherOptions[0] || '')));
  }, [teacherOptions]);

  return (
    <div className="tt-inline-assign">
      <select value={subjectId || ''} onChange={e => setSubjectId(Number(e.target.value))}>
        {subjects.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select value={teacherId || ''} onChange={e => setTeacherId(e.target.value)}>
        {teacherOptions.length === 0 && <option value="">No teacher</option>}
        {teacherOptions.map(tid => (
          <option key={tid} value={tid}>{getTeacherLabel ? getTeacherLabel(tid) : tid}</option>
        ))}
      </select>
      <label className="tt-checkbox small"><input type="checkbox" checked={doublePeriod} onChange={e => setDoublePeriod(e.target.checked)} /> Double</label>
      <button className="tt-btn small" disabled={!subjectId || !teacherId} onClick={() => onAssign(subjectId, teacherId, doublePeriod)}>Add</button>
    </div>
  );
}
