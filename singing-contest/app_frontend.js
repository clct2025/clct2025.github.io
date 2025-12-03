import { stateManager } from './state_manager.js';
import { CONTEST_STATES } from './mock_data.js';

let qrCodeInstance = null;
let resultsChartInstance = null;
let accuracyChartInstance = null;
let currentState = null;
let isVoteMode = false;
let currentQrUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    isVoteMode = urlParams.get('mode') === 'vote';
    
    if (isVoteMode) {
        setupVoteMode();
    } else {
        setupDisplayMode();
    }
    
    stateManager.subscribe(render);
});

/* ================= DISPLAY MODE ================= */

function setupDisplayMode() {
    document.getElementById('app-display').classList.remove('hidden');
    document.getElementById('app-vote').classList.add('hidden');
    

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    qrCodeInstance = new QRCode(qrContainer, {
        text: window.location.href,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });


    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        document.getElementById('localhost-warning').classList.remove('hidden');
    }


    document.getElementById('btn-open-ip-config').addEventListener('click', () => {
        document.getElementById('ip-config-modal').classList.remove('hidden');
        const current = currentState.qrBaseUrl || window.location.origin;
        document.getElementById('input-ip-url').value = current;
    });

    document.getElementById('btn-save-ip').addEventListener('click', () => {
        const newUrl = document.getElementById('input-ip-url').value.trim();
        if (newUrl) {
            let finalUrl = newUrl;

            if (!/^https?:\/\//i.test(finalUrl)) {
                finalUrl = 'http://' + finalUrl;
            }

            finalUrl = finalUrl.replace(/\/$/, "");
            
            stateManager.setQrBaseUrl(finalUrl);
            document.getElementById('ip-config-modal').classList.add('hidden');
        }
    });

    document.getElementById('btn-close-ip').addEventListener('click', () => {
        document.getElementById('ip-config-modal').classList.add('hidden');
    });
}

function updateQrCode(state) {
    const baseUrl = state.qrBaseUrl || window.location.origin;
    const voteUrl = `${baseUrl}${window.location.pathname}?mode=vote`;

    if (currentQrUrl !== voteUrl) {
        currentQrUrl = voteUrl;
        qrCodeInstance.clear();
        qrCodeInstance.makeCode(voteUrl);
        document.getElementById('qr-url-display').textContent = voteUrl;
    }
}

/* ================= VOTE MODE ================= */

function setupVoteMode() {
    document.getElementById('app-display').classList.add('hidden');
    document.getElementById('app-vote').classList.remove('hidden');
    
    const form = document.getElementById('vote-form');
    form.addEventListener('submit', handleVoteSubmit);
}

function handleVoteSubmit(e) {
    e.preventDefault();
    
    if (!currentState || currentState.contestState !== CONTEST_STATES.VOTING) {
        showToast('投票尚未開始');
        return;
    }

    const selectedOption = document.querySelector('input[name="singer-guess"]:checked');
    if (!selectedOption) {
        showToast('請選擇一個歌手');
        return;
    }

    const singerId = currentState.currentSingerId;
    const storageKey = `has_voted_${singerId}`;

    if (localStorage.getItem(storageKey)) {
        showToast('您已經投過票了！');
        showVoteSuccess();
        return;
    }

    stateManager.submitVote(singerId, selectedOption.value);
    localStorage.setItem(storageKey, 'true');
    
    showVoteSuccess();
}

function showVoteSuccess() {
    document.getElementById('vote-container').classList.add('hidden');
    document.getElementById('vote-success-msg').classList.remove('hidden');
}

function renderVoteView(state) {
    const container = document.getElementById('vote-container');
    const waitMsg = document.getElementById('vote-wait-msg');
    const successMsg = document.getElementById('vote-success-msg');
    const singerPreview = document.getElementById('vote-singer-preview');
    const optionsList = document.getElementById('vote-options-list');

    if (state.currentSingerId && localStorage.getItem(`has_voted_${state.currentSingerId}`)) {
        container.classList.add('hidden');
        waitMsg.classList.add('hidden');
        successMsg.classList.remove('hidden');
        return;
    }

    if (state.contestState === CONTEST_STATES.VOTING && state.currentSingerId) {
        waitMsg.classList.add('hidden');
        successMsg.classList.add('hidden');
        container.classList.remove('hidden');

        const singer = state.singers.find(s => s.id === state.currentSingerId);
        if (singer) singerPreview.src = singer.photo;

        optionsList.innerHTML = state.singers.map(s => `
            <label class="flex items-center p-4 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-750 transition group">
                <input type="radio" name="singer-guess" value="${s.name}" class="w-5 h-5 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500 focus:ring-2">
                <span class="ml-3 text-white font-medium group-hover:text-blue-300 transition">${s.name}</span>
            </label>
        `).join('');

    } else {
        container.classList.add('hidden');
        successMsg.classList.add('hidden');
        waitMsg.classList.remove('hidden');
    }
}

/* ================= MAIN RENDERER ================= */

function render(state) {
    currentState = state;
    
    if (isVoteMode) {
        renderVoteView(state);
    } else {
        renderDisplayView(state);
        updateQrCode(state);
    }
}

function renderDisplayView(state) {
    const viewIdle = document.getElementById('view-idle');
    const viewActive = document.getElementById('view-active');
    const viewCandidates = document.getElementById('view-candidates');
    const viewResults = document.getElementById('view-results');
    
    const views = [viewIdle, viewActive, viewCandidates, viewResults];
    
    const activateView = (targetView) => {
        views.forEach(el => {
            if (el === targetView) {
                el.classList.remove('hidden');

                requestAnimationFrame(() => {
                    el.classList.remove('opacity-0');
                    el.classList.add('opacity-100');
                });
            } else {
                el.classList.add('opacity-0');
                el.classList.remove('opacity-100');
                setTimeout(() => {
                    if (el !== targetView) el.classList.add('hidden');
                }, 500);
            }
        });
    };

    switch(state.contestState) {
        case CONTEST_STATES.IDLE:
            activateView(viewIdle);
            updateStatusIndicator('等待開始', 'gray');
            break;
            
        case CONTEST_STATES.READY:
        case CONTEST_STATES.VOTING:
        case CONTEST_STATES.ENDED:
            activateView(viewActive);
            updateActiveSinger(state);
            updateVotingStatus(state);
            break;
            
        case CONTEST_STATES.REVEAL_CANDIDATES:
            activateView(viewCandidates);
            updateCandidatesGrid(state);
            updateStatusIndicator('觀眾猜測', 'blue');
            break;

        case CONTEST_STATES.REVEAL_FINAL:
            activateView(viewResults);
            updateResults(state);
            updateStatusIndicator('結果揭曉', 'blue');
            break;
    }
}

function updateActiveSinger(state) {
    const singer = state.singers.find(s => s.id === state.currentSingerId);
    if (singer) {
        document.getElementById('singer-photo').src = singer.photo;
    }
}

function updateCandidatesGrid(state) {
    const grid = document.getElementById('candidates-grid');
    const candidates = state.topCandidates || [];
    
    if (candidates.length === 0) {
        grid.innerHTML = `<p class="text-slate-400 text-xl">沒有收到任何投票</p>`;
        return;
    }

    grid.innerHTML = candidates.map((c, index) => `
        <div class="w-64 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transform hover:scale-105 transition duration-500 animate-pop" style="animation-delay: ${index * 0.1}s">
            <div class="h-64 overflow-hidden relative">
                <img src="${c.photo || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80"></div>
                <div class="absolute bottom-0 left-0 w-full p-4">
                     <div class="text-4xl font-black text-white opacity-20 absolute -top-6 right-2">#${index + 1}</div>
                     <h3 class="text-xl font-bold text-white">${c.name}</h3>
                     <p class="text-blue-400 font-mono">${c.count} 票</p>
                </div>
            </div>
        </div>
    `).join('');
}

function updateVotingStatus(state) {
    const statusText = document.getElementById('voting-status-text');
    const subText = document.getElementById('voting-subtext');
    const timerBar = document.getElementById('timer-bar');
    const timerProgress = document.getElementById('timer-progress');
    
    if (state.contestState === CONTEST_STATES.READY) {
        statusText.textContent = "準備中";
        statusText.className = "text-4xl font-bold text-yellow-400 mb-2 relative z-10";
        subText.textContent = "請掃描 QR Code 準備投票";
        timerBar.classList.add('hidden');
        updateStatusIndicator('準備中', 'yellow');
    } else if (state.contestState === CONTEST_STATES.VOTING) {
        statusText.textContent = "投票進行中";
        statusText.className = "text-4xl font-bold text-green-400 mb-2 relative z-10 animate-pulse";
        subText.textContent = "請盡快送出您的猜測！";
        timerBar.classList.remove('hidden');
        timerProgress.style.animation = 'none'; 
        timerProgress.offsetHeight; /* trigger reflow */
        timerProgress.style.animation = null; 
        timerProgress.className = "h-full bg-green-500 w-full animate-[progress_30s_linear]";
        updateStatusIndicator('投票中', 'green');
    } else if (state.contestState === CONTEST_STATES.ENDED) {
        statusText.textContent = "投票已截止";
        statusText.className = "text-4xl font-bold text-red-400 mb-2 relative z-10";
        subText.textContent = "等待公佈結果...";
        timerBar.classList.add('hidden');
        updateStatusIndicator('投票結束', 'red');
    }
}

function updateResults(state) {
    const singer = state.singers.find(s => s.id === state.currentSingerId);
    if (!singer) return;

    document.getElementById('result-singer-name').textContent = `正確答案：${singer.name}`;

    const votes = state.votes[state.currentSingerId] || {};
    const total = Object.values(votes).reduce((a,b) => a+b, 0);
    const correct = votes[singer.name] || 0;
    const accuracy = total > 0 ? Math.round((correct/total)*100) : 0;

    document.getElementById('total-votes').textContent = total;
    document.getElementById('correct-votes').textContent = correct;
    document.getElementById('accuracy-rate').textContent = `${accuracy}%`;

    const labels = Object.keys(votes);
    const data = Object.values(votes);
    

    const ctxResults = document.getElementById('resultsChart').getContext('2d');
    if (resultsChartInstance) resultsChartInstance.destroy();
    
    resultsChartInstance = new Chart(ctxResults, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '票數',
                data: data,
                backgroundColor: labels.map(l => l === singer.name ? '#4ade80' : '#60a5fa'),
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#e2e8f0' } }
            }
        }
    });

    const ctxAccuracy = document.getElementById('accuracyChart').getContext('2d');
    if (accuracyChartInstance) accuracyChartInstance.destroy();

    accuracyChartInstance = new Chart(ctxAccuracy, {
        type: 'doughnut',
        data: {
            labels: ['正確', '其他'],
            datasets: [{
                data: [correct, total - correct],
                backgroundColor: ['#4ade80', '#1e293b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false } }
        }
    });
}

function updateStatusIndicator(text, color) {
    const el = document.getElementById('status-indicator');
    const colors = {
        gray: 'bg-slate-800 text-slate-400 border-slate-700',
        yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
        green: 'bg-green-900/30 text-green-400 border-green-700',
        red: 'bg-red-900/30 text-red-400 border-red-700',
        blue: 'bg-blue-900/30 text-blue-400 border-blue-700'
    };
    el.textContent = text;
    el.className = `px-4 py-1.5 rounded-full text-sm font-bold shadow-inner border transition-colors duration-500 ${colors[color]}`;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    toastMsg.textContent = msg;
    toast.classList.remove('translate-y-24');
    setTimeout(() => toast.classList.add('translate-y-24'), 3000);
}
