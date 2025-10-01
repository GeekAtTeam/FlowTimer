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
                breakTime: 5 * 60, // 5:00 = 300秒
                soundEnabled: true // 音效开关，默认开启
            }
        };
        
        this.countdownInterval = null; // For setInterval
        this.notificationWindowId = null; // 提示窗口ID
        
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
                
            case 'OPEN_MAIN_INTERFACE':
                this.openMainInterface();
                sendResponse({ success: true });
                break;
                
            case 'CONTINUE_TIMER':
                this.startTimer(); // 继续计时，相当于点击开始按钮
                sendResponse({ success: true });
                break;
                
            case 'CLOSE_NOTIFICATION_WINDOW':
                this.closeNotificationWindow(message.windowId);
                sendResponse({ success: true });
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
        console.log('completeSession被调用，当前模式:', this.timerState.currentMode);
        
        this.stopCountdown();
        this.timerState.isRunning = false;
        this.timerState.isPaused = false;
        
        if (this.timerState.currentMode === 'work') {
            // 专注时间结束，进入休息时间
            console.log('专注时间结束，切换到休息模式');
            this.setMode('break');
            this.playSound('workCompleteSound');
        } else {
            // 休息时间结束，进入专注时间
            console.log('休息时间结束，切换到工作模式');
            this.setMode('work');
            this.playSound('breakCompleteSound');
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
    
    playSound(soundType) {
        console.log('playSound被调用，音效类型:', soundType);
        console.log('音效开关状态:', this.timerState.settings.soundEnabled);
        
        // 检查音效开关是否开启
        if (!this.timerState.settings.soundEnabled) {
            console.log('音效已关闭，跳过播放');
            return;
        }
        
        try {
            // 先尝试向弹窗发送音效播放消息
            chrome.runtime.sendMessage({
                type: 'PLAY_SOUND',
                soundType: soundType
            }).then(() => {
                console.log('弹窗音效播放成功');
            }).catch(error => {
                console.log('弹窗未打开，创建提示窗口:', error);
                // 如果弹窗未打开，创建独立的提示窗口
                this.createNotificationWindow(soundType);
            });
        } catch (error) {
            console.error('播放音效时出错:', error);
            // 出错时也创建提示窗口作为备用
            this.createNotificationWindow(soundType);
        }
    }
    
    createNotificationWindow(soundType) {
        console.log('开始创建提示窗口，音效类型:', soundType);
        
        // 创建提示窗口的URL
        const url = chrome.runtime.getURL('notification.html') + `?sound=${soundType}`;
        console.log('提示窗口URL:', url);
        
        // 创建窗口
        chrome.windows.create({
            url: url,
            type: 'popup',
            width: 520,
            height: 420,
            left: 100,
            top: 100,
            focused: true
        }).then(window => {
            console.log('提示窗口创建成功:', window.id);
            // 保存窗口ID，用于后续关闭
            this.notificationWindowId = window.id;
        }).catch(error => {
            console.error('创建提示窗口失败:', error);
        });
    }
    
    openMainInterface() {
        // 尝试打开主插件界面
        try {
            chrome.action.openPopup();
        } catch (error) {
            console.log('无法打开主界面:', error);
            // 如果无法打开弹窗，显示提示
            this.showNotification('FlowTimer', '请点击浏览器工具栏中的FlowTimer图标打开主界面');
        }
    }
    
    closeNotificationWindow(windowId) {
        if (windowId) {
            chrome.windows.remove(windowId).catch(error => {
                console.log('关闭窗口失败:', error);
            });
        }
        
        // 清除保存的窗口ID
        if (this.notificationWindowId === windowId) {
            this.notificationWindowId = null;
        }
    }
}

// 启动后台定时器
new BackgroundTimer();
