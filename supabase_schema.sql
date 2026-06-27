-- =========================================================================
--  سكربت تهيئة قاعدة البيانات لمنصة مدرسة أبي دجانة المتوسطة على Supabase
--  يرجى نسخ هذا الكود بالكامل ولصقه في قسم SQL Editor وتشغيله (Run)
-- =========================================================================

-- 1. جدول الإعدادات الفنية والأكاديمية للمدرسة
create table if not exists public.school_settings (
  id bigint primary key, -- 1 هو الرقم الفريد لصف الإعدادات الوحيد
  school_name text not null default 'مدرسة أبي دجانه المتوسطه',
  manager_name text not null default 'الأستاذ صابر',
  start_time time not null default '07:00',
  shift_duration integer not null default 7,
  header_metadata jsonb not null default '{"city": "مكة المكرمة", "semester": "الفصل الدراسي الثاني", "domain": "التعليم العام"}'::jsonb,
  official_holidays jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. جدول المعلمين المسجلين بالمدرسة
create table if not exists public.teachers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  extra_info jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. جدول حضور وغياب وتأخير المعلمين اليومي
create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'excused', 'emergency_pending', 'emergency_approved')),
  check_in_time time,
  delay_minutes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_teacher_date unique (teacher_id, date)
);

-- 4. جدول طلبات الإجازات المعتمدة مسبقاً
create table if not exists public.leaves (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. جدول طلبات تعديل المستندات المغلقة المقدمة من الموظف للمدير
create table if not exists public.attendance_corrections (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  teacher_name text not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'excused')),
  check_in_time time,
  delay_minutes integer default 0,
  reason text not null,
  request_status text not null default 'pending' check (request_status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. جدول ملفات تعريف المستخدمين لتحديد صلاحيات الحساب (مدير أو موظف)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null check (role in ('manager', 'employee')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
--  تفعيل حماية الوصول (Row Level Security - RLS) والسياسات العامة
-- =========================================================================

alter table public.school_settings enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance enable row level security;
alter table public.leaves enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.profiles enable row level security;

-- إنشاء سياسات تمنح المستخدمين المسجلين (Authenticated Users) صلاحية كاملة (القراءة والكتابة)
create policy "Allow all to authenticated on settings" on public.school_settings for all using (true) with check (true);
create policy "Allow all to authenticated on teachers" on public.teachers for all using (true) with check (true);
create policy "Allow all to authenticated on attendance" on public.attendance for all using (true) with check (true);
create policy "Allow all to authenticated on leaves" on public.leaves for all using (true) with check (true);
create policy "Allow all to authenticated on corrections" on public.attendance_corrections for all using (true) with check (true);
create policy "Allow all to authenticated on profiles" on public.profiles for all using (true) with check (true);

-- سياسات قراءة فقط للزوار غير المسجلين (Anon) لضمان عدم توقف الواجهات
create policy "Allow read to anon on settings" on public.school_settings for select using (true);
create policy "Allow read to anon on teachers" on public.teachers for select using (true);
create policy "Allow read to anon on attendance" on public.attendance for select using (true);
create policy "Allow read to anon on leaves" on public.leaves for select using (true);
create policy "Allow read to anon on corrections" on public.attendance_corrections for select using (true);
create policy "Allow read to anon on profiles" on public.profiles for select using (true);

-- =========================================================================
--  دالة وزناد (Trigger) لربط مستخدمي Auth بجدول البروفايلات تلقائياً
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employee') -- الافتراضي موظف إذا لم يحدد
  );
  return new;
end;
$$ language plpgsql security definer;

-- تفعيل الزناد بمجرد إنشاء حساب مستخدم
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
--  إدخال البيانات الافتراضية الأولية (Settings & Seed Data)
-- =========================================================================

insert into public.school_settings (id, school_name, manager_name, start_time, shift_duration, header_metadata, official_holidays, custom_fields)
values (1, 'مدرسة أبي دجانه المتوسطه', 'الأستاذ صابر', '07:00', 7, '{"city": "مكة المكرمة", "semester": "الفصل الدراسي الثاني", "domain": "التعليم العام"}'::jsonb, '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;

-- إدخال المعلمين الافتراضيين
insert into public.teachers (name, extra_info) values
('أحمد بن عبد الله الغامدي', '{"specialty": "الرياضيات", "phone": "0501234567"}'::jsonb),
('محمد بن علي الحربي', '{"specialty": "العلوم العامة", "phone": "0507654321"}'::jsonb),
('ياسر بن محمد الشهري', '{"specialty": "اللغة العربية", "phone": "0501112223"}'::jsonb),
('سلطان بن فهد العتيبي', '{"specialty": "التربية الإسلامية", "phone": "0503334445"}'::jsonb),
('خالد بن سعيد الدوسري', '{"specialty": "اللغة الإنجليزية", "phone": "0505556667"}'::jsonb);

-- =========================================================================
--  إرشادات هامة للمدير لتهيئة الحسابات بعد إنشاء الجداول:
-- =========================================================================
/*
 1. توجه إلى لوحة تحكم Supabase الخاصة بك -> Authentication -> Users.
 2. انقر على "Add user" -> "Create user" لإضافة الموظفين والمدير ببريد إلكتروني وباسورد.
 3. بعد إنشاء المستخدمين، لتحديد دور المدير (Manager)، قم بتشغيل هذا الاستعلام في الـ SQL Editor:
    
    update public.profiles set role = 'manager' where email = 'بريد_المدير_هنا@example.com';
    
 4. حسابات الموظفين تظل بدور 'employee' افتراضياً ولا تحتاج لتعديل.
*/
