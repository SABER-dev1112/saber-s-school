/**
 * تصدير ملفات Excel ملونة ومنسقة بالكامل عن طريق ترميز HTML/XML متوافق مع Excel
 * يدعم التلوين والحدود ومحاذاة اليمين لليسار (RTL) بشكل مثالي.
 */

function downloadStyledExcel(htmlContent, fileName) {
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileName}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * تصدير التقرير الجماعي للمعلمين بتنسيق منسق وملون
 */
export function exportCollectiveReport(reportData, schoolName, periodText) {
  const sheetName = 'التقرير الجماعي';
  
  let tableRows = '';
  reportData.forEach(item => {
    tableRows += `
      <tr>
        <td style="font-weight: bold; color: #15445A; border: 1px solid #CBD5E1; padding: 10px;">${item.name}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px;">${item.specialty || 'غير محدد'}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; mso-number-format:'@';">${item.phone || 'غير محدد'}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${item.totalDays}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: bold; color: #07A869;">${item.presentDays}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: bold; color: #EF4444;">${item.absentDays}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; color: #3D7EB9;">${item.excusedDays}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${item.totalDelayMinutes}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; color: #DC2626; font-weight: bold;">${item.formattedDelay}</td>
      </tr>
    `;
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${sheetName}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayRightToLeft/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
        .school-title { font-size: 16pt; font-weight: bold; color: #15445A; text-align: center; }
        .report-subtitle { font-size: 12pt; font-weight: bold; color: #07A869; text-align: center; }
        .period-text { font-size: 10pt; color: #64748B; text-align: center; }
        th { background-color: #15445A; color: white; font-weight: bold; border: 1px solid #CBD5E1; padding: 12px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="9" class="school-title">${schoolName}</td></tr>
        <tr><td colspan="9" class="report-subtitle">تقرير حضور وغياب وتأخير المعلمين الجماعي</td></tr>
        <tr><td colspan="9" class="period-text">الفترة الزمنية: ${periodText}</td></tr>
        <tr><td colspan="9"></td></tr>
        <thead>
          <tr>
            <th>اسم المعلم</th>
            <th>التخصص</th>
            <th>رقم الجوال</th>
            <th>أيام العمل المفترضة</th>
            <th>أيام الحضور</th>
            <th>أيام الغياب بدون عذر</th>
            <th>أيام الإجازات والأعذار</th>
            <th>إجمالي دقائق التأخير</th>
            <th>التأخير بالساعات</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadStyledExcel(html, `التقرير_الجماعي_${new Date().toISOString().split('T')[0]}`);
}

/**
 * تصدير التقرير الفردي لمعلم محدد بتنسيق منسق وملون
 */
export function exportIndividualReport(teacher, attendanceRecords, schoolName, periodText) {
  const sheetName = 'تقرير المعلم';
  
  let tableRows = '';
  attendanceRecords.forEach(rec => {
    let statusText = 'غياب بدون عذر';
    let statusColor = '#EF4444';
    
    if (rec.status === 'present') {
      statusText = 'حاضر';
      statusColor = '#07A869';
    } else if (rec.status === 'excused' || rec.status === 'emergency_approved') {
      statusText = 'إجازة معتمدة';
      statusColor = '#D97706';
    } else if (rec.status === 'emergency_pending') {
      statusText = 'إجازة طارئة (معلقة)';
      statusColor = '#3D7EB9';
    }

    tableRows += `
      <tr>
        <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; text-align: center;">${rec.hijriDate || ''}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${rec.date}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; color: ${statusColor}; text-align: center;">${statusText}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${rec.check_in_time || '-'}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; color: ${rec.delay_minutes > 0 ? '#DC2626' : '#64748B'};">${rec.delay_minutes || 0}</td>
        <td style="border: 1px solid #CBD5E1; padding: 10px;">${rec.delay_minutes > 0 ? `متأخر ${rec.delay_minutes} دقيقة` : '-'}</td>
      </tr>
    `;
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${sheetName}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayRightToLeft/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
        .school-title { font-size: 16pt; font-weight: bold; color: #15445A; text-align: center; }
        .report-subtitle { font-size: 12pt; font-weight: bold; color: #07A869; text-align: center; }
        .meta-text { font-size: 10pt; color: #334155; text-align: center; }
        .period-text { font-size: 10pt; color: #64748B; text-align: center; }
        th { background-color: #15445A; color: white; font-weight: bold; border: 1px solid #CBD5E1; padding: 12px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="6" class="school-title">${schoolName}</td></tr>
        <tr><td colspan="6" class="report-subtitle">تقرير حضور وغياب المعلم الفردي</td></tr>
        <tr><td colspan="6" class="meta-text">المعلم: ${teacher.name} | التخصص: ${teacher.extra_info?.specialty || 'غير محدد'} | الجوال: ${teacher.extra_info?.phone || 'غير محدد'}</td></tr>
        <tr><td colspan="6" class="period-text">الفترة الزمنية: ${periodText}</td></tr>
        <tr><td colspan="6"></td></tr>
        <thead>
          <tr>
            <th>التاريخ الهجري</th>
            <th>التاريخ الميلادي</th>
            <th>حالة الحضور</th>
            <th>وقت الحضور الفعلي</th>
            <th>التأخير (بالدقائق)</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadStyledExcel(html, `تقرير_المعلم_${teacher.name.replace(/\s+/g, '_')}`);
}
