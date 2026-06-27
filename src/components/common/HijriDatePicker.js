'use client';

import { useState, useEffect, useRef } from 'react';
import moment from 'moment-hijri';
import { gregorianToHijri, hijriToGregorian, HIJRI_MONTHS } from '../../core/calendar';

export default function HijriDatePicker({ value, onChange, placeholder = 'اختر التاريخ الهجري' }) {
  moment.locale('ar-sa');
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentYear, setCurrentYear] = useState(1447);
  const [currentMonth, setCurrentMonth] = useState(1); // 1-indexed (1 = محرم)
  const containerRef = useRef(null);

  // تحديث الحقل والقيم عند تغيير القيمة المدخلة من الخارج
  useEffect(() => {
    if (value) {
      // تحويل القيمة الميلادية القادمة من الخارج إلى هجري
      const hijri = gregorianToHijri(value, 'iYYYY/iMM/iDD');
      setInputValue(hijri);
      
      const parts = hijri.split('/');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0], 10));
        setCurrentMonth(parseInt(parts[1], 10));
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  // إغلاق التقويم عند النقر في الخارج
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // حساب عدد أيام الشهر الهجري الحالي
  const getDaysInMonth = (year, month) => {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    // التحقق من صلاحية اليوم 30 في التقويم الهجري
    const has30 = moment(`i${year}/i${monthStr}/i30`, 'iYYYY/iMM/iDD').isValid();
    return has30 ? 30 : 29;
  };

  // حساب اليوم الأول في الأسبوع للشهر الهجري الحالي
  const getFirstDayOfWeek = (year, month) => {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const gregDate = moment(`i${year}/i${monthStr}/i01`, 'iYYYY/iMM/iDD');
    return gregDate.day(); // 0 = الأحد, ..., 6 = السبت
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  // الانتقال للشهر السابق
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // الانتقال للشهر التالي
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // عند اختيار يوم معين
  const handleSelectDay = (day) => {
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const hijriStr = `i${currentYear}/i${monthStr}/i${dayStr}`;
    
    // تحويل الهجري المختار إلى ميلادي لإرساله للخارج بالأرقام الإنجليزية القياسية
    const gregStr = moment(hijriStr, 'iYYYY/iMM/iDD').locale('en').format('YYYY-MM-DD');
    
    onChange(gregStr);
    setIsOpen(false);
  };

  // إنشاء قائمة الأيام للشبكة
  const renderDays = () => {
    const days = [];
    
    // تعبئة الفراغات قبل بداية الشهر (إذا كان اليوم الأول ليس الأحد)
    // الترتيب في الشبكة العربية يبدأ من الأحد (0) إلى السبت (6)
    // ولكن للتسهيل سنرتبها: الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="hijri-day-btn empty"></div>);
    }

    // تعبئة الأيام الفعلية للشهر
    const selectedParts = inputValue.split('/');
    const selectedDay = selectedParts.length === 3 ? parseInt(selectedParts[2], 10) : 0;
    const selectedYr = selectedParts.length === 3 ? parseInt(selectedParts[0], 10) : 0;
    const selectedMth = selectedParts.length === 3 ? parseInt(selectedParts[1], 10) : 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = 
        day === selectedDay && 
        currentMonth === selectedMth && 
        currentYear === selectedYr;

      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleSelectDay(day)}
          className={`hijri-day-btn ${isSelected ? 'selected' : ''}`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // خيارات السنوات (مثلاً من 1440 إلى 1460)
  const years = [];
  for (let y = 1445; y <= 1455; y++) {
    years.push(y);
  }

  return (
    <div className="hijri-picker-container" ref={containerRef}>
      <input
        type="text"
        readOnly
        onClick={() => setIsOpen(!isOpen)}
        value={inputValue}
        placeholder={placeholder}
        className="hijri-picker-input"
        style={{ cursor: 'pointer' }}
      />
      
      {isOpen && (
        <div className="hijri-picker-dropdown no-print">
          {/* شريط التحكم بالشهور والسنوات */}
          <div className="hijri-picker-header">
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="الشهر السابق"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            
            <div className="hijri-selects">
              <select 
                value={currentMonth} 
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                style={{ padding: '2px 5px', fontSize: '12px' }}
              >
                {HIJRI_MONTHS.map((name, index) => (
                  <option key={index} value={index + 1}>{name}</option>
                ))}
              </select>

              <select 
                value={currentYear} 
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                style={{ padding: '2px 5px', fontSize: '12px' }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y} هـ</option>
                ))}
              </select>
            </div>

            <button 
              type="button" 
              onClick={handleNextMonth} 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="الشهر التالي"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>

          {/* أيام الأسبوع */}
          <div className="hijri-picker-grid">
            <div className="hijri-grid-header">ح</div>
            <div className="hijri-grid-header">ن</div>
            <div className="hijri-grid-header">ث</div>
            <div className="hijri-grid-header">ر</div>
            <div className="hijri-grid-header">خ</div>
            <div className="hijri-grid-header">ج</div>
            <div className="hijri-grid-header">س</div>
            {renderDays()}
          </div>
        </div>
      )}
    </div>
  );
}
