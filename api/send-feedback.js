import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspfmxwzfjludzgofzdk.supabase.co'; // Your Supabase URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use env var for security
const supabase = createClient(supabaseUrl, supabaseKey);


export default async function handler(req, res) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');  // or restrict to your domain
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  // Set CORS headers on actual response
  res.setHeader('Access-Control-Allow-Origin', '*'); // or your local dev url or domain

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { feedback } = req.body;

  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required' });
  }

  // Insert feedback into Supabase DB
  const { error: dbError } = await supabase
    .from('feedback')
    .insert([{ feedback_text: feedback }]);

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  // Send email via Resend API
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Momentum App <onboarding@resend.dev>',
        to: 'florenceonyi09@gmail.com',
        subject: 'New Feedback from Momentum',
        text: feedback
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(500).json({ error: errorData });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
