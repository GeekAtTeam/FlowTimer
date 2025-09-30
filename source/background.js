/**
 * FlowTimer 后台服务脚本
 * 负责维持定时器状态，即使弹窗关闭也能继续工作
 */
class BackgroundTimer {
    constructor() {
        this.timerState = {
            isRunning: false,
            isPaused: false,
            currentMode: 'work', // 'work' 或 'break'
            timeLeft: 25 * 60, // 默认25分钟
            totalTime: 25 * 60,
            settings: {
                workTime: 25 * 60, // 25:00 = 1500秒
                breakTime: 5 * 60  // 5:00 = 300秒
            }
        };
        
        this.init();
    }
    
    async init() {
        // 加载保存的状态
        await this.loadState();
        
        // 监听消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
        
        
        console.log('FlowTimer 后台服务已启动');
    }
    
    async loadState() {
        try {
            const result = await chrome.storage.local.get(['timerState', 'settings']);
            
            if (result.timerState) {
                this.timerState = { ...this.timerState, ...result.timerState };
            }
            
            if (result.settings) {
                this.timerState.settings = { ...this.timerState.settings, ...result.settings };
            }
            
            // 如果定时器正在运行，重新设置闹钟
            if (this.timerState.isRunning && !this.timerState.isPaused) {
                this.setAlarm();
            }
            
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }
    
    async saveState() {
        try {
            await chrome.storage.local.set({ 
                timerState: this.timerState,
                settings: this.timerState.settings
            });
        } catch (error) {
            console.error('保存状态失败:', error);
        }
    }
    
    handleMessage(message, sender, sendResponse) {
        switch (message.type) {
            case 'GET_STATE':
                sendResponse({ success: true, state: this.timerState });
                break;
                
            case 'START_TIMER':
                this.startTimer();
                sendResponse({ success: true });
                break;
                
            case 'PAUSE_TIMER':
                this.pauseTimer();
                sendResponse({ success: true });
                break;
                
            case 'RESET_TIMER':
                this.resetTimer();
                sendResponse({ success: true });
                break;
                
            case 'UPDATE_SETTINGS':
                this.updateSettings(message.settings);
                sendResponse({ success: true });
                break;
                
            case 'GET_SETTINGS':
                sendResponse({ success: true, settings: this.timerState.settings });
                break;
                
            default:
                sendResponse({ success: false, error: '未知消息类型' });
        }
    }
    
    startTimer() {
        if (!this.timerState.isRunning) {
            this.timerState.isRunning = true;
            this.timerState.isPaused = false;
            this.startCountdown();
            this.saveState();
        }
    }
    
    pauseTimer() {
        if (this.timerState.isRunning) {
            this.timerState.isRunning = false;
            this.timerState.isPaused = true;
            this.stopCountdown();
            this.saveState();
        }
    }
    
    resetTimer() {
        this.timerState.isRunning = false;
        this.timerState.isPaused = false;
        this.stopCountdown();
        this.setMode(this.timerState.currentMode);
        this.saveState();
    }
    
    setMode(mode) {
        this.timerState.currentMode = mode;
        
        if (mode === 'work') {
            this.timerState.timeLeft = this.timerState.settings.workTime;
            this.timerState.totalTime = this.timerState.settings.workTime;
        } else {
            this.timerState.timeLeft = this.timerState.settings.breakTime;
            this.timerState.totalTime = this.timerState.settings.breakTime;
        }
    }
    
    startCountdown() {
        this.stopCountdown(); // 清除之前的定时器
        
        this.countdownInterval = setInterval(() => {
            if (this.timerState.timeLeft > 0) {
                this.timerState.timeLeft--;
                this.saveState();
            } else {
                this.completeSession();
            }
        }, 1000);
    }
    
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    
    completeSession() {
        this.stopCountdown();
        this.timerState.isRunning = false;
        this.timerState.isPaused = false;
        
        if (this.timerState.currentMode === 'work') {
            // 专注时间结束，进入休息时间
            this.setMode('break');
            this.showNotification('专注时间结束！', '开始休息时间。');
        } else {
            // 休息时间结束，进入专注时间
            this.setMode('work');
            this.showNotification('休息时间结束！', '准备开始下一轮专注工作。');
        }
        
        this.saveState();
    }
    
    updateSettings(settings) {
        this.timerState.settings = { ...this.timerState.settings, ...settings };
        
        // 如果当前是工作模式，更新时间
        if (this.timerState.currentMode === 'work') {
            this.setMode('work');
        }
        
        this.saveState();
    }
    
    async showNotification(title, message) {
        try {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: title,
                message: message
            });
        } catch (error) {
            console.error('显示通知失败:', error);
        }
    }
}

// 启动后台定时器
new BackgroundTimer();
