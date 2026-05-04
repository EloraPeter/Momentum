// js/modules/native-features.js
// Complete native features for Momentum

console.log('🚀 Native Features loading...');

// ============================================
// 1. HAPTIC FEEDBACK
// ============================================
export function vibrate(pattern = 10) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
        console.log('Vibration:', pattern);
    }
}

export function initHaptics() {
    console.log('Haptics initialized');
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && !btn.closest('.no-haptic')) {
            vibrate(5);
        }
    });
    
    // Success/error haptics
    window.successHaptic = () => vibrate([50]);
    window.errorHaptic = () => vibrate([100, 50, 100]);
    window.warningHaptic = () => vibrate([30, 50, 30]);
}

// ============================================
// 2. OFFLINE STATUS
// ============================================
export function initOfflineStatus() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.style.cssText = `
        position:fixed; 
        bottom:70px; 
        right:10px; 
        z-index:9999; 
        padding:5px 10px; 
        border-radius:20px; 
        font-size:11px; 
        background:#10b981; 
        color:white;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        pointer-events: none;
    `;
    indicator.textContent = '● Online';
    document.body.appendChild(indicator);
    
    window.addEventListener('online', () => {
        indicator.style.background = '#10b981';
        indicator.textContent = '● Online';
        if (window.showToast) window.showToast('📡 Back online!');
        vibrate(50);
    });
    
    window.addEventListener('offline', () => {
        indicator.style.background = '#f59e0b';
        indicator.textContent = '○ Offline';
        if (window.showToast) window.showToast('📴 Offline mode - changes saved locally', 'info');
        vibrate([30, 50, 30]);
    });
    
    console.log('Offline status indicator added');
}

// ============================================
// 3. VOICE INPUT
// ============================================
export function initVoiceInput() {
    console.log('Setting up voice input...');
    
    const addButton = () => {
        const textarea = document.getElementById('reflection-text');
        if (textarea && !document.getElementById('voice-btn')) {
            const btn = document.createElement('button');
            btn.id = 'voice-btn';
            btn.innerHTML = '🎤 Speak';
            btn.className = 'bg-purple-600 text-white px-3 py-1 rounded-lg text-sm mt-2 hover:bg-purple-700 transition-colors';
            btn.onclick = () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'en-US';
                    recognition.interimResults = false;
                    recognition.maxAlternatives = 1;
                    
                    // Show listening indicator
                    const originalPlaceholder = textarea.placeholder;
                    textarea.placeholder = '🎤 Listening...';
                    vibrate(50);
                    
                    recognition.onresult = (e) => {
                        const transcript = e.results[0][0].transcript;
                        textarea.value = transcript;
                        textarea.placeholder = originalPlaceholder;
                        if (window.showToast) window.showToast('Voice added! ✨');
                        vibrate([50]);
                    };
                    
                    recognition.onerror = (e) => {
                        textarea.placeholder = originalPlaceholder;
                        if (window.showToast) window.showToast('Voice recognition error', 'error');
                        if (window.errorHaptic) window.errorHaptic();
                    };
                    
                    recognition.start();
                    if (window.showToast) window.showToast('🎤 Listening... Speak now', 'info');
                } else {
                    if (window.showToast) window.showToast('Voice not supported in this browser', 'error');
                }
            };
            textarea.parentNode.insertBefore(btn, textarea.nextSibling);
            console.log('Voice button added');
        }
    };
    
    setTimeout(addButton, 1000);
    const observer = new MutationObserver(addButton);
    observer.observe(document.body, { childList: true, subtree: true });
}

// ============================================
// 4. BACKUP & RESTORE
// ============================================
export function backupData() {
    const data = {
        skills: window.skills || [],
        userXP: window.userXP || 0,
        userLevel: window.userLevel || 1,
        streak: window.streak || 0,
        styledLogs: window.styledLogs || [],
        styledToSellMode: window.styledToSellMode || false,
        darkMode: window.darkMode || false,
        date: new Date().toISOString(),
        version: '1.0.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `momentum_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    if (window.showToast) window.showToast('Backup saved! 💾');
    if (window.successHaptic) window.successHaptic();
}

export function restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.skills && window.updateSkills) {
                window.updateSkills(data.skills);
            }
            if (data.userXP !== undefined) window.userXP = data.userXP;
            if (data.userLevel !== undefined) window.userLevel = data.userLevel;
            if (data.streak !== undefined) window.streak = data.streak;
            if (data.styledLogs) window.styledLogs = data.styledLogs;
            if (data.styledToSellMode !== undefined) window.styledToSellMode = data.styledToSellMode;
            if (data.darkMode !== undefined && window.toggleDarkMode) {
                if ((data.darkMode && !document.body.classList.contains('dark')) ||
                    (!data.darkMode && document.body.classList.contains('dark'))) {
                    window.toggleDarkMode();
                }
            }
            
            if (window.saveState) window.saveState();
            if (window.showToast) window.showToast('Restored successfully! 🔄 Refresh page.');
            if (window.successHaptic) window.successHaptic();
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            if (window.showToast) window.showToast('Invalid backup file', 'error');
            if (window.errorHaptic) window.errorHaptic();
        }
    };
    reader.readAsText(file);
}

// ============================================
// 5. PDF EXPORT
// ============================================
export async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        if (window.showToast) window.showToast('PDF library loading...', 'error');
        return;
    }
    
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Momentum Report', 20, 25);
    
    // Stats
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
    doc.text(`Level ${window.userLevel || 1} • ${window.userXP || 0} XP • ${window.streak || 0} day streak`, 20, 65);
    doc.text(`Total Skills: ${window.skills?.length || 0}`, 20, 75);
    
    // Skills progress
    let y = 95;
    doc.setFontSize(14);
    doc.text('Skills Progress', 20, y);
    y += 10;
    
    if (window.skills && window.calculateProgress) {
        const sortedSkills = [...window.skills].sort((a, b) => 
            window.calculateProgress(b) - window.calculateProgress(a)
        );
        
        sortedSkills.slice(0, 15).forEach((skill, i) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const progress = window.calculateProgress(skill);
            doc.setFontSize(10);
            doc.text(`${i + 1}. ${skill.name.substring(0, 35)}`, 20, y);
            doc.text(`${progress}%`, 150, y);
            
            // Progress bar
            doc.setFillColor(59, 130, 246);
            doc.rect(20, y + 2, (progress * 50) / 100, 3, 'F');
            
            y += 10;
        });
    }
    
    doc.save(`momentum_report_${new Date().toISOString().split('T')[0]}.pdf`);
    if (window.showToast) window.showToast('PDF Report ready! 📄');
    if (window.successHaptic) window.successHaptic();
}

// ============================================
// 6. SOCIAL SHARING
// ============================================
export async function shareAchievement(achievementText) {
    const shareData = {
        title: 'Momentum Achievement 🎉',
        text: achievementText,
        url: window.location.href
    };
    
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            if (window.showToast) window.showToast('Shared! +5 XP bonus ✨');
            if (window.userXP !== undefined) window.userXP += 5;
            if (window.saveState) window.saveState();
            if (window.successHaptic) window.successHaptic();
        } catch (e) {
            console.log('Share cancelled');
        }
    } else {
        navigator.clipboard.writeText(`${achievementText}\n\n${window.location.href}`);
        if (window.showToast) window.showToast('Copied to clipboard! 📋');
        if (window.successHaptic) window.successHaptic();
    }
}

// ============================================
// 7. PUSH NOTIFICATIONS (Enhanced)
// ============================================
let notificationPermissionGranted = false;

export async function initNotifications() {
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return;
    }
    
    // Check if we already have permission
    if (Notification.permission === 'granted') {
        notificationPermissionGranted = true;
        setupNotificationScheduler();
        console.log('Notifications enabled');
    } else if (Notification.permission !== 'denied') {
        // Ask for permission with better timing
        document.addEventListener('click', function requestPermission() {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    notificationPermissionGranted = true;
                    setupNotificationScheduler();
                    if (window.showToast) window.showToast('🔔 Notifications enabled!');
                    new Notification('Welcome to Momentum! 🚀', {
                        body: 'We\'ll remind you to keep your streak alive!',
                        icon: '/images/icon-192x192.png',
                        tag: 'welcome'
                    });
                }
                document.removeEventListener('click', requestPermission);
            });
        }, { once: true });
    }
    
    // Also check for practice reminders every hour
    setInterval(checkAndNotify, 3600000);
}

function setupNotificationScheduler() {
    // Request background sync for offline notifications
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            registration.sync.register('momentum-reminder').catch(err => {
                console.log('Background sync not supported:', err);
            });
        });
    }
}

function checkAndNotify() {
    if (!notificationPermissionGranted) return;
    
    const hour = new Date().getHours();
    const today = new Date().toISOString().split('T')[0];
    const hasPracticed = window.skills?.some(s => s.practiceHistory?.includes(today));
    
    // Check at 8 PM if not practiced
    if (!hasPracticed && hour === 20) {
        new Notification('⏰ Momentum Reminder', {
            body: "Don't break your streak! Log today's practice.",
            icon: '/images/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'daily-reminder'
        });
    }
    
    // Morning motivation at 9 AM
    if (hour === 9 && !hasPracticed) {
        new Notification('🌅 Good Morning!', {
            body: `Your ${window.streak || 0} day streak is waiting. Ready to grow today?`,
            icon: '/images/icon-192x192.png',
            tag: 'morning-motivation'
        });
    }
    
    // Celebrate streak milestone
    if (window.streak && [5, 10, 20, 30, 50, 100].includes(window.streak)) {
        new Notification('🔥 Streak Milestone!', {
            body: `Amazing! You've reached a ${window.streak}-day streak! Keep going! 🎉`,
            icon: '/images/icon-192x192.png',
            tag: `streak-${window.streak}`
        });
    }
}

// ============================================
// 8. DEEP LINKING
// ============================================
export function initDeepLinking() {
    // Handle deep links on startup
    const handleDeepLink = () => {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const skillId = params.get('skill');
        
        console.log('Deep link detected:', { action, skillId, hash });
        
        if (action === 'add-skill') {
            setTimeout(() => {
                if (window.openAddSkillModal) window.openAddSkillModal();
                if (window.showToast) window.showToast('➕ Add a new skill');
            }, 1000);
        } else if (action === 'stats') {
            setTimeout(() => {
                if (window.showToast) window.showToast('📊 Check your stats!');
                // Scroll to stats section
                const statsElement = document.querySelector('.xp-bar');
                if (statsElement) statsElement.scrollIntoView({ behavior: 'smooth' });
            }, 1000);
        } else if (skillId && window.viewSkill) {
            setTimeout(() => {
                window.viewSkill(skillId);
                if (window.showToast) window.showToast('🎯 Opening skill...');
            }, 1000);
        } else if (hash === '#styled-mode') {
            setTimeout(() => {
                if (window.openStyledModeModal) window.openStyledModeModal();
            }, 1000);
        }
    };
    
    // Handle deep links on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleDeepLink);
    } else {
        handleDeepLink();
    }
    
    // Listen for navigation changes (for SPAs)
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action === 'add-skill' && window.openAddSkillModal) {
            window.openAddSkillModal();
        }
    });
}

// ============================================
// 9. SPLASH SCREEN
// ============================================
export function initSplashScreen() {
    // Create splash screen element
    const splash = document.createElement('div');
    splash.id = 'splash-screen';
    splash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        transition: opacity 0.5s ease-out;
        flex-direction: column;
        gap: 20px;
    `;
    
    splash.innerHTML = `
        <div style="text-align: center; animation: fadeInUp 0.6s ease-out;">
            <img src="/images/icon-192x192.png" alt="Momentum" style="width: 100px; height: 100px; margin: 0 auto; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <h1 style="color: white; font-size: 32px; margin-top: 20px; font-weight: bold;">Momentum</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Build your skills daily</p>
            <div style="margin-top: 30px;">
                <div style="width: 40px; height: 40px; margin: 0 auto; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        </div>
        <style>
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(splash);
    
    // Hide splash screen after content loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.remove();
            }, 500);
        }, 800);
    });
}

// ============================================
// 10. WIDGET SUPPORT
// ============================================
export function updateWidgetData() {
    const widgetData = {
        streak: window.streak || 0,
        todayProgress: getTodayProgress(),
        skillsCount: window.skills?.length || 0,
        lastUpdated: Date.now()
    };
    
    localStorage.setItem('momentum_widget_data', JSON.stringify(widgetData));
    
    // For Android Widget (via WebView)
    if (window.nitron && window.nitron.updateWidget) {
        window.nitron.updateWidget({
            streak: widgetData.streak,
            text: `${widgetData.streak} day streak! 🔥`,
            skillsCount: widgetData.skillsCount
        });
    }
}

function getTodayProgress() {
    const today = new Date().toISOString().split('T')[0];
    const practicedToday = window.skills?.some(s => s.practiceHistory?.includes(today));
    return practicedToday ? 'Practiced today! ✅' : 'Practice today! 🎯';
}

// ============================================
// 11. ADD UI BUTTONS
// ============================================
export function addFeatureButtons() {
    setTimeout(() => {
        // Add backup/restore button to sidebar
        const sidebar = document.querySelector('#mobile-sidebar .flex.flex-col.gap-4');
        if (sidebar && !document.getElementById('backup-sidebar-btn')) {
            const backupBtn = document.createElement('button');
            backupBtn.id = 'backup-sidebar-btn';
            backupBtn.innerHTML = '💾 Backup / Restore';
            backupBtn.className = 'text-left text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100';
            backupBtn.onclick = () => {
                showBackupDialog();
                if (window.toggleSidebar) window.toggleSidebar();
            };
            sidebar.appendChild(backupBtn);
        }
        
        // Add PDF export to desktop nav
        const desktopNav = document.querySelector('header .hidden.sm\\:flex.items-center.gap-4');
        if (desktopNav && !document.getElementById('pdf-export-btn')) {
            const pdfBtn = document.createElement('button');
            pdfBtn.id = 'pdf-export-btn';
            pdfBtn.innerHTML = '📄 Export PDF';
            pdfBtn.className = 'bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700 transition-colors';
            pdfBtn.onclick = () => exportToPDF();
            desktopNav.appendChild(pdfBtn);
        }
        
        // Add share achievement button
        const header = document.querySelector('header .hidden.sm\\:flex.items-center.gap-4');
        if (header && !document.getElementById('share-achievement-btn')) {
            const shareBtn = document.createElement('button');
            shareBtn.id = 'share-achievement-btn';
            shareBtn.innerHTML = '🎉 Share';
            shareBtn.className = 'bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 transition-colors';
            shareBtn.onclick = () => {
                const message = `I'm level ${window.userLevel || 1} on Momentum with a ${window.streak || 0} day streak! 🚀`;
                shareAchievement(message);
            };
            header.appendChild(shareBtn);
        }
        
        console.log('✅ Feature buttons added!');
    }, 2000);
}

function showBackupDialog() {
    const modal = document.createElement('div');
    modal.id = 'backup-dialog';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn';
    modal.style.animation = 'fadeIn 0.3s ease-out';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl transform transition-all">
            <h3 class="text-lg font-bold mb-4 dark:text-white">Backup & Restore</h3>
            <div class="space-y-3">
                <button onclick="window.backupData && window.backupData()" class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    💾 Backup to File
                </button>
                <label class="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-center block cursor-pointer hover:bg-green-700 transition-colors">
                    📂 Restore from Backup
                    <input type="file" accept=".json" class="hidden" onchange="window.restoreBackup && window.restoreBackup(this)">
                </label>
                <button onclick="this.closest('#backup-dialog').remove()" class="w-full mt-3 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add fadeIn animation if not exists
    if (!document.querySelector('#fadeIn-style')) {
        const style = document.createElement('style');
        style.id = 'fadeIn-style';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// 12. INITIALIZE EVERYTHING
// ============================================
export function initNativeFeatures() {
    console.log('🚀 Initializing native features...');
    
    // Always show splash screen first
    initSplashScreen();
    
    // Initialize all features
    initHaptics();
    initOfflineStatus();
    initVoiceInput();
    initNotifications();
    initDeepLinking();
    addFeatureButtons();
    updateWidgetData();
    
    // Expose functions globally
    window.backupData = backupData;
    window.restoreBackup = restoreBackup;
    window.exportToPDF = exportToPDF;
    window.shareAchievement = shareAchievement;
    
    // Update widget periodically
    setInterval(updateWidgetData, 3600000);
    
    // Check for pending notifications on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkAndNotify();
        }
    });
    
    console.log('✅ Native features ready!');
}

// Export all functions
export default {
    initNativeFeatures,
    vibrate,
    initHaptics,
    initOfflineStatus,
    initVoiceInput,
    backupData,
    restoreBackup,
    exportToPDF,
    shareAchievement,
    initNotifications,
    initDeepLinking,
    initSplashScreen,
    updateWidgetData
};