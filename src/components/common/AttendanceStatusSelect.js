'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * AttendanceStatusSelect
 * مكوّن مخصص فاخر لاختيار حالة المعلم (حاضر / غائب)
 * يتميز بتمييز لوني فوري (أخضر للحاضر / أحمر للغائب) وسهم متحرك وظلال ناعمة
 */
export default function AttendanceStatusSelect({
  value = 'present',
  onChange,
  disabled = false,
  className = '',
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const isPresent = value === 'present';

  // إغلاق القائمة عند النقر خارجها أو الضغط على Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (status) => {
    if (disabled) return;
    if (onChange && status !== value) {
      onChange(status);
    }
    setIsOpen(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen(prev => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`status-select-wrapper ${className}`}
      id={id}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        minWidth: '110px',
        maxWidth: '140px',
        userSelect: 'none'
      }}
    >
      {/* الزر الرئيسي للقائمة */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '7px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '700',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          border: isPresent ? '1.5px solid #86EFAC' : '1.5px solid #FCA5A5',
          backgroundColor: isPresent ? '#F0FDF4' : '#FEF2F2',
          color: isPresent ? '#15803D' : '#B91C1C',
          boxShadow: isOpen 
            ? (isPresent ? '0 0 0 3px rgba(34, 197, 94, 0.2)' : '0 0 0 3px rgba(239, 68, 68, 0.2)')
            : '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isPresent ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          <span>{isPresent ? 'حاضر' : 'غائب'}</span>
        </span>

        {/* سهم الدوران المتفاعل */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.8
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* القائمة المنسدلة العائمة */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            right: 0,
            left: 0,
            zIndex: 9999,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '5px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            animation: 'dropdownFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* خيار: حاضر */}
          <button
            type="button"
            role="option"
            aria-selected={isPresent}
            onClick={() => handleSelect('present')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: isPresent ? '700' : '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isPresent ? '#DCFCE7' : 'transparent',
              color: isPresent ? '#15803D' : '#334155',
              transition: 'background-color 0.12s ease'
            }}
            onMouseEnter={(e) => {
              if (!isPresent) e.currentTarget.style.backgroundColor = '#F0FDF4';
            }}
            onMouseLeave={(e) => {
              if (!isPresent) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>حاضر</span>
            </span>
            {isPresent && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803D' }} />
            )}
          </button>

          {/* خيار: غائب */}
          <button
            type="button"
            role="option"
            aria-selected={!isPresent}
            onClick={() => handleSelect('absent')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: !isPresent ? '700' : '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: !isPresent ? '#FEE2E2' : 'transparent',
              color: !isPresent ? '#B91C1C' : '#334155',
              transition: 'background-color 0.12s ease'
            }}
            onMouseEnter={(e) => {
              if (isPresent) e.currentTarget.style.backgroundColor = '#FEF2F2';
            }}
            onMouseLeave={(e) => {
              if (isPresent) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>غائب</span>
            </span>
            {!isPresent && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#B91C1C' }} />
            )}
          </button>
        </div>
      )}

      {/* تأثير ظهور القائمة بسلاسة */}
      <style jsx>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
