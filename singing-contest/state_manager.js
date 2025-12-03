import { CONTEST_STATES, INITIAL_SINGERS } from './mock_data.js';

const STORAGE_KEY = 'singing_contest_data';
const CHANNEL_NAME = 'singing_contest_channel';

class StateManager {
    constructor() {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.listeners = [];
        this.state = this.loadState();

        this.channel.onmessage = (event) => {
            this.state = event.data;
            this.notify();
        };

        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                this.state = JSON.parse(e.newValue);
                this.notify();
            }
        });
    }

    loadState() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);

            if (parsed.contestState === 'REVEAL') parsed.contestState = CONTEST_STATES.REVEAL_FINAL;
            if (!parsed.qrBaseUrl) parsed.qrBaseUrl = null;
            if (!parsed.topCandidates) parsed.topCandidates = [];
            return parsed;
        }
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.channel.postMessage(this.state);
        this.notify();
    }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.state);
        return () => this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.state));
    }

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
        localStorage.removeItem(STORAGE_KEY);
        this.state = {
            contestState: CONTEST_STATES.IDLE,
            currentSingerId: null,
            singers: INITIAL_SINGERS,
            votes: {},
            topCandidates: [],
            startTime: null,
            endTime: null,
            qrBaseUrl: null
        };
        this.saveState();
    }
}

export const stateManager = new StateManager();
