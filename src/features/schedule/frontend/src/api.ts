export class AuthError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? "unauth" : "forbidden");
    this.status = status;
  }
}

export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_SCHEDULE_URL;
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}

function throwIfAuthFailed(res: Response): void {
  if (res.status === 401 || res.status === 403) {
    throw new AuthError(res.status);
  }
}

export type Settings = {
  login_url: string;
  menu_url: string;
  icon_system: string;
  icon_back: string;
};

export type CategoryItem = {
  id: number;
  name: string;
  color: string;
  is_deleted: boolean;
};

export type ScheduleItem = {
  id: number;
  title: string;
  location: string | null;
  detail: string | null;
  kind: "event" | "todo";
  granularity: "day" | "time";
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  category_id: number;
  is_completed: boolean | null;
};

export type Preferences = {
  week_starts_on: "sunday" | "monday";
  show_deleted: boolean;
  hidden_category_ids: number[];
};

export type HolidayItem = {
  date: string;
  name: string;
};

export type UserHolidayItem = {
  id: number;
  holiday_date: string;
  name: string;
};

export type SchedulePayload = {
  title: string;
  location?: string;
  detail?: string;
  kind: "event" | "todo";
  granularity: "day" | "time";
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  category_id: number;
};

export async function getSettings(): Promise<Settings> {
  const res = await apiFetch("/settings");
  if (!res.ok) {
    throw new Error("settings");
  }
  return (await res.json()) as Settings;
}

export async function getCategories(includeDeleted: boolean): Promise<CategoryItem[]> {
  const query = includeDeleted ? "?include_deleted=true" : "";
  const res = await apiFetch(`/categories${query}`);
  throwIfAuthFailed(res);
  if (!res.ok) {
    throw new Error("categories");
  }
  return ((await res.json()) as { items: CategoryItem[] }).items;
}

export async function createCategory(
  name: string,
  color: string,
): Promise<CategoryItem | "invalid" | "conflict"> {
  const res = await apiFetch("/categories", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
  throwIfAuthFailed(res);
  if (res.status === 201) {
    return (await res.json()) as CategoryItem;
  }
  if (res.status === 400) {
    return "invalid";
  }
  if (res.status === 409) {
    return "conflict";
  }
  throw new Error("categories");
}

export async function updateCategory(
  id: number,
  name: string,
  color: string,
): Promise<CategoryItem | "invalid" | "missing" | "conflict"> {
  const res = await apiFetch(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, color }),
  });
  throwIfAuthFailed(res);
  if (res.status === 200) {
    return (await res.json()) as CategoryItem;
  }
  if (res.status === 400) {
    return "invalid";
  }
  if (res.status === 404) {
    return "missing";
  }
  if (res.status === 409) {
    return "conflict";
  }
  throw new Error("categories");
}

export async function deleteCategory(id: number): Promise<"ok" | "missing"> {
  const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
  throwIfAuthFailed(res);
  if (res.status === 204) {
    return "ok";
  }
  if (res.status === 404) {
    return "missing";
  }
  throw new Error("categories");
}

export async function getPreferences(): Promise<Preferences> {
  const res = await apiFetch("/preferences");
  throwIfAuthFailed(res);
  if (!res.ok) {
    throw new Error("preferences");
  }
  return (await res.json()) as Preferences;
}

export async function savePreferences(body: Preferences): Promise<Preferences | "invalid"> {
  const res = await apiFetch("/preferences", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  throwIfAuthFailed(res);
  if (res.status === 200) {
    return (await res.json()) as Preferences;
  }
  if (res.status === 400) {
    return "invalid";
  }
  throw new Error("preferences");
}

export async function getSchedules(startDate: string, endDate: string): Promise<ScheduleItem[]> {
  const res = await apiFetch(`/schedules?start_date=${startDate}&end_date=${endDate}`);
  throwIfAuthFailed(res);
  if (!res.ok) {
    throw new Error("schedules");
  }
  return ((await res.json()) as { items: ScheduleItem[] }).items;
}

export async function createSchedule(
  body: SchedulePayload,
): Promise<ScheduleItem | "invalid" | "missing"> {
  const res = await apiFetch("/schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });
  throwIfAuthFailed(res);
  if (res.status === 201) {
    return (await res.json()) as ScheduleItem;
  }
  if (res.status === 400) {
    return "invalid";
  }
  if (res.status === 404) {
    return "missing";
  }
  throw new Error("schedules");
}

export async function updateSchedule(
  id: number,
  body: SchedulePayload,
): Promise<ScheduleItem | "invalid" | "missing"> {
  const res = await apiFetch(`/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  throwIfAuthFailed(res);
  if (res.status === 200) {
    return (await res.json()) as ScheduleItem;
  }
  if (res.status === 400) {
    return "invalid";
  }
  if (res.status === 404) {
    return "missing";
  }
  throw new Error("schedules");
}

export async function updateCompletion(
  id: number,
  isCompleted: boolean,
): Promise<ScheduleItem | "missing" | "conflict"> {
  const res = await apiFetch(`/schedules/${id}/completion`, {
    method: "PATCH",
    body: JSON.stringify({ is_completed: isCompleted }),
  });
  throwIfAuthFailed(res);
  if (res.status === 200) {
    return (await res.json()) as ScheduleItem;
  }
  if (res.status === 404) {
    return "missing";
  }
  if (res.status === 409) {
    return "conflict";
  }
  throw new Error("schedules");
}

export async function deleteSchedule(id: number): Promise<"ok" | "missing"> {
  const res = await apiFetch(`/schedules/${id}`, { method: "DELETE" });
  throwIfAuthFailed(res);
  if (res.status === 204) {
    return "ok";
  }
  if (res.status === 404) {
    return "missing";
  }
  throw new Error("schedules");
}

export async function getHolidays(startDate: string, endDate: string): Promise<HolidayItem[]> {
  const res = await apiFetch(`/holidays?start_date=${startDate}&end_date=${endDate}`);
  throwIfAuthFailed(res);
  if (!res.ok) {
    throw new Error("holidays");
  }
  return ((await res.json()) as { items: HolidayItem[] }).items;
}

export async function getUserHolidays(startDate: string, endDate: string): Promise<UserHolidayItem[]> {
  const res = await apiFetch(`/user-holidays?start_date=${startDate}&end_date=${endDate}`);
  throwIfAuthFailed(res);
  if (!res.ok) {
    throw new Error("user-holidays");
  }
  return ((await res.json()) as { items: UserHolidayItem[] }).items;
}

export async function getAllUserHolidays(): Promise<UserHolidayItem[]> {
  const res = await apiFetch("/user-holidays");
  throwIfAuthFailed(res);
  if (!res.ok) {
    throw new Error("user-holidays");
  }
  return ((await res.json()) as { items: UserHolidayItem[] }).items;
}

export async function createUserHoliday(
  holidayDate: string,
  name: string,
): Promise<UserHolidayItem | "invalid" | "conflict"> {
  const res = await apiFetch("/user-holidays", {
    method: "POST",
    body: JSON.stringify({ holiday_date: holidayDate, name }),
  });
  throwIfAuthFailed(res);
  if (res.status === 201) {
    return (await res.json()) as UserHolidayItem;
  }
  if (res.status === 400) {
    return "invalid";
  }
  if (res.status === 409) {
    return "conflict";
  }
  throw new Error("user-holidays");
}

export async function updateUserHoliday(
  id: number,
  holidayDate: string,
  name: string,
): Promise<UserHolidayItem | "invalid" | "missing" | "conflict"> {
  const res = await apiFetch(`/user-holidays/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ holiday_date: holidayDate, name }),
  });
  throwIfAuthFailed(res);
  if (res.status === 200) {
    return (await res.json()) as UserHolidayItem;
  }
  if (res.status === 400) {
    return "invalid";
  }
  if (res.status === 404) {
    return "missing";
  }
  if (res.status === 409) {
    return "conflict";
  }
  throw new Error("user-holidays");
}

export async function deleteUserHoliday(id: number): Promise<"ok" | "missing"> {
  const res = await apiFetch(`/user-holidays/${id}`, { method: "DELETE" });
  throwIfAuthFailed(res);
  if (res.status === 204) {
    return "ok";
  }
  if (res.status === 404) {
    return "missing";
  }
  throw new Error("user-holidays");
}

