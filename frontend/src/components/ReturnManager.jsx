import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    CheckCircle,
    Clock,
    Package,
    RotateCcw,
    X,
} from "lucide-react";

import {
    orderApi,
    returnApi,
} from "../services/api";

import { useAuth } from "../context/AuthContext";

function ReturnManager() {
    const {
        user,
    } = useAuth();

    const [open, setOpen] =
        useState(false);

    const [orders, setOrders] =
        useState([]);

    const [returns, setReturns] =
        useState([]);

    const [selectedOrder, setSelectedOrder] =
        useState(null);

    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [quantity, setQuantity] =
        useState(1);

    const [reason, setReason] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    // ========================================================
    // NORMALIZE API LIST
    // ========================================================

    function normalizeList(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (
            Array.isArray(data?.items)
        ) {
            return data.items;
        }

        if (
            Array.isArray(data?.data)
        ) {
            return data.data;
        }

        return [];
    }

    // ========================================================
    // ORDER ITEMS
    // ========================================================

    function getOrderItems(order) {
        if (!order) {
            return [];
        }

        if (
            Array.isArray(order.items)
        ) {
            return order.items;
        }

        if (
            Array.isArray(order.order_items)
        ) {
            return order.order_items;
        }

        return [];
    }

    // ========================================================
    // LOAD DATA
    // ========================================================

    async function loadData() {
        if (!user?.id) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const [
                ordersResponse,
                returnsResponse,
            ] = await Promise.all([
                orderApi.getUserOrders(
                    user.id
                ),

                returnApi.getUserReturns(
                    user.id
                ),
            ]);

            const loadedOrders =
                normalizeList(
                    ordersResponse.data
                );

            const loadedReturns =
                normalizeList(
                    returnsResponse.data
                );

            setOrders(
                loadedOrders
            );

            setReturns(
                loadedReturns
            );
        } catch (err) {
            console.error(
                "Return module loading error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to load orders and returns."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open && user?.id) {
            loadData();
        }
    }, [
        open,
        user?.id,
    ]);

    // ========================================================
    // SELECT ORDER
    // ========================================================

    async function handleOrderChange(
        orderId
    ) {
        if (!orderId) {
            setSelectedOrder(null);
            setSelectedProduct(null);
            return;
        }

        try {
            setError("");

            const existing =
                orders.find(
                    (item) =>
                        String(
                            item.id
                        ) ===
                        String(
                            orderId
                        )
                );

            let fullOrder =
                existing;

            if (
                getOrderItems(
                    existing
                ).length === 0
            ) {
                const response =
                    await orderApi.getOrder(
                        orderId
                    );

                fullOrder =
                    response.data;
            }

            setSelectedOrder(
                fullOrder
            );

            const items =
                getOrderItems(
                    fullOrder
                );

            setSelectedProduct(
                items.length > 0
                    ? items[0]
                    : null
            );

            setQuantity(
                items.length > 0
                    ? Math.max(
                          1,
                          Number(
                              items[0].quantity
                          )
                      )
                    : 1
            );

            setReason("");
            setDescription("");
        } catch (err) {
            console.error(
                "Order loading error:",
                err
            );

            setSelectedOrder(null);
            setSelectedProduct(null);

            setError(
                err.response?.data?.detail ||
                    "Unable to load order details."
            );
        }
    }

    // ========================================================
    // SELECT PRODUCT
    // ========================================================

    function handleProductChange(
        productId
    ) {
        const items =
            getOrderItems(
                selectedOrder
            );

        const item =
            items.find(
                (product) =>
                    String(
                        product.product_id
                    ) ===
                    String(
                        productId
                    )
            );

        setSelectedProduct(
            item || null
        );

        setQuantity(
            item
                ? Math.max(
                      1,
                      Number(
                          item.quantity
                      )
                  )
                : 1
        );
    }

    // ========================================================
    // REFUND
    // ========================================================

    const refundAmount =
        useMemo(() => {
            if (
                !selectedProduct
            ) {
                return 0;
            }

            const price =
                Number(
                    selectedProduct.price ||
                        0
                );

            const qty =
                Number(
                    quantity || 0
                );

            return price * qty;
        }, [
            selectedProduct,
            quantity,
        ]);

    // ========================================================
    // CREATE RETURN
    // ========================================================

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!user?.id) {
            setError(
                "Please login first."
            );
            return;
        }

        if (!selectedOrder) {
            setError(
                "Please select an order."
            );
            return;
        }

        if (!selectedProduct) {
            setError(
                "Please select a product."
            );
            return;
        }

        if (!reason.trim()) {
            setError(
                "Please select a return reason."
            );
            return;
        }

        const maxQuantity =
            Number(
                selectedProduct.quantity
            );

        const requestedQuantity =
            Number(
                quantity
            );

        if (
            requestedQuantity <
                1 ||
            requestedQuantity >
                maxQuantity
        ) {
            setError(
                `Quantity must be between 1 and ${maxQuantity}.`
            );
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                order_id:
                    Number(
                        selectedOrder.id
                    ),

                user_id:
                    Number(
                        user.id
                    ),

                product_id:
                    Number(
                        selectedProduct.product_id
                    ),

                product_name:
                    selectedProduct.product_name ||
                    selectedProduct.name ||
                    "Product",

                quantity:
                    requestedQuantity,

                reason:
                    reason.trim(),

                description:
                    description.trim() ||
                    null,

                refund_amount:
                    Number(
                        refundAmount.toFixed(
                            2
                        )
                    ),
            };

            const response =
                await returnApi.createReturn(
                    payload
                );

            setSuccess(
                `Return #${response.data.id} submitted successfully.`
            );

            setReason("");
            setDescription("");

            await loadData();
        } catch (err) {
            console.error(
                "Return creation error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to create return request."
            );
        } finally {
            setSubmitting(false);
        }
    }

    // ========================================================
    // CANCEL RETURN
    // ========================================================

    async function handleCancel(
        returnId
    ) {
        const confirmed =
            window.confirm(
                "Are you sure you want to cancel this return request?"
            );

        if (!confirmed) {
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await returnApi.cancelReturn(
                returnId
            );

            setSuccess(
                `Return #${returnId} cancelled successfully.`
            );

            await loadData();
        } catch (err) {
            console.error(
                "Cancel return error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to cancel return."
            );
        } finally {
            setLoading(false);
        }
    }

    // ========================================================
    // CLOSE
    // ========================================================

    function handleClose() {
        setOpen(false);
        setError("");
        setSuccess("");
    }

    // ========================================================
    // FORMAT
    // ========================================================

    function money(value) {
        return Number(
            value || 0
        ).toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
            }
        );
    }

    function date(value) {
        if (!value) {
            return "-";
        }

        const d =
            new Date(value);

        if (
            Number.isNaN(
                d.getTime()
            )
        ) {
            return "-";
        }

        return d.toLocaleString(
            "en-IN"
        );
    }

    function statusClass(
        status
    ) {
        return `return-status return-status-${String(
            status || "unknown"
        )
            .toLowerCase()
            .replaceAll(
                "_",
                "-"
            )}`;
    }

    function statusIcon(
        status
    ) {
        const value =
            String(
                status || ""
            ).toLowerCase();

        if (
            value === "refunded" ||
            value === "approved"
        ) {
            return (
                <CheckCircle
                    size={15}
                />
            );
        }

        if (
            value === "rejected" ||
            value === "cancelled"
        ) {
            return (
                <AlertCircle
                    size={15}
                />
            );
        }

        return (
            <Clock size={15} />
        );
    }

    // ========================================================
    // LOGGED OUT
    // ========================================================

    if (!user) {
        return null;
    }

    // ========================================================
    // BUTTON
    // ========================================================

    return (
        <>
            {!open && (
                <button
                    type="button"
                    className="return-floating-button"
                    onClick={() =>
                        setOpen(true)
                    }
                    title="Returns & Refunds"
                >
                    <RotateCcw
                        size={18}
                    />
                    <span>
                        Returns
                    </span>
                </button>
            )}

            {open && (
                <div className="return-overlay">
                    <div className="return-modal">

                        {/* HEADER */}

                        <div className="return-modal-header">
                            <div>
                                <div className="return-title-row">
                                    <RotateCcw
                                        size={23}
                                    />

                                    <h2>
                                        Returns & Refunds
                                    </h2>
                                </div>

                                <p>
                                    Submit a return
                                    and track your
                                    refund.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="return-close-button"
                                onClick={
                                    handleClose
                                }
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>

                        {/* MESSAGES */}

                        {error && (
                            <div className="return-message return-error">
                                <AlertCircle
                                    size={18}
                                />

                                <span>
                                    {error}
                                </span>
                            </div>
                        )}

                        {success && (
                            <div className="return-message return-success">
                                <CheckCircle
                                    size={18}
                                />

                                <span>
                                    {success}
                                </span>
                            </div>
                        )}

                        {/* REQUEST FORM */}

                        <section className="return-form-section">

                            <div className="return-section-title">
                                <Package
                                    size={18}
                                />

                                <h3>
                                    New Return Request
                                </h3>
                            </div>

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                {/* ORDER */}

                                <div className="return-field">
                                    <label>
                                        Order
                                    </label>

                                    <select
                                        value={
                                            selectedOrder?.id ||
                                            ""
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleOrderChange(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select an order
                                        </option>

                                        {orders.map(
                                            (
                                                order
                                            ) => (
                                                <option
                                                    key={
                                                        order.id
                                                    }
                                                    value={
                                                        order.id
                                                    }
                                                >
                                                    Order #
                                                    {
                                                        order.id
                                                    }{" "}
                                                    —{" "}
                                                    {money(
                                                        order.total_amount
                                                    )}{" "}
                                                    —{" "}
                                                    {
                                                        order.status
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* PRODUCT */}

                                <div className="return-field">
                                    <label>
                                        Product
                                    </label>

                                    <select
                                        value={
                                            selectedProduct?.product_id ||
                                            ""
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleProductChange(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            !selectedOrder
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select a product
                                        </option>

                                        {getOrderItems(
                                            selectedOrder
                                        ).map(
                                            (
                                                item
                                            ) => (
                                                <option
                                                    key={
                                                        item.product_id
                                                    }
                                                    value={
                                                        item.product_id
                                                    }
                                                >
                                                    {
                                                        item.product_name
                                                    }{" "}
                                                    — Qty{" "}
                                                    {
                                                        item.quantity
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* QUANTITY / REFUND */}

                                <div className="return-form-row">

                                    <div className="return-field">
                                        <label>
                                            Quantity
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            max={
                                                selectedProduct
                                                    ? Number(
                                                          selectedProduct.quantity
                                                      )
                                                    : 1
                                            }
                                            value={
                                                quantity
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setQuantity(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
                                            disabled={
                                                !selectedProduct
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="return-field">
                                        <label>
                                            Estimated Refund
                                        </label>

                                        <input
                                            value={money(
                                                refundAmount
                                            )}
                                            readOnly
                                        />
                                    </div>

                                </div>

                                {/* REASON */}

                                <div className="return-field">
                                    <label>
                                        Reason
                                    </label>

                                    <select
                                        value={
                                            reason
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setReason(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select a reason
                                        </option>

                                        <option value="Product not suitable">
                                            Product not suitable
                                        </option>

                                        <option value="Damaged product">
                                            Damaged product
                                        </option>

                                        <option value="Wrong product">
                                            Wrong product
                                        </option>

                                        <option value="Product defective">
                                            Product defective
                                        </option>

                                        <option value="Received different item">
                                            Received different item
                                        </option>

                                        <option value="Missing parts">
                                            Missing parts
                                        </option>

                                        <option value="Other">
                                            Other
                                        </option>
                                    </select>
                                </div>

                                {/* DESCRIPTION */}

                                <div className="return-field">
                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        rows="4"
                                        value={
                                            description
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDescription(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Describe the issue..."
                                    />
                                </div>

                                {/* ACTIONS */}

                                <div className="return-actions">

                                    <button
                                        type="button"
                                        className="return-secondary-button"
                                        onClick={
                                            handleClose
                                        }
                                    >
                                        Close
                                    </button>

                                    <button
                                        type="submit"
                                        className="return-primary-button"
                                        disabled={
                                            submitting ||
                                            !selectedProduct
                                        }
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : "Submit Return"}
                                    </button>

                                </div>

                            </form>
                        </section>

                        {/* RETURN HISTORY */}

                        <section className="return-history-section">

                            <div className="return-section-title">
                                <RotateCcw
                                    size={18}
                                />

                                <h3>
                                    My Return Requests
                                </h3>
                            </div>

                            {loading ? (
                                <div className="return-empty">
                                    Loading...
                                </div>
                            ) : returns.length ===
                              0 ? (
                                <div className="return-empty">
                                    <Package
                                        size={36}
                                    />

                                    <h4>
                                        No return
                                        requests
                                    </h4>

                                    <p>
                                        Your return
                                        history will
                                        appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="return-list">

                                    {returns.map(
                                        (
                                            item
                                        ) => (
                                            <div
                                                className="return-card"
                                                key={
                                                    item.id
                                                }
                                            >

                                                <div className="return-card-top">

                                                    <div>
                                                        <h4>
                                                            Return #
                                                            {
                                                                item.id
                                                            }
                                                        </h4>

                                                        <span>
                                                            Order #
                                                            {
                                                                item.order_id
                                                            }
                                                        </span>
                                                    </div>

                                                    <div
                                                        className={statusClass(
                                                            item.status
                                                        )}
                                                    >
                                                        {statusIcon(
                                                            item.status
                                                        )}

                                                        {
                                                            item.status
                                                        }
                                                    </div>

                                                </div>

                                                <div className="return-product-info">

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

                                                </div>

                                                <div className="return-details-grid">

                                                    <div>
                                                        <small>
                                                            Reason
                                                        </small>

                                                        <strong>
                                                            {
                                                                item.reason
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <small>
                                                            Refund
                                                        </small>

                                                        <strong>
                                                            {money(
                                                                item.refund_amount
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <small>
                                                            Refund Status
                                                        </small>

                                                        <strong>
                                                            {
                                                                item.refund_status ||
                                                                    "pending"
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <small>
                                                            Requested
                                                        </small>

                                                        <strong>
                                                            {date(
                                                                item.created_at
                                                            )}
                                                        </strong>
                                                    </div>

                                                </div>

                                                {item.description && (
                                                    <div className="return-description">
                                                        <small>
                                                            Description
                                                        </small>

                                                        <p>
                                                            {
                                                                item.description
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                                {(
                                                    item.status ===
                                                        "requested" ||
                                                    item.status ===
                                                        "approved"
                                                ) && (
                                                    <button
                                                        type="button"
                                                        className="return-cancel-button"
                                                        onClick={() =>
                                                            handleCancel(
                                                                item.id
                                                            )
                                                        }
                                                    >
                                                        Cancel Return
                                                    </button>
                                                )}

                                            </div>
                                        )
                                    )}

                                </div>
                            )}

                        </section>

                    </div>
                </div>
            )}
        </>
    );
}

export default ReturnManager;
