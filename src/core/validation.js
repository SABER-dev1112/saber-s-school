/**
 * التحقق مما إذا كانت نسب الغياب أو فترات غياب المعلمين تعتبر "مريبة" وتستدعي تنبيه المدير
 * @param {Array} attendanceRecords - جميع سجلات الحضور السابقة واليومية
 * @param {number} teachersCount - إجمالي عدد المعلمين الفعالين بالمدرسة
 * @param {string} targetDate - التاريخ المراد التحقق منه (مثال: "2026-06-26")
 * @param {number} consecutiveThreshold - عدد الأيام المتتالية للغياب التي تعتبر مريبة (الافتراضي: 3)
 * @param {number} percentageThreshold - نسبة غياب المعلمين اليومية التي تعتبر مريبة (الافتراضي: 30)
 * @returns {Object} نتيجة الفحص { suspicious: boolean, reason: string | null }
 */
export function checkSuspiciousAbsence(
  attendanceRecords,
  teachersCount,
  targetDate,
  consecutiveThreshold = 3,
  percentageThreshold = 30
) {
  if (!attendanceRecords || attendanceRecords.length === 0 || !teachersCount) {
    return { suspicious: false, reason: null };
  }

  // 1. التحقق من نسبة الغياب في اليوم المستهدف
  const dailyRecords = attendanceRecords.filter(r => r.date === targetDate);
  const absentCount = dailyRecords.filter(r => r.status === 'absent').length;
  const absentPercentage = (absentCount / teachersCount) * 100;

  if (absentPercentage >= percentageThreshold) {
    return {
      suspicious: true,
      reason: `تجاوزت نسبة غياب المعلمين اليوم ${percentageThreshold}% (حيث بلغت ${absentPercentage.toFixed(1)}%، وغاب ${absentCount} معلم من أصل ${teachersCount})`
    };
  }

  // 2. التحقق من غياب معلم معين لعدة أيام متتالية تنتهي في اليوم المستهدف
  const teacherStreakMap = {};

  // ترتيب السجلات تصاعدياً بالتاريخ لحساب التتالي بشكل سليم
  const sortedRecords = [...attendanceRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const record of sortedRecords) {
    const teacherId = record.teacher_id;
    if (!teacherStreakMap[teacherId]) {
      teacherStreakMap[teacherId] = { currentStreak: 0, triggeredToday: false };
    }

    if (record.status === 'absent') {
      teacherStreakMap[teacherId].currentStreak += 1;
      
      // إذا غاب المعلم لعدد الأيام المحدد وكان اليوم المستهدف هو آخر يوم غياب
      if (teacherStreakMap[teacherId].currentStreak >= consecutiveThreshold && record.date === targetDate) {
        teacherStreakMap[teacherId].triggeredToday = true;
      }
    } else {
      // الحضور أو الإجازات المعتمدة تقطع سلسلة الغياب غير المبرر
      teacherStreakMap[teacherId].currentStreak = 0;
    }
  }

  // البحث عن أي معلمين سجلوا غياباً متتالياً مريباً اليوم
  const triggeredTeachers = Object.keys(teacherStreakMap).filter(tId => teacherStreakMap[tId].triggeredToday);

  if (triggeredTeachers.length > 0) {
    return {
      suspicious: true,
      reason: `تم رصد غياب متتالٍ بدون عذر لمعلم أو أكثر لـ ${consecutiveThreshold} أيام متتالية أو أكثر تنتهي اليوم.`
    };
  }

  return { suspicious: false, reason: null };
}
export default checkSuspiciousAbsence;
