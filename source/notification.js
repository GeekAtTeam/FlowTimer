class NotificationWindow {
    constructor() {
        this.soundType = null;
        this.windowId = null;
        this.isPlaying = false;
        this.init();
    }
    
    init() {
        this.getSoundType();
        this.getWindowId();
        this.bindEvents();
        this.updateDisplay();
        this.playSound();
    }
    
    getWindowId() {
        // 获取当前窗口ID
        chrome.windows.getCurrent((window) => {
            this.windowId = window.id;
            console.log('获取到窗口ID:', this.windowId);
        });
    }
    
    getSoundType() {
        // 从URL参数获取音效类型
        const urlParams = new URLSearchParams(window.location.search);
        this.soundType = urlParams.get('sound');
        
        console.log('获取到的音效类型:', this.soundType);
        
        // 如果没有参数，使用默认值
        if (!this.soundType) {
            this.soundType = 'workCompleteSound';
            console.log('使用默认音效类型:', this.soundType);
        }
    }
    
    updateDisplay() {
        const icon = document.getElementById('icon');
        const title = document.getElementById('title');
        const message = document.getElementById('message');
        
        if (this.soundType === 'workCompleteSound') {
            // icon.textContent = '🎯';
            title.textContent = '专注时间结束';
            message.textContent = '恭喜！专注时间已完成，现在可以休息一下了。☕';
        } else if (this.soundType === 'breakCompleteSound') {
            // icon.textContent = '☕';
            title.textContent = '休息时间结束';
            message.textContent = '休息时间已结束，让我们继续专注工作吧！💪';
        } else {
            // icon.textContent = '⏰';
            title.textContent = '时间提醒';
            message.textContent = '时间已到！';
        }
    }
    
    playSound() {
        if (!this.soundType) return;
        
        const audioElement = document.getElementById(this.soundType);
        if (audioElement) {
            audioElement.currentTime = 0;
            audioElement.play().then(() => {
                this.isPlaying = true;
                console.log(`音效播放成功: ${this.soundType}`);
                
                // 播放5秒后停止循环
                setTimeout(() => {
                    audioElement.loop = false;
                }, 5000);
                
            }).catch(error => {
                console.log('音效播放失败:', error);
            });
        } else {
            console.log(`未找到音频元素: ${this.soundType}`);
        }
    }
    
    
    bindEvents() {
        // 继续计时按钮
        document.getElementById('continueTimer').addEventListener('click', () => {
            this.continueTimer();
        });
        
        // 我知道了按钮
        document.getElementById('closeWindow').addEventListener('click', () => {
            this.closeWindow();
        });
        
        // 监听来自后台的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STOP_SOUND') {
                this.stopSound();
            }
        });
        
        // 监听窗口关闭事件
        window.addEventListener('beforeunload', () => {
            this.stopSound();
        });
    }
    
    continueTimer() {
        // 通知后台继续计时（相当于点击开始按钮）
        chrome.runtime.sendMessage({
            type: 'CONTINUE_TIMER'
        }).then(() => {
            console.log('继续计时成功');
            this.closeWindow();
        }).catch(error => {
            console.log('无法继续计时:', error);
            // 如果无法继续计时，仍然关闭窗口
            this.closeWindow();
        });
    }
    
    closeWindow() {
        this.stopSound();
        
        // 通知后台关闭窗口
        chrome.runtime.sendMessage({
            type: 'CLOSE_NOTIFICATION_WINDOW',
            windowId: this.windowId
        }).then(() => {
            console.log('通知后台关闭窗口成功');
            // 直接关闭当前窗口
            window.close();
        }).catch(error => {
            console.log('无法通知后台关闭窗口:', error);
            // 如果无法通知后台，直接关闭当前窗口
            window.close();
        });
    }
    
    stopSound() {
        if (this.isPlaying && this.soundType) {
            const audioElement = document.getElementById(this.soundType);
            if (audioElement) {
                audioElement.pause();
                audioElement.currentTime = 0;
                this.isPlaying = false;
                console.log('音效已停止');
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new NotificationWindow();
});
