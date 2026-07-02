import { ReactNode } from "react";

export type EmailTemplate = "booking-confirmation" | "booking-cancelled" | "password-reset" | "email-verification" | "admin-alert";

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export interface BookingConfirmationData {
  customerName: string;
  bookingId: string;
  route: string;
  busType: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  seats: string[];
  passengers: { name: string; age: string; gender: string }[];
  totalPrice: number;
  discountAmount?: number;
  finalPrice: number;
}

export interface CancellationData {
  customerName: string;
  bookingId: string;
  route: string;
  date: string;
  cancellationReason: string;
  refundAmount?: number;
  refundStatus?: string;
}

export interface PasswordResetData {
  customerName: string;
  resetLink: string;
  expiryHours: number;
}

export interface EmailVerificationData {
  customerName: string;
  verificationLink: string;
  expiryHours: number;
}

export interface AdminAlertData {
  alertType: "critical" | "high" | "summary";
  alertCount: number;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    data: any;
    timestamp: Date;
  }>;
  adminName: string;
}

// Email Templates
export function generateBookingConfirmationEmail(data: BookingConfirmationData): EmailData {
  const {
    customerName,
    bookingId,
    route,
    busType,
    date,
    departureTime,
    arrivalTime,
    seats,
    passengers,
    totalPrice,
    discountAmount,
    finalPrice,
  } = data;

  return {
    to: "", // Will be set by the caller
    subject: `Booking Confirmed: ${route} - ${date}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #666; }
          .value { color: #333; font-weight: 500; }
          .seats-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
          .seat-badge { background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px; }
          .price-summary { background: #f0f9ff; padding: 20px; border-radius: 8px; border: 1px solid #bae6fd; }
          .total-price { font-size: 24px; font-weight: bold; color: #0891b2; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Booking Confirmed!</h1>
            <p>Hi ${customerName}, your booking has been successfully confirmed.</p>
          </div>

          <div class="content">
            <div class="booking-details">
              <h2 style="margin-top: 0; color: #667eea;">📝 Booking Details</h2>

              <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span class="value">#${bookingId.slice(-6).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="label">Route:</span>
                <span class="value">${route}</span>
              </div>
              <div class="detail-row">
                <span class="label">Bus Type:</span>
                <span class="value">${busType}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${departureTime} - ${arrivalTime}</span>
              </div>

              <div style="margin-top: 20px;">
                <span class="label">Selected Seats:</span>
                <div class="seats-list">
                  ${seats.map(seat => `<span class="seat-badge">${seat}</span>`).join('')}
                </div>
              </div>
            </div>

            <div class="booking-details">
              <h2 style="margin-top: 0; color: #667eea;">👤 Passengers</h2>
              ${passengers.map((p, i) => `
                <div class="detail-row">
                  <span class="label">Passenger ${i + 1}:</span>
                  <span class="value">${p.name} (${p.age} yrs, ${p.gender})</span>
                </div>
              `).join('')}
            </div>

            <div class="price-summary">
              <h2 style="margin-top: 0; color: #0891b2;">💰 Payment Summary</h2>
              ${discountAmount ? `
                <div class="detail-row">
                  <span class="label">Original Amount:</span>
                  <span class="value" style="text-decoration: line-through;">$${totalPrice.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Discount:</span>
                  <span class="value" style="color: #059669;">-$${discountAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="detail-row" style="margin-top: 15px;">
                <span class="label">Final Amount Paid:</span>
                <span class="value total-price">$${finalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/confirmation/${bookingId}" class="button">
                View Full Booking Details
              </a>
            </div>

            <div class="footer">
              <p><strong>Important:</strong> Please arrive at the boarding point 30 minutes before departure.</p>
              <p>Carry this e-ticket along with a valid ID proof.</p>
              <p style="margin-top: 20px;">For support, reply to this email or contact us at support@busbooking.com</p>
              <p style="margin-top: 10px; color: #999;">© ${new Date().getFullYear()} Bus Booking System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function generateCancellationEmail(data: CancellationData): EmailData {
  const {
    customerName,
    bookingId,
    route,
    date,
    cancellationReason,
    refundAmount,
    refundStatus,
  } = data;

  return {
    to: "",
    subject: `Booking Cancelled: ${route} - ${date}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fecaca 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #666; }
          .value { color: #333; font-weight: 500; }
          .refund-info { background: #dcfce7; padding: 20px; border-radius: 8px; border: 1px solid #86efac; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Booking Cancelled</h1>
            <p>Hi ${customerName}, your booking has been cancelled.</p>
          </div>

          <div class="content">
            <div class="info-box">
              <h2 style="margin-top: 0; color: #dc2626;">Cancellation Details</h2>

              <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span class="value">#${bookingId.slice(-6).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="label">Route:</span>
                <span class="value">${route}</span>
              </div>
              <div class="detail-row">
                <span class="label">Travel Date:</span>
                <span class="value">${date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Reason:</span>
                <span class="value">${cancellationReason || "Not specified"}</span>
              </div>
            </div>

            ${refundAmount ? `
              <div class="refund-info">
                <h3 style="margin-top: 0; color: #16a34a;">💰 Refund Information</h3>
                <p style="font-size: 18px; font-weight: bold; color: #16a34a;">
                  Refund Amount: $${refundAmount.toFixed(2)}
                </p>
                <p style="color: #166534;">Status: ${refundStatus === "processed" ? "Processed" : "Pending"}</p>
                <p style="font-size: 14px; color: #15803d; margin-top: 10px;">
                  ${refundStatus === "processed"
                    ? "The refund has been processed to your original payment method."
                    : "Your refund is being processed and will appear in your account within 5-7 business days."}
                </p>
              </div>
            ` : `
              <div class="info-box" style="border-left-color: #f59e0b; background: #fef3c7;">
                <p style="color: #92400e;">No refund is applicable for this cancellation based on our cancellation policy.</p>
              </div>
            `}

            <div class="footer">
              <p style="margin-top: 20px;">Need to rebook? <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #667eea; text-decoration: none;">Browse our buses</a></p>
              <p style="margin-top: 10px;">For support, reply to this email or contact us at support@busbooking.com</p>
              <p style="margin-top: 10px; color: #999;">© ${new Date().getFullYear()} Bus Booking System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function generatePasswordResetEmail(data: PasswordResetData): EmailData {
  const { customerName, resetLink, expiryHours } = data;

  return {
    to: "",
    subject: "Reset Your Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>Hi ${customerName}, we received a request to reset your password.</p>
          </div>

          <div class="content">
            <div class="info-box">
              <p>You're receiving this email because a password reset was requested for your account.</p>
              <p style="margin-top: 15px;">Click the button below to reset your password:</p>

              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>

              <p style="font-size: 14px; color: #dc2626; text-align: center; margin-top: 15px;">
                <strong>⚠️ This link will expire in ${expiryHours} hours</strong>
              </p>

              <p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
                Or copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #3b82f6;">${resetLink}</span>
              </p>
            </div>

            <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <p style="color: #92400e; font-size: 14px;">
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact support immediately.
              </p>
            </div>

            <div class="footer">
              <p>For security, this link can only be used once.</p>
              <p style="margin-top: 10px;">For support, reply to this email or contact us at support@busbooking.com</p>
              <p style="margin-top: 10px; color: #999;">© ${new Date().getFullYear()} Bus Booking System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function generateEmailVerificationEmail(data: EmailVerificationData): EmailData {
  const { customerName, verificationLink, expiryHours } = data;

  return {
    to: "",
    subject: "Verify Your Email Address",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Email</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #34d399 0%, #10b981 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
            <p>Hi ${customerName}, thanks for signing up!</p>
          </div>

          <div class="content">
            <div class="info-box">
              <p>Welcome to Bus Booking System! To complete your registration, please verify your email address.</p>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>

              <p style="font-size: 14px; color: #dc2626; text-align: center; margin-top: 15px;">
                <strong>⏰ This link will expire in ${expiryHours} hours</strong>
              </p>

              <p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
                Or copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #10b981;">${verificationLink}</span>
              </p>
            </div>

            <div class="info-box" style="background: #dbeafe; border-left-color: #3b82f6;">
              <p style="color: #1e40af; font-size: 14px;">
                <strong>ℹ️ Why verify?</strong> Email verification helps us protect your account and ensure you receive important booking updates.
              </p>
            </div>

            <div class="footer">
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p style="margin-top: 10px;">For support, contact us at support@busbooking.com</p>
              <p style="margin-top: 10px; color: #999;">© ${new Date().getFullYear()} Bus Booking System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function generateAdminAlertEmail(data: AdminAlertData): EmailData {
  const { alertType, alertCount, alerts, adminName } = data;

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "#dc2626"; // red
      case "high":
        return "#ea580c"; // orange
      case "medium":
        return "#ca8a04"; // yellow
      case "low":
        return "#16a34a"; // green
      default:
        return "#6b7280"; // gray
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "low_inventory":
        return "📊";
      case "overbooking":
        return "⚠️";
      case "cancellation_spike":
        return "📉";
      case "revenue_drop":
        return "💸";
      case "high_demand":
        return "🔥";
      default:
        return "🔔";
    }
  };

  return {
    to: "",
    subject: `Admin Alert: ${alertType === "critical" ? "🚨 CRITICAL" : "⚠️"} - ${alertCount} Alert${alertCount > 1 ? "s" : ""}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Alert</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${alertType === "critical" ? "#dc2626" : "#f97316"} 0%, ${alertType === "critical" ? "#b91c1c" : "#ea580c"} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
          .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6b7280; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .alert-box.critical { border-left-color: #dc2626; background: #fef2f2; }
          .alert-box.high { border-left-color: #ea580c; background: #fff7ed; }
          .alert-box.medium { border-left-color: #ca8a04; background: #fefce8; }
          .alert-box.low { border-left-color: #16a34a; background: #f0fdf4; }
          .alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
          .alert-type { font-weight: 700; text-transform: uppercase; font-size: 12px; padding: 4px 12px; border-radius: 12px; color: white; }
          .alert-message { font-size: 15px; color: #1f2937; margin: 10px 0; }
          .alert-data { background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 10px; font-size: 13px; }
          .alert-data-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
          .alert-data-item:last-child { border-bottom: none; }
          .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .summary-item { text-align: center; padding: 15px; background: #f9fafb; border-radius: 6px; }
          .summary-number { font-size: 28px; font-weight: bold; margin: 5px 0; }
          .summary-number.critical { color: #dc2626; }
          .summary-number.high { color: #ea580c; }
          .summary-number.medium { color: #ca8a04; }
          .summary-number.low { color: #16a34a; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alertType === "critical" ? "🚨 Critical" : "⚠️"} Admin Alert</h1>
            <p>Hi ${adminName}, you have ${alertCount} alert${alertCount > 1 ? "s" : ""} that require${alertCount === 1 ? "s" : ""} your attention.</p>
          </div>

          <div class="content">
            ${alertType === "summary" ? `
              <div class="summary">
                <h2 style="margin-top: 0; color: #374151;">📊 Alert Summary</h2>
                <div class="summary-grid">
                  <div class="summary-item">
                    <div style="font-size: 14px; color: #6b7280;">Critical</div>
                    <div class="summary-number critical">${alerts.filter(a => a.severity === "critical").length}</div>
                  </div>
                  <div class="summary-item">
                    <div style="font-size: 14px; color: #6b7280;">High</div>
                    <div class="summary-number high">${alerts.filter(a => a.severity === "high").length}</div>
                  </div>
                  <div class="summary-item">
                    <div style="font-size: 14px; color: #6b7280;">Medium</div>
                    <div class="summary-number medium">${alerts.filter(a => a.severity === "medium").length}</div>
                  </div>
                  <div class="summary-item">
                    <div style="font-size: 14px; color: #6b7280;">Low</div>
                    <div class="summary-number low">${alerts.filter(a => a.severity === "low").length}</div>
                  </div>
                </div>
              </div>
            ` : ''}

            <h2 style="color: #374151;">Alert Details</h2>

            ${alerts.map(alert => `
              <div class="alert-box ${alert.severity}">
                <div class="alert-header">
                  <span style="font-size: 24px;">${getAlertIcon(alert.type)}</span>
                  <span class="alert-type" style="background: ${getAlertColor(alert.severity)};">${alert.severity.toUpperCase()}</span>
                  <span style="color: #6b7280; font-size: 13px; margin-left: auto;">${new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <div class="alert-message">${alert.message}</div>
                ${alert.data && Object.keys(alert.data).length > 0 ? `
                  <div class="alert-data">
                    ${Object.entries(alert.data).map(([key, value]) => `
                      <div class="alert-data-item">
                        <span style="color: #6b7280; font-weight: 500;">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                        <span style="color: #1f2937; font-weight: 600;">${value}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" class="button">View in Admin Dashboard</a>
            </div>

            <div class="footer">
              <p style="margin-top: 20px;">This is an automated alert from the Bus Booking System.</p>
              <p style="margin-top: 10px;">For technical support, contact dev@busbooking.com</p>
              <p style="margin-top: 10px; color: #999;">© ${new Date().getFullYear()} Bus Booking System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
