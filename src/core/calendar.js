import moment from 'moment-hijri';

// تعيين اللغة العربية والتقويم الهجري (المملكة العربية السعودية)
moment.locale('ar-sa');

/**
 * تحويل تاريخ ميلادي إلى تاريخ هجري منسق (YYYY/MM/DD)
 * @param {string} gregorianDateStr - التاريخ الميلادي (مثال: "2026-06-26")
 * @param {string} format - التنسيق المطلوب (الافتراضي: "iYYYY/iMM/iDD")
 * @returns {string} التاريخ الهجري
 */
export function gregorianToHijri(gregorianDateStr, format = 'iYYYY/iMM/iDD') {
  if (!gregorianDateStr) return '';
  try {
    return moment(gregorianDateStr, 'YYYY-MM-DD').locale('en').format(format);
  } catch (error) {
    console.error('Error in gregorianToHijri:', error);
    return '';
  }
}

/**
 * تحويل تاريخ ميلادي إلى تاريخ هجري طويل ومقروء بالعربية (مثال: "11 محرم 1448 هـ")
 * @param {string} gregorianDateStr - التاريخ الميلادي (مثال: "2026-06-26")
 * @returns {string} التاريخ الهجري الطويل
 */
export function gregorianToHijriLong(gregorianDateStr) {
  if (!gregorianDateStr) return '';
  try {
    return moment(gregorianDateStr, 'YYYY-MM-DD').format('iD iMMMM iYYYY');
  } catch (error) {
    console.error('Error in gregorianToHijriLong:', error);
    return '';
  }
}

/**
 * تحويل تاريخ هجري إلى تاريخ ميلادي (YYYY-MM-DD)
 * @param {string} hijriDateStr - التاريخ الهجري (مثال: "1448/01/11")
 * @param {string} format - تنسيق المدخل الهجري (الافتراضي: "iYYYY/iMM/iDD")
 * @returns {string} التاريخ الميلادي
 */
export function hijriToGregorian(hijriDateStr, format = 'iYYYY/iMM/iDD') {
  if (!hijriDateStr) return '';
  try {
    return moment(hijriDateStr, format).locale('en').format('YYYY-MM-DD');
  } catch (error) {
    console.error('Error in hijriToGregorian:', error);
    return '';
  }
}

/**
 * الحصول على تاريخ اليوم الهجري بالتنسيق الرقمي
 * @returns {string} اليوم هجرياً (مثال: "1448/01/11")
 */
export function getTodayHijri() {
  return moment().locale('en').format('iYYYY/iMM/iDD');
}

/**
 * الحصول على تاريخ اليوم الهجري بالصيغة المقروءة الطويلة
 * @returns {string} اليوم هجرياً مكتوباً (مثال: "11 محرم 1448 هـ")
 */
export function getTodayHijriLong() {
  return moment().format('iD iMMMM iYYYY');
}

/**
 * قائمة بأسماء الأشهر الهجرية بالترتيب
 */
export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];
