/**
 * FlowTimer 弹窗界面控制器
 * 与后台脚本通信，维持定时器状态
 */
class SimpleFlowTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = 25 * 60;
        this.totalTime = 25 * 60;
        this.currentMode = 'work';
        this.settings = {
            workTime: 25 * 60, // 25分钟 = 1500秒
            breakTime: 5 * 60, // 5分钟 = 300秒
            soundEnabled: true // 音效开关，默认开启
        };
        
        this.autoCloseTimer = null; // 自动关闭计时器ID
        
        this.init();
    }
    
    async init() {
        await this.loadState();
        this.updateDisplay();
        this.updateButtons();
        this.bindEvents();
        this.startUIUpdate();
        this.setupMessageListener();
    }
    
    async loadState() {
        try {
            const response = await this.sendMessage({ type: 'GET_STATE' });
            if (response.success) {
                const state = response.state;
                this.isRunning = state.isRunning;
                this.isPaused = state.isPaused;
                this.timeLeft = state.timeLeft;
                this.totalTime = state.totalTime;
                this.currentMode = state.currentMode;
                this.settings = state.settings;
            }
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }
    
    sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response || { success: false });
            });
        });
    }
    
    bindEvents() {
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.clearAutoCloseTimer(); // 清除自动关闭计时器
            this.reset();
        });
        
        // 设置相关事件
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.clearAutoCloseTimer(); // 清除自动关闭计时器
            this.openSettings();
        });
        document.getElementById('backToMain').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetToDefault').addEventListener('click', () => {
            this.clearAutoCloseTimer(); // 清除自动关闭计时器
            this.resetToDefault();
        });
        
        // 点击弹窗外部关闭
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }
    
    async togglePlayPause() {
        if (this.isRunning) {
            await this.pause();
        } else {
            await this.start();
        }
    }
    
    async start() {
        const response = await this.sendMessage({ type: 'START_TIMER' });
        if (response.success) {
            this.isRunning = true;
            this.isPaused = false;
            this.updateButtons();
            // 播放开始音效
            this.playSound('timerStartSound');
            
            // 设置2秒后自动关闭界面
            this.setAutoCloseTimer();
        }
    }
    
    async pause() {
        const response = await this.sendMessage({ type: 'PAUSE_TIMER' });
        if (response.success) {
            this.isRunning = false;
            this.isPaused = true;
            this.updateButtons();
            this.clearAutoCloseTimer(); // 清除自动关闭计时器
        }
    }
    
    setAutoCloseTimer() {
        // 清除之前的计时器
        this.clearAutoCloseTimer();
        
        // 设置新的2秒自动关闭计时器
        this.autoCloseTimer = setTimeout(() => {
            window.close();
        }, 2000);
    }
    
    clearAutoCloseTimer() {
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }
    
    async reset() {
        const response = await this.sendMessage({ type: 'RESET_TIMER' });
        if (response.success) {
            this.isRunning = false;
            this.isPaused = false;
            await this.loadState();
            this.updateDisplay();
            this.updateButtons();
        }
    }
    
    startUIUpdate() {
        // 每秒更新一次界面显示
        this.intervalId = setInterval(async () => {
            await this.loadState();
            this.updateDisplay();
            this.updateButtons();
        }, 1000);
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timeDisplay').textContent = timeString;
        
        // 更新模式显示
        const modeText = this.currentMode === 'work' ? '专注时间' : '休息时间';
        document.querySelector('.mode').textContent = modeText;
    }
    
    updateButtons() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        
        if (this.isRunning) {
            playPauseBtn.textContent = '暂停';
        } else if (this.isPaused) {
            playPauseBtn.textContent = '继续';
        } else {
            playPauseBtn.textContent = '开始';
        }
    }
    
    showMessage(text, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        
        // 创建 Toast 元素
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = text;
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
    
    playSound(soundType) {
        // 检查音效开关是否开启
        if (!this.settings.soundEnabled) {
            return;
        }
        
        try {
            const audioElement = document.getElementById(soundType);
            if (audioElement) {
                // 重置音频到开始位置
                audioElement.currentTime = 0;
                // 播放音效
                audioElement.play().catch(error => {
                    console.log('音效播放失败:', error);
                    // 如果自动播放被阻止，可以显示提示让用户手动播放
                });
            }
        } catch (error) {
            console.error('播放音效时出错:', error);
        }
    }
    
    setupMessageListener() {
        // 监听来自后台脚本的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'PLAY_SOUND') {
                this.playSound(message.soundType);
            }
        });
    }
    
    async saveSettings() {
        this.clearAutoCloseTimer(); // 清除自动关闭计时器
        try {
            const workTime = parseInt(document.getElementById('workTime').value) || 0;
            const workUnit = document.getElementById('workUnit').value;
            const breakTime = parseInt(document.getElementById('breakTime').value) || 0;
            const breakUnit = document.getElementById('breakUnit').value;
            const soundEnabled = document.getElementById('soundEnabled').checked;
            
            // 转换为总秒数
            const workTimeInSeconds = workUnit === 'minutes' ? workTime * 60 : workTime;
            const breakTimeInSeconds = breakUnit === 'minutes' ? breakTime * 60 : breakTime;
            
            // 验证输入
            if (workTimeInSeconds < 1) {
                this.showMessage('专注时间必须大于0', 'error');
                return;
            }
            
            if (breakTimeInSeconds < 1) {
                this.showMessage('休息时间必须大于0', 'error');
                return;
            }
            
            // 保存设置到后台
            const response = await this.sendMessage({
                type: 'UPDATE_SETTINGS',
                settings: { 
                    workTime: workTimeInSeconds, 
                    breakTime: breakTimeInSeconds,
                    soundEnabled: soundEnabled
                }
            });
            
            if (response.success) {
                this.settings.workTime = workTimeInSeconds;
                this.settings.breakTime = breakTimeInSeconds;
                this.settings.soundEnabled = soundEnabled;
                this.closeSettings();
                this.showMessage('设置已保存！', 'success');
            } else {
                this.showMessage('保存设置失败，请重试', 'error');
            }
            
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showMessage('保存设置失败，请重试', 'error');
        }
    }
    
    openSettings() {
        // 将秒数转换为合适的显示格式
        const workMinutes = Math.floor(this.settings.workTime / 60);
        const workSeconds = this.settings.workTime % 60;
        const breakMinutes = Math.floor(this.settings.breakTime / 60);
        const breakSeconds = this.settings.breakTime % 60;
        
        // 如果秒数为0，显示分钟；否则显示秒数
        if (workSeconds === 0) {
            document.getElementById('workTime').value = workMinutes;
            document.getElementById('workUnit').value = 'minutes';
        } else {
            document.getElementById('workTime').value = this.settings.workTime;
            document.getElementById('workUnit').value = 'seconds';
        }
        
        if (breakSeconds === 0) {
            document.getElementById('breakTime').value = breakMinutes;
            document.getElementById('breakUnit').value = 'minutes';
        } else {
            document.getElementById('breakTime').value = this.settings.breakTime;
            document.getElementById('breakUnit').value = 'seconds';
        }
        
        // 设置音效开关状态
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;
        
        document.getElementById('settingsModal').style.display = 'block';
    }
    
    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }
    
    resetToDefault() {
        // 设置默认值：25分钟 和 5分钟
        document.getElementById('workTime').value = 25;
        document.getElementById('workUnit').value = 'minutes';
        document.getElementById('breakTime').value = 5;
        document.getElementById('breakUnit').value = 'minutes';
        // 重置音效开关为开启状态
        document.getElementById('soundEnabled').checked = true;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SimpleFlowTimer();
});