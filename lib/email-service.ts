import { Resend } from 'resend';
import {
  generateBookingConfirmationEmail,
  generateCancellationEmail,
  generatePasswordResetEmail,
  generateEmailVerificationEmail,
  generateAdminAlertEmail,
  type BookingConfirmationData,
  type CancellationData,
  type PasswordResetData,
  type EmailVerificationData,
  type AdminAlertData,
} from './email-templates';

// Initialize Resend (or your preferred email service)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Fallback for development (logs to console)
const isDevelopment = process.env.NODE_ENV === 'development';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using Resend or fallback to console logging
 */
async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (resend && !isDevelopment) {
      // Send using Resend
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@busbooking.com',
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true };
    } else {
      // Development fallback - log to console
      console.log('📧 [DEV MODE] Email would be sent:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(html);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return { success: true };
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  to: string,
  data: BookingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  const email = generateBookingConfirmationEmail(data);
  return sendEmail({ ...email, to });
}

/**
 * Send cancellation email
 */
export async function sendCancellationEmail(
  to: string,
  data: CancellationData
): Promise<{ success: boolean; error?: string }> {
  const email = generateCancellationEmail(data);
  return sendEmail({ ...email, to });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  data: PasswordResetData
): Promise<{ success: boolean; error?: string }> {
  const email = generatePasswordResetEmail(data);
  return sendEmail({ ...email, to });
}

/**
 * Send email verification email
 */
export async function sendEmailVerificationEmail(
  to: string,
  data: EmailVerificationData
): Promise<{ success: boolean; error?: string }> {
  const email = generateEmailVerificationEmail(data);
  return sendEmail({ ...email, to });
}

/**
 * Send admin alert email (low inventory, etc.)
 */
export async function sendAdminAlertEmail(
  subject: string,
  message: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@busbooking.com';

  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admin Alert</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${priorityColors[priority]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
        .timestamp { color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; font-size: 18px;">⚠️ Admin Alert [${priority.toUpperCase()}]</h2>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin: 0;">${message}</p>
          <p class="timestamp" style="margin: 20px 0 0 0;">
            Time: ${new Date().toISOString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `[${priority.toUpperCase()}] ${subject}`,
    html,
  });
}

/**
 * Send waitlist availability notification email
 */
export async function sendWaitlistNotificationEmail(
  to: string,
  data: { userName: string; from: string; to: string; travelDate: string; departureTime: string; seatsAvailable: number; busId: string }
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">Seats Available — Book Now!</h2>
      <p>Hi ${data.userName},</p>
      <p>Good news! Seats on a bus you were waiting for are now available.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px;color:#64748b">Route</td><td style="padding:6px;font-weight:600">${data.from} → ${data.to}</td></tr>
        <tr><td style="padding:6px;color:#64748b">Date</td><td style="padding:6px;font-weight:600">${data.travelDate}</td></tr>
        <tr><td style="padding:6px;color:#64748b">Departure</td><td style="padding:6px;font-weight:600">${data.departureTime}</td></tr>
        <tr><td style="padding:6px;color:#64748b">Available seats</td><td style="padding:6px;font-weight:600">${data.seatsAvailable}</td></tr>
      </table>
      <p>Act fast — seats may fill up quickly!</p>
      <a href="${baseUrl}/book/${data.busId}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Book your seat</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">This notification expires in 24 hours.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Seats available: ${data.from} → ${data.to} on ${data.travelDate}`, html });
}

/**
 * Send structured admin alert email with detailed alert information
 */
export async function sendDetailedAdminAlertEmail(
  to: string,
  data: AdminAlertData
): Promise<{ success: boolean; error?: string }> {
  const email = generateAdminAlertEmail(data);
  return sendEmail({ ...email, to });
}
