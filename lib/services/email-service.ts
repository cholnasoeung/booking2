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
 * Send waitlist seat-available notification email
 */
export async function sendWaitlistNotificationEmail(
  to: string,
  data: { userName: string; route: string; date: string; seatsAvailable: number; busId: string }
): Promise<{ success: boolean; error?: string }> {
  const bookUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/book/${data.busId}`;
  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:20px;}
    .card{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
    .header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;color:#fff;}
    .body{padding:28px 32px;} .btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:40px;font-weight:700;font-size:15px;margin-top:20px;}
    .footer{padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;}</style>
    </head><body><div class="card">
    <div class="header"><h2 style="margin:0;font-size:22px;">🎉 A seat just opened up!</h2>
    <p style="margin:8px 0 0;opacity:.85;">Your waitlist spot is available</p></div>
    <div class="body">
    <p style="color:#374151;font-size:16px;">Hi <strong>${data.userName}</strong>,</p>
    <p style="color:#6b7280;">Great news — <strong>${data.seatsAvailable} seat${data.seatsAvailable > 1 ? 's' : ''}</strong> just became available on your waitlisted journey:</p>
    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#4f46e5;">${data.route}</p>
      <p style="margin:6px 0 0;color:#7c3aed;font-size:14px;">📅 ${data.date}</p>
    </div>
    <p style="color:#6b7280;font-size:14px;">⏰ <strong>Act fast</strong> — this notification expires in 24 hours and will be offered to the next person on the list.</p>
    <a href="${bookUrl}" class="btn">Book Now →</a>
    </div>
    <div class="footer">You are receiving this because you joined the waitlist for this trip. <a href="${process.env.NEXTAUTH_URL ?? ''}/dashboard" style="color:#6366f1;">Manage your waitlist</a></div>
    </div></body></html>
  `;
  return sendEmail({ to, subject: `Seat Available: ${data.route} on ${data.date}`, html });
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
