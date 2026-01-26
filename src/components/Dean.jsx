import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import { FaCalendarAlt, FaUsers, FaClipboardList, FaTimes, FaDownload } from 'react-icons/fa';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Dean.css';

export default function Dean() {
  const [events, setEvents] = useState([]);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch upcoming events
        const allEvents = await api.getEvents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingEvents = allEvents
          .filter(event => {
            const eventDate = new Date(event.event_date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
          })
          .slice(0, 3) // Show only 3 upcoming events
          .map(event => ({
            title: event.title,
            date: new Date(event.event_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            attendees: event.attendees || 0
          }));
        
        setEvents(upcomingEvents);
        // Fetch total users for Staff Members count
        try {
          const users = await api.getUsers();
          const totalUsers = Array.isArray(users)
            ? users.length
            : (users && Array.isArray(users.data) ? users.data.length : 0);
          setStaffCount(totalUsers);
        } catch (e) {
          console.log('Failed to fetch users for staff count', e);
          setStaffCount(0);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleStaffCardClick = async () => {
    setShowStaffModal(true);
    setLoadingStaff(true);
    try {
      const staff = await api.getStaffWithAssignments();
      setStaffList(staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('List of Votech S7 Staff, Classes and Subjects', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(`Generated on: ${today}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Table data
    const tableData = staffList.map((staff, index) => [
      index + 1,
      staff.name || 'N/A',
      staff.classes || 'None',
      staff.subjects || 'None'
    ]);

    // AutoTable configuration - use autoTable as a function
    autoTable(pdf, {
      head: [["#", "Staff Name", "Classes Assigned", "Subjects Assigned"]],
      body: tableData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: "linebreak",
        cellWidth: "wrap",
        valign: "middle",
        textColor: [0, 0, 0],
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 50, halign: "left" },
        2: { cellWidth: 64, halign: "left" },
        3: { cellWidth: 64, halign: "left" },
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      didDrawPage: (data) => {
        // Add header on each page
        if (data.pageNumber > 1) {
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text("List of Votech S7 Staff, Classes and Subjects", pageWidth / 2, 8, { align: "center" });
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Generated on: ${today}`, pageWidth / 2, 13, { align: "center" });
        }
      },
      // Ensure table fits on page and breaks properly
      tableWidth: "wrap",
      showHead: "everyPage",
    });

    // Save PDF
    pdf.save('Votech_S7_Staff_List.pdf');
  };

  const closeStaffModal = () => {
    setShowStaffModal(false);
    setStaffList([]);
  };

  return (
    <SideTop>
      <div className="dashboard-cards">
        <div className="card" style={{ background: '#eaf3ff' }}>
          <div className="icon"><FaCalendarAlt /></div>
          <div className="count">{loading ? '...' : events.length}</div>
          <div className="desc">Upcoming events</div>
        </div>
        <div 
          className="card" 
          style={{ 
            background: '#204080', 
            color: '#fff', 
            cursor: 'default',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div className="icon" style={{ color: '#fff' }}><FaUsers /></div>
          <div className="count">{loading ? '...' : staffCount}</div>
          <div className="desc" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
            <span>Staff Members</span>
            <span style={{ flex: 1 }}></span>
            <span
              className="dean-see-list"
              onClick={handleStaffCardClick}
              style={{
                cursor: 'pointer',
                fontSize: 12,
                color: '#fff',
                opacity: 0.9
              }}
            >
              See List
            </span>
          </div>
        </div>

      </div>
      <div className="dashboard-section">
        <div style={{ flex: 1 }} className="enrolment-chart">
          <div className="section-title">Upcoming Events</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading events...</div>
          ) : events.length > 0 ? (
            events.map((evt, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{evt.title}</div>
                  <div style={{ color: '#888', fontSize: 14 }}>{evt.date}</div>
                </div>
                <div style={{ fontWeight: 600, color: '#204080', fontSize: 15 }}>{evt.attendees} attendees</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No upcoming events</div>
          )}
        </div>
      </div>

      {/* Staff Members Modal */}
      {showStaffModal && (
        <div 
          className="modal-overlay" 
          onClick={closeStaffModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '1200px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #204080',
              paddingBottom: '15px'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#204080',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                Staff Members, Classes and Subjects
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#204080',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153060'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#204080'}
                >
                  <FaDownload /> Download PDF
                </button>
                <button
                  onClick={closeStaffModal}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                    e.currentTarget.style.color = '#000';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                  }}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ 
              overflowY: 'auto',
              flex: 1,
              maxHeight: 'calc(90vh - 120px)'
            }}>
              {loadingStaff ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#888' 
                }}>
                  Loading staff data...
                </div>
              ) : staffList.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#888' 
                }}>
                  No staff members found or no assignments available.
                </div>
              ) : (
                <table className="dean-staff-table">
                  <thead>
                    <tr>
                      <th className="dean-staff-table__col-index">#</th>
                      <th className="dean-staff-table__col-name">Staff Name</th>
                      <th className="dean-staff-table__col-classes">Classes Assigned</th>
                      <th className="dean-staff-table__col-subjects">Subjects Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff, index) => (
                      <tr key={staff.id}>
                        <td className="dean-staff-table__cell dean-staff-table__cell--index">{index + 1}</td>
                        <td className="dean-staff-table__cell dean-staff-table__cell--name">{staff.name || 'N/A'}</td>
                        <td className="dean-staff-table__cell">{staff.classes || 'None'}</td>
                        <td className="dean-staff-table__cell">{staff.subjects || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 