'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OfficialHeader from '../../components/layout/OfficialHeader';
import OfficialFooter from '../../components/layout/OfficialFooter';
import checkSuspiciousAbsence from '../../core/validation';
import db from '../../services/db';

export default function ManagerDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [pendingEmergencyLeaves, setPendingEmergencyLeaves] = useState([]);
  const [suspiciousAlert, setSuspiciousAlert] = useState({ suspicious: false, reason: null });
  const [stats, setStats] = useState({ present: 0, absent: 0, excused: 0, pending: 0, late: 0 });
  const [settings, setSettings] = useState(null);
  const [todayStr, setTodayStr] = useState('');
  const [pendingCorrections, setPendingCorrections] = useState([]);

  // حماية الصفحة والتحقق من الصلاحية
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'manager') {
      router.push('/');
    } else {
      setAuthorized(true);
      setTodayStr(new Date().toISOString().split('T')[0]);
    }
  }, [router]);

  // تحميل البيانات والتحقق من الحضور والغياب
  useEffect(() => {
    if (!authorized || !todayStr) return;
    loadDashboardData();
  }, [authorized, todayStr]);

  const loadDashboardData = async () => {
    try {
      const [teachersData, attendanceToday, allAttendance, settingsData] = await Promise.all([
        db.getTeachers(),
        db.getAttendance(todayStr),
        db.getAllAttendance(),
        db.getSettings()
      ]);

      setTeachers(teachersData);
      setTodayAttendance(attendanceToday);
      setSettings(settingsData);

      // حساب الإحصائيات اليومية لليوم الحالي
      let present = 0, absent = 0, excused = 0, pending = 0, late = 0;
      
      teachersData.forEach(t => {
        const record = attendanceToday.find(r => r.teacher_id === t.id);
        if (record) {
          if (record.status === 'present') {
            present++;
            if (record.delay_minutes > 0) late++;
          } else if (record.status === 'absent') {
            absent++;
          } else if (record.status === 'excused' || record.status === 'emergency_approved') {
            excused++;
          } else if (record.status === 'emergency_pending') {
            pending++;
          }
        } else {
          // لم يحضر بعد يعتبر غائب افتراضياً
          absent++;
        }
      });

      setStats({ present, absent, excused, pending, late });

      // تصفية الإجازات الطارئة المعلقة لليوم الحالي
      const pendingLeaves = attendanceToday.filter(r => r.status === 'emergency_pending').map(r => {
        const teacher = teachersData.find(t => t.id === r.teacher_id);
        return {
          ...r,
          teacherName: teacher ? teacher.name : 'معلم غير معروف'
        };
      });
      setPendingEmergencyLeaves(pendingLeaves);

      // جلب طلبات تعديل الحضور المعلقة
      const correctionsData = await db.getCorrections();
      const pendingCorrs = correctionsData.filter(c => c.request_status === 'pending');
      setPendingCorrections(pendingCorrs);

      // فحص الغياب المريب
      const checkAlert = checkSuspiciousAbsence(allAttendance, teachersData.length, todayStr);
      setSuspiciousAlert(checkAlert);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  // اعتماد الإجازة الطارئة
  const handleApproveLeave = async (record) => {
    try {
      const updatedRecord = {
        ...record,
        status: 'emergency_approved',
        check_in_time: null,
        delay_minutes: 0
      };
      // إزالة حقل teacherName الزائد قبل الحفظ
      delete updatedRecord.teacherName;

      await db.saveAttendance([updatedRecord]);
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // تحويل الإجازة الطارئة لغياب بدون إذن
  const handleConvertAbsent = async (record) => {
    try {
      const updatedRecord = {
        ...record,
        status: 'absent',
        check_in_time: null,
        delay_minutes: 0
      };
      delete updatedRecord.teacherName;

      await db.saveAttendance([updatedRecord]);
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // اعتماد طلب التعديل للمستند
  const handleApproveCorrection = async (correctionId) => {
    try {
      await db.updateCorrectionStatus(correctionId, 'approved');
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // رفض طلب التعديل
  const handleRejectCorrection = async (correctionId) => {
    try {
      await db.updateCorrectionStatus(correctionId, 'rejected');
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // معالجة تنبيه الغياب المريب وتحويل اليوم لإجازة رسمية للمدرسة بالكامل
  const handleMakeHoliday = async () => {
    if (!confirm('هل تريد فعلاً تحويل اليوم الحالي إلى إجازة رسمية في الإعدادات، واعتبار جميع المعلمين غائبين بعذر؟')) return;
    try {
      // 1. إضافة اليوم لقائمة الإجازات الرسمية في الإعدادات
      const currentHolidays = settings?.official_holidays || [];
      const updatedHolidays = [...currentHolidays];
      
      if (!updatedHolidays.some(h => h.date === todayStr)) {
        updatedHolidays.push({
          date: todayStr,
          name: 'إجازة طارئة بقرار المدير للغياب المريب'
        });
      }
      
      await db.updateSettings({ official_holidays: updatedHolidays });

      // 2. تحديث سجلات حضور جميع المعلمين اليوم إلى إجازة معتمدة (excused)
      const updatedAttendance = teachers.map(t => ({
        teacher_id: t.id,
        date: todayStr,
        status: 'excused',
        check_in_time: null,
        delay_minutes: 0
      }));

      await db.saveAttendance(updatedAttendance);
      loadDashboardData();
      alert('تم اعتماد اليوم كإجازة رسمية وتحديث سجلات الحضور بنجاح.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء اعتماد الإجازة.');
    }
  };

  if (!authorized) {
    return <div className="loading-screen">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div className="manager-layout">
      <OfficialHeader title="لوحة تحكم المدير والتقرير اليومي" />

      {/* شريط تنقل المدير */}
      <nav className="manager-navbar no-print">
        <div className="navbar-links">
          <button className="nav-btn active">التقرير اليومي والداشبورد</button>
          <button onClick={() => router.push('/manager/reports')} className="nav-btn">التقارير والإحصائيات</button>
          <button onClick={() => router.push('/manager/settings')} className="nav-btn">إعدادات المدرسة والحقول</button>
        </div>
        <button onClick={() => { sessionStorage.removeItem('userRole'); router.push('/'); }} className="btn btn-danger logout-btn">تسجيل الخروج</button>
      </nav>

      <main className="manager-main-content">
        
        {/* تنبيه الغياب المريب */}
        {suspiciousAlert.suspicious && (
          <div className="suspicious-alert-box no-print">
            <div className="alert-content">
              <lord-icon
                src="https://cdn.lordicon.com/usxfxwpp.json"
                trigger="hover"
                colors="primary:#92400E"
                style={{ width: '32px', height: '32px' }}
              ></lord-icon>
              <div className="alert-text-wrapper">
                <h3>تنبيه: تم رصد نمط غياب مريب اليوم!</h3>
                <p>{suspiciousAlert.reason}</p>
              </div>
            </div>
            <button onClick={handleMakeHoliday} className="btn btn-primary holiday-action-btn">
              اعتماد اليوم إجازة رسمية للمدرسة
            </button>
          </div>
        )}

        {/* كروت الإحصائيات اليومية */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <span className="stat-label">إجمالي معلمين المدرسة</span>
            <span className="stat-value">{teachers.length}</span>
          </div>
          <div className="stat-card stat-present">
            <span className="stat-label">المعلمين الحاضرين اليوم</span>
            <span className="stat-value">{stats.present}</span>
          </div>
          <div className="stat-card stat-late">
            <span className="stat-label">المتأخرين اليوم</span>
            <span className="stat-value">{stats.late}</span>
          </div>
          <div className="stat-card stat-excused">
            <span className="stat-label">إجازات وأعذار اليوم</span>
            <span className="stat-value">{stats.excused}</span>
          </div>
          <div className="stat-card stat-absent">
            <span className="stat-label">الغائبين بدون عذر</span>
            <span className="stat-value">{stats.absent}</span>
          </div>
        </div>

        {/* إشعارات الإجازات الطارئة وطلبات التعديل المعلقة */}
        <div className="dashboard-sections-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {/* طلبات الإجازات الطارئة */}
            <div className="pending-leaves-section">
              <h2 className="section-title">طلبات الإجازات الطارئة لليوم (انتظار الاعتماد)</h2>
              {pendingEmergencyLeaves.length === 0 ? (
                <div className="empty-section-alert">
                  لا يوجد طلبات إجازة طارئة بانتظار الاعتماد اليوم.
                </div>
              ) : (
                <div className="pending-leaves-list">
                  {pendingEmergencyLeaves.map(record => (
                    <div key={record.id} className="pending-leave-item">
                      <div className="leave-item-info">
                        <span className="teacher-name">{record.teacherName}</span>
                        <span className="leave-date-badge">طلب إجازة طارئة لليوم</span>
                      </div>
                      <div className="leave-item-actions">
                        <button 
                          onClick={() => handleApproveLeave(record)} 
                          className="btn btn-primary approve-btn"
                          style={{ padding: '6px 15px', fontSize: '13px' }}
                        >
                          اعتماد كإجازة
                        </button>
                        <button 
                          onClick={() => handleConvertAbsent(record)} 
                          className="btn btn-danger reject-btn"
                          style={{ padding: '6px 15px', fontSize: '13px' }}
                        >
                          تحويل لغياب بدون عذر
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* طلبات التعديل المعلقة */}
            <div className="pending-leaves-section">
              <h2 className="section-title">طلبات تعديل حضور المعلمين (بانتظار الموافقة)</h2>
              {pendingCorrections.length === 0 ? (
                <div className="empty-section-alert">
                  لا يوجد طلبات تعديل حضور وغياب معلقة حالياً.
                </div>
              ) : (
                <div className="pending-leaves-list">
                  {pendingCorrections.map(corr => {
                    let reqText = 'غياب';
                    if (corr.status === 'present') reqText = `حضور (${corr.check_in_time})`;
                    else if (corr.status === 'excused') reqText = 'إجازة بعذر';

                    return (
                      <div key={corr.id} className="pending-leave-item" style={{ borderRight: '4px solid var(--accent-gold)' }}>
                        <div className="leave-item-info">
                          <span className="teacher-name">{corr.teacher_name}</span>
                          <span className="leave-date-badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
                            طلب تعديل لتاريخ: {corr.date}
                          </span>
                          <p style={{ fontSize: '14px', margin: '6px 0 0 0', color: 'var(--text-dark)' }}>
                            <strong>التعديل المطلوب:</strong> {reqText}
                          </p>
                          <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'var(--text-light)', fontStyle: 'italic' }}>
                            <strong>السبب للتعديل:</strong> {corr.reason}
                          </p>
                        </div>
                        <div className="leave-item-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button 
                            onClick={() => handleApproveCorrection(corr.id)} 
                            className="btn btn-primary approve-btn"
                            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#07A869' }}
                          >
                            موافقة واعتماد
                          </button>
                          <button 
                            onClick={() => handleRejectCorrection(corr.id)} 
                            className="btn btn-danger reject-btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            رفض
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* التقرير اليومي المفصل */}
          <div className="today-attendance-table-section">
            <h2 className="section-title">سجل الحضور والغياب اليومي المفصل</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>اسم المعلم</th>
                    <th>الحالة</th>
                    <th>وقت الحضور</th>
                    <th>التأخير</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(teacher => {
                    const record = todayAttendance.find(r => r.teacher_id === teacher.id);
                    let statusText = 'غياب بدون إذن';
                    let statusClass = 'status-absent';
                    let checkIn = '-';
                    let delayText = '-';

                    if (record) {
                      if (record.status === 'present') {
                        statusText = 'حاضر';
                        statusClass = 'status-present';
                        checkIn = record.check_in_time || '-';
                        delayText = record.delay_minutes > 0 
                          ? `${record.delay_minutes} دقيقة` 
                          : 'في الموعد';
                      } else if (record.status === 'excused' || record.status === 'emergency_approved') {
                        statusText = 'إجازة معتمدة';
                        statusClass = 'status-excused';
                      } else if (record.status === 'emergency_pending') {
                        statusText = 'إجازة طارئة (معلقة)';
                        statusClass = 'status-pending';
                      }
                    }

                    return (
                      <tr key={teacher.id}>
                        <td className="teacher-name-cell">{teacher.name}</td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>{statusText}</span>
                        </td>
                        <td>{checkIn}</td>
                        <td>
                          {record && record.status === 'present' && record.delay_minutes > 0 ? (
                            <span className="delay-text-highlight">{delayText}</span>
                          ) : (
                            <span>{delayText}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      <OfficialFooter />

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
        .suspicious-alert-box {
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border: 1px solid #F59E0B;
          border-radius: var(--radius-md);
          padding: 20px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          box-shadow: var(--shadow-sm);
        }
        .alert-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .alert-icon {
          font-size: 28px;
        }
        .alert-text-wrapper h3 {
          color: #92400E;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .alert-text-wrapper p {
          color: #B45309;
          font-size: 14px;
        }
        .holiday-action-btn {
          background-color: #D97706;
          color: white;
          font-weight: bold;
        }
        .holiday-action-btn:hover {
          background-color: #B45309;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        @media (max-width: 992px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 576px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .stat-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 20px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-top: 4px solid var(--accent-blue);
        }
        .stat-total { border-top-color: var(--primary-navy); }
        .stat-present { border-top-color: var(--secondary-green); }
        .stat-late { border-top-color: var(--accent-gold); }
        .stat-excused { border-top-color: var(--accent-teal); }
        .stat-absent { border-top-color: #EF4444; }

        .stat-label {
          font-size: 12px;
          color: var(--text-light);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 700;
          color: var(--primary-navy);
        }
        .dashboard-sections-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 25px;
        }
        @media (max-width: 992px) {
          .dashboard-sections-grid {
            grid-template-columns: 1fr;
          }
        }
        .pending-leaves-section, .today-attendance-table-section {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 25px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
          height: fit-content;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 20px;
          border-right: 4px solid var(--secondary-green);
          padding-right: 10px;
        }
        .empty-section-alert {
          border: 1.5px dashed var(--border-gray);
          border-radius: var(--radius-sm);
          padding: 30px;
          text-align: center;
          color: var(--text-light);
          font-size: 14px;
        }
        .pending-leaves-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pending-leave-item {
          background-color: var(--light-gray);
          border: 1px solid var(--border-gray);
          border-radius: var(--radius-sm);
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .leave-item-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .teacher-name {
          font-weight: 700;
          color: var(--primary-navy);
        }
        .leave-date-badge {
          background-color: #FEF3C7;
          color: #D97706;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }
        .leave-item-actions {
          display: flex;
          gap: 8px;
        }
        .teacher-name-cell {
          font-weight: 700;
          color: var(--primary-navy);
        }
        .status-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          display: inline-block;
        }
        .status-present { background-color: #DEF7EC; color: #03543F; }
        .status-absent { background-color: #FDE8E8; color: #9B1C1C; }
        .status-excused { background-color: #FEF08A; color: #713F12; }
        .status-pending { background-color: #E0F2FE; color: #0369A1; }
        
        .delay-text-highlight {
          color: #DC2626;
          font-weight: bold;
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
