import { stateManager } from './state_manager.js';
import { CONTEST_STATES } from './mock_data.js';


const views = {
    idle: document.getElementById('view-idle'),
    active: document.getElementById('view-active'),
    results: document.getElementById('view-results')
};

const els = {
    statusBadge: document.getElementById('status-indicator'),
    singerPhoto: document.getElementById('singer-photo'),
    qrContainer: document.getElementById('qrcode'),
    votingStatusText: document.getElementById('voting-status-text'),
    votingSubtext: document.getElementById('voting-subtext'),
    votingBox: document.getElementById('voting-status-box'),
    resultSingerName: document.getElementById('result-singer-name'),
    totalVotes: document.getElementById('total-votes'),
    correctVotes: document.getElementById('correct-votes'),
    accuracyRate: document.getElementById('accuracy-rate')
};

let chartInstance = null;
let currentQRUrl = '';


stateManager.subscribe(render);

function render(data) {
    const { contestState, currentSingerId } = data;
    const currentSinger = data.singers.find(s => s.id === currentSingerId);


    updateStatusBadge(contestState);


    Object.values(views).forEach(el => el.classList.add('hidden'));

    if (contestState === CONTEST_STATES.IDLE) {
        views.idle.classList.remove('hidden');
    } 
    else if (contestState === CONTEST_STATES.REVEAL) {
        views.results.classList.remove('hidden');
        renderResults(data, currentSinger);
    } 
    else {

        views.active.classList.remove('hidden');
        renderActiveState(contestState, currentSinger);
    }
}

function updateStatusBadge(state) {
    const map = {
        [CONTEST_STATES.IDLE]: ['等待中', 'bg-gray-800 text-gray-400'],
        [CONTEST_STATES.READY]: ['準備中', 'bg-yellow-900/50 text-yellow-500'],
        [CONTEST_STATES.VOTING]: ['投票進行中', 'bg-green-900/50 text-green-500 animate-pulse'],
        [CONTEST_STATES.ENDED]: ['投票已結束', 'bg-red-900/50 text-red-500'],
        [CONTEST_STATES.REVEAL]: ['結果公佈', 'bg-blue-900/50 text-blue-500']
    };
    const [text, classes] = map[state] || ['Unknown', 'bg-gray-800'];
    els.statusBadge.textContent = text;
    els.statusBadge.className = `px-3 py-1 rounded-full text-sm font-medium ${classes}`;
}

function renderActiveState(state, singer) {
    if (!singer) return;


    els.singerPhoto.src = singer.photo;


    const voteUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}vote.html?sid=${singer.id}`;
    
    if (currentQRUrl !== voteUrl) {
        els.qrContainer.innerHTML = '';
        new QRCode(els.qrContainer, {
            text: voteUrl,
            width: 256,
            height: 256,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        currentQRUrl = voteUrl;
    }


    if (state === CONTEST_STATES.READY) {
        els.votingStatusText.textContent = "準備開始";
        els.votingStatusText.className = "text-2xl font-bold text-yellow-400";
        els.votingSubtext.textContent = "請掃描 QR Code 準備投票";
        els.votingBox.className = "p-6 rounded-xl bg-yellow-900/20 border border-yellow-500/30 text-center";
    } else if (state === CONTEST_STATES.VOTING) {
        els.votingStatusText.textContent = "投票開放中！";
        els.votingStatusText.className = "text-4xl font-black text-green-400 animate-pulse";
        els.votingSubtext.textContent = "趕快猜猜看這是誰？";
        els.votingBox.className = "p-6 rounded-xl bg-green-900/20 border border-green-500/30 text-center shadow-[0_0_30px_rgba(34,197,94,0.2)]";
    } else if (state === CONTEST_STATES.ENDED) {
        els.votingStatusText.textContent = "投票已截止";
        els.votingStatusText.className = "text-2xl font-bold text-red-400";
        els.votingSubtext.textContent = "正在統計結果...";
        els.votingBox.className = "p-6 rounded-xl bg-red-900/20 border border-red-500/30 text-center";
    }
}

function renderResults(data, singer) {
    els.resultSingerName.textContent = `歌手真身：${singer ? singer.name : '未知'}`;
    
    const votes = data.votes[singer.id] || {};
    const labels = Object.keys(votes);
    const values = Object.values(votes);
    
    const total = values.reduce((a, b) => a + b, 0);
    const correctCount = votes[singer.name] || 0;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    els.totalVotes.textContent = total;
    els.correctVotes.textContent = correctCount;
    els.accuracyRate.textContent = `${accuracy}%`;


    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }


    const chartData = labels.map((l, i) => ({ label: l, val: values[i] }))
                           .sort((a, b) => b.val - a.val);

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(d => d.label),
            datasets: [{
                label: '得票數',
                data: chartData.map(d => d.val),
                backgroundColor: chartData.map(d => d.label === singer.name ? '#4ade80' : '#3b82f6'),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                x: { ticks: { color: '#e2e8f0' }, grid: { display: false } }
            }
        }
    });
}
