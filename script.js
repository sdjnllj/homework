let currentDate = new Date();
let currentView = 'week';
let isAuthorized = false;
const AUTH_TIMEOUT = 5 * 60 * 1000; // 5分钟超时
let authTimer = null;

// 获取指定日期的格式化字符串
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('zh-CN', options);
}

// 切换视图
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${view}-btn`).classList.add('active');
    updateDisplay();
}

// 显示上一个周期
function showPrevious() {
    switch(currentView) {
        case 'week':
            currentDate.setDate(currentDate.getDate() - 7);
            break;
        case 'month':
            currentDate.setMonth(currentDate.getMonth() - 1);
            break;
        case 'year':
            currentDate.setFullYear(currentDate.getFullYear() - 1);
            break;
    }
    updateDisplay();
}

// 显示下一个周期
function showNext() {
    switch(currentView) {
        case 'week':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
        case 'month':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        case 'year':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
    }
    updateDisplay();
}

// 返回当前
function showCurrent() {
    currentDate = new Date();
    updateDisplay();
}

// 更新显示
async function updateDisplay() {
    const periodText = document.getElementById('current-period');
    const calendarView = document.getElementById('calendar-view');
    
    // 获取最新数据
    const homeworkHistory = await getHomeworkHistory();
    
    switch(currentView) {
        case 'week':
            showWeekView(periodText, calendarView, homeworkHistory);
            break;
        case 'month':
            showMonthView(periodText, calendarView, homeworkHistory);
            break;
        case 'year':
            showYearView(periodText, calendarView, homeworkHistory);
            break;
    }
    updateStatistics(homeworkHistory);
}

// 显示周视图
function showWeekView(periodText, calendarView, homeworkHistory) {
    const dates = generateWeekDates();
    
    periodText.textContent = `${formatDate(dates[0])} - ${formatDate(dates[6])}`;
    
    calendarView.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>星期</th>
                    <th>作业完成情况</th>
                </tr>
            </thead>
            <tbody>
                ${dates.map(date => {
                    const dateString = date.toLocaleDateString('zh-CN');
                    return `
                        <tr>
                            <td>${formatDate(date)}</td>
                            <td>${getWeekdayName(date)}</td>
                            <td class="checkbox-cell">
                                <input type="checkbox" 
                                    id="homework-${dateString}" 
                                    ${homeworkHistory[dateString] ? 'checked' : ''}
                                    ${date > new Date() ? 'disabled' : ''}>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    // 添加复选框事件监听
    dates.forEach(date => {
        const dateString = date.toLocaleDateString('zh-CN');
        const checkbox = document.getElementById(`homework-${dateString}`);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                saveHomeworkStatus(dateString, checkbox.checked);
                updateStatistics();
            });
        }
    });
}

// 显示月视图
function showMonthView(periodText, calendarView, homeworkHistory) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    periodText.textContent = `${year}年${month + 1}月`;
    
    let html = '<div class="month-grid">';
    
    // 添加星期头部
    ['日', '一', '二', '三', '四', '五', '六'].forEach(day => {
        html += `<div class="day header">${day}</div>`;
    });
    
    // 添加空白天数
    for (let i = 0; i < firstDay.getDay(); i++) {
        html += '<div class="day empty"></div>';
    }
    
    // 按周分组的日期
    let currentWeek = [];
    let weekNumber = 0;
    
    // 添加日期
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const currentDate = new Date(year, month, date);
        const dateString = currentDate.toLocaleDateString('zh-CN');
        const isToday = new Date().toLocaleDateString() === dateString;
        
        currentWeek.push(currentDate);
        
        // 如果是周六或最后一天，完成当前周
        if (currentDate.getDay() === 6 || date === lastDay.getDate()) {
            const weekCompletionRate = getWeekCompletionRate(currentWeek, homeworkHistory);
            const weekClass = weekCompletionRate >= 80 ? 'completion-good' : 
                            weekCompletionRate >= 60 ? 'completion-medium' : 
                            'completion-poor';
            
            currentWeek.forEach(weekDate => {
                const weekDateString = weekDate.toLocaleDateString('zh-CN');
                const isToday = new Date().toLocaleDateString() === weekDateString;
                
                html += `
                    <div class="day ${isToday ? 'today' : ''} ${weekClass}" 
                         onclick="switchToWeek(${year}, ${month}, ${weekDate.getDate()})">
                        <div>${weekDate.getDate()}</div>
                        <input type="checkbox" 
                            id="homework-${weekDateString}" 
                            ${homeworkHistory[weekDateString] ? 'checked' : ''}
                            ${weekDate > new Date() ? 'disabled' : ''}>
                    </div>
                `;
            });
            
            currentWeek = [];
            weekNumber++;
        }
    }
    
    html += '</div>';
    calendarView.innerHTML = html;
    
    // 添加复选框事件监听
    addCheckboxListeners(year, month, lastDay.getDate());
}

// 显示年视图
function showYearView(periodText, calendarView, homeworkHistory) {
    const year = currentDate.getFullYear();
    
    periodText.textContent = `${year}年`;
    
    let html = '<div class="year-grid">';
    
    // 生成12个月的卡片
    for (let month = 0; month < 12; month++) {
        const monthData = getMonthCompletionRate(year, month, homeworkHistory);
        const completionClass = monthData.rate >= 80 ? 'completion-good' : 
                              monthData.rate >= 60 ? 'completion-medium' : 
                              'completion-poor';
        
        html += `
            <div class="month-card ${completionClass}" onclick="switchToMonth(${month})">
                <h4>${month + 1}月</h4>
                <p>完成率: ${monthData.rate}%</p>
                <p>完成: ${monthData.completed}/${monthData.total}天</p>
            </div>
        `;
    }
    
    html += '</div>';
    calendarView.innerHTML = html;
}

// 获取某月的完成率
function getMonthCompletionRate(year, month, history) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let completed = 0;
    let total = 0;
    
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const currentDate = new Date(year, month, date);
        if (currentDate <= new Date()) {
            const dateString = currentDate.toLocaleDateString('zh-CN');
            if (dateString in history) {
                if (history[dateString]) completed++;
                total++;
            }
        }
    }
    
    return {
        completed,
        total,
        rate: total ? Math.round((completed / total) * 100) : 0
    };
}

// 生成指定周的日期数据
function generateWeekDates() {
    const dates = [];
    const weekStart = new Date(currentDate);
    
    // 调整到本周的周一
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 如果是周日，则回退到上周一
    weekStart.setDate(diff);
    
    // 生成一周的日期
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        dates.push(date);
    }
    
    return dates;
}

// 更新统计信息
function updateStatistics(homeworkHistory) {
    const total = Object.keys(homeworkHistory).length;
    const completed = Object.values(homeworkHistory).filter(status => status).length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('completion-rate').textContent = `${rate}%`;
}

// 导出数据
async function exportData() {
    const homeworkHistory = await getHomeworkHistory();
    const data = Object.entries(homeworkHistory)
        .map(([date, status]) => `${date},${status ? '已完成' : '未完成'}`)
        .join('\n');
    
    const blob = new Blob([`日期,完成情况\n${data}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '作业完成记录.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// 清理旧数据
async function clearOldData() {
    if (confirm('确定要清理90天前的数据吗？')) {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            const query = new AV.Query('Homework');
            query.lessThan('date', ninetyDaysAgo.toLocaleDateString('zh-CN'));
            const oldRecords = await query.find();
            
            // 批量删除旧记录
            await AV.Object.destroyAll(oldRecords);
            
            // 更新本地存储
            const homeworkHistory = JSON.parse(localStorage.getItem('homeworkHistory') || '{}');
            const filteredHistory = Object.entries(homeworkHistory)
                .filter(([date]) => new Date(date) > ninetyDaysAgo)
                .reduce((acc, [date, status]) => {
                    acc[date] = status;
                    return acc;
                }, {});
                
            localStorage.setItem('homeworkHistory', JSON.stringify(filteredHistory));
            updateDisplay();
            alert('已清理90天前的数据');
        } catch (error) {
            console.error('清理数据失败:', error);
            alert('清理数据失败，请检查网络连接');
        }
    }
}

// 获取星期几的中文名称
function getWeekdayName(date) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return '星期' + weekdays[date.getDay()];
}

// 保存作业完成状态
async function saveHomeworkStatus(date, status) {
    if (!isAuthorized) {
        pendingCheckbox = document.getElementById(`homework-${date}`);
        pendingDate = date;
        document.getElementById('pin-verify-modal').style.display = 'block';
        return;
    }
    
    try {
        // 创建或更新 LeanCloud 对象
        const query = new AV.Query('Homework');
        query.equalTo('date', date);
        let homework = await query.first();
        
        if (!homework) {
            // 如果不存在，创建新记录
            homework = new Homework();
            homework.set('date', date);
        }
        
        homework.set('completed', status);
        homework.set('timestamp', Date.now());
        await homework.save();
        
        // 同时保存到本地存储作为备份
        let homeworkHistory = JSON.parse(localStorage.getItem('homeworkHistory') || '{}');
        homeworkHistory[date] = status;
        localStorage.setItem('homeworkHistory', JSON.stringify(homeworkHistory));
    } catch (error) {
        console.error('保存失败:', error);
        if (error.code === 403) {
            alert('没有权限保存数据，请检查安全域名设置');
        } else if (error.code === 141) {
            alert('服务器连接失败，请检查网络连接');
        } else {
            alert(`保存失败: ${error.message}`);
        }
        // 恢复复选框状态
        const checkbox = document.getElementById(`homework-${date}`);
        if (checkbox) {
            checkbox.checked = !status;
        }
    }
}

// 添加测试数据
function addTestData() {
    // 清除现有数据
    localStorage.removeItem('homeworkHistory');
    
    let homeworkHistory = {};
    
    // 获取今天的日期
    const today = new Date();
    
    // 生成过去90天的测试数据（大约3个月）
    for (let i = 90; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateString = date.toLocaleDateString('zh-CN');
        
        // 生成更真实的完成情况：
        // 周一到周四：90%概率完成
        // 周五：85%概率完成
        // 周六：70%概率完成
        // 周日：60%概率完成
        const dayOfWeek = date.getDay();
        let completionProbability;
        
        switch(dayOfWeek) {
            case 0: // 周日
                completionProbability = 0.6;
                break;
            case 5: // 周五
                completionProbability = 0.85;
                break;
            case 6: // 周六
                completionProbability = 0.7;
                break;
            default: // 周一到周四
                completionProbability = 0.9;
        }
        
        // 每月1-5号的完成率稍低（月初懈怠）
        const dayOfMonth = date.getDate();
        if (dayOfMonth <= 5) {
            completionProbability -= 0.1;
        }
        
        homeworkHistory[dateString] = Math.random() < completionProbability;
    }
    
    localStorage.setItem('homeworkHistory', JSON.stringify(homeworkHistory));
    console.log('测试数据已生成:', homeworkHistory);
}

// 修改初始化部分
document.addEventListener('DOMContentLoaded', () => {
    checkPinSetup();
    addTestData();
    updateDisplay();
});

// 获取某一周的完成率
function getWeekCompletionRate(weekDates, history) {
    let completed = 0;
    let total = 0;
    
    weekDates.forEach(date => {
        if (date <= new Date()) {
            const dateString = date.toLocaleDateString('zh-CN');
            if (dateString in history) {
                if (history[dateString]) completed++;
                total++;
            }
        }
    });
    
    return total ? Math.round((completed / total) * 100) : 0;
}

// 切换到指定月份
function switchToMonth(month) {
    currentDate.setMonth(month);
    switchView('month');
}

// 切换到指定周
function switchToWeek(year, month, day) {
    currentDate = new Date(year, month, day);
    switchView('week');
}

// 添加复选框事件监听
function addCheckboxListeners(year, month, lastDay) {
    for (let date = 1; date <= lastDay; date++) {
        const currentDate = new Date(year, month, date);
        const dateString = currentDate.toLocaleDateString('zh-CN');
        const checkbox = document.getElementById(`homework-${dateString}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                saveHomeworkStatus(dateString, checkbox.checked);
                updateStatistics();
            });
        }
    }
}

// 检查是否需要设置PIN码
function checkPinSetup() {
    const hasPin = localStorage.getItem('homework_pin');
    if (!hasPin) {
        document.getElementById('pin-setup-modal').style.display = 'block';
    }
}

// 设置PIN码
function setupPin() {
    const pinInput = document.getElementById('pin-setup-input');
    const pin = pinInput.value;
    
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        alert('请输入4位数PIN码');
        return;
    }
    
    // 存储加密后的PIN码
    localStorage.setItem('homework_pin', btoa(pin));
    document.getElementById('pin-setup-modal').style.display = 'none';
    alert('PIN码设置成功！');
}

// 验证PIN码
function verifyPin() {
    const pinInput = document.getElementById('pin-verify-input');
    const inputPin = pinInput.value;
    const storedPin = atob(localStorage.getItem('homework_pin'));
    
    if (inputPin === storedPin) {
        isAuthorized = true;
        document.getElementById('pin-verify-modal').style.display = 'none';
        pinInput.value = '';
        startAuthTimer();
        // 执行等待中的操作
        if (pendingCheckbox) {
            pendingCheckbox.checked = !pendingCheckbox.checked;
            saveHomeworkStatus(pendingDate, pendingCheckbox.checked);
            updateStatistics();
            pendingCheckbox = null;
            pendingDate = null;
        }
    } else {
        alert('PIN码错误，请重试');
        pinInput.value = '';
    }
}

// 关闭验证对话框
function closeVerifyModal() {
    const modal = document.getElementById('pin-verify-modal');
    modal.style.display = 'none';
    const pinInput = document.getElementById('pin-verify-input');
    pinInput.value = '';
    // 恢复复选框状态
    if (pendingCheckbox) {
        pendingCheckbox.checked = !pendingCheckbox.checked;
        pendingCheckbox = null;
        pendingDate = null;
    }
}

// 开始授权计时器
function startAuthTimer() {
    if (authTimer) {
        clearTimeout(authTimer);
    }
    authTimer = setTimeout(() => {
        isAuthorized = false;
    }, AUTH_TIMEOUT);
}

// 存储待处理的复选框操作
let pendingCheckbox = null;
let pendingDate = null;

// 添加复选框事件监听
function addCheckboxListeners(year, month, lastDay) {
    for (let date = 1; date <= lastDay; date++) {
        const currentDate = new Date(year, month, date);
        const dateString = currentDate.toLocaleDateString('zh-CN');
        const checkbox = document.getElementById(`homework-${dateString}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                saveHomeworkStatus(dateString, checkbox.checked);
                updateStatistics();
            });
        }
    }
}

// 显示修改PIN码对话框
function showChangePinModal() {
    document.getElementById('pin-change-modal').style.display = 'block';
    // 清空输入框
    document.getElementById('current-pin-input').value = '';
    document.getElementById('new-pin-input').value = '';
    document.getElementById('confirm-pin-input').value = '';
}

// 关闭修改PIN码对话框
function closeChangeModal() {
    document.getElementById('pin-change-modal').style.display = 'none';
}

// 修改PIN码
function changePin() {
    const currentPin = document.getElementById('current-pin-input').value;
    const newPin = document.getElementById('new-pin-input').value;
    const confirmPin = document.getElementById('confirm-pin-input').value;
    const storedPin = atob(localStorage.getItem('homework_pin'));

    // 验证当前PIN码
    if (currentPin !== storedPin) {
        alert('当前PIN码输入错误');
        return;
    }

    // 验证新PIN码格式
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
        alert('新PIN码必须是4位数字');
        return;
    }

    // 验证两次输入是否一致
    if (newPin !== confirmPin) {
        alert('两次输入的新PIN码不一致');
        return;
    }

    // 不能与原PIN码相同
    if (newPin === currentPin) {
        alert('新PIN码不能与当前PIN码相同');
        return;
    }

    // 保存新PIN码
    localStorage.setItem('homework_pin', btoa(newPin));
    
    // 关闭对话框并提示成功
    closeChangeModal();
    alert('PIN码修改成功！');
    
    // 重置授权状态
}

// 获取作业数据
async function getHomeworkHistory() {
    try {
        // 从 LeanCloud 获取数据
        const query = new AV.Query('Homework');
        query.addDescending('date');
        const results = await query.find();
        
        // 转换数据格式
        const homeworkHistory = {};
        results.forEach(homework => {
            homeworkHistory[homework.get('date')] = homework.get('completed');
        });
        
        return homeworkHistory;
    } catch (error) {
        console.error('获取数据失败:', error);
        // 如果获取失败，使用本地存储的备份数据
        return JSON.parse(localStorage.getItem('homeworkHistory') || '{}');
    }
} 