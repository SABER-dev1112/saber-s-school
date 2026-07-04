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

  // قراءة معامل tab من الرابط (?tab=corrections) بدون useSearchParams
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'corrections') {
        setActiveTab('corrections');
      }
    }
  }, []);

  // لتبويب طلبات التعديل
  const [correctionsList, setCorrectionsList] = useState([]);
  const [selectedCorrectionTeacherId, setSelectedCorrectionTeacherId] = useState('');
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState('present');
  const [correctionTime, setCorrectionTime] = useState('07:00');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // التبويبات الفرعية الجديدة
  const [activeSubTab, setActiveSubTab] = useState('general'); // 'general' | 'assembly' | 'classes'
  const [activeClassModalTeacher, setActiveClassModalTeacher] = useState(null);
  const [modalClassDelays, setModalClassDelays] = useState([]);

  // حقول تصحيح الطابور والحصص الجديدة
  const [correctionAssemblyStatus, setCorrectionAssemblyStatus] = useState('present');
  const [correctionAssemblyTime, setCorrectionAssemblyTime] = useState('06:30');
  const [correctionAssemblyDelayMinutes, setCorrectionAssemblyDelayMinutes] = useState(0);
  const [correctionAssemblyEntryMode, setCorrectionAssemblyEntryMode] = useState('minutes');
  const [correctionClassDelays, setCorrectionClassDelays] = useState([]);

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
              assembly_status: 'present',
              assembly_check_in_time: '',
              assembly_delay_minutes: 0,
              class_delays: [],
              locked: true
            };
            verifiedMap[teacher.id] = true; // الإجازات معتمدة ومراجعة تلقائياً
          } else if (existingRecord) {
            attendanceMap[teacher.id] = {
              status: existingRecord.status,
              check_in_time: existingRecord.check_in_time || '',
              delay_minutes: existingRecord.delay_minutes || 0,
              assembly_status: existingRecord.assembly_status || 'present',
              assembly_check_in_time: existingRecord.assembly_check_in_time || '',
              assembly_delay_minutes: existingRecord.assembly_delay_minutes || 0,
              class_delays: existingRecord.class_delays || [],
              locked: false
            };
            verifiedMap[teacher.id] = true; // الحضور المسجل سابقاً مراجع ومؤكد
          } else {
            attendanceMap[teacher.id] = {
              status: 'present',
              check_in_time: '',   // فارغ = حضر في الموعد (قبل أو عند 6:50)
              delay_minutes: 0,
              isLate: false,       // افتراضياً: حضر في الموعد
              assembly_status: 'present',
              assembly_check_in_time: '',
              assembly_delay_minutes: 0,
              class_delays: [],
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

  // تبديل حالة التأخير (في الموعد / متأخر) لمعلم
  const handleLateToggle = (teacherId, isLate) => {
    setAttendance(prev => {
      const updated = { ...prev };
      updated[teacherId] = {
        ...updated[teacherId],
        isLate,
        // عند التأخير: ضع الوقت الافتراضي؛ عند الحضور في الموعد: امسح الوقت والتأخير
        check_in_time: isLate ? (updated[teacherId].check_in_time || settings?.start_time || '06:50') : '',
        delay_minutes: isLate ? calculateLateness(updated[teacherId].check_in_time || settings?.start_time || '06:50', settings?.start_time || '06:50') : 0
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [teacherId]: true }));
  };

  // تحديث حالة الحضور لمعلم (حاضر / غائب / إجازة)
  const handleStatusChange = (teacherId, status) => {
    setAttendance(prev => {
      const updated = { ...prev };
      updated[teacherId] = {
        ...updated[teacherId],
        status,
        check_in_time: '',
        delay_minutes: 0,
        isLate: false
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [teacherId]: true }));
  };

  // تحديث وقت الحضور الفعلي عند التأخير
  const handleTimeChange = (teacherId, checkInTime) => {
    setAttendance(prev => {
      const updated = { ...prev };
      const delay = settings ? calculateLateness(checkInTime, settings.start_time) : 0;
      updated[teacherId] = {
        ...updated[teacherId],
        check_in_time: checkInTime,
        delay_minutes: delay
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [teacherId]: true }));
  };

  // تأكيد فردي لمعلم
  const handleToggleVerify = (teacherId) => {
    setVerified(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  // معالجة تغيير حالة طابور الصباح
  const handleAssemblyStatusChange = (teacherId, assemblyStatus) => {
    setAttendance(prev => {
      const updated = { ...prev };
      const startTime = settings?.assembly_start_time || '06:30';
      updated[teacherId] = {
        ...updated[teacherId],
        assembly_status: assemblyStatus,
        assembly_check_in_time: assemblyStatus === 'late' ? (updated[teacherId].assembly_check_in_time || startTime) : '',
        assembly_delay_minutes: assemblyStatus === 'late' ? (updated[teacherId].assembly_delay_minutes || 5) : 0,
        assembly_entry_mode: updated[teacherId].assembly_entry_mode || 'minutes'
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [teacherId]: true }));
  };

  const handleAssemblyEntryModeChange = (teacherId, mode) => {
    setAttendance(prev => {
      const updated = { ...prev };
      updated[teacherId] = {
        ...updated[teacherId],
        assembly_entry_mode: mode
      };
      return updated;
    });
  };

  const handleAssemblyMinutesChange = (teacherId, minutes) => {
    setAttendance(prev => {
      const updated = { ...prev };
      updated[teacherId] = {
        ...updated[teacherId],
        assembly_delay_minutes: parseInt(minutes) || 0
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [teacherId]: true }));
  };

  const handleAssemblyTimeChange = (teacherId, time) => {
    setAttendance(prev => {
      const updated = { ...prev };
      const startTime = settings?.assembly_start_time || '06:30';
      const delay = calculateLateness(time, startTime);
      updated[teacherId] = {
        ...updated[teacherId],
        assembly_check_in_time: time,
        assembly_delay_minutes: delay
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [teacherId]: true }));
  };

  // دوال مودال الحصص
  const openClassDelaysModal = (teacher) => {
    setActiveClassModalTeacher(teacher);
    const rec = attendance[teacher.id] || {};
    setModalClassDelays(rec.class_delays || []);
  };

  const addClassDelayRow = () => {
    setModalClassDelays(prev => [
      ...prev,
      { class_number: 1, status: 'late', delay_minutes: 5, notes: '' }
    ]);
  };

  const updateClassDelayRow = (index, field, value) => {
    setModalClassDelays(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeClassDelayRow = (index) => {
    setModalClassDelays(prev => prev.filter((_, i) => i !== index));
  };

  const saveClassDelaysModal = () => {
    if (!activeClassModalTeacher) return;
    setAttendance(prev => {
      const updated = { ...prev };
      updated[activeClassModalTeacher.id] = {
        ...updated[activeClassModalTeacher.id],
        class_delays: modalClassDelays
      };
      return updated;
    });
    setVerified(prev => ({ ...prev, [activeClassModalTeacher.id]: true }));
    setActiveClassModalTeacher(null);
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
          delay_minutes: item.delay_minutes || 0,
          assembly_status: item.status === 'present' ? (item.assembly_status || 'present') : 'present',
          assembly_check_in_time: item.status === 'present' ? (item.assembly_check_in_time || null) : null,
          assembly_delay_minutes: item.status === 'present' ? (item.assembly_delay_minutes || 0) : 0,
          class_delays: item.status === 'present' ? (item.class_delays || []) : []
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

      let assemblyDelay = 0;
      if (correctionStatus === 'present' && correctionAssemblyStatus === 'late') {
        if (correctionAssemblyEntryMode === 'time') {
          assemblyDelay = calculateLateness(correctionAssemblyTime, settings?.assembly_start_time || '06:30');
        } else {
          assemblyDelay = parseInt(correctionAssemblyDelayMinutes) || 0;
        }
      }

      await db.submitCorrection(
        selectedCorrectionTeacherId,
        teacherName,
        correctionDate,
        correctionStatus,
        correctionStatus === 'present' ? correctionTime : null,
        delay,
        correctionStatus === 'present' ? correctionAssemblyStatus : 'present',
        correctionStatus === 'present' && correctionAssemblyStatus === 'late' && correctionAssemblyEntryMode === 'time' ? correctionAssemblyTime : null,
        correctionStatus === 'present' ? assemblyDelay : 0,
        correctionStatus === 'present' ? correctionClassDelays : [],
        correctionReason
      );

      const updated = await db.getCorrections();
      setCorrectionsList(updated);

      setCorrectionDate('');
      setCorrectionReason('');
      setCorrectionClassDelays([]);
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
          <button onClick={() => window.location.href = '/employee/teachers'} className="nav-btn">إدارة المعلمين</button>
          <button onClick={() => window.location.href = '/employee/password'} className="nav-btn">تغيير كلمة المرور</button>
        </div>
        <button onClick={() => { sessionStorage.removeItem('userRole'); window.location.href = '/'; }} className="btn btn-danger logout-btn">تسجيل الخروج</button>
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
              <div className="employee-filter-grid">
                <div className="date-picker-wrapper">
                  <label className="date-picker-label">تاريخ التحضير (هجري):</label>
                  <HijriDatePicker value={date} onChange={setDate} placeholder="اختر اليوم التحضيري" />
                </div>
                
                {/* شريط البحث */}
                <div className="search-bar-wrapper">
                  <label className="date-picker-label">البحث عن معلم:</label>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم المعلم أو التخصص..." 
                    className="form-input search-input" 
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

              <div className="sub-tabs-container no-print">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('general')}
                  className={`sub-tab-btn ${activeSubTab === 'general' ? 'active' : ''}`}
                >
                  التحضير الصباحي العام
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('assembly')}
                  className={`sub-tab-btn ${activeSubTab === 'assembly' ? 'active' : ''}`}
                >
                  طابور الصباح
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('classes')}
                  className={`sub-tab-btn ${activeSubTab === 'classes' ? 'active' : ''}`}
                >
                  تأخر وغياب الحصص
                </button>
              </div>
              
              <div className="table-container desktop-only-table">
                <table>
                  <thead>
                    {activeSubTab === 'general' && (
                      <tr>
                        <th>اسم المعلم</th>
                        <th>التخصص</th>
                        <th>الحالة اليومية</th>
                        <th>وقت الحضور الفعلي</th>
                        <th>مقدار التأخير</th>
                        <th className="no-print">المراجعة والتأكيد</th>
                      </tr>
                    )}
                    {activeSubTab === 'assembly' && (
                      <tr>
                        <th>اسم المعلم</th>
                        <th>التخصص</th>
                        <th>حالة الطابور</th>
                        <th>إدخال التأخر</th>
                        <th>مقدار تأخير الطابور</th>
                        <th className="no-print">المراجعة والتأكيد</th>
                      </tr>
                    )}
                    {activeSubTab === 'classes' && (
                      <tr>
                        <th>اسم المعلم</th>
                        <th>التخصص</th>
                        <th>الحصص المتأخر/الغائب عنها</th>
                        <th>إجراء</th>
                        <th className="no-print">المراجعة والتأكيد</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={activeSubTab === 'classes' ? "5" : "6"} style={{ textAlign: 'center', padding: '30px' }}>
                          لا يوجد معلمين مطابقين للبحث أو لم يتم تسجيل أي معلمين في النظام بعد.
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map(teacher => {
                        const record = attendance[teacher.id] || { status: 'present', check_in_time: '', delay_minutes: 0, isLate: false, locked: false, assembly_status: 'present', assembly_check_in_time: '', assembly_delay_minutes: 0, class_delays: [] };
                        const isTeacherVerified = !!verified[teacher.id];
                        const isDisabled = isSubmitted || record.locked || record.status === 'absent' || record.status === 'excused';

                        return (
                          <tr key={teacher.id}>
                            <td className="teacher-name-cell">{teacher.name}</td>
                            <td>{teacher.extra_info?.specialty || '-'}</td>
                            
                            {/* 1. تبويب التحضير العام */}
                            {activeSubTab === 'general' && (
                              <>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                          type="button"
                                          disabled={isSubmitted}
                                          onClick={() => handleLateToggle(teacher.id, false)}
                                          className={`late-toggle-btn ${!record.isLate ? 'active-ontime' : ''}`}
                                        >
                                          ✓ في الموعد
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isSubmitted}
                                          onClick={() => handleLateToggle(teacher.id, true)}
                                          className={`late-toggle-btn ${record.isLate ? 'active-late' : ''}`}
                                        >
                                          ⌛ متأخر
                                        </button>
                                      </div>
                                      {record.isLate && (
                                        <input
                                          type="time"
                                          value={record.check_in_time}
                                          onChange={(e) => handleTimeChange(teacher.id, e.target.value)}
                                          disabled={isSubmitted}
                                          className="table-time-input"
                                        />
                                      )}
                                    </div>
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
                              </>
                            )}

                            {/* 2. تبويب طابور الصباح */}
                            {activeSubTab === 'assembly' && (
                              <>
                                <td>
                                  <select
                                    value={record.status !== 'present' ? 'absent' : (record.assembly_status || 'present')}
                                    onChange={(e) => handleAssemblyStatusChange(teacher.id, e.target.value)}
                                    disabled={isDisabled}
                                    className="table-select"
                                  >
                                    <option value="present">✓ حضر في الموعد</option>
                                    <option value="late">⌛ متأخر عن الطابور</option>
                                    <option value="absent">❌ غاب عن الطابور</option>
                                  </select>
                                </td>
                                <td>
                                  {record.status === 'present' && record.assembly_status === 'late' && !record.locked ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <select
                                        value={record.assembly_entry_mode || 'minutes'}
                                        onChange={(e) => handleAssemblyEntryModeChange(teacher.id, e.target.value)}
                                        disabled={isSubmitted}
                                        className="table-select"
                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                      >
                                        <option value="minutes">إدخال الدقائق مباشرة</option>
                                        <option value="time">إدخال وقت الحضور</option>
                                      </select>
                                      {record.assembly_entry_mode === 'time' ? (
                                        <input
                                          type="time"
                                          value={record.assembly_check_in_time || '06:30'}
                                          onChange={(e) => handleAssemblyTimeChange(teacher.id, e.target.value)}
                                          disabled={isSubmitted}
                                          className="table-time-input"
                                        />
                                      ) : (
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="الدقائق"
                                          value={record.assembly_delay_minutes || ''}
                                          onChange={(e) => handleAssemblyMinutesChange(teacher.id, e.target.value)}
                                          disabled={isSubmitted}
                                          className="table-time-input"
                                          style={{ padding: '4px 8px' }}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#aaa' }}>-</span>
                                  )}
                                </td>
                                <td>
                                  {record.status !== 'present' ? (
                                    <span style={{ color: '#aaa' }}>-</span>
                                  ) : record.assembly_status === 'late' && record.assembly_delay_minutes > 0 ? (
                                    <span className="delay-badge">
                                      {formatMinutesToHoursAndMinutes(record.assembly_delay_minutes)} تأخير
                                    </span>
                                  ) : record.assembly_status === 'absent' ? (
                                    <span className="class-absent-badge">غائب عن الطابور</span>
                                  ) : (
                                    <span className="ontime-badge">في الموعد</span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* 3. تبويب تأخر وغياب الحصص */}
                            {activeSubTab === 'classes' && (
                              <>
                                <td>
                                  {record.status !== 'present' ? (
                                    <span style={{ color: '#aaa' }}>-</span>
                                  ) : (!record.class_delays || record.class_delays.length === 0) ? (
                                    <span className="ontime-badge">ملتزم بالحصص</span>
                                  ) : (
                                    <div className="class-delays-summary-list">
                                      {record.class_delays.map((cd, index) => (
                                        <div key={index} className={`class-delay-summary-item ${cd.status}`}>
                                          <span>الحصة {cd.class_number}:</span>
                                          {cd.status === 'late' ? (
                                            <span className="delay-minutes-badge">متأخر {cd.delay_minutes} د</span>
                                          ) : (
                                            <span className="class-absent-badge">غياب</span>
                                          )}
                                          {cd.notes && <span style={{ fontSize: '11px', color: '#666', marginRight: '5px' }}>({cd.notes})</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {record.status === 'present' && !record.locked ? (
                                    <button
                                      type="button"
                                      onClick={() => openClassDelaysModal(teacher)}
                                      disabled={isSubmitted}
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '13px' }}
                                    >
                                      📝 تسجيل الحصص
                                    </button>
                                  ) : (
                                    <span style={{ color: '#aaa' }}>-</span>
                                  )}
                                </td>
                              </>
                            )}

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

              {/* بطاقات التحضير المخصصة للهاتف المحمول */}
              <div className="mobile-only-cards no-print">
                {filteredTeachers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    لا يوجد معلمين مطابقين للبحث.
                  </div>
                ) : (
                  filteredTeachers.map(teacher => {
                    const record = attendance[teacher.id] || { status: 'present', check_in_time: '', delay_minutes: 0, isLate: false, locked: false, assembly_status: 'present', assembly_check_in_time: '', assembly_delay_minutes: 0, class_delays: [] };
                    const isTeacherVerified = !!verified[teacher.id];
                    const isDisabled = isSubmitted || record.locked || record.status === 'absent' || record.status === 'excused';

                    return (
                      <div key={teacher.id} className={`teacher-mobile-card ${isTeacherVerified ? 'card-verified' : ''}`}>
                        <div className="card-header-mobile">
                          <div>
                            <div className="teacher-name-mobile">{teacher.name}</div>
                            <div className="teacher-specialty-mobile">{teacher.extra_info?.specialty || '-'}</div>
                          </div>
                          <button
                            type="button"
                            disabled={isSubmitted || record.locked}
                            onClick={() => handleToggleVerify(teacher.id)}
                            className={`btn-verify-mobile ${isTeacherVerified ? 'verified' : ''}`}
                          >
                            {isTeacherVerified ? '✓ تم' : '🔔'}
                          </button>
                        </div>

                        <div className="card-body-mobile">
                          {/* 1. التحضير العام في الموبايل */}
                          {activeSubTab === 'general' && (
                            <>
                              {/* الحالة اليومية */}
                              <div className="card-field-mobile">
                                <span className="field-label-mobile">الحالة:</span>
                                {record.locked ? (
                                  <span className="badge-excused" style={{ fontSize: '12px' }}>[إجازة معتمدة]</span>
                                ) : (
                                  <select
                                    value={record.status}
                                    onChange={(e) => handleStatusChange(teacher.id, e.target.value)}
                                    disabled={isSubmitted}
                                    className="form-select-mobile"
                                  >
                                    <option value="present">حاضر</option>
                                    <option value="absent">غياب بدون إذن</option>
                                    <option value="emergency_pending">إجازة طارئة</option>
                                  </select>
                                )}
                              </div>

                              {/* زر في الموعد / متأخر */}
                              {record.status === 'present' && !record.locked && (
                                <div className="card-field-mobile">
                                  <span className="field-label-mobile">التوقيت:</span>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={isSubmitted}
                                      onClick={() => handleLateToggle(teacher.id, false)}
                                      className={`late-toggle-btn ${!record.isLate ? 'active-ontime' : ''}`}
                                      style={{ fontSize: '12px', padding: '4px 8px' }}
                                    >
                                      ✓ في الموعد
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSubmitted}
                                      onClick={() => handleLateToggle(teacher.id, true)}
                                      className={`late-toggle-btn ${record.isLate ? 'active-late' : ''}`}
                                      style={{ fontSize: '12px', padding: '4px 8px' }}
                                    >
                                      ⌛ متأخر
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* حقل الوقت عند التأخير */}
                              {record.status === 'present' && !record.locked && record.isLate && (
                                <div className="card-field-mobile">
                                  <span className="field-label-mobile">وقت الحضور:</span>
                                  <input
                                    type="time"
                                    value={record.check_in_time}
                                    onChange={(e) => handleTimeChange(teacher.id, e.target.value)}
                                    disabled={isSubmitted}
                                    className="form-time-input-mobile"
                                  />
                                </div>
                              )}

                              {/* مقدار التأخير */}
                              <div className="card-field-mobile" style={{ border: 'none', paddingBottom: 0 }}>
                                <span className="field-label-mobile">التأخير:</span>
                                {record.status === 'present' && record.delay_minutes > 0 ? (
                                  <span className="delay-badge" style={{ fontSize: '12px' }}>
                                    {formatMinutesToHoursAndMinutes(record.delay_minutes)} تأخير
                                  </span>
                                ) : record.status === 'present' ? (
                                  <span className="ontime-badge" style={{ fontSize: '12px' }}>في الموعد</span>
                                ) : (
                                  <span style={{ color: '#aaa' }}>-</span>
                                )}
                              </div>
                            </>
                          )}

                          {/* 2. طابور الصباح في الموبايل */}
                          {activeSubTab === 'assembly' && (
                            <>
                              <div className="card-field-mobile">
                                <span className="field-label-mobile">حالة الطابور:</span>
                                <select
                                  value={record.status !== 'present' ? 'absent' : (record.assembly_status || 'present')}
                                  onChange={(e) => handleAssemblyStatusChange(teacher.id, e.target.value)}
                                  disabled={isDisabled}
                                  className="form-select-mobile"
                                >
                                  <option value="present">✓ حضر</option>
                                  <option value="late">⌛ متأخر</option>
                                  <option value="absent">❌ غائب</option>
                                </select>
                              </div>

                              {record.status === 'present' && record.assembly_status === 'late' && !record.locked && (
                                <>
                                  <div className="card-field-mobile">
                                    <span className="field-label-mobile">طريقة الحساب:</span>
                                    <select
                                      value={record.assembly_entry_mode || 'minutes'}
                                      onChange={(e) => handleAssemblyEntryModeChange(teacher.id, e.target.value)}
                                      disabled={isSubmitted}
                                      className="form-select-mobile"
                                    >
                                      <option value="minutes">دقائق مباشرة</option>
                                      <option value="time">وقت الحضور</option>
                                    </select>
                                  </div>
                                  <div className="card-field-mobile">
                                    <span className="field-label-mobile">قيمة التأخير:</span>
                                    {record.assembly_entry_mode === 'time' ? (
                                      <input
                                        type="time"
                                        value={record.assembly_check_in_time || '06:30'}
                                        onChange={(e) => handleAssemblyTimeChange(teacher.id, e.target.value)}
                                        disabled={isSubmitted}
                                        className="form-time-input-mobile"
                                      />
                                    ) : (
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="الدقائق"
                                        value={record.assembly_delay_minutes || ''}
                                        onChange={(e) => handleAssemblyMinutesChange(teacher.id, e.target.value)}
                                        disabled={isSubmitted}
                                        className="form-time-input-mobile"
                                        style={{ width: '80px' }}
                                      />
                                    )}
                                  </div>
                                </>
                              )}

                              <div className="card-field-mobile" style={{ border: 'none', paddingBottom: 0 }}>
                                <span className="field-label-mobile">تأخير الطابور:</span>
                                {record.status !== 'present' ? (
                                  <span style={{ color: '#aaa' }}>-</span>
                                ) : record.assembly_status === 'late' && record.assembly_delay_minutes > 0 ? (
                                  <span className="delay-badge" style={{ fontSize: '12px' }}>
                                    {formatMinutesToHoursAndMinutes(record.assembly_delay_minutes)} تأخير
                                  </span>
                                ) : record.assembly_status === 'absent' ? (
                                  <span className="class-absent-badge" style={{ fontSize: '12px' }}>غائب عن الطابور</span>
                                ) : (
                                  <span className="ontime-badge" style={{ fontSize: '12px' }}>في الموعد</span>
                                )}
                              </div>
                            </>
                          )}

                          {/* 3. تأخر وغياب الحصص في الموبايل */}
                          {activeSubTab === 'classes' && (
                            <>
                              <div className="card-field-mobile" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                                <span className="field-label-mobile">الحصص المسجلة:</span>
                                {record.status !== 'present' ? (
                                  <span style={{ color: '#aaa' }}>-</span>
                                ) : (!record.class_delays || record.class_delays.length === 0) ? (
                                  <span className="ontime-badge" style={{ alignSelf: 'flex-start', fontSize: '12px' }}>ملتزم بالحصص</span>
                                ) : (
                                  <div className="class-delays-summary-list" style={{ width: '100%' }}>
                                    {record.class_delays.map((cd, index) => (
                                      <div key={index} className={`class-delay-summary-item ${cd.status}`}>
                                        <span>الحصة {cd.class_number}:</span>
                                        {cd.status === 'late' ? (
                                          <span className="delay-minutes-badge">متأخر {cd.delay_minutes} د</span>
                                        ) : (
                                          <span className="class-absent-badge">غياب</span>
                                        )}
                                        {cd.notes && <span style={{ fontSize: '11px', color: '#666', marginRight: '5px' }}>({cd.notes})</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {record.status === 'present' && !record.locked && (
                                <div className="card-field-mobile" style={{ border: 'none', paddingBottom: 0 }}>
                                  <span className="field-label-mobile">الإجراء:</span>
                                  <button
                                    type="button"
                                    onClick={() => openClassDelaysModal(teacher)}
                                    disabled={isSubmitted}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                  >
                                    📝 تسجيل الحصص
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
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
                  <>
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

                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', border: '1px solid var(--border-gray)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-navy)', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>تصحيح طابور الصباح والحصص:</h3>
                      
                      {/* تصحيح الطابور */}
                      <div className="form-group">
                        <label className="form-label">حالة الطابور المطلوبة</label>
                        <select
                          value={correctionAssemblyStatus}
                          onChange={(e) => setCorrectionAssemblyStatus(e.target.value)}
                          className="form-select"
                        >
                          <option value="present">حضر في الموعد</option>
                          <option value="late">متأخر عن الطابور</option>
                          <option value="absent">غائب عن الطابور</option>
                        </select>
                      </div>

                      {correctionAssemblyStatus === 'late' && (
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label className="form-label">طريقة تصحيح تأخير الطابور</label>
                          <select
                            value={correctionAssemblyEntryMode}
                            onChange={(e) => setCorrectionAssemblyEntryMode(e.target.value)}
                            className="form-select"
                          >
                            <option value="minutes">دقائق مباشرة</option>
                            <option value="time">وقت الحضور الفعلي للطابور</option>
                          </select>

                          {correctionAssemblyEntryMode === 'time' ? (
                            <div>
                              <label className="form-label">وقت حضور الطابور الفعلي الجديد</label>
                              <input
                                type="time"
                                value={correctionAssemblyTime}
                                onChange={(e) => setCorrectionAssemblyTime(e.target.value)}
                                className="form-input"
                                required
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="form-label">عدد دقائق التأخير المطلوبة</label>
                              <input
                                type="number"
                                min="1"
                                value={correctionAssemblyDelayMinutes}
                                onChange={(e) => setCorrectionAssemblyDelayMinutes(parseInt(e.target.value) || 0)}
                                className="form-input"
                                required
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* تصحيح الحصص */}
                      <div style={{ marginTop: '10px' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>إجراءات الحصص المطلوب تصحيحها:</label>
                        {correctionClassDelays.length === 0 ? (
                          <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginBottom: '8px' }}>لا توجد تعديلات حصص مضافة.</p>
                        ) : (
                          correctionClassDelays.map((cd, index) => (
                            <div key={index} className="class-delay-entry-row" style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '8px', marginBottom: '8px' }}>
                              <select
                                value={cd.class_number}
                                onChange={(e) => {
                                  const updated = [...correctionClassDelays];
                                  updated[index].class_number = parseInt(e.target.value);
                                  setCorrectionClassDelays(updated);
                                }}
                                className="form-select"
                                style={{ padding: '4px', fontSize: '12px' }}
                              >
                                {[1,2,3,4,5,6,7].map(num => (
                                  <option key={num} value={num}>الحصة {num}</option>
                                ))}
                              </select>
                              <select
                                value={cd.status}
                                onChange={(e) => {
                                  const updated = [...correctionClassDelays];
                                  updated[index].status = e.target.value;
                                  setCorrectionClassDelays(updated);
                                }}
                                className="form-select"
                                style={{ padding: '4px', fontSize: '12px' }}
                              >
                                <option value="late">تأخر</option>
                                <option value="absent">غياب</option>
                              </select>
                              <input
                                type="number"
                                min="1"
                                disabled={cd.status === 'absent'}
                                value={cd.status === 'absent' ? '' : cd.delay_minutes}
                                onChange={(e) => {
                                  const updated = [...correctionClassDelays];
                                  updated[index].delay_minutes = parseInt(e.target.value) || 0;
                                  setCorrectionClassDelays(updated);
                                }}
                                placeholder="الدقائق"
                                className="form-input"
                                style={{ padding: '4px', fontSize: '12px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setCorrectionClassDelays(correctionClassDelays.filter((_, i) => i !== index))}
                                className="btn-remove-row"
                              >
                                🗑️
                              </button>
                              <input
                                type="text"
                                value={cd.notes || ''}
                                onChange={(e) => {
                                  const updated = [...correctionClassDelays];
                                  updated[index].notes = e.target.value;
                                  setCorrectionClassDelays(updated);
                                }}
                                placeholder="ملاحظات الحصة..."
                                className="class-notes-input"
                                style={{ gridColumn: 'span 4' }}
                              />
                            </div>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => setCorrectionClassDelays([...correctionClassDelays, { class_number: 1, status: 'late', delay_minutes: 5, notes: '' }])}
                          className="btn-add-class-action"
                          style={{ fontSize: '12px', padding: '6px' }}
                        >
                          ➕ إضافة حصة للتصحيح
                        </button>
                      </div>
                    </div>
                  </>
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

      {/* مودال إدخال تأخير وغياب الحصص الديناميكي */}
      {activeClassModalTeacher && (
        <div className="modal-overlay-class no-print">
          <div className="modal-content-class">
            <h3 className="custom-modal-title" style={{ marginBottom: '15px' }}>
              تسجيل الحصص للمعلم: {activeClassModalTeacher.name}
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              {modalClassDelays.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #ccc' }}>
                  لا يوجد أي تأخير أو غياب مسجل للحصص اليوم لهذا المعلم.
                </p>
              ) : (
                modalClassDelays.map((cd, index) => (
                  <div key={index} className="class-delay-entry-row">
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', color: 'var(--text-light)', marginBottom: '4px' }}>رقم الحصة</label>
                      <select
                        value={cd.class_number}
                        onChange={(e) => updateClassDelayRow(index, 'class_number', parseInt(e.target.value))}
                        className="form-select"
                        style={{ padding: '6px', fontSize: '13px' }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map(num => (
                          <option key={num} value={num}>الحصة {num}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', color: 'var(--text-light)', marginBottom: '4px' }}>نوع الإجراء</label>
                      <select
                        value={cd.status}
                        onChange={(e) => updateClassDelayRow(index, 'status', e.target.value)}
                        className="form-select"
                        style={{ padding: '6px', fontSize: '13px' }}
                      >
                        <option value="late">⌛ تأخر عن الحصة</option>
                        <option value="absent">❌ غياب عن الحصة</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', display: 'block', color: 'var(--text-light)', marginBottom: '4px' }}>دقائق التأخير</label>
                      <input
                        type="number"
                        min="1"
                        disabled={cd.status === 'absent'}
                        value={cd.status === 'absent' ? '' : cd.delay_minutes}
                        onChange={(e) => updateClassDelayRow(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                        className="form-input"
                        placeholder="الدقائق"
                        style={{ padding: '6px', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeClassDelayRow(index)}
                        className="btn-remove-row"
                        title="حذف هذا الإجراء"
                      >
                        🗑️
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cd.notes || ''}
                      onChange={(e) => updateClassDelayRow(index, 'notes', e.target.value)}
                      placeholder="تفاصيل إضافية / ملاحظات (اختياري)..."
                      className="class-notes-input"
                    />
                  </div>
                ))
              )}
            </div>
            
            <button
              type="button"
              onClick={addClassDelayRow}
              className="btn-add-class-action"
            >
              ➕ إضافة إجراء حصة جديد
            </button>
            
            <div className="custom-modal-actions" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <button
                type="button"
                onClick={() => setActiveClassModalTeacher(null)}
                className="btn btn-secondary"
                style={{ padding: '6px 15px', fontSize: '14px' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveClassDelaysModal}
                className="btn btn-navy"
                style={{ padding: '6px 15px', fontSize: '14px' }}
              >
                حفظ الحصص
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
          max-width: 100vw;
          overflow-x: hidden;
          position: relative;
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
