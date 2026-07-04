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
export function exportCollectiveReport(reportData, schoolName, periodText, subFilter = 'general') {
  const sheetName = 'التقرير الجماعي';
  
  let tableContentHtml = '';
  let colSpanCount = 9;
  let reportSubtitleText = 'تقرير حضور وغياب وتأخير المعلمين الجماعي';
  let excelFileName = 'التقرير_الجماعي';

  if (subFilter === 'general') {
    colSpanCount = 9;
    reportSubtitleText = 'تقرير حضور وغياب وتأخير المعلمين الصباحي العام';
    excelFileName = 'التقرير_العام_الصباحي';
    tableContentHtml = `
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
    `;
    reportData.forEach(item => {
      tableContentHtml += `
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
    tableContentHtml += `</tbody>`;
  } else if (subFilter === 'assembly') {
    colSpanCount = 6;
    reportSubtitleText = 'تقرير تأخير وغياب طابور الصباح للمعلمين';
    excelFileName = 'تقرير_طابور_الصباح';
    tableContentHtml = `
        <thead>
          <tr>
            <th>اسم المعلم</th>
            <th>التخصص</th>
            <th>أيام العمل</th>
            <th>أيام حضور الطابور</th>
            <th>أيام غياب الطابور</th>
            <th>تأخير الطابور بالساعات</th>
          </tr>
        </thead>
        <tbody>
    `;
    reportData.forEach(item => {
      tableContentHtml += `
        <tr>
          <td style="font-weight: bold; color: #15445A; border: 1px solid #CBD5E1; padding: 10px;">${item.name}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px;">${item.specialty || 'غير محدد'}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${item.totalDays}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: bold; color: #07A869;">${item.assemblyPresentDays}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: bold; color: #EF4444;">${item.assemblyAbsentDays}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; color: #DC2626; font-weight: bold;">${item.formattedAssemblyDelay}</td>
        </tr>
      `;
    });
    tableContentHtml += `</tbody>`;
  } else if (subFilter === 'classes') {
    colSpanCount = 6;
    reportSubtitleText = 'تقرير تأخر وغياب الحصص اليومية للمعلمين';
    excelFileName = 'تقرير_تأخر_الحصص';
    tableContentHtml = `
        <thead>
          <tr>
            <th>اسم المعلم</th>
            <th>التخصص</th>
            <th>أيام العمل</th>
            <th>تأخير الحصص (حالات)</th>
            <th>غياب الحصص (حالات)</th>
            <th>تأخير الحصص بالساعات</th>
          </tr>
        </thead>
        <tbody>
    `;
    reportData.forEach(item => {
      tableContentHtml += `
        <tr>
          <td style="font-weight: bold; color: #15445A; border: 1px solid #CBD5E1; padding: 10px;">${item.name}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px;">${item.specialty || 'غير محدد'}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${item.totalDays}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: bold; color: #D97706;">${item.classLateCount}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: bold; color: #EF4444;">${item.classAbsentCount}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; color: #DC2626; font-weight: bold;">${item.formattedClassDelay}</td>
        </tr>
      `;
    });
    tableContentHtml += `</tbody>`;
  }

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
        * { font-family: Arial, sans-serif; }
        body { font-family: Arial, sans-serif; direction: rtl; }
        .school-title { font-size: 16pt; font-weight: bold; color: #15445A; text-align: center; }
        .report-subtitle { font-size: 12pt; font-weight: bold; color: #07A869; text-align: center; }
        .period-text { font-size: 10pt; color: #64748B; text-align: center; }
        th { background-color: #15445A; color: white; font-weight: bold; border: 1px solid #CBD5E1; padding: 12px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${colSpanCount}" class="school-title">${schoolName}</td></tr>
        <tr><td colspan="${colSpanCount}" class="report-subtitle">${reportSubtitleText}</td></tr>
        <tr><td colspan="${colSpanCount}" class="period-text">الفترة الزمنية: ${periodText}</td></tr>
        <tr><td colspan="${colSpanCount}"></td></tr>
        ${tableContentHtml}
      </table>
    </body>
    </html>
  `;

  downloadStyledExcel(html, `${excelFileName}_${new Date().toISOString().split('T')[0]}`);
}

/**
 * تصدير التقرير الفردي لمعلم محدد بتنسيق منسق وملون
 */
export function exportIndividualReport(teacher, attendanceRecords, schoolName, periodText, subFilter = 'general') {
  const sheetName = 'تقرير المعلم';
  
  let tableContentHtml = '';
  let colSpanCount = 6;
  let reportSubtitleText = 'تقرير حضور وغياب المعلم الفردي';
  let excelFileName = `تقرير_المعلم_${teacher.name.replace(/\s+/g, '_')}`;

  if (subFilter === 'general') {
    colSpanCount = 6;
    reportSubtitleText = `تقرير الحضور والغياب والتحضير الصباحي العام للمعلم: ${teacher.name}`;
    excelFileName = `تقرير_${teacher.name.replace(/\s+/g, '_')}_الصباحي_العام`;
    tableContentHtml = `
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
    `;
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

      tableContentHtml += `
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
    tableContentHtml += `</tbody>`;
  } else if (subFilter === 'assembly') {
    colSpanCount = 5;
    reportSubtitleText = `تقرير تأخير وغياب طابور الصباح للمعلم: ${teacher.name}`;
    excelFileName = `تقرير_${teacher.name.replace(/\s+/g, '_')}_طابور_الصباح`;
    tableContentHtml = `
        <thead>
          <tr>
            <th>التاريخ الهجري</th>
            <th>التاريخ الميلادي</th>
            <th>حالة طابور الصباح</th>
            <th>وقت حضور الطابور</th>
            <th>التأخير (بالدقائق)</th>
          </tr>
        </thead>
        <tbody>
    `;
    attendanceRecords.forEach(rec => {
      let assemblyStatusText = 'حاضر في الموعد';
      let assemblyColor = '#07A869';
      if (rec.status !== 'present') {
        assemblyStatusText = 'غائب (غياب اليوم)';
        assemblyColor = '#EF4444';
      } else if (rec.assembly_status === 'late') {
        assemblyStatusText = 'متأخر عن الطابور';
        assemblyColor = '#D97706';
      } else if (rec.assembly_status === 'absent') {
        assemblyStatusText = 'غائب عن الطابور';
        assemblyColor = '#EF4444';
      }

      tableContentHtml += `
        <tr>
          <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; text-align: center;">${rec.hijriDate || ''}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${rec.date}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; color: ${assemblyColor}; text-align: center;">${assemblyStatusText}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${rec.status === 'present' && rec.assembly_status === 'late' ? (rec.assembly_check_in_time || '-') : '-'}</td>
          <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; color: ${rec.status === 'present' && rec.assembly_status === 'late' ? '#DC2626' : '#64748B'};">${rec.status === 'present' && rec.assembly_status === 'late' ? (rec.assembly_delay_minutes || 0) : 0}</td>
        </tr>
      `;
    });
    tableContentHtml += `</tbody>`;
  } else if (subFilter === 'classes') {
    colSpanCount = 6;
    reportSubtitleText = `تقرير تأخر وغياب الحصص اليومية للمعلم: ${teacher.name}`;
    excelFileName = `تقرير_${teacher.name.replace(/\s+/g, '_')}_تأخر_الحصص`;
    tableContentHtml = `
        <thead>
          <tr>
            <th>التاريخ الهجري</th>
            <th>التاريخ الميلادي</th>
            <th>رقم الحصة</th>
            <th>الإجراء</th>
            <th>دقائق التأخير</th>
            <th>الملاحظات</th>
          </tr>
        </thead>
        <tbody>
    `;
    attendanceRecords.forEach(rec => {
      const classDelays = rec.class_delays || [];
      if (classDelays.length === 0) {
        tableContentHtml += `
          <tr>
            <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; text-align: center;">${rec.hijriDate || ''}</td>
            <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${rec.date}</td>
            <td colspan="4" style="border: 1px solid #CBD5E1; padding: 10px; color: #07A869; font-weight: bold;">ملتزم بجميع حصص اليوم</td>
          </tr>
        `;
      } else {
        classDelays.forEach((cd, cdIndex) => {
          const rowSpanText = cdIndex === 0 ? `rowspan="${classDelays.length}"` : '';
          const dateCols = cdIndex === 0 ? `
            <td ${rowSpanText} style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; text-align: center; vertical-align: middle;">${rec.hijriDate || ''}</td>
            <td ${rowSpanText} style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; vertical-align: middle;">${rec.date}</td>
          ` : '';
          
          tableContentHtml += `
            <tr>
              ${dateCols}
              <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">الحصة ${cd.class_number}</td>
              <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold; color: ${cd.status === 'late' ? '#D97706' : '#EF4444'}; text-align: center;">${cd.status === 'late' ? 'تأخر عن الحصة' : 'غياب عن الحصة'}</td>
              <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; color: ${cd.status === 'late' ? '#DC2626' : '#64748B'};">${cd.status === 'late' ? cd.delay_minutes : '-'}</td>
              <td style="border: 1px solid #CBD5E1; padding: 10px;">${cd.notes || '-'}</td>
            </tr>
          `;
        });
      }
    });
    tableContentHtml += `</tbody>`;
  }

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
        * { font-family: Arial, sans-serif; }
        body { font-family: Arial, sans-serif; direction: rtl; }
        .school-title { font-size: 16pt; font-weight: bold; color: #15445A; text-align: center; }
        .report-subtitle { font-size: 12pt; font-weight: bold; color: #07A869; text-align: center; }
        .meta-text { font-size: 10pt; color: #334155; text-align: center; }
        .period-text { font-size: 10pt; color: #64748B; text-align: center; }
        th { background-color: #15445A; color: white; font-weight: bold; border: 1px solid #CBD5E1; padding: 12px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${colSpanCount}" class="school-title">${schoolName}</td></tr>
        <tr><td colspan="${colSpanCount}" class="report-subtitle">${reportSubtitleText}</td></tr>
        <tr><td colspan="${colSpanCount}" class="meta-text">المعلم: ${teacher.name} | التخصص: ${teacher.extra_info?.specialty || 'غير محدد'} | الجوال: ${teacher.extra_info?.phone || 'غير محدد'}</td></tr>
        <tr><td colspan="${colSpanCount}" class="period-text">الفترة الزمنية: ${periodText}</td></tr>
        <tr><td colspan="${colSpanCount}"></td></tr>
        ${tableContentHtml}
      </table>
    </body>
    </html>
  `;

  downloadStyledExcel(html, `${excelFileName}_${new Date().toISOString().split('T')[0]}`);
}
