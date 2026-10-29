import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ============================================================
// AUTH
// ============================================================

export const authApi = {
    register: (data) =>
        api.post("/auth/register", data),

    login: (data) =>
        api.post("/auth/login", data),

    me: () =>
        api.get("/auth/me"),

    refresh: (refreshToken) =>
        api.post("/auth/refresh", {
            refresh_token: refreshToken,
        }),

    logout: (refreshToken) =>
        api.post("/auth/logout", {
            refresh_token: refreshToken,
        }),
};

// ============================================================
// PRODUCTS
// ============================================================

export const productApi = {
    getProducts: (params = {}) =>
        api.get("/products", { params }),

    getProduct: (id) =>
        api.get(`/products/${id}`),
};

// ============================================================
// INVENTORY
// ============================================================

export const inventoryApi = {
    getInventory: (productId) =>
        api.get(`/inventory/${productId}`),

    getAvailability: (
        productId,
        quantity = 1
    ) =>
        api.get(
            `/inventory/${productId}/availability`,
            {
                params: {
                    quantity,
                },
            }
        ),
};

// ============================================================
// CART / WISHLIST
// ============================================================

export const cartApi = {
    getCart: (userId) =>
        api.get(`/cart/${userId}`),

    addToCart: (data) =>
        api.post("/cart/items", data),

    updateCartItem: (
        userId,
        productId,
        data
    ) =>
        api.put(
            `/cart/${userId}/items/${productId}`,
            data
        ),

    removeCartItem: (
        userId,
        productId
    ) =>
        api.delete(
            `/cart/${userId}/items/${productId}`
        ),

    clearCart: (userId) =>
        api.delete(`/cart/${userId}`),

    getWishlist: (userId) =>
        api.get(`/cart/wishlist/${userId}`),

    addToWishlist: (data) =>
        api.post(
            "/cart/wishlist",
            data
        ),

    removeFromWishlist: (
        userId,
        productId
    ) =>
        api.delete(
            `/cart/wishlist/${userId}/${productId}`
        ),
};

// ============================================================
// ORDERS
// ============================================================

export const orderApi = {
    createOrder: (data) =>
        api.post(
            "/orders",
            data
        ),

    getUserOrders: (userId) =>
        api.get(
            `/orders/user/${userId}`
        ),

    getOrder: (orderId) =>
        api.get(
            `/orders/${orderId}`
        ),

    updateOrderStatus: (
        orderId,
        data
    ) =>
        api.put(
            `/orders/${orderId}/status`,
            data
        ),

    cancelOrder: (orderId) =>
        api.post(
            `/orders/${orderId}/cancel`
        ),

    updatePayment: (
        orderId,
        data
    ) =>
        api.put(
            `/orders/${orderId}/payment`,
            data
        ),

    getOrderSummary: (orderId) =>
        api.get(
            `/orders/${orderId}/summary`
        ),
};

// ============================================================
// PAYMENTS
// ============================================================

export const paymentApi = {
    createPayment: (data) =>
        api.post(
            "/payments",
            data
        ),

    markSuccess: (paymentId) =>
        api.post(
            `/payments/${paymentId}/success`
        ),

    markFailed: (
        paymentId,
        data = {}
    ) =>
        api.post(
            `/payments/${paymentId}/fail`,
            data
        ),

    refundPayment: (paymentId) =>
        api.post(
            `/payments/${paymentId}/refund`
        ),

    getPayment: (paymentId) =>
        api.get(
            `/payments/${paymentId}`
        ),

    getOrderPayment: (orderId) =>
        api.get(
            `/payments/order/${orderId}`
        ),
};

// ============================================================
// RETURN / REFUND
// ============================================================

export const returnApi = {
    getAllReturns: () =>
        api.get("/returns"),
    createReturn: (data) =>
        api.post(
            "/returns",
            data
        ),

    getUserReturns: (userId) =>
        api.get(
            `/returns/user/${userId}`
        ),

    getOrderReturn: (orderId) =>
        api.get(
            `/returns/order/${orderId}`
        ),

    getReturn: (returnId) =>
        api.get(
            `/returns/${returnId}`
        ),

    updateStatus: (
        returnId,
        data
    ) =>
        api.put(
            `/returns/${returnId}/status`,
            data
        ),

    approveReturn: (returnId) =>
        api.post(
            `/returns/${returnId}/approve`
        ),

    rejectReturn: (
        returnId,
        data = {}
    ) =>
        api.post(
            `/returns/${returnId}/reject`,
            data
        ),

    cancelReturn: (returnId) =>
        api.post(
            `/returns/${returnId}/cancel`
        ),

    refundReturn: (returnId) => api.put(`/returns/${returnId}/refund`),

    getReturnSummary: (returnId) =>
        api.get(
            `/returns/${returnId}/summary`
        ),
};

export default api;

