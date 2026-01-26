import React, { useEffect, useRef, useState } from 'react';
import './AdminTeacher.css';
import { FaDownload } from 'react-icons/fa';
import SideTop from './SideTop';
import Subjects from './Subjects.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../services/api';

export default function Admin4Sub() {
	const subjectsRef = useRef();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getSubjects();
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setSubjects(list);
      } catch (e) {
        setSubjects([]);
      }
    })();
  }, []);

	const exportToPdf = () => {
		const pdf = new jsPDF('p', 'mm', 'a4');
		const pageWidth = 210;
		const pageHeight = 297;
		const margin = 12;
		let cursorY = margin;

		// Title
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(16);
		const title = 'All Subjects';
		const titleWidth = pdf.getTextWidth(title);
		pdf.text(title, (pageWidth - titleWidth) / 2, cursorY);
		cursorY += 8;

		// Table header
		const col1 = { x: margin, w: 140, label: 'Subject' };
		const col2 = { x: margin + col1.w, w: pageWidth - margin - (margin + col1.w), label: 'Code' };
		const rowH = 8;

		// Header background
		pdf.setFillColor(32, 64, 128);
		pdf.rect(col1.x, cursorY, col1.w, rowH, 'F');
		pdf.rect(col2.x, cursorY, col2.w, rowH, 'F');
		pdf.setTextColor(255, 255, 255);
		pdf.setFontSize(12);
		pdf.text(col1.label, col1.x + 2, cursorY + 5.5);
		pdf.text(col2.label, col2.x + 2, cursorY + 5.5);
		cursorY += rowH;

		// Reset text color for rows
		pdf.setTextColor(0, 0, 0);
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(11);

		const rows = Array.isArray(subjects) ? subjects : [];
		rows.forEach((s, idx) => {
			// New page if needed
			if (cursorY + rowH > pageHeight - margin) {
				pdf.addPage();
				cursorY = margin;
				// repeat header
				pdf.setFillColor(32, 64, 128);
				pdf.rect(col1.x, cursorY, col1.w, rowH, 'F');
				pdf.rect(col2.x, cursorY, col2.w, rowH, 'F');
				pdf.setTextColor(255, 255, 255);
				pdf.setFontSize(12);
				pdf.text(col1.label, col1.x + 2, cursorY + 5.5);
				pdf.text(col2.label, col2.x + 2, cursorY + 5.5);
				cursorY += rowH;
				pdf.setTextColor(0, 0, 0);
				pdf.setFontSize(11);
			}

			// Zebra stripe
			if (idx % 2 === 0) {
				pdf.setFillColor(245, 247, 251);
				pdf.rect(col1.x, cursorY, col1.w + col2.w, rowH, 'F');
			}

			// Text (truncate long subject names)
			const name = typeof s.name === 'string' ? s.name : 'Unknown Subject';
			const code = (s.code || '').toString();
			const maxNameWidth = col1.w - 4;
			let displayName = name;
			while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 3) {
				displayName = displayName.slice(0, -4) + '...';
			}
			pdf.text(displayName, col1.x + 2, cursorY + 5.5);
			pdf.text(code, col2.x + 2, cursorY + 5.5);
			cursorY += rowH;
		});

		pdf.save(`subjects_${new Date().toISOString().slice(0, 10)}.pdf`);
	};

	return (
		<SideTop>
			<div style={{ padding: 8 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px' }}>
					<h2 style={{ margin: 0 }}>All Subjects</h2>
					<button onClick={exportToPdf} style={{ background: '#204080', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
						<FaDownload style={{ marginRight: 6 }} /> Export Subjects
					</button>
				</div>
				<div ref={subjectsRef}>
					<Subjects />
				</div>
			</div>
		</SideTop>
	);
}
