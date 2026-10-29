import AdminReturnManager from "./components/AdminReturnManager";
import ReturnManager from "./components/ReturnManager";
import { useEffect, useMemo, useState } from "react";
import {
    Search,
    ShoppingCart,
    Heart,
    User,
    Package,
    LogOut,
    X,
    Trash2,
    Plus,
    Minus,
    SlidersHorizontal,
    ChevronDown,
    Eye,
    ShieldCheck,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    MapPin,
    CreditCard,
    Truck,
    LoaderCircle,
} from "lucide-react";

import {
    productApi,
    cartApi,
    inventoryApi,
    orderApi,
    paymentApi,
} from "./services/api";

import { useAuth } from "./context/AuthContext";

function App() {
    const {
        user,
        login,
        register,
        logout,
        loading,
    } = useAuth();

    /* =========================================================
       PRODUCTS
    ========================================================= */

    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState({});

    const [productsLoading, setProductsLoading] =
        useState(true);

    const [productsError, setProductsError] =
        useState("");

    /* =========================================================
       CART
    ========================================================= */

    const [cart, setCart] = useState(null);
    const [cartOpen, setCartOpen] = useState(false);

    /* =========================================================
       WISHLIST
    ========================================================= */

    const [wishlist, setWishlist] = useState(null);
    const [wishlistOpen, setWishlistOpen] =
        useState(false);

    /* =========================================================
       PROFILE
    ========================================================= */

    const [profileOpen, setProfileOpen] =
        useState(false);

    /* =========================================================
       SEARCH / FILTER
    ========================================================= */

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [sortBy, setSortBy] = useState("featured");
    const [maxPrice, setMaxPrice] = useState(10000);

    /* =========================================================
       PRODUCT DETAILS
    ========================================================= */

    const [selectedProduct, setSelectedProduct] =
        useState(null);

    /* =========================================================
       AUTH
    ========================================================= */

    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState("login");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authError, setAuthError] = useState("");
    const [authSuccess, setAuthSuccess] =
        useState("");

    /* =========================================================
       CHECKOUT
    ========================================================= */

    const [checkoutOpen, setCheckoutOpen] =
        useState(false);

    const [shippingAddress, setShippingAddress] =
        useState("");

    const [checkoutLoading, setCheckoutLoading] =
        useState(false);

    const [checkoutError, setCheckoutError] =
        useState("");

    const [orderSuccess, setOrderSuccess] =
        useState(null);

    const [paymentMethod, setPaymentMethod] =
        useState("simulated");

    /* =========================================================
       ORDERS
    ========================================================= */

    const [ordersOpen, setOrdersOpen] =
        useState(false);

    const [orders, setOrders] = useState([]);

    const [ordersLoading, setOrdersLoading] =
        useState(false);

    const [ordersError, setOrdersError] =
        useState("");

    const [selectedOrder, setSelectedOrder] =
        useState(null);

    const [orderDetailOpen, setOrderDetailOpen] =
        useState(false);

    const [
        orderDetailLoading,
        setOrderDetailLoading,
    ] = useState(false);

    const [
        orderActionLoading,
        setOrderActionLoading,
    ] = useState(false);

    /* =========================================================
       COMMON
    ========================================================= */

    const [toast, setToast] = useState(null);

    const [currentPage, setCurrentPage] =
        useState(1);

    const productsPerPage = 8;

    /* =========================================================
       INITIAL PRODUCT LOAD
    ========================================================= */

    useEffect(() => {
        loadProducts();
    }, []);

    /* =========================================================
       USER LOAD
    ========================================================= */

    useEffect(() => {
        if (user?.id) {
            loadCart();
            loadWishlist();
        } else {
            setCart(null);
            setWishlist(null);
            setOrders([]);
            setSelectedOrder(null);
            setOrdersOpen(false);
            setOrderDetailOpen(false);
        }
    }, [user]);

    /* =========================================================
       FILTER RESET
    ========================================================= */

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        category,
        sortBy,
        maxPrice,
    ]);

    /* =========================================================
       TOAST TIMER
    ========================================================= */

    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(() => {
            setToast(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast]);

    /* =========================================================
       ERROR HELPER
    ========================================================= */

    function getErrorMessage(error, fallback) {
        const detail =
            error?.response?.data?.detail;

        if (Array.isArray(detail)) {
            return detail
                .map(
                    (item) =>
                        item?.msg ||
                        String(item)
                )
                .join(", ");
        }

        if (typeof detail === "string") {
            return detail;
        }

        if (error?.message) {
            return error.message;
        }

        return fallback;
    }

    /* =========================================================
       TOAST
    ========================================================= */

    function showToast(
        message,
        type = "success"
    ) {
        setToast({
            message,
            type,
        });
    }

    /* =========================================================
       PRODUCTS
    ========================================================= */

    async function loadProducts() {
        setProductsLoading(true);
        setProductsError("");

        try {
            const response =
                await productApi.getProducts({
                    page: 1,
                    page_size: 100,
                });

            const productItems =
                response.data?.items || [];

            setProducts(productItems);

            const inventoryResults =
                await Promise.all(
                    productItems.map(
                        async (product) => {
                            try {
                                const response =
                                    await inventoryApi.getInventory(
                                        product.id
                                    );

                                return [
                                    product.id,
                                    response.data,
                                ];
                            } catch (error) {
                                console.error(
                                    `Inventory error for product ${product.id}:`,
                                    error
                                );

                                return [
                                    product.id,
                                    {
                                        available_quantity: 0,
                                        low_stock_threshold: 5,
                                    },
                                ];
                            }
                        }
                    )
                );

            setInventory(
                Object.fromEntries(
                    inventoryResults
                )
            );
        } catch (error) {
            console.error(
                "Product loading error:",
                error
            );

            setProductsError(
                "Unable to load products. Please try again."
            );
        } finally {
            setProductsLoading(false);
        }
    }

    /* =========================================================
       CART
    ========================================================= */

    async function loadCart() {
        if (!user?.id) return;

        try {
            const response =
                await cartApi.getCart(user.id);

            setCart(response.data);
        } catch (error) {
            console.error(
                "Cart loading error:",
                error
            );
        }
    }

    /* =========================================================
       WISHLIST
    ========================================================= */

    async function loadWishlist() {
        if (!user?.id) return;

        try {
            const response =
                await cartApi.getWishlist(
                    user.id
                );

            setWishlist(response.data);
        } catch (error) {
            console.error(
                "Wishlist loading error:",
                error
            );
        }
    }

    /* =========================================================
       ORDERS - LIST
    ========================================================= */

    async function loadOrders() {
        if (!user?.id) return;

        setOrdersLoading(true);
        setOrdersError("");

        try {
            const response =
                await orderApi.getUserOrders(
                    user.id
                );

            const data = response.data;

            setOrders(
                Array.isArray(data)
                    ? data
                    : data?.items || []
            );
        } catch (error) {
            console.error(
                "Orders loading error:",
                error
            );

            setOrdersError(
                getErrorMessage(
                    error,
                    "Unable to load your orders."
                )
            );
        } finally {
            setOrdersLoading(false);
        }
    }

    /* =========================================================
       ORDER DETAILS
    ========================================================= */

    async function loadOrderDetails(orderId) {
        setOrderDetailLoading(true);

        try {
            const response =
                await orderApi.getOrder(
                    orderId
                );

            setSelectedOrder(response.data);
            setOrderDetailOpen(true);
        } catch (error) {
            console.error(
                "Order details error:",
                error
            );

            showToast(
                getErrorMessage(
                    error,
                    "Unable to load order details."
                ),
                "error"
            );
        } finally {
            setOrderDetailLoading(false);
        }
    }

    /* =========================================================
       CANCEL ORDER
    ========================================================= */

    async function handleCancelOrder(
        orderId
    ) {
        if (orderActionLoading) return;

        const confirmed = window.confirm(
            `Are you sure you want to cancel Order #${orderId}?`
        );

        if (!confirmed) return;

        setOrderActionLoading(true);

        try {
            await orderApi.cancelOrder(
                orderId
            );

            showToast(
                `Order #${orderId} cancelled successfully.`
            );

            await loadOrders();

            const response =
                await orderApi.getOrder(
                    orderId
                );

            setSelectedOrder(response.data);
            setOrderDetailOpen(true);
        } catch (error) {
            console.error(
                "Cancel order error:",
                error
            );

            showToast(
                getErrorMessage(
                    error,
                    "Unable to cancel this order."
                ),
                "error"
            );
        } finally {
            setOrderActionLoading(false);
        }
    }

    /* =========================================================
       AUTH
    ========================================================= */

    function openAuth(mode = "login") {
        setAuthMode(mode);
        setAuthOpen(true);
        setProfileOpen(false);

        setAuthError("");
        setAuthSuccess("");
    }

    function closeAuth() {
        setAuthOpen(false);
        setAuthError("");
        setAuthSuccess("");

        setName("");
        setEmail("");
        setPassword("");
    }

    async function handleAuth(event) {
        event.preventDefault();

        setAuthError("");
        setAuthSuccess("");

        try {
            if (authMode === "login") {
                await login(
                    email.trim(),
                    password
                );

                setAuthSuccess(
                    "Login successful."
                );

                showToast(
                    "Welcome back!"
                );

                setTimeout(() => {
                    closeAuth();
                }, 500);
            } else {
                await register(
                    name.trim(),
                    email.trim(),
                    password
                );

                setAuthSuccess(
                    "Account created successfully."
                );

                showToast(
                    "Welcome to ShopFlow!"
                );

                setTimeout(() => {
                    closeAuth();
                }, 500);
            }
        } catch (error) {
            console.error(
                "Authentication error:",
                error
            );

            setAuthError(
                getErrorMessage(
                    error,
                    "Authentication failed. Please check your details."
                )
            );
        }
    }

    async function handleLogout() {
        await logout();

        setCartOpen(false);
        setWishlistOpen(false);
        setProfileOpen(false);
        setCheckoutOpen(false);
        setOrdersOpen(false);
        setOrderDetailOpen(false);

        showToast(
            "You have been logged out."
        );
    }

    /* =========================================================
       INVENTORY
    ========================================================= */

    function getInventory(productId) {
        return (
            inventory[productId] || {
                available_quantity: 0,
                low_stock_threshold: 5,
            }
        );
    }

    function getStockStatus(productId) {
        const stock =
            getInventory(productId);

        const available = Number(
            stock.available_quantity || 0
        );

        const threshold = Number(
            stock.low_stock_threshold || 5
        );

        if (available <= 0) {
            return {
                label: "Out of Stock",
                className:
                    "out-of-stock",
            };
        }

        if (available <= threshold) {
            return {
                label: `${available} left`,
                className: "low-stock",
            };
        }

        return {
            label: `${available} available`,
            className: "in-stock",
        };
    }

    /* =========================================================
       ADD TO CART
    ========================================================= */

    async function handleAddToCart(
        product
    ) {
        if (!user) {
            showToast(
                "Please login to add products to your cart.",
                "error"
            );

            openAuth("login");
            return;
        }

        const stock =
            getInventory(product.id);

        const available = Number(
            stock.available_quantity || 0
        );

        if (available <= 0) {
            showToast(
                "This product is currently out of stock.",
                "error"
            );

            return;
        }

        const existingItem =
            (
                cart?.items || []
            ).find(
                (item) =>
                    item.product_id ===
                    product.id
            );

        const existingQuantity =
            Number(
                existingItem?.quantity || 0
            );

        if (
            existingQuantity + 1 >
            available
        ) {
            showToast(
                `Only ${available} item${
                    available === 1
                        ? ""
                        : "s"
                } available in stock.`,
                "error"
            );

            return;
        }

        try {
            await cartApi.addToCart({
                user_id: user.id,
                product_id: product.id,
                product_name:
                    product.name,
                price: Number(
                    product.price
                ),
                quantity: 1,
                image_url:
                    product.image_url || "",
            });

            await loadCart();

            setCartOpen(true);

            showToast(
                `${product.name} added to cart.`
            );
        } catch (error) {
            console.error(
                "Add cart error:",
                error
            );

            showToast(
                getErrorMessage(
                    error,
                    "Unable to add product to cart."
                ),
                "error"
            );
        }
    }

    /* =========================================================
       WISHLIST
    ========================================================= */

    async function handleWishlist(
        product
    ) {
        if (!user) {
            showToast(
                "Please login to use your wishlist.",
                "error"
            );

            openAuth("login");
            return;
        }

        const existing =
            (
                wishlist?.items || []
            ).find(
                (item) =>
                    item.product_id ===
                    product.id
            );

        try {
            if (existing) {
                await cartApi.removeFromWishlist(
                    user.id,
                    product.id
                );

                showToast(
                    "Removed from wishlist."
                );
            } else {
                await cartApi.addToWishlist({
                    user_id: user.id,
                    product_id:
                        product.id,
                    product_name:
                        product.name,
                    price: Number(
                        product.price
                    ),
                    image_url:
                        product.image_url ||
                        "",
                });

                showToast(
                    "Added to wishlist."
                );
            }

            await loadWishlist();
        } catch (error) {
            console.error(
                "Wishlist error:",
                error
            );

            showToast(
                getErrorMessage(
                    error,
                    "Unable to update wishlist."
                ),
                "error"
            );
        }
    }

    /* =========================================================
       CART QUANTITY
    ========================================================= */

    async function updateQuantity(
        item,
        change
    ) {
        const newQuantity =
            Number(item.quantity) +
            Number(change);

        if (newQuantity <= 0) {
            await removeCartItem(
                item.product_id
            );

            return;
        }

        if (change > 0) {
            const stock =
                getInventory(
                    item.product_id
                );

            const available =
                Number(
                    stock.available_quantity ||
                        0
                );

            if (
                newQuantity >
                available
            ) {
                showToast(
                    `Only ${available} item${
                        available === 1
                            ? ""
                            : "s"
                    } available.`,
                    "error"
                );

                return;
            }
        }

        try {
            await cartApi.updateCartItem(
                user.id,
                item.product_id,
                {
                    quantity:
                        newQuantity,
                }
            );

            await loadCart();
        } catch (error) {
            console.error(
                "Quantity update error:",
                error
            );

            showToast(
                getErrorMessage(
                    error,
                    "Unable to update quantity."
                ),
                "error"
            );
        }
    }

    async function removeCartItem(
        productId
    ) {
        try {
            await cartApi.removeCartItem(
                user.id,
                productId
            );

            await loadCart();

            showToast(
                "Item removed from cart."
            );
        } catch (error) {
            console.error(
                "Remove cart error:",
                error
            );

            showToast(
                "Unable to remove item.",
                "error"
            );
        }
    }

    async function clearCart() {
        if (
            !user?.id ||
            !cart?.items?.length
        ) {
            return;
        }

        try {
            await cartApi.clearCart(
                user.id
            );

            await loadCart();

            showToast(
                "Cart cleared."
            );
        } catch (error) {
            console.error(
                "Clear cart error:",
                error
            );

            showToast(
                "Unable to clear cart.",
                "error"
            );
        }
    }

    /* =========================================================
       PRODUCT HELPERS
    ========================================================= */

    function isWishlisted(productId) {
        return (
            wishlist?.items || []
        ).some(
            (item) =>
                item.product_id ===
                productId
        );
    }

    function getImage(product) {
        return (
            product.image_url ||
            "https://via.placeholder.com/700x700?text=Product"
        );
    }

    function handleImageError(event) {
        event.currentTarget.src =
            "https://via.placeholder.com/700x700?text=Product";
    }

    /* =========================================================
       FILTERS
    ========================================================= */

    const categories = useMemo(() => {
        const values = products
            .map(
                (product) =>
                    product.category
            )
            .filter(Boolean);

        return [
            "All",
            ...new Set(values),
        ];
    }, [products]);

    const filteredProducts =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            let result =
                products.filter(
                    (product) => {
                        const matchesSearch =
                            !value ||
                            product.name
                                ?.toLowerCase()
                                .includes(
                                    value
                                ) ||
                            product.category
                                ?.toLowerCase()
                                .includes(
                                    value
                                ) ||
                            product.description
                                ?.toLowerCase()
                                .includes(
                                    value
                                ) ||
                            product.sku
                                ?.toLowerCase()
                                .includes(
                                    value
                                );

                        const matchesCategory =
                            category ===
                                "All" ||
                            product.category ===
                                category;

                        const matchesPrice =
                            Number(
                                product.price ||
                                    0
                            ) <= maxPrice;

                        return (
                            matchesSearch &&
                            matchesCategory &&
                            matchesPrice
                        );
                    }
                );

            if (
                sortBy ===
                "price-low"
            ) {
                result.sort(
                    (a, b) =>
                        Number(
                            a.price
                        ) -
                        Number(b.price)
                );
            }

            if (
                sortBy ===
                "price-high"
            ) {
                result.sort(
                    (a, b) =>
                        Number(
                            b.price
                        ) -
                        Number(a.price)
                );
            }

            if (sortBy === "name") {
                result.sort(
                    (a, b) =>
                        String(
                            a.name
                        ).localeCompare(
                            String(b.name)
                        )
                );
            }

            if (
                sortBy ===
                "newest"
            ) {
                result.sort(
                    (a, b) =>
                        new Date(
                            b.created_at ||
                                0
                        ) -
                        new Date(
                            a.created_at ||
                                0
                        )
                );
            }

            return result;
        }, [
            products,
            search,
            category,
            sortBy,
            maxPrice,
        ]);

    /* =========================================================
       PAGINATION
    ========================================================= */

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredProducts.length /
                    productsPerPage
            )
        );

    const visibleProducts =
        filteredProducts.slice(
            (currentPage - 1) *
                productsPerPage,
            currentPage *
                productsPerPage
        );

    /* =========================================================
       CART CALCULATIONS
    ========================================================= */

    const cartItems =
        cart?.items || [];

    const wishlistItems =
        wishlist?.items || [];

    const cartCount =
        useMemo(() => {
            return cartItems.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.quantity ||
                            0
                    ),
                0
            );
        }, [cartItems]);

    const wishlistCount =
        wishlistItems.length;

    const cartTotal =
        useMemo(() => {
            return cartItems.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.price ||
                            0
                    ) *
                        Number(
                            item.quantity ||
                                0
                        ),
                0
            );
        }, [cartItems]);

    /* =========================================================
       NAVIGATION
    ========================================================= */

    function scrollToProducts() {
        document
            .getElementById("products")
            ?.scrollIntoView({
                behavior: "smooth",
            });
    }

    function resetFilters() {
        setSearch("");
        setCategory("All");
        setSortBy("featured");
        setMaxPrice(10000);
    }

    /* =========================================================
       CHECKOUT
    ========================================================= */

    function handleCheckout() {
        if (!user) {
            showToast(
                "Please login to continue checkout.",
                "error"
            );

            openAuth("login");
            return;
        }

        if (!cartItems.length) {
            showToast(
                "Your cart is empty.",
                "error"
            );

            return;
        }

        setCheckoutError("");
        setShippingAddress("");
        setPaymentMethod("simulated");
        setOrderSuccess(null);

        setCartOpen(false);
        setCheckoutOpen(true);
    }

    async function placeOrder() {
        if (!user) {
            showToast(
                "Please login to continue.",
                "error"
            );

            return;
        }

        if (!shippingAddress.trim()) {
            setCheckoutError(
                "Please enter your shipping address."
            );

            return;
        }

        if (!cartItems.length) {
            setCheckoutError(
                "Your cart is empty."
            );

            return;
        }

        setCheckoutLoading(true);
        setCheckoutError("");

        try {
            /*
             * Create order
             */

            const orderPayload = {
                user_id: user.id,

                shipping_address:
                    shippingAddress.trim(),

                items: cartItems.map(
                    (item) => ({
                        product_id:
                            item.product_id,

                        product_name:
                            item.product_name,

                        price: Number(
                            item.price
                        ),

                        quantity:
                            Number(
                                item.quantity
                            ),
                    })
                ),

                subtotal:
                    Number(cartTotal),

                discount_amount: 0,

                total_amount:
                    Number(cartTotal),
            };

            const orderResponse =
                await orderApi.createOrder(
                    orderPayload
                );

            const order =
                orderResponse.data;

            /*
             * Create simulated payment
             */

            const paymentResponse =
                await paymentApi.createPayment(
                    {
                        order_id:
                            order.id,

                        user_id:
                            user.id,

                        amount:
                            Number(
                                order.total_amount ??
                                    cartTotal
                            ),

                        currency: "INR",

                        payment_method:
                            paymentMethod,
                    }
                );

            const payment =
                paymentResponse.data;

            /*
             * Payment success
             */

            await paymentApi.markSuccess(
                payment.id
            );

            /*
             * Update order payment
             */

            await orderApi.updatePayment(
                order.id,
                {
                    payment_status:
                        "paid",

                    payment_id:
                        String(
                            payment.id
                        ),
                }
            );

            /*
             * Clear cart
             */

            await cartApi.clearCart(
                user.id
            );

            setCart({
                items: [],
                total_quantity: 0,
                subtotal: 0,
            });

            /*
             * Success
             */

            setOrderSuccess({
                orderId: order.id,
                paymentId: payment.id,
                total: Number(
                    order.total_amount ??
                        cartTotal
                ),
            });

            showToast(
                `Order #${order.id} placed successfully.`
            );
        } catch (error) {
            console.error(
                "Checkout error:",
                error
            );

            setCheckoutError(
                getErrorMessage(
                    error,
                    "Unable to place the order. Please try again."
                )
            );
        } finally {
            setCheckoutLoading(false);
        }
    }

    function closeCheckout() {
        if (checkoutLoading) {
            return;
        }

        setCheckoutOpen(false);
        setCheckoutError("");
        setOrderSuccess(null);
    }

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="app">

            {/* =====================================================
                NAVBAR
            ===================================================== */}

            <header className="navbar">
                <div className="navbar-inner">

                    <button
                        className="brand"
                        onClick={() =>
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                            })
                        }
                    >
                        <span className="brand-mark">
                            S
                        </span>

                        <span>
                            <strong>
                                ShopFlow
                            </strong>

                            <small>
                                Smart Shopping
                            </small>
                        </span>
                    </button>

                    <div className="nav-search">
                        <Search size={19} />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Search products, categories or SKU..."
                        />

                        {search && (
                            <button
                                className="search-clear"
                                onClick={() =>
                                    setSearch("")
                                }
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <nav className="nav-actions">

                        <button
                            className="nav-icon-button"
                            onClick={() =>
                                setWishlistOpen(
                                    true
                                )
                            }
                            title="Wishlist"
                        >
                            <Heart
                                size={21}
                                fill={
                                    wishlistCount
                                        ? "currentColor"
                                        : "none"
                                }
                            />

                            {wishlistCount > 0 && (
                                <span className="nav-badge">
                                    {
                                        wishlistCount
                                    }
                                </span>
                            )}
                        </button>

                        <button
                            className="nav-icon-button"
                            onClick={() =>
                                setCartOpen(true)
                            }
                            title="Cart"
                        >
                            <ShoppingCart
                                size={21}
                            />

                            {cartCount > 0 && (
                                <span className="nav-badge">
                                    {cartCount}
                                </span>
                            )}
                        </button>

                        {user ? (
                            <button
                                className="profile-button"
                                onClick={() =>
                                    setProfileOpen(
                                        !profileOpen
                                    )
                                }
                            >
                                <span className="avatar">
                                    {user.name
                                        ?.charAt(
                                            0
                                        )
                                        ?.toUpperCase() ||
                                        "U"}
                                </span>

                                <span className="profile-name">
                                    {user.name}
                                </span>
                            </button>
                        ) : (
                            <button
                                className="primary-button small"
                                onClick={() =>
                                    openAuth(
                                        "login"
                                    )
                                }
                            >
                                Login
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            {/* =====================================================
                PROFILE
            ===================================================== */}

            {profileOpen && user && (
                <div className="floating-profile">

                    <div className="profile-header">

                        <div className="large-avatar">
                            {user.name
                                ?.charAt(0)
                                ?.toUpperCase()}
                        </div>

                        <div>
                            <strong>
                                {user.name}
                            </strong>

                            <span>
                                {user.email}
                            </span>
                        </div>

                    </div>

                    <div className="profile-role">
                        <ShieldCheck size={17} />
                        {user.role || "customer"}
                    </div>

                    <div className="profile-links">

                        <button
                            onClick={() => {
                                setProfileOpen(
                                    false
                                );

                                setOrdersOpen(
                                    true
                                );

                                loadOrders();
                            }}
                        >
                            <Package size={17} />
                            My Orders
                        </button>

                        <button
                            onClick={() => {
                                setProfileOpen(
                                    false
                                );

                                setWishlistOpen(
                                    true
                                );
                            }}
                        >
                            <Heart size={17} />
                            Wishlist
                        </button>

                    </div>

                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        <LogOut size={17} />
                        Logout
                    </button>

                </div>
            )}

            {/* =====================================================
                HERO
            ===================================================== */}

            <main>

                <section className="hero">

                    <div className="hero-content">

                        <div className="hero-eyebrow">
                            <Sparkles size={16} />
                            Next-generation
                            shopping
                        </div>

                        <h1>
                            Everything you
                            need.
                            <span>
                                One smart store.
                            </span>
                        </h1>

                        <p>
                            Discover quality
                            products, manage
                            your cart effortlessly,
                            and enjoy a fast,
                            secure shopping
                            experience powered
                            by our microservices
                            platform.
                        </p>

                        <div className="hero-actions">

                            <button
                                className="hero-button"
                                onClick={
                                    scrollToProducts
                                }
                            >
                                Explore Products
                                <ArrowRight
                                    size={18}
                                />
                            </button>

                            {!user && (
                                <button
                                    className="secondary-button"
                                    onClick={() =>
                                        openAuth(
                                            "register"
                                        )
                                    }
                                >
                                    Create Account
                                </button>
                            )}

                        </div>

                        <div className="hero-trust">

                            <span>
                                <CheckCircle2
                                    size={16}
                                />
                                Secure payments
                            </span>

                            <span>
                                <CheckCircle2
                                    size={16}
                                />
                                Live inventory
                            </span>

                            <span>
                                <CheckCircle2
                                    size={16}
                                />
                                Fast checkout
                            </span>

                        </div>

                    </div>

                    <div className="hero-card">

                        <div className="hero-card-glow" />

                        <div className="hero-product-preview">

                            <span className="preview-label">
                                Featured
                            </span>

                            <div className="preview-icon">
                                <Package
                                    size={58}
                                />
                            </div>

                            <strong>
                                Smart Shopping
                            </strong>

                            <span>
                                Built for convenience
                            </span>

                        </div>

                    </div>

                </section>

                {/* =================================================
                    CATALOG
                ================================================= */}

                <section
                    className="catalog-section"
                    id="products"
                >

                    <div className="section-heading">

                        <div>

                            <span className="section-kicker">
                                PRODUCT CATALOG
                            </span>

                            <h2>
                                Explore our products
                            </h2>

                            <p>
                                Find exactly what
                                you're looking for
                                with smart filters
                                and sorting.
                            </p>

                        </div>

                        <div className="catalog-count">

                            <strong>
                                {
                                    filteredProducts.length
                                }
                            </strong>

                            <span>
                                {filteredProducts.length ===
                                1
                                    ? "product"
                                    : "products"}
                            </span>

                        </div>

                    </div>

                    {/* FILTER BAR */}

                    <div className="filter-bar">

                        <div className="filter-search">
                            <Search size={18} />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Search products..."
                            />
                        </div>

                        <div className="filter-control">
                            <SlidersHorizontal
                                size={17}
                            />

                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {categories.map(
                                    (item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item ===
                                            "All"
                                                ? "All Categories"
                                                : item}
                                        </option>
                                    )
                                )}
                            </select>

                            <ChevronDown
                                size={16}
                            />
                        </div>

                        <div className="filter-control">

                            <select
                                value={sortBy}
                                onChange={(event) =>
                                    setSortBy(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >

                                <option value="featured">
                                    Featured
                                </option>

                                <option value="newest">
                                    Newest
                                </option>

                                <option value="name">
                                    Name A-Z
                                </option>

                                <option value="price-low">
                                    Price: Low to High
                                </option>

                                <option value="price-high">
                                    Price: High to Low
                                </option>

                            </select>

                            <ChevronDown
                                size={16}
                            />

                        </div>

                        <div className="price-filter">

                            <label>
                                Up to â‚¹
                                {maxPrice.toLocaleString(
                                    "en-IN"
                                )}
                            </label>

                            <input
                                type="range"
                                min="500"
                                max="10000"
                                step="500"
                                value={maxPrice}
                                onChange={(event) =>
                                    setMaxPrice(
                                        Number(
                                            event
                                                .target
                                                .value
                                        )
                                    )
                                }
                            />

                        </div>

                        <button
                            className="reset-filter"
                            onClick={
                                resetFilters
                            }
                        >
                            Reset
                        </button>

                    </div>

                    {/* PRODUCT STATES */}

                    {productsLoading ? (
                        <div className="loading-state">

                            <div className="loading-spinner" />

                            <h3>
                                Loading products...
                            </h3>

                            <p>
                                Fetching the latest
                                catalog.
                            </p>

                        </div>
                    ) : productsError ? (
                        <div className="empty-state">

                            <AlertCircle
                                size={42}
                            />

                            <h3>
                                Unable to load
                                catalog
                            </h3>

                            <p>
                                {productsError}
                            </p>

                            <button
                                className="primary-button"
                                onClick={
                                    loadProducts
                                }
                            >
                                <RefreshCw
                                    size={17}
                                />
                                Try Again
                            </button>

                        </div>
                    ) : visibleProducts.length ===
                      0 ? (
                        <div className="empty-state">

                            <Search size={42} />

                            <h3>
                                No products found
                            </h3>

                            <p>
                                Try changing your
                                search or filters.
                            </p>

                            <button
                                className="primary-button"
                                onClick={
                                    resetFilters
                                }
                            >
                                Clear Filters
                            </button>

                        </div>
                    ) : (
                        <>

                            <div className="product-grid">

                                {visibleProducts.map(
                                    (product) => {

                                        const wished =
                                            isWishlisted(
                                                product.id
                                            );

                                        const stockStatus =
                                            getStockStatus(
                                                product.id
                                            );

                                        const available =
                                            Number(
                                                getInventory(
                                                    product.id
                                                )
                                                    .available_quantity ||
                                                    0
                                            );

                                        return (
                                            <article
                                                className="product-card"
                                                key={
                                                    product.id
                                                }
                                            >

                                                <div className="product-image-wrap">

                                                    <img
                                                        src={getImage(
                                                            product
                                                        )}
                                                        alt={
                                                            product.name
                                                        }
                                                        onError={
                                                            handleImageError
                                                        }
                                                    />

                                                    <button
                                                        className={`wishlist-button ${
                                                            wished
                                                                ? "active"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            handleWishlist(
                                                                product
                                                            )
                                                        }
                                                    >
                                                        <Heart
                                                            size={19}
                                                            fill={
                                                                wished
                                                                    ? "currentColor"
                                                                    : "none"
                                                            }
                                                        />
                                                    </button>

                                                    <span className="product-category">
                                                        {
                                                            product.category
                                                        }
                                                    </span>

                                                </div>

                                                <div className="product-content">

                                                    <div className="product-meta">

                                                        <span>
                                                            SKU{" "}
                                                            {
                                                                product.sku
                                                            }
                                                        </span>

                                                        <span
                                                            className={`stock-status ${stockStatus.className}`}
                                                        >
                                                            <span className="stock-dot" />
                                                            {
                                                                stockStatus.label
                                                            }
                                                        </span>

                                                    </div>

                                                    <h3>
                                                        {
                                                            product.name
                                                        }
                                                    </h3>

                                                    <p>
                                                        {product.description ||
                                                            "Premium quality product designed for everyday use."}
                                                    </p>

                                                    <div className="product-footer">

                                                        <div>

                                                            <span className="product-price">
                                                                â‚¹
                                                                {Number(
                                                                    product.price
                                                                ).toLocaleString(
                                                                    "en-IN"
                                                                )}
                                                            </span>

                                                            <small>
                                                                Inclusive
                                                                of
                                                                applicable
                                                                taxes
                                                            </small>

                                                        </div>

                                                        <button
                                                            className="quick-view-button"
                                                            onClick={() =>
                                                                setSelectedProduct(
                                                                    product
                                                                )
                                                            }
                                                        >
                                                            <Eye
                                                                size={17}
                                                            />
                                                        </button>

                                                    </div>

                                                    <button
                                                        className="add-cart-button"
                                                        disabled={
                                                            available <=
                                                            0
                                                        }
                                                        onClick={() =>
                                                            handleAddToCart(
                                                                product
                                                            )
                                                        }
                                                    >
                                                        <ShoppingCart
                                                            size={18}
                                                        />

                                                        {available <=
                                                        0
                                                            ? "Out of Stock"
                                                            : "Add to Cart"}
                                                    </button>

                                                </div>

                                            </article>
                                        );
                                    }
                                )}

                            </div>

                            {/* PAGINATION */}

                            {totalPages > 1 && (
                                <div className="pagination">

                                    <button
                                        disabled={
                                            currentPage ===
                                            1
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                (page) =>
                                                    page -
                                                    1
                                            )
                                        }
                                    >
                                        Previous
                                    </button>

                                    {Array.from(
                                        {
                                            length:
                                                totalPages,
                                        },
                                        (
                                            _,
                                            index
                                        ) => {
                                            const page =
                                                index +
                                                1;

                                            return (
                                                <button
                                                    key={
                                                        page
                                                    }
                                                    className={
                                                        currentPage ===
                                                        page
                                                            ? "active"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        setCurrentPage(
                                                            page
                                                        )
                                                    }
                                                >
                                                    {page}
                                                </button>
                                            );
                                        }
                                    )}

                                    <button
                                        disabled={
                                            currentPage ===
                                            totalPages
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                (page) =>
                                                    page +
                                                    1
                                            )
                                        }
                                    >
                                        Next
                                    </button>

                                </div>
                            )}

                        </>
                    )}

                </section>

            </main>

            {/* =====================================================
                PRODUCT DETAILS
            ===================================================== */}

            {selectedProduct && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        setSelectedProduct(
                            null
                        )
                    }
                >
                    <div
                        className="product-detail-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={() =>
                                setSelectedProduct(
                                    null
                                )
                            }
                        >
                            <X size={21} />
                        </button>

                        <div className="detail-image">

                            <img
                                src={getImage(
                                    selectedProduct
                                )}
                                alt={
                                    selectedProduct.name
                                }
                                onError={
                                    handleImageError
                                }
                            />

                        </div>

                        <div className="detail-content">

                            <span className="detail-category">
                                {
                                    selectedProduct.category
                                }
                            </span>

                            <h2>
                                {
                                    selectedProduct.name
                                }
                            </h2>

                            <p className="detail-description">
                                {selectedProduct.description ||
                                    "Premium quality product designed for everyday use."}
                            </p>

                            <div className="detail-info">

                                <div>
                                    <span>
                                        SKU
                                    </span>

                                    <strong>
                                        {
                                            selectedProduct.sku
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Availability
                                    </span>

                                    {(() => {
                                        const status =
                                            getStockStatus(
                                                selectedProduct.id
                                            );

                                        return (
                                            <strong
                                                className={`available ${status.className}`}
                                            >
                                                {status.label}
                                            </strong>
                                        );
                                    })()}

                                </div>

                            </div>

                            <div className="detail-price">
                                â‚¹
                                {Number(
                                    selectedProduct.price
                                ).toLocaleString(
                                    "en-IN"
                                )}
                            </div>

                            <div className="detail-actions">

                                <button
                                    className="add-cart-button"
                                    disabled={
                                        Number(
                                            getInventory(
                                                selectedProduct.id
                                            )
                                                .available_quantity ||
                                                0
                                        ) <= 0
                                    }
                                    onClick={() =>
                                        handleAddToCart(
                                            selectedProduct
                                        )
                                    }
                                >
                                    <ShoppingCart
                                        size={18}
                                    />

                                    {Number(
                                        getInventory(
                                            selectedProduct.id
                                        )
                                            .available_quantity ||
                                            0
                                    ) <= 0
                                        ? "Out of Stock"
                                        : "Add to Cart"}
                                </button>

                                <button
                                    className={`detail-wishlist ${
                                        isWishlisted(
                                            selectedProduct.id
                                        )
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handleWishlist(
                                            selectedProduct
                                        )
                                    }
                                >
                                    <Heart
                                        size={18}
                                        fill={
                                            isWishlisted(
                                                selectedProduct.id
                                            )
                                                ? "currentColor"
                                                : "none"
                                        }
                                    />
                                </button>

                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                CART
            ===================================================== */}

            {cartOpen && (
                <div
                    className="drawer-overlay"
                    onClick={() =>
                        setCartOpen(false)
                    }
                >
                    <aside
                        className="side-drawer"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="drawer-header">

                            <div>
                                <span>
                                    SHOPPING CART
                                </span>

                                <h2>
                                    Your Cart
                                </h2>
                            </div>

                            <button
                                onClick={() =>
                                    setCartOpen(
                                        false
                                    )
                                }
                            >
                                <X size={21} />
                            </button>

                        </div>

                        {cartItems.length === 0 ? (
                            <div className="drawer-empty">

                                <ShoppingCart
                                    size={48}
                                />

                                <h3>
                                    Your cart is
                                    empty
                                </h3>

                                <p>
                                    Add products to
                                    start your
                                    order.
                                </p>

                                <button
                                    className="primary-button"
                                    onClick={() => {
                                        setCartOpen(
                                            false
                                        );

                                        scrollToProducts();
                                    }}
                                >
                                    Shop Now
                                </button>

                            </div>
                        ) : (
                            <>

                                <div className="drawer-items">

                                    {cartItems.map(
                                        (item) => {
                                            const available =
                                                Number(
                                                    getInventory(
                                                        item.product_id
                                                    )
                                                        .available_quantity ||
                                                        0
                                                );

                                            return (
                                                <div
                                                    className="cart-item"
                                                    key={
                                                        item.product_id
                                                    }
                                                >

                                                    <img
                                                        src={
                                                            item.image_url ||
                                                            "https://via.placeholder.com/120x120?text=Product"
                                                        }
                                                        alt={
                                                            item.product_name
                                                        }
                                                        onError={
                                                            handleImageError
                                                        }
                                                    />

                                                    <div className="cart-item-content">

                                                        <strong>
                                                            {
                                                                item.product_name
                                                            }
                                                        </strong>

                                                        <span>
                                                            â‚¹
                                                            {Number(
                                                                item.price
                                                            ).toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </span>

                                                        <div className="quantity-control">

                                                            <button
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item,
                                                                        -1
                                                                    )
                                                                }
                                                            >
                                                                <Minus
                                                                    size={15}
                                                                />
                                                            </button>

                                                            <b>
                                                                {
                                                                    item.quantity
                                                                }
                                                            </b>

                                                            <button
                                                                disabled={
                                                                    Number(
                                                                        item.quantity
                                                                    ) >=
                                                                    available
                                                                }
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item,
                                                                        1
                                                                    )
                                                                }
                                                            >
                                                                <Plus
                                                                    size={15}
                                                                />
                                                            </button>

                                                        </div>

                                                        <small>
                                                            {available >
                                                            0
                                                                ? `${available} available`
                                                                : "Stock unavailable"}
                                                        </small>

                                                    </div>

                                                    <button
                                                        className="remove-item"
                                                        onClick={() =>
                                                            removeCartItem(
                                                                item.product_id
                                                            )
                                                        }
                                                    >
                                                        <Trash2
                                                            size={17}
                                                        />
                                                    </button>

                                                </div>
                                            );
                                        }
                                    )}

                                </div>

                                <div className="drawer-footer">

                                    <div className="cart-summary-line">

                                        <span>
                                            Subtotal
                                        </span>

                                        <strong>
                                            â‚¹
                                            {cartTotal.toLocaleString(
                                                "en-IN"
                                            )}
                                        </strong>

                                    </div>

                                    <div className="cart-trust">
                                        <ShieldCheck
                                            size={16}
                                        />
                                        Secure checkout
                                    </div>

                                    <button
                                        className="checkout-button"
                                        onClick={
                                            handleCheckout
                                        }
                                    >
                                        Proceed to
                                        Checkout

                                        <ArrowRight
                                            size={18}
                                        />
                                    </button>

                                    <button
                                        className="clear-cart-button"
                                        onClick={
                                            clearCart
                                        }
                                    >
                                        Clear Cart
                                    </button>

                                </div>

                            </>
                        )}

                    </aside>
                </div>
            )}

            {/* =====================================================
                WISHLIST
            ===================================================== */}

            {wishlistOpen && (
                <div
                    className="drawer-overlay"
                    onClick={() =>
                        setWishlistOpen(
                            false
                        )
                    }
                >
                    <aside
                        className="side-drawer"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="drawer-header">

                            <div>
                                <span>
                                    SAVED PRODUCTS
                                </span>

                                <h2>
                                    Wishlist
                                </h2>
                            </div>

                            <button
                                onClick={() =>
                                    setWishlistOpen(
                                        false
                                    )
                                }
                            >
                                <X size={21} />
                            </button>

                        </div>

                        {!user ? (
                            <div className="drawer-empty">

                                <Heart size={48} />

                                <h3>
                                    Login to view
                                    wishlist
                                </h3>

                                <p>
                                    Save products
                                    you love for
                                    later.
                                </p>

                                <button
                                    className="primary-button"
                                    onClick={() =>
                                        openAuth(
                                            "login"
                                        )
                                    }
                                >
                                    Login
                                </button>

                            </div>
                        ) : wishlistItems.length ===
                          0 ? (
                            <div className="drawer-empty">

                                <Heart size={48} />

                                <h3>
                                    No saved
                                    products
                                </h3>

                                <p>
                                    Tap the heart
                                    icon on a
                                    product to save
                                    it.
                                </p>

                            </div>
                        ) : (
                            <div className="drawer-items">

                                {wishlistItems.map(
                                    (item) => (
                                        <div
                                            className="wishlist-item"
                                            key={
                                                item.product_id
                                            }
                                        >

                                            <img
                                                src={
                                                    item.image_url ||
                                                    "https://via.placeholder.com/120x120?text=Product"
                                                }
                                                alt={
                                                    item.product_name
                                                }
                                                onError={
                                                    handleImageError
                                                }
                                            />

                                            <div>

                                                <strong>
                                                    {
                                                        item.product_name
                                                    }
                                                </strong>

                                                <span>
                                                    â‚¹
                                                    {Number(
                                                        item.price
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )}
                                                </span>

                                                <button
                                                    className="small-add-button"
                                                    onClick={() =>
                                                        handleAddToCart(
                                                            item
                                                        )
                                                    }
                                                >
                                                    Add to Cart
                                                </button>

                                            </div>

                                            <button
                                                className="remove-item"
                                                onClick={() =>
                                                    handleWishlist(
                                                        item
                                                    )
                                                }
                                            >
                                                <Trash2
                                                    size={17}
                                                />
                                            </button>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                    </aside>
                </div>
            )}

            {/* =====================================================
                MY ORDERS
            ===================================================== */}

            {ordersOpen && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        setOrdersOpen(false)
                    }
                >
                    <div
                        className="orders-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={() =>
                                setOrdersOpen(
                                    false
                                )
                            }
                        >
                            <X size={21} />
                        </button>

                        <div className="orders-header">

                            <span className="section-kicker">
                                ORDER HISTORY
                            </span>

                            <h2>
                                My Orders
                            </h2>

                            <p>
                                View your recent
                                purchases and
                                order status.
                            </p>

                        </div>

                        {ordersLoading ? (
                            <div className="loading-state">

                                <LoaderCircle
                                    size={34}
                                    className="loading-icon"
                                />

                                <h3>
                                    Loading your
                                    orders...
                                </h3>

                            </div>
                        ) : ordersError ? (
                            <div className="empty-state">

                                <AlertCircle
                                    size={40}
                                />

                                <h3>
                                    Unable to load
                                    orders
                                </h3>

                                <p>
                                    {ordersError}
                                </p>

                                <button
                                    className="primary-button"
                                    onClick={
                                        loadOrders
                                    }
                                >
                                    <RefreshCw
                                        size={17}
                                    />
                                    Try Again
                                </button>

                            </div>
                        ) : orders.length === 0 ? (
                            <div className="drawer-empty">

                                <Package size={48} />

                                <h3>
                                    No orders yet
                                </h3>

                                <p>
                                    Your completed
                                    orders will
                                    appear here.
                                </p>

                                <button
                                    className="primary-button"
                                    onClick={() => {
                                        setOrdersOpen(
                                            false
                                        );

                                        scrollToProducts();
                                    }}
                                >
                                    Start Shopping
                                </button>

                            </div>
                        ) : (
                            <div className="orders-list">

                                {orders.map(
                                    (order) => (
                                        <div
                                            className="order-card"
                                            key={
                                                order.id
                                            }
                                        >

                                            <div className="order-card-top">

                                                <div>
                                                    <span>
                                                        ORDER
                                                    </span>

                                                    <strong>
                                                        #
                                                        {
                                                            order.id
                                                        }
                                                    </strong>
                                                </div>

                                                <span
                                                    className={`order-status ${String(
                                                        order.status ||
                                                            "pending"
                                                    ).toLowerCase()}`}
                                                >
                                                    {
                                                        order.status ||
                                                        "Pending"
                                                    }
                                                </span>

                                            </div>

                                            <div className="order-card-info">

                                                <div>

                                                    <span>
                                                        Amount
                                                    </span>

                                                    <strong>
                                                        â‚¹
                                                        {Number(
                                                            order.total_amount ||
                                                                order.total ||
                                                                0
                                                        ).toLocaleString(
                                                            "en-IN"
                                                        )}
                                                    </strong>

                                                </div>

                                                <div>

                                                    <span>
                                                        Payment
                                                    </span>

                                                    <strong>
                                                        {
                                                            order.payment_status ||
                                                            "Pending"
                                                        }
                                                    </strong>

                                                </div>

                                                <div>

                                                    <span>
                                                        Date
                                                    </span>

                                                    <strong>
                                                        {order.created_at
                                                            ? new Date(
                                                                  order.created_at
                                                              ).toLocaleDateString(
                                                                  "en-IN"
                                                              )
                                                            : "â€”"}
                                                    </strong>

                                                </div>

                                            </div>

                                            {order.shipping_address && (
                                                <div className="order-address">

                                                    <MapPin
                                                        size={16}
                                                    />

                                                    <span>
                                                        {
                                                            order.shipping_address
                                                        }
                                                    </span>

                                                </div>
                                            )}

                                            <div className="order-card-actions">

                                                <button
                                                    className="primary-button small"
                                                    onClick={() =>
                                                        loadOrderDetails(
                                                            order.id
                                                        )
                                                    }
                                                >
                                                    <Eye
                                                        size={16}
                                                    />

                                                    View Details
                                                </button>

                                                {![
                                                    "cancelled",
                                                    "shipped",
                                                    "delivered",
                                                    "refunded",
                                                ].includes(
                                                    String(
                                                        order.status ||
                                                            ""
                                                    ).toLowerCase()
                                                ) && (
                                                    <button
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            handleCancelOrder(
                                                                order.id
                                                            )
                                                        }
                                                        disabled={
                                                            orderActionLoading
                                                        }
                                                    >
                                                        {orderActionLoading
                                                            ? "Cancelling..."
                                                            : "Cancel Order"}
                                                    </button>
                                                )}

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* =====================================================
                ORDER DETAILS
            ===================================================== */}

            {orderDetailOpen && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        setOrderDetailOpen(
                            false
                        )
                    }
                >
                    <div
                        className="orders-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={() =>
                                setOrderDetailOpen(
                                    false
                                )
                            }
                        >
                            <X size={21} />
                        </button>

                        {orderDetailLoading ? (
                            <div className="loading-state">

                                <LoaderCircle
                                    size={36}
                                    className="loading-icon"
                                />

                                <h3>
                                    Loading order
                                    details...
                                </h3>

                            </div>
                        ) : selectedOrder ? (
                            <>

                                <div className="orders-header">

                                    <span className="section-kicker">
                                        ORDER DETAILS
                                    </span>

                                    <h2>
                                        Order #
                                        {
                                            selectedOrder.id
                                        }
                                    </h2>

                                    <p>
                                        Complete
                                        details of
                                        your order.
                                    </p>

                                </div>

                                <div className="order-detail-grid">

                                    <div>
                                        <span>
                                            Order Status
                                        </span>

                                        <strong>
                                            {
                                                selectedOrder.status ||
                                                "Pending"
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Payment Status
                                        </span>

                                        <strong>
                                            {
                                                selectedOrder.payment_status ||
                                                "Pending"
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Total Amount
                                        </span>

                                        <strong>
                                            â‚¹
                                            {Number(
                                                selectedOrder.total_amount ||
                                                    selectedOrder.total ||
                                                    0
                                            ).toLocaleString(
                                                "en-IN"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Order Date
                                        </span>

                                        <strong>
                                            {selectedOrder.created_at
                                                ? new Date(
                                                      selectedOrder.created_at
                                                  ).toLocaleString(
                                                      "en-IN"
                                                  )
                                                : "â€”"}
                                        </strong>
                                    </div>

                                </div>

                                <div className="order-address">

                                    <MapPin
                                        size={17}
                                    />

                                    <span>
                                        {
                                            selectedOrder.shipping_address
                                        }
                                    </span>

                                </div>

                                <div className="order-detail-items">

                                    <h3>
                                        Order Items
                                    </h3>

                                    {(selectedOrder.items ||
                                        []
                                    ).map(
                                        (item) => (
                                            <div
                                                className="order-detail-item"
                                                key={
                                                    item.id ||
                                                    `${item.product_id}-${item.quantity}`
                                                }
                                            >

                                                <div>

                                                    <strong>
                                                        {
                                                            item.product_name
                                                        }
                                                    </strong>

                                                    <span>
                                                        Quantity:{" "}
                                                        {
                                                            item.quantity
                                                        }
                                                    </span>

                                                    <span>
                                                        Unit Price: â‚¹
                                                        {Number(
                                                            item.price ||
                                                                0
                                                        ).toLocaleString(
                                                            "en-IN"
                                                        )}
                                                    </span>

                                                </div>

                                                <strong>
                                                    â‚¹
                                                    {Number(
                                                        item.subtotal ??
                                                            Number(
                                                                item.price ||
                                                                    0
                                                            ) *
                                                                Number(
                                                                    item.quantity ||
                                                                        0
                                                                )
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )}
                                                </strong>

                                            </div>
                                        )
                                    )}

                                </div>

                                {![
                                    "cancelled",
                                    "shipped",
                                    "delivered",
                                    "refunded",
                                ].includes(
                                    String(
                                        selectedOrder.status ||
                                            ""
                                    ).toLowerCase()
                                ) && (
                                    <button
                                        className="checkout-confirm-button"
                                        onClick={() =>
                                            handleCancelOrder(
                                                selectedOrder.id
                                            )
                                        }
                                        disabled={
                                            orderActionLoading
                                        }
                                    >
                                        {orderActionLoading
                                            ? "Cancelling Order..."
                                            : "Cancel Order"}
                                    </button>
                                )}

                            </>
                        ) : (
                            <div className="empty-state">

                                <AlertCircle
                                    size={40}
                                />

                                <h3>
                                    Order not found
                                </h3>

                                <p>
                                    Unable to display
                                    this order.
                                </p>

                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* =====================================================
                CHECKOUT
            ===================================================== */}

            {checkoutOpen && (
                <div
                    className="modal-overlay checkout-overlay"
                    onClick={
                        closeCheckout
                    }
                >
                    <div
                        className="checkout-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={
                                closeCheckout
                            }
                            disabled={
                                checkoutLoading
                            }
                        >
                            <X size={21} />
                        </button>

                        {orderSuccess ? (
                            <div className="checkout-success">

                                <div className="auth-icon">
                                    <CheckCircle2
                                        size={30}
                                    />
                                </div>

                                <span className="auth-kicker">
                                    ORDER CONFIRMED
                                </span>

                                <h2>
                                    Thank you for
                                    your order!
                                </h2>

                                <p>
                                    Your order has
                                    been placed
                                    successfully
                                    and your
                                    simulated
                                    payment was
                                    completed.
                                </p>

                                <div className="order-success-card">

                                    <div>
                                        <span>
                                            Order ID
                                        </span>

                                        <strong>
                                            #
                                            {
                                                orderSuccess.orderId
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Payment
                                        </span>

                                        <strong>
                                            #
                                            {
                                                orderSuccess.paymentId
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Amount
                                        </span>

                                        <strong>
                                            â‚¹
                                            {Number(
                                                orderSuccess.total
                                            ).toLocaleString(
                                                "en-IN"
                                            )}
                                        </strong>
                                    </div>

                                </div>

                                <div className="checkout-success-actions">

                                    <button
                                        className="primary-button"
                                        onClick={() => {
                                            closeCheckout();

                                            scrollToProducts();
                                        }}
                                    >
                                        Continue Shopping
                                    </button>

                                    <button
                                        className="secondary-button"
                                        onClick={() => {
                                            closeCheckout();

                                            setOrdersOpen(
                                                true
                                            );

                                            loadOrders();
                                        }}
                                    >
                                        View My Orders
                                    </button>

                                </div>

                            </div>
                        ) : (
                            <>

                                <div className="checkout-header">

                                    <span className="section-kicker">
                                        SECURE CHECKOUT
                                    </span>

                                    <h2>
                                        Complete your
                                        order
                                    </h2>

                                    <p>
                                        Enter your
                                        delivery details
                                        and confirm your
                                        simulated payment.
                                    </p>

                                </div>

                                {checkoutError && (
                                    <div className="auth-error">

                                        <AlertCircle
                                            size={17}
                                        />

                                        {checkoutError}

                                    </div>
                                )}

                                <div className="checkout-layout">

                                    <div className="checkout-form-section">

                                        <div className="checkout-step">

                                            <div className="checkout-step-icon">
                                                <MapPin
                                                    size={20}
                                                />
                                            </div>

                                            <div>
                                                <span>
                                                    STEP 1
                                                </span>

                                                <h3>
                                                    Delivery
                                                    address
                                                </h3>
                                            </div>

                                        </div>

                                        <label className="checkout-field">

                                            <span>
                                                Shipping Address
                                            </span>

                                            <textarea
                                                value={
                                                    shippingAddress
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setShippingAddress(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="House / Flat No, Street, Area, City, State, Pincode"
                                                rows={5}
                                                disabled={
                                                    checkoutLoading
                                                }
                                            />

                                        </label>

                                        <div className="checkout-step">

                                            <div className="checkout-step-icon">
                                                <CreditCard
                                                    size={20}
                                                />
                                            </div>

                                            <div>
                                                <span>
                                                    STEP 2
                                                </span>

                                                <h3>
                                                    Payment
                                                </h3>
                                            </div>

                                        </div>

                                        <button
                                            type="button"
                                            className={`payment-option ${
                                                paymentMethod ===
                                                "simulated"
                                                    ? "active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                setPaymentMethod(
                                                    "simulated"
                                                )
                                            }
                                            disabled={
                                                checkoutLoading
                                            }
                                        >

                                            <div>

                                                <CreditCard
                                                    size={22}
                                                />

                                                <div>

                                                    <strong>
                                                        Simulated
                                                        Payment
                                                    </strong>

                                                    <span>
                                                        Demo payment
                                                        gateway
                                                    </span>

                                                </div>

                                            </div>

                                            <CheckCircle2
                                                size={19}
                                            />

                                        </button>

                                        <div className="checkout-security-note">

                                            <ShieldCheck
                                                size={17}
                                            />

                                            <span>
                                                No real card
                                                details are
                                                collected.
                                                This project
                                                uses a
                                                simulated
                                                payment flow.
                                            </span>

                                        </div>

                                    </div>

                                    <div className="checkout-summary">

                                        <div className="checkout-summary-header">

                                            <span>
                                                ORDER SUMMARY
                                            </span>

                                            <strong>
                                                {
                                                    cartItems.length
                                                } item
                                                {cartItems.length ===
                                                1
                                                    ? ""
                                                    : "s"}
                                            </strong>

                                        </div>

                                        <div className="checkout-summary-items">

                                            {cartItems.map(
                                                (item) => (
                                                    <div
                                                        className="checkout-summary-item"
                                                        key={
                                                            item.product_id
                                                        }
                                                    >

                                                        <img
                                                            src={
                                                                item.image_url ||
                                                                "https://via.placeholder.com/80x80?text=Product"
                                                            }
                                                            alt={
                                                                item.product_name
                                                            }
                                                            onError={
                                                                handleImageError
                                                            }
                                                        />

                                                        <div>

                                                            <strong>
                                                                {
                                                                    item.product_name
                                                                }
                                                            </strong>

                                                            <span>
                                                                Qty:{" "}
                                                                {
                                                                    item.quantity
                                                                }
                                                            </span>

                                                        </div>

                                                        <b>
                                                            â‚¹
                                                            {(
                                                                Number(
                                                                    item.price
                                                                ) *
                                                                Number(
                                                                    item.quantity
                                                                )
                                                            ).toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </b>

                                                    </div>
                                                )
                                            )}

                                        </div>

                                        <div className="checkout-summary-lines">

                                            <div>
                                                <span>
                                                    Subtotal
                                                </span>

                                                <strong>
                                                    â‚¹
                                                    {cartTotal.toLocaleString(
                                                        "en-IN"
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Delivery
                                                </span>

                                                <strong>
                                                    FREE
                                                </strong>
                                            </div>

                                            <div className="checkout-total">

                                                <span>
                                                    Total
                                                </span>

                                                <strong>
                                                    â‚¹
                                                    {cartTotal.toLocaleString(
                                                        "en-IN"
                                                    )}
                                                </strong>

                                            </div>

                                        </div>

                                        <button
                                            className="checkout-confirm-button"
                                            onClick={
                                                placeOrder
                                            }
                                            disabled={
                                                checkoutLoading
                                            }
                                        >

                                            {checkoutLoading ? (
                                                <>
                                                    <LoaderCircle
                                                        size={19}
                                                        className="loading-icon"
                                                    />
                                                    Processing
                                                    Order...
                                                </>
                                            ) : (
                                                <>
                                                    Place Order
                                                    & Pay

                                                    <ArrowRight
                                                        size={18}
                                                    />
                                                </>
                                            )}

                                        </button>

                                        <div className="checkout-delivery-note">

                                            <Truck
                                                size={17}
                                            />

                                            Fast and secure
                                            order processing

                                        </div>

                                    </div>

                                </div>

                            </>
                        )}

                    </div>
                </div>
            )}

            {/* =====================================================
                AUTH
            ===================================================== */}

            {authOpen && (
                <div
                    className="modal-overlay"
                    onClick={closeAuth}
                >
                    <div
                        className="auth-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            className="modal-close"
                            onClick={closeAuth}
                        >
                            <X size={21} />
                        </button>

                        <div className="auth-icon">
                            <ShieldCheck
                                size={28}
                            />
                        </div>

                        <span className="auth-kicker">
                            SECURE ACCOUNT
                        </span>

                        <h2>
                            {authMode === "login"
                                ? "Welcome back"
                                : "Create your account"}
                        </h2>

                        <p>
                            {authMode === "login"
                                ? "Login to continue to ShopFlow."
                                : "Join ShopFlow and start shopping smarter."}
                        </p>

                        <form
                            onSubmit={handleAuth}
                            className="auth-form"
                        >

                            {authMode ===
                                "register" && (
                                <label>
                                    Full Name

                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(
                                            event
                                        ) =>
                                            setName(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Enter your name"
                                        required
                                    />
                                </label>
                            )}

                            <label>
                                Email Address

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(
                                        event
                                    ) =>
                                        setEmail(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="you@example.com"
                                    required
                                />
                            </label>

                            <label>
                                Password

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(
                                        event
                                    ) =>
                                        setPassword(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Enter your password"
                                    required
                                />
                            </label>

                            {authError && (
                                <div className="auth-error">

                                    <AlertCircle
                                        size={17}
                                    />

                                    {authError}

                                </div>
                            )}

                            {authSuccess && (
                                <div className="auth-success">

                                    <CheckCircle2
                                        size={17}
                                    />

                                    {authSuccess}

                                </div>
                            )}

                            <button
                                type="submit"
                                className="auth-submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "Please wait..."
                                    : authMode ===
                                      "login"
                                    ? "Login to ShopFlow"
                                    : "Create Account"}
                            </button>

                        </form>

                        <div className="auth-switch">

                            {authMode ===
                            "login"
                                ? "Don't have an account?"
                                : "Already have an account?"}

                            <button
                                onClick={() => {
                                    setAuthMode(
                                        authMode ===
                                            "login"
                                            ? "register"
                                            : "login"
                                    );

                                    setAuthError(
                                        ""
                                    );

                                    setAuthSuccess(
                                        ""
                                    );
                                }}
                            >
                                {authMode ===
                                "login"
                                    ? "Create one"
                                    : "Login"}
                            </button>

                        </div>

                    </div>
                </div>
            )}

            {/* =====================================================
                TOAST
            ===================================================== */}

            {toast && (
                <div
                    className={`toast ${
                        toast.type ===
                        "error"
                            ? "toast-error"
                            : ""
                    }`}
                >

                    {toast.type ===
                    "error" ? (
                        <AlertCircle
                            size={19}
                        />
                    ) : (
                        <CheckCircle2
                            size={19}
                        />
                    )}

                    <span>
                        {toast.message}
                    </span>

                    <button
                        onClick={() =>
                            setToast(null)
                        }
                    >
                        <X size={16} />
                    </button>

                </div>
            )}

        
            <ReturnManager />

            <AdminReturnManager />
</div>
    );
}

export default App;

