'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OfficialHeader from '../../../components/layout/OfficialHeader';
import OfficialFooter from '../../../components/layout/OfficialFooter';
import db from '../../../services/db';

export default function EmployeeTeachersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [name, setName] = useState('');
  const [extraInfo, setExtraInfo] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  // حماية الصفحة والتأكد من الصلاحيات
  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    if (role !== 'employee') {
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  // تحميل البيانات
  useEffect(() => {
    if (!authorized) return;
    loadData();
  }, [authorized]);

  const loadData = async () => {
    try {
      const [teachersData, settingsData] = await Promise.all([
        db.getTeachers(),
        db.getSettings()
      ]);
      setTeachers(teachersData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleExtraInfoChange = (fieldId, value) => {
    setExtraInfo(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const resetForm = () => {
    setName('');
    setExtraInfo({});
    setEditingId(null);
  };

  const handleEdit = (teacher) => {
    setEditingId(teacher.id);
    setName(teacher.name);
    setExtraInfo(teacher.extra_info || {});
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المعلم؟ سيتم حذف جميع بياناته وسجلات حضوره!')) return;
    try {
      await db.deleteTeacher(id);
      setMessage({ text: 'تم حذف المعلم بنجاح.', type: 'success' });
      loadData();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'فشل في حذف المعلم.', type: 'danger' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      if (editingId) {
        await db.updateTeacher(editingId, name, extraInfo);
        setMessage({ text: 'تم تعديل بيانات المعلم بنجاح.', type: 'success' });
      } else {
        await db.addTeacher(name, extraInfo);
        setMessage({ text: 'تم إضافة معلم جديد بنجاح.', type: 'success' });
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'حدث خطأ أثناء حفظ البيانات.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!authorized) {
    return <div className="loading-screen">جاري التحقق من الصلاحيات...</div>;
  }

  const customFields = settings?.custom_fields || [];

  return (
    <div className="employee-layout">
      <OfficialHeader title="إدارة ملفات المعلمين" />

      {/* شريط التنقل */}
      <nav className="employee-navbar no-print">
        <div className="navbar-links">
          <button onClick={() => router.push('/employee')} className="nav-btn">تسجيل الحضور اليومي</button>
          <button onClick={() => router.push('/employee?tab=corrections')} className="nav-btn">تعديل مستندات</button>
          <button className="nav-btn active">إدارة المعلمين</button>
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

        <div className="teachers-layout-grid">
          {/* يمين: قائمة المعلمين */}
          <div className="teachers-list-card">
            <h2 className="card-title">قائمة معلمي المدرسة الحالية ({teachers.length} معلم)</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    {customFields.map(f => <th key={f.id}>{f.name}</th>)}
                    <th className="no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={customFields.length + 2} style={{ textAlign: 'center', padding: '20px' }}>
                        لا يوجد معلمون مسجلون حالياً. استخدم النموذج المرفق لإضافة معلمك الأول!
                      </td>
                    </tr>
                  ) : (
                    teachers.map(teacher => (
                      <tr key={teacher.id}>
                        <td className="teacher-name-cell">{teacher.name}</td>
                        {customFields.map(f => (
                          <td key={f.id}>{teacher.extra_info?.[f.id] || '-'}</td>
                        ))}
                        <td className="no-print actions-cell">
                          <button onClick={() => handleEdit(teacher)} className="btn btn-secondary action-btn-edit">تعديل</button>
                          <button onClick={() => handleDelete(teacher.id)} className="btn btn-danger action-btn-delete">حذف</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* يسار: نموذج إضافة/تعديل معلم */}
          <div className="teacher-form-card no-print">
            <h2 className="card-title">{editingId ? 'تعديل بيانات معلم' : 'إضافة معلم جديد'}</h2>
            
            <form onSubmit={handleSubmit} className="teacher-form">
              <div className="form-group">
                <label className="form-label">الاسم الكامل لـ المعلم *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل الاسم الثلاثي أو الرباعي"
                  required
                  className="form-input"
                />
              </div>

              {/* توليد حقول البيانات المخصصة ديناميكياً من إعدادات المدير */}
              {customFields.map(field => (
                <div key={field.id} className="form-group">
                  <label className="form-label">
                    {field.name} {field.required && ' *'}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={extraInfo[field.id] || ''}
                      onChange={(e) => handleExtraInfoChange(field.id, e.target.value)}
                      required={field.required}
                      className="form-select"
                    >
                      <option value="">اختر من القائمة...</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={extraInfo[field.id] || ''}
                      onChange={(e) => handleExtraInfoChange(field.id, e.target.value)}
                      required={field.required}
                      placeholder={`أدخل ${field.name}`}
                      className="form-input"
                    />
                  )}
                </div>
              ))}

              <div className="form-actions">
                <button type="submit" disabled={submitting} className="btn btn-navy submit-btn">
                  {submitting ? 'جاري الحفظ...' : editingId ? 'تحديث البيانات' : 'إضافة المعلم'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn btn-secondary cancel-btn">
                    إلغاء التعديل
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

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
        .teachers-layout-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 25px;
        }
        @media (max-width: 992px) {
          .teachers-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .teachers-list-card, .teacher-form-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 25px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-gray);
          height: fit-content;
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
        .actions-cell {
          display: flex;
          gap: 8px;
        }
        .action-btn-edit {
          padding: 4px 10px;
          font-size: 14px;
          border-radius: var(--radius-sm);
        }
        .action-btn-delete {
          padding: 4px 10px;
          font-size: 14px;
          border-radius: var(--radius-sm);
        }
        .teacher-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-weight: 600;
          font-size: 16px;
          color: var(--primary-navy);
        }
        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .submit-btn {
          flex: 1;
        }
        .cancel-btn {
          flex: 1;
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
