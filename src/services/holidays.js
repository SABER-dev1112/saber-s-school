/**
 * جلب الإجازات الرسمية للمملكة العربية السعودية من API عام ومجاني
 * وترجمة المسميات الشائعة للعربية لتناسب واجهة النظام
 * @param {number} year - السنة المراد جلب إجازاتها (مثال: 2026)
 * @returns {Promise<Array>} قائمة بالإجازات [{ date: "YYYY-MM-DD", name: "اسم الإجازة" }]
 */
export async function fetchSaudiHolidays(year = new Date().getFullYear()) {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SA`);
    if (!response.ok) {
      throw new Error('Failed to fetch holidays from API');
    }
    const data = await response.json();
    
    // قاموس الترجمة لمسميات إجازات السعودية الشهيرة
    const translations = {
      "National Day": "اليوم الوطني السعودي",
      "Saudi National Day": "اليوم الوطني السعودي",
      "Founding Day": "يوم التأسيس السعودي",
      "Saudi Founding Day": "يوم التأسيس السعودي",
      "Eid al-Fitr": "إجازة عيد الفطر المبارك",
      "Eid al-Adha": "إجازة عيد الأضحى المبارك",
      "Arafat Day": "يوم عرفة",
      "New Year's Day": "رأس السنة الميلادية"
    };

    return data.map(holiday => {
      // محاولة الترجمة أو استخدام الاسم المحلي أو الاسم الأصلي
      const name = translations[holiday.name] 
        || holiday.localName 
        || holiday.name;

      return {
        date: holiday.date, // صيغة YYYY-MM-DD
        name: name
      };
    });
  } catch (error) {
    console.error('Error fetching Saudi holidays:', error);
    // إرجاع قائمة احتياطية من الإجازات الثابتة في حال فشل الاتصال بالشبكة
    return [
      { date: `${year}-09-23`, name: 'اليوم الوطني السعودي (احتياطي)' },
      { date: `${year}-02-22`, name: 'يوم التأسيس السعودي (احتياطي)' }
    ];
  }
}

export default fetchSaudiHolidays;
