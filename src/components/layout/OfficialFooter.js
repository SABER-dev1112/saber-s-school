'use client';

import { useEffect, useState } from 'react';
import db from '../../services/db';

export default function OfficialFooter({ teacherName }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    db.getSettings()
      .then(setSettings)
      .catch(err => console.error('Failed to load settings in footer', err));
  }, []);

  const managerName = settings?.manager_name || 'اسم المدير';

  return (
    <>
      {/* التواقيع الرسمية للطباعة (تظهر في الطباعة/PDF فقط) */}
      <div className="signature-block-print">
        {/* اليمين: توقيع المعلم */}
        <div className="print-sig-col">
          <span className="sig-title">توقيع المعلم/المعلمة</span>
          <div className="sig-line">الاسم: {teacherName || '.....................................'}</div>
        </div>

        {/* المنتصف: اسم النظام أو المنصة */}
        <div className="print-sig-col" style={{ alignSelf: 'center', marginBottom: 0 }}>
          <span style={{ fontSize: '11px', color: '#666' }}>
            نظام التقارير المدرسية © {new Date().getFullYear()}
          </span>
        </div>

        {/* اليسار: توقيع مدير المدرسة */}
        <div className="print-sig-col">
          <span className="sig-title">اعتماد قائد/مدير المدرسة</span>
          <div className="sig-line">الاسم: {managerName}</div>
        </div>
      </div>

      {/* الفوتر العام المعروض في المتصفح */}
      <footer className="official-footer-container no-print">
        <p>نظام إدارة معلمين مدرسة أبي دجانة المتوسطة - مكة المكرمة</p>
        <p style={{ opacity: 0.7, fontSize: '11px', marginTop: '5px' }}>
          جميع الحقوق محفوظة للمدرسة © {new Date().getFullYear()} | منصة العلوم والتقنية للجميع
        </p>
      </footer>
    </>
  );
}
