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
            workTime: 25,
            breakTime: 5
        };
        
        this.init();
    }
    
    async init() {
        await this.loadState();
        this.updateDisplay();
        this.updateButtons();
        this.bindEvents();
        this.startUIUpdate();
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
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // 设置相关事件
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.closeSettings());
        
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
        }
    }
    
    async pause() {
        const response = await this.sendMessage({ type: 'PAUSE_TIMER' });
        if (response.success) {
            this.isRunning = false;
            this.isPaused = true;
            this.updateButtons();
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
            playPauseBtn.textContent = '⏸️ 暂停';
        } else if (this.isPaused) {
            playPauseBtn.textContent = '▶️ 继续';
        } else {
            playPauseBtn.textContent = '▶️ 开始';
        }
    }
    
    async saveSettings() {
        try {
            const workTime = parseInt(document.getElementById('workTime').value);
            const breakTime = parseInt(document.getElementById('breakTime').value);
            
            // 验证输入
            if (workTime < 1 || workTime > 60) {
                alert('专注时间必须在1-60分钟之间');
                return;
            }
            
            if (breakTime < 1 || breakTime > 30) {
                alert('休息时间必须在1-30分钟之间');
                return;
            }
            
            // 保存设置到后台
            const response = await this.sendMessage({
                type: 'UPDATE_SETTINGS',
                settings: { workTime, breakTime }
            });
            
            if (response.success) {
                this.settings.workTime = workTime;
                this.settings.breakTime = breakTime;
                this.closeSettings();
                alert('设置已保存！');
            } else {
                alert('保存设置失败，请重试');
            }
            
        } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存设置失败，请重试');
        }
    }
    
    openSettings() {
        document.getElementById('workTime').value = this.settings.workTime;
        document.getElementById('breakTime').value = this.settings.breakTime;
        document.getElementById('settingsModal').style.display = 'block';
    }
    
    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SimpleFlowTimer();
});