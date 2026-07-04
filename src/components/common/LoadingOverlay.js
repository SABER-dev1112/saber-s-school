'use client';

export default function LoadingOverlay({ message = 'جاري تحميل البيانات...' }) {
  return (
    <div className="full-screen-loader">
      <div className="loader-content">
        <img src="/school_logo.png" alt="شعار المدرسة" className="loader-logo" />
        <div className="loader-spinner"></div>
        <p className="loader-text">{message}</p>
      </div>

      <style jsx>{`
        .full-screen-loader {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(245, 247, 248, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(226, 232, 240, 0.8);
          animation: scaleUp 0.3s ease-out;
        }
        .loader-logo {
          height: 90px;
          object-fit: contain;
          animation: pulse 1.8s infinite ease-in-out;
        }
        .loader-spinner {
          width: 32px;
          height: 32px;
          border: 3.5px solid #E2E8F0;
          border-top-color: #15445A;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .loader-text {
          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #15445A;
          margin-top: 5px;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
