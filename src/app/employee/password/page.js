'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OfficialHeader from '../../../components/layout/OfficialHeader';
import OfficialFooter from '../../../components/layout/OfficialFooter';
import db from '../../../services/db';

export default function EmployeePasswordPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'كلمتا المرور غير متطابقتين!', type: 'danger' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ text: 'كلمة المرور يجب أن لا تقل عن 4 خانات.', type: 'danger' });
      return;
    }

    setSubmitting(true);
    try {
      const success = await db.updatePassword('employee', newPassword);
      if (success) {
        setMessage({ text: 'تم تغيير كلمة المرور للموظف بنجاح.', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ text: 'فشل في تغيير كلمة المرور.', type: 'danger' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'حدث خطأ في النظام.', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!authorized) {
    return <div className="loading-screen">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div className="employee-layout">
      <OfficialHeader title="تغيير كلمة المرور الخاصة بالحساب" />

      {/* شريط التنقل */}
      <nav className="employee-navbar no-print">
        <div className="navbar-links">
          <button onClick={() => router.push('/employee')} className="nav-btn">تسجيل الحضور اليومي</button>
          <button onClick={() => router.push('/employee/teachers')} className="nav-btn">إدارة المعلمين</button>
          <button className="nav-btn active">تغيير كلمة المرور</button>
        </div>
        <button onClick={() => { sessionStorage.removeItem('userRole'); router.push('/'); }} className="btn btn-danger logout-btn">تسجيل الخروج</button>
      </nav>

      <main className="employee-main-content">
        <div className="password-card-container">
          <div className="password-card no-print">
            <h2 className="card-title">تحديث كلمة مرور الموظف المسؤول</h2>
            
            {message.text && (
              <div className={`message-alert alert-${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="password-form">
              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة *</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور الجديدة *</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور لتأكيدها"
                  required
                  className="form-input"
                />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-navy submit-btn">
                {submitting ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </button>
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
        .employee-main-content {
          flex: 1;
          padding: 30px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }
        .password-card-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 0;
        }
        .password-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 35px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-gray);
          width: 100%;
          max-width: 500px;
        }
        .card-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 20px;
          border-right: 4px solid var(--secondary-green);
          padding-right: 10px;
        }
        .password-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--primary-navy);
        }
        .submit-btn {
          padding: 12px;
          font-size: 15px;
          margin-top: 10px;
        }
        .message-alert {
          padding: 15px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
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
