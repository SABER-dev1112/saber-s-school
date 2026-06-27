'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OfficialHeader from '../../../components/layout/OfficialHeader';
import OfficialFooter from '../../../components/layout/OfficialFooter';
import HijriDatePicker from '../../../components/common/HijriDatePicker';
import { gregorianToHijriLong } from '../../../core/calendar';
import { formatMinutesToHoursAndMinutes } from '../../../core/lateness';
import db from '../../../services/db';
import { exportCollectiveReport, exportIndividualReport } from '../../../services/excel';

export default function ManagerReportsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // الفلاتر
  const [reportType, setReportType] = useState('collective'); // collective / individual
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // نتائج التقرير
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searched, setSearched] = useState(false);

  // خيارات تخصيص كروت الإحصائيات (عرض/إخفاء)
  const [showTotalTeachers, setShowTotalTeachers] = useState(true);
  const [showActiveDays, setShowActiveDays] = useState(true);
  const [showPresentDays, setShowPresentDays] = useState(true);
  const [showExcusedDays, setShowExcusedDays] = useState(true);
  const [showAbsentDays, setShowAbsentDays] = useState(true);
  const [showLateness, setShowLateness] = useState(true);

  // حماية الصفحة
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'manager') {
      router.push('/');
    } else {
      setAuthorized(true);
      // ضبط الفترة الافتراضية للشهر الحالي
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = today.toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    Promise.all([
      db.getTeachers(),
      db.getSettings()
    ]).then(([teachersData, settingsData]) => {
      setTeachers(teachersData);
      setSettings(settingsData);
      if (teachersData.length > 0) {
        setSelectedTeacherId(teachersData[0].id);
      }
    });
  }, [authorized]);

  // إنشاء التقرير المفلتر
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert('يرجى تحديد تاريخ البداية والنهاية أولاً.');
      return;
    }

    try {
      const records = await db.getAttendanceForPeriod(startDate, endDate);
      
      if (reportType === 'individual') {
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        setSelectedTeacher(teacher);
        
        // سجلات المعلم المختار
        const teacherRecs = records.filter(r => r.teacher_id === selectedTeacherId).map(r => ({
          ...r,
          hijriDate: gregorianToHijriLong(r.date)
        })).sort((a, b) => new Date(b.date) - new Date(a.date)); // ترتيب تنازلي بالتاريخ

        setFilteredRecords(teacherRecs);
      } else {
        // تقرير جماعي
        const sumList = teachers.map(teacher => {
          const teacherRecs = records.filter(r => r.teacher_id === teacher.id);
          
          let presentDays = 0;
          let absentDays = 0;
          let excusedDays = 0;
          let totalDelayMinutes = 0;

          teacherRecs.forEach(r => {
            if (r.status === 'present') {
              presentDays++;
              totalDelayMinutes += r.delay_minutes || 0;
            } else if (r.status === 'absent') {
              absentDays++;
            } else if (r.status === 'excused' || r.status === 'emergency_approved') {
              excusedDays++;
            }
          });

          return {
            id: teacher.id,
            name: teacher.name,
            specialty: teacher.extra_info?.specialty || '-',
            phone: teacher.extra_info?.phone || '-',
            totalDays: teacherRecs.length,
            presentDays,
            absentDays,
            excusedDays,
            totalDelayMinutes,
            formattedDelay: formatMinutesToHoursAndMinutes(totalDelayMinutes)
          };
        });

        setSummaryData(sumList);
      }
      
      setSearched(true);
    } catch (err) {
      console.error(err);
      alert('فشل في جلب سجلات التقرير.');
    }
  };

  // تصدير التقارير إلى Excel
  const handleExcelExport = () => {
    if (reportType === 'collective') {
      const periodText = `من ${gregorianToHijriLong(startDate)} إلى ${gregorianToHijriLong(endDate)}`;
      exportCollectiveReport(summaryData, settings?.school_name || 'مدرسة أبي دجانه', periodText);
    } else {
      if (!selectedTeacher) return;
      const periodText = `من ${gregorianToHijriLong(startDate)} إلى ${gregorianToHijriLong(endDate)}`;
      exportIndividualReport(selectedTeacher, filteredRecords, settings?.school_name || 'مدرسة أبي دجانه', periodText);
    }
  };

  // فتح نافذة طباعة المتصفح
  const handlePrint = () => {
    window.print();
  };

  // حساب الإحصائيات الإجمالية للتقرير المعروض ديناميكياً
  const getReportStats = () => {
    if (reportType === 'collective') {
      let totalTeachers = teachers.length;
      let totalPresent = summaryData.reduce((sum, item) => sum + item.presentDays, 0);
      let totalAbsent = summaryData.reduce((sum, item) => sum + item.absentDays, 0);
      let totalExcused = summaryData.reduce((sum, item) => sum + item.excusedDays, 0);
      let totalDelay = summaryData.reduce((sum, item) => sum + item.totalDelayMinutes, 0);
      let activeDays = summaryData.reduce((max, item) => Math.max(max, item.totalDays), 0);

      return {
        totalTeachers,
        activeDays,
        present: totalPresent,
        excused: totalExcused,
        absent: totalAbsent,
        delayText: formatMinutesToHoursAndMinutes(totalDelay),
        totalDelay
      };
    } else {
      let activeDays = filteredRecords.length;
      let present = filteredRecords.filter(r => r.status === 'present').length;
      let excused = filteredRecords.filter(r => r.status === 'excused' || r.status === 'emergency_approved').length;
      let absent = filteredRecords.filter(r => r.status === 'absent').length;
      let totalDelay = filteredRecords.reduce((sum, r) => sum + (r.delay_minutes || 0), 0);
      
      return {
        totalTeachers: 1,
        activeDays,
        present,
        excused,
        absent,
        delayText: formatMinutesToHoursAndMinutes(totalDelay),
        totalDelay
      };
    }
  };

  const reportStats = searched ? getReportStats() : null;

  if (!authorized) {
    return <div className="loading-screen">جاري التحقق من الصلاحيات...</div>;
  }

  const startDateHijri = gregorianToHijriLong(startDate);
  const endDateHijri = gregorianToHijriLong(endDate);
  const periodText = `من ${startDateHijri} إلى ${endDateHijri}`;

  return (
    <div className="manager-layout">
      <div className="no-print">
        <OfficialHeader title="التقارير والإحصائيات الرسمية" />
      </div>

      {/* شريط تنقل المدير */}
      <nav className="manager-navbar no-print">
        <div className="navbar-links">
          <button onClick={() => router.push('/manager')} className="nav-btn">التقرير اليومي والداشبورد</button>
          <button className="nav-btn active">التقارير والإحصائيات</button>
          <button onClick={() => router.push('/manager/settings')} className="nav-btn">إعدادات المدرسة والحقول</button>
        </div>
        <button onClick={() => { sessionStorage.removeItem('userRole'); router.push('/'); }} className="btn btn-danger logout-btn">تسجيل الخروج</button>
      </nav>

      <main className="manager-main-content">
        
        {/* فلاتر التقارير */}
        <div className="reports-filter-card no-print">
          <h2 className="section-title">تحديد خيارات التقرير</h2>
          
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">نوع التقرير</label>
              <select value={reportType} onChange={(e) => { setReportType(e.target.value); setSearched(false); }} className="filter-select">
                <option value="collective">تقرير جماعي للمدرسة كاملة</option>
                <option value="individual">تقرير فردي لمعلم محدد</option>
              </select>
            </div>

            {reportType === 'individual' && (
              <div className="filter-group">
                <label className="filter-label">اختر المعلم</label>
                <select 
                  value={selectedTeacherId} 
                  onChange={(e) => { setSelectedTeacherId(e.target.value); setSearched(false); }}
                  className="filter-select"
                >
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div className="filter-group">
              <label className="filter-label">من تاريخ (هجري)</label>
              <HijriDatePicker value={startDate} onChange={(val) => { setStartDate(val); setSearched(false); }} />
            </div>

            <div className="filter-group">
              <label className="filter-label">إلى تاريخ (هجري)</label>
              <HijriDatePicker value={endDate} onChange={(val) => { setEndDate(val); setSearched(false); }} />
            </div>
          </div>

          {/* تخصيص كروت الإحصائيات (عرض/إخفاء) */}
          <div className="kpi-toggles-section no-print" style={{ marginTop: '20px', borderTop: '1px dashed var(--border-gray)', paddingTop: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--primary-navy)' }}>
              تخصيص كروت الإحصائيات (إظهار/إخفاء بالتقرير):
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={showTotalTeachers} onChange={(e) => setShowTotalTeachers(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                إجمالي المعلمين
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={showActiveDays} onChange={(e) => setShowActiveDays(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                أيام العمل الكلية
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={showPresentDays} onChange={(e) => setShowPresentDays(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                أيام الحضور
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={showExcusedDays} onChange={(e) => setShowExcusedDays(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                الإجازات والأعذار
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={showAbsentDays} onChange={(e) => setShowAbsentDays(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                الغياب بدون عذر
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={showLateness} onChange={(e) => setShowLateness(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                التأخير الكلي
              </label>
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={handleGenerateReport} className="btn btn-navy generate-report-btn">
              عرض التقرير المطلوب
            </button>
          </div>
        </div>

        {/* عرض التقرير المنسق المطبوع */}
        {searched && (
          <div className="report-display-card">
            
            {/* خيارات التصدير والطباعة (مخفية عند الطباعة الفعلية) */}
            <div className="report-actions-bar no-print">
              <button onClick={handlePrint} className="btn btn-navy print-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <lord-icon
                  src="https://cdn.lordicon.com/fkdzyuuo.json"
                  trigger="hover"
                  colors="primary:#ffffff"
                  style={{ width: '20px', height: '20px' }}
                ></lord-icon>
                طباعة التقرير (PDF)
              </button>
              <button onClick={handleExcelExport} className="btn btn-secondary excel-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <lord-icon
                  src="https://cdn.lordicon.com/gqdnbnwt.json"
                  trigger="hover"
                  colors="primary:#15445A,secondary:#07A869"
                  style={{ width: '20px', height: '20px' }}
                ></lord-icon>
                تصدير إلى ملف Excel (XLSX)
              </button>
            </div>

            {/* الجزء المطبوع (المطابق لتصميم الترويسة) */}
            <div className="printable-report-body">
              
              {/* ترويسة التقرير الرسمي الملونة المدمجة */}
              <div style={{ marginBottom: '25px' }}>
                <OfficialHeader 
                  title={reportType === 'collective' ? 'التقرير الجماعي لحضور وغياب المعلمين' : `تقرير الحضور والغياب للمعلم: ${selectedTeacher?.name || ''}`} 
                  customHijriDate={periodText} 
                  reportTypeLabel={reportType === 'collective' ? 'تقرير جماعي للمدرسة' : 'تقرير فردي لمعلم'}
                />
              </div>

              {/* كروت الإحصائيات (KPI Cards) */}
              {reportStats && (
                <div className="report-kpi-grid">
                  {showTotalTeachers && (reportType === 'collective') && (
                    <div className="report-kpi-card kpi-total">
                      <div className="kpi-icon-wrapper">
                        <lord-icon
                          src="https://cdn.lordicon.com/dxjqoygy.json"
                          trigger="hover"
                          colors="primary:#15445A"
                          style={{ width: '36px', height: '36px' }}
                        ></lord-icon>
                      </div>
                      <div className="kpi-info-wrapper">
                        <span className="kpi-num">{reportStats.totalTeachers}</span>
                        <span className="kpi-label">عدد المعلمين إجمالي</span>
                      </div>
                    </div>
                  )}

                  {showActiveDays && (
                    <div className="report-kpi-card kpi-active">
                      <div className="kpi-icon-wrapper">
                        <lord-icon
                          src="https://cdn.lordicon.com/qvyppzqz.json"
                          trigger="hover"
                          colors="primary:#3D7EB9"
                          style={{ width: '36px', height: '36px' }}
                        ></lord-icon>
                      </div>
                      <div className="kpi-info-wrapper">
                        <span className="kpi-num">{reportStats.activeDays}</span>
                        <span className="kpi-label">أيام العمل الكلية</span>
                      </div>
                    </div>
                  )}

                  {showPresentDays && (
                    <div className="report-kpi-card kpi-present">
                      <div className="kpi-icon-wrapper">
                        <lord-icon
                          src="https://cdn.lordicon.com/oqdmwree.json"
                          trigger="hover"
                          colors="primary:#07A869"
                          style={{ width: '36px', height: '36px' }}
                        ></lord-icon>
                      </div>
                      <div className="kpi-info-wrapper">
                        <span className="kpi-num">{reportStats.present}</span>
                        <span className="kpi-label">أيام الحضور</span>
                      </div>
                    </div>
                  )}

                  {showExcusedDays && (
                    <div className="report-kpi-card kpi-excused">
                      <div className="kpi-icon-wrapper">
                        <lord-icon
                          src="https://cdn.lordicon.com/nocggjqy.json"
                          trigger="hover"
                          colors="primary:#C1B48A"
                          style={{ width: '36px', height: '36px' }}
                        ></lord-icon>
                      </div>
                      <div className="kpi-info-wrapper">
                        <span className="kpi-num">{reportStats.excused}</span>
                        <span className="kpi-label">الأعذار والإجازات</span>
                      </div>
                    </div>
                  )}

                  {showAbsentDays && (
                    <div className="report-kpi-card kpi-absent">
                      <div className="kpi-icon-wrapper">
                        <lord-icon
                          src="https://cdn.lordicon.com/nhfyxasy.json"
                          trigger="hover"
                          colors="primary:#EF4444"
                          style={{ width: '36px', height: '36px' }}
                        ></lord-icon>
                      </div>
                      <div className="kpi-info-wrapper">
                        <span className="kpi-num" style={{ color: '#EF4444' }}>{reportStats.absent}</span>
                        <span className="kpi-label">الغياب بدون عذر</span>
                      </div>
                    </div>
                  )}

                  {showLateness && (
                    <div className="report-kpi-card kpi-lateness">
                      <div className="kpi-icon-wrapper">
                        <lord-icon
                          src="https://cdn.lordicon.com/qwyfzmzi.json"
                          trigger="hover"
                          colors="primary:#DC2626"
                          style={{ width: '36px', height: '36px' }}
                        ></lord-icon>
                      </div>
                      <div className="kpi-info-wrapper">
                        <span className="kpi-num" style={{ color: '#DC2626' }}>{reportStats.delayText}</span>
                        <span className="kpi-label">التأخير الكلي</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* جدول التقرير الجماعي */}
              {reportType === 'collective' && (
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>اسم المعلم</th>
                        <th>التخصص</th>
                        <th>رقم الجوال</th>
                        <th>أيام العمل</th>
                        <th>الحضور</th>
                        <th>الغياب</th>
                        <th>الأعذار والإجازات</th>
                        <th>التأخير الكلي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center' }}>لا توجد بيانات حضور مسجلة في هذه الفترة.</td>
                        </tr>
                      ) : (
                        summaryData.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                            <td>{item.specialty}</td>
                            <td>{item.phone}</td>
                            <td>{item.totalDays} يوم</td>
                            <td style={{ color: '#03543F', fontWeight: 'bold' }}>{item.presentDays}</td>
                            <td style={{ color: '#9B1C1C', fontWeight: 'bold' }}>{item.absentDays}</td>
                            <td>{item.excusedDays}</td>
                            <td style={{ color: item.totalDelayMinutes > 0 ? '#9B1C1C' : 'inherit' }}>
                              {item.formattedDelay}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* جدول التقرير الفردي */}
              {reportType === 'individual' && (
                <div className="individual-report-wrapper">
                  <div className="teacher-info-strip">
                    <p><strong>اسم المعلم:</strong> {selectedTeacher?.name}</p>
                    <p><strong>التخصص:</strong> {selectedTeacher?.extra_info?.specialty || '-'}</p>
                    <p><strong>رقم الجوال:</strong> {selectedTeacher?.extra_info?.phone || '-'}</p>
                  </div>
                  
                  <div className="table-container">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>التاريخ الهجري</th>
                          <th>التاريخ الميلادي</th>
                          <th>الحالة اليومية</th>
                          <th>وقت الحضور</th>
                          <th>دقائق التأخير</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center' }}>لا توجد سجلات حضور مسجلة للمعلم في هذه الفترة.</td>
                          </tr>
                        ) : (
                          filteredRecords.map(rec => {
                            let statusText = 'غياب بدون عذر';
                            let statusClass = 'status-absent-pill';
                            if (rec.status === 'present') {
                              statusText = 'حاضر';
                              statusClass = 'status-present-pill';
                            } else if (rec.status === 'excused' || rec.status === 'emergency_approved') {
                              statusText = 'إجازة معتمدة';
                              statusClass = 'status-excused-pill';
                            } else if (rec.status === 'emergency_pending') {
                              statusText = 'إجازة طارئة (معلقة)';
                              statusClass = 'status-pending-pill';
                            }
  
                            return (
                              <tr key={rec.id}>
                                <td style={{ fontWeight: 'bold' }}>{rec.hijriDate}</td>
                                <td>{rec.date}</td>
                                <td>
                                  <span className={`status-pill-badge ${statusClass}`}>{statusText}</span>
                                </td>
                                <td>{rec.check_in_time || '-'}</td>
                                <td>
                                  {rec.delay_minutes > 0 ? (
                                    <span className="delay-badge-pill">{rec.delay_minutes} دقيقة</span>
                                  ) : rec.status === 'present' ? (
                                    <span className="ontime-badge-pill">في الموعد</span>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* نقوم بتمرير اسم المعلم المختار في حال التقرير الفردي لتوقيع التقرير */}
      <OfficialFooter teacherName={reportType === 'individual' ? selectedTeacher?.name : ''} />

      <style jsx>{`
        .manager-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--light-gray);
        }
        .manager-navbar {
          background-color: var(--white);
          border-bottom: 1px solid var(--border-gray);
          padding: 10px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-sm);
        }
        .navbar-links {
          display: flex;
          gap: 15px;
        }
        .nav-btn {
          background: none;
          border: none;
          color: var(--text-light);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }
        .nav-btn:hover, .nav-btn.active {
          color: var(--primary-navy);
          background-color: rgba(21, 68, 90, 0.05);
        }
        .manager-main-content {
          flex: 1;
          padding: 30px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }
        .reports-filter-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 25px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 20px;
          border-right: 4px solid var(--secondary-green);
          padding-right: 10px;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        @media (max-width: 992px) {
          .filters-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .manager-navbar {
            padding: 10px 15px;
            flex-direction: column;
            gap: 12px;
          }
          .navbar-links {
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
            gap: 8px;
          }
          .nav-btn {
            flex: 1 1 auto;
            text-align: center;
            padding: 6px 12px;
            font-size: 13px;
          }
          .logout-btn {
            width: 100%;
          }
          .manager-main-content {
            padding: 15px 10px;
          }
          .reports-filter-card {
            padding: 15px;
          }
          .report-display-card {
            padding: 15px;
          }
          .report-actions-bar {
            flex-direction: column;
            gap: 10px;
          }
          .report-actions-bar .btn {
            width: 100% !important;
            justify-content: center;
          }
          .report-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .report-kpi-card {
            padding: 10px;
            gap: 8px;
          }
          .kpi-num {
            font-size: 16px;
          }
          .kpi-label {
            font-size: 9px;
          }
        }
        @media (max-width: 576px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .filter-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--primary-navy);
        }
        .filter-select {
          font-size: 14px;
          padding: 10px;
        }
        .filter-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .generate-report-btn {
          padding: 10px 25px;
        }
        .report-display-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 40px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-gray);
          max-width: 850px;
          margin: 0 auto 30px auto;
          width: 100%;
        }
        @media print {
          .manager-layout, .manager-main-content {
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .report-display-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .printable-report-body {
            display: block !important;
            width: 100% !important;
          }
        }
        .report-actions-bar {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-bottom: 25px;
          border-bottom: 1px dashed var(--border-gray);
          padding-bottom: 15px;
        }
        
        /* ترويسة الطباعة الافتراضية المخفية في المتصفح */
        .print-report-header {
          display: none;
        }
        
        .teacher-info-strip {
          background-color: var(--light-gray);
          border-right: 4px solid var(--primary-navy);
          padding: 15px;
          border-radius: var(--radius-sm);
          display: flex;
          gap: 40px;
          margin-bottom: 20px;
        }
        @media (max-width: 768px) {
          .teacher-info-strip {
            flex-direction: column;
            gap: 10px;
          }
        }
        
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        /* تنسيقات الطباعة الرسمية للتقرير */
        @media print {
          .printable-report-body {
            display: block !important;
          }
          .print-report-header {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--primary-navy) !important;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header-logos-wrapper {
            display: flex;
            align-items: center;
            gap: 15px;
            width: 35%;
          }
          .header-title-wrapper {
            text-align: center;
            width: 30%;
          }
          .header-title-wrapper h2 {
            font-size: 16px;
            font-weight: bold;
            color: var(--primary-navy);
            margin-bottom: 5px;
          }
          .header-title-wrapper p {
            font-size: 12px;
            color: #444;
          }
          .print-logo {
            height: 50px;
            object-fit: contain;
          }
          .print-school-meta h3, .print-date-meta h3 {
            font-size: 11px;
            font-weight: 600;
            color: #333;
            margin-bottom: 3px;
          }
          .report-table {
            margin-top: 15px;
          }
        }
        
        .loading-screen {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 18px;
          font-weight: 700;
          color: var(--primary-navy);
        }
      `}</style>
    </div>
  );
}
