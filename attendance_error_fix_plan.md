# خطة تنفيذ معالجة أخطاء التحضير (HTTP 400)، أخطاء الكونسول (Lordicon)، وتفعيل نظام الطوارئ والمزامنة المباشرة

خطة هندسية شاملة تتوافق مع مبادئ **Clean Architecture** والمسؤولية الفردية للملفات (Single Responsibility - ملفات صغيرة مركزة 20-50 سطراً) لعلاج مشكلة فشل حفظ السجلات في قاعدة بيانات Supabase نهائياً، مع معالجة أخطاء الأيقونات، وتوفير نظام طوارئ يعمل محلياً عند انقطاع الاتصال.

---

## 1. الأهداف الرئيسية للخطة (Objectives)
1. **القضاء على خطأ HTTP 400 عند الحفظ:** منع إرسال نصوص فارغة (`""`) إلى حقول الوقت (`check_in_time`, `assembly_check_in_time`) عبر إنشاء طبقة تعقيم مركزية (Central Sanitizer).
2. **تصفير أخطاء الكونسول (Zero Console Errors):** التخلص من أخطاء `404` و `SyntaxError` الناتجة عن روابط `cdn.lordicon.com` المعطوبة واستبدالها بمكونات تحذير بصرية محلية موثوقة ونظيفة (Local SVGs).
3. **تطبيق آلية الحفظ التلقائي عند انقطاع الاتصال (Offline Queue & Auto-Sync):** في حال فشل الاتصال بسيرفر Supabase، يتم حفظ التحضير في طابور محلي (`LocalStorage Queue`)، وإشعار الموظف بنجاح الحفظ المؤقت مع إعادة المحاولة التلقائية عند عودة الإنترنت.
4. **تحديث وثيقة المعمارية (`project_architecture.md`):** توثيق كافة الملفات الجديدة وأدوارها لضمان الفهم الفوري وسرعة الصيانة مستقبلاً.

---

## 2. مراجعة وتقييم المخاطر (Risk Assessment & User Review)

> [!IMPORTANT]
> **التأكد من التوافقية (Backward Compatibility):**
> طبقة التعقيم الجديدة ستعمل بشكل شفاف (Transparent) داخل `src/services/db.js`، مما يعني أن أي شاشة قائمة أو مستقبلية (سواء للموظف أو المدير) تستدعي `saveAttendance` أو `submitCorrection` ستتمتع تلقائياً بحماية التعقيم وحماية الطابور المحلي دون الحاجة لتعديل شفرة كل صفحة بشكل معقد.

---

## 3. التغييرات المقترحة على الملفات ومكونات النظام (Proposed Changes)

### المجموعة الأولى: منطق العمل والتعقيم (Domain & Core Logic)

#### [NEW] `src/core/sanitizer.js`
ملف صغير ومستقل (30-45 سطراً) مسؤول حصرياً عن تعقيم وتنظيف سجلات الحضور والتعديلات قبل إرسالها إلى قاعدة البيانات:
- دالة `sanitizeTime(timeStr)`: تحويل أي قيمة فارغة `""`، أو غير صالحة إلى `null`.
- دالة `sanitizeInteger(val)`: تحويل أي قيمة غير رقمية أو فارغة إلى `0`.
- دالة `sanitizeAttendanceRecord(record)`: تعقيم السجل بالكامل (`check_in_time`, `delay_minutes`, `assembly_check_in_time`, `assembly_delay_minutes`, `class_delays`).
- دالة `sanitizeCorrectionRecord(record)`: تعقيم سجل طلب التعديل بنفس المعايير.

#### [NEW] `src/core/offlineQueue.js`
ملف صغير ومستقل (40-50 سطراً) مسؤول حصرياً عن إدارة طابور الحفظ المحلي عند انقطاع الإنترنت:
- دالة `enqueueAttendance(records)`: حفظ التحضير غير المرتسل في `localStorage.getItem('saber_offline_queue')`.
- دالة `getQueuedAttendance()`: جلب السجلات المعلقة.
- دالة `clearQueuedAttendance()`: تنظيف الطابور بعد مزامنته بنجاح.
- دالة `setupAutoSync(syncCallback)`: مراقبة حدث `window.addEventListener('online', ...)` لبدء المزامنة فور عودة الاتصال.

---

### المجموعة الثانية: طبقة الخدمات وقاعدة البيانات (Services Layer)

#### [MODIFY] `src/services/db.js`
- استيراد `sanitizeAttendanceRecord` و `sanitizeCorrectionRecord` من `src/core/sanitizer.js`.
- استيراد `enqueueAttendance` من `src/core/offlineQueue.js`.
- تعديل دالة `saveAttendance(records)`:
  1. تمرير كل سجل داخل `records` عبر دالة التعقيم `sanitizeAttendanceRecord`.
  2. في حال فشل استعلام `supabase.upsert()` بسبب مشكلة شبكة أو سيرفر (مثل انقطاع الإنترنت أو الخطأ `5xx`/`4xx` غير المتعلق بالصلاحية)، يتم استدعاء `enqueueAttendance(sanitizedRecords)` وإرجاع النتيجة مع علامة `{ fromOfflineQueue: true }` لكي لا يتعطل عمل الموظف.
- تعديل دالة `submitCorrection` و `updateCorrectionStatus` لتطبيق نفس التعقيم المسبق.

---

### المجموعة الثالثة: المكونات الرسومية والواجهات (UI Components & Pages)

#### [NEW] `src/components/common/AlertIcon.js`
- مكون صغير (20 سطراً) يحتوي على أيقونة SVG تحذيرية/معلوماتية منسقة بجمالية ومصممة لتحل محل استدعاءات `lord-icon` المعطوبة.

#### [MODIFY] `src/app/employee/page.js`
- استبدال استدعاءات `<lord-icon>` (في أسطر التنبيهات مثل السطر 526 وفي مودال التنبيهات) بالمكون الموثوق والنظيف `AlertIcon` أو أيقونة تحذير بصرية ثابتة ونظيفة.
- تحسين التعامل مع استجابة دالة `executeSave` لإشعار الموظف عند حدوث حفظ مؤقت بـ Offline Queue وتفعيل المزامنة التلقائية.

#### [MODIFY] `src/app/manager/page.js`
- فحص وإزالة أي استدعاءات لروابط `lord-icon` الخارجية المعطوبة أو نصوص فارغة تسبب استثناءات في المتصفح.

---

### المجموعة الرابعة: التوثيق (Architecture Documentation)

#### [MODIFY] `project_architecture.md`
- إضافة الملفات الجديدة (`src/core/sanitizer.js`, `src/core/offlineQueue.js`, `src/components/common/AlertIcon.js`) وتفصيل مسؤولياتها الفردية داخل خريطة المشروع وفقاً للقاعدة الخامسة (Rule 5).

---

## 4. خطة التحقق والختبار (Verification Plan)

### التحقق الآلي والتفتيش البرمجي (Automated & Static Checks)
- تشغيل استعلام البحث `grep_search` للتأكد من خلو المشروع تماماً من أي رابط لـ `cdn.lordicon.com` أو معالجات وقت غير معقمة.
- اختبار التحميل المباشر لتطبيق Next.js عبر تشغيل `npm run dev` والتحقق من عدم وجود أي خطأ في الطرفية (Terminal).

### التحقق اليدوي واختبار السيناريوهات (Manual Verification Scenarios)
1. **سيناريو الحضور في الموعد (Zero Delay):** تحديد معلمين بحالة "حاضر في الموعد" (`check_in_time = ""` في المتصفح) والضغط على "حفظ التحضير الصباحي"، والتحقق من أن استعلام Supabase يُرسل `check_in_time: null` بنجاح ويعود بـ `status: 200/201`.
2. **سيناريو التأخير وإدخال الدقائق والوقت:** تجربة تسجيل تأخير في التحضير العام وطابور الصباح والتأكد من الحفظ دون أي مشاكل فنية.
3. **سيناريو انقطاع الإنترنت (Offline Emergency Test):** محاكاة انقطاع الشبكة (Offline Mode في المتصفح) والضغط على "حفظ التحضير"، والتأكد من حفظ البيانات في الطابور المحلي مع ظهور تنبيه أصفر واضح للموظف، ثم إعادة الاتصال والتحقق من مزامنة البيانات تلقائياً مع Supabase.
4. **فحص الكونسول (Console Inspection):** التأكد من اختفاء أخطاء الـ `404` والـ `SyntaxError` بالكامل أثناء تصفح لوحة الموظف والمدير.
