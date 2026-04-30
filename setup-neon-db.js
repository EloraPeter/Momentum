// setup-neon-db.js
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if POSTGRES_URL exists
const databaseUrl = process.env.POSTGRES_URL;
if (!databaseUrl) {
    console.error('❌ POSTGRES_URL environment variable is not set!');
    console.error('Please create a .env file with: POSTGRES_URL=your_neon_connection_string');
    process.exit(1);
}

console.log('✓ Database URL found, connecting...');
const sql = neon(databaseUrl);

async function setupDatabase() {
    console.log('📦 Creating tables for Momentum...');
    
    try {
        // Create feedback table
        await sql`
            CREATE TABLE IF NOT EXISTS feedback (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                feedback_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('✓ Feedback table created');
        
        // Optional: Create user_data table if you want to sync user data later
        await sql`
            CREATE TABLE IF NOT EXISTS user_data (
                user_id VARCHAR(255) PRIMARY KEY,
                skills JSONB DEFAULT '[]',
                styled_logs JSONB DEFAULT '[]',
                user_xp INTEGER DEFAULT 0,
                user_level INTEGER DEFAULT 1,
                streak INTEGER DEFAULT 0,
                last_activity_date DATE,
                dark_mode BOOLEAN DEFAULT false,
                styled_to_sell_mode BOOLEAN DEFAULT false,
                unlocked_badges JSONB DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('✓ User data table created');
        
        console.log('\n✅ Database setup complete!');
        console.log('✓ Feedback table is ready');
        console.log('✓ User data table is ready');
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

setupDatabase();