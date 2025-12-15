// state_manager.js —— 最終完美版（已修所有問題）
import { CONTEST_STATES, INITIAL_SINGERS } from './mock_data.js';
import { db, stateRef } from './firebase.js';
import { onValue, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

class StateManager {
    constructor() {
        this.listeners = [];
        this.state = this.getDefaultState();

        // 監聽 Firebase 即時變化
        onValue(stateRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.state = data;
                this.notifyAll();
            }
        });

        // 初始化資料庫
        this.initFirebaseIfEmpty();
    }

    async initFirebaseIfEmpty() {
        try {
            const snapshot = await get(stateRef);
            if (!snapshot.exists()) {
                await set(stateRef, this.getDefaultState());
            }
        } catch (error) {
            console.error("初始化失敗:", error);
        }
    }

    getDefaultState() {
        return {
            contestState: CONTEST_STATES.IDLE,
            currentSingerId: null,
            singers: INITIAL_SINGERS,
            votes: {},
            topCandidates: [],
            startTime: null,
            endTime: null,
            qrBaseUrl: null
        };
    }

    notifyAll() {
        this.listeners.forEach(fn => fn(this.state));
    }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.state); // 立即呼叫一次
    }

    // 關鍵：所有寫入都用 await 確保完成後才更新畫面
    async save() {
        try {
            await set(stateRef, this.state);
            console.log('狀態已成功儲存到 Firebase');
        } catch (error) {
            console.error('儲存失敗:', error);
        }
    }

    // === 以下全部改成 async + await ===
    async setQrBaseUrl(url) {
        this.state.qrBaseUrl = url ? url.replace(/\/$/, "") : null;
        await this.save();
    }

    async setCurrentSinger(id) {
        this.state.currentSingerId = id;
        this.state.contestState = CONTEST_STATES.READY;
        this.state.topCandidates = [];
        await this.save();
    }

    async startVoting() {
        this.state.contestState = CONTEST_STATES.VOTING;
        this.state.startTime = Date.now();
        await this.save();
    }

    async stopVoting() {
        this.state.contestState = CONTEST_STATES.ENDED;
        this.state.endTime = Date.now();
        await this.save();
    }

    async revealCandidates() {
        const votesObj = this.state.votes[this.state.currentSingerId] || {};
        let entries = Object.entries(votesObj).map(([name, count]) => ({ name, count }));

        // 隨機打亂
        for (let i = entries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        entries.sort((a, b) => b.count - a.count);

        const top5 = entries.slice(0, 5).map(e => ({
            name: e.name,
            count: e.count,
            photo: this.state.singers.find(s => s.name === e.name)?.photo || null
        }));

        this.state.topCandidates = top5;
        this.state.contestState = CONTEST_STATES.REVEAL_CANDIDATES;
        await this.save();
    }

    async revealFinal() {
        this.state.contestState = CONTEST_STATES.REVEAL_FINAL;
        await this.save();
    }

    async submitVote(singerId, guessName) {
        if (!this.state.votes[singerId]) this.state.votes[singerId] = {};
        this.state.votes[singerId][guessName] = (this.state.votes[singerId][guessName] || 0) + 1;
        await this.save();
        return true;
    }

    async updateSinger(id, updates) {
        this.state.singers = this.state.singers.map(s =>
            s.id === id ? { ...s, ...updates } : s
        );
        await this.save();
    }

    async addSinger(name = "新歌手") {
        const newSinger = {
            id: `singer-${Date.now()}`,
            name,
            photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=512`,
            description: "新增的歌手"
        };
        this.state.singers.push(newSinger);
        await this.save();
    }

    updateSingerPhoto(id, file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            await this.updateSinger(id, { photo: e.target.result });
        };
        reader.readAsDataURL(file);
    }

    async deleteSinger(id) {
        this.state.singers = this.state.singers.filter(s => s.id !== id);
        if (this.state.votes[id]) delete this.state.votes[id];
        if (this.state.currentSingerId === id) {
            this.state.currentSingerId = null;
            this.state.contestState = CONTEST_STATES.IDLE;
        }
        await this.save();
    }

    async fullReset() {
        this.state = this.getDefaultState();
        await set(stateRef, this.state);
    }
}

export const stateManager = new StateManager();