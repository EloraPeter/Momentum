import { neon } from '@neondatabase/serverless';

// Initialize Neon connection
let sql;
try {
    // Only initialize if POSTGRES_URL exists
    if (process.env.POSTGRES_URL) {
        sql = neon(process.env.POSTGRES_URL);
        console.log('Neon database connected');
    } else {
        console.warn('POSTGRES_URL not set, using mock mode');
    }
} catch (error) {
    console.error('Database connection error:', error);
}

export default async function handler(req, res) {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).end();
    }

    // Set CORS headers on actual response
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { feedback } = req.body;

    if (!feedback) {
        return res.status(400).json({ error: 'Feedback is required' });
    }

    // Insert feedback into database (or mock if no DB)
    try {
        if (sql) {
            // Real database insert
            await sql`
                INSERT INTO feedback (feedback_text) 
                VALUES (${feedback})
            `;
            console.log('Feedback saved to Neon database');
        } else {
            // Mock mode for local development without DB
            console.log('Mock mode: Feedback would be saved:', feedback);
            // In mock mode, just log it
        }
    } catch (dbError) {
        console.error('Database error:', dbError);
        // Don't fail the request if DB fails - just log the error
        // This allows the app to work even without DB connection
    }

    // Send email via Resend API (optional)
    try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (RESEND_API_KEY) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Momentum App <onboarding@resend.dev>',
                    to: 'florenceonyi09@gmail.com',
                    subject: 'New Feedback from Momentum',
                    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Momentum - New Feedback</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937;">
    <table role="presentation" style="width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <tr>
            <td style="padding: 24px; text-align: center;">
                <img src="https://elorapeter.github.io/Momentum/images/logo2.png" alt="Momentum Logo" style="width: 64px; margin: 0 auto 16px; display: block;">
                <h2 style="font-size: 24px; font-weight: 600; color: #1f2937; margin: 0 0 16px;">New Feedback Received</h2>
                <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px; line-height: 1.5;">A user has submitted new feedback for Momentum. Here's what they shared:</p>
                <p style="font-size: 16px; color: #1f2937; margin: 0 0 24px; line-height: 1.5; background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: left;">${feedback}</p>
                <p style="font-size: 14px; color: #6b7280; margin: 16px 0 0; line-height: 1.5;">Thank you for building Momentum! If you need to follow up, contact the user directly or reach out to us for support.</p>
                <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0; line-height: 1.5;">Need help? Contact us at <a href="mailto:elorapeter@gmail.com" style="color: #3b82f6; text-decoration: underline;">elorapeter@gmail.com</a>.</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #6b7280; margin: 0;">Made with ❤ by Elora | © 2025 Momentum</p>
            </td>
        </tr>
    </table>
</body>
</html>`
                }),
            });

            if (!response.ok) {
                console.error('Email sending failed:', await response.text());
                // Don't fail the request if email fails
            } else {
                console.log('Email sent successfully');
            }
        } else {
            console.log('No RESEND_API_KEY, skipping email');
        }
    } catch (err) {
        console.error('Email error:', err);
        // Don't fail the request if email fails
    }

    // Always return success to the client
    return res.status(200).json({ success: true, message: 'Feedback received!' });
}