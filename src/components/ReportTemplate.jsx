import React from 'react';
import './ReportTemplate.css';
import logo from '../assets/logo.png';

const ReportTemplate = ({ studentData, classData, marksData, settings }) => {
  // Default values if no data provided
  const student = studentData || {
    full_name: 'STUDENT NAME',
    student_id: 'REG NUMBER',
    registration_number: 'REG NUMBER',
    date_of_birth: 'DOB',
    place_of_birth: 'POB',
    is_repeater: false
  };

  const classInfo = classData || {
    name: 'CLASS NAME',
    option: 'OPTION'
  };

  const marks = marksData || {
    general_subjects: [],
    professional_subjects: [],
    general_total: { marks: 0, coef: 0, total: 0, average: 0 },
    professional_total: { marks: 0, coef: 0, total: 0, average: 0 },
    grand_total: { marks: 0, coef: 0, total: 0, average: 0 },
    term_averages: { first: 0, second: 0, annual: 0 },
    class_average: 0,
    student_rank: 0,
    total_students: 0,
    grade: 'N/A'
  };

  const reportSettings = settings || {
    class_master: 'CLASS MASTER',
    principal_remark: 'PRINCIPAL\'S REMARK',
    disciplinary_record: {
      absences: 0,
      disciplinary_council: 'NO',
      warned: 'NO',
      suspended: 'NO',
      might_be_expelled: 'NO'
    },
    class_council_decision: {
      promoted: 'NO',
      repeat: 'NO',
      dismissed: 'NO',
      next_year_start: 'N/A'
    }
  };

  // Helper function to get remark based on average
  const getRemark = (average) => {
    if (average >= 18) return 'Excellent';
    if (average >= 14) return 'V.Good';
    if (average >= 12) return 'Good';
    if (average >= 10) return 'Fairly Good';
    if (average >= 8) return 'Average';
    return 'Weak';
  };

  // Helper function to get grade based on average
  const getGrade = (average) => {
    if (average >= 18) return 'Excellent';
    if (average >= 14) return 'Very Good';
    if (average >= 12) return 'Good';
    if (average >= 10) return 'Fairly Good';
    if (average >= 8) return 'Average';
    if (average >= 6) return 'Weak';
    return 'Very Weak';
  };

  // Helper function to format mark display
  const formatMark = (mark) => {
    if (mark === null || mark === undefined || mark === '') return '-';
    if (mark === 0) return '0';
    return mark.toString();
  };

  return (
    <div className="report-template-container">
      <div className="report-header-section">
        <div className="header-left">
          <p className="header-title">REPUBLIC DU CAMEROON</p>
          <p className="header-subtitle">PAIX-TRAVAIL-PATRIE</p>
          <p className="header-text">MINISTERE DE L'EMPLOIE ET DE LA FORMATION</p>
          <p className="header-text">PROFESSIONEL</p>
          <p className="header-text">DIRECTION DE LENSEINMENT PRIVE</p>
          <p className="header-bold">VOTECH 57 ACADEMY</p>
          <p className="header-text">AZIRE-MANKON</p>
        </div>
        <div className="header-center">
          <img src={logo} alt="Logo" className="center-logo" />
          <p className="center-text">Igniting 'Preneurs</p>
        </div>
        <div className="header-right">
          <p className="header-title">REPUBLIC OF CAMEROON</p>
          <p className="header-subtitle">PEACE-WORK-FATHERLAND</p>
          <p className="header-text">MINISTRY OF EMPLOYMENT AND VOCATIONAL</p>
          <p className="header-text">TRAINING</p>
          <p className="header-text">DEPARTMENT OF PRIVATE VOCATIONAL INSTITUTE</p>
          <p className="header-bold">VOTECH 57 ACADEMY</p>
          <p className="header-text">AZIRE-MANKON</p>
          <p className="header-motto">Motto: Welfare, Productivity, Self Actualization</p>
        </div>
      </div>

      <div className="student-info-section">
        <div className="info-row">
          <p><strong>Names:</strong> {student.full_name}</p>
          <p><strong>Repeater?</strong> YES: <input type="checkbox" checked={student.is_repeater} readOnly /> NO: <input type="checkbox" checked={!student.is_repeater} readOnly /></p>
        </div>
        <div className="info-row">
          <p><strong>Registration Number:</strong> {student.student_id || student.registration_number}</p>
          <p><strong>Class:</strong> {classInfo.name}</p>
        </div>
        <div className="info-row">
          <p><strong>D.O.B:</strong> {student.date_of_birth} P.O.B {student.place_of_birth}</p>
          <p><strong>Option:</strong> {classInfo.option}</p>
        </div>
      </div>

      <div className="subjects-section">
        {marks.general_subjects && marks.general_subjects.length > 0 && (
          <>
            <p className="section-title">General Subjects</p>
            <table className="subjects-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>Subject Title</th>
                  <th>SEQ 5</th>
                  <th>SEQ 6</th>
                  <th>AVG</th>
                  <th>COEF</th>
                  <th>Total</th>
                  <th>REMARK</th>
                  <th>TEACHER</th>
                </tr>
              </thead>
              <tbody>
                {marks.general_subjects.map((subject, index) => (
                  <tr key={index}>
                    <td>{subject.code}</td>
                    <td>{subject.name}</td>
                    <td>{formatMark(subject.seq5)}</td>
                    <td>{formatMark(subject.seq6)}</td>
                    <td>{formatMark(subject.average)}</td>
                    <td>{formatMark(subject.coefficient)}</td>
                    <td>{formatMark(subject.total)}</td>
                    <td>{getRemark(subject.average)}</td>
                    <td>{subject.teacher || '-'}</td>
                  </tr>
                ))}
                <tr className="sub-average-row">
                  <td colSpan="2">Sub Average:</td>
                  <td colSpan="3">{marks.general_total.average.toFixed(2)}</td>
                  <td>{marks.general_total.coef}</td>
                  <td>{marks.general_total.total}</td>
                  <td colSpan="2">{getRemark(marks.general_total.average)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {marks.professional_subjects && marks.professional_subjects.length > 0 && (
          <>
            <p className="section-title">Professional Subjects</p>
            <table className="subjects-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>Subject Title</th>
                  <th>SEQ 5</th>
                  <th>SEQ 6</th>
                  <th>AVG</th>
                  <th>COEF</th>
                  <th>Total</th>
                  <th>REMARK</th>
                  <th>TEACHER</th>
                </tr>
              </thead>
              <tbody>
                {marks.professional_subjects.map((subject, index) => (
                  <tr key={index}>
                    <td>{subject.code}</td>
                    <td>{subject.name}</td>
                    <td>{formatMark(subject.seq5)}</td>
                    <td>{formatMark(subject.seq6)}</td>
                    <td>{formatMark(subject.average)}</td>
                    <td>{formatMark(subject.coefficient)}</td>
                    <td>{formatMark(subject.total)}</td>
                    <td>{getRemark(subject.average)}</td>
                    <td>{subject.teacher || '-'}</td>
                  </tr>
                ))}
                <tr className="sub-average-row">
                  <td colSpan="2">Sub Average:</td>
                  <td colSpan="3">{marks.professional_total.average.toFixed(2)}</td>
                  <td>{marks.professional_total.coef}</td>
                  <td>{marks.professional_total.total}</td>
                  <td colSpan="2">{getRemark(marks.professional_total.average)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="grand-totals-section">
        <table className="totals-table">
          <tbody>
            <tr className="grand-total-row">
              <td>GRAND TOTALS I+II+I Coef:</td>
              <td>{marks.grand_total.marks} Marks</td>
              <td>{marks.grand_total.total}</td>
              <td>Student Average:</td>
              <td>{marks.grand_total.average.toFixed(2)} / 20</td>
            </tr>
            <tr>
              <td>1st Term Average:</td>
              <td>{marks.term_averages.first.toFixed(2)}</td>
              <td>Annual Average:</td>
              <td>{marks.term_averages.annual.toFixed(2)}</td>
              <td>Class Average:</td>
              <td>{marks.class_average.toFixed(2)} / 20</td>
            </tr>
            <tr>
              <td>2nd Term Average:</td>
              <td>{marks.term_averages.second.toFixed(2)}</td>
              <td>Annual Position:</td>
              <td>{marks.student_rank}</td>
              <td>Student's Rank</td>
              <td>{marks.student_rank}</td>
              <td>Out</td>
              <td>{marks.total_students}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="signatures-section">
        <div className="signature-left">
          <p>Class Master: {reportSettings.class_master}</p>
          <p>Sign:</p>
        </div>
        <div className="signature-right">
          <p>Grade: {marks.grade}</p>
          <div className="principal-remark-box">
            <p>{reportSettings.principal_remark}</p>
          </div>
        </div>
      </div>

      <div className="records-section">
        <div className="record-box disciplinary-record">
          <p className="record-header">DISCIPLINARY RECORD</p>
          <p>No of Absences: {reportSettings.disciplinary_record.absences}</p>
          <p>Attend Disc. Council: {reportSettings.disciplinary_record.disciplinary_council}</p>
          <p>Warned: {reportSettings.disciplinary_record.warned}</p>
          <p>Suspended: {reportSettings.disciplinary_record.suspended}</p>
          <p>Might Be Expelled: {reportSettings.disciplinary_record.might_be_expelled}</p>
        </div>
        <div className="record-box academic-appreciation">
          <p className="record-header">ACADEMIC APPRECIATION</p>
          <p>EXCELLENT <span className="grade-range">18-20</span></p>
          <p>VERY GOOD <span className="grade-range">14-17.99</span></p>
          <p>GOOD <span className="grade-range">12-13.99</span></p>
          <p>AVERAGE <span className="grade-range">10-11.90</span></p>
          <p>WEAK <span className="grade-range">8-9.99</span></p>
          <p>VERY WEAK <span className="grade-range">0-7.99</span></p>
        </div>
        <div className="record-box class-council-decision">
          <p className="record-header">CLASS COUNCIL DECISION</p>
          <p>PROMOTED: {reportSettings.class_council_decision.promoted}</p>
          <p>REPEAT: {reportSettings.class_council_decision.repeat}</p>
          <p>DISMISSED: {reportSettings.class_council_decision.dismissed}</p>
          <p>Start of Next Year: {reportSettings.class_council_decision.next_year_start}</p>
        </div>
      </div>

      <div className="report-footer">
        <p>Powered by Izzy Tech Team | izzytechteam.org | 675 644 383</p>
      </div>
    </div>
  );
};

export default ReportTemplate; 