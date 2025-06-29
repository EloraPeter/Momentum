const { jsPDF } = window.jspdf;

// Custom UUID v4 generator
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Supabase client initialization
const SUPABASE_URL = 'https://uspfmxwzfjludzgofzdk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGZteHd6ZmpsdWR6Z29memRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTIyODEsImV4cCI6MjA2NjY4ODI4MX0.qqZ1bMUq9TTWALecR5I4We-69vJOczId2tEXLFuQLVk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State variables
let skills = JSON.parse(localStorage.getItem('skills')) || [];
let currentSkillId = null;
let darkMode = localStorage.getItem('darkMode') === 'true';
let userXP = parseInt(localStorage.getItem('userXP')) || 0;
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;
let streak = parseInt(localStorage.getItem('streak')) || 0;
let lastActivityDate = localStorage.getItem('lastActivityDate') || null;
let progressChart = null;
let styledLogs = JSON.parse(localStorage.getItem('styledLogs')) || [];
let styledToSellMode = localStorage.getItem('styledToSellMode') === 'true';
let user = null;

// Predefined Styled to Sell goals
const styledGoals = [
    { title: "Post a content carousel", category: "Visibility", tags: ['StyledToSell'] },
    { title: "Promote my offer", category: "Sales", tags: ['StyledToSell'] },
    { title: "Share a client win", category: "Credibility", tags: ['StyledToSell'] },
    { title: "Post a behind-the-scenes", category: "Connection", tags: ['StyledToSell'] }
];

// Save state to localStorage and Supabase
async function saveState() {
    try {
        showLoading();
        localStorage.setItem('skills', JSON.stringify(skills));
        localStorage.setItem('userXP', userXP);
        localStorage.setItem('userLevel', userLevel);
        localStorage.setItem('streak', streak);
        localStorage.setItem('lastActivityDate', lastActivityDate);
        localStorage.setItem('darkMode', darkMode);
        localStorage.setItem('styledLogs', JSON.stringify(styledLogs));
        localStorage.setItem('styledToSellMode', styledToSellMode);
        localStorage.setItem('unlockedBadges', JSON.stringify(getUnlockedBadgeIds()));

        if (user) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('Session expired. Please log in again.', 'error');
                user = null;
                renderDashboard();
                return;
            }
            const { error } = await supabase.from('user_data').upsert({
                user_id: user.id,
                skills,
                styled_logs: styledLogs,
                user_xp: userXP,
                user_level: userLevel,
                streak,
                last_activity_date: lastActivityDate,
                dark_mode: darkMode,
                styled_to_sell_mode: styledToSellMode,
                unlocked_badges: getUnlockedBadgeIds()
            }, { onConflict: ['user_id'] });
            if (error) {
                console.error('Supabase save error:', error);
                showToast(`Error syncing data with server: ${error.message}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error saving state:', error);
        showToast('Error saving data locally', 'error');
    } finally {
        hideLoading();
    }
}

// Supabase auth functions
async function signUpWithEmail(email, password) {
    try {
        showLoading();
        if (!email || !password) {
            showToast('Email and password are required', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin }
        });
        if (error) {
            showToast(`Signup failed: ${error.message}`, 'error');
            return;
        }
        if (data.user) {
            user = data.user;
            await syncUserData();
            showToast('Signed up successfully! Please check your email to verify.');
            closeLoginModal();
            renderDashboard();
        } else {
            showToast('Please check your email to verify your account.');
        }
    } catch (error) {
        showToast('Unexpected signup error', 'error');
        console.error('Signup error:', error);
    } finally {
        hideLoading();
    }
}

async function loginWithEmail(email, password) {
    try {
        showLoading();
        if (!email || !password) {
            showToast('Email and password are required', 'error');
            return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.status === 400) {
                showToast('Invalid email or password', 'error');
            } else {
                showToast(`Login failed: ${error.message}`, 'error');
            }
            return;
        }
        user = data.user;
        await syncUserData();
        showToast('Logged in successfully');
        closeLoginModal();
        renderDashboard();
    } catch (error) {
        showToast('Unexpected login error', 'error');
        console.error('Login error:', error);
    } finally {
        hideLoading();
    }
}

async function loginWithMagicLink(email) {
    try {
        showLoading();
        if (!email) {
            showToast('Email is required', 'error');
            return;
        }
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin }
        });
        if (error) {
            showToast(`Error sending magic link: ${error.message}`, 'error');
            return;
        }
        showToast('Magic link sent to your email');
    } catch (error) {
        showToast('Unexpected error sending magic link', 'error');
        console.error('Magic link error:', error);
    } finally {
        hideLoading();
    }
}

async function resetPassword(email) {
    try {
        showLoading();
        if (!email) {
            showToast('Please enter your email', 'error');
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });
        if (error) {
            showToast(`Error sending password reset link: ${error.message}`, 'error');
            return;
        }
        showToast('Password reset link sent to your email');
        closeLoginModal();
    } catch (error) {
        showToast('Unexpected error sending reset link', 'error');
        console.error('Reset password error:', error);
    } finally {
        hideLoading();
    }
}

async function logout() {
    try {
        showLoading();
        await supabase.auth.signOut();
        user = null;
        showToast('Logged out successfully');
        renderDashboard();
    } catch (error) {
        showToast('Error logging out', 'error');
        console.error('Logout error:', error);
    } finally {
        hideLoading();
    }
}

async function syncUserData() {
    if (!user) return;
    try {
        showLoading();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showToast('Session expired. Please log in again.', 'error');
            user = null;
            renderDashboard();
            return;
        }
        const { data, error } = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', user.id)
            .single();
        if (error && error.code !== 'PGRST116') {
            console.error('Supabase sync error:', error);
            showToast(`Error syncing user data: ${error.message}`, 'error');
            return;
        }
        if (data) {
            skills = data.skills || skills;
            styledLogs = data.styled_logs || styledLogs;
            userXP = data.user_xp || userXP;
            userLevel = data.user_level || userLevel;
            streak = data.streak || streak;
            lastActivityDate = data.last_activity_date || lastActivityDate;
            darkMode = data.dark_mode !== null ? data.dark_mode : darkMode;
            styledToSellMode = data.styled_to_sell_mode || styledToSellMode;
            if (data.unlocked_badges) {
                localStorage.setItem('unlockedBadges', JSON.stringify(data.unlocked_badges));
            }
            if (user.user_metadata?.styled_to_sell_unlocked) {
                styledToSellMode = true;
                localStorage.setItem('styledToSellMode', 'true');
                document.body.classList.add('styled-mode');
            }
            await saveState();
        } else {
            // Create initial user_data row
            const { error: insertError } = await supabase.from('user_data').insert({
                user_id: user.id,
                skills,
                styled_logs: styledLogs,
                user_xp: userXP,
                user_level: userLevel,
                streak,
                last_activity_date: lastActivityDate,
                dark_mode: darkMode,
                styled_to_sell_mode: styledToSellMode,
                unlocked_badges: getUnlockedBadgeIds()
            });
            if (insertError) {
                console.error('Supabase insert error:', insertError);
                showToast(`Error initializing user data: ${insertError.message}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error syncing user data:', error);
        showToast('Error syncing data', 'error');
    } finally {
        hideLoading();
    }
}

// Styled to Sell Mode unlock
function unlockStyledMode() {
    showLoading();
    const codeInput = document.getElementById('styled-mode-code');
    const code = codeInput?.value.trim();
    if (code === 'SELLSTYLE23') {
        styledToSellMode = true;
        localStorage.setItem('styledToSellMode', 'true');
        document.body.classList.add('styled-mode');
        closeStyledModeModal();
        showToast('Styled to Sell Mode unlocked!');

        styledGoals.forEach(goal => {
            if (!skills.some(s => s.name === goal.title)) {
                skills.push({
                    id: uuidv4(),
                    name: goal.title,
                    category: goal.category,
                    tags: goal.tags,
                    milestones: [],
                    reflections: [],
                    progressLog: [],
                    practiceHistory: [],
                    weeklyPractice: {},
                    createdAt: new Date().toISOString()
                });
            }
        });
        saveState();
        renderDashboard();
    } else {
        showToast('Invalid code', 'error');
    }
    hideLoading();
}

// Toggle dark mode
function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark', darkMode);
    const toggleIcon = document.getElementById('dark-mode-toggle');
    if (toggleIcon) {
        toggleIcon.className = darkMode ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-gray-600 dark:text-gray-300';
    }
    saveState();
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    sidebar.classList.toggle('-translate-x-full');
    document.body.classList.toggle('sidebar-open');
}

// Show/Hide loading overlay
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }, 300);
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `px-4 py-2 rounded shadow-md animate-toast-enter ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} fixed bottom-4 right-4 z-50 max-w-[90%] sm:max-w-md`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-toast-leave');
        setTimeout(() => container.removeChild(toast), 500);
    }, 4000);
}

function showToastConfirm(message) {
    return new Promise((resolve) => {
        const container = document.getElementById('toast-container');
        if (!container) {
            resolve(false);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `bg-yellow-500 text-white px-4 py-3 rounded shadow-md animate-toast-enter fixed bottom-4 right-4 z-50 max-w-[90%] sm:max-w-md flex flex-col gap-2`;
        toast.innerHTML = `
            <div>${message}</div>
            <div class="flex justify-end gap-2">
                <button class="confirm-yes bg-green-600 px-3 py-1 rounded">Yes</button>
                <button class="confirm-no bg-red-600 px-3 py-1 rounded">Cancel</button>
            </div>
        `;
        container.appendChild(toast);
        const removeToast = () => {
            toast.classList.add('animate-toast-leave');
            setTimeout(() => container.removeChild(toast), 500);
        };
        toast.querySelector('.confirm-yes').onclick = () => {
            removeToast();
            resolve(true);
        };
        toast.querySelector('.confirm-no').onclick = () => {
            removeToast();
            resolve(false);
        };
    });
}

// Onboarding functions
function skipOnboarding() {
    localStorage.setItem('hasOnboarded', 'true');
    document.getElementById('onboarding-modal')?.classList.add('hidden');
    renderDashboard();
}

function onboardingNext() {
    showLoading();
    const step = window.onboardingStep || 1;
    if (step === 1) {
        const skillName = document.getElementById('onboarding-skill-name')?.value.trim();
        if (!skillName) {
            showToast('Please enter a skill name.', 'error');
            hideLoading();
            return;
        }
        window.onboardingSkill = { name: skillName };
        onboardingShowStep(2);
    } else if (step === 2) {
        const category = document.getElementById('onboarding-skill-category')?.value.trim();
        const tags = document.getElementById('onboarding-skill-tags')?.value
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
        window.onboardingSkill.category = category || 'Uncategorized';
        window.onboardingSkill.tags = tags;
        onboardingShowStep(3);
    } else if (step === 3) {
        const title = document.getElementById('onboarding-milestone-title')?.value.trim();
        const weight = parseInt(document.getElementById('onboarding-milestone-weight')?.value) || 1;
        const deadline = document.getElementById('onboarding-milestone-deadline')?.value;
        const skill = {
            id: uuidv4(),
            name: window.onboardingSkill.name,
            category: window.onboardingSkill.category,
            tags: window.onboardingSkill.tags,
            milestones: [],
            reflections: [],
            progressLog: [],
            practiceHistory: [],
            weeklyPractice: {},
            createdAt: new Date().toISOString()
        };
        if (title) {
            skill.milestones.push({
                id: uuidv4(),
                title,
                weight: Math.max(1, Math.min(10, weight)),
                deadline,
                completed: false,
                createdAt: new Date().toISOString()
            });
        }
        skills.push(skill);
        saveState();
        localStorage.setItem('hasOnboarded', 'true');
        document.getElementById('onboarding-modal')?.classList.add('hidden');
        delete window.onboardingSkill;
        delete window.onboardingStep;
        renderDashboard();
    }
    hideLoading();
}

function onboardingPrev() {
    const step = window.onboardingStep || 2;
    if (step > 1) onboardingShowStep(step - 1);
}

function onboardingShowStep(step) {
    window.onboardingStep = step;
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`onboarding-step-${i}`)?.classList.add('hidden');
    }
    document.getElementById(`onboarding-step-${step}`)?.classList.remove('hidden');
    const title = document.getElementById('onboarding-step-title');
    const desc = document.getElementById('onboarding-step-desc');
    if (title && desc) {
        title.innerText = step === 1 ? 'Welcome to Momentum!' :
                         step === 2 ? 'Categorize Your Skill' : 'Add a Milestone (Optional)';
        desc.innerText = step === 1 ? 'Let’s set up your first skill.' :
                        step === 2 ? 'Organize it by category and tags.' : 'Want to add a starting milestone?';
    }
    document.getElementById('onboarding-back-btn')?.classList.toggle('hidden', step === 1);
}

// Calculate progress
function calculateProgress(skill) {
    if (!skill.milestones?.length) return 0;
    const totalWeight = skill.milestones.reduce((sum, m) => sum + (m.weight || 1), 0);
    const completedWeight = skill.milestones.filter(m => m.completed).reduce((sum, m) => sum + (m.weight || 1), 0);
    return Math.round((completedWeight / totalWeight) * 100);
}

// Log daily progress
function logDailyProgress(skill) {
    const today = dayjs().format('YYYY-MM-DD');
    if (!skill.progressLog) skill.progressLog = [];
    const existingLog = skill.progressLog.find(log => log.date === today);
    if (!existingLog) {
        skill.progressLog.push({ date: today, progress: calculateProgress(skill) });
    } else {
        existingLog.progress = calculateProgress(skill);
    }
    saveState();
}

// Get status emoji and badges
function getStatusEmoji(progress) {
    if (progress < 30) return '🟡 Beginner';
    if (progress < 65) return '🟢 Progressing';
    return '🔵 Achiever';
}

function getBadges(skill) {
    const badges = [];
    if (streak >= 5) badges.push('🔥 5-Day Streak');
    if (calculateProgress(skill) === 100) badges.push('🏆 Master');
    if (skill.practiceHistory?.length >= 10) badges.push('⏰ Consistency');
    if (skill.milestones.filter(m => m.completed).length >= 10) badges.push('🎯 Milestone Master');
    if (skill.practiceHistory?.length >= 20) badges.push('🏋️ Practice Pro');
    const oneWeekAgo = dayjs().subtract(7, 'day');
    const recentReflections = skill.reflections?.filter(r => dayjs(r.date).isAfter(oneWeekAgo)).length || 0;
    if (recentReflections >= 3) badges.push('📝 Reflective Thinker');
    if (skills.filter(s => s.tags?.includes('StyledToSell')).length >= 3) badges.push('🌟 Styled Starter');
    if (new Set(styledLogs.map(l => l.date)).size >= 5) badges.push('👑 Consistent Queen');
    if (styledLogs.filter(l => l.post.toLowerCase().includes('sales')).length >= 3) badges.push('🚀 Launch Ready');
    return badges;
}

function getUnlockedBadgeIds() {
    return JSON.parse(localStorage.getItem('unlockedBadges') || '[]');
}

function saveUnlockedBadges(badges) {
    const unlockedIds = badges.filter(b => b.unlocked).map(b => b.id);
    localStorage.setItem('unlockedBadges', JSON.stringify(unlockedIds));
    if (user) {
        supabase.from('user_data').upsert({
            user_id: user.id,
            unlocked_badges: unlockedIds
        }, { onConflict: ['user_id'] });
    }
}

function checkNewBadges() {
    const previous = new Set(getUnlockedBadgeIds());
    const badgeData = [
        { id: 'streak5', unlocked: streak >= 5, label: '🔥 5-Day Streak' },
        { id: 'mastery', unlocked: skills.some(s => calculateProgress(s) === 100), label: '🏆 Master' },
        { id: 'consistency10', unlocked: skills.some(s => s.practiceHistory?.length >= 10), label: '⏰ Consistency' },
        { id: 'milestone10', unlocked: skills.some(s => s.milestones.filter(m => m.completed).length >= 10), label: '🎯 Milestone Master' },
        { id: 'practice20', unlocked: skills.some(s => s.practiceHistory?.length >= 20), label: '🏋️ Practice Pro' },
        { id: 'reflective3', unlocked: skills.some(s => (s.reflections || []).filter(r => dayjs(r.date).isAfter(dayjs().subtract(7, 'day'))).length >= 3), label: '📝 Reflective Thinker' },
        { id: 'styledStarter', unlocked: skills.filter(s => s.tags?.includes('StyledToSell')).length >= 3, label: '🌟 Styled Starter' },
        { id: 'consistentQueen', unlocked: new Set(styledLogs.map(l => l.date)).size >= 5, label: '👑 Consistent Queen' },
        { id: 'launchReady', unlocked: styledLogs.filter(l => l.post.toLowerCase().includes('sales')).length >= 3, label: '🚀 Launch Ready' }
    ];
    const newlyUnlocked = badgeData.filter(b => b.unlocked && !previous.has(b.id));
    if (newlyUnlocked.length > 0) {
        const unlockedIds = [...previous, ...newlyUnlocked.map(b => b.id)];
        localStorage.setItem('unlockedBadges', JSON.stringify(unlockedIds));
        newlyUnlocked.forEach(b => {
            if (Notification.permission === 'granted') {
                new Notification('🎉 New Badge Unlocked!', { body: b.label });
            } else {
                showToast(`🎉 You unlocked a new badge: ${b.label}`);
            }
        });
        saveState();
    }
}

function openBadgeGallery() {
    const modal = document.getElementById('badge-gallery-modal');
    const container = document.getElementById('badge-gallery-content');
    if (!modal || !container) return;
    container.innerHTML = '';
    const allBadges = [
        {
            id: 'streak5', icon: '🔥', name: '5-Day Streak', description: 'Practice for 5 consecutive days.',
            unlocked: streak >= 5, tier: 'Bronze', progress: `${streak}/5 days`
        },
        {
            id: 'mastery', icon: '🏆', name: 'Master', description: 'Reach 100% progress on a skill.',
            unlocked: skills.some(s => calculateProgress(s) === 100), tier: 'Gold',
            progress: `${Math.max(...skills.map(s => calculateProgress(s)))}%`
        },
        {
            id: 'consistency10', icon: '⏰', name: 'Consistency', description: 'Practice a skill for at least 10 days.',
            unlocked: skills.some(s => s.practiceHistory?.length >= 10), tier: 'Silver',
            progress: `${Math.max(...skills.map(s => s.practiceHistory?.length || 0))}/10 sessions`
        },
        {
            id: 'milestone10', icon: '🎯', name: 'Milestone Master', description: 'Complete 10 milestones on a skill.',
            unlocked: skills.some(s => s.milestones.filter(m => m.completed).length >= 10), tier: 'Gold',
            progress: `${Math.max(...skills.map(s => s.milestones.filter(m => m.completed).length))}/10 done`
        },
        {
            id: 'practice20', icon: '🏋️', name: 'Practice Pro', description: 'Practice 20 times on a skill.',
            unlocked: skills.some(s => s.practiceHistory?.length >= 20), tier: 'Gold',
            progress: `${Math.max(...skills.map(s => s.practiceHistory?.length || 0))}/20 sessions`
        },
        {
            id: 'reflective3', icon: '📝', name: 'Reflective Thinker', description: 'Write 3+ reflections in the past week.',
            unlocked: skills.some(s => (s.reflections || []).filter(r => dayjs(r.date).isAfter(dayjs().subtract(7, 'day'))).length >= 3), tier: 'Silver',
            progress: `${Math.max(...skills.map(s => (s.reflections || []).filter(r => dayjs(r.date).isAfter(dayjs().subtract(7, 'day'))).length))}/3 reflections`
        },
        {
            id: 'styledStarter', icon: '🌟', name: 'Styled Starter', description: 'Add 3 Styled to Sell goals.',
            unlocked: skills.filter(s => s.tags?.includes('StyledToSell')).length >= 3, tier: 'Bronze',
            progress: `${skills.filter(s => s.tags?.includes('StyledToSell')).length}/3 goals`
        },
        {
            id: 'consistentQueen', icon: '👑', name: 'Consistent Queen', description: 'Log posts for 5 different days.',
            unlocked: new Set(styledLogs.map(l => l.date)).size >= 5, tier: 'Silver',
            progress: `${new Set(styledLogs.map(l => l.date)).size}/5 days`
        },
        {
            id: 'launchReady', icon: '🚀', name: 'Launch Ready', description: 'Complete 3 sales-focused tasks.',
            unlocked: styledLogs.filter(l => l.post.toLowerCase().includes('sales')).length >= 3, tier: 'Gold',
            progress: `${styledLogs.filter(l => l.post.toLowerCase().includes('sales')).length}/3 tasks`
        }
    ];
    saveUnlockedBadges(allBadges);
    allBadges.forEach(b => {
        const style = b.unlocked ? 'bg-green-100 dark:bg-green-800 animate-badge-pop' : 'bg-gray-100 dark:bg-gray-700 opacity-50';
        const tierColor = b.tier === 'Gold' ? 'text-yellow-500' : b.tier === 'Silver' ? 'text-gray-400' : 'text-orange-500';
        container.innerHTML += `
            <div class="p-4 rounded-lg shadow-sm border ${style} flex flex-col items-center" title="${b.description}\nProgress: ${b.progress}">
                <h4 class="text-lg font-semibold flex items-center gap-2 ${tierColor}">
                    <span class="text-2xl">${b.icon}</span> ${b.name} (${b.tier})
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 text-center">${b.description}</p>
                <p class="text-xs mt-2 font-bold ${b.unlocked ? 'text-green-600' : 'text-gray-500'}">
                    ${b.unlocked ? 'Unlocked' : 'Locked'} • ${b.progress}
                </p>
            </div>
        `;
    });
    modal.classList.remove('hidden');
}

function closeBadgeGallery() {
    document.getElementById('badge-gallery-modal')?.classList.add('hidden');
}

// Render dashboard
function renderDashboard(filter = null, type = 'category', sort = 'alphabetical', searchQuery = '') {
    showLoading();
    setTimeout(() => {
        checkNewBadges();
        currentSkillId = null;
        const main = document.getElementById('main-content');
        if (!main) return;
        if (!skills.length) {
            renderEmptyState();
            hideLoading();
            return;
        }
        const filteredSkills = getFilteredSkills(filter, type, searchQuery);
        const sortedSkills = sortSkills(filteredSkills, sort);
        main.innerHTML = `
            ${styledToSellMode ? `
                <div id="styled-mode-banner" class="bg-pink-500 text-white p-4 mb-4 rounded-lg flex flex-col sm:flex-row justify-between items-center">
                    <div>
                        <strong>✅ Styled to Sell Mode Active</strong>
                        <p>Let’s build visibility, consistency, and confidence.</p>
                    </div>
                    <button onclick="dismissStyledBanner()" class="bg-pink-700 px-3 py-1 rounded mt-2 sm:mt-0">Dismiss</button>
                </div>
            ` : ''}
            ${renderTopBar(filter, type, sort, searchQuery)}
            ${renderStats()}
            ${styledToSellMode ? renderStyledTracker() : ''}
            ${renderSkillCards(sortedSkills)}
        `;
        attachSearchInput(filter, type, sort);
        updateCategoryDropdown();
        hideLoading();
    }, 200);
}

function dismissStyledBanner() {
    document.getElementById('styled-mode-banner')?.classList.add('hidden');
}

function renderEmptyState() {
    const main = document.getElementById('main-content');
    if (main) {
        main.innerHTML = `
            <div class="flex items-center justify-center min-h-[50vh] p-4">
                <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg text-center max-w-md w-full">
                    <h2 class="text-xl font-semibold dark:text-white mb-4">No Skills Yet</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">Start your journey by adding a new skill!</p>
                    <button onclick="openAddSkillModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto" aria-label="Create new skill">Create Skill</button>
                </div>
            </div>
        `;
    }
    hideLoading();
}

function renderStyledTracker() {
    const styledSkills = skills.filter(s => s.tags?.includes('StyledToSell'));
    return `
        <div class="mb-6">
            <h2 class="text-xl font-semibold dark:text-white">Styled Tracker</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                ${styledSkills.map(skill => `
                    <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold dark:text-white">${skill.name}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${skill.category}</p>
                        <p class="text-sm mt-2">${calculateProgress(skill)}% complete</p>
                        <button onclick="viewSkill('${skill.id}')" class="bg-pink-500 text-white px-3 py-1 rounded mt-2 hover:bg-pink-600 w-full sm:w-auto" aria-label="View ${skill.name}">View</button>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4">
                <h3 class="text-lg font-semibold dark:text-white">Daily Post Log</h3>
                <div class="flex flex-col gap-2 mt-2">
                    <input id="post-today" type="text" placeholder="What did I post today?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white w-full" aria-label="Post description">
                    <input id="post-performance" type="text" placeholder="How did it perform?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white w-full" aria-label="Post performance">
                    <textarea id="post-learn" placeholder="What did I learn?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white h-24 w-full" aria-label="Post learnings"></textarea>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <button onclick="addStyledLog()" class="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 w-full sm:w-auto" aria-label="Add log">Add Log</button>
                        <button onclick="downloadStyledLogs()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto" aria-label="Download logs">Download Logs</button>
                    </div>
                </div>
                <div class="mt-4">
                    ${styledLogs.slice().reverse().map(log => `
                        <div class="p-4 border-b dark:border-gray-600">
                            <p class="text-sm text-gray-500 dark:text-gray-400">${dayjs(log.date).format('MMM d, YYYY')}</p>
                            <p class="dark:text-white"><strong>Post:</strong> ${log.post}</p>
                            <p class="dark:text-white"><strong>Performance:</strong> ${log.performance}</p>
                            <p class="dark:text-white"><strong>Learned:</strong> ${log.learn}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function addStyledLog() {
    showLoading();
    const post = document.getElementById('post-today')?.value.trim();
    const performance = document.getElementById('post-performance')?.value.trim();
    const learn = document.getElementById('post-learn')?.value.trim();
    if (!post || !performance || !learn) {
        showToast('Please fill all fields', 'error');
        hideLoading();
        return;
    }
    styledLogs.push({
        id: uuidv4(),
        post,
        performance,
        learn,
        date: new Date().toISOString()
    });
    document.getElementById('post-today').value = '';
    document.getElementById('post-performance').value = '';
    document.getElementById('post-learn').value = '';
    saveState();
    renderDashboard();
    hideLoading();
}

function downloadStyledLogs() {
    let csv = 'Date,Post,Performance,Learned\n';
    styledLogs.forEach(log => {
        csv += `"${dayjs(log.date).format('YYYY-MM-DD')}","${log.post.replace(/"/g, '""')}","${log.performance.replace(/"/g, '""')}","${log.learn.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'styled_logs.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function getFilteredSkills(filter, type, searchQuery) {
    let result = [...skills];
    if (filter) {
        result = type === 'category'
            ? result.filter(s => s.category === filter)
            : result.filter(s => s.tags?.includes(filter));
    }
    if (searchQuery) {
        result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
}

function sortSkills(skills, sort) {
    return skills.sort((a, b) => {
        if (sort === 'progress') return calculateProgress(b) - calculateProgress(a);
        if (sort === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
        return a.name.localeCompare(b.name);
    });
}

function renderTopBar(filter, type, sort, searchQuery) {
    const currentView = localStorage.getItem('skillView') || 'grid';
    const icon = currentView === 'grid' ? '📃 List' : '🔲 Grid';
    return `
        <div class="mb-4">
            <div class="flex justify-end mb-2 sm:hidden">
                <button onclick="toggleTopBar()" class="px-4 py-2 rounded bg-blue-600 text-white w-full" aria-label="Toggle filters">☰ Filters</button>
            </div>
            <div id="topbar-collapse" class="hidden sm:flex sm:flex-wrap gap-3 items-center transition-all duration-300 ease-in-out">
                <input id="search-skills" type="text" placeholder="Search skills..." value="${searchQuery || ''}" class="w-full sm:flex-1 p-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600" aria-label="Search skills"/>
                <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    ${renderFilterDropdown('category', 'Category', [...new Set(skills.map(s => s.category || 'Uncategorized'))], filter, type, sort, searchQuery)}
                    ${renderFilterDropdown('tag', 'Tag', [...new Set(skills.flatMap(s => s.tags || []))], filter, type, sort, searchQuery)}
                </div>
                <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button onclick="exportData('json')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto" aria-label="Export as JSON">Export JSON</button>
                    <button onclick="exportData('csv')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto" aria-label="Export as CSV">Export CSV</button>
                    <button onclick="toggleSkillView()" class="bg-gray-200 dark:bg-gray-800 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 w-full sm:w-auto" aria-label="Toggle view">${icon}</button>
                    ${!styledToSellMode ? `<button onclick="openStyledModeModal()" class="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 w-full sm:w-auto" aria-label="Unlock Styled Mode">Unlock Styled Mode</button>` : ''}
                    ${!user ? `<button onclick="openLoginModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto" aria-label="Login">Login / Signup</button>` : `<button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 w-full sm:w-auto" aria-label="Logout">Logout</button>`}
                </div>
            </div>
        </div>
    `;
}

function toggleTopBar() {
    document.getElementById('topbar-collapse')?.classList.toggle('hidden');
}

function renderFilterDropdown(typeKey, label, options, filter, type, sort, searchQuery) {
    return `
        <select id="${typeKey}-filter" onchange="renderDashboard(this.value, '${typeKey}', document.getElementById('sort-skills')?.value || '${sort}', document.getElementById('search-skills')?.value || '')" class="p-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full sm:w-auto" aria-label="Filter by ${label}">
            <option value="">All ${label}s</option>
            ${options.map(opt => `<option value="${opt}" ${filter === opt && type === typeKey ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
    `;
}

function renderStats() {
    return `
        <div class="mb-4 text-center">
            <p class="text-lg dark:text-white">Level: ${userLevel} | XP: ${userXP} | Streak: ${streak} days</p>
            <div class="xp-bar mx-auto w-64 mt-2">
                <div class="xp-bar-fill" style="width: ${(userXP % (userLevel * 100)) / (userLevel * 100) * 100}%"></div>
            </div>
        </div>
    `;
}

function renderSkillCards(skillsArray) {
    const viewType = localStorage.getItem('skillView') || 'grid';
    return viewType === 'list' ?
        `<div class="space-y-4">${skillsArray.map(renderSkillCardList).join('')}</div>` :
        `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">${skillsArray.map(renderSkillCardGrid).join('')}</div>`;
}

function renderSkillCardGrid(skill) {
    const progress = calculateProgress(skill);
    return `
        <div id="skill-card-${skill.id}" class="skill-card dark:bg-gray-800 p-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full">
            <h2 class="text-lg font-semibold dark:text-white break-words">${skill.name} (${skill.category || 'Uncategorized'})</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 break-words">${skill.tags?.join(', ') || ''}</p>
            <div class="relative w-20 h-20 mx-auto my-4">
                <svg class="w-full h-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" stroke-width="2" />
                    <circle class="progress-ring" cx="18" cy="18" r="15.9155" fill="none" stroke="${styledToSellMode && skill.tags?.includes('StyledToSell') ? '#ec4899' : '#3b82f6'}" stroke-width="2" stroke-dasharray="${progress}, 100" transform="rotate(-90 18 18)" />
                    <text x="18" y="22" text-anchor="middle" fill="currentColor" class="text-sm dark:text-white">${progress}%</text>
                </svg>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">${skill.milestones.filter(m => m.completed).length}/${skill.milestones.length} Milestones</p>
            <p class="text-lg">${getStatusEmoji(progress)}</p>
            <div class="mt-2 flex flex-wrap gap-1">${getBadges(skill).map(b => `<span class="badge">${b}</span>`).join('')}</div>
            <div class="mt-4 flex flex-wrap gap-2 justify-center">
                <button onclick="viewSkill('${skill.id}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" aria-label="View ${skill.name}">View</button>
                <button onclick="editSkill('${skill.id}')" class="bg-yellow-600 text-white px-3 py-1 rounded-lg" aria-label="Edit ${skill.name}">Edit</button>
                <button onclick="shareSkillCard('${skill.id}')" class="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700" aria-label="Share ${skill.name}">Share</button>
                <button onclick="deleteSkill('${skill.id}')" class="bg-red-600 text-white px-3 py-1 rounded-lg" aria-label="Delete ${skill.name}">Delete</button>
            </div>
        </div>
    `;
}

function renderSkillCardList(skill) {
    const progress = calculateProgress(skill);
    return `
        <div id="skill-card-${skill.id}" class="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border dark:bg-gray-800 dark:text-white w-full">
            <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold break-words">${skill.name} (${skill.category || 'Uncategorized'})</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 break-words">${skill.tags?.join(', ') || ''}</p>
                <p class="text-sm mt-1">${progress}% complete — ${skill.milestones.filter(m => m.completed).length}/${skill.milestones.length} milestones</p>
                <p class="text-lg">${getStatusEmoji(progress)}</p>
                <div class="mt-2 flex flex-wrap gap-1">${getBadges(skill).map(b => `<span class="badge">${b}</span>`).join('')}</div>
            </div>
            <div class="flex flex-wrap gap-2 justify-center sm:justify-end sm:items-center">
                <button onclick="viewSkill('${skill.id}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" aria-label="View ${skill.name}">View</button>
                <button onclick="editSkill('${skill.id}')" class="bg-yellow-600 text-white px-3 py-1 rounded-lg" aria-label="Edit ${skill.name}">Edit</button>
                <button onclick="shareSkillCard('${skill.id}')" class="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700" aria-label="Share ${skill.name}">Share</button>
                <button onclick="deleteSkill('${skill.id}')" class="bg-red-600 text-white px-3 py-1 rounded-lg" aria-label="Delete ${skill.name}">Delete</button>
            </div>
        </div>
    `;
}

// Skill management
function openAddSkillModal() {
    document.getElementById('add-skill-modal')?.classList.remove('hidden');
}

function closeAddSkillModal() {
    document.getElementById('add-skill-modal')?.classList.add('hidden');
    document.getElementById('new-skill').value = '';
    document.getElementById('skill-category').value = '';
    document.getElementById('skill-tags').value = '';
}

function addSkill() {
    showLoading();
    const name = document.getElementById('new-skill')?.value.trim();
    const category = document.getElementById('skill-category')?.value.trim() || 'Uncategorized';
    const tags = document.getElementById('skill-tags')?.value
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    if (!name) {
        showToast('Skill name is required', 'error');
        hideLoading();
        return;
    }
    skills.push({
        id: uuidv4(),
        name,
        category,
        tags,
        milestones: [],
        reflections: [],
        progressLog: [],
        practiceHistory: [],
        weeklyPractice: {},
        createdAt: new Date().toISOString()
    });
    saveState();
    closeAddSkillModal();
    renderDashboard();
    hideLoading();
}

function editSkill(skillId) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    currentSkillId = skillId;
    document.getElementById('edit-skill-name').value = skill.name;
    document.getElementById('edit-skill-category').value = skill.category || 'Uncategorized';
    document.getElementById('edit-skill-tags').value = skill.tags?.join(', ') || '';
    document.getElementById('edit-skill-modal')?.classList.remove('hidden');
}

function closeEditSkillModal() {
    document.getElementById('edit-skill-modal')?.classList.add('hidden');
    currentSkillId = null;
}

function saveEditedSkill() {
    showLoading();
    const skill = skills.find(s => s.id === currentSkillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        hideLoading();
        return;
    }
    const name = document.getElementById('edit-skill-name')?.value.trim();
    const category = document.getElementById('edit-skill-category')?.value.trim() || 'Uncategorized';
    const tags = document.getElementById('edit-skill-tags')?.value
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    if (!name) {
        showToast('Skill name is required', 'error');
        hideLoading();
        return;
    }
    skill.name = name;
    skill.category = category;
    skill.tags = tags;
    saveState();
    closeEditSkillModal();
    renderDashboard();
    hideLoading();
}

async function deleteSkill(skillId) {
    const confirmed = await showToastConfirm('Are you sure you want to delete this skill?');
    if (!confirmed) return;
    showLoading();
    skills = skills.filter(s => s.id !== skillId);
    saveState();
    renderDashboard();
    hideLoading();
}

function viewSkill(skillId) {
    currentSkillId = skillId;
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
        <button onclick="renderDashboard()" class="mb-4 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg dark:text-white" aria-label="Back to dashboard">Back</button>
        <h2 class="text-2xl font-bold dark:text-white mb-4">${skill.name}</h2>
        <p class="text-gray-600 dark:text-gray-300 mb-2">Category: ${skill.category || 'Uncategorized'}</p>
        <p class="text-gray-600 dark:text-gray-300 mb-4">Tags: ${skill.tags?.join(', ') || 'None'}</p>
        <div class="mb-6">${renderChart(skill)}</div>
                <div class="mb-6">${renderPracticeTracker(skill)}</div>
        <div class="mb-6">${renderMilestones(skill)}</div>
        <div class="mb-6">${renderReflections(skill)}</div>
    `;
}

function renderChart(skill) {
    const progressData = skill.progressLog?.map(log => ({
        x: dayjs(log.date).toDate(),
        y: log.progress
    })) || [];
    return `
        <h3 class="text-lg font-semibold dark:text-white mb-2">Progress Over Time</h3>
        <canvas id="progress-chart" class="w-full max-w-md mx-auto"></canvas>
        <script>
            if (progressChart) progressChart.destroy();
            progressChart = new Chart(document.getElementById('progress-chart'), {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Progress',
                        data: ${JSON.stringify(progressData)},
                        borderColor: '${styledToSellMode && skill.tags?.includes('StyledToSell') ? '#ec4899' : '#3b82f6'}',
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                displayFormats: { day: 'MMM d' }
                            }
                        },
                        y: { min: 0, max: 100, title: { display: true, text: 'Progress (%)' } }
                    }
                }
            });
        </script>
    `;
}

function renderMilestones(skill) {
    return `
        <h3 class="text-lg font-semibold dark:text-white mb-2">Milestones</h3>
        <div class="flex flex-col gap-2 mb-4">
            <input id="milestone-title" type="text" placeholder="Milestone title" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white" aria-label="Milestone title">
            <input id="milestone-weight" type="number" min="1" max="10" placeholder="Weight (1-10)" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white" aria-label="Milestone weight">
            <input id="milestone-deadline" type="date" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white" aria-label="Milestone deadline">
            <button onclick="addMilestone('${skill.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto" aria-label="Add milestone">Add Milestone</button>
        </div>
        <div class="space-y-2">
            ${skill.milestones.map(m => `
                <div class="flex justify-between items-center p-2 border-b dark:border-gray-600">
                    <div class="flex-1 min-w-0">
                        <p class="dark:text-white ${m.completed ? 'line-through' : ''}">${m.title} (Weight: ${m.weight || 1})</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${m.deadline ? dayjs(m.deadline).format('MMM d, YYYY') : 'No deadline'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="toggleMilestone('${skill.id}', '${m.id}')" class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" aria-label="${m.completed ? 'Unmark' : 'Mark'} complete">${m.completed ? 'Undo' : 'Complete'}</button>
                        <button onclick="deleteMilestone('${skill.id}', '${m.id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" aria-label="Delete milestone">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function addMilestone(skillId) {
    showLoading();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        hideLoading();
        return;
    }
    const title = document.getElementById('milestone-title')?.value.trim();
    const weight = parseInt(document.getElementById('milestone-weight')?.value) || 1;
    const deadline = document.getElementById('milestone-deadline')?.value;
    if (!title) {
        showToast('Milestone title is required', 'error');
        hideLoading();
        return;
    }
    skill.milestones.push({
        id: uuidv4(),
        title,
        weight: Math.max(1, Math.min(10, weight)),
        deadline,
        completed: false,
        createdAt: new Date().toISOString()
    });
    logDailyProgress(skill);
    saveState();
    document.getElementById('milestone-title').value = '';
    document.getElementById('milestone-weight').value = '';
    document.getElementById('milestone-deadline').value = '';
    viewSkill(skillId);
    hideLoading();
}

function toggleMilestone(skillId, milestoneId) {
    showLoading();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        hideLoading();
        return;
    }
    const milestone = skill.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
        showToast('Milestone not found', 'error');
        hideLoading();
        return;
    }
    milestone.completed = !milestone.completed;
    if (milestone.completed) {
        userXP += milestone.weight * 10;
        if (userXP >= userLevel * 100) {
            userLevel++;
            userXP = userXP % (userLevel * 100);
            showToast(`🎉 Leveled up to ${userLevel}!`);
        }
        checkStreak();
    }
    logDailyProgress(skill);
    saveState();
    viewSkill(skillId);
    hideLoading();
}

function deleteMilestone(skillId, milestoneId) {
    showToastConfirm('Are you sure you want to delete this milestone?').then(confirmed => {
        if (!confirmed) return;
        showLoading();
        const skill = skills.find(s => s.id === skillId);
        if (!skill) {
            showToast('Skill not found', 'error');
            hideLoading();
            return;
        }
        skill.milestones = skill.milestones.filter(m => m.id !== milestoneId);
        logDailyProgress(skill);
        saveState();
        viewSkill(skillId);
        hideLoading();
    });
}

function renderPracticeTracker(skill) {
    const today = dayjs().format('YYYY-MM-DD');
    const practiceToday = skill.practiceHistory?.includes(today);
    return `
        <h3 class="text-lg font-semibold dark:text-white mb-2">Practice Tracker</h3>
        <button onclick="markPractice('${skill.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto mb-4 ${practiceToday ? 'opacity-50 cursor-not-allowed' : ''}" ${practiceToday ? 'disabled' : ''} aria-label="Mark practice for today">Mark Today's Practice</button>
        <div class="mb-4">${renderHeatmap(skill)}</div>
    `;
}

function markPractice(skillId) {
    showLoading();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        hideLoading();
        return;
    }
    const today = dayjs().format('YYYY-MM-DD');
    if (!skill.practiceHistory) skill.practiceHistory = [];
    if (!skill.practiceHistory.includes(today)) {
        skill.practiceHistory.push(today);
        const week = dayjs().startOf('week').format('YYYY-MM-DD');
        if (!skill.weeklyPractice[week]) skill.weeklyPractice[week] = 0;
        skill.weeklyPractice[week]++;
        userXP += 5;
        if (userXP >= userLevel * 100) {
            userLevel++;
            userXP = userXP % (userLevel * 100);
            showToast(`🎉 Leveled up to ${userLevel}!`);
        }
        checkStreak();
        logDailyProgress(skill);
        saveState();
    }
    viewSkill(skillId);
    hideLoading();
}

function checkStreak() {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const hasPracticedToday = skills.some(s => s.practiceHistory?.includes(today));
    const hasPracticedYesterday = lastActivityDate === yesterday;
    if (hasPracticedToday) {
        if (hasPracticedYesterday || !lastActivityDate) {
            streak++;
        } else if (lastActivityDate !== today) {
            streak = 1;
        }
        lastActivityDate = today;
    } else if (!hasPracticedYesterday && lastActivityDate !== today) {
        streak = 0;
    }
    saveState();
}

function renderHeatmap(skill) {
    const start = dayjs().subtract(90, 'day').startOf('day');
    const days = Array.from({ length: 90 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));

    return `
        <div class="grid grid-cols-12 gap-1">
            ${days.map(day => {
                const isPracticed = skill.practiceHistory?.includes(day);
                return `
                    <div 
                        class="w-4 h-3 rounded heatmap-day ${isPracticed ? 'practiced' : ''}" 
                        title="${dayjs(day).format('MMM D, YYYY')}">
                    </div>
                `;
            }).join('')}
        </div>
    `;
}


function renderReflections(skill) {
    return `
        <h3 class="text-lg font-semibold dark:text-white mb-2">Reflections</h3>
        <div class="flex flex-col gap-2 mb-4">
            <textarea id="reflection-text" placeholder="What did you learn today?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white h-24" aria-label="Reflection text"></textarea>
            <button onclick="addReflection('${skill.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto" aria-label="Add reflection">Add Reflection</button>
        </div>
        <div class="space-y-2">
            ${skill.reflections?.map(r => `
                <div class="p-2 border-b dark:border-gray-600">
                    <p class="text-sm text-gray-500 dark:text-gray-400">${dayjs(r.date).format('MMM d, YYYY')}</p>
                    <p class="dark:text-white">${r.text}</p>
                </div>
            `).join('') || '<p class="text-gray-600 dark:text-gray-300">No reflections yet.</p>'}
        </div>
    `;
}

function addReflection(skillId) {
    showLoading();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        hideLoading();
        return;
    }
    const text = document.getElementById('reflection-text')?.value.trim();
    if (!text) {
        showToast('Reflection text is required', 'error');
        hideLoading();
        return;
    }
    if (!skill.reflections) skill.reflections = [];
    skill.reflections.push({
        id: uuidv4(),
        text,
        date: new Date().toISOString()
    });
    saveState();
    document.getElementById('reflection-text').value = '';
    viewSkill(skillId);
    hideLoading();
}

function toggleSkillView() {
    const currentView = localStorage.getItem('skillView') || 'grid';
    localStorage.setItem('skillView', currentView === 'grid' ? 'list' : 'grid');
    renderDashboard();
}

function attachSearchInput(filter, type, sort) {
    const searchInput = document.getElementById('search-skills');
    if (!searchInput) return;
    let timeout;
    searchInput.oninput = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            renderDashboard(filter, type, sort, searchInput.value);
        }, 300);
    };
}

function updateCategoryDropdown() {
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        const categories = [...new Set(skills.map(s => s.category || 'Uncategorized'))];
        categoryFilter.innerHTML = `<option value="">All Categories</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

function exportData(format) {
    showLoading();
    const data = {
        skills,
        userXP,
        userLevel,
        streak,
        lastActivityDate,
        styledLogs,
        styledToSellMode
    };
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'momentum_data.json';
        link.click();
        URL.revokeObjectURL(url);
    } else if (format === 'csv') {
        let csv = 'Skill,Category,Tags,Progress,Milestones,PracticeDays\n';
        skills.forEach(s => {
            csv += `"${s.name.replace(/"/g, '""')}","${s.category || 'Uncategorized'}","${s.tags?.join(';') || ''}",${calculateProgress(s)},${s.milestones.length},${s.practiceHistory?.length || 0}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'momentum_skills.csv';
        link.click();
        URL.revokeObjectURL(url);
    }
    hideLoading();
}

function shareSkillCard(skillId) {
    showLoading();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        showToast('Skill not found', 'error');
        hideLoading();
        return;
    }
    const card = document.getElementById(`skill-card-${skillId}`);
    if (!card) {
        showToast('Skill card not found', 'error');
        hideLoading();
        return;
    }
    html2canvas(card, { useCORS: true, scale: window.devicePixelRatio }).then(canvas => {
        const shareMessage = `Check out my progress on ${skill.name}! ${calculateProgress(skill)}% complete. #MomentumApp`;
        document.getElementById('share-message').innerText = shareMessage;
        window.shareImage = canvas.toDataURL('image/png');
        document.getElementById('share-modal')?.classList.remove('hidden');
        hideLoading();
    }).catch(err => {
        console.error('html2canvas error:', err);
        showToast('Error generating share image', 'error');
        hideLoading();
    });
}

function shareTo(platform) {
    const message = document.getElementById('share-message')?.innerText;
    if (!message) return;
    let url;
    if (platform === 'twitter') {
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    } else if (platform === 'facebook') {
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(message)}`;
    } else if (platform === 'linkedin') {
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(message)}`;
    }
    window.open(url, '_blank');
    closeShareModal();
}

function copyShareLink() {
    const message = document.getElementById('share-message')?.innerText;
    if (!message) return;
    navigator.clipboard.writeText(message).then(() => {
        showToast('Link copied to clipboard');
        closeShareModal();
    }).catch(() => {
        showToast('Error copying link', 'error');
    });
}

function downloadCardImage() {
    if (!window.shareImage) {
        showToast('No image to download', 'error');
        return;
    }
    const link = document.createElement('a');
    link.href = window.shareImage;
    link.download = 'skill_card.png';
    link.click();
    closeShareModal();
}

function closeShareModal() {
    document.getElementById('share-modal')?.classList.add('hidden');
    delete window.shareImage;
}

function openStyledModeModal() {
    document.getElementById('styled-mode-modal')?.classList.remove('hidden');
}

function closeStyledModeModal() {
    document.getElementById('styled-mode-modal')?.classList.add('hidden');
    document.getElementById('styled-mode-code').value = '';
}

function openLoginModal() {
    document.getElementById('login-modal')?.classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('login-modal')?.classList.add('hidden');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
}

function openFeedback() {
    document.getElementById('feedback-modal')?.classList.remove('hidden');
}

function closeFeedback() {
    document.getElementById('feedback-modal')?.classList.add('hidden');
    document.getElementById('feedback-text').value = '';
}

function submitFeedback() {
    const feedback = document.getElementById('feedback-text')?.value.trim();
    if (!feedback) {
        showToast('Feedback cannot be empty', 'error');
        return;
    }
    console.log('Feedback submitted:', feedback);
    showToast('Thank you for your feedback!');
    closeFeedback();
}

function openHelp() {
    document.getElementById('help-modal')?.classList.remove('hidden');
}

function closeHelp() {
    document.getElementById('help-modal')?.classList.add('hidden');
}

// Initialize app
async function init() {
    showLoading();
    document.body.classList.toggle('dark', darkMode);
    const toggleIcon = document.getElementById('dark-mode-toggle');
    if (toggleIcon) {
        toggleIcon.className = darkMode ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-gray-600 dark:text-gray-300';
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
        user = authUser;
        await syncUserData();
    }
    if (!localStorage.getItem('hasOnboarded') && !skills.length) {
        document.getElementById('onboarding-modal')?.classList.remove('hidden');
    } else {
        renderDashboard();
    }
    document.getElementById('fab')?.addEventListener('click', openAddSkillModal);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(reg => {
            console.log('[PWA] Service Worker registered', reg);
        }).catch(err => {
            console.error('[PWA] Service Worker registration failed:', err);
        });
    }
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    hideLoading();
}

init();