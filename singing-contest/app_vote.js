import { stateManager } from './state_manager.js';
import { CONTEST_STATES } from './mock_data.js';


const urlParams = new URLSearchParams(window.location.search);
const targetSingerId = urlParams.get('sid');


const els = {
    loading: document.getElementById('state-loading'),
    inactive: document.getElementById('state-inactive'),
    form: document.getElementById('vote-form'),
    success: document.getElementById('state-success'),
    voted: document.getElementById('state-voted'),
    select: document.getElementById('guess-select')
};


let hasVotedLocally = false;

function checkLocalVote(singerId) {
    return localStorage.getItem(`voted_${singerId}`) === 'true';
}

function setLocalVote(singerId) {
    localStorage.setItem(`voted_${singerId}`, 'true');
}

stateManager.subscribe((data) => {

    els.loading.classList.add('hidden');
    
    const { contestState, currentSingerId, singers } = data;


    if (currentSingerId !== targetSingerId) {
        showView('inactive');
        return;
    }


    if (checkLocalVote(targetSingerId)) {
        showView('voted');
        return;
    }


    if (contestState === CONTEST_STATES.VOTING) {

        if (els.select.options.length <= 1) {

            singers.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name; // We vote by Name string for "Guessing"
                opt.textContent = s.name;
                els.select.appendChild(opt);
            });
        }
        showView('form');
    } else if (contestState === CONTEST_STATES.ENDED || contestState === CONTEST_STATES.REVEAL) {

        showView('inactive'); 
        document.querySelector('#state-inactive h3').textContent = "投票已截止";
    } else {
        showView('inactive'); // IDLE or READY
    }
});

function showView(viewName) {
    ['inactive', 'form', 'success', 'voted', 'loading'].forEach(v => {
        if (v === viewName) els[v].classList.remove('hidden');
        else els[v].classList.add('hidden');
    });
}


els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const guess = els.select.value;
    if (!guess) return;


    stateManager.submitVote(targetSingerId, guess);
    

    setLocalVote(targetSingerId);
    

    showView('success');
});
