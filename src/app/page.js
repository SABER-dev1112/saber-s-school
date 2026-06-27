'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import db from '../services/db';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userRole = await db.login(email, password);
      if (userRole) {
        // حفظ جلسة بسيطة في sessionStorage للتنقل
        sessionStorage.setItem('userRole', userRole);
        if (userRole === 'manager') {
          router.push('/manager');
        } else {
          router.push('/employee');
        }
      } else {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في النظام. يرجى الاتصال بمسؤول الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* الشعارات والترويسة */}
        <div className="login-logos">
          <img src="/ministry_logo.png" alt="وزارة التعليم" className="login-ministry-logo" />
          <img src="/school_logo.png" alt="مدرسة أبي دجانة" className="login-school-logo" />
        </div>
        
        <h1 className="login-title">منصة إدارة معلمين المدرسة</h1>
        <p className="login-subtitle">مدرسة أبي دجانة المتوسطة بمكة المكرمة</p>

        {error && <div className="login-error-alert">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input 
              type="text" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="أدخل البريد الإلكتروني أو اسم المستخدم"
              required
              className="login-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary login-btn"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-page-container {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-green) 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-lg);
          padding: 40px;
          width: 100%;
          max-width: 480px;
          box-shadow: var(--shadow-lg);
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .login-logos {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 30px;
          margin-bottom: 25px;
        }
        .login-ministry-logo {
          height: 55px;
          object-fit: contain;
        }
        .login-school-logo {
          height: 60px;
          object-fit: contain;
        }
        .login-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 8px;
        }
        .login-subtitle {
          font-size: 14px;
          color: var(--text-light);
          margin-bottom: 30px;
        }
        .login-error-alert {
          background-color: #FEE2E2;
          border: 1px solid #FCA5A5;
          color: #DC2626;
          padding: 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          margin-bottom: 20px;
          text-align: right;
        }
        .login-form {
          text-align: right;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-weight: 600;
          font-size: 13px;
          color: var(--primary-navy);
          margin-bottom: 8px;
        }
        .login-select, .login-input {
          font-size: 14px;
          border: 1px solid var(--border-gray);
          border-radius: var(--radius-sm);
          padding: 12px;
          width: 100%;
        }
        .login-btn {
          width: 100%;
          padding: 12px;
          font-size: 15px;
          margin-top: 15px;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
}
