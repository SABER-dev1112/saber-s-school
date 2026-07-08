# خطة تقسيم الحفظ والإرسال على مستوى التبويبات الثلاثة وتتبع حالاتها الفردية

تعديل معمارية صفحة التحضير بحيث يتمكن موظف الغياب من إرسال وحفظ كل قسم بشكل منفصل (التحضير العام، الطابور، الحصص)، مع تتبع حالة إرسال كل تبويب ("تم الإرسال" أو "لم يتم الإرسال بعد") وقفل حقول التبويب المرسل فقط.

---

## 1. التغييرات المطلوبة في قاعدة البيانات (Database Schema Updates)

يجب إضافة ثلاثة أعمدة منطقية (Boolean) لتتبع حالة إرسال كل قسم في جدولي الحضور والغياب والتصحيحات. 

> [!IMPORTANT]
> **استعلام SQL المطلوب تشغيله في Supabase SQL Editor:**
> ```sql
> ALTER TABLE public.attendance 
> ADD COLUMN IF NOT EXISTS submitted_general boolean DEFAULT false,
> ADD COLUMN IF NOT EXISTS submitted_assembly boolean DEFAULT false,
> ADD COLUMN IF NOT EXISTS submitted_classes boolean DEFAULT false;
> 
> ALTER TABLE public.attendance_corrections 
> ADD COLUMN IF NOT EXISTS submitted_general boolean DEFAULT false,
> ADD COLUMN IF NOT EXISTS submitted_assembly boolean DEFAULT false,
> ADD COLUMN IF NOT EXISTS submitted_classes boolean DEFAULT false;
> ```

---

## 2. المقترحات والتغييرات البرمجية (Proposed Changes)

### طبقة منطق العمل (Core Layer)

#### [MODIFY] [sanitizer.js](file:///d:/downloads/%D8%A7%D8%B3%D8%AA%D8%A7%D8%B0%20%D8%B5%D8%A7%D8%A8%D8%B1/%D9%85%D9%88%D8%A7%D9%82%D8%B9/saber%20school%20managment/src/core/sanitizer.js)
- تحديث دوال التعقيم لتشمل الأعمدة الثلاثة الجديدة (`submitted_general`, `submitted_assembly`, `submitted_classes`) والتأكد من تحويلها لقيم منطقية (`boolean`).

---

### طبقة الخدمات وقاعدة البيانات (Services Layer)

#### [MODIFY] [db.js](file:///d:/downloads/%D8%A7%D8%B3%D8%AA%D8%A7%D8%B0%20%D8%B5%D8%A7%D8%A8%D8%B1/%D9%85%D9%88%D8%A7%D9%82%D8%B9/saber%20school%20managment/src/services/db.js)
- تعديل دالة `saveAttendance(records)` لدعم التحديث الجزئي للأقسام:
  1. استقبال البيانات وتحديث حقول القسم المرسل فقط.
  2. دمج البيانات الجديدة مع البيانات الموجودة مسبقاً في قاعدة البيانات لنفس المعلم واليوم لضمان عدم ضياع بيانات الأقسام الأخرى.

---

### طبقة الواجهة الرسومية والصفحات (UI Components & Pages)

#### [MODIFY] [page.js (Employee)](file:///d:/downloads/%D8%A7%D8%B3%D8%AA%D8%A7%D8%B0%20%D8%B5%D8%A7%D8%A8%D8%B1/%D9%85%D9%88%D8%A7%D9%82%D8%B9/saber%20school%20managment/src/app/employee/page.js)
- **فصل قفل الصفحة الإجمالي:** إزالة قفل الصفحة بالكامل عند وجود أي سجل للحضور.
- **تحديد حالات الإرسال:**
  - قراءة الأعمدة (`submitted_general`, `submitted_assembly`, `submitted_classes`) لمعرفة حالة كل قسم.
  - عرض حالة الإرسال بجانب اسم كل تبويب في الواجهة:
    - 🟢 **تم الإرسال** (باللون الأخضر).
    - 🟡 **لم يتم الإرسال بعد** (باللون البرتقالي).
- **أزرار حفظ مستقلة لكل تبويب:**
  - تبويب التحضير العام: زر "حفظ وإرسال التحضير الصباحي".
  - تبويب طابور الصباح: زر "حفظ وإرسال تحضير الطابور".
  - تبويب الحصص: زر "حفظ وإرسال غياب وتأخر الحصص".
- **قفل الحقول الذكي:** قفل المدخلات والاختيارات الخاصة بالتبويب المرسل فقط، وترك بقية التبويبات غير المرسلة مفتوحة للتعديل والحفظ بحرية.

---

## 3. خطة التحقق والاختبار (Verification Plan)

- **اختبار الحفظ المستقل:** التأكد من إمكانية حفظ التحضير الصباحي أولاً في الساعة 7 صباحاً بنجاح دون إغلاق تبويب الطابور أو الحصص.
- **اختبار حالات التبويبات:** التحقق من ظهور شارة "تم الإرسال" باللون الأخضر وقفل حقول التبويب المرتسل فقط، وظهور "لم يتم الإرسال بعد" للتبويبات الأخرى.
- **التحقق من بقاء البيانات:** التأكد من أن حفظ قسم "طابور الصباح" لا يمسح أو يصفر بيانات "التحضير العام" المسجلة مسبقاً في قاعدة البيانات.
