const TOKEN_KEY = 'mindedu_admin_token';

export const auth = {
  get token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

const USER_KEY = 'mindedu_user_token';
export const userAuth = {
  get token() { try { return localStorage.getItem(USER_KEY); } catch { return null; } },
  set(token) { try { localStorage.setItem(USER_KEY, token); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Сервертэй холбогдож чадсангүй.');
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, admin = false, user = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin && auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (user && userAuth.token) headers.Authorization = `Bearer ${userAuth.token}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, { error: 'Интернэт холболтоо шалгаад дахин оролдоно уу.' });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && admin) auth.clear();
    if (res.status === 401 && user) userAuth.clear();
    throw new ApiError(res.status, data);
  }
  return data;
}

export const api = {
  enroll: (data) => request('/enrollments', { method: 'POST', body: data }),
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me', { admin: true }),
  enrollments: () => request('/admin/enrollments', { admin: true }),
  stats: () => request('/admin/stats', { admin: true }),
  updateEnrollment: (id, patch) => request(`/admin/enrollments/${id}`, { method: 'PATCH', body: patch, admin: true }),
  deleteEnrollment: (id) => request(`/admin/enrollments/${id}`, { method: 'DELETE', admin: true }),

  // Хэрэглэгч (эцэг эх)
  register: (data) => request('/account/register', { method: 'POST', body: data }),
  userLogin: (identifier, password) => request('/account/login', { method: 'POST', body: { identifier, password } }),
  resendOtp: (phone, purpose = 'verify') => request('/account/resend-otp', { method: 'POST', body: { phone, purpose } }),
  verifyOtp: (phone, code) => request('/account/verify-otp', { method: 'POST', body: { phone, code } }),
  resetByPhone: (phone, code, password) => request('/account/reset-phone', { method: 'POST', body: { phone, code, password } }),
  resendVerification: (email) => request('/account/resend-verification', { method: 'POST', body: { email } }),
  verifyEmail: (token) => request('/account/verify', { method: 'POST', body: { token } }),
  forgotPassword: (email) => request('/account/forgot', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/account/reset', { method: 'POST', body: { token, password } }),
  myPoints: () => request('/account/points', { user: true }),
  redeem: (id) => request(`/account/rewards/${id}/redeem`, { method: 'POST', user: true }),
  adminUsers: () => request('/admin/users', { admin: true }),
  userPoints: (id) => request(`/admin/users/${id}/points`, { admin: true }),
  adjustPoints: (id, amount, reason) => request(`/admin/users/${id}/points`, { method: 'POST', body: { amount, reason }, admin: true }),
  redemptions: () => request('/admin/redemptions', { admin: true }),
  updateRedemption: (id, patch) => request(`/admin/redemptions/${id}`, { method: 'PATCH', body: patch, admin: true }),
  accountMe: () => request('/account/me', { user: true }),
  createOrder: (data) => request('/account/orders', { method: 'POST', body: data, user: true }),
  order: (id) => request(`/account/orders/${id}`, { user: true }),
  retryInvoice: (id) => request(`/account/orders/${id}/invoice`, { method: 'POST', user: true }),
  cancelOrder: (id) => request(`/account/orders/${id}/cancel`, { method: 'POST', user: true }),
  demoPay: (id) => request(`/account/orders/${id}/demo-pay`, { method: 'POST', user: true }),
  programStudents: () => request('/admin/program-students', { admin: true }),
  weather: () => request('/weather'),
  adminOrders: () => request('/admin/orders', { admin: true }),
  updateOrder: (id, patch) => request(`/admin/orders/${id}`, { method: 'PATCH', body: patch, admin: true }),

  // Видео хичээл
  lessons: () => request('/account/lessons', { user: true }),
  lesson: (id) => request(`/account/lessons/${id}`, { user: true }),
  lessonProgress: (id, data) => request(`/account/lessons/${id}/progress`, { method: 'POST', body: data, user: true }),
  analytics: (days) => request(`/admin/analytics?days=${days}`, { admin: true }),
  lessonStats: () => request('/admin/lessons/stats', { admin: true }),
  adminVideo: (id) => request(`/admin/videos/${id}/play`, { admin: true }),

  // Сайтын контент
  content: () => request('/content'),
  sendChat: (data) => request('/chats', { method: 'POST', body: data }),
  chats: () => request('/admin/chats', { admin: true }),
  updateChat: (id, patch) => request(`/admin/chats/${id}`, { method: 'PATCH', body: patch, admin: true }),
  deleteChat: (id) => request(`/admin/chats/${id}`, { method: 'DELETE', admin: true }),
  settings: () => request('/admin/settings', { admin: true }),
  saveSettings: (data) => request('/admin/settings', { method: 'PUT', body: data, admin: true }),
  uploadImage: (dataUrl) => request('/admin/images', { method: 'POST', body: { dataUrl }, admin: true }),
  list: (res) => request(`/admin/content/${res}`, { admin: true }),
  create: (res, data) => request(`/admin/content/${res}`, { method: 'POST', body: data, admin: true }),
  update: (res, id, data) => request(`/admin/content/${res}/${id}`, { method: 'PUT', body: data, admin: true }),
  remove: (res, id) => request(`/admin/content/${res}/${id}`, { method: 'DELETE', admin: true }),
  reorder: (res, ids) => request(`/admin/content/${res}/order`, { method: 'PUT', body: { ids }, admin: true }),
};

const VIDEO_EXT = { mp4: 'video/mp4', m4v: 'video/x-m4v', webm: 'video/webm', mov: 'video/quicktime' };

/**
 * Видео файлыг явцтай нь хуулна. XHR ашиглана (fetch upload progress өгдөггүй).
 * Буцаах утга: { promise, abort }
 */
export function uploadVideo(file, onProgress) {
  const xhr = new XMLHttpRequest();
  const type = VIDEO_EXT[(file.name.split('.').pop() || '').toLowerCase()] || file.type;
  const promise = new Promise((resolve, reject) => {
    xhr.open('POST', '/api/admin/videos');
    if (auth.token) xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
    xhr.setRequestHeader('Content-Type', type || 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total, e.loaded);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      if (xhr.status === 401) auth.clear();
      reject(new ApiError(xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError(0, { error: 'Интернэт холболт тасарлаа. Дахин оролдоно уу.' }));
    xhr.onabort = () => reject(new ApiError(-1, { error: 'Хуулахыг цуцаллаа.' }));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}
