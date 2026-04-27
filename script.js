/* ========================================
   HabitForge - Premium Habit Tracker
   JavaScript Application
   ======================================== */

// ========================================
// Data & State Management
// ========================================

const DEFAULT_DATA = {
    user: {
        name: 'User',
        avatar: null,
        level: 1,
        xp: 0,
        theme: 'light',
        notifications: true
    },
    habits: [],
    achievements: [],
    goals: []
};

const CATEGORIES = {
    fitness: { icon: '🏃', color: '#FF6B35', name: 'Fitness' },
    study: { icon: '📚', color: '#5E7CE2', name: 'Study' },
    health: { icon: '💪', color: '#34C759', name: 'Health' },
    reading: { icon: '📖', color: '#AF52DE', name: 'Reading' },
    finance: { icon: '💰', color: '#30D158', name: 'Finance' },
    meditation: { icon: '🧘', color: '#64D2FF', name: 'Meditation' }
};

const ACHIEVEMENTS = {
    'first-step': { icon: '🎯', name: 'First Step', description: 'Complete your first habit', condition: (data) => data.habits.some(h => Object.keys(h.completions).length > 0) },
    'week-warrior': { icon: '🏆', name: 'Week Warrior', description: 'Maintain a 7-day streak', condition: (data) => data.habits.some(h => getStreak(h.completions) >= 7) },
    'month-master': { icon: '👑', name: 'Month Master', description: 'Maintain a 30-day streak', condition: (data) => data.habits.some(h => getStreak(h.completions) >= 30) },
    'perfect-week': { icon: '⭐', name: 'Perfect Week', description: '100% weekly completion', condition: (data) => getWeeklyCompletionRate() === 100 },
    'habit-builder': { icon: '🏗️', name: 'Habit Builder', description: 'Create 5+ habits', condition: (data) => data.habits.length >= 5 }
};

const LEVELS = [
    { level: 1, xp: 0, title: 'Seed' },
    { level: 2, xp: 100, title: 'Sprout' },
    { level: 3, xp: 300, title: 'Sapling' },
    { level: 4, xp: 600, title: 'Tree' },
    { level: 5, xp: 1000, title: 'Forest' },
    { level: 6, xp: 1500, title: 'Garden' },
    { level: 7, xp: 2100, title: 'Oasis' },
    { level: 8, xp: 2800, title: 'Mountain' },
    { level: 9, xp: 3600, title: 'Summit' },
    { level: 10, xp: 5000, title: 'Legend' }
];

let appData = loadData();
let currentCategoryFilter = 'all';
let currentMonth = new Date();

// ========================================
// Data Persistence
// ========================================

function loadData() {
    const saved = localStorage.getItem('habitforge-data');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading data:', e);
            return { ...DEFAULT_DATA };
        }
    }
    return { ...DEFAULT_DATA };
}

function saveData() {
    localStorage.setItem('habitforge-data', JSON.stringify(appData));
}

function generateId() {
    return 'habit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// ========================================
// Utility Functions
// ========================================

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getStreak(completions) {
    if (!completions) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check if today is completed
    const todayStr = currentDate.toISOString().split('T')[0];
    if (completions[todayStr]) {
        streak = 1;
        currentDate.setDate(currentDate.getDate() - 1);
    } else {
        // Check yesterday - if not completed, streak is 0
        currentDate.setDate(currentDate.getDate() - 1);
        const yesterdayStr = currentDate.toISOString().split('T')[0];
        if (!completions[yesterdayStr]) {
            return 0;
        }
        streak = 1;
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Count consecutive days
    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (completions[dateStr]) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

function getCompletionRate(completions) {
    if (!completions || Object.keys(completions).length === 0) return 0;
    
    const created = appData.user.createdAt || getToday();
    const today = new Date();
    const createdDate = new Date(created);
    
    const daysSinceCreation = Math.max(1, Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24)));
    const completedDays = Object.values(completions).filter(v => v).length;
    
    return Math.round((completedDays / daysSinceCreation) * 100);
}

function getWeeklyCompletionRate() {
    const today = new Date();
    let total = 0;
    let completed = 0;
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        appData.habits.forEach(habit => {
            total++;
            if (habit.completions && habit.completions[dateStr]) {
                completed++;
            }
        });
    }
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function getTodayCompleted() {
    const today = getToday();
    return appData.habits.filter(h => h.completions && h.completions[today]).length;
}

function getCurrentStreak() {
    let maxStreak = 0;
    appData.habits.forEach(habit => {
        const streak = getStreak(habit.completions);
        if (streak > maxStreak) maxStreak = streak;
    });
    return maxStreak;
}

function getLevel(xp) {
    let level = 1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xp) {
            level = LEVELS[i].level;
            break;
        }
    }
    return level;
}

function getLevelTitle(level) {
    const levelData = LEVELS.find(l => l.level === level);
    return levelData ? levelData.title : 'Seed';
}

function getXpForNextLevel(currentLevel) {
    const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
    return nextLevel ? nextLevel.xp : LEVELS[LEVELS.length - 1].xp;
}

function addXP(amount) {
    appData.user.xp += amount;
    const newLevel = getLevel(appData.user.xp);
    
    if (newLevel > appData.user.level) {
        appData.user.level = newLevel;
        showAchievement('level-up', { level: newLevel, title: getLevelTitle(newLevel) });
    }
    
    updateXPDisplay();
}

function checkAchievements() {
    Object.keys(ACHIEVEMENTS).forEach(id => {
        if (!appData.achievements.includes(id)) {
            if (ACHIEVEMENTS[id].condition(appData)) {
                appData.achievements.push(id);
                showAchievement(id);
            }
        }
    });
}

// ========================================
// UI Rendering Functions
// ========================================

function renderHabits(containerId, filter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let habits = appData.habits;
    
    // Apply category filter
    if (filter !== 'all') {
        habits = habits.filter(h => h.category === filter);
    }
    
    // Apply search filter
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value) {
        const query = searchInput.value.toLowerCase();
        habits = habits.filter(h => h.name.toLowerCase().includes(query));
    }
    
    if (habits.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No habits yet. Create your first habit to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = habits.map(habit => {
        const category = CATEGORIES[habit.category] || CATEGORIES.fitness;
        const today = getToday();
        const isCompleted = habit.completions && habit.completions[today];
        const streak = getStreak(habit.completions);
        const completionRate = getCompletionRate(habit.completions);
        
        // Get last completed date
        let lastCompleted = 'Never';
        if (habit.completions) {
            const dates = Object.keys(habit.completions).filter(d => habit.completions[d]).sort().reverse();
            if (dates.length > 0) {
                const lastDate = new Date(dates[0]);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) lastCompleted = 'Today';
                else if (diffDays === 1) lastCompleted = 'Yesterday';
                else lastCompleted = `${diffDays} days ago`;
            }
        }
        
        // Calculate progress for circular chart
        const circumference = 2 * Math.PI * 40;
        const offset = circumference - (completionRate / 100) * circumference;
        
        return `
            <div class="habit-card" data-category="${habit.category}" data-id="${habit.id}">
                <div class="habit-card-header">
                    <div class="habit-info">
                        <div class="habit-icon">${category.icon}</div>
                        <div>
                            <div class="habit-name">${habit.name}</div>
                            <div class="habit-category">${category.name}</div>
                        </div>
                    </div>
                    <div class="habit-menu">
                        <button class="habit-menu-btn" onclick="toggleHabitMenu('${habit.id}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                            </svg>
                        </button>
                        <div class="habit-menu-dropdown" id="menu-${habit.id}">
                            <button onclick="editHabit('${habit.id}')">Edit</button>
                            <button class="danger" onclick="confirmDeleteHabit('${habit.id}')">Delete</button>
                        </div>
                    </div>
                </div>
                
                <div class="habit-progress">
                    <div class="circular-progress">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle class="bg" cx="50" cy="50" r="40"/>
                            <circle class="progress" cx="50" cy="50" r="40" 
                                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}"/>
                        </svg>
                        <div class="percentage">${completionRate}%</div>
                    </div>
                </div>
                
                <div class="habit-stats">
                    <div class="habit-streak">
                        <span class="streak-fire">🔥</span>
                        <span>${streak} day${streak !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="habit-percentage">${completionRate}% rate</div>
                </div>
                
                <button class="habit-complete-btn ${isCompleted ? 'completed' : ''}" 
                    onclick="toggleHabitCompletion('${habit.id}')">
                    ${isCompleted ? '✓ Completed' : 'Mark Complete'}
                </button>
                
                <div class="habit-last-completed">Last: ${lastCompleted}</div>
            </div>
        `;
    }).join('');
}

function renderDashboard() {
    // Update stats
    document.getElementById('current-streak').textContent = getCurrentStreak();
    document.getElementById('today-completed').textContent = getTodayCompleted();
    document.getElementById('total-habits-today').textContent = appData.habits.length;
    document.getElementById('weekly-rate').textContent = getWeeklyCompletionRate() + '%';
    document.getElementById('total-xp').textContent = appData.user.xp;
    document.getElementById('level-display').textContent = appData.user.level;
    
    // Render today's habits
    renderHabits('dashboard-habits', 'all');
}

function renderAllHabits() {
    renderHabits('all-habits', currentCategoryFilter);
}

function renderCalendar() {
    const container = document.getElementById('calendar-days');
    const monthLabel = document.getElementById('calendar-month');
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    monthLabel.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const today = getToday();
    let html = '';
    
    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count completions for this day
        let completedCount = 0;
        let totalHabits = appData.habits.length;
        
        appData.habits.forEach(habit => {
            if (habit.completions && habit.completions[dateStr]) {
                completedCount++;
            }
        });
        
        let classes = ['calendar-day'];
        
        if (dateStr === today) {
            classes.push('today');
        }
        
        if (totalHabits > 0) {
            if (completedCount === totalHabits) {
                classes.push('completed');
            } else if (completedCount > 0) {
                classes.push('partial');
            } else if (date < new Date(today)) {
                classes.push('missed');
            }
        }
        
        html += `<div class="${classes.join(' ')}">${day}</div>`;
    }
    
    container.innerHTML = html;
}

function renderProgress() {
    // Weekly chart
    const weeklyContainer = document.getElementById('weekly-chart');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    let maxValue = 0;
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        let completed = 0;
        appData.habits.forEach(habit => {
            if (habit.completions && habit.completions[dateStr]) {
                completed++;
            }
        });
        
        data.push({ day: days[date.getDay()], value: completed });
        if (completed > maxValue) maxValue = completed;
    }
    
    if (maxValue === 0) maxValue = 1;
    
    weeklyContainer.innerHTML = data.map(d => `
        <div class="bar-item">
            <div class="bar-value">${d.value}</div>
            <div class="bar" style="height: ${(d.value / maxValue) * 150}px"></div>
            <div class="bar-label">${d.day}</div>
        </div>
    `).join('');
    
    // Category breakdown
    const categoryContainer = document.getElementById('category-chart');
    const legendContainer = document.getElementById('category-legend');
    
    const categoryData = {};
    appData.habits.forEach(habit => {
        if (!categoryData[habit.category]) {
            categoryData[habit.category] = 0;
        }
        categoryData[habit.category] += Object.keys(habit.completions || {}).filter(k => habit.completions[k]).length;
    });
    
    const total = Object.values(categoryData).reduce((a, b) => a + b, 0) || 1;
    let segments = '';
    let legend = '';
    let offset = 0;
    
    Object.entries(categoryData).forEach(([cat, count]) => {
        if (count > 0) {
            const category = CATEGORIES[cat];
            const percentage = (count / total) * 100;
            const dashArray = (percentage / 100) * 283;
            
            segments += `<circle class="donut-segment" cx="90" cy="90" r="45" 
                stroke="${category.color}" 
                stroke-dasharray="${dashArray} ${283 - dashArray}"
                stroke-dashoffset="${-offset}"/>`;
            
            legend += `
                <div class="legend-category">
                    <span class="legend-color" style="background: ${category.color}"></span>
                    <span>${category.name} ${Math.round(percentage)}%</span>
                </div>
            `;
            
            offset += dashArray;
        }
    });
    
    categoryContainer.innerHTML = `
        <svg class="donut-svg" viewBox="0 0 180 180">
            ${segments || '<circle cx="90" cy="90" r="45" fill="none" stroke="var(--bg-tertiary)" stroke-width="30"/>'}
        </svg>
    `;
    legendContainer.innerHTML = legend || '<p style="color: var(--text-tertiary)">No data yet</p>';
    
    // Monthly stats
    document.getElementById('month-completion').textContent = getWeeklyCompletionRate() + '%';
    document.getElementById('best-streak').textContent = getCurrentStreak();
    
    let totalCompletions = 0;
    appData.habits.forEach(habit => {
        totalCompletions += Object.values(habit.completions || {}).filter(v => v).length;
    });
    document.getElementById('total-completions').textContent = totalCompletions;
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    
    if (appData.goals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No goals set yet. Set goals to stay motivated!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appData.goals.map(goal => {
        const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
        
        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div>
                        <div class="goal-title">${goal.name}</div>
                        <div class="goal-target">${goal.current} / ${goal.target}</div>
                    </div>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="goal-progress-text">
                    <span>${progress}% complete</span>
                    <span>${goal.target - goal.current} to go</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    const unlockedIds = appData.achievements || [];
    
    const achievementsList = Object.entries(ACHIEVEMENTS).map(([id, achievement]) => {
        const isUnlocked = unlockedIds.includes(id);
        
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-badge ${isUnlocked ? 'unlocked' : ''}">
                    ${achievement.icon}
                </div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                </div>
                <div class="achievement-status">
                    ${isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = achievementsList || '<p style="color: var(--text-tertiary)">No achievements available</p>';
}

function saveGoal(event) {
    event.preventDefault();
    
    const id = document.getElementById('goal-id').value;
    const name = document.getElementById('goal-name').value;
    const target = parseInt(document.getElementById('goal-target').value);
    const current = parseInt(document.getElementById('goal-current').value);
    
    if (!name.trim() || !target) return;
    
    if (id) {
        // Update existing goal
        const goal = appData.goals.find(g => g.id === id);
        if (goal) {
            goal.name = name;
            goal.target = target;
            goal.current = current;
        }
    } else {
        // Create new goal
        const newGoal = {
            id: generateId(),
            name: name,
            target: target,
            current: current || 0
        };
        appData.goals.push(newGoal);
    }
    
    saveData();
    closeModal('add-goal');
    renderGoals();
    
    // Reset form
    document.getElementById('goal-form').reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-modal-title').textContent = 'Add New Goal';
}

function renderSettings() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.checked = appData.user.theme === 'dark';
    
    // Notification toggle
    const notifToggle = document.getElementById('notification-toggle');
    notifToggle.checked = appData.user.notifications;
    
    // Display name
    const nameInput = document.getElementById('display-name');
    nameInput.value = appData.user.name;
    
    // Update user info
    document.getElementById('user-name').textContent = appData.user.name;
    document.getElementById('user-level').textContent = appData.user.level;
    document.getElementById('user-avatar').textContent = appData.user.name.charAt(0).toUpperCase();
}

function updateXPDisplay() {
    document.getElementById('xp-display').textContent = appData.user.xp + ' XP';
    document.getElementById('total-xp').textContent = appData.user.xp;
    document.getElementById('level-display').textContent = appData.user.level;
    document.getElementById('user-level').textContent = appData.user.level;
}

// ========================================
// Page Navigation
// ========================================

function showPage(pageName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update page content
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    const page = document.getElementById('page-' + pageName);
    if (page) {
        page.classList.add('active');
    }
    
    // Render page-specific content
    switch (pageName) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'habits':
            renderAllHabits();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'progress':
            renderProgress();
            break;
        case 'goals':
            renderGoals();
            break;
        case 'achievements':
            renderAchievements();
            break;
        case 'settings':
            renderSettings();
            break;
    }
    
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ========================================
// Modal Functions
// ========================================

function openModal(modalId) {
    const modal = document.getElementById('modal-' + modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById('modal-' + modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset form
    if (modalId === 'add-habit') {
        document.getElementById('habit-form').reset();
        document.getElementById('habit-id').value = '';
        document.getElementById('modal-title').textContent = 'Add New Habit';
        selectCategory('fitness');
    }
}

function selectCategory(category) {
    document.querySelectorAll('.category-option').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.category === category) {
            btn.classList.add('selected');
        }
    });
    document.getElementById('habit-category').value = category;
}

// ========================================
// Habit Management
// ========================================

function saveHabit(event) {
    event.preventDefault();
    
    const id = document.getElementById('habit-id').value;
    const name = document.getElementById('habit-name').value;
    const category = document.getElementById('habit-category').value;
    const reminder = document.getElementById('habit-reminder').value;
    
    if (!name.trim()) return;
    
    if (id) {
        // Update existing habit
        const habit = appData.habits.find(h => h.id === id);
        if (habit) {
            habit.name = name;
            habit.category = category;
            habit.reminder = reminder;
        }
    } else {
        // Create new habit
        const newHabit = {
            id: generateId(),
            name: name,
            category: category,
            reminder: reminder,
            createdAt: getToday(),
            completions: {}
        };
        appData.habits.push(newHabit);
        
        // Check for achievement
        checkAchievements();
    }
    
    saveData();
    closeModal('add-habit');
    renderAllHabits();
    renderDashboard();
    updateAIWidget();
}

function editHabit(id) {
    const habit = appData.habits.find(h => h.id === id);
    if (!habit) return;
    
    document.getElementById('habit-id').value = habit.id;
    document.getElementById('habit-name').value = habit.name;
    document.getElementById('habit-reminder').value = habit.reminder || '';
    selectCategory(habit.category);
    
    document.getElementById('modal-title').textContent = 'Edit Habit';
    openModal('add-habit');
    
    // Close menu
    toggleHabitMenu(id);
}

function toggleHabitMenu(id) {
    const menu = document.getElementById('menu-' + id);
    if (menu) {
        menu.parentElement.classList.toggle('open');
    }
}

function confirmDeleteHabit(id) {
    const habit = appData.habits.find(h => h.id === id);
    if (!habit) return;
    
    document.getElementById('confirm-message').textContent = `Are you sure you want to delete "${habit.name}"?`;
    document.getElementById('confirm-action').onclick = () => deleteHabit(id);
    openModal('confirm');
    
    // Close menu
    toggleHabitMenu(id);
}

function deleteHabit(id) {
    appData.habits = appData.habits.filter(h => h.id !== id);
    saveData();
    closeModal('confirm');
    renderAllHabits();
    renderDashboard();
    updateAIWidget();
}

function toggleHabitCompletion(id) {
    const habit = appData.habits.find(h => h.id === id);
    if (!habit) return;
    
    const today = getToday();
    
    if (!habit.completions) {
        habit.completions = {};
    }
    
    if (habit.completions[today]) {
        // Uncomplete - remove XP
        delete habit.completions[today];
        addXP(-10); // Subtract XP for uncompleting
        
        // Check if first completion of the day was bonus
        const completedToday = getTodayCompleted();
        if (completedToday === 0) {
            addXP(-15); // Remove bonus XP if no completions left
        }
    } else {
        // Complete
        habit.completions[today] = true;
        addXP(10);
        
        // Bonus XP for first completion of the day
        const completedToday = getTodayCompleted();
        if (completedToday === 1) {
            addXP(15);
        }
        
        // Check achievements
        checkAchievements();
    }
    
    saveData();
    renderAllHabits();
    renderDashboard();
    updateAIWidget();
}

function filterByCategory(category) {
    currentCategoryFilter = category;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    renderAllHabits();
}

function filterHabits(query) {
    renderAllHabits();
    renderDashboard();
}

// ========================================
// Calendar Functions
// ========================================

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

// ========================================
// Settings Functions
// ========================================

function toggleTheme() {
    const isDark = document.getElementById('theme-toggle').checked;
    appData.user.theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', appData.user.theme);
    saveData();
}

function toggleNotifications() {
    appData.user.notifications = document.getElementById('notification-toggle').checked;
    saveData();
}

function updateName(name) {
    if (name.trim()) {
        appData.user.name = name.trim();
        saveData();
        renderSettings();
    }
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habitforge-data-' + getToday() + '.json';
    a.click();
    
    URL.revokeObjectURL(url);
}

function resetData() {
    document.getElementById('confirm-message').textContent = 'Are you sure you want to reset all data? This cannot be undone.';
    document.getElementById('confirm-action').onclick = () => {
        appData = { ...DEFAULT_DATA };
        saveData();
        closeModal('confirm');
        location.reload();
    };
    openModal('confirm');
}

// ========================================
// AI Widget
// ========================================

function toggleAIWidget() {
    const widget = document.getElementById('ai-widget');
    widget.classList.toggle('open');
}

function updateAIWidget() {
    const rate = getWeeklyCompletionRate();
    const streak = getCurrentStreak();
    
    let message = '';
    if (rate >= 90) {
        message = `You're ${rate}% consistent this week 🔥 Keep going!`;
    } else if (rate >= 70) {
        message = `${rate}% this week! Almost there 💪`;
    } else if (rate >= 50) {
        message = `${rate}% this week. You can do better!`;
    } else {
        message = `Only ${rate}% this week. Let's turn it around!`;
    }
    
    if (streak > 0) {
        message += ` ${streak} day streak!`;
    }
    
    document.getElementById('ai-message').textContent = message;
}

// ========================================
// Achievement Display
// ========================================

function showAchievement(id, data = {}) {
    const achievement = ACHIEVEMENTS[id];
    if (!achievement) return;
    
    document.getElementById('achievement-icon').textContent = achievement.icon;
    document.getElementById('achievement-name').textContent = achievement.name;
    document.getElementById('achievement-description').textContent = achievement.description;
    
    openModal('achievement');
}

// ========================================
// Landing Page Functions
// ========================================

function openApp() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('app-dashboard').classList.remove('hidden');
    
    // Initialize app
    renderDashboard();
    renderSettings();
    updateAIWidget();
    
    // Apply theme
    if (appData.user.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('theme-toggle').checked = true;
    }
}

function toggleFaq(button) {
    const item = button.parentElement;
    item.classList.toggle('active');
}

function toggleMobileMenu() {
    // Mobile menu toggle functionality
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize user created date
    if (!appData.user.createdAt) {
        appData.user.createdAt = getToday();
        saveData();
    }
    
    // Close habit menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.habit-menu')) {
            document.querySelectorAll('.habit-menu.open').forEach(menu => {
                menu.classList.remove('open');
            });
        }
    });
    
    // Initialize AI message
    updateAIWidget();
});

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            const id = modal.id.replace('modal-', '');
            closeModal(id);
        });
    }
});