// services/email.service.ts

import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface JobCompletionEmailData {
  userEmail: string;
  userName: string;
  partName: string;
  jobId: string;
  completedAt: Date;
  material: string;
  color: string;
  quantity: number;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    // For production, use environment variables
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'your-email@purdue.edu',
        pass: process.env.SMTP_PASS || 'your-password',
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendJobCompletionEmail(data: JobCompletionEmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"BML Print Queue" <${process.env.SMTP_USER || 'noreply@purdue.edu'}>`,
        to: data.userEmail,
        subject: `Your 3D Print Job is Complete - ${data.partName}`,
        html: this.generateCompletionEmailHTML(data),
        text: this.generateCompletionEmailText(data),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendJobCancelledEmail(data: JobCompletionEmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"BML Print Queue" <${process.env.SMTP_USER || 'noreply@purdue.edu'}>`,
        to: data.userEmail,
        subject: `Your 3D Print Job was Cancelled - ${data.partName}`,
        html: this.generateCancelledEmailHTML(data),
        text: this.generateCancelledEmailText(data),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Cancellation email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending cancellation email:', error);
      return false;
    }
  }

  private generateCompletionEmailHTML(data: JobCompletionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #000000;
            color: #CFB991;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-left: 4px solid #CFB991;
            margin: 20px 0;
          }
          .info-row {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #000;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #CFB991;
            color: #000;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Your 3D Print is Ready!</h1>
        </div>
        <div class="content">
          <p>Hello ${data.userName},</p>
          <p>Great news! Your 3D print job has been completed and is ready for pickup at the Mailroom. Don’t know where the Mailroom is? The Mailroom is in same hallway as the elevator, just keep going straight until you see a room with double doors on right!</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #CFB991;">Job Details</h3>
            <div class="info-row">
              <span class="label">Part Name:</span> ${data.partName}
            </div>
            <div class="info-row">
              <span class="label">Job ID:</span> ${data.jobId}
            </div>
            <div class="info-row">
              <span class="label">Material:</span> ${data.material}
            </div>
            <div class="info-row">
              <span class="label">Color:</span> ${data.color}
            </div>
            <div class="info-row">
              <span class="label">Quantity:</span> ${data.quantity}
            </div>
            <div class="info-row">
              <span class="label">Completed:</span> ${data.completedAt.toLocaleString()}
            </div>
          </div>
          <p>Thank you for using Boilermaker Labs!</p>
        </div>
        <div class="footer">
          <p>Boilermaker Labs - Purdue University</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateCompletionEmailText(data: JobCompletionEmailData): string {
    return `
Your 3D Print is Ready!

Hello ${data.userName},

Great news! Your 3D print job has been completed and is ready for pickup at the Mailroom.

Job Details:
- Part Name: ${data.partName}
- Job ID: ${data.jobId}
- Material: ${data.material}
- Color: ${data.color}
- Quantity: ${data.quantity}
- Completed: ${data.completedAt.toLocaleString()}

Thank you for using Boilermaker Labs!

---
Boilermaker Labs - Purdue University
This is an automated message. Please do not reply to this email.
    `;
  }

  private generateCancelledEmailHTML(data: JobCompletionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #000000;
            color: #ec7063;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-left: 4px solid #ec7063;
            margin: 20px 0;
          }
          .info-row {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #000;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Print Job Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello ${data.userName},</p>
          <p>This is to inform you that your 3D print job has been cancelled.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #ec7063;">Job Details</h3>
            <div class="info-row">
              <span class="label">Part Name:</span> ${data.partName}
            </div>
            <div class="info-row">
              <span class="label">Job ID:</span> ${data.jobId}
            </div>
            <div class="info-row">
              <span class="label">Material:</span> ${data.material}
            </div>
            <div class="info-row">
              <span class="label">Color:</span> ${data.color}
            </div>
          </div>

          <p>If you believe this was done in error or have questions, please contact the BML staff.</p>
          <p>You're welcome to submit a new print job at any time.</p>
        </div>
        <div class="footer">
          <p>Boilermaker Labs - Purdue University</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateCancelledEmailText(data: JobCompletionEmailData): string {
    return `
Print Job Cancelled

Hello ${data.userName},

This is to inform you that your 3D print job has been cancelled.

Job Details:
- Part Name: ${data.partName}
- Job ID: ${data.jobId}
- Material: ${data.material}
- Color: ${data.color}

If you believe this was done in error or have questions, please contact the BML staff.
You're welcome to submit a new print job at any time.

---
Boilermaker Labs - Purdue University
This is an automated message. Please do not reply to this email.
    `;
  }
}

export default new EmailService();