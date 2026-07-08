export function sanitizeTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '') {
    return null;
  }
  const trimmed = timeStr.trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function sanitizeInteger(val) {
  if (val === null || val === undefined) return 0;
  const num = parseInt(val, 10);
  return Number.isNaN(num) ? 0 : num;
}

export function sanitizeBoolean(val) {
  return !!val;
}

export function sanitizeAttendanceRecord(record) {
  if (!record) return null;
  return {
    ...record,
    check_in_time: sanitizeTime(record.check_in_time),
    delay_minutes: sanitizeInteger(record.delay_minutes),
    assembly_check_in_time: sanitizeTime(record.assembly_check_in_time),
    assembly_delay_minutes: sanitizeInteger(record.assembly_delay_minutes),
    class_delays: Array.isArray(record.class_delays) ? record.class_delays : [],
    submitted_general: sanitizeBoolean(record.submitted_general),
    submitted_assembly: sanitizeBoolean(record.submitted_assembly),
    submitted_classes: sanitizeBoolean(record.submitted_classes)
  };
}

export function sanitizeCorrectionRecord(record) {
  if (!record) return null;
  return {
    ...record,
    check_in_time: sanitizeTime(record.check_in_time),
    delay_minutes: sanitizeInteger(record.delay_minutes),
    assembly_check_in_time: sanitizeTime(record.assembly_check_in_time),
    assembly_delay_minutes: sanitizeInteger(record.assembly_delay_minutes),
    class_delays: Array.isArray(record.class_delays) ? record.class_delays : [],
    submitted_general: sanitizeBoolean(record.submitted_general),
    submitted_assembly: sanitizeBoolean(record.submitted_assembly),
    submitted_classes: sanitizeBoolean(record.submitted_classes)
  };
}
