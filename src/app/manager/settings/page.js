'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OfficialHeader from '../../../components/layout/OfficialHeader';
import OfficialFooter from '../../../components/layout/OfficialFooter';
import db from '../../../services/db';
import { fetchSaudiHolidays } from '../../../services/holidays';
import { gregorianToHijriLong } from '../../../core/calendar';

export default function ManagerSettingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [settings, setSettings] = useState(null);
  
  // حقول تعديل الإعدادات الأساسية
  const [schoolName, setSchoolName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [city, setCity] = useState('');
  const [semester, setSemester] = useState('');
  const [domain, setDomain] = useState('');

  // إعدادات الحقول الديناميكية الجديدة
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // إعدادات الإجازات الرسمية الجديدة
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [apiHolidays, setApiHolidays] = useState([]);
  const [fetchingHolidays, setFetchingHolidays] = useState(false);

  // إعدادات كلمات المرور
  const [managerPassword, setManagerPassword] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');

  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);

  // حماية الصفحة
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'manager') {
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  // تحميل الإعدادات
  useEffect(() => {
    if (!authorized) return;
    loadSettings();
  }, [authorized]);

  const loadSettings = async () => {
    try {
      const data = await db.getSettings();
      setSettings(data);
      setSchoolName(data.school_name);
      setManagerName(data.manager_name);
      setStartTime(data.start_time);
      setCity(data.header_metadata?.city || '');
      setSemester(data.header_metadata?.semester || '');
      setDomain(data.header_metadata?.domain || '');
    } catch (err) {
      console.error(err);
    }
  };

  // حفظ الإعدادات الأساسية والترويسة
  const handleSaveBasicSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await db.updateSettings({
        school_name: schoolName,
        manager_name: managerName,
        start_time: startTime,
        header_metadata: { city, semester, domain }
      });
      setMessage({ text: 'تم حفظ الإعدادات الأساسية بنجاح.', type: 'success' });
      loadSettings();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'فشل في حفظ الإعدادات.', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // إضافة حقل مخصص جديد للمعلمين
  const handleAddCustomField = async (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    try {
      const currentFields = settings?.custom_fields || [];
      const fieldId = 'field_' + Date.now();
      
      const newField = {
        id: fieldId,
        name: newFieldName,
        type: newFieldType,
        required: newFieldRequired,
        options: newFieldType === 'select' 
          ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
          : []
      };

      const updatedFields = [...currentFields, newField];
      await db.updateSettings({ custom_fields: updatedFields });
      
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldRequired(false);
      setNewFieldOptions('');
      
      setMessage({ text: 'تم إضافة الحقل المخصص بنجاح.', type: 'success' });
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  // حذف حقل مخصص
  const handleDeleteCustomField = async (fieldId) => {
    if (!confirm('هل تريد حذف هذا الحقل؟ قد يؤدي هذا لاختفاء بيانات هذا الحقل للمعلمين المسجلين سابقاً!')) return;
    try {
      const currentFields = settings?.custom_fields || [];
      const updatedFields = currentFields.filter(f => f.id !== fieldId);
      await db.updateSettings({ custom_fields: updatedFields });
      setMessage({ text: 'تم حذف الحقل المخصص بنجاح.', type: 'success' });
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  // إضافة إجازة رسمية يدوياً
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return;

    try {
      const currentHolidays = settings?.official_holidays || [];
      
      if (currentHolidays.some(h => h.date === newHolidayDate)) {
        alert('هذا التاريخ مضاف بالفعل كإجازة.');
        return;
      }

      const updatedHolidays = [
        ...currentHolidays,
        { date: newHolidayDate, name: newHolidayName }
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      await db.updateSettings({ official_holidays: updatedHolidays });
      
      setNewHolidayDate('');
      setNewHolidayName('');
      setMessage({ text: 'تم إضافة الإجازة الرسمية بنجاح.', type: 'success' });
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  // جلب إجازات السعودية من الـ API
  const handleFetchSaudiHolidays = async () => {
    setFetchingHolidays(true);
    setApiHolidays([]);
    try {
      const holidays = await fetchSaudiHolidays(holidayYear);
      setApiHolidays(holidays);
    } catch (err) {
      console.error(err);
      alert('فشل في جلب الإجازات من الخادم.');
    } finally {
      setFetchingHolidays(false);
    }
  };

  // إضافة الإجازة المجلوبة من الـ API لقائمة إجازات المدرسة
  const handleAddApiHolidayToSettings = async (holiday) => {
    try {
      const currentHolidays = settings?.official_holidays || [];
      if (currentHolidays.some(h => h.date === holiday.date)) {
        alert('الإجازة مضافة بالفعل في إعدادات المدرسة.');
        return;
      }

      const updatedHolidays = [
        ...currentHolidays,
        { date: holiday.date, name: holiday.name }
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      await db.updateSettings({ official_holidays: updatedHolidays });
      setMessage({ text: `تم دمج إجازة "${holiday.name}" بنجاح.`, type: 'success' });
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  // حذف إجازة رسمية
  const handleDeleteHoliday = async (date) => {
    if (!confirm('هل تريد حذف هذه الإجازة؟')) return;
    try {
      const currentHolidays = settings?.official_holidays || [];
      const updatedHolidays = currentHolidays.filter(h => h.date !== date);
      await db.updateSettings({ official_holidays: updatedHolidays });
      setMessage({ text: 'تم إزالة الإجازة بنجاح.', type: 'success' });
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  // تحديث كلمات المرور
  const handleUpdatePassword = async (role, passwordVal) => {
    if (!passwordVal || passwordVal.length < 4) {
      alert('يجب أن تكون كلمة المرور 4 خانات على الأقل.');
      return;
    }
    try {
      const success = await db.updatePassword(role, passwordVal);
      if (success) {
        alert('تم تحديث كلمة المرور بنجاح.');
        if (role === 'manager') setManagerPassword('');
        else setEmployeePassword('');
      } else {
        alert('فشل تحديث كلمة المرور.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!authorized) {
    return <div className="loading-screen">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div className="manager-layout">
      <OfficialHeader title="إعدادات النظام الفنية والأكاديمية" />

      {/* شريط تنقل المدير */}
      <nav className="manager-navbar no-print">
        <div className="navbar-links">
          <button onClick={() => router.push('/manager')} className="nav-btn">التقرير اليومي والداشبورد</button>
          <button onClick={() => router.push('/manager/reports')} className="nav-btn">التقارير والإحصائيات</button>
          <button className="nav-btn active">إعدادات المدرسة والحقول</button>
        </div>
        <button onClick={() => { sessionStorage.removeItem('userRole'); router.push('/'); }} className="btn btn-danger logout-btn">تسجيل الخروج</button>
      </nav>

      <main className="manager-main-content">
        
        {message.text && (
          <div className={`message-alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-grid-layout">
          
          {/* 1. الإعدادات الأساسية وعناوين الترويسة */}
          <div className="settings-card">
            <h2 className="card-title">بيانات المدرسة والترويسة الرسمية</h2>
            <form onSubmit={handleSaveBasicSettings} className="settings-form">
              <div className="form-group">
                <label className="form-label">اسم المدرسة الرسمي *</label>
                <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">اسم المدير الحالي (للتواقيع) *</label>
                <input type="text" value={managerName} onChange={(e) => setManagerName(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">وقت بداية الدوام الرسمي *</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">المدينة/إدارة التعليم *</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">الفصل الدراسي الحالي *</label>
                <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">المجال الأكاديمي (الترويسة)</label>
                <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} className="form-input" />
              </div>
              <button type="submit" disabled={saving} className="btn btn-navy save-basic-btn">
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات الأساسية'}
              </button>
            </form>
          </div>

          {/* 2. تخصيص حقول بيانات المعلمين */}
          <div className="settings-card">
            <h2 className="card-title">تخصيص حقول المعلمين الإضافية</h2>
            
            {/* الحقول المضافة حالياً */}
            <div className="custom-fields-list">
              <h3>الحقول المفعلة حالياً:</h3>
              {settings?.custom_fields?.length === 0 ? (
                <p style={{ color: '#888', fontSize: '13px' }}>لا توجد حقول مخصصة. البيانات تقتصر على الاسم فقط.</p>
              ) : (
                settings?.custom_fields?.map(field => (
                  <div key={field.id} className="custom-field-item">
                    <div>
                      <strong>{field.name}</strong> 
                      <span className="field-type-badge">({field.type === 'select' ? 'قائمة خيارات' : field.type === 'number' ? 'رقم' : 'نص'})</span>
                      {field.required && <span className="required-star"> * إلزامي</span>}
                    </div>
                    <button onClick={() => handleDeleteCustomField(field.id)} className="btn btn-danger action-delete-btn">حذف</button>
                  </div>
                ))
              )}
            </div>

            {/* نموذج إضافة حقل جديد */}
            <form onSubmit={handleAddCustomField} className="settings-form" style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
              <h3>إضافة حقل جديد:</h3>
              <div className="form-group">
                <label className="form-label">اسم الحقل (مثال: رقم السجل المدني)</label>
                <input type="text" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="أدخل اسم الحقل" required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">نوع الحقل</label>
                <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="form-select">
                  <option value="text">نص حر (Text)</option>
                  <option value="number">رقمي (Number)</option>
                  <option value="select">قائمة خيارات (Dropdown Select)</option>
                </select>
              </div>

              {newFieldType === 'select' && (
                <div className="form-group">
                  <label className="form-label">خيارات القائمة (افصل بينها بفاصلة ,)</label>
                  <input type="text" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="خيار 1, خيار 2, خيار 3" required className="form-input" />
                </div>
              )}

              <div className="form-group-toggle">
                <span className="toggle-label">جعل هذا الحقل إجبارياً عند إضافة معلم جديد</span>
                <label className="switch">
                  <input type="checkbox" id="fieldReq" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary">إضافة الحقل</button>
            </form>
          </div>

          {/* 3. إدارة الإجازات الرسمية وتنبؤ العطلات */}
          <div className="settings-card">
            <h2 className="card-title">إدارة الإجازات الرسمية (العطلات)</h2>
            
            {/* إضافة إجازة يدوية */}
            <form onSubmit={handleAddHoliday} className="settings-form" style={{ marginBottom: '20px' }}>
              <h3>إضافة إجازة يدوية:</h3>
              <div className="form-group">
                <label className="form-label">تاريخ الإجازة (ميلادي)</label>
                <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">اسم المناسبة (مثال: اليوم الوطني)</label>
                <input type="text" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} placeholder="أدخل اسم المناسبة" required className="form-input" />
              </div>
              <button type="submit" className="btn btn-primary">حفظ الإجازة</button>
            </form>

            {/* سحب من الـ API */}
            <div className="api-fetch-section" style={{ borderTop: '1px dashed #ccc', paddingTop: '20px', marginBottom: '20px' }}>
              <h3>سحب الإجازات الرسمية للمملكة العربية السعودية:</h3>
              <div className="api-fetch-controls" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input type="number" value={holidayYear} onChange={(e) => setHolidayYear(parseInt(e.target.value))} className="form-input" style={{ width: '100px' }} />
                <button onClick={handleFetchSaudiHolidays} disabled={fetchingHolidays} className="btn btn-navy">
                  {fetchingHolidays ? 'جاري الجلب...' : 'جلب العطلات الرسمية'}
                </button>
              </div>

              {apiHolidays.length > 0 && (
                <div className="api-holidays-results" style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px', padding: '10px' }}>
                  {apiHolidays.map((h, i) => (
                    <div key={i} className="api-holiday-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
                      <span style={{ fontSize: '13px' }}><strong>{h.name}</strong> ({h.date})</span>
                      <button onClick={() => handleAddApiHolidayToSettings(h)} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>دمج بالنظام</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* قائمة الإجازات الرسمية للنظام */}
            <div className="holidays-list-panel" style={{ borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
              <h3>الإجازات المعتمدة في النظام:</h3>
              {settings?.official_holidays?.length === 0 ? (
                <p style={{ color: '#888', fontSize: '13px', marginTop: '5px' }}>لا توجد إجازات رسمية مسجلة.</p>
              ) : (
                <div className="holiday-badges-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {settings?.official_holidays?.map((h, idx) => (
                    <div key={idx} className="holiday-badge-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '13px' }}><strong>{h.name}</strong> - هجري: {gregorianToHijriLong(h.date)} ({h.date})</span>
                      <button onClick={() => handleDeleteHoliday(h.date)} className="btn btn-danger" style={{ padding: '3px 8px', fontSize: '11px' }}>حذف</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* 4. تغيير كلمات مرور الحسابات */}
          <div className="settings-card">
            <h2 className="card-title">أمان النظام (كلمات المرور)</h2>
            
            <div className="password-change-block" style={{ marginBottom: '25px' }}>
              <h3>تغيير كلمة مرور المدير</h3>
              <div className="password-input-row" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input 
                  type="password" 
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور المدير الجديدة" 
                  className="form-input" 
                />
                <button onClick={() => handleUpdatePassword('manager', managerPassword)} className="btn btn-navy">حفظ</button>
              </div>
            </div>

            <div className="password-change-block" style={{ borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
              <h3>تغيير كلمة مرور الموظف المسؤول</h3>
              <div className="password-input-row" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input 
                  type="password" 
                  value={employeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  placeholder="أدخل كلمة مرور الموظف الجديدة" 
                  className="form-input" 
                />
                <button onClick={() => handleUpdatePassword('employee', employeePassword)} className="btn btn-navy">حفظ</button>
              </div>
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
        .settings-grid-layout {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 25px;
        }
        @media (max-width: 992px) {
          .settings-grid-layout {
            grid-template-columns: 1fr;
          }
        }
        .settings-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 25px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
          height: fit-content;
        }
        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 20px;
          border-right: 4px solid var(--secondary-green);
          padding-right: 10px;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--light-gray);
          border: 1px solid var(--border-gray);
          padding: 12px 15px;
          border-radius: var(--radius-sm);
          margin: 10px 0;
        }
        .toggle-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--primary-navy);
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0 !important;
          height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          position: absolute;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .switch input:checked + .slider {
          background-color: var(--secondary-green);
        }
        .switch input:checked + .slider:before {
          transform: translateX(22px);
        }
        .form-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--primary-navy);
        }
        .custom-fields-list h3, .settings-card h3 {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 10px;
        }
        .custom-field-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--light-gray);
          border: 1px solid var(--border-gray);
          padding: 10px 15px;
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          font-size: 13px;
        }
        .field-type-badge {
          color: var(--text-light);
          margin-right: 5px;
        }
        .required-star {
          color: #DC2626;
          font-weight: bold;
          margin-right: 5px;
        }
        .action-delete-btn {
          padding: 3px 8px;
          font-size: 11px;
        }
        .message-alert {
          padding: 15px;
          border-radius: var(--radius-sm);
          font-size: 14px;
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
