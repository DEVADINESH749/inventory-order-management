import React, { useEffect, useState } from "react";
import {
  Bell,
  Tag,
  Star,
  X,
  Check,
  ShieldCheck,
  Send,
  RefreshCw,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";

import {
  couponApi,
  reviewApi,
  notificationApi,
} from "../services/extraApi";

function getSession() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function FeatureButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`feature-tab ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NotificationsPanel({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin =
    session?.role === "admin" ||
    session?.role === "inventory_manager";

  const [form, setForm] = useState({
    user_id: "",
    notification_type: "order",
    title: "",
    message: "",
    reference_type: "",
    reference_id: "",
  });

  const load = async () => {
    if (!session?.id) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await notificationApi.getUser(session.id);
      setData(response.data);
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session?.id]);

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      await load();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead(session.id);
      await load();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    }
  };

  const sendNotification = async (event) => {
    event.preventDefault();

    try {
      await notificationApi.create({
        user_id: Number(form.user_id),
        notification_type: form.notification_type,
        title: form.title,
        message: form.message,
        reference_type: form.reference_type || null,
        reference_id: form.reference_id || null,
      });

      setForm({
        user_id: "",
        notification_type: "order",
        title: "",
        message: "",
        reference_type: "",
        reference_id: "",
      });

      setMessage("Notification sent successfully.");
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to send notification."
      );
    }
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <h3><Bell size={19} /> Notifications</h3>
          <p>
            {data?.unread_count ?? 0} unread of{" "}
            {data?.total_notifications ?? 0}
          </p>
        </div>

        <button
          type="button"
          className="feature-small-button"
          onClick={load}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {message && <div className="feature-message">{message}</div>}

      {data?.notifications?.length > 0 ? (
        <div className="feature-list">
          {data.notifications.map((item) => (
            <div
              key={item.id}
              className={`feature-card ${
                item.is_read ? "read" : "unread"
              }`}
            >
              <div className="feature-card-top">
                <strong>{item.title}</strong>
                {!item.is_read && (
                  <span className="feature-badge">NEW</span>
                )}
              </div>

              <div className="feature-card-meta">
                {item.notification_type} · {formatDate(item.created_at)}
              </div>

              <p>{item.message}</p>

              {!item.is_read && (
                <button
                  type="button"
                  className="feature-action"
                  onClick={() => markRead(item.id)}
                >
                  <Check size={15} /> Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="feature-empty">
          {loading ? "Loading..." : "No notifications found."}
        </div>
      )}

      {data?.unread_count > 0 && (
        <button
          type="button"
          className="feature-primary-button"
          onClick={markAllRead}
        >
          <Check size={16} /> Mark all as read
        </button>
      )}

      {isAdmin && (
        <form className="feature-form feature-admin-form" onSubmit={sendNotification}>
          <h4><Send size={17} /> Send notification</h4>

          <input
            type="number"
            min="1"
            placeholder="Target user ID"
            value={form.user_id}
            onChange={(e) =>
              setForm({ ...form, user_id: e.target.value })
            }
            required
          />

          <input
            placeholder="Notification type"
            value={form.notification_type}
            onChange={(e) =>
              setForm({ ...form, notification_type: e.target.value })
            }
            required
          />

          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            required
          />

          <textarea
            placeholder="Message"
            rows="3"
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
            required
          />

          <div className="feature-two-column">
            <input
              placeholder="Reference type"
              value={form.reference_type}
              onChange={(e) =>
                setForm({ ...form, reference_type: e.target.value })
              }
            />

            <input
              placeholder="Reference ID"
              value={form.reference_id}
              onChange={(e) =>
                setForm({ ...form, reference_id: e.target.value })
              }
            />
          </div>

          <button type="submit" className="feature-primary-button">
            <Send size={16} /> Send notification
          </button>
        </form>
      )}
    </div>
  );
}

function CouponPanel({ session }) {
  const isAdmin =
    session?.role === "admin" ||
    session?.role === "inventory_manager";

  const [coupons, setCoupons] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [applyForm, setApplyForm] = useState({
    code: "",
    order_amount: "",
  });

  const [applyResult, setApplyResult] = useState(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "fixed",
    discount_value: "",
    minimum_order_amount: "0",
    maximum_discount: "",
    usage_limit: "0",
    start_date: "",
    expiry_date: "",
    is_active: true,
  });

  const loadCoupons = async () => {
    if (!isAdmin) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await couponApi.getAll();
      setCoupons(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to load coupons."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [isAdmin]);

  const applyCoupon = async (event) => {
    event.preventDefault();
    setApplyResult(null);
    setMessage("");

    try {
      const response = await couponApi.apply(
        applyForm.code.trim(),
        Number(applyForm.order_amount)
      );

      setApplyResult(response.data);
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Coupon could not be applied."
      );
    }
  };

  const createCoupon = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await couponApi.create({
        code: form.code.trim(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        minimum_order_amount: Number(form.minimum_order_amount || 0),
        maximum_discount:
          form.maximum_discount === ""
            ? null
            : Number(form.maximum_discount),
        usage_limit: Number(form.usage_limit || 0),
        start_date: new Date(form.start_date).toISOString(),
        expiry_date: new Date(form.expiry_date).toISOString(),
        is_active: form.is_active,
      });

      setForm({
        code: "",
        description: "",
        discount_type: "fixed",
        discount_value: "",
        minimum_order_amount: "0",
        maximum_discount: "",
        usage_limit: "0",
        start_date: "",
        expiry_date: "",
        is_active: true,
      });

      setMessage("Coupon created successfully.");
      await loadCoupons();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to create coupon."
      );
    }
  };

  const toggleCoupon = async (coupon) => {
    try {
      if (coupon.is_active) {
        await couponApi.deactivate(coupon.id);
      } else {
        await couponApi.activate(coupon.id);
      }

      await loadCoupons();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to change coupon status."
      );
    }
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <h3><Tag size={19} /> Coupons</h3>
          <p>
            {isAdmin
              ? "Create and manage discount coupons."
              : "Apply a coupon to your order."}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="feature-small-button"
            onClick={loadCoupons}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {message && <div className="feature-message">{message}</div>}

      {!isAdmin && (
        <form className="feature-form" onSubmit={applyCoupon}>
          <input
            placeholder="Coupon code"
            value={applyForm.code}
            onChange={(e) =>
              setApplyForm({ ...applyForm, code: e.target.value })
            }
            required
          />

          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Order amount"
            value={applyForm.order_amount}
            onChange={(e) =>
              setApplyForm({
                ...applyForm,
                order_amount: e.target.value,
              })
            }
            required
          />

          <button type="submit" className="feature-primary-button">
            <Tag size={16} /> Apply coupon
          </button>
        </form>
      )}

      {applyResult && (
        <div className="coupon-result">
          <strong>{applyResult.message}</strong>
          <span>Code: {applyResult.code}</span>
          <span>Order: ₹{Number(applyResult.order_amount).toFixed(2)}</span>
          <span>
            Discount: ₹{Number(applyResult.discount_amount).toFixed(2)}
          </span>
          <span>
            Final: ₹{Number(applyResult.final_amount).toFixed(2)}
          </span>
        </div>
      )}

      {isAdmin && (
        <>
          <form className="feature-form" onSubmit={createCoupon}>
            <h4><Plus size={17} /> Create coupon</h4>

            <div className="feature-two-column">
              <input
                placeholder="Code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                required
              />

              <select
                value={form.discount_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount_type: e.target.value,
                  })
                }
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />

            <div className="feature-two-column">
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Discount value"
                value={form.discount_value}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount_value: e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Minimum order"
                value={form.minimum_order_amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minimum_order_amount: e.target.value,
                  })
                }
              />
            </div>

            <div className="feature-two-column">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Maximum discount"
                value={form.maximum_discount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maximum_discount: e.target.value,
                  })
                }
              />

              <input
                type="number"
                min="0"
                placeholder="Usage limit"
                value={form.usage_limit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usage_limit: e.target.value,
                  })
                }
              />
            </div>

            <div className="feature-two-column">
              <label className="feature-field-label">
                Start date
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      start_date: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <label className="feature-field-label">
                Expiry date
                <input
                  type="datetime-local"
                  value={form.expiry_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiry_date: e.target.value,
                    })
                  }
                  required
                />
              </label>
            </div>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.checked,
                  })
                }
              />
              Active immediately
            </label>

            <button type="submit" className="feature-primary-button">
              <Plus size={16} /> Create coupon
            </button>
          </form>

          <div className="feature-list">
            {coupons.map((coupon) => (
              <div className="feature-card" key={coupon.id}>
                <div className="feature-card-top">
                  <strong>{coupon.code}</strong>
                  <span
                    className={`feature-status ${
                      coupon.is_active ? "success" : "off"
                    }`}
                  >
                    {coupon.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <p>{coupon.description}</p>

                <div className="feature-card-meta">
                  {coupon.discount_type} · {coupon.discount_value} · Min ₹
                  {coupon.minimum_order_amount}
                </div>

                <div className="feature-card-meta">
                  Used {coupon.used_count} / {coupon.usage_limit || "∞"}
                </div>

                <button
                  type="button"
                  className="feature-action"
                  onClick={() => toggleCoupon(coupon)}
                >
                  {coupon.is_active ? (
                    <>
                      <PowerOff size={15} /> Deactivate
                    </>
                  ) : (
                    <>
                      <Power size={15} /> Activate
                    </>
                  )}
                </button>
              </div>
            ))}

            {!loading && coupons.length === 0 && (
              <div className="feature-empty">
                No coupons found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewsPanel({ session }) {
  const isAdmin =
    session?.role === "admin" ||
    session?.role === "inventory_manager";

  const [productId, setProductId] = useState("");
  const [productData, setProductData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");

  const [reviewForm, setReviewForm] = useState({
    rating: "5",
    title: "",
    comment: "",
  });

  const [allReviews, setAllReviews] = useState([]);

  const loadProductReviews = async () => {
    if (!productId) {
      setMessage("Enter a product ID.");
      return;
    }

    try {
      const response = await reviewApi.getProduct(Number(productId));
      setProductData(response.data);
      setReviews(response.data?.reviews || []);
      setMessage("");
    } catch (error) {
      setProductData(null);
      setReviews([]);
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to load product reviews."
      );
    }
  };

  const createReview = async (event) => {
    event.preventDefault();

    try {
      await reviewApi.create({
        user_id: Number(session.id),
        user_name: session.name || session.email || "Customer",
        product_id: Number(productId),
        rating: Number(reviewForm.rating),
        title: reviewForm.title,
        comment: reviewForm.comment,
        verified_purchase: false,
      });

      setReviewForm({
        rating: "5",
        title: "",
        comment: "",
      });

      setMessage("Review submitted successfully.");
      await loadProductReviews();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to submit review."
      );
    }
  };

  const loadAllReviews = async () => {
    try {
      const response = await reviewApi.getAll();
      setAllReviews(Array.isArray(response.data) ? response.data : []);
      setMessage("");
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to load all reviews."
      );
    }
  };

  const moderate = async (id, approved) => {
    try {
      await reviewApi.moderate(id, approved);
      await loadAllReviews();
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          error?.message ||
          "Unable to moderate review."
      );
    }
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <h3><Star size={19} /> Reviews</h3>
          <p>
            {isAdmin
              ? "Review moderation."
              : "View and submit product ratings."}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="feature-small-button"
            onClick={loadAllReviews}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {message && <div className="feature-message">{message}</div>}

      {!isAdmin ? (
        <>
          <div className="feature-form">
            <input
              type="number"
              min="1"
              placeholder="Product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />

            <button
              type="button"
              className="feature-primary-button"
              onClick={loadProductReviews}
            >
              <Star size={16} /> Load reviews
            </button>
          </div>

          {productData && (
            <div className="review-summary">
              <strong>
                Average rating:{" "}
                {Number(productData.average_rating || 0).toFixed(2)} / 5
              </strong>

              <span>
                Total reviews: {productData.total_reviews || 0}
              </span>
            </div>
          )}

          <div className="feature-list">
            {reviews.map((review) => (
              <div className="feature-card" key={review.id}>
                <div className="feature-card-top">
                  <strong>
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </strong>

                  {review.verified_purchase && (
                    <span className="feature-badge">
                      VERIFIED
                    </span>
                  )}
                </div>

                <strong>{review.title}</strong>
                <p>{review.comment}</p>

                <div className="feature-card-meta">
                  {review.user_name} · {formatDate(review.created_at)}
                </div>
              </div>
            ))}
          </div>

          {productId && (
            <form className="feature-form" onSubmit={createReview}>
              <h4><Plus size={17} /> Write a review</h4>

              <select
                value={reviewForm.rating}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    rating: e.target.value,
                  })
                }
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very poor</option>
              </select>

              <input
                placeholder="Review title"
                value={reviewForm.title}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    title: e.target.value,
                  })
                }
                required
              />

              <textarea
                rows="4"
                placeholder="Write your review"
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    comment: e.target.value,
                  })
                }
                required
              />

              <button type="submit" className="feature-primary-button">
                <Star size={16} /> Submit review
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="feature-primary-button"
            onClick={loadAllReviews}
          >
            <RefreshCw size={16} /> Load all reviews
          </button>

          <div className="feature-list">
            {allReviews.map((review) => (
              <div className="feature-card" key={review.id}>
                <div className="feature-card-top">
                  <strong>
                    {review.user_name} · Product {review.product_id}
                  </strong>

                  <span
                    className={`feature-status ${
                      review.is_approved ? "success" : "off"
                    }`}
                  >
                    {review.is_approved ? "APPROVED" : "PENDING"}
                  </span>
                </div>

                <strong>{review.title}</strong>

                <div className="feature-card-meta">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>

                <p>{review.comment}</p>

                <div className="feature-actions-row">
                  <button
                    type="button"
                    className="feature-action success-button"
                    onClick={() => moderate(review.id, true)}
                  >
                    <Check size={15} /> Approve
                  </button>

                  <button
                    type="button"
                    className="feature-action danger-button"
                    onClick={() => moderate(review.id, false)}
                  >
                    <X size={15} /> Reject
                  </button>
                </div>
              </div>
            ))}

            {allReviews.length === 0 && (
              <div className="feature-empty">
                No reviews loaded.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function FeatureLauncher() {
  const [session, setSession] = useState(getSession());
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("notifications");

  useEffect(() => {
    const refreshSession = () => {
      setSession(getSession());
    };

    window.addEventListener("storage", refreshSession);
    window.addEventListener("focus", refreshSession);

    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener("focus", refreshSession);
    };
  }, []);

  if (!session) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="feature-launcher-button"
        onClick={() => setOpen(true)}
        title="Open project features"
      >
        <ShieldCheck size={21} />
        <span>Features</span>
      </button>

      {open && (
        <div className="feature-overlay">
          <div className="feature-modal">
            <div className="feature-modal-header">
              <div>
                <h2>Inventory & Order Features</h2>
                <p>
                  Signed in as{" "}
                  <strong>
                    {session.name || session.email}
                  </strong>
                  {" · "}
                  {session.role}
                </p>
              </div>

              <button
                type="button"
                className="feature-close"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="feature-tabs">
              <FeatureButton
                active={tab === "notifications"}
                onClick={() => setTab("notifications")}
              >
                <Bell size={16} /> Notifications
              </FeatureButton>

              <FeatureButton
                active={tab === "coupons"}
                onClick={() => setTab("coupons")}
              >
                <Tag size={16} /> Coupons
              </FeatureButton>

              <FeatureButton
                active={tab === "reviews"}
                onClick={() => setTab("reviews")}
              >
                <Star size={16} /> Reviews
              </FeatureButton>
            </div>

            <div className="feature-content">
              {tab === "notifications" && (
                <NotificationsPanel session={session} />
              )}

              {tab === "coupons" && (
                <CouponPanel session={session} />
              )}

              {tab === "reviews" && (
                <ReviewsPanel session={session} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
