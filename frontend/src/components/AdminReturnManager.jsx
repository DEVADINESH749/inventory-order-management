import {
    useEffect,
    useState,
} from "react";

import {
    AlertCircle,
    CheckCircle,
    Clock,
    RotateCcw,
    X,
    RefreshCw,
} from "lucide-react";

import {
    returnApi,
} from "../services/api";

import {
    useAuth,
} from "../context/AuthContext";

function AdminReturnManager() {
    const { user } = useAuth();

    const [open, setOpen] =
        useState(false);

    const [returns, setReturns] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [actionLoading, setActionLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    // ========================================================
    // CHECK ADMIN
    // ========================================================

    const isAdmin =
        user &&
        (
            user.role === "admin" ||
            user.role === "inventory_manager"
        );

    // ========================================================
    // NORMALIZE LIST
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
    // LOAD RETURNS
    // ========================================================

    async function loadReturns() {
        if (!isAdmin) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response =
                await returnApi.getAllReturns();

            setReturns(
                normalizeList(
                    response.data
                )
            );
        } catch (err) {
            console.error(
                "Admin returns loading error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to load return requests."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open && isAdmin) {
            loadReturns();
        }
    }, [
        open,
        user?.id,
        user?.role,
    ]);

    // ========================================================
    // APPROVE
    // ========================================================

    async function approveReturn(
        returnId
    ) {
        const confirmed =
            window.confirm(
                `Approve Return #${returnId}?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");
            setSuccess("");

            await returnApi.approveReturn(
                returnId
            );

            setSuccess(
                `Return #${returnId} approved successfully.`
            );

            await loadReturns();
        } catch (err) {
            console.error(
                "Approve return error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to approve return."
            );
        } finally {
            setActionLoading(false);
        }
    }

    // ========================================================
    // REJECT
    // ========================================================

    async function rejectReturn(
        returnId
    ) {
        const confirmed =
            window.confirm(
                `Reject Return #${returnId}?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");
            setSuccess("");

            // IMPORTANT:
            // Reject endpoint requires NO body.

            await returnApi.rejectReturn(
                returnId
            );

            setSuccess(
                `Return #${returnId} rejected successfully.`
            );

            await loadReturns();
        } catch (err) {
            console.error(
                "Reject return error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to reject return."
            );
        } finally {
            setActionLoading(false);
        }
    }

    // ========================================================
    // REFUND
    // ========================================================

    async function refundReturn(
        returnId
    ) {
        const confirmed =
            window.confirm(
                `Process refund for Return #${returnId}?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");
            setSuccess("");

            // IMPORTANT:
            // Refund endpoint is PUT.
            await returnApi.refundReturn(
                returnId
            );

            setSuccess(
                `Refund for Return #${returnId} processed successfully.`
            );

            await loadReturns();
        } catch (err) {
            console.error(
                "Refund error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to process refund."
            );
        } finally {
            setActionLoading(false);
        }
    }

    // ========================================================
    // STATUS
    // ========================================================

    function statusClass(
        status
    ) {
        return `admin-return-status admin-return-${String(
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
            value ===
                "refunded" ||
            value ===
                "approved"
        ) {
            return (
                <CheckCircle
                    size={15}
                />
            );
        }

        if (
            value ===
                "rejected" ||
            value ===
                "cancelled"
        ) {
            return (
                <AlertCircle
                    size={15}
                />
            );
        }

        return (
            <Clock
                size={15}
            />
        );
    }

    function money(
        amount
    ) {
        return Number(
            amount || 0
        ).toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
            }
        );
    }

    function formatDate(
        value
    ) {
        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }

        return date.toLocaleString(
            "en-IN"
        );
    }

    // ========================================================
    // NOT ADMIN
    // ========================================================

    if (!isAdmin) {
        return null;
    }

    // ========================================================
    // UI
    // ========================================================

    return (
        <>
            {!open && (
                <button
                    type="button"
                    className="admin-return-floating-button"
                    onClick={() =>
                        setOpen(true)
                    }
                    title="Admin Returns"
                >
                    <RotateCcw
                        size={18}
                    />

                    <span>
                        Admin Returns
                    </span>
                </button>
            )}

            {open && (
                <div className="admin-return-overlay">
                    <div className="admin-return-modal">

                        {/* HEADER */}

                        <div className="admin-return-header">
                            <div>
                                <div className="admin-return-title">
                                    <RotateCcw
                                        size={23}
                                    />

                                    <h2>
                                        Return & Refund Management
                                    </h2>
                                </div>

                                <p>
                                    Manage customer
                                    return requests
                                    and refunds.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="admin-return-close"
                                onClick={() => {
                                    setOpen(
                                        false
                                    );
                                    setError(
                                        ""
                                    );
                                    setSuccess(
                                        ""
                                    );
                                }}
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>

                        {/* TOOLBAR */}

                        <div className="admin-return-toolbar">

                            <div>
                                <strong>
                                    {returns.length}
                                </strong>

                                <span>
                                    return requests
                                </span>
                            </div>

                            <button
                                type="button"
                                className="admin-refresh-button"
                                onClick={
                                    loadReturns
                                }
                                disabled={
                                    loading
                                }
                            >
                                <RefreshCw
                                    size={16}
                                />

                                Refresh
                            </button>

                        </div>

                        {/* MESSAGES */}

                        {error && (
                            <div className="admin-return-message admin-return-error">
                                <AlertCircle
                                    size={18}
                                />

                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="admin-return-message admin-return-success">
                                <CheckCircle
                                    size={18}
                                />

                                {success}
                            </div>
                        )}

                        {/* LIST */}

                        {loading ? (
                            <div className="admin-return-empty">
                                Loading return requests...
                            </div>
                        ) : returns.length ===
                          0 ? (
                            <div className="admin-return-empty">
                                <RotateCcw
                                    size={40}
                                />

                                <h3>
                                    No return requests
                                </h3>

                                <p>
                                    There are currently
                                    no customer return
                                    requests.
                                </p>
                            </div>
                        ) : (
                            <div className="admin-return-list">

                                {returns.map(
                                    (item) => (
                                        <div
                                            className="admin-return-card"
                                            key={
                                                item.id
                                            }
                                        >

                                            {/* CARD HEADER */}

                                            <div className="admin-return-card-header">

                                                <div>
                                                    <h3>
                                                        Return #
                                                        {
                                                            item.id
                                                        }
                                                    </h3>

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

                                            {/* PRODUCT */}

                                            <div className="admin-return-product">
                                                <div>
                                                    <small>
                                                        Product
                                                    </small>

                                                    <strong>
                                                        {
                                                            item.product_name
                                                        }
                                                    </strong>
                                                </div>

                                                <div>
                                                    <small>
                                                        Quantity
                                                    </small>

                                                    <strong>
                                                        {
                                                            item.quantity
                                                        }
                                                    </strong>
                                                </div>

                                                <div>
                                                    <small>
                                                        User
                                                    </small>

                                                    <strong>
                                                        User #
                                                        {
                                                            item.user_id
                                                        }
                                                    </strong>
                                                </div>
                                            </div>

                                            {/* DETAILS */}

                                            <div className="admin-return-details">

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
                                                        Refund Amount
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
                                                        {formatDate(
                                                            item.created_at
                                                        )}
                                                    </strong>
                                                </div>

                                            </div>

                                            {/* DESCRIPTION */}

                                            {item.description && (
                                                <div className="admin-return-description">
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

                                            {/* ACTIONS */}

                                            <div className="admin-return-actions">

                                                {item.status ===
                                                    "requested" && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="admin-approve-button"
                                                            onClick={() =>
                                                                approveReturn(
                                                                    item.id
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading
                                                            }
                                                        >
                                                            <CheckCircle
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Approve
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="admin-reject-button"
                                                            onClick={() =>
                                                                rejectReturn(
                                                                    item.id
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading
                                                            }
                                                        >
                                                            <X
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {item.status ===
                                                    "approved" && (
                                                    <button
                                                        type="button"
                                                        className="admin-refund-button"
                                                        onClick={() =>
                                                            refundReturn(
                                                                item.id
                                                            )
                                                        }
                                                        disabled={
                                                            actionLoading
                                                        }
                                                    >
                                                        <RotateCcw
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Process Refund
                                                    </button>
                                                )}

                                                {item.status ===
                                                    "refunded" && (
                                                    <div className="admin-completed-label">
                                                        <CheckCircle
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Refund
                                                        Completed
                                                    </div>
                                                )}

                                                {item.status ===
                                                    "rejected" && (
                                                    <div className="admin-rejected-label">
                                                        <AlertCircle
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Return
                                                        Rejected
                                                    </div>
                                                )}

                                                {item.status ===
                                                    "cancelled" && (
                                                    <div className="admin-rejected-label">
                                                        <AlertCircle
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Return
                                                        Cancelled
                                                    </div>
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
        </>
    );
}

export default AdminReturnManager;
