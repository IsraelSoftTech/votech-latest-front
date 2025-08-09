import React, { forwardRef } from 'react';
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

  const downloadPDF = async () => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
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

  const classList = reportScopeAll ? classes : classes.filter(c => hasGridFor(c.id));

  return (
    <div ref={ref} style={{ background: '#fff', padding: 16, color: '#111827' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>VOTECH (S7)</h2>
          <div style={{ fontWeight: 600 }}>Class Timetables</div>
          <div style={{ color: '#555' }}>Start: {startTime} • Period: {periodDurationMin}min • Break: {breakDurationMin}min</div>
        </div>
        <button className="tt-btn" onClick={downloadPDF}>
          <FaDownload /> Download PDF
        </button>
      </div>

      {classList.map((cls) => {
        const classId = cls.id;
        const grid = getGridFor(classId);
        if (!grid || grid.length === 0) return null;
        const daysCount = grid.length || (dayLabels?.length || 0);
        return (
          <div key={classId} style={{ marginTop: 18, pageBreakInside: 'avoid' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{getClassName(classId)}</div>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: '#f8fafc', borderRight: '1px solid #e5e7eb', padding: 8 }}>Day / Period</th>
                    {Array.from({ length: periodsPerDay }, (_, i) => (
                      <th key={i} style={{ background: '#f8fafc', borderRight: '1px solid #e5e7eb', padding: 8 }}>
                        P{i + 1}
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {formatHHMM(computePeriodStartMinutes(i, startTime, periodsPerDay, periodDurationMin, breakPeriodIndexes, breakDurationMin))}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: daysCount }, (_, d) => (
                    <tr key={d}>
                      <th style={{ position: 'sticky', left: 0, background: '#f8fafc', borderRight: '1px solid #e5e7eb', padding: 8 }}>{dayLabels?.[d] || `Day ${d + 1}`}</th>
                      {Array.from({ length: periodsPerDay }, (_, p) => {
                        const slot = grid[d]?.[p];
                        const startMin = computePeriodStartMinutes(p, startTime, periodsPerDay, periodDurationMin, breakPeriodIndexes, breakDurationMin);
                        if (slot?.isBreak) {
                          const endMin = startMin + breakDurationMin;
                          return (
                            <td key={p} style={{ background: '#111827', color: '#fff', padding: 8, textAlign: 'center' }}>
                              Break
                              <div style={{ fontSize: 11 }}>{formatHHMM(startMin)}–{formatHHMM(endMin)}</div>
                            </td>
                          );
                        }
                        const subj = slot?.subjectName || (slot?.subjectId != null ? getSubjectName(Number(slot.subjectId)) : '');
                        const teach = slot?.teacherName || (slot?.teacherId != null ? formatTeacherName(String(slot.teacherId)) : '');
                        const showTime = !!subj;
                        return (
                          <td key={p} style={{ padding: 8, borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ fontWeight: 600 }}>{subj}</div>
                            <div style={{ fontSize: 12, color: '#374151' }}>{teach}</div>
                            {showTime ? (
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{formatHHMM(startMin)}–{formatHHMM(startMin + periodDurationMin)}</div>
                            ) : null}
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