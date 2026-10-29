import axios from "axios";

const extraApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

extraApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const couponApi = {
  getAll: () => extraApi.get("/coupons"),
  getOne: (id) => extraApi.get(`/coupons/${id}`),
  create: (data) => extraApi.post("/coupons", data),
  update: (id, data) => extraApi.put(`/coupons/${id}`, data),
  activate: (id) => extraApi.post(`/coupons/${id}/activate`),
  deactivate: (id) => extraApi.post(`/coupons/${id}/deactivate`),
  apply: (code, order_amount) =>
    extraApi.post("/coupons/apply", { code, order_amount }),
};

export const reviewApi = {
  getAll: () => extraApi.get("/reviews"),
  getProduct: (productId) => extraApi.get(`/reviews/product/${productId}`),
  getUser: (userId) => extraApi.get(`/reviews/user/${userId}`),
  create: (data) => extraApi.post("/reviews", data),
  update: (id, data) => extraApi.put(`/reviews/${id}`, data),
  delete: (id) => extraApi.delete(`/reviews/${id}`),
  moderate: (id, is_approved) =>
    extraApi.put(`/reviews/${id}/moderate`, { is_approved }),
};

export const notificationApi = {
  create: (data) => extraApi.post("/notifications", data),
  getUser: (userId) => extraApi.get(`/notifications/user/${userId}`),
  markRead: (id) => extraApi.put(`/notifications/${id}/read`),
  markAllRead: (userId) =>
    extraApi.put(`/notifications/user/${userId}/read-all`),
};

export default extraApi;

export const analyticsApi = {
  getDashboard: () =>
    extraApi.get("/analytics/dashboard"),

  getOrderStatus: () =>
    extraApi.get("/analytics/orders/status"),

  getPaymentStatus: () =>
    extraApi.get("/analytics/payments/status"),

  getSales: () =>
    extraApi.get("/analytics/sales"),

  getReturns: () =>
    extraApi.get("/analytics/returns"),

  getSummary: () =>
    extraApi.get("/analytics/summary"),
};
