/**
 * سكربت Node.js محلي لاستيراد قائمة المعلمين إلى قاعدة بيانات Supabase أونلاين.
 * يقوم بقراءة بيانات الاتصال تلقائياً من ملف .env.local ويتحقق من عدم تكرار الأسماء.
 * 
 * طريقة التشغيل من سطر الأوامر (Terminal):
 * node scripts/seed_teachers.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. قراءة وتحليل ملف البيئة .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('خطأ: لم يتم العثور على ملف .env.local في المجلد الرئيسي للمشروع.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    // إزالة علامات الاقتباس إن وجدت
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('خطأ: لم يتم العثور على إعدادات Supabase المطلوبة في ملف .env.local.');
  process.exit(1);
}

// 2. إنشاء عميل Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. قائمة المعلمين والإداريين
const teachers = [
  { name: 'عويض بن عبيد الله بن عويض المفرجي', specialty: 'رياضيات' },
  { name: 'مروان رشدي احمد اورقنجي', specialty: 'جغرافيا' },
  { name: 'خالد احمد محمد الغامدي', specialty: 'عربي' },
  { name: 'حمد شبيب دليل المقاطي', specialty: 'عربي' },
  { name: 'عبدالله محمد حمود الزايدي', specialty: 'دين' },
  { name: 'عبدالله حسن محسن الحارثي', specialty: 'عربي' },
  { name: 'رمضان علي متعب الزهراني', specialty: 'دين' },
  { name: 'هيثم غازي عبدالله سجيني', specialty: 'محضر معمل حاسب' },
  { name: 'سعود بن حماد بن محمد العميري', specialty: 'رياضيات' },
  { name: 'عبدالله غازي عبدالله القرشي', specialty: 'مسار رياضيات' },
  { name: 'حسان بن عياد بن عيد الحكمى', specialty: 'فنية' },
  { name: 'بندر عيضه مستور السعيدي', specialty: 'عربي' },
  { name: 'شخص حمدان عبدالله الغامدي', specialty: 'أحياء' },
  { name: 'هشام بن علي بن محمد سجيني', specialty: 'كيمياء' },
  { name: 'هاشم سعد مجري الزهراني', specialty: 'عربي' },
  { name: 'زهير محمد احمد لياتي', specialty: 'دين' },
  { name: 'نائل غزاي ساير العتيبي', specialty: 'مسار رياضيات' },
  { name: 'عبدالرحمن احمد عبدالرحمن الزهراني', specialty: 'دين' },
  { name: 'احمد حشيم سيف العتيبي', specialty: 'تاريخ' },
  { name: 'عبدالله بن احمد بن يحيى الزهراني', specialty: 'فنية' },
  { name: 'طلال احمد عبد الله النباتي', specialty: 'عربي' },
  { name: 'متعب محمد مسفر الحارثي', specialty: 'دين' },
  { name: 'الحسن احمد عبدالله الجيزاني', specialty: 'قراءات' },
  { name: 'عوض خضران سعيد الزهراني', specialty: 'تاريخ' },
  { name: 'خالد شاهر عودة الدعدي', specialty: 'محضر مختبر علوم' },
  { name: 'نايف عبدالله مصلح المطرفي', specialty: 'دين' },
  { name: 'صالح سعيد مزيوخ الهديبي', specialty: 'دين' },
  { name: 'محسن بن ماطر بن حسن مجرشي', specialty: 'عربي' },
  { name: 'صابر دخيل الله علي السيالي', specialty: 'مسار فيزياء' },
  { name: 'احمد عبدالله سعيد الزهراني', specialty: 'دين' },
  { name: 'اسامه محمد عائض الردادي', specialty: 'مسار رياضيات' },
  { name: 'عبدالله سليم عبدربه المسعودي', specialty: 'عربي' },
  { name: 'سمير احمد محمدنور صلواتي', specialty: 'دين' },
  { name: 'وائل حامد محمد القرشي', specialty: 'عربي' },
  { name: 'عبداللطيف احمد سعد آل سبتي', specialty: 'إنجليزي' },
  { name: 'خضر بن عبدالله بن عطية الغامدي', specialty: 'عربي' },
  { name: 'خالد عبدالله صويلح المالكي', specialty: 'مسار فيزياء' },
  { name: 'تركي صالح عزيز الحارثي', specialty: 'محضر مختبر علوم' },
  { name: 'منصور صالح حسن الزهراني', specialty: 'عربي' },
  { name: 'عبدالله زيد عبدالله الحارثي', specialty: 'دين' },
  { name: 'أحمد عطية محمد الزهراني', specialty: 'علوم' },
  { name: 'أحمد سامي أحمد العطاس', specialty: 'مسار كيمياء' },
  { name: 'صالح عالي علي المطرفي', specialty: 'مسار رياضيات' },
  { name: 'محمد صنهوت طلق الروقي', specialty: 'تاريخ' },
  { name: 'طارق عباد عبدالله الطلحي', specialty: 'كيمياء' },
  { name: 'ريان منصور ظافر الحصيني', specialty: 'إنجليزي' },
  { name: 'احمد بشيت حمد المطرفي', specialty: 'إنجليزي' },
  { name: 'جبريل أحمد حامد الزهراني', specialty: 'دين' },
  { name: 'عبيدالله احمد عبيدالله المنتشري', specialty: 'مسار رياضيات' },
  { name: 'نايف علي غرم الله الزهراني', specialty: 'عربي' },
  { name: 'عاطف سعيد عبدالعزيز الذيابي', specialty: 'إنجليزي' },
  { name: 'عبد الله بن هلال بن مطلق الحصيني', specialty: 'رياضيات' },
  { name: 'محمد بن مبارك بن فهد العصيمي', specialty: 'كيمياء' },
  { name: 'ياسر بن محمد بن عجيان العصيمي', specialty: 'عربي' },
  { name: 'مشاري بن مطلق بن عبدالله المقذلي النفيعي', specialty: 'بدنية' },
  { name: 'عوض عابد عودة الدعدي', specialty: 'عربي' },
  { name: 'هاني ضيف الله بن عبدالخالق الزهراني', specialty: 'حاسب' },
  { name: 'مشاري فلحان بن راضي الدعجاني', specialty: 'مسار عربي' },
  { name: 'عبدالمجيد موسى بن معيض الزهراني', specialty: 'إنجليزي' },
  { name: 'بندر عبدالله مريزيق العتيبي', specialty: 'بدنية' },
  { name: 'يزيد محمد مشاري الهزاني', specialty: 'بدنية' },
  { name: 'عبد الله بن ماجد بن عبد الله النباتي', specialty: 'تاريخ' },
  { name: 'احمد عمرو صويلح الجعيد', specialty: 'حاسب' },
  { name: 'جميل احمد يحي الهذلي', specialty: 'محضر مختبر علوم' },
  { name: 'احمد بن عبد الله بن عبدول آل تمام المنتشري', specialty: 'اداري' },
  { name: 'بندر بن تركي بن علي السفياني', specialty: 'اداري' },
  { name: 'فالح فلاح نويمي النفيعي', specialty: 'اداري' },
  { name: 'فهد بن شباب بن علي الغامدي', specialty: 'اداري' },
  { name: 'مصطفى بن ابراهيم علي المصري', specialty: 'اداري' },
  { name: 'يحى احمد عبدالله الزهراني', specialty: 'اداري' }
];

async function seed() {
  console.log(`بدء عملية التحقق وإدخال المعلمين (${teachers.length} معلم)...`);
  
  // 0. تنظيف السجلات المكررة بدون تخصص للاسم المحدد
  try {
    const { data: duplicates, error: fetchDupError } = await supabase
      .from('teachers')
      .select('id, name, extra_info')
      .or('name.eq.صابر دخيل الله علي السيالي,name.eq.صابر دخيل الله السيالي');

    if (!fetchDupError && duplicates && duplicates.length > 0) {
      for (const doc of duplicates) {
        const spec = doc.extra_info?.specialty;
        if (!spec || spec === '' || spec === '-') {
          const { error: delErr } = await supabase
            .from('teachers')
            .delete()
            .eq('id', doc.id);
          if (!delErr) {
            console.log(`[تنظيف] تم حذف السجل المكرر بدون تخصص للمعلم "${doc.name}" بنجاح.`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('تنبيه: خطأ أثناء محاولة تنظيف المكررين:', err.message || err);
  }

  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const teacher of teachers) {
    try {
      // التحقق من وجود المعلم مسبقاً بنفس الاسم
      const { data: existing, error: checkError } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('name', teacher.name);

      if (checkError) {
        throw checkError;
      }

      if (existing && existing.length > 0) {
        console.log(`[تخطي] المعلم "${teacher.name}" موجود مسبقاً بالمنصة.`);
        skippedCount++;
        continue;
      }

      // الإدخال لقاعدة البيانات
      const { error: insertError } = await supabase
        .from('teachers')
        .insert([{
          name: teacher.name,
          extra_info: { specialty: teacher.specialty }
        }]);

      if (insertError) {
        throw insertError;
      }

      console.log(`[إضافة] تم إدخال المعلم "${teacher.name}" بنجاح بتخصص [${teacher.specialty}].`);
      addedCount++;

    } catch (error) {
      console.error(`[خطأ] فشل التعامل مع المعلم "${teacher.name}":`, error.message || error);
      errorCount++;
    }
  }

  console.log('\n======================================');
  console.log('ملخص عملية الاستيراد:');
  console.log(`- تم الإضافة بنجاح: ${addedCount}`);
  console.log(`- تم التخطي (موجود مسبقاً): ${skippedCount}`);
  console.log(`- الأخطاء: ${errorCount}`);
  console.log('======================================');
}

seed();
