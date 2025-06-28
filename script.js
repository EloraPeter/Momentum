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
            }, { onConflict: 'user_id' });
            if (error) console.error('Supabase save error:', error);
        }
    } catch (error) {
        console.error('Error saving state:', error);
        showToast('Error saving data');
    }
}

// Supabase auth functions
async function loginWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showToast('Login failed: ' + error.message);
            return;
        }
        user = data.user;
        await syncUserData();
        showToast('Logged in successfully');
        closeLoginModal();
        renderDashboard();
    } catch (error) {
        showToast('Unexpected login error');
        console.error('Login error:', error);
    }
}

async function loginWithMagicLink(email) {
    try {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) {
            showToast('Error sending magic link: ' + error.message);
            return;
        }
        showToast('Magic link sent to your email');
    } catch (error) {
        showToast('Unexpected error sending magic link');
        console.error('Magic link error:', error);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        user = null;
        showToast('Logged out successfully');
        renderDashboard();
    } catch (error) {
        showToast('Error logging out');
        console.error('Logout error:', error);
    }
}

async function syncUserData() {
    if (!user) return;
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', user.id)
            .single();
        if (error && error.code !== 'PGRST116') {
            console.error('Supabase sync error:', error);
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
            await supabase.from('user_data').insert({
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
        }
    } catch (error) {
        console.error('Error syncing user data:', error);
        showToast('Error syncing data');
    }
}

// Styled to Sell Mode unlock
function unlockStyledMode() {
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
        showToast('Invalid code');
    }
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    sidebar.classList.toggle('-translate-x-full');
    document.body.classList.toggle('sidebar-open');
}

// Show/Hide loading overlay
function showLoading() {
    document.getElementById('loading-overlay')?.classList.remove('hidden');
}

function hideLoading() {
    setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }, 300);
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `px-4 py-2 rounded shadow-md animate-toast-enter ${type === 'success' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'}`;
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
        toast.className = 'bg-yellow-500 text-white px-4 py-3 rounded shadow-md animate-toast-enter flex flex-col gap-2';
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
    const step = window.onboardingStep || 1;
    if (step === 1) {
        const skillName = document.getElementById('onboarding-skill-name')?.value.trim();
        if (!skillName) return showToast('Please enter a skill name.', 'error');
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
    if (progress < 33) return '🟡 Beginner';
    if (progress < 66) return '🟢 Progressing';
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
        });
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
            <div class="p-4 rounded-lg shadow-sm border ${style}" title="${b.description}\nProgress: ${b.progress}">
                <h4 class="text-lg font-semibold flex items-center gap-2 ${tierColor}">
                    <span class="text-2xl">${b.icon}</span> ${b.name} (${b.tier})
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${b.description}</p>
                <p class="text-xs mt-2 font-bold ${b.unlocked ? 'text-green-600' : 'text-gray-500'}">
                    ${b.unlocked ? 'Unlocked' : 'Locked'} • ${b.progress}
                </p>
            </div>`;
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
            return;
        }
        const filteredSkills = getFilteredSkills(filter, type, searchQuery);
        const sortedSkills = sortSkills(filteredSkills, sort);
        main.innerHTML = `
            ${styledToSellMode ? `
                <div id="styled-mode-banner" class="bg-pink-500 text-white p-4 mb-4 rounded-lg flex justify-between items-center">
                    <div>
                        <strong>✅ Styled to Sell Mode Active</strong>
                        <p>Let’s build visibility, consistency, and confidence.</p>
                    </div>
                    <button onclick="dismissStyledBanner()" class="bg-pink-700 px-3 py-1 rounded">Dismiss</button>
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
            <div class="flex items-center justify-center min-h-[50vh]">
                <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg text-center">
                    <h2 class="text-xl font-semibold dark:text-white mb-4">No Skills Yet</h2>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">Start your journey by adding a new skill!</p>
                    <button onclick="openAddSkillModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" aria-label="Create new skill">Create Skill</button>
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                ${styledSkills.map(skill => `
                    <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
                        <h3 class="text-lg font-semibold dark:text-white">${skill.name}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${skill.category}</p>
                        <p class="text-sm mt-2">${calculateProgress(skill)}% complete</p>
                        <button onclick="viewSkill('${skill.id}')" class="bg-pink-500 text-white px-3 py-1 rounded mt-2 hover:bg-pink-600">View</button>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4">
                <h3 class="text-lg font-semibold dark:text-white">Daily Post Log</h3>
                <div class="flex flex-col gap-2 mt-2">
                    <input id="post-today" type="text" placeholder="What did I post today?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white" aria-label="Post description">
                    <input id="post-performance" type="text" placeholder="How did it perform?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white" aria-label="Post performance">
                    <textarea id="post-learn" placeholder="What did I learn?" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white h-24" aria-label="Post learnings"></textarea>
                    <div class="flex gap-2">
                        <button onclick="addStyledLog()" class="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600">Add Log</button>
                        <button onclick="downloadStyledLogs()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Download Logs</button>
                    </div>
                </div>
                <div class="mt-4">
                    ${styledLogs.slice().reverse().map(log => `
                        <div class="p-4 border-b dark:border-gray-600">
                            <p class="text-sm text-gray-500 dark:text-gray-400">${dayjs(log.date).format('MMM D, YYYY')}</p>
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
    const post = document.getElementById('post-today')?.value.trim();
    const performance = document.getElementById('post-performance')?.value.trim();
    const learn = document.getElementById('post-learn')?.value.trim();
    if (!post || !performance || !learn) {
        showToast('Please fill all fields', 'error');
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
            <div class="flex justify-end mb-2 md:hidden">
                <button onclick="toggleTopBar()" class="px-4 py-2 rounded bg-blue-600 text-white">☰ Filters</button>
            </div>
            <div id="topbar-collapse" class="hidden md:flex md:flex-wrap gap-3 items-center transition-all duration-300 ease-in-out">
                <input id="search-skills" type="text" placeholder="Search skills..." value="${searchQuery || ''}" class="w-full md:flex-1 p-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600" aria-label="Search skills"/>
                <div class="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    ${renderFilterDropdown('category', 'Category', [...new Set(skills.map(s => s.category || 'Uncategorized'))], filter, type, sort, searchQuery)}
                    ${renderFilterDropdown('tag', 'Tag', [...new Set(skills.flatMap(s => s.tags || []))], filter, type, sort, searchQuery)}
                </div>
                <div class="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onclick="exportData('json')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full md:w-auto">Export JSON</button>
                    <button onclick="exportData('csv')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full md:w-auto">Export CSV</button>
                    <button onclick="toggleSkillView()" class="bg-gray-200 dark:bg-gray-800 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 w-full md:w-auto">${icon}</button>
                    ${!styledToSellMode ? `<button onclick="openStyledModeModal()" class="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 w-full md:w-auto">Unlock Styled Mode</button>` : ''}
                    ${!user ? `<button onclick="openLoginModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full md:w-auto">Login</button>` : `<button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 w-full md:w-auto">Logout</button>`}
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
        <select id="${typeKey}-filter" onchange="renderDashboard(this.value, '${typeKey}', document.getElementById('sort-skills')?.value || '${sort}', document.getElementById('search-skills')?.value || '')" class="p-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600" aria-label="Filter by ${label}">
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
        `<div class="grid grid-cols-1 md:grid-cols-4 gap-5">${skillsArray.map(renderSkillCardGrid).join('')}</div>`;
}

function renderSkillCardGrid(skill) {
    const progress = calculateProgress(skill);
    return `
        <div id="skill-card-${skill.id}" class="skill-card dark:bg-gray-800 p-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full">
            <h2 class="text-lg sm:text-xl font-semibold dark:text-white break-words">${skill.name} (${skill.category || 'Uncategorized'})</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 break-words">${skill.tags?.join(', ') || ''}</p>
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto my-4">
                <svg class="w-full h-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" stroke-width="2" />
                    <circle class="progress-ring" cx="18" cy="18" r="15.9155" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="${progress}, 100" transform="rotate(-90 18 18)" />
                    <text x="18" y="22" text-anchor="middle" fill="currentColor" class="text-sm dark:text-white">${progress}%</text>
                </svg>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">${skill.milestones.filter(m => m.completed).length}/${skill.milestones.length} Milestones</p>
            <p class="text-lg">${getStatusEmoji(progress)}</p>
            <div class="mt-2 flex flex-wrap gap-1">${getBadges(skill).map(b => `<span class="badge">${b}</span>`).join('')}</div>
            <div class="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                <button onclick="viewSkill('${skill.id}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">View</button>
                <button onclick="editSkill('${skill.id}')" class="bg-yellow-600 text-white px-3 py-1 rounded-lg">Edit</button>
                <button onclick="shareSkillCard('${skill.id}')" class="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Share</button>
                <button onclick="deleteSkill('${skill.id}')" class="bg-red-600 text-white px-3 py-1 rounded-lg">Delete</button>
            </div>
        </div>
    `;
}

function renderSkillCardList(skill) {
    const progress = calculateProgress(skill);
    return `
        <div id="skill-card-${skill.id}" class="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border dark:bg-gray-800 dark:text-white w-full">
            <div class="flex-1 min-w-0">
                <h3 class="text-lg sm:text-xl font-semibold break-words">${skill.name} (${skill.category || 'Uncategorized'})</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 break-words">${skill.tags?.join(', ') || ''}</p>
                <p class="text-sm mt-1">${progress}% complete — ${skill.milestones.filter(m => m.completed).length}/${skill.milestones.length} milestones</p>
                <p class="text-lg">${getStatusEmoji(progress)}</p>
                <div class="mt-2 flex flex-wrap gap-1">${getBadges(skill).map(b => `<span class="badge">${b}</span>`).join('')}</div>
            </div>
            <div class="flex flex-wrap gap-2 justify-center sm:justify-end sm:items-center">
                <button onclick="viewSkill('${skill.id}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">View</button>
                <button onclick="editSkill('${skill.id}')" class="bg-yellow-600 text-white px-3 py-1 rounded-lg">Edit</button>
                <button onclick="shareSkillCard('${skill.id}')" class="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Share</button>
                <button onclick="deleteSkill('${skill.id}')" class="bg-red-600 text-white px-3 py-1 rounded-lg">Delete</button>
            </div>
        </div>
    `;
}

function attachSearchInput(filter, type, sort) {
    const searchInput = document.getElementById('search-skills');
    if (!searchInput) return;
    let debounceTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            renderDashboard(filter, type, sort, e.target.value);
        }, 300);
    });
}

function updateCategoryDropdown() {
    const categorySelect = document.getElementById('skill-category');
    if (categorySelect) {
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            ${[...new Set(skills.map(s => s.category || 'Uncategorized'))]
                .map(category => `<option value="${category}">${category}</option>`)
                .join('')}
        `;
    }
}

function renderSkillDetail(skillId) {
    showLoading();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        console.error('Skill not found:', skillId);
        hideLoading();
        return;
    }
    currentSkillId = skillId;
    const main = document.getElementById('main-content');
    if (!main) return;
    const prompts = [
        'What was hard today?',
        'What surprised you?',
        'What did you learn?',
        'How did you feel about your progress?'
    ];
    main.innerHTML = `
        <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
            <button onclick="renderDashboard()" class="mb-4 text-blue-600 dark:text-blue-400 hover:underline" aria-label="Back to dashboard">← Back to Dashboard</button>
            <h2 class="text-2xl font-bold dark:text-white" aria-label="${skill.name}">${skill.name}</h2>
            <p class="text-gray-600 dark:text-gray-400">${getStatusEmoji(calculateProgress(skill))}</p>
            <div class="my-6">
                <h3 class="text-lg font-semibold dark:text-white">Progress Over Time</h3>
                <div class="flex gap-2 mb-2">
                    <button onclick="renderChart('${skill.id}', 'day')" class="bg-gray-200 dark:bg-gray-600 px-4 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500" aria-label="View daily progress">Daily</button>
                    <button onclick="renderChart('${skill.id}', 'week')" class="bg-gray-200 dark:bg-gray-600 px-4 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500" aria-label="View weekly progress">Weekly</button>
                    <button onclick="exportChart('${skill.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" aria-label="Export progress chart">Export Chart</button>
                </div>
                <div class="relative h-[300px] w-full">
                    <canvas id="progressChart" width="400" height="200" class="w-full h-auto" aria-label="Progress chart"></canvas>
                </div>
                <div class="relative w-4/5 mx-auto bg-gray-200 dark:bg-gray-600 rounded h-4 mt-4">
                    <div class="bg-blue-600 h-4 rounded" style="width: ${calculateProgress(skill)}%;"></div>
                </div>
            </div>
            <div class="my-6">
                <h3 class="text-lg font-semibold dark:text-white">Daily Practice</h3>
                <div class="mb-2">
                    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                        <label class="inline-flex items-center mr-2">
                            <input type="checkbox" class="h-5 w-5" onchange="togglePracticeDay('${skill.id}', '${day}')" ${skill.weeklyPractice?.[day] ? 'checked' : ''} aria-label="Toggle ${day} practice">
                            <span class="ml-1 dark:text-white">${day}</span>
                        </label>
                    `).join('')}
                </div>
                <div id="practiceHeatmap" class="flex flex-wrap gap-2" aria-label="Practice heatmap"></div>
                <button onclick="markTodayPracticed('${skill.id}')" class="bg-green-600 text-white px-4 py-2 rounded-lg mt-4 hover:bg-green-700" aria-label="Mark today as practiced">Mark Today as Practiced</button>
            </div>
            <div class="my-6">
                <h3 class="text-lg font-semibold dark:text-white">Milestones</h3>
                <div class="mb-4 flex gap-2 flex-wrap">
                    <input id="milestone-text" type="text" placeholder="Milestone title" class="flex-1 p-2 rounded-lg border dark:bg-gray-900 dark:text-white border-gray-200 dark:border-gray-600" aria-label="Milestone title">
                    <input id="milestone-weight" type="number" min="1" max="10" placeholder="Weight (1-10)" class="w-24 p-2 rounded-lg border dark:bg-gray-900 dark:text-white border-gray-200 dark:border-gray-600" aria-label="Milestone weight">
                    <input id="milestone-deadline" type="date" class="p-2 rounded-lg border dark:bg-gray-900 dark:text-white border-gray-200 dark:border-gray-600" aria-label="Milestone deadline">
                    <button onclick="addMilestone('${skill.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" aria-label="Add milestone">Add Milestone</button>
                </div>
                ${skill.milestones.map(m => `
                    <div class="flex items-center gap-2 p-4 border-b dark:border-gray-600 justify-between">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" ${m.completed ? 'checked' : ''} onchange="toggleMilestone('${skill.id}', '${m.id}')" class="h-5 w-5" aria-label="Toggle milestone ${m.title} completion">
                            <div>
                                <p class="dark:text-white">${m.title} (Weight: ${m.weight || 1})</p>
                                ${m.deadline ? `<p class="text-sm text-gray-500 dark:text-gray-300">Due: ${dayjs(m.deadline).format('MMM D, YYYY')}</p>` : ''}
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="editMilestone('${skill.id}', '${m.id}')" class="text-blue-600 dark:text-blue-400 hover:underline" aria-label="Edit milestone ${m.title}">Edit</button>
                            <button onclick="deleteMilestone('${skill.id}', '${m.id}')" class="text-red-600 dark:text-red-400 hover:underline" aria-label="Delete milestone ${m.title}">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="my-6">
                <h3 class="text-lg font-semibold dark:text-white">Reflection Journal</h3>
                <textarea id="new-reflection" placeholder="${prompts[Math.floor(Math.random() * prompts.length)]}" class="w-full h-24 p-3 rounded-lg border dark:bg-gray-900 dark:text-white border-gray-200 dark:border-gray-600" aria-label="New reflection"></textarea>
                <div class="flex gap-2 mt-4">
                    <button onclick="addReflection('${skill.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-800" aria-label="Save reflection">Save</button>
                </div>
                <div class="mt-4">
                    ${skill.reflections.slice().reverse().map(r => `
                        <div class="p-4 border-b dark:border-gray-600">
                            <p class="text-sm text-gray-500 dark:text-gray-400">${dayjs(r.date).format('MMM D, YYYY HH:mm')}</p>
                            <p class="dark:text-white">${r.text}</p>
                            <div class="flex gap-2 mt-2">
                                <button onclick="editReflection('${skill.id}', '${r.id}')" class="text-blue-600 dark:text-blue-400 hover:underline" aria-label="Edit reflection">Edit</button>
                                <button onclick="deleteReflection('${skill.id}', '${r.id}')" class="text-red-600 dark:text-red-400 hover:underline" aria-label="Delete reflection">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    renderChart(skillId, 'day');
    renderHeatmap(skillId);
    hideLoading();
}

function renderChart(skillId, unit) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill || !skill.progressLog) return;
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;
    if (progressChart) {
        progressChart.destroy();
        progressChart = null;
    }
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    try {
        const progressData = skill.progressLog.map(log => ({
            x: new Date(log.date),
            y: Number(log.progress) || 0
        }));
        progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `${skill.name} Progress`,
                    data: progressData,
                    borderColor: styledToSellMode && skill.tags?.includes('StyledToSell') ? '#ec4899' : '#3b82f6',
                    backgroundColor: styledToSellMode && skill.tags?.includes('StyledToSell') ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: unit,
                            tooltipFormat: 'MMM D, YYYY',
                            displayFormats: {
                                day: 'MMM D',
                                week: 'MMM YYYY'
                            }
                        },
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Progress (%)' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering chart:', error);
        showToast('Error rendering chart', 'error');
    }
}

function exportChart(skillId) {
    const skill = skills.find(s => s.id === skillId);
    const canvas = document.getElementById('progressChart');
    if (!skill || !canvas) return;
    try {
        html2canvas(canvas).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${skill.name}-progress.png`;
            link.href = imgData;
            link.click();
            const pdf = new jsPDF();
            pdf.addImage(imgData, 'PNG', 10, 10, 190, 100);
            pdf.save(`${skill.name}-progress.pdf`);
        });
    } catch (error) {
        console.error('Error exporting chart:', error);
        showToast('Error exporting chart', 'error');
    }
}

function renderHeatmap(skillId) {
    const skill = skills.find(s => s.id === skillId);
    const heatmap = document.getElementById('practiceHeatmap');
    if (!skill || !heatmap) return;
    heatmap.innerHTML = '';
    const today = dayjs();
    for (let i = 29; i >= 0; i--) {
        const date = today.subtract(i, 'day').format('YYYY-MM-DD');
        const practiced = skill.practiceHistory?.includes(date);
        const dayElement = document.createElement('div');
        dayElement.className = `heatmap-day ${practiced ? 'practiced' : ''}`;
        dayElement.title = date;
        heatmap.appendChild(dayElement);
    }
}

function addSkill() {
    const input = document.getElementById('new-skill');
    const category = document.getElementById('skill-category')?.value || 'Uncategorized';
    const tags = document.getElementById('skill-tags')?.value.split(',').map(t => t.trim()).filter(t => t);
    if (!input?.value.trim()) {
        showToast('Skill name cannot be empty', 'error');
        return;
    }
    skills.push({
        id: uuidv4(),
        name: input.value.trim(),
        category,
        tags,
        milestones: [],
        reflections: [],
        progressLog: [],
        practiceHistory: [],
        weeklyPractice: {},
        createdAt: new Date().toISOString()
    });
    input.value = '';
    document.getElementById('skill-tags').value = '';
    closeAddSkillModal();
    saveState();
    renderDashboard();
}

function openAddSkillModal() {
    document.getElementById('add-skill-modal')?.classList.remove('hidden');
}

function closeAddSkillModal() {
    document.getElementById('add-skill-modal')?.classList.add('hidden');
    document.getElementById('new-skill').value = '';
    document.getElementById('skill-category').value = '';
    document.getElementById('skill-tags').value = '';
}

let skillToEdit = null;

function editSkill(skillId) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    skillToEdit = skillId;
    document.getElementById('edit-skill-name').value = skill.name;
    document.getElementById('edit-skill-category').value = skill.category || '';
    document.getElementById('edit-skill-tags').value = (skill.tags || []).join(', ');
    document.getElementById('edit-skill-modal')?.classList.remove('hidden');
}

function closeEditSkillModal() {
    document.getElementById('edit-skill-modal')?.classList.add('hidden');
    skillToEdit = null;
}

function saveEditedSkill() {
    if (!skillToEdit) return;
    const skill = skills.find(s => s.id === skillToEdit);
    if (!skill) return;
    skill.name = document.getElementById('edit-skill-name')?.value.trim();
    skill.category = document.getElementById('edit-skill-category')?.value.trim() || 'Uncategorized';
    skill.tags = document.getElementById('edit-skill-tags')?.value.split(',').map(t => t.trim()).filter(t => t);
    saveState();
    renderDashboard();
    closeEditSkillModal();
}

async function deleteSkill(skillId) {
    const confirmed = await showToastConfirm('Are you sure you want to delete this skill?');
    if (!confirmed) return;
    skills = skills.filter(s => s.id !== skillId);
    saveState();
    renderDashboard();
    showToast('Skill deleted successfully');
}

function togglePracticeDay(skillId, day) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    if (!skill.weeklyPractice) skill.weeklyPractice = {};
    skill.weeklyPractice[day] = !skill.weeklyPractice[day];
    saveState();
    renderSkillDetail(skillId);
}

function addMilestone(skillId) {
    const title = document.getElementById('milestone-text')?.value.trim();
    const weight = Math.max(1, Math.min(10, parseInt(document.getElementById('milestone-weight')?.value) || 1));
    const deadline = document.getElementById('milestone-deadline')?.value;
    if (!title) {
        showToast('Milestone title cannot be empty', 'error');
        return;
    }
    if (deadline && dayjs(deadline).isBefore(dayjs())) {
        showToast('Deadline must be in the future', 'error');
        return;
    }
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    skill.milestones.push({
        id: uuidv4(),
        title,
        weight,
        deadline,
        completed: false,
        createdAt: new Date().toISOString()
    });
    saveState();
    renderSkillDetail(skillId);
    if (deadline && Notification.permission === 'granted') {
        scheduleNotification(skillId, skill.milestones[skill.milestones.length - 1].id, title, deadline);
    }
}

function scheduleNotification(skillId, milestoneId, title, deadline) {
    const dueDate = dayjs(deadline);
    const notificationDate = dueDate.subtract(1, 'day');
    const timeUntilNotification = notificationDate.diff(dayjs());
    if (timeUntilNotification > 0) {
        const cappedTimeout = Math.min(timeUntilNotification, 2147483647);
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification(`Reminder: Milestone "${title}" is due tomorrow!`);
            }
        }, cappedTimeout);
    }
}

function editMilestone(skillId, milestoneId) {
    const skill = skills.find(s => s.id === skillId);
    const milestone = skill?.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    const newTitle = prompt('Edit milestone title:', milestone.title);
    if (newTitle?.trim()) {
        milestone.title = newTitle.trim();
        const newDeadline = prompt('Edit deadline (YYYY-MM-DD):', milestone.deadline || '');
        if (newDeadline) {
            if (dayjs(newDeadline).isBefore(dayjs())) {
                showToast('Deadline must be in the future', 'error');
                return;
            }
            milestone.deadline = newDeadline;
        } else {
            delete milestone.deadline;
        }
        saveState();
        renderSkillDetail(skillId);
        if (newDeadline && Notification.permission === 'granted') {
            scheduleNotification(skillId, milestoneId, newTitle, newDeadline);
        }
    }
}

async function deleteMilestone(skillId, milestoneId) {
    const confirmed = await showToastConfirm('Are you sure you want to delete this milestone?');
    if (!confirmed) return;
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    skill.milestones = skill.milestones.filter(m => m.id !== milestoneId);
    saveState();
    renderSkillDetail(skillId);
    showToast('Milestone deleted successfully');
}

function toggleMilestone(skillId, milestoneId) {
    const skill = skills.find(s => s.id === skillId);
    const milestone = skill?.milestones.find(m => m.id === milestoneId);
    if (!skill || !milestone) return;
    milestone.completed = !milestone.completed;
    if (milestone.completed) {
        userXP += 10 * (milestone.weight || 1);
        if (userXP >= userLevel * 100) {
            userLevel++;
            if (Notification.permission === 'granted') {
                new Notification(`🎉 Leveled up to Level ${userLevel}!`);
            } else {
                showToast(`🎉 Leveled up to Level ${userLevel}!`);
            }
        }
    }
    logDailyProgress(skill);
    saveState();
    renderSkillDetail(skillId);
}

function markTodayPracticed(skillId) {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    const today = dayjs().format('YYYY-MM-DD');
    if (!skill.practiceHistory) skill.practiceHistory = [];
    if (skill.practiceHistory.includes(today)) {
        showToast('Today is already marked as practiced');
        return;
    }
    skill.practiceHistory.push(today);
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (lastActivityDate === yesterday) {
        streak++;
        if (streak >= 5 && Notification.permission === 'granted') {
            new Notification('🎉 You’ve maintained a 5-day streak!');
        }
    } else if (lastActivityDate !== today) {
        streak = 1;
        if (lastActivityDate && Notification.permission === 'granted') {
            new Notification('😢 Streak broken! Start a new one today.');
        }
    }
    lastActivityDate = today;
    saveState();
    renderSkillDetail(skillId);
}

function addReflection(skillId) {
    const text = document.getElementById('new-reflection')?.value.trim();
    if (!text) {
        showToast('Reflection cannot be empty', 'error');
        return;
    }
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    skill.reflections.push({
        id: uuidv4(),
        text,
        date: new Date().toISOString()
    });
    document.getElementById('new-reflection').value = '';
    saveState();
    renderSkillDetail(skillId);
}

function editReflection(skillId, reflectionId) {
    const skill = skills.find(s => s.id === skillId);
    const reflection = skill?.reflections.find(r => r.id === reflectionId);
    if (!reflection) return;
    const newText = prompt('Edit reflection:', reflection.text);
    if (newText?.trim()) {
        reflection.text = newText.trim();
        saveState();
        renderSkillDetail(skillId);
    }
}

async function deleteReflection(skillId, reflectionId) {
    const confirmed = await showToastConfirm('Are you sure you want to delete this reflection?');
    if (!confirmed) return;
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;
    skill.reflections = skill.reflections.filter(r => r.id !== reflectionId);
    saveState();
    renderSkillDetail(skillId);
    showToast('Reflection deleted successfully');
}

let currentShareData = { name: '', progress: 0, image: null };

function shareSkillCard(skillId) {
    const skill = skills.find(s => s.id === skillId);
    const card = document.getElementById(`skill-card-${skillId}`);
    if (!skill || !card) return;
    const progress = calculateProgress(skill);
    const message = `I’ve made ${progress}% progress on ${skill.name}! #MomentumApp`;
    html2canvas(card).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        currentShareData = { name: skill.name, progress, message, image: imgData };
        document.getElementById('share-message').innerText = message;
        document.getElementById('share-modal')?.classList.remove('hidden');
    }).catch(error => {
        console.error('Error capturing skill card:', error);
        showToast('Error preparing share', 'error');
    });
}

function closeShareModal() {
    document.getElementById('share-modal')?.classList.add('hidden');
}

function shareTo(platform) {
    const { message } = currentShareData;
    const url = encodeURIComponent('https://momentum.app');
    let link = '';
    if (platform === 'twitter') {
        link = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${url}`;
    } else if (platform === 'facebook') {
        link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    } else if (platform === 'linkedin') {
        link = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${encodeURIComponent(message)}`;
    }
    if (link) window.open(link, '_blank');
    closeShareModal();
}

function copyShareLink() {
    navigator.clipboard.writeText('https://momentum.app').then(() => {
        showToast('🔗 Link copied to clipboard');
        closeShareModal();
    }).catch(() => {
        showToast('Error copying link', 'error');
    });
}

function downloadCardImage() {
    const link = document.createElement('a');
    link.download = `${currentShareData.name}-summary.png`;
    link.href = currentShareData.image;
    link.click();
}

function exportData(format) {
    let data, filename, type;
    if (format === 'json') {
        data = JSON.stringify(skills, null, 2);
        filename = 'momentum-skills.json';
        type = 'application/json';
    } else {
        let csv = 'ID,Name,Category,Tags,Milestones,Reflections,PracticeDays\n';
        skills.forEach(skill => {
            csv += `"${skill.id}","${skill.name.replace(/"/g, '""')}","${skill.category || 'Uncategorized'}","${skill.tags?.join(';') || ''}",${skill.milestones.length},${skill.reflections.length},${skill.practiceHistory?.length || 0}\n`;
        });
        data = csv;
        filename = 'momentum-skills.csv';
        type = 'text/csv';
    }
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function viewSkill(skillId) {
    renderSkillDetail(skillId);
}

function toggleSkillView() {
    const currentView = localStorage.getItem('skillView') || 'grid';
    localStorage.setItem('skillView', currentView === 'grid' ? 'list' : 'grid');
    renderDashboard();
}

function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark');
    const iconBtn = document.getElementById('dark-mode-toggle');
    if (iconBtn) {
        iconBtn.className = `fas ${darkMode ? 'fa-sun' : 'fa-moon'} text-gray-600 dark:text-gray-300`;
    }
    const textBtn = document.querySelector('button[onclick*="toggleDarkMode"]');
    if (textBtn) {
        textBtn.innerHTML = darkMode ? '☀️ Toggle Light Mode' : '🌙 Toggle Dark Mode';
    }
    saveState();
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
}

function openFeedback() {
    document.getElementById('feedback-modal')?.classList.remove('hidden');
}

function closeFeedback() {
    document.getElementById('feedback-modal')?.classList.add('hidden');
}

function submitFeedback() {
    const text = document.getElementById('feedback-text')?.value.trim();
    if (!text) {
        showToast('Please enter some feedback', 'error');
        return;
    }
    showToast('Thank you for your feedback!');
    closeFeedback();
}

function openHelp() {
    document.getElementById('help-modal')?.classList.remove('hidden');
}

function closeHelp() {
    document.getElementById('help-modal')?.classList.add('hidden');
}

window.onload = async () => {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    if (darkMode) {
        document.body.classList.add('dark');
        const iconBtn = document.getElementById('dark-mode-toggle');
        if (iconBtn) iconBtn.className = 'fas fa-sun text-gray-600 dark:text-gray-300';
    }
    document.getElementById('fab')?.addEventListener('click', openAddSkillModal);
    if (styledToSellMode) {
        document.body.classList.add('styled-mode');
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
        user = authUser;
        await syncUserData();
    }
    if (!localStorage.getItem('hasOnboarded')) {
        document.getElementById('onboarding-modal')?.classList.remove('hidden');
    }
    renderDashboard();
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('[PWA] Service Worker registered', reg))
        .catch(err => console.error('[PWA] Registration failed', err));
}

if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('standalone');
}