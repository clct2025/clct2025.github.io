import { CONTEST_STATES, INITIAL_SINGERS } from './mock_data.js';
import { db, stateRef } from './firebase.js'; // 匯入 Firebase
import { onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"; // 匯入 RTDB 方法

class StateManager {
    constructor() {
        this.listeners = [];
        this.state = this.getInitialState(); // 先用初始 state

        // 監聽 Firebase 變化，即時同步到所有裝置
        onValue(stateRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.state = data;
                this.notify();
            }
        });
    }

    getInitialState() {
        return {
            contestState: CONTEST_STATES.IDLE,
            currentSingerId: null,
            singers: INITIAL_SINGERS,
            votes: {}, // { singerId: { "Name": count } }
            topCandidates: [], // Array of top 5 for current round
            startTime: null,
            endTime: null,
            qrBaseUrl: null
        };
    }

    saveState() {
        set(stateRef, this.state); // 寫入 Firebase
        this.notify(); // 通知本地 listeners
    }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.state);
        return () => this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.state));
    }

    // 以下方法不變，但 saveState 現在會寫到 Firebase
    setQrBaseUrl(url) {
        this.state.qrBaseUrl = url ? url.replace(/\/$/, "") : null;
        this.saveState();
    }

    setCurrentSinger(singerId) {
        this.state.currentSingerId = singerId;
        this.state.contestState = CONTEST_STATES.READY;
        this.state.topCandidates = []; // Reset candidates
        this.saveState();
    }

    startVoting() {
        this.state.contestState = CONTEST_STATES.VOTING;
        this.state.startTime = Date.now();
        this.saveState();
    }

    stopVoting() {
        this.state.contestState = CONTEST_STATES.ENDED;
        this.state.endTime = Date.now();
        this.saveState();
    }

    revealCandidates() {
        const currentId = this.state.currentSingerId;
        if (!currentId) return;

        const votesObj = this.state.votes[currentId] || {};
        let entries = Object.entries(votesObj).map(([name, count]) => ({ name, count }));

        // 隨機打亂後排序 (不變)
        for (let i = entries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        entries.sort((a, b) => b.count - a.count);

        const top5 = entries.slice(0, 5);

        this.state.topCandidates = top5.map(entry => {
            const singerInfo = this.state.singers.find(s => s.name === entry.name);
            return {
                name: entry.name,
                count: entry.count,
                photo: singerInfo ? singerInfo.photo : null
            };
        });

        this.state.contestState = CONTEST_STATES.REVEAL_CANDIDATES;
        this.saveState();
    }

    revealFinal() {
        this.state.contestState = CONTEST_STATES.REVEAL_FINAL;
        this.saveState();
    }

    submitVote(singerId, guessName) {
        if (!this.state.votes[singerId]) {
            this.state.votes[singerId] = {};
        }
        
        const currentCount = this.state.votes[singerId][guessName] || 0;
        this.state.votes[singerId][guessName] = currentCount + 1;
        
        this.saveState();
        return true;
    }

    updateSinger(id, updates) {
        this.state.singers = this.state.singers.map(s => 
            s.id === id ? { ...s, ...updates } : s
        );
        this.saveState();
    }

    addSinger(name) {
        const newId = `singer-${Date.now()}`;
        const newSinger = {
            id: newId,
            name: name || `新歌手`,
            photo: `https://ui-avatars.com/api/?name=${name || 'New'}&background=random&size=512`,
            description: '新增歌手'
        };
        this.state.singers.push(newSinger);
        this.saveState();
    }

    updateSingerPhoto(id, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.updateSinger(id, { photo: e.target.result });
        };
        reader.readAsDataURL(file);
    }

    deleteSinger(id) {
        this.state.singers = this.state.singers.filter(s => s.id !== id);
        if (this.state.votes[id]) {
            delete this.state.votes[id];
        }
        if (this.state.currentSingerId === id) {
            this.state.currentSingerId = null;
            this.state.contestState = CONTEST_STATES.IDLE;
        }
        this.saveState();
    }

    fullReset() {
        this.state = this.getInitialState();
        this.saveState();
    }
}

export const stateManager = new StateManager();