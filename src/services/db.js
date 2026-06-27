import { supabase, isSupabaseConfigured } from './supabase';

// البيانات الأولية لمحاكاة النظام بدون Supabase (Seed Data)
const INITIAL_TEACHERS = [];

const INITIAL_SETTINGS = {
  school_name: 'مدرسة أبي دجانه المتوسطه',
  manager_name: 'الأستاذ صابر',
  start_time: '06:50',
  shift_duration: 7,
  header_metadata: {
    city: 'مكة المكرمة',
    semester: 'الفصل الدراسي الثاني',
    domain: 'التعليم العام'
  },
  official_holidays: [
    { date: '2026-09-23', name: 'اليوم الوطني السعودي' },
    { date: '2026-02-22', name: 'يوم التأسيس' }
  ],
  custom_fields: [
    { id: 'specialty', name: 'التخصص', type: 'text', required: true },
    { id: 'phone', name: 'رقم الجوال', type: 'text', required: false }
  ]
};

const INITIAL_PASSWORDS = {
  manager: 'admin123',
  employee: 'staff123'
};

const INITIAL_ATTENDANCE = [];

const INITIAL_LEAVES = [];

// مساعدات المخزن المحلي (LocalStorage Helper functions)
const getLocalData = (key, defaultValue) => {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = (key, value) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// تهيئة المخزن المحلي إذا لم يكن مهيئاً
if (typeof window !== 'undefined' && !localStorage.getItem('initialized_saber_school')) {
  localStorage.setItem('teachers', JSON.stringify(INITIAL_TEACHERS));
  localStorage.setItem('settings', JSON.stringify(INITIAL_SETTINGS));
  localStorage.setItem('passwords', JSON.stringify(INITIAL_PASSWORDS));
  localStorage.setItem('attendance', JSON.stringify(INITIAL_ATTENDANCE));
  localStorage.setItem('leaves', JSON.stringify(INITIAL_LEAVES));
  localStorage.setItem('initialized_saber_school', 'true');
}

if (typeof window !== 'undefined' && !localStorage.getItem('corrections')) {
  localStorage.setItem('corrections', JSON.stringify([]));
}

// -------------------------------------------------------------
// واجهة التعامل مع قاعدة البيانات (Database Interface)
// -------------------------------------------------------------

export const db = {
  // --- مصادقة المستخدمين ---
  async login(email, password) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error || !data?.user) return false;

        // جلب دور المستخدم من جدول الـ profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) return false;
        return profile.role; // يرجع 'manager' أو 'employee'
      } catch (err) {
        console.error('Login error:', err);
        return false;
      }
    } else {
      // المحاكاة المحلية الافتراضية
      const passwords = getLocalData('passwords', INITIAL_PASSWORDS);
      if (email === 'manager@school.edu' && password === passwords.manager) {
        return 'manager';
      }
      if (email === 'employee@school.edu' && password === passwords.employee) {
        return 'employee';
      }
      // دعم تسجيل الدخول بالرول القديم للـ backward compatibility
      if (email === 'manager' && passwords.manager === password) return 'manager';
      if (email === 'employee' && passwords.employee === password) return 'employee';
      return false;
    }
  },

  async updatePassword(role, newPassword) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        return !error;
      } catch (err) {
        console.error(err);
        return false;
      }
    } else {
      const passwords = getLocalData('passwords', INITIAL_PASSWORDS);
      passwords[role] = newPassword;
      setLocalData('passwords', passwords);
      return true;
    }
  },

  // --- المعلمين ---
  async getTeachers() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('teachers').select('*').order('name');
      if (error) throw error;
      return data;
    } else {
      return getLocalData('teachers', INITIAL_TEACHERS).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }
  },

  async addTeacher(name, extraInfo) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('teachers')
        .insert([{ name, extra_info: extraInfo }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const teachers = getLocalData('teachers', INITIAL_TEACHERS);
      const newTeacher = { id: 't_' + Date.now(), name, extra_info: extraInfo };
      teachers.push(newTeacher);
      setLocalData('teachers', teachers);
      return newTeacher;
    }
  },

  async updateTeacher(id, name, extraInfo) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('teachers')
        .update({ name, extra_info: extraInfo })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const teachers = getLocalData('teachers', INITIAL_TEACHERS);
      const index = teachers.findIndex(t => t.id === id);
      if (index !== -1) {
        teachers[index] = { ...teachers[index], name, extra_info: extraInfo };
        setLocalData('teachers', teachers);
        return teachers[index];
      }
      throw new Error('Teacher not found');
    }
  },

  async deleteTeacher(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      let teachers = getLocalData('teachers', INITIAL_TEACHERS);
      teachers = teachers.filter(t => t.id !== id);
      setLocalData('teachers', teachers);
      return true;
    }
  },

  // --- الإعدادات ---
  async getSettings() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('school_settings').select('*').single();
      if (error) {
        // إذا كان الجدول فارغاً نقوم بإنشاء الصف الأول
        const { data: newRow, error: insertError } = await supabase
          .from('school_settings')
          .insert([INITIAL_SETTINGS])
          .select()
          .single();
        if (insertError) throw insertError;
        return newRow;
      }
      return data;
    } else {
      return getLocalData('settings', INITIAL_SETTINGS);
    }
  },

  async updateSettings(settings) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('school_settings')
        .update(settings)
        .eq('id', 1)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const current = getLocalData('settings', INITIAL_SETTINGS);
      const updated = { ...current, ...settings };
      setLocalData('settings', updated);
      return updated;
    }
  },

  // --- الحضور والغياب ---
  async getAttendance(date) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
      if (error) throw error;
      return data;
    } else {
      const attendance = getLocalData('attendance', INITIAL_ATTENDANCE);
      return attendance.filter(a => a.date === date);
    }
  },

  async getAttendanceForPeriod(startDate, endDate) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return data;
    } else {
      const attendance = getLocalData('attendance', INITIAL_ATTENDANCE);
      return attendance.filter(a => a.date >= startDate && a.date <= endDate);
    }
  },

  async getAllAttendance() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('attendance').select('*');
      if (error) throw error;
      return data;
    } else {
      return getLocalData('attendance', INITIAL_ATTENDANCE);
    }
  },

  async saveAttendance(records) {
    // records: Array of { teacher_id, date, status, check_in_time, delay_minutes }
    if (isSupabaseConfigured) {
      // استخدام upsert لتحديث أو إضافة السجل
      const { data, error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'teacher_id, date' })
        .select();
      if (error) throw error;
      return data;
    } else {
      const attendance = getLocalData('attendance', INITIAL_ATTENDANCE);
      records.forEach(newRec => {
        const index = attendance.findIndex(a => a.teacher_id === newRec.teacher_id && a.date === newRec.date);
        if (index !== -1) {
          attendance[index] = { ...attendance[index], ...newRec };
        } else {
          attendance.push({ id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), ...newRec });
        }
      });
      setLocalData('attendance', attendance);
      return records;
    }
  },

  // --- الإجازات المسبقة ---
  async getLeaves() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leaves').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      return getLocalData('leaves', INITIAL_LEAVES);
    }
  },

  async requestLeave(teacherId, startDate, endDate, type, status = 'pending') {
    const leaveData = {
      teacher_id: teacherId,
      start_date: startDate,
      end_date: endDate,
      type,
      status
    };
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leaves').insert([leaveData]).select().single();
      if (error) throw error;
      return data;
    } else {
      const leaves = getLocalData('leaves', INITIAL_LEAVES);
      const newLeave = { id: 'l_' + Date.now(), ...leaveData };
      leaves.push(newLeave);
      setLocalData('leaves', leaves);
      return newLeave;
    }
  },

  async updateLeaveStatus(leaveId, status) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('leaves')
        .update({ status })
        .eq('id', leaveId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const leaves = getLocalData('leaves', INITIAL_LEAVES);
      const index = leaves.findIndex(l => l.id === leaveId);
      if (index !== -1) {
        leaves[index].status = status;
        
        // إذا تمت الموافقة على إجازة، يمكننا أيضاً تسجيلها في شيت الحضور تلقائياً كـ excused للتواريخ المحددة
        if (status === 'approved') {
          const leave = leaves[index];
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          const attendanceRecords = [];
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            attendanceRecords.push({
              teacher_id: leave.teacher_id,
              date: dateStr,
              status: 'excused',
              check_in_time: null,
              delay_minutes: 0
            });
          }
          await this.saveAttendance(attendanceRecords);
        }
        
        setLocalData('leaves', leaves);
        return leaves[index];
      }
      throw new Error('Leave record not found');
    }
  },

  // --- طلبات تعديل الحضور والغياب (Corrections) ---
  async getCorrections() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('attendance_corrections').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase corrections failed, falling back to localStorage', err);
        return getLocalData('corrections', []);
      }
    } else {
      return getLocalData('corrections', []);
    }
  },

  async submitCorrection(teacherId, teacherName, date, status, checkInTime, delayMinutes, reason) {
    const correctionData = {
      id: 'corr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      teacher_id: teacherId,
      teacher_name: teacherName,
      date,
      status,
      check_in_time: checkInTime,
      delay_minutes: delayMinutes || 0,
      reason,
      request_status: 'pending',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('attendance_corrections').insert([correctionData]).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase submitCorrection failed, falling back to localStorage', err);
        const corrections = getLocalData('corrections', []);
        corrections.push(correctionData);
        setLocalData('corrections', corrections);
        return correctionData;
      }
    } else {
      const corrections = getLocalData('corrections', []);
      corrections.push(correctionData);
      setLocalData('corrections', corrections);
      return correctionData;
    }
  },

  async updateCorrectionStatus(correctionId, requestStatus) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('attendance_corrections')
          .update({ request_status: requestStatus })
          .eq('id', correctionId)
          .select()
          .single();
        if (error) throw error;

        if (requestStatus === 'approved') {
          // تحديث جدول الحضور
          await this.saveAttendance([{
            teacher_id: data.teacher_id,
            date: data.date,
            status: data.status,
            check_in_time: data.check_in_time,
            delay_minutes: data.delay_minutes
          }]);
        }
        return data;
      } catch (err) {
        console.warn('Supabase updateCorrectionStatus failed, falling back to localStorage', err);
        return this.updateCorrectionStatusLocal(correctionId, requestStatus);
      }
    } else {
      return this.updateCorrectionStatusLocal(correctionId, requestStatus);
    }
  },

  async updateCorrectionStatusLocal(correctionId, requestStatus) {
    const corrections = getLocalData('corrections', []);
    const index = corrections.findIndex(c => c.id === correctionId);
    if (index !== -1) {
      corrections[index].request_status = requestStatus;
      
      if (requestStatus === 'approved') {
        const corr = corrections[index];
        await this.saveAttendance([{
          teacher_id: corr.teacher_id,
          date: corr.date,
          status: corr.status,
          check_in_time: corr.status === 'present' ? corr.check_in_time : null,
          delay_minutes: corr.delay_minutes
        }]);
      }
      setLocalData('corrections', corrections);
      return corrections[index];
    }
    throw new Error('Correction record not found');
  }
};

export default db;
