import { stateManager } from './state_manager.js';
import { CONTEST_STATES } from './mock_data.js';

const loginView = document.getElementById('admin-login');
const dashboardView = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userInput = document.getElementById('username');
const passInput = document.getElementById('password');

document.addEventListener('DOMContentLoaded', () => {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = userInput.value.trim();
        const p = passInput.value;

        if (u === 'admin' && p === 'admin123') {
            loginView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            loginError.classList.add('hidden');

            setTimeout(() => {
                userInput.value = '';
                passInput.value = '';
            }, 500);

            // 登入成功後訂閱狀態更新
            stateManager.subscribe(renderDashboard);
        } else {
            loginError.classList.remove('hidden');
            passInput.value = '';
            passInput.focus();
        }
    });

    // 登出
    document.getElementById('btn-logout').addEventListener('click', () => {
        location.reload();
    });

    // 重置所有資料
    document.getElementById('btn-reset-all').addEventListener('click', async () => {
        if (confirm('確定要重置所有數據嗎？這將清空所有歌手和投票紀錄！')) {
            await stateManager.fullReset();
        }
    });

    // 儲存 QR Base URL
    document.getElementById('btn-save-config').addEventListener('click', async () => {
        const url = document.getElementById('config-qr-url').value.trim();
        await stateManager.setQrBaseUrl(url);
        alert('設定已儲存');
    });

    // 新增歌手
    document.getElementById('btn-add-singer').addEventListener('click', async () => {
        await stateManager.addSinger();
    });

    // 投票控制按鈕（全部加上 async/await）
    document.getElementById('btn-start-vote').addEventListener('click', async () => {
        await stateManager.startVoting();
    });
    document.getElementById('btn-stop-vote').addEventListener('click', async () => {
        await stateManager.stopVoting();
    });
    document.getElementById('btn-reveal-candidates').addEventListener('click', async () => {
        await stateManager.revealCandidates();
    });
    document.getElementById('btn-reveal-final').addEventListener('click', async () => {
        await stateManager.revealFinal();
    });
});

function renderDashboard(state) {
    if (!state || !state.singers) {
        console.warn('State 未準備好，跳過渲染');
        return;
    }

    // 更新狀態面板
    updateStatusPanel(state);

    // 更新 QR URL 輸入框（避免輸入時被覆蓋）
    const configInput = document.getElementById('config-qr-url');
    if (document.activeElement !== configInput) {
        configInput.value = state.qrBaseUrl || '';
    }

    // 渲染歌手列表
    const list = document.getElementById('singers-list');
    list.innerHTML = state.singers.map(singer => {
        const isSelected = state.currentSingerId === singer.id;

        // 安全取票數：避免 state.votes 為 undefined
        const singerVotes = (state.votes && state.votes[singer.id]) || {};
        const voteCount = Object.values(singerVotes).reduce((a, b) => a + b, 0);

        return `
        <div class="bg-slate-800 rounded-xl p-4 border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-700'} transition hover:border-slate-600 relative group">
            <div class="flex gap-4">
                <div class="relative w-20 h-20 shrink-0">
                    <img src="${singer.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(singer.name) + '&background=random'}" 
                         class="w-full h-full object-cover rounded-lg bg-slate-900">
                    <label class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition cursor-pointer rounded-lg">
                        <i data-lucide="upload" class="text-white w-6 h-6"></i>
                        <input type="file" accept="image/*" class="hidden" onchange="window.uploadPhoto('${singer.id}', this)">
                    </label>
                </div>
                
                <div class="flex-1 min-w-0">
                    <input type="text" value="${singer.name}" 
                        class="bg-transparent font-bold text-white text-lg w-full focus:outline-none focus:border-b border-blue-500 mb-1"
                        onchange="window.updateSingerName('${singer.id}', this.value.trim())">
                    
                    <p class="text-xs text-slate-400 mb-2">ID: ${singer.id}</p>
                    
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 rounded bg-slate-900 text-xs text-slate-300 border border-slate-700">
                            票數: ${voteCount}
                        </span>
                        ${isSelected ? 
                            `<span class="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs border border-blue-800 font-bold">當前選中</span>` : 
                            `<button onclick="window.selectSinger('${singer.id}')" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-white transition">設為當前</button>`
                        }
                    </div>
                </div>

                <button onclick="window.deleteSinger('${singer.id}')" class="absolute top-2 right-2 p-2 text-slate-500 hover:text-red-400 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');

    lucide.createIcons();
}

function updateStatusPanel(state) {
    const statusEl = document.getElementById('current-status-display');
    const singerEl = document.getElementById('current-singer-display');
    const btnStart = document.getElementById('btn-start-vote');
    const btnStop = document.getElementById('btn-stop-vote');
    const btnCandidates = document.getElementById('btn-reveal-candidates');
    const btnFinal = document.getElementById('btn-reveal-final');

    statusEl.textContent = state.contestState || 'IDLE';

    const currentSinger = state.singers.find(s => s.id === state.currentSingerId);
    singerEl.textContent = currentSinger ? `當前：${currentSinger.name}` : '請先選擇一位歌手';

    // 先全部禁用
    [btnStart, btnStop, btnCandidates, btnFinal].forEach(b => b.disabled = true);

    if (state.currentSingerId) {
        switch (state.contestState) {
            case CONTEST_STATES.IDLE:
            case CONTEST_STATES.READY:
            case CONTEST_STATES.REVEAL_FINAL:
                btnStart.disabled = false;
                break;
            case CONTEST_STATES.VOTING:
                btnStop.disabled = false;
                break;
            case CONTEST_STATES.ENDED:
                btnStart.disabled = false;
                btnCandidates.disabled = false;
                break;
            case CONTEST_STATES.REVEAL_CANDIDATES:
                btnFinal.disabled = false;
                break;
        }
    }
}

// 全域函數（供 HTML 內聯事件使用）
window.selectSinger = async (id) => {
    await stateManager.setCurrentSinger(id);
};

window.deleteSinger = async (id) => {
    if (confirm('確定刪除此歌手？所有相關票數也會被清除')) {
        await stateManager.deleteSinger(id);
    }
};

window.updateSingerName = async (id, name) => {
    if (name.trim()) {
        await stateManager.updateSinger(id, { name: name.trim() });
    }
};

window.uploadPhoto = (id, input) => {
    if (input.files && input.files[0]) {
        stateManager.updateSingerPhoto(id, input.files[0]);
        input.value = ''; // 清空 input 以便重複上傳同一張圖
    }
};