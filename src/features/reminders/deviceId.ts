import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'calendar-planner-device-id';

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return uuidv4();
  }
}
