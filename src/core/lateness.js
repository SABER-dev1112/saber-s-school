/**
 * حساب دقائق التأخير بناءً على وقت الحضور والوقت الرسمي لبدء الدوام
 * @param {string} checkInTime - وقت حضور المعلم (مثال: "08:15")
 * @param {string} officialStartTime - وقت بداية الدوام الرسمي (مثال: "07:00")
 * @returns {number} عدد دقائق التأخير
 */
export function calculateLateness(checkInTime, officialStartTime) {
  if (!checkInTime || !officialStartTime) return 0;
  
  const [inHours, inMinutes] = checkInTime.split(':').map(Number);
  const [startHours, startMinutes] = officialStartTime.split(':').map(Number);
  
  if (isNaN(inHours) || isNaN(inMinutes) || isNaN(startHours) || isNaN(startMinutes)) {
    return 0;
  }
  
  const checkInTotalMinutes = inHours * 60 + inMinutes;
  const startTotalMinutes = startHours * 60 + startMinutes;
  
  const delay = checkInTotalMinutes - startTotalMinutes;
  return delay > 0 ? delay : 0;
}

/**
 * تنسيق الدقائق إلى شكل مقروء (ساعات ودقائق) باللغة العربية
 * @param {number} minutes - إجمالي الدقائق
 * @returns {string} النص المنسق (مثال: "2 ساعة و 15 دقيقة")
 */
export function formatMinutesToHoursAndMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0 دقيقة';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  let result = '';
  if (hours > 0) {
    if (hours === 1) result += 'ساعة';
    else if (hours === 2) result += 'ساعتين';
    else if (hours >= 3 && hours <= 10) result += `${hours} ساعات`;
    else result += `${hours} ساعة`;
  }
  
  if (mins > 0) {
    if (result) result += ' و ';
    if (mins === 1) result += 'دقيقة واحدة';
    else if (mins === 2) result += 'دقيقتين';
    else if (mins >= 3 && mins <= 10) result += `${mins} دقائق`;
    else result += `${mins} دقيقة`;
  }
  
  return result || '0 دقيقة';
}
