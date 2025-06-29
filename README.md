https://elorapeter.github.io/Momentum/

Momentum
Momentum is a Progressive Web App (PWA) designed to help anyone track their skill development and personal growth through a fun, gamified experience. Originally created to support my own journey, Momentum is now a powerful tool for business owners, developers, creatives, and anyone committed to building consistency and mastering their skills.
Why Momentum?
Whether you’re learning new tech, growing a business, creating content, or building better habits, Momentum empowers you to:

Track skills with customizable categories and milestones.
Log daily practice to maintain motivating streaks.
Visualize progress with heatmaps and interactive charts.
Earn XP, level up, and unlock badges to celebrate your consistency.
Export and share achievements on social platforms.
Unlock Styled to Sell Mode with the code found in the Styled to Sell Kit to structure content creation and brand-building goals. Don’t have the Kit? <a href="https://selar.com/17h5n6"> Get it here.</a>

Features

Skill Tracking: Add, organize, and manage skills with custom categories and tags.
Milestone Management: Set weighted goals with deadlines to earn XP and track progress.
Progress Visualization: View growth through Chart.js-powered line charts and GitHub-style heatmaps.
Gamification: Stay motivated with badges (e.g., “5-Day Streak,” “Consistency Star”) and levels.
Daily Practice Logs: Track daily efforts to build streaks and maintain momentum.
Reflections: Record personal insights for each skill to reflect on your growth.
Styled to Sell Mode: A premium feature (unlocked via the Styled to Sell Kit) with predefined goals like “Create a brand identity” or “Post a content carousel” for content creators.
Export & Share: Download data as JSON/CSV or share skill cards as PNGs on Twitter, Facebook, LinkedIn, or via link.
Dark Mode: Toggle between light and dark themes for a comfortable experience.
Offline Support: Use the app anywhere with PWA offline capabilities.
Supabase Sync: Back up and sync data across devices with Supabase authentication.
Onboarding Wizard: Guides new users to set up their first skill.

Getting Started

Open Momentum in a modern browser.
Complete the onboarding wizard to add your first skill.
Optionally sign up or log in (via email or magic link) for cross-device syncing.
Add skills, set milestones, log daily practice, and build momentum!
Unlock Styled to Sell Mode with the code from the Styled to Sell Kit to access structured creative goals. Don’t have the Kit?  href="https://selar.com/17h5n6"> Get it here.</a>

Installation

Browser Access: Visit Momentum and use it directly.
PWA Installation: Install as a PWA via your browser’s “Add to Home Screen” prompt for offline use.
Custom Backend (Optional):
Set up a Supabase project at supabase.com.
Create a user_data table with columns: user_id, skills, styled_logs, user_xp, user_level, streak, last_activity_date, dark_mode, styled_to_sell_mode, unlocked_badges.
Update SUPABASE_URL and SUPABASE_KEY in script.js with your project’s credentials.



Usage

Add Skills: Use the floating action button (+) to create skills with names, categories, and tags.
Track Milestones: Add milestones with weights (1–10) and deadlines, marking them complete to earn XP.
Log Practice: Mark daily practice to build streaks, viewable in heatmaps.
Styled to Sell Mode: Purchase the Styled to Sell Kit to unlock content creation goals with preset milestones (e.g., “Post a behind-the-scenes”).
Visualize Progress: Monitor growth with charts, heatmaps, and stats like level, XP, and streak.
Share Achievements: Generate shareable skill cards for social media or download data as PNG/JSON/CSV.
Reflect: Add reflections to document learnings and track growth.
Feedback & Support:
Submit feedback via the in-app form.
Contact support:
Instagram: @elorapeter
WhatsApp: +2348105769233
Email: elorapeter@gmail.com





Tech Stack

Frontend: HTML, Tailwind CSS, JavaScript
Libraries:
Chart.js for progress charts
dayjs for date handling
html2canvas for skill card screenshots
jsPDF for PDF generation
Supabase for authentication and data storage
Font Awesome for icons


PWA: Service worker (service-worker.js) for offline caching and manifest.json for app metadata
Deployment: Hosted on GitHub Pages

File Structure

index.html: Main app structure with modals and UI components.
style.css: Tailwind CSS with custom light/dark theme variables.
script.js: Core logic for skill management, Supabase integration, and UI rendering.
service-worker.js: Caches assets for offline support.
manifest.json: PWA configuration with app metadata and icons.

Development

Clone the Repository:git clone https://github.com/elorapeter/Momentum.git


Run Locally:
Use a static server (e.g., npx serve).
Ensure HTTPS for service worker testing (e.g., via localhost).


Build: No build step required; the app runs directly in the browser.
Deploy:
Deploy to GitHub Pages or any static hosting service.
Update start_url in manifest.json and Supabase redirect URLs in script.js.



Contributing
Contributions are welcome! To contribute:

Fork the repository.
Create a feature branch (git checkout -b feature/YourFeature).
Commit changes (git commit -m "Add YourFeature").
Push to the branch (git push origin feature/YourFeature).
Open a pull request.

License
© 2025 Momentum. All rights reserved. Made with ❤ by Elora.