import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async ({ to, subject, html, text }: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email skipped - no config] To: ${to}, Subject: ${subject}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"LandIQ" <${process.env.EMAIL_USER}>`,
    to, subject, html, text,
  });
};

export const welcomeEmail = (name: string) => `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0f1117; color: #fff; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: #161b27; border-radius: 16px; padding: 40px; border: 1px solid #1e2736;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="background: #16a34a; width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">🧠</span>
      </div>
      <h1 style="color: #22c55e; font-size: 28px; margin: 0;">Welcome to LandIQ!</h1>
    </div>
    <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
    <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
      Your account is ready. You have <strong style="color: #22c55e;">10 free AI analyses</strong> to get started.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.FRONTEND_URL}/ai/analyze" 
         style="background: #16a34a; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Run Your First Analysis →
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">The LandIQ Team 🇧🇩</p>
  </div>
</body>
</html>
`;

export const inquiryEmail = (inquiry: any, land: any) => `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0f1117; color: #fff; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: #161b27; border-radius: 16px; padding: 40px; border: 1px solid #1e2736;">
    <h2 style="color: #22c55e;">New Property Inquiry</h2>
    <p style="color: #d1d5db;"><strong>Property:</strong> ${land?.title}</p>
    <p style="color: #d1d5db;"><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p>
    <p style="color: #d1d5db;"><strong>Phone:</strong> ${inquiry.phone || 'Not provided'}</p>
    <p style="color: #d1d5db;"><strong>Type:</strong> ${inquiry.type}</p>
    <p style="color: #d1d5db;"><strong>Budget:</strong> ${inquiry.budget ? '৳' + inquiry.budget.toLocaleString() : 'Not specified'}</p>
    <div style="background: #0f1117; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <p style="color: #d1d5db; margin: 0;">${inquiry.message}</p>
    </div>
  </div>
</body>
</html>
`;
