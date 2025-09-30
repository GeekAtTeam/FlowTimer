/**
 * 极简版 FlowTimer
 * 只实现最基本的番茄钟功能
 */
class SimpleFlowTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = 25 * 60; // 25分钟
        this.totalTime = 25 * 60;
        this.intervalId = null;
        this.currentMode = 'work'; // 'work' 或 'break'
        
        // 默认设置
        this.settings = {
            workTime: 25,
            breakTime: 5
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.updateDisplay();
        this.updateButtons();
        this.bindEvents();
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
    
    togglePlayPause() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            
            this.intervalId = setInterval(() => {
                this.tick();
            }, 1000);
            
            this.updateButtons();
        }
    }
    
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            clearInterval(this.intervalId);
            this.updateButtons();
        }
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.intervalId);
        this.setMode(this.currentMode);
        this.updateDisplay();
        this.updateButtons();
    }
    
    tick() {
        if (this.timeLeft > 0) {
            this.timeLeft--;
            this.updateDisplay();
        } else {
            this.completeSession();
        }
    }
    
    completeSession() {
        this.isRunning = false;
        clearInterval(this.intervalId);
        
        if (this.currentMode === 'work') {
            alert('专注时间结束！开始休息时间。');
            this.setMode('break');
        } else {
            alert('休息时间结束！准备开始下一轮专注工作。');
            this.setMode('work');
        }
        
        this.updateDisplay();
        this.updateButtons();
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
    
    setMode(mode) {
        this.currentMode = mode;
        
        if (mode === 'work') {
            this.timeLeft = this.settings.workTime * 60;
            this.totalTime = this.settings.workTime * 60;
        } else {
            this.timeLeft = this.settings.breakTime * 60;
            this.totalTime = this.settings.breakTime * 60;
        }
        
        this.updateDisplay();
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            if (result.settings) {
                this.settings = { ...this.settings, ...result.settings };
            }
        } catch (error) {
            console.error('加载设置失败:', error);
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
            
            // 保存设置
            this.settings.workTime = workTime;
            this.settings.breakTime = breakTime;
            
            await chrome.storage.local.set({ settings: this.settings });
            
            // 如果当前是工作模式，更新时间
            if (this.currentMode === 'work') {
                this.setMode('work');
            }
            
            this.closeSettings();
            alert('设置已保存！');
            
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
