const QUEUE_KEY = 'saber_offline_attendance_queue';

export function enqueueAttendance(records) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getQueuedAttendance();
    records.forEach(newRec => {
      const idx = existing.findIndex(r => r.teacher_id === newRec.teacher_id && r.date === newRec.date);
      if (idx !== -1) {
        existing[idx] = newRec;
      } else {
        existing.push(newRec);
      }
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to enqueue offline attendance:', err);
  }
}

export function getQueuedAttendance() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to read offline queue:', err);
    return [];
  }
}

export function clearQueuedAttendance() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(QUEUE_KEY);
}

export function setupAutoSync(syncCallback) {
  if (typeof window === 'undefined') return;
  
  const triggerSync = async () => {
    const queue = getQueuedAttendance();
    if (queue.length === 0) return;
    
    try {
      const success = await syncCallback(queue);
      if (success) {
        clearQueuedAttendance();
        console.log('Offline attendance synchronized successfully.');
      }
    } catch (err) {
      console.error('Auto sync failed:', err);
    }
  };

  window.addEventListener('online', triggerSync);
  
  if (navigator.onLine) {
    triggerSync();
  }
}
