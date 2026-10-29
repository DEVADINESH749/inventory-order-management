import { useEffect, useState } from "react";
import {
    ShoppingCart,
    Heart,
    Search,
    User,
    Package,
    LogOut,
    X,
    Trash2,
    Plus,
    Minus,
} from "lucide-react";

import { productApi, cartApi } from "./services/api";
import { useAuth } from "./context/AuthContext";

function App() {
    const { user, login, register, logout, loading } = useAuth();

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [cart, setCart] = useState({
        items: [],
        total_items: 0,
        total_amount: 0,
    });

    const [wishlist, setWishlist] = useState({
        items: [],
    });

    const [cartOpen, setCartOpen] = useState(false);
    const [wishlistOpen, setWishlistOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const [authMode, setAuthMode] = useState(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authError, setAuthError] = useState("");
    const [authSuccess, setAuthSuccess] = useState("");

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (user) {
            loadCart();
            loadWishlist();
        } else {
            setCart({
                items: [],
                total_items: 0,
                total_amount: 0,
            });

            setWishlist({
                items: [],
            });
        }
    }, [user]);

    async function loadProducts() {
        try {
            const response = await productApi.getProducts();
            setProducts(response.data.items || []);
        } catch (error) {
            console.error("Unable to load products:", error);
        } finally {
            setProductsLoading(false);
        }
    }

    async function loadCart() {
        try {
            const response = await cartApi.getCart(user.id);
            setCart(response.data);
        } catch (error) {
            console.error("Unable to load cart:", error);
        }
    }

    async function loadWishlist() {
        try {
            const response = await cartApi.getWishlist(user.id);
            setWishlist(response.data);
        } catch (error) {
            console.error("Unable to load wishlist:", error);
        }
    }

    async function handleAddToCart(product) {
        if (!user) {
            setAuthMode("login");
            return;
        }

        try {
            await cartApi.addToCart({
                user_id: user.id,
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                quantity: 1,
                image_url: product.image_url,
            });

            await loadCart();

            setCartOpen(true);
        } catch (error) {
            alert(
                error.response?.data?.detail ||
                    "Unable to add product to cart."
            );
        }
    }

    async function updateQuantity(item, quantity) {
        if (quantity < 1) {
            await removeCartItem(item.product_id);
            return;
        }

        try {
            await cartApi.updateCartItem(
                user.id,
                item.product_id,
                {
                    quantity,
                }
            );

            await loadCart();
        } catch (error) {
            alert(
                error.response?.data?.detail ||
                    "Unable to update cart."
            );
        }
    }

    async function removeCartItem(productId) {
        try {
            await cartApi.removeCartItem(
                user.id,
                productId
            );

            await loadCart();
        } catch (error) {
            alert(
                error.response?.data?.detail ||
                    "Unable to remove item."
            );
        }
    }

    async function handleWishlist(product) {
        if (!user) {
            setAuthMode("login");
            return;
        }

        const exists = wishlist.items?.some(
            (item) => item.product_id === product.id
        );

        try {
            if (exists) {
                await cartApi.removeFromWishlist(
                    user.id,
                    product.id
                );
            } else {
                await cartApi.addToWishlist({
                    user_id: user.id,
                    product_id: product.id,
                    product_name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                });
            }

            await loadWishlist();
        } catch (error) {
            alert(
                error.response?.data?.detail ||
                    "Unable to update wishlist."
            );
        }
    }

    async function handleAuth(event) {
        event.preventDefault();

        setAuthError("");
        setAuthSuccess("");

        try {
            if (authMode === "login") {
                await login(email, password);
                setAuthSuccess("Login successful!");
            } else {
                await register(name, email, password);
                setAuthSuccess("Account created successfully!");
            }

            setName("");
            setEmail("");
            setPassword("");

            setTimeout(() => {
                setAuthMode(null);
                setAuthSuccess("");
            }, 1000);
        } catch (error) {
            setAuthError(
                error.response?.data?.detail ||
                    "Something went wrong. Please try again."
            );
        }
    }

    const filteredProducts = products.filter((product) =>
        product.name
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="app">
            <header className="navbar">
                <div className="brand">
                    <Package size={28} />
                    <span>ShopFlow</span>
                </div>

                <div className="search-box">
                    <Search size={20} />

                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />
                </div>

                <div className="nav-actions">
                    <button
                        title="Wishlist"
                        onClick={() =>
                            setWishlistOpen(!wishlistOpen)
                        }
                    >
                        <Heart size={21} />

                        {wishlist.items?.length > 0 && (
                            <span className="count-badge">
                                {wishlist.items.length}
                            </span>
                        )}
                    </button>

                    <button
                        title="Cart"
                        onClick={() => setCartOpen(!cartOpen)}
                    >
                        <ShoppingCart size={21} />

                        {cart.total_items > 0 && (
                            <span className="count-badge">
                                {cart.total_items}
                            </span>
                        )}
                    </button>

                    <button
                        title="Profile"
                        onClick={() =>
                            setProfileOpen(!profileOpen)
                        }
                    >
                        <User size={21} />
                    </button>
                </div>
            </header>

            {profileOpen && (
                <div className="profile-panel">
                    {user ? (
                        <>
                            <div className="profile-icon">
                                <User size={32} />
                            </div>

                            <h3>{user.name}</h3>

                            <p>{user.email}</p>

                            <span className="role-badge">
                                {user.role}
                            </span>

                            <button
                                className="logout-button"
                                onClick={logout}
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="profile-icon">
                                <User size={32} />
                            </div>

                            <h3>Welcome to ShopFlow</h3>

                            <p>
                                Login to manage your account
                                and orders.
                            </p>

                            <button
                                className="primary-button full-button"
                                onClick={() => {
                                    setAuthMode("login");
                                    setProfileOpen(false);
                                }}
                            >
                                Login
                            </button>

                            <button
                                className="secondary-button full-button"
                                onClick={() => {
                                    setAuthMode("register");
                                    setProfileOpen(false);
                                }}
                            >
                                Create Account
                            </button>
                        </>
                    )}
                </div>
            )}

            {cartOpen && user && (
                <div className="side-panel">
                    <div className="side-panel-header">
                        <h2>Your Cart</h2>

                        <button
                            onClick={() => setCartOpen(false)}
                        >
                            <X />
                        </button>
                    </div>

                    {cart.items?.length === 0 ? (
                        <div className="empty-state">
                            Your cart is empty.
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {cart.items.map((item) => (
                                    <div
                                        className="cart-item"
                                        key={item.product_id}
                                    >
                                        <div>
                                            <h4>
                                                {item.product_name}
                                            </h4>

                                            <strong>
                                                ?
                                                {Number(
                                                    item.price
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
                                            </strong>
                                        </div>

                                        <div className="quantity-controls">
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        item,
                                                        item.quantity -
                                                            1
                                                    )
                                                }
                                            >
                                                <Minus size={15} />
                                            </button>

                                            <span>
                                                {item.quantity}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        item,
                                                        item.quantity +
                                                            1
                                                    )
                                                }
                                            >
                                                <Plus size={15} />
                                            </button>

                                            <button
                                                onClick={() =>
                                                    removeCartItem(
                                                        item.product_id
                                                    )
                                                }
                                            >
                                                <Trash2
                                                    size={16}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-total">
                                <span>Total</span>

                                <strong>
                                    ?
                                    {Number(
                                        cart.total_amount
                                    ).toLocaleString("en-IN")}
                                </strong>
                            </div>

                            <button
                                className="primary-button full-button"
                                onClick={() =>
                                    alert(
                                        "Checkout will be connected next."
                                    )
                                }
                            >
                                Proceed to Checkout
                            </button>
                        </>
                    )}
                </div>
            )}

            {wishlistOpen && user && (
                <div className="side-panel">
                    <div className="side-panel-header">
                        <h2>Wishlist</h2>

                        <button
                            onClick={() =>
                                setWishlistOpen(false)
                            }
                        >
                            <X />
                        </button>
                    </div>

                    {wishlist.items?.length === 0 ? (
                        <div className="empty-state">
                            Your wishlist is empty.
                        </div>
                    ) : (
                        <div className="cart-items">
                            {wishlist.items.map((item) => (
                                <div
                                    className="cart-item"
                                    key={item.product_id}
                                >
                                    <div>
                                        <h4>
                                            {item.product_name}
                                        </h4>

                                        <strong>
                                            ?
                                            {Number(
                                                item.price
                                            ).toLocaleString(
                                                "en-IN"
                                            )}
                                        </strong>
                                    </div>

                                    <button
                                        onClick={() =>
                                            handleWishlist({
                                                id: item.product_id,
                                            })
                                        }
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <main>
                <section className="hero">
                    <div>
                        <p className="eyebrow">
                            INVENTORY & ORDER MANAGEMENT
                        </p>

                        <h1>
                            Everything you need,
                            <br />
                            in one place.
                        </h1>

                        <p>
                            Discover products, manage your cart,
                            place orders, and track everything from
                            one simple dashboard.
                        </p>

                        <button
                            className="primary-button"
                            onClick={() =>
                                document
                                    .getElementById("products")
                                    ?.scrollIntoView({
                                        behavior: "smooth",
                                    })
                            }
                        >
                            Explore Products
                        </button>
                    </div>
                </section>

                <section
                    className="products-section"
                    id="products"
                >
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">
                                OUR STORE
                            </p>

                            <h2>Featured Products</h2>
                        </div>

                        <span>
                            {filteredProducts.length} products
                        </span>
                    </div>

                    {productsLoading ? (
                        <div className="empty-state">
                            Loading products...
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="empty-state">
                            No products found.
                        </div>
                    ) : (
                        <div className="product-grid">
                            {filteredProducts.map(
                                (product) => {
                                    const wished =
                                        wishlist.items?.some(
                                            (item) =>
                                                item.product_id ===
                                                product.id
                                        );

                                    return (
                                        <article
                                            className="product-card"
                                            key={product.id}
                                        >
                                            <div className="product-image">
                                                <img
                                                    src={
                                                        product.image_url
                                                    }
                                                    alt={
                                                        product.name
                                                    }
                                                    onError={(
                                                        event
                                                    ) => {
                                                        event.currentTarget.style.display =
                                                            "none";
                                                    }}
                                                />

                                                <span>
                                                    {
                                                        product.category
                                                    }
                                                </span>

                                                <button
                                                    className={
                                                        wished
                                                            ? "wishlist-active"
                                                            : "wishlist-card-button"
                                                    }
                                                    onClick={() =>
                                                        handleWishlist(
                                                            product
                                                        )
                                                    }
                                                >
                                                    <Heart
                                                        size={18}
                                                        fill={
                                                            wished
                                                                ? "currentColor"
                                                                : "none"
                                                        }
                                                    />
                                                </button>
                                            </div>

                                            <div className="product-content">
                                                <h3>
                                                    {
                                                        product.name
                                                    }
                                                </h3>

                                                <p>
                                                    {
                                                        product.description
                                                    }
                                                </p>

                                                <div className="product-bottom">
                                                    <strong>
                                                        ?
                                                        {Number(
                                                            product.price
                                                        ).toLocaleString(
                                                            "en-IN"
                                                        )}
                                                    </strong>

                                                    <button
                                                        className="cart-button"
                                                        onClick={() =>
                                                            handleAddToCart(
                                                                product
                                                            )
                                                        }
                                                    >
                                                        <ShoppingCart
                                                            size={
                                                                18
                                                            }
                                                        />
                                                        Add to Cart
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}
                </section>
            </main>

            {authMode && (
                <div className="modal-overlay">
                    <div className="auth-modal">
                        <button
                            className="close-button"
                            onClick={() => {
                                setAuthMode(null);
                                setAuthError("");
                                setAuthSuccess("");
                            }}
                        >
                            <X size={22} />
                        </button>

                        <div className="auth-icon">
                            <User size={30} />
                        </div>

                        <h2>
                            {authMode === "login"
                                ? "Welcome Back"
                                : "Create Account"}
                        </h2>

                        <p>
                            {authMode === "login"
                                ? "Login to continue to ShopFlow."
                                : "Create your ShopFlow customer account."}
                        </p>

                        <form onSubmit={handleAuth}>
                            {authMode === "register" && (
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={name}
                                    onChange={(event) =>
                                        setName(
                                            event.target.value
                                        )
                                    }
                                    required
                                />
                            )}

                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                                required
                            />

                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                minLength={8}
                                required
                            />

                            {authError && (
                                <div className="auth-error">
                                    {authError}
                                </div>
                            )}

                            {authSuccess && (
                                <div className="auth-success">
                                    {authSuccess}
                                </div>
                            )}

                            <button
                                className="primary-button full-button"
                                type="submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "Please wait..."
                                    : authMode === "login"
                                    ? "Login"
                                    : "Create Account"}
                            </button>
                        </form>

                        <button
                            className="switch-auth"
                            onClick={() => {
                                setAuthMode(
                                    authMode === "login"
                                        ? "register"
                                        : "login"
                                );

                                setAuthError("");
                                setAuthSuccess("");
                            }}
                        >
                            {authMode === "login"
                                ? "Don't have an account? Create one"
                                : "Already have an account? Login"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
