import React, { forwardRef, useMemo, useRef } from 'react';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function formatHHMM(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseHHMM(str) {
  const [h, m] = (str || '08:00').split(':').map(Number);
  return (h * 60) + (m || 0);
}

function computePeriodStartMinutes(index, startTime, periodsPerDay, periodDurationMin, breakPeriodIndexes, breakDurationMin) {
  let t = parseHHMM(startTime);
  for (let i = 0; i < index; i += 1) {
    const idx1 = i + 1;
    if ((breakPeriodIndexes || []).includes(idx1)) t += breakDurationMin;
    else t += periodDurationMin;
  }
  return t;
}

const TimeTableReport = forwardRef(({ data }, ref) => {
  if (!data) return null;
  const {
    classes,
    subjects,
    timetable,
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
  } = data;

  const containerRef = useRef(null);
  const classRefs = useRef({});

  const downloadPDF = async () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const margin = 8; // mm
      const pageWidth = 297 - margin * 2;
      const pageHeight = 210 - margin * 2;
      let isFirst = true;

      for (const cls of classList) {
        const el = classRefs.current[cls.id];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pageWidth;
        const imgH = (canvas.height * imgW) / canvas.width;
        if (!isFirst) pdf.addPage('a4', 'l');
        pdf.addImage(imgData, 'PNG', margin, margin, imgW, Math.min(imgH, pageHeight));
        isFirst = false;
      }

      const fileName = `timetable_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const hasGridFor = (cid) => !!(timetable && (timetable[cid] || timetable[String(cid)]));
  const getGridFor = (cid) => {
    const t = timetable[cid] || timetable[String(cid)];
    return t?.grid || [];
  };

  const classList = useMemo(() => (reportScopeAll ? classes : classes.filter(c => hasGridFor(c.id))), [classes, reportScopeAll, timetable]);

  React.useImperativeHandle(ref, () => ({ downloadPDF }));

  return (
    <div ref={containerRef} style={{ background: '#fff', padding: 16, color: '#111827' }}>
      {classList.map((cls, idx) => {
        const classId = cls.id;
        const grid = getGridFor(classId);
        if (!grid || grid.length === 0) return null;
        const isLast = idx === classList.length - 1;
        return (
          <div key={classId} ref={el => (classRefs.current[classId] = el)} style={{ marginBottom: 12, pageBreakAfter: isLast ? 'auto' : 'always', width: 1120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{getClassName(classId)} - Timetable</div>
              <div style={{ color: '#6b7280' }}>Periods/day: {periodsPerDay} • Period: {periodDurationMin} min • Break: {breakDurationMin} min</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 140, border: '1px solid #e5e7eb', padding: 6 }}>Time</th>
                    {dayLabels.map((d) => (
                      <th key={d} style={{ border: '1px solid #e5e7eb', padding: 6 }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: periodsPerDay }, (_, p) => (
                    <tr key={p}>
                      <td style={{ border: '1px solid #e5e7eb', padding: 6, fontWeight: 600 }}>
                        P{p + 1}
                        <div style={{ color: '#6b7280', fontWeight: 400 }}>
                          {formatHHMM(computePeriodStartMinutes(p, startTime, periodsPerDay, periodDurationMin, breakPeriodIndexes, breakDurationMin))}
                        </div>
                      </td>
                      {dayLabels.map((_, dIndex) => {
                        const slot = grid[dIndex]?.[p];
                        const startMin = computePeriodStartMinutes(p, startTime, periodsPerDay, periodDurationMin, breakPeriodIndexes, breakDurationMin);
                        if (slot?.isBreak) {
                          const endMin = startMin + breakDurationMin;
                          return (
                            <td key={dIndex} style={{ border: '1px solid #e5e7eb', background: '#f3f4f6', textAlign: 'center', padding: 6 }}>
                              Break
                              <div style={{ fontSize: 11 }}>{formatHHMM(startMin)}–{formatHHMM(endMin)}</div>
                            </td>
                          );
                        }
                        const subj = slot?.subjectName || (slot?.subjectId != null ? getSubjectName(Number(slot.subjectId)) : '');
                        const teach = slot?.teacherName || (slot?.teacherId != null ? formatTeacherName(String(slot.teacherId)) : '');
                        return (
                          <td key={dIndex} style={{ border: '1px solid #e5e7eb', padding: 6 }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj}</div>
                            <div style={{ color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teach}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default TimeTableReport; 