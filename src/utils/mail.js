/**
 * Email utility — wraps nodemailer.
 * Configure SMTP via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Falls back to console-only (no-op) when not configured.
 */
const nodemailer = require('nodemailer');

const transporter = (process.env.SMTP_HOST)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

function isConfigured() {
    return !!transporter;
}

async function sendMail(to, subject, html) {
    if (!transporter) {
        console.log('[MAIL] Not configured — skipped:', subject, '→', to);
        return;
    }
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@ibcgroup.com.hk',
            to,
            subject,
            html
        });
        console.log('[MAIL] Sent:', subject, '→', to);
    } catch (err) {
        console.error('[MAIL] Error:', err.message);
        throw err;
    }
}

/** Send event notification to members */
async function sendEventNotification(members, eventInfo) {
    if (!isConfigured()) {
        console.log('[MAIL] Would notify', members.length, 'members about:', eventInfo.title);
        return;
    }

    for (const m of members) {
        const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#000;color:#fff;padding:20px;text-align:center;">
        <h2 style="margin:0;">IBCB Investment</h2>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">Private Equity · Investing AI +</p>
    </div>
    <div style="padding:20px;">
        <h3 style="color:#000;">${eventInfo.title}</h3>
        <p><strong>日期：</strong>${eventInfo.date}</p>
        <p><strong>地點：</strong>${eventInfo.location}</p>
        <p>${eventInfo.description}</p>
        <p style="margin-top:20px;">
            <a href="${eventInfo.url}" style="background:#000;color:#fff;padding:10px 24px;text-decoration:none;border-radius:2px;">查看活動詳情</a>
        </p>
    </div>
    <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
        此郵件由 IBCB Investment 系統自動發送。如需取消訂閱，請回覆此郵件。
    </div>
</div>`;
        await sendMail(m.email, `【IBCB】${eventInfo.title}`, html);
    }
}

/** Send confirmation email to registrant */
async function sendConfirmation(registrant, eventInfo) {
    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#000;color:#fff;padding:20px;text-align:center;">
        <h2 style="margin:0;">IBCB Investment</h2>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">活動報名確認</p>
    </div>
    <div style="padding:20px;">
        <h3>${registrant.name}，您好！</h3>
        <p>您已成功報名以下活動：</p>
        <h3 style="color:#000;">${eventInfo.title}</h3>
        <p><strong>日期：</strong>${eventInfo.date}</p>
        <p><strong>地點：</strong>${eventInfo.location}</p>
        <p>我們期待您的參與！如有任何問題，請聯繫我們。</p>
        <p style="color:#999;">admin@ibcgroup.com.hk</p>
    </div>
</div>`;
    await sendMail(registrant.email, `【報名確認】${eventInfo.title}`, html);
}

module.exports = { sendMail, sendEventNotification, sendConfirmation, isConfigured };