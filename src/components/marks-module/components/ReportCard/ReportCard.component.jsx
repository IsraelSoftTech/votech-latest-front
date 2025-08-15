import React from "react";
import "./ReportCard.css";

const sampleData = {
  student: {
    name: "LUA DANIEL NKONGHO",
    registrationNumber: "41120518",
    dateOfBirth: "08 Jun 2009",
    class: "CERTIFICATION LEVEL 1 MECHANICAL ENGINEERING",
    repeating: "YES",
    year: "2023-2024",
    option: "MECHANICAL ENGINEERING",
  },
  generalSubjects: [
    {
      code: "MTH",
      title: "MATHEMATICS",
      sro1: 17,
      sro2: 17,
      avg: 17,
      coef: 5,
      total: 85,
      remark: "V.Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "ENG",
      title: "ENGLISH LANGUAGE",
      sro1: 16,
      sro2: 16,
      avg: 16,
      coef: 5,
      total: 80,
      remark: "Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "FRE",
      title: "FRENCH LANGUAGE",
      sro1: 7,
      sro2: 7,
      avg: 7,
      coef: 5,
      total: 35,
      remark: "Weak",
      teacher: "NJEMA PAUL",
    },
    {
      code: "COM",
      title: "COMMERCE",
      sro1: 16,
      sro2: 16,
      avg: 16,
      coef: 3,
      total: 48,
      remark: "Good",
      teacher: "CHIEF EXAMINER",
    },
    {
      code: "ECO",
      title: "ECONOMICS",
      sro1: 13,
      sro2: 13,
      avg: 13,
      coef: 3,
      total: 39,
      remark: "Fairly Good",
      teacher: "NJEMA PAUL",
    },
  ],
  professionalSubjects: [
    {
      code: "MED",
      title: "MECHANICAL DRAWING",
      sro1: 15,
      sro2: 15,
      avg: 15,
      coef: 8,
      total: 120,
      remark: "Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "ELT",
      title: "ELECT AND ELECTRONI",
      sro1: 15,
      sro2: 15,
      avg: 15,
      coef: 5,
      total: 75,
      remark: "Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "WRP",
      title: "WORKSHOP PROCESSING",
      sro1: 12,
      sro2: 12,
      avg: 12,
      coef: 5,
      total: 60,
      remark: "Fairly Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "SHW",
      title: "SHEET METAL WORKS",
      sro1: 12,
      sro2: 12,
      avg: 12,
      coef: 5,
      total: 60,
      remark: "Fairly Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "SHD",
      title: "SHEET METAL CONST D",
      sro1: 15,
      sro2: 15,
      avg: 15,
      coef: 5,
      total: 75,
      remark: "Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "ENS",
      title: "ENGINEERING SCIENCE",
      sro1: 15,
      sro2: 15,
      avg: 15,
      coef: 5,
      total: 75,
      remark: "Good",
      teacher: "CHIEF EXAMINER",
    },
    {
      code: "ICT",
      title: "I C T",
      sro1: 17,
      sro2: 17,
      avg: 17,
      coef: 5,
      total: 85,
      remark: "V.Good",
      teacher: "NJEMA PAUL",
    },
    {
      code: "PRT",
      title: "PRACTICALS",
      sro1: 18,
      sro2: 18,
      avg: 18,
      coef: 10,
      total: 180,
      remark: "V.Good",
      teacher: "NJEMA PAUL",
    },
  ],
  grandTotal: 882,
  studentAverage: 14.95,
  classAverage: 10.35,
  studentRank: 1,
  totalStudents: 20,
  termAverages: {
    first: 15.84,
    second: 15.46,
    annual: 15.41,
  },
  classMaster: "NDICHIA GLIEM",
  grade: "Good",
  nextYearStart: "Sep 2024",
};

const ReportCard = ({ data = sampleData }) => {
  const getRemarkClass = (remark) => {
    switch (remark.toLowerCase()) {
      case "excellent":
        return "remark-excellent";
      case "v.good":
        return "remark-vgood";
      case "good":
        return "remark-good";
      case "fairly good":
        return "remark-fairly-good";
      case "average":
        return "remark-average";
      case "weak":
        return "remark-weak";
      default:
        return "";
    }
  };

  return (
    <div className="report-card">
      {/* Official Header */}
      <div className="document-header">
        <div className="header-content">
          <div className="left-section">
            <div className="republic-text">REPUBLIC OF CAMEROON</div>
            <div className="motto">Peace • Work • Fatherland</div>
            <div className="ministry">
              MINISTRY OF EMPLOYMENT AND VOCATIONAL TRAINING
            </div>
            <div className="department">DIRECTION DE L'ENSEIGNEMENT PRIVÉ</div>
          </div>

          <div className="center-emblem">
            <div className="emblem">
              <div className="coat-of-arms">
                <div className="emblem-text">OFFICIAL SEAL</div>
              </div>
            </div>
          </div>

          <div className="right-section">
            <div className="republic-text">REPUBLIC OF CAMEROON</div>
            <div className="motto">Peace • Work • Fatherland</div>
            <div className="ministry">
              MINISTRY OF EMPLOYMENT AND VOCATIONAL TRAINING
            </div>
            <div className="department">
              DEPARTMENT OF PRIVATE VOCATIONAL INSTITUTES
            </div>
          </div>
        </div>

        <div className="school-info">
          <div className="school-name">VOTECH ST ACADEMY</div>
          <div className="school-location">AZIRE - MAMKON</div>
          <div className="school-motto">
            Excellence • Productivity • Self Actualization
          </div>
        </div>

        <div className="document-title">
          <h1>ACADEMIC REPORT</h1>
          <div className="term-info">
            Third Term Assessment • Academic Year {data.student.year}
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="student-info">
        <table className="info-table">
          <tbody>
            <tr>
              <td className="label">Student Name:</td>
              <td className="value">{data.student.name}</td>
              <td className="label">Class:</td>
              <td className="value">{data.student.class}</td>
            </tr>
            <tr>
              <td className="label">Registration No:</td>
              <td className="value">{data.student.registrationNumber}</td>
              <td className="label">Option:</td>
              <td className="value">{data.student.option}</td>
            </tr>
            <tr>
              <td className="label">Date of Birth:</td>
              <td className="value">{data.student.dateOfBirth}</td>
              <td className="label">Academic Year:</td>
              <td className="value">{data.student.year}</td>
            </tr>
            <tr>
              <td className="label">Repeating:</td>
              <td className="value">{data.student.repeating}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* General Subjects */}
      <div className="subjects-section">
        <div className="section-header">
          <h3>GENERAL SUBJECTS</h3>
        </div>
        <table className="subjects-table">
          <thead>
            <tr>
              <th>CODE</th>
              <th>SUBJECT TITLE</th>
              <th>SRO 1</th>
              <th>SRO 2</th>
              <th>AVG</th>
              <th>COEF</th>
              <th>TOTAL</th>
              <th>REMARK</th>
              <th>TEACHER</th>
            </tr>
          </thead>
          <tbody>
            {data.generalSubjects.map((subject, index) => (
              <tr key={index}>
                <td className="code-cell">{subject.code}</td>
                <td className="subject-cell">{subject.title}</td>
                <td className="score-cell">{subject.sro1}</td>
                <td className="score-cell">{subject.sro2}</td>
                <td className="avg-cell">{subject.avg}</td>
                <td className="coef-cell">{subject.coef}</td>
                <td className="total-cell">{subject.total}</td>
                <td className="remark-cell">
                  <span className={getRemarkClass(subject.remark)}>
                    {subject.remark}
                  </span>
                </td>
                <td className="teacher-cell">{subject.teacher}</td>
              </tr>
            ))}
            <tr className="subtotal-row">
              <td colSpan={6} className="subtotal-label">
                SUB TOTAL:
              </td>
              <td className="subtotal-value">
                {data.generalSubjects.reduce((sum, s) => sum + s.total, 0)}
              </td>
              <td className="subtotal-remark">
                <span className="remark-fairly-good">Fairly Good</span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Professional Subjects */}
      <div className="subjects-section">
        <div className="section-header">
          <h3>PROFESSIONAL SUBJECTS</h3>
        </div>
        <table className="subjects-table">
          <thead>
            <tr>
              <th>CODE</th>
              <th>SUBJECT TITLE</th>
              <th>SRO 1</th>
              <th>SRO 2</th>
              <th>AVG</th>
              <th>COEF</th>
              <th>TOTAL</th>
              <th>REMARK</th>
              <th>TEACHER</th>
            </tr>
          </thead>
          <tbody>
            {data.professionalSubjects.map((subject, index) => (
              <tr key={index}>
                <td className="code-cell">{subject.code}</td>
                <td className="subject-cell">{subject.title}</td>
                <td className="score-cell">{subject.sro1}</td>
                <td className="score-cell">{subject.sro2}</td>
                <td className="avg-cell">{subject.avg}</td>
                <td className="coef-cell">{subject.coef}</td>
                <td className="total-cell">{subject.total}</td>
                <td className="remark-cell">
                  <span className={getRemarkClass(subject.remark)}>
                    {subject.remark}
                  </span>
                </td>
                <td className="teacher-cell">{subject.teacher}</td>
              </tr>
            ))}
            <tr className="subtotal-row">
              <td colSpan={6} className="subtotal-label">
                SUB TOTAL:
              </td>
              <td className="subtotal-value">
                {data.professionalSubjects.reduce((sum, s) => sum + s.total, 0)}
              </td>
              <td className="subtotal-remark">
                <span className="remark-fairly-good">Fairly Good</span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Academic Performance Summary */}
      <div className="performance-summary">
        <table className="summary-table">
          <tbody>
            <tr>
              <td className="summary-label">GRAND TOTAL:</td>
              <td className="summary-value">{data.grandTotal}</td>
              <td className="summary-label">STUDENT AVERAGE:</td>
              <td className="summary-value">{data.studentAverage}/20</td>
            </tr>
            <tr>
              <td className="summary-label">CLASS AVERAGE:</td>
              <td className="summary-value">{data.classAverage}/20</td>
              <td className="summary-label">CLASS RANK:</td>
              <td className="summary-value">
                {data.studentRank}° of {data.totalStudents}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Term Averages and Academic Appreciation */}
      <div className="term-section">
        <div className="term-averages">
          <h4>TERM AVERAGES</h4>
          <table className="term-table">
            <tbody>
              <tr>
                <td>1st Term Average:</td>
                <td>{data.termAverages.first}</td>
              </tr>
              <tr>
                <td>2nd Term Average:</td>
                <td>{data.termAverages.second}</td>
              </tr>
              <tr>
                <td>Annual Average:</td>
                <td>{data.termAverages.annual}</td>
              </tr>
              <tr>
                <td>Annual Position:</td>
                <td>{data.studentRank}°</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="academic-appreciation">
          <h4>ACADEMIC APPRECIATION</h4>
          <table className="appreciation-table">
            <tbody>
              <tr>
                <td>18-20:</td>
                <td>
                  <span className="remark-excellent">Excellent</span>
                </td>
              </tr>
              <tr>
                <td>16-17:</td>
                <td>
                  <span className="remark-vgood">V.Good</span>
                </td>
              </tr>
              <tr>
                <td>14-15:</td>
                <td>
                  <span className="remark-good">Good</span>
                </td>
              </tr>
              <tr>
                <td>12-13:</td>
                <td>
                  <span className="remark-fairly-good">Fairly Good</span>
                </td>
              </tr>
              <tr>
                <td>10-11:</td>
                <td>
                  <span className="remark-average">Average</span>
                </td>
              </tr>
              <tr>
                <td>0-9:</td>
                <td>
                  <span className="remark-weak">Weak</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="administrative-info">
          <h4>ADMINISTRATIVE</h4>
          <table className="admin-table">
            <tbody>
              <tr>
                <td>Class Master:</td>
                <td>{data.classMaster}</td>
              </tr>
              <tr>
                <td>Overall Grade:</td>
                <td>
                  <span className={getRemarkClass(data.grade)}>
                    {data.grade}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Decision:</td>
                <td>PROMOTION</td>
              </tr>
              <tr>
                <td>Next Year Starts:</td>
                <td>{data.nextYearStart}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Disciplinary Record */}
      <div className="disciplinary-section">
        <h4>DISCIPLINARY RECORD</h4>
        <div className="disciplinary-items">
          <span>Attend Disc. Council: ____</span>
          <span>Warned: ____</span>
          <span>Expelled: ____</span>
        </div>
      </div>

      {/* Signature Section */}
      <div className="signature-section">
        <div className="signature-box">
          <div className="signature-title">CLASS MASTER</div>
          <div className="signature-line"></div>
          <div className="signature-name">{data.classMaster}</div>
          <div className="signature-date">Date & Signature</div>
        </div>

        <div className="signature-box">
          <div className="signature-title">PRINCIPAL</div>
          <div className="signature-line"></div>
          <div className="signature-name">Dr. Academic Director</div>
          <div className="signature-date">Date, Signature & Seal</div>
        </div>

        <div className="signature-box">
          <div className="signature-title">PARENT/GUARDIAN</div>
          <div className="signature-line"></div>
          <div className="signature-name">Parent Name</div>
          <div className="signature-date">Date & Signature</div>
        </div>
      </div>

      {/* Document Footer */}
      <div className="document-footer">
        <div className="footer-left">
          <div>Academic Year: {data.student.year}</div>
          <div>Third Term Report</div>
        </div>
        <div className="footer-center">
          <div className="school-name-footer">VOTECH ST ACADEMY</div>
          <div>Excellence in Vocational Education</div>
        </div>
        <div className="footer-right">
          <div>
            Issued:{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div>Official Document</div>
        </div>
      </div>
    </div>
  );
};
