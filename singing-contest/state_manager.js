// state_manager.js —— 真正的最終完美版（所有函數齊全、無當機）
import { CONTEST_STATES, INITIAL_SINGERS } from './mock_data.js';
import { db } from './firebase.js';  // 改這行，去掉 stateRef import
import { onValue, set, get, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";  // 加 ref

class StateManager {
    constructor() {
        this.listeners = [];
        this.state = this.getDefaultState();

        // 監聽 Firebase 即時變化
        onValue(ref(db), (snapshot) => {  // 改成 ref(db) 監聽根
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
            const snapshot = await get(ref(db));
            if (!snapshot.exists()) {
                await set(ref(db), this.getDefaultState());
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

    async save() {
        try {
            await set(ref(db), this.state);
            console.log('狀態已成功儲存到 Firebase');
        } catch (error) {
            console.error('儲存失敗:', error);
        }
    }

    // ==================== 所有操作函數 ====================

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
        // 防呆檢查 1: 沒有選擇歌手
        if (!this.state.currentSingerId) {
            console.warn('沒有選擇當前歌手，無法顯示前5高票');
            return;
        }

        // 防呆檢查 2: 該歌手是否還存在（可能已被刪除）
        const currentSinger = this.state.singers.find(s => s.id === this.state.currentSingerId);
        if (!currentSinger) {
            console.warn('當前歌手已被刪除，自動重置狀態');
            this.state.currentSingerId = null;
            this.state.contestState = CONTEST_STATES.IDLE;
            this.state.topCandidates = [];
            await this.save();
            return;
        }

        // 取得該歌手的票數（安全取值）
        const votesObj = (this.state.votes && this.state.votes[this.state.currentSingerId]) || {};
        let entries = Object.entries(votesObj).map(([name, count]) => ({ name, count }));

        // 如果還沒有人投票
        if (entries.length === 0) {
            this.state.topCandidates = [];
            this.state.contestState = CONTEST_STATES.REVEAL_CANDIDATES;
            await this.save();
            return;
        }

        // 隨機打亂後排序
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
        if (this.state.votes && this.state.votes[id]) delete this.state.votes[id];
        if (this.state.currentSingerId === id) {
            this.state.currentSingerId = null;
            this.state.contestState = CONTEST_STATES.IDLE;
        }
        await this.save();
    }

    async fullReset() {
        this.state = this.getDefaultState();
        await set(ref(db), this.state);
    }

    // 新增方法：從 mock_data.js 強制更新 singers
    async updateSingersFromMock() {
        this.state.singers = INITIAL_SINGERS;
        await this.save();
        console.log('從 mock_data.js 更新歌手列表成功');
    }
}

export const stateManager = new StateManager();