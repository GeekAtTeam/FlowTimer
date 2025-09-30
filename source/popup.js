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
        this.currentMode = 'work';
        
        this.init();
    }
    
    init() {
        this.updateDisplay();
        this.updateButtons();
        this.bindEvents();
    }
    
    bindEvents() {
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
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
        this.timeLeft = this.totalTime;
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
        alert('专注时间结束！');
        this.reset();
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timeDisplay').textContent = timeString;
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
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SimpleFlowTimer();
});
