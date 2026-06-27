'use client';

import { useEffect, useState } from 'react';
import db from '../../services/db';
import { getTodayHijriLong } from '../../core/calendar';

export default function OfficialHeader({ title, customHijriDate, reportTypeLabel }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    db.getSettings()
      .then(setSettings)
      .catch(err => console.error('Failed to load settings in header', err));
  }, []);

  const schoolName = settings?.school_name || 'مدرسة أبي دجانه المتوسطه';
  const city = settings?.header_metadata?.city || 'مكة المكرمة';
  const semester = settings?.header_metadata?.semester || 'الفصل الدراسي الثاني';
  const displayDate = customHijriDate || getTodayHijriLong();

  return (
    <header className={`official-header-container ${reportTypeLabel ? 'premium-report-header' : ''}`}>
      <div className="official-top-banner">
        {/* اليمين: شعار الوزارة واسم المدرسة والمدينة */}
        {reportTypeLabel ? (
          <div className="banner-logos-premium">
            <img src="/ministry_logo.png" alt="شعار وزارة التعليم" className="ministry-logo-premium" />
            <div className="divider-line"></div>
            <div className="school-info-premium">
              <span className="city-text-premium">إدارة تعليم مكة</span>
              <h1 className="school-title-premium">{schoolName}</h1>
            </div>
          </div>
        ) : (
          <div className="banner-logos">
            <img src="/ministry_logo.png" alt="شعار وزارة التعليم" className="ministry-logo" />
            <div className="school-info">
              <span className="city-text" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <lord-icon
                  src="https://cdn.lordicon.com/iikoxwld.json"
                  trigger="hover"
                  colors="primary:#ffffff"
                  style={{ width: '18px', height: '18px' }}
                ></lord-icon>
                إدارة تعليم {city}
              </span>
              <h1 className="school-title">{schoolName}</h1>
            </div>
          </div>
        )}

        {/* المنتصف: عنوان الصفحة الحالي */}
        <div className={reportTypeLabel ? 'banner-title-center-premium' : 'banner-title-center'}>
          <h2 className={reportTypeLabel ? 'banner-main-title-premium' : 'banner-main-title'}>
            {title || 'نظام إدارة معلمين المدرسة'}
          </h2>
        </div>

        {/* اليسار: شعار المدرسة والترم والتاريخ */}
        {reportTypeLabel ? (
          <div className="banner-left-premium">
            <div className="badge-date-container">
              <span className="report-pill-badge">{reportTypeLabel}</span>
              <span className="hijri-date-text-premium">
                <lord-icon
                  src="https://cdn.lordicon.com/qvyppzqz.json"
                  trigger="hover"
                  colors="primary:#ffffff"
                  style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginLeft: '5px' }}
                ></lord-icon>
                {displayDate}
              </span>
            </div>
            <img src="/school_logo.png" alt="شعار المدرسة" className="school-logo-premium" />
          </div>
        ) : (
          <div className="banner-left-info">
            <img src="/school_logo.png" alt="شعار المدرسة" className="school-logo-img" />
            <div className="date-semester-badge">
              <span className="badge-item">{semester}</span>
              <span className="badge-item date-badge">{displayDate}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
