import React, { useEffect, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  FileText,
  ShoppingCart,
  IndianRupee,
  Package,
  Users,
  RotateCcw,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { analyticsApi } from "../services/extraApi";

export default function AnalyticsPanel() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await analyticsApi.getDashboard();
      setData(response.data);
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
        error?.message ||
        "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openPdf = () => {
    window.open(
      "http://127.0.0.1:8000/api/analytics/report.pdf",
      "_blank"
    );
  };

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const cards = data
    ? [
        ["Total Orders", data.total_orders, ShoppingCart],
        ["Revenue", money(data.total_revenue), IndianRupee],
        ["Products", data.total_products, Package],
        ["Users", data.total_users, Users],
        ["Returns", data.total_returns, RotateCcw],
        ["Refunds", money(data.total_refunds), IndianRupee],
        ["Successful Payments", data.successful_payments, CreditCard],
        ["Failed Payments", data.failed_payments, XCircle],
      ]
    : [];

  return (
    <div className="feature-panel">

      <div className="feature-panel-header">
        <div>
          <h3>
            <BarChart3 size={19} /> Analytics & Reporting
          </h3>
          <p>Live data from Analytics Service.</p>
        </div>

        <div className="feature-actions-row">

          <button
            type="button"
            className="feature-small-button"
            onClick={loadDashboard}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            className="feature-action"
            onClick={openPdf}
          >
            <FileText size={16} />
            PDF Report
          </button>

        </div>
      </div>

      {message && (
        <div className="feature-message">
          {message}
        </div>
      )}

      {loading && !data && (
        <div className="feature-empty">
          Loading analytics...
        </div>
      )}

      {data && (
        <>

          <div className="analytics-grid">
            {cards.map(([label, value, Icon]) => (
              <div
                className="analytics-card"
                key={label}
              >
                <div className="analytics-card-icon">
                  <Icon size={18} />
                </div>

                <div>
                  <div className="analytics-card-value">
                    {value}
                  </div>

                  <div className="analytics-card-label">
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>


          <div className="feature-form">
            <h4>
              <ShoppingCart size={17} />
              Order Status
            </h4>

            <div className="analytics-status-grid">

              <div className="analytics-status-card">
                <Clock size={16} />
                <span>Pending</span>
                <strong>{data.pending_orders}</strong>
              </div>

              <div className="analytics-status-card">
                <CheckCircle size={16} />
                <span>Confirmed</span>
                <strong>{data.confirmed_orders}</strong>
              </div>

              <div className="analytics-status-card">
                <Package size={16} />
                <span>Processing</span>
                <strong>{data.processing_orders}</strong>
              </div>

              <div className="analytics-status-card">
                <Truck size={16} />
                <span>Shipped</span>
                <strong>{data.shipped_orders}</strong>
              </div>

              <div className="analytics-status-card">
                <CheckCircle size={16} />
                <span>Delivered</span>
                <strong>{data.delivered_orders}</strong>
              </div>

              <div className="analytics-status-card">
                <XCircle size={16} />
                <span>Cancelled</span>
                <strong>{data.cancelled_orders}</strong>
              </div>

            </div>
          </div>


          <div className="feature-form">
            <h4>
              <CreditCard size={17} />
              Payment Status
            </h4>

            <div className="analytics-status-grid">

              <div className="analytics-status-card">
                <CheckCircle size={16} />
                <span>Successful</span>
                <strong>{data.successful_payments}</strong>
              </div>

              <div className="analytics-status-card">
                <XCircle size={16} />
                <span>Failed</span>
                <strong>{data.failed_payments}</strong>
              </div>

              <div className="analytics-status-card">
                <Clock size={16} />
                <span>Pending</span>
                <strong>{data.pending_payments}</strong>
              </div>

            </div>
          </div>


          <div className="analytics-report-footer">
            <div>
              <strong>Analytics PDF</strong>
              <p>
                Generate the latest ReportLab analytics report.
              </p>
            </div>

            <button
              type="button"
              className="feature-primary-button"
              onClick={openPdf}
            >
              <FileText size={16} />
              Open PDF Report
            </button>
          </div>

        </>
      )}

    </div>
  );
}
