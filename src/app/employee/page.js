'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OfficialHeader from '../../components/layout/OfficialHeader';
import OfficialFooter from '../../components/layout/OfficialFooter';
import HijriDatePicker from '../../components/common/HijriDatePicker';
import { calculateLateness, formatMinutesToHoursAndMinutes } from '../../core/lateness';
import db from '../../services/db';

export default function EmployeeAttendancePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [date, setDate] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);

  // الميزات الجديدة
  const [searchQuery, setSearchQuery] = useState('');
  const [verified, setVerified] = useState({});
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'corrections'
  const [isSubmitted, setIsSubmitted] = useState(false);

  // لتبويب طلبات التعديل
  const [correctionsList, setCorrectionsList] = useState([]);
  const [selectedCorrectionTeacherId, setSelectedCorrectionTeacherId] = useState('');
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState('present');
  const [correctionTime, setCorrectionTime] = useState('07:00');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // مودال التنبيهات المخصص
  const [modalConfig, setModalConfig] = useState({
    show: false,
    type: '', // 'warning' | 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    unverifiedList: []
  });

  // مصادقة الموظف وحمايتها
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'employee') {
      router.push('/');
    } else {
      setAuthorized(true);
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(todayStr);
    }
  }, [router]);

  // تحميل الإعدادات والمعلمين والإجازات وطلبات التعديل
  useEffect(() => {
    if (!authorized) return;

    const loadInitialData = async () => {
      try {
        const [teachersData, settingsData, leavesData, correctionsData] = await Promise.all([
          db.getTeachers(),
          db.getSettings(),
          db.getLeaves(),
          db.getCorrections()
        ]);
        setTeachers(teachersData);
        setSettings(settingsData);
        setLeaves(leavesData);
        setCorrectionsList(correctionsData);
        if (teachersData.length > 0) {
          setSelectedCorrectionTeacherId(teachersData[0].id);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };

    loadInitialData();
  }, [authorized]);

  // تحميل أو تهيئة سجلات الحضور عند تغيير التاريخ
  useEffect(() => {
    if (!authorized || !date || teachers.length === 0) return;

    const loadAttendanceForDate = async () => {
      try {
        const existRecords = await db.getAttendance(date);
        const hasExistingRecords = existRecords.length > 0;
        setIsSubmitted(hasExistingRecords);

        const attendanceMap = {};
        const verifiedMap = {};

        teachers.forEach(teacher => {
          const hasLeave = leaves.some(l => 
            l.teacher_id === teacher.id && 
            l.status === 'approved' &&
            date >= l.start_date && 
            date <= l.end_date
          );

          const existingRecord = existRecords.find(r => r.teacher_id === teacher.id);

          if (hasLeave) {
            attendanceMap[teacher.id] = {
              status: 'excused',
              check_in_time: '',
              delay_minutes: 0,
              locked: true
            };
            verifiedMap[teacher.id] = true; // الإجازات معتمدة ومراجعة تلقائياً
          } else if (existingRecord) {
            attendanceMap[teacher.id] = {
              status: existingRecord.status,
              check_in_time: existingRecord.check_in_time || '',
              delay_minutes: existingRecord.delay_minutes || 0,
              locked: false
            };
            verifiedMap[teacher.id] = true; // الحضور المسجل سابقاً مراجع ومؤكد
          } else {
            attendanceMap[teacher.id] = {
              status: 'present',
              check_in_time: '07:00',
              delay_minutes: 0,
              locked: false
            };
            verifiedMap[teacher.id] = false;
          }
        });

        setAttendance(attendanceMap);
        setVerified(verifiedMap);
      } catch (err) {
        console.error('Error loading attendance for date:', err);
      }
    };

    loadAttendanceForDate();
  }, [date, teachers, leaves, authorized]);

  // تحديث حالة الحضور لمعلم
  const handleStatusChange = (teacherId, status) => {
    setAttendance(prev => {
      const updated = { ...prev };
      updated[teacherId] = {
        ...updated[teacherId],
        status,
        check_in_time: status === 'present' ? (updated[teacherId].check_in_time || '07:00') : '',
        delay_minutes: 0
      };
      
      if (status === 'present' && settings) {
        const delay = calculateLateness(updated[teacherId].check_in_time, settings.start_time);
        updated[teacherId].delay_minutes = delay;
      }

      return updated;
    });

    // تأكيد تلقائي عند التعديل
    setVerified(prev => ({
      ...prev,
      [teacherId]: true
    }));
  };

  // تحديث وقت الحضور لمعلم
  const handleTimeChange = (teacherId, checkInTime) => {
    setAttendance(prev => {
      const updated = { ...prev };
      let delay = 0;
      
      if (settings) {
        delay = calculateLateness(checkInTime, settings.start_time);
      }

      updated[teacherId] = {
        ...updated[teacherId],
        check_in_time: checkInTime,
        delay_minutes: delay
      };
      return updated;
    });

    // تأكيد تلقائي عند التعديل
    setVerified(prev => ({
      ...prev,
      [teacherId]: true
    }));
  };

  // تأكيد فردي لمعلم
  const handleToggleVerify = (teacherId) => {
    setVerified(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  // تفعيل المودال النهائي
  const showFinalConfirmation = () => {
    setModalConfig({
      show: true,
      type: 'confirm',
      title: 'التأكيد النهائي للتسجيل',
      message: 'هل أنت متأكد تماماً أنه سيتم التسجيل وقمت بمراجعة كل المواعيد والمدرسين؟ بعد الإرسال سيتم قفل التحضير لهذا اليوم بشكل نهائي ولا يمكن تعديله إلا بطلب تصحيح من المدير.',
      unverifiedList: [],
      onConfirm: executeSave
    });
  };

  // بدء الحفظ بالتحقق الثنائي
  const handleSaveAttendance = () => {
    // تجميع أسماء المعلمين غير المؤكدين
    const unverifiedNames = teachers
      .filter(t => !verified[t.id])
      .map(t => t.name);

    if (unverifiedNames.length > 0) {
      setModalConfig({
        show: true,
        type: 'warning',
        title: 'تنبيه: لم يتم مراجعة كافة المعلمين',
        message: 'المعلمين المذكورين أدناه لم يتم تأكيدهم بشكل فردي، هل حضروا فعلاً في نفس الموعد الافتراضي أم نسيتهم؟ يرجى التحقق:',
        unverifiedList: unverifiedNames,
        onConfirm: () => showFinalConfirmation()
      });
    } else {
      showFinalConfirmation();
    }
  };

  const executeSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    setModalConfig(prev => ({ ...prev, show: false }));

    try {
      const recordsToSave = Object.keys(attendance).map(teacherId => {
        const item = attendance[teacherId];
        return {
          teacher_id: teacherId,
          date: date,
          status: item.status,
          check_in_time: item.status === 'present' ? item.check_in_time : null,
          delay_minutes: item.delay_minutes || 0
        };
      });

      await db.saveAttendance(recordsToSave);
      setIsSubmitted(true);
      setMessage({ text: 'تم حفظ وقفل سجل الحضور والغياب لليوم بنجاح.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'حدث خطأ أثناء حفظ السجلات، يرجى المحاولة لاحقاً.', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // تقديم طلب التعديل
  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctionDate || !selectedCorrectionTeacherId || !correctionReason.trim()) {
      alert('يرجى تعبئة كافة الحقول المطلوبة لطلب التعديل.');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const teacher = teachers.find(t => t.id === selectedCorrectionTeacherId);
      const teacherName = teacher ? teacher.name : 'معلم غير معروف';

      let delay = 0;
      if (correctionStatus === 'present' && settings) {
        delay = calculateLateness(correctionTime, settings.start_time);
      }

      await db.submitCorrection(
        selectedCorrectionTeacherId,
        teacherName,
        correctionDate,
        correctionStatus,
        correctionStatus === 'present' ? correctionTime : null,
        delay,
        correctionReason
      );

      const updated = await db.getCorrections();
      setCorrectionsList(updated);

      setCorrectionDate('');
      setCorrectionReason('');
      alert('تم تقديم طلب تعديل المستند بنجاح وهو بانتظار موافقة المدير.');
    } catch (err) {
      console.error(err);
      alert('فشل تقديم طلب التعديل.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // تصفية المعلمين حسب شريط البحث
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.extra_info?.specialty && t.extra_info.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="employee-layout">
      <OfficialHeader title={activeTab === 'attendance' ? 'تحضير المعلمين اليومي' : 'تعديل مستندات الحضور والغياب'} />
      
      {/* شريط التنقل الداخلي للموظف */}
      <nav className="employee-navbar no-print">
        <div className="navbar-links">
          <button 
            onClick={() => setActiveTab('attendance')} 
            className={`nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          >
            تسجيل الحضور اليومي
          </button>
          <button 
            onClick={() => setActiveTab('corrections')} 
            className={`nav-btn ${activeTab === 'corrections' ? 'active' : ''}`}
          >
            تعديل مستندات
          </button>
          <button onClick={() => router.push('/employee/teachers')} className="nav-btn">إدارة المعلمين</button>
          <button onClick={() => router.push('/employee/password')} className="nav-btn">تغيير كلمة المرور</button>
        </div>
        <button onClick={() => { sessionStorage.removeItem('userRole'); router.push('/'); }} className="btn btn-danger logout-btn">تسجيل الخروج</button>
      </nav>

      <main className="employee-main-content">
        
        {message.text && (
          <div className={`message-alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 1. تبويب تسجيل الحضور اليومي */}
        {activeTab === 'attendance' && (
          <>
            {/* صندوق اختيار التاريخ والبحث */}
            <div className="date-select-card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="date-picker-wrapper" style={{ flex: '1', minWidth: '280px' }}>
                  <label className="date-picker-label">تاريخ التحضير (هجري):</label>
                  <HijriDatePicker value={date} onChange={setDate} placeholder="اختر اليوم التحضيري" />
                </div>
                
                {/* شريط البحث */}
                <div style={{ flex: '1.2', minWidth: '280px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label className="date-picker-label" style={{ whiteSpace: 'nowrap' }}>البحث عن معلم:</label>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم المعلم أو التخصص..." 
                    className="form-input" 
                    style={{ margin: 0 }}
                  />
                </div>
              </div>

              {isSubmitted && (
                <div style={{ padding: '12px 18px', backgroundColor: '#FEF3C7', color: '#B45309', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <lord-icon
                    src="https://cdn.lordicon.com/usxfxwpp.json"
                    trigger="hover"
                    colors="primary:#B45309"
                    style={{ width: '22px', height: '22px' }}
                  ></lord-icon>
                  تنبيه: تم إرسال وقفل حضور وغياب هذا اليوم مسبقاً. لتعديل أي خطأ، يرجى استخدام قسم "تعديل مستندات".
                </div>
              )}
            </div>

            {/* جدول التحضير */}
            <div className="attendance-card">
              <h2 className="card-title">قائمة تحضير المعلمين</h2>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>اسم المعلم</th>
                      <th>التخصص</th>
                      <th>الحالة اليومية</th>
                      <th>وقت الحضور الفعلي</th>
                      <th>مقدار التأخير</th>
                      <th className="no-print">المراجعة والتأكيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                          لا يوجد معلمين مطابقين للبحث أو لم يتم تسجيل أي معلمين في النظام بعد.
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map(teacher => {
                        const record = attendance[teacher.id] || { status: 'present', check_in_time: '07:00', delay_minutes: 0, locked: false };
                        const isTeacherVerified = !!verified[teacher.id];

                        return (
                          <tr key={teacher.id}>
                            <td className="teacher-name-cell">{teacher.name}</td>
                            <td>{teacher.extra_info?.specialty || '-'}</td>
                            <td>
                              {record.locked ? (
                                <span className="badge-excused">[إجازة معتمدة مسبقاً]</span>
                              ) : (
                                <select
                                  value={record.status}
                                  onChange={(e) => handleStatusChange(teacher.id, e.target.value)}
                                  disabled={isSubmitted}
                                  className="table-select"
                                >
                                  <option value="present">حاضر</option>
                                  <option value="absent">غياب بدون إذن</option>
                                  <option value="emergency_pending">إجازة طارئة (انتظار الاعتماد)</option>
                                </select>
                              )}
                            </td>
                            <td>
                              {record.status === 'present' && !record.locked ? (
                                <input
                                  type="time"
                                  value={record.check_in_time}
                                  onChange={(e) => handleTimeChange(teacher.id, e.target.value)}
                                  disabled={isSubmitted}
                                  className="table-time-input"
                                />
                              ) : (
                                <span style={{ color: '#aaa' }}>-</span>
                              )}
                            </td>
                            <td>
                              {record.status === 'present' && record.delay_minutes > 0 ? (
                                <span className="delay-badge">
                                  {formatMinutesToHoursAndMinutes(record.delay_minutes)} تأخير
                                </span>
                              ) : record.status === 'present' ? (
                                <span className="ontime-badge">في الموعد</span>
                              ) : (
                                <span style={{ color: '#aaa' }}>-</span>
                              )}
                            </td>
                            <td className="no-print">
                              <button
                                type="button"
                                disabled={isSubmitted || record.locked}
                                onClick={() => handleToggleVerify(teacher.id)}
                                className={`btn-verify-row ${isTeacherVerified ? 'verified' : ''}`}
                              >
                                {isTeacherVerified ? '✓ تم المراجعة' : '🔔 مراجعة'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!isSubmitted && (
                <div className="card-actions no-print">
                  <button 
                    onClick={handleSaveAttendance} 
                    disabled={saving || teachers.length === 0} 
                    className="btn btn-navy save-attendance-btn"
                  >
                    {saving ? 'جاري حفظ الحضور...' : 'حفظ وإرسال سجل الحضور والغياب'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* 2. تبويب تعديل المستندات */}
        {activeTab === 'corrections' && (
          <div className="corrections-grid">
            {/* نموذج إرسال طلب التعديل */}
            <div className="correction-form-card">
              <h2 className="section-title">تقديم طلب تعديل حضور/غياب مغلق</h2>
              <form onSubmit={handleSaveCorrection} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">اختر التاريخ (هجري)</label>
                  <HijriDatePicker value={correctionDate} onChange={setCorrectionDate} placeholder="حدد اليوم المراد تصحيحه" />
                </div>

                <div className="form-group">
                  <label className="form-label">اختر المعلم</label>
                  <select 
                    value={selectedCorrectionTeacherId} 
                    onChange={(e) => setSelectedCorrectionTeacherId(e.target.value)}
                    className="form-select"
                  >
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الحالة الجديدة المطلوبة</label>
                  <select 
                    value={correctionStatus} 
                    onChange={(e) => setCorrectionStatus(e.target.value)}
                    className="form-select"
                  >
                    <option value="present">حاضر</option>
                    <option value="absent">غياب بدون عذر</option>
                    <option value="excused">إجازة معتمدة (بعذر)</option>
                  </select>
                </div>

                {correctionStatus === 'present' && (
                  <div className="form-group">
                    <label className="form-label">وقت الحضور الفعلي الجديد</label>
                    <input 
                      type="time" 
                      value={correctionTime} 
                      onChange={(e) => setCorrectionTime(e.target.value)} 
                      required 
                      className="form-input" 
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">سبب تعديل المستند وتبرير الخطأ *</label>
                  <textarea 
                    value={correctionReason} 
                    onChange={(e) => setCorrectionReason(e.target.value)} 
                    placeholder="مثال: قمت بتسجيله غياباً عن طريق الخطأ بينما حضر الساعة 07:15، أو نسيت إدخال وقت حضوره الفعلي."
                    required 
                    rows={4}
                    className="form-input"
                    style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                  ></textarea>
                </div>

                <button type="submit" disabled={submittingCorrection} className="btn btn-navy" style={{ width: '100%' }}>
                  {submittingCorrection ? 'جاري تقديم الطلب...' : 'إرسال طلب التعديل للمدير'}
                </button>
              </form>
            </div>

            {/* عرض طلبات التعديل السابقة وحالتها */}
            <div className="correction-form-card">
              <h2 className="section-title">طلبات التعديل المقدمة ومتابعتها</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>المعلم</th>
                      <th>التاريخ</th>
                      <th>الحالة المطلوبة</th>
                      <th>حالة الطلب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctionsList.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                          لا توجد أي طلبات تعديل مقدمة حالياً.
                        </td>
                      </tr>
                    ) : (
                      correctionsList.map(corr => {
                        let reqText = 'غياب';
                        if (corr.status === 'present') reqText = `حضور (${corr.check_in_time})`;
                        else if (corr.status === 'excused') reqText = 'إجازة بعذر';

                        let statusBadge = <span className="badge-status-pending">بانتظار المدير 🟡</span>;
                        if (corr.request_status === 'approved') statusBadge = <span className="badge-status-approved">تم القبول والتعديل 🟢</span>;
                        else if (corr.request_status === 'rejected') statusBadge = <span className="badge-status-rejected">مرفوض 🔴</span>;

                        return (
                          <tr key={corr.id}>
                            <td style={{ fontWeight: 'bold', fontSize: '13px' }}>{corr.teacher_name}</td>
                            <td style={{ fontSize: '12px' }}>{corr.date}</td>
                            <td style={{ fontSize: '13px' }}>{reqText}</td>
                            <td>{statusBadge}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* المودال المخصص الفاخر لتأكيد التحضير */}
      {modalConfig.show && (
        <div className="custom-modal-overlay no-print">
          <div className="custom-modal">
            <div className="custom-modal-header">
              <lord-icon
                src={modalConfig.type === 'warning' ? "https://cdn.lordicon.com/usxfxwpp.json" : "https://cdn.lordicon.com/oqdmwree.json"}
                trigger="loop"
                colors={modalConfig.type === 'warning' ? "primary:#B45309" : "primary:#15445A"}
                style={{ width: '32px', height: '32px' }}
              ></lord-icon>
              <h3 className="custom-modal-title">{modalConfig.title}</h3>
            </div>
            <div className="custom-modal-body">
              <p>{modalConfig.message}</p>
              {modalConfig.unverifiedList.length > 0 && (
                <ul className="unverified-list">
                  {modalConfig.unverifiedList.map((name, i) => <li key={i}>• {name}</li>)}
                </ul>
              )}
            </div>
            <div className="custom-modal-actions">
              <button 
                onClick={() => setModalConfig(prev => ({ ...prev, show: false }))} 
                className="btn btn-secondary"
                style={{ padding: '6px 15px', fontSize: '14px' }}
              >
                إلغاء والعودة للمراجعة
              </button>
              <button 
                onClick={() => {
                  modalConfig.onConfirm();
                }} 
                className="btn btn-navy"
                style={{ padding: '6px 15px', fontSize: '14px' }}
              >
                {modalConfig.type === 'warning' ? 'نعم، هم حاضرون (متابعة)' : 'موافق، إرسال وتأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      <OfficialFooter />

      <style jsx>{`
        .employee-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--light-gray);
        }
        .employee-navbar {
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
          font-size: 17px;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }
        .nav-btn:hover, .nav-btn.active {
          color: var(--primary-navy);
          background-color: rgba(21, 68, 90, 0.05);
        }
        .employee-main-content {
          flex: 1;
          padding: 30px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }
        .date-select-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
        }
        .date-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .date-picker-label {
          font-weight: 700;
          color: var(--primary-navy);
          font-size: 17px;
          white-space: nowrap;
        }
        .message-alert {
          padding: 15px;
          border-radius: var(--radius-sm);
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 25px;
          text-align: right;
        }
        .alert-success {
          background-color: #DEF7EC;
          border: 1px solid #BCF0DA;
          color: #03543F;
        }
        .alert-danger {
          background-color: #FDE8E8;
          border: 1px solid #FBD5D5;
          color: #9B1C1C;
        }
        .attendance-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 25px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
        }
        .card-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 20px;
          border-right: 4px solid var(--secondary-green);
          padding-right: 10px;
        }
        .teacher-name-cell {
          font-weight: 700;
          color: var(--primary-navy);
        }
        .badge-excused {
          background-color: #FEF08A;
          color: #713F12;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
        }
        .delay-badge {
          background-color: #FEE2E2;
          color: #9B1C1C;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
        }
        .ontime-badge {
          background-color: #DEF7EC;
          color: #03543F;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
        }
        .table-select, .table-time-input {
          font-size: 16px;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          width: auto;
          min-width: 150px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 25px;
        }
        .save-attendance-btn {
          padding: 12px 30px;
          font-size: 17px;
        }
        .loading-screen {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-navy);
        }
      `}</style>
    </div>
  );
}
