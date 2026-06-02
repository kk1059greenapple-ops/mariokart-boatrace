function initApp() {
try {
    // === DOM Elements ===
    const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
    const views = Array.from(document.querySelectorAll('.view'));
    const toastEl = document.getElementById('toast');
    
    // Auth & Admin
    const adminAuthForm = document.getElementById('admin-auth-form');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminAuthContainer = document.getElementById('admin-auth-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const changePasswordForm = document.getElementById('change-password-form');
    const newAdminPasswordInput = document.getElementById('new-admin-password');
    
    // Admin: Commission Log
    const commissionLogTableBody = document.getElementById('commission-log-table-body');
    const commissionLogTableFoot = document.getElementById('commission-log-table-foot');
    const btnRefreshCommissionLog = document.getElementById('btn-refresh-commission-log');
    
    // Admin: Voters Bets Status
    const votersBetsContainer = document.getElementById('voters-bets-container');
    const btnRefreshVotersBets = document.getElementById('btn-refresh-voters-bets');
    
    // Admin: Voters Management
    const addVoterForm = document.getElementById('add-voter-form');
    const addVoterNameInput = document.getElementById('voter-name');
    const addVoterPassInput = document.getElementById('voter-pass');
    const votersList = document.getElementById('voters-list');

    // Admin: Player View
    const addPlayerForm = document.getElementById('add-player-form');
    const addPlayerNameInput = document.getElementById('player-name');
    const playersList = document.getElementById('players-list');
    
    // Admin: Player Baseline Stats
    const statsPlayerSelect = document.getElementById('stats-player-select');
    const playerStatsFormContainer = document.getElementById('player-stats-form-container');
    const statsRacesPlayed = document.getElementById('stats-races-played');
    const statsTotalPoints = document.getElementById('stats-total-points');
    const statsFirstPlaces = document.getElementById('stats-first-places');
    const statsSecondPlaces = document.getElementById('stats-second-places');
    const statsThirdPlaces = document.getElementById('stats-third-places');
    const statsFourthPlaces = document.getElementById('stats-fourth-places');
    const statsFifthPlaces = document.getElementById('stats-fifth-places');
    const statsSixthPlaces = document.getElementById('stats-sixth-places');
    const statsUnplaced = document.getElementById('stats-unplaced');
    const statsPointRate = document.getElementById('stats-point-rate');
    const btnSavePlayerStats = document.getElementById('btn-save-player-stats');
    const btnResetPlayerStats = document.getElementById('btn-reset-player-stats');
    const statsHistoryContainer = document.getElementById('stats-history-container');
    const statsHistoryList = document.getElementById('stats-history-list');
    
    // Admin: Setup View
    const setupPlayersList = document.getElementById('setup-players-list');
    const btnStartRace = document.getElementById('btn-start-race');
    const adminActiveRacesList = document.getElementById('admin-active-races-list');
    const adminBetTypeSelect = document.getElementById('admin-bet-type');
    const adminTeamAllocSection = document.getElementById('admin-team-allocation-section');
    const adminTeamAllocList = document.getElementById('admin-team-allocation-list');
    const btnRevealBets = document.getElementById('btn-reveal-bets');
    const btnHideBets = document.getElementById('btn-hide-bets');
    const btnShowOdds = document.getElementById('btn-show-odds');
    const btnHideOdds = document.getElementById('btn-hide-odds');
    
    // Admin: Live Record View
    const recordPlayersGrid = document.getElementById('record-players-grid');
    const liveRankingDisplay = document.getElementById('live-ranking-display');
    const btnLockRace = document.getElementById('btn-lock-race');
    const btnResetRecord = document.getElementById('btn-reset-record');
    const btnSubmitRecord = document.getElementById('btn-submit-record');
    const adminActiveRaceSection = document.getElementById('admin-active-race-section');
    const adminRaceNumberSelect = document.getElementById('admin-race-number-select');
    const adminRaceLockStatus = document.getElementById('admin-race-lock-status');
    const adminQuickLockBtn = document.getElementById('admin-quick-lock-btn');
    
    // Voter: Auth & Dashboard
    const voterRaceNumberSelect = document.getElementById('voter-race-number-select');
    const voterAuthContainer = document.getElementById('voter-auth-container');
    const voterAuthForm = document.getElementById('voter-auth-form');
    const voterLoginNameInput = document.getElementById('voter-login-name');
    const voterLoginPassInput = document.getElementById('voter-login-pass');
    const voterDashboard = document.getElementById('voter-dashboard');
    const btnVoterLogout = document.getElementById('btn-voter-logout');
    const displayVoterName = document.getElementById('display-voter-name');
    const displayAllowedBetType = document.getElementById('display-allowed-bet-type');
    
    const noRaceMessagePublic = document.getElementById('no-race-message-public');
    const activeVotingContent = document.getElementById('active-voting-content');
    const voteForm = document.getElementById('vote-form');
    const votingOddsDisplay = document.getElementById('voting-odds-display');
    const myVotesTableBody = document.getElementById('my-votes-table-body');
    
    // Stats View
    const statsTableBody = document.getElementById('stats-table-body');

    // === State ===
    let players = [];
    let voters = [];
    let currentRacePlayers = [];
    let currentRaceResults = [];
    let currentOdds = null;
    let allowedBetType = null;
    let isRaceLocked = false;
    let isOddsHidden = false;
    let activeRaces = {};
    let currentPools = {};
    let currentTotalBets = 0.0;
    let currentCarryoverPool = 0.0;
    
    // Grid Mark Sheet & Cart State
    let selectedMarkCombination = [[], [], []];
    let votingCart = [];
    let lastRenderedRaceKey = "";
    
    let isAdminAuthenticated = false; // Always starts as unauthenticated on reload for maximum security
    let currentVoter = null; // {id, name}
    try {
        const storedVoter = localStorage.getItem('currentVoter');
        if (storedVoter) currentVoter = JSON.parse(storedVoter);
    } catch(e) {}

    if (voterRaceNumberSelect) {
        voterRaceNumberSelect.addEventListener('change', () => {
            fetchActiveRace();
        });
    }

    if (adminRaceNumberSelect) {
        adminRaceNumberSelect.addEventListener('change', () => {
            adminRaceNumberSelect.dataset.userHasSelected = "true";
            fetchActiveRace();
        });
    }

    if (adminBetTypeSelect) {
        adminBetTypeSelect.addEventListener('change', () => {
            rebuildTeamAllocationUI();
        });
    }

    // === Navigation ===
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetId = btn.getAttribute('data-target');
            views.forEach(v => {
                if(v.id === targetId) {
                    v.classList.add('active');
                    if (targetId === 'view-admin') {
                        if (isAdminAuthenticated) {
                            loadPlayers();
                            loadVoters();
                            fetchActiveRace();
                            loadCommissionLog();
                            renderActiveRacesList();
                            loadVotersBets();
                            loadCompletedRacesHistory();
                            if (typeof loadAdminRaceResults === 'function') loadAdminRaceResults();
                        }
                    } else if (targetId === 'view-stats') {
                        loadStats();
                    } else if (targetId === 'view-voting') {
                        if (currentVoter) {
                            fetchActiveRace();
                            fetchMyVotes();
                        }
                    }
                } else {
                    v.classList.remove('active');
                    // Automatically log out of Admin Dashboard when leaving the admin view/tab!
                    if (v.id === 'view-admin') {
                        isAdminAuthenticated = false;
                        adminAuthContainer.style.display = 'block';
                        adminDashboard.style.display = 'none';
                        adminPasswordInput.value = '';
                    }
                }
            });
        });
    });

    // === Utils ===
    function showToast(msg, isError = false) {
        toastEl.textContent = msg;
        toastEl.className = 'toast show' + (isError ? ' error' : '');
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3000);
    }

    async function apiCall(url, method = 'GET', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const res = await fetch(url, options);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (e) {
            showToast(e.message, true);
            throw e;
        }
    }

    const betTypeNames = {
        'win': '単勝',
        'two_teams': '2チーム',
        'exacta': '2連単',
        'trifecta': '3連単'
    };

    // === Admin Auth ===
    if (adminAuthForm) {
        adminAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiCall('/api/auth', 'POST', { password: adminPasswordInput.value });
                isAdminAuthenticated = true;
                adminAuthContainer.style.display = 'none';
                adminDashboard.style.display = 'block';
                showToast('ログインしました！');
                loadPlayers();
                loadVoters();
                loadCommissionLog();
                renderActiveRacesList();
                loadVotersBets();
            } catch(err) {
                showToast('パスワードが正しくありません', true);
            }
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiCall('/api/admin/password', 'POST', { password: newAdminPasswordInput.value });
                newAdminPasswordInput.value = '';
                showToast('パスワードを変更しました！');
            } catch(err) {}
        });
    }

    // === Admin: Voters Logic ===
    async function loadVoters() {
        try {
            const data = await apiCall('/api/voters');
            voters = data.voters;
            renderVotersList();
        } catch(err) {}
    }

    function renderVotersList() {
        votersList.innerHTML = voters.map(v => 
            `<div class="player-tag" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <span style="font-size: 1.1rem;">${v.name}</span>
                <span style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Pass: <span style="color: var(--primary);">${v.password}</span></span>
                <button class="delete-voter-btn" data-id="${v.id}">&times;</button>
            </div>`
        ).join('');

        document.querySelectorAll('.delete-voter-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('このアカウントを削除してもよろしいですか？（関連する投票履歴も消えます）')) {
                    try {
                        await apiCall(`/api/voters/${id}`, 'DELETE');
                        showToast('アカウントを削除しました！');
                        loadVoters();
                    } catch(err) {}
                }
            });
        });
    }

    if (addVoterForm) {
        addVoterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = addVoterNameInput.value.trim();
            const password = addVoterPassInput.value;
            if (!name || !password) return;
            try {
                await apiCall('/api/voters', 'POST', { name, password });
                addVoterNameInput.value = '';
                addVoterPassInput.value = '';
                showToast('投票者アカウントを作成しました！');
                loadVoters();
            } catch(err) {}
        });
    }

    // === Admin: Players Logic ===
    if (addPlayerForm) addPlayerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = addPlayerNameInput.value.trim();
        if (!name) return;
        try {
            await apiCall('/api/players', 'POST', { name });
            addPlayerNameInput.value = '';
            showToast('選手を追加しました！');
            loadPlayers();
        } catch(err) {}
    });

    // Admin: Player Baseline Stats Logic
    function updateCalculatedStats() {
        const mode = document.querySelector('input[name="stats-save-mode"]:checked').value;
        const p1 = parseInt(statsFirstPlaces.value) || 0;
        const p2 = parseInt(statsSecondPlaces.value) || 0;
        const p3 = parseInt(statsThirdPlaces.value) || 0;
        const p4 = parseInt(statsFourthPlaces.value) || 0;
        const p5 = parseInt(statsFifthPlaces.value) || 0;
        const p6 = parseInt(statsSixthPlaces.value) || 0;
        const unplaced = parseInt(statsUnplaced.value) || 0;
        
        const inputRaces = p1 + p2 + p3 + p4 + p5 + p6 + unplaced;
        const inputPoints = (p1 * 10) + (p2 * 8) + (p3 * 7) + (p4 * 5) + (p5 * 4) + (p6 * 3);
        
        const id = statsPlayerSelect.value;
        const player = players.find(p => p.id === parseInt(id));
        
        if (mode === 'accumulate' && player) {
            // In accumulate mode, show the dynamic sum of (current + input)
            const currentRaces = player.races_played_manual || 0;
            const currentPoints = player.total_points_manual || 0;
            
            const totalRaces = currentRaces + inputRaces;
            const totalPoints = currentPoints + inputPoints;
            
            statsRacesPlayed.value = totalRaces;
            statsTotalPoints.value = totalPoints;
            statsPointRate.value = totalRaces > 0 ? (totalPoints / totalRaces).toFixed(2) : "0.00";
        } else {
            // Overwrite mode or no player selected: show exactly what is in input fields
            statsRacesPlayed.value = inputRaces;
            statsTotalPoints.value = inputPoints;
            statsPointRate.value = inputRaces > 0 ? (inputPoints / inputRaces).toFixed(2) : "0.00";
        }
    }

    function applySaveMode(mode) {
        const id = statsPlayerSelect.value;
        if (!id) return;
        const player = players.find(p => p.id === parseInt(id));
        if (!player) return;
        
        if (mode === 'accumulate') {
            statsFirstPlaces.value = 0;
            statsSecondPlaces.value = 0;
            statsThirdPlaces.value = 0;
            statsFourthPlaces.value = 0;
            statsFifthPlaces.value = 0;
            statsSixthPlaces.value = 0;
            statsUnplaced.value = 0;
            
            statsRacesPlayed.value = player.races_played_manual || 0;
            statsTotalPoints.value = player.total_points_manual || 0;
            statsPointRate.value = (player.races_played_manual || 0) > 0 ? 
                ((player.total_points_manual || 0) / player.races_played_manual).toFixed(2) : "0.00";
        } else {
            const races_played = player.races_played_manual || 0;
            const p1 = player.first_places_manual || 0;
            const p2 = Math.max(0, (player.second_places_manual || 0) - p1);
            const p3 = Math.max(0, (player.third_places_manual || 0) - (player.second_places_manual || 0));
            const p4 = player.fourth_places_manual || 0;
            const p5 = player.fifth_places_manual || 0;
            const p6 = player.sixth_places_manual || 0;
            const unplaced = player.unplaced_manual || 0;
            
            statsFirstPlaces.value = p1;
            statsSecondPlaces.value = p2;
            statsThirdPlaces.value = p3;
            statsFourthPlaces.value = p4;
            statsFifthPlaces.value = p5;
            statsSixthPlaces.value = p6;
            statsUnplaced.value = unplaced;
            
            statsRacesPlayed.value = races_played;
            statsTotalPoints.value = player.total_points_manual || 0;
            statsPointRate.value = races_played > 0 ? ((player.total_points_manual || 0) / races_played).toFixed(2) : "0.00";
        }
    }

    if (statsFirstPlaces) {
        ['input', 'change'].forEach(evtName => {
            statsFirstPlaces.addEventListener(evtName, updateCalculatedStats);
            statsSecondPlaces.addEventListener(evtName, updateCalculatedStats);
            statsThirdPlaces.addEventListener(evtName, updateCalculatedStats);
            statsFourthPlaces.addEventListener(evtName, updateCalculatedStats);
            statsFifthPlaces.addEventListener(evtName, updateCalculatedStats);
            statsSixthPlaces.addEventListener(evtName, updateCalculatedStats);
            statsUnplaced.addEventListener(evtName, updateCalculatedStats);
        });
        
        statsTotalPoints.addEventListener('input', () => {
            const points = parseInt(statsTotalPoints.value) || 0;
            const races = parseInt(statsRacesPlayed.value) || 0;
            statsPointRate.value = races > 0 ? (points / races).toFixed(2) : "0.00";
        });

        document.querySelectorAll('input[name="stats-save-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                applySaveMode(e.target.value);
                
                // Adjust radio label visual state
                const isAccum = e.target.value === 'accumulate';
                const accumLabel = document.querySelector('input[value="accumulate"]').parentNode;
                const overwLabel = document.querySelector('input[value="overwrite"]').parentNode;
                if (isAccum) {
                    accumLabel.style.color = 'var(--primary)';
                    overwLabel.style.color = 'var(--text-muted)';
                } else {
                    accumLabel.style.color = 'var(--text-muted)';
                    overwLabel.style.color = 'var(--primary)';
                }
            });
        });
    }

    async function loadPlayerStatsHistory() {
        const id = statsPlayerSelect.value;
        if (!id) {
            statsHistoryContainer.style.display = 'none';
            return;
        }
        
        try {
            const data = await apiCall(`/api/players/${id}/stats/log`);
            const log = data.log;
            
            if (log.length === 0) {
                statsHistoryContainer.style.display = 'none';
                return;
            }
            
            statsHistoryList.innerHTML = log.map(item => {
                const date = new Date(item.created_at + 'Z').toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });
                
                const breakdown = [];
                if (item.first_places > 0) breakdown.push(`1着x${item.first_places}回`);
                if (item.second_places > 0) breakdown.push(`2着x${item.second_places}回`);
                if (item.third_places > 0) breakdown.push(`3着x${item.third_places}回`);
                if (item.fourth_places > 0) breakdown.push(`4着x${item.fourth_places}回`);
                if (item.fifth_places > 0) breakdown.push(`5着x${item.fifth_places}回`);
                if (item.sixth_places > 0) breakdown.push(`6着x${item.sixth_places}回`);
                if (item.unplaced > 0) breakdown.push(`着外x${item.unplaced}回`);
                
                const breakdownStr = breakdown.length > 0 ? breakdown.join(', ') : '戦績加算なし';
                return `
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.8rem 1.2rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                        <div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${date}</div>
                            <div style="font-weight: bold; margin-top: 0.2rem; color: #fff;">${breakdownStr}</div>
                            <div style="font-size: 0.85rem; color: var(--primary); margin-top: 0.1rem;">
                                得点: +${item.total_points}点 / 出走数: +${item.races_played}回 / 得点率: ${(item.total_points / (item.races_played || 1)).toFixed(2)}
                            </div>
                        </div>
                        <button class="delete-history-entry-btn" data-id="${item.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin: 0; background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3); border-radius: 8px; color: #ff4d4d; cursor: pointer; transition: all 0.2s;">削除</button>
                    </div>
                `;
            }).join('');
            
            document.querySelectorAll('.delete-history-entry-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const logId = e.target.getAttribute('data-id');
                    if (confirm('この戦績履歴データを削除してもよろしいですか？（合計戦績からこの分が減算されます）')) {
                        try {
                            await apiCall(`/api/players/${id}/stats/log/${logId}`, 'DELETE');
                            showToast('戦績データを削除しました！');
                            await loadPlayers();
                            await loadStats();
                            
                            // Reload baseline values in inputs and refresh history list
                            statsPlayerSelect.dispatchEvent(new Event('change'));
                        } catch(e) {
                            showToast('削除に失敗しました', true);
                        }
                    }
                });
            });
            
            statsHistoryContainer.style.display = 'block';
        } catch(e) {
            statsHistoryContainer.style.display = 'none';
        }
    }

    if (statsPlayerSelect) {
        statsPlayerSelect.addEventListener('change', () => {
            const id = statsPlayerSelect.value;
            if (!id) {
                playerStatsFormContainer.style.display = 'none';
                statsHistoryContainer.style.display = 'none';
                return;
            }
            
            // Default to accumulate mode on player change
            const accumRadio = document.querySelector('input[name="stats-save-mode"][value="accumulate"]');
            if (accumRadio) {
                accumRadio.checked = true;
                accumRadio.dispatchEvent(new Event('change'));
            } else {
                applySaveMode('accumulate');
            }
            
            playerStatsFormContainer.style.display = 'block';
            loadPlayerStatsHistory();
        });
    }

    if (btnSavePlayerStats) {
        btnSavePlayerStats.addEventListener('click', async () => {
            const id = statsPlayerSelect.value;
            if (!id) return;
            
            const player = players.find(p => p.id === parseInt(id));
            if (!player) return;
            
            const mode = document.querySelector('input[name="stats-save-mode"]:checked').value;
            
            const p1 = parseInt(statsFirstPlaces.value) || 0;
            const p2 = parseInt(statsSecondPlaces.value) || 0;
            const p3 = parseInt(statsThirdPlaces.value) || 0;
            const p4 = parseInt(statsFourthPlaces.value) || 0;
            const p5 = parseInt(statsFifthPlaces.value) || 0;
            const p6 = parseInt(statsSixthPlaces.value) || 0;
            const unplaced = parseInt(statsUnplaced.value) || 0;
            
            const races_played = p1 + p2 + p3 + p4 + p5 + p6 + unplaced;
            const total_points = mode === 'accumulate' ? 
                ((p1 * 10) + (p2 * 8) + (p3 * 7) + (p4 * 5) + (p5 * 4) + (p6 * 3)) : 
                (parseInt(statsTotalPoints.value) || 0);
            
            try {
                const endpoint = mode === 'accumulate' ? `/api/players/${id}/stats/log` : `/api/players/${id}/stats/overwrite`;
                await apiCall(endpoint, 'POST', {
                    first_places: p1,
                    second_places: p2,
                    third_places: p3,
                    fourth_places: p4,
                    fifth_places: p5,
                    sixth_places: p6,
                    unplaced: unplaced,
                    races_played: races_played,
                    total_points: total_points
                });
                
                showToast(mode === 'accumulate' ? '選手の戦績を加算（蓄積）しました！' : '選手の戦績を上書き保存しました！');
                await loadPlayers();
                await loadStats();
                
                // Reset inputs to 0 after accumulation for premium UX
                if (mode === 'accumulate') {
                    statsFirstPlaces.value = 0;
                    statsSecondPlaces.value = 0;
                    statsThirdPlaces.value = 0;
                    statsFourthPlaces.value = 0;
                    statsFifthPlaces.value = 0;
                    statsSixthPlaces.value = 0;
                    statsUnplaced.value = 0;
                }
                
                // Reload form baseline data and refresh history list
                statsPlayerSelect.dispatchEvent(new Event('change'));
            } catch(e) {
                showToast('戦績の保存に失敗しました', true);
            }
        });
    }

    if (btnResetPlayerStats) {
        btnResetPlayerStats.addEventListener('click', async () => {
            const id = statsPlayerSelect.value;
            if (!id) return;
            
            const player = players.find(p => p.id === parseInt(id));
            if (!player) return;
            
            if (confirm(`選手「${player.name}」の登録されたすべての戦績履歴データを削除（初期化）してもよろしいですか？`)) {
                try {
                    await apiCall(`/api/players/${id}/stats`, 'DELETE');
                    showToast('選手の登録戦績を初期化しました！');
                    await loadPlayers();
                    await loadStats();
                    
                    statsPlayerSelect.dispatchEvent(new Event('change'));
                } catch(e) {
                    showToast('戦績の初期化に失敗しました', true);
                }
            }
        });
    }

    async function loadPlayers() {
        try {
            const data = await apiCall('/api/players');
            players = data.players;
            renderPlayersList();
            renderSetupPlayersList();
            populateStatsPlayerSelect();
        } catch(e) {}
    }

    function populateStatsPlayerSelect() {
        if (!statsPlayerSelect) return;
        const currentSelectedId = statsPlayerSelect.value;
        statsPlayerSelect.innerHTML = '<option value="">-- 選手を選択してください --</option>' + players.map(p => 
            `<option value="${p.id}">${p.name}</option>`
        ).join('');
        if (currentSelectedId) {
            statsPlayerSelect.value = currentSelectedId;
        }
    }

    function renderPlayersList() {
        playersList.innerHTML = players.map(p => 
            `<div class="player-tag" style="display: flex; align-items: center; gap: 0.8rem;">
                <span>${p.name}</span>
                <span class="edit-stats-btn" data-id="${p.id}" style="cursor: pointer; font-size: 0.85rem; color: var(--primary); opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">⚙️ 戦績</span>
                <button class="delete-player-btn" data-id="${p.id}" style="margin-left: auto;">&times;</button>
            </div>`
        ).join('');

        document.querySelectorAll('.delete-player-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('この選手を削除してもよろしいですか？（過去の成績データも削除されます）')) {
                    try {
                        await apiCall(`/api/players/${id}`, 'DELETE');
                        showToast('選手を削除しました！');
                        loadPlayers();
                        loadStats();
                    } catch(err) {}
                }
            });
        });

        document.querySelectorAll('.edit-stats-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                if (statsPlayerSelect) {
                    statsPlayerSelect.value = id;
                    statsPlayerSelect.dispatchEvent(new Event('change'));
                    
                    // Smooth scroll to the form
                    const formCard = document.getElementById('stats-player-select').closest('.glass-card');
                    if (formCard) {
                        formCard.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // === Admin: Setup Race ===
    function rebuildTeamAllocationUI() {
        if (!adminTeamAllocSection || !adminTeamAllocList) return;
        
        if (adminBetTypeSelect.value !== 'two_teams') {
            adminTeamAllocSection.style.display = 'none';
            return;
        }
        
        const selectedCbs = Array.from(document.querySelectorAll('.setup-checkbox:checked'));
        if (selectedCbs.length === 0) {
            adminTeamAllocList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1rem;">出走選手を選択してください</div>';
            adminTeamAllocSection.style.display = 'block';
            return;
        }
        
        adminTeamAllocSection.style.display = 'block';
        adminTeamAllocList.innerHTML = selectedCbs.map((cb, selIdx) => {
            const pid = parseInt(cb.value);
            const player = players.find(p => p.id === pid);
            const pName = player ? player.name : '不明';
            const defaultTeam = (selIdx % 2 === 0) ? 1 : 2;
            
            return `
                <div class="team-alloc-card" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.5rem; text-align: center; justify-content: center; align-items: center;">
                    <div style="font-weight: bold; color: #fff; font-size: 1rem;">${pName}</div>
                    <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.25rem;">
                        <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 0.9rem; padding: 0.3rem 0.6rem; border-radius: 6px; background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3);">
                            <input type="radio" name="team-assign-${pid}" value="1" ${defaultTeam === 1 ? 'checked' : ''} class="team-assign-radio" data-player-id="${pid}">
                            🔴 赤
                        </label>
                        <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 0.9rem; padding: 0.3rem 0.6rem; border-radius: 6px; background: rgba(0, 119, 255, 0.1); border: 1px solid rgba(0, 119, 255, 0.3);">
                            <input type="radio" name="team-assign-${pid}" value="2" ${defaultTeam === 2 ? 'checked' : ''} class="team-assign-radio" data-player-id="${pid}">
                            🔵 青
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderSetupPlayersList() {
        const activePlayerIds = currentRacePlayers.map(p => p.id);
        setupPlayersList.innerHTML = players.map(p => {
            const isChecked = activePlayerIds.includes(p.id) ? 'checked' : '';
            const isSelectedClass = activePlayerIds.includes(p.id) ? 'selected' : '';
            return `
                <label class="setup-checkbox-label ${isSelectedClass}" id="lbl-player-${p.id}">
                    <input type="checkbox" value="${p.id}" class="setup-checkbox" ${isChecked}>
                    ${p.name}
                </label>
            `;
        }).join('');

        document.querySelectorAll('.setup-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const lbl = document.getElementById(`lbl-player-${e.target.value}`);
                if (e.target.checked) lbl.classList.add('selected');
                else lbl.classList.remove('selected');
                rebuildTeamAllocationUI();
            });
        });
        
        rebuildTeamAllocationUI();
    }

    if (btnStartRace) btnStartRace.addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.setup-checkbox:checked')).map(cb => parseInt(cb.value));
        if (selected.length < 3) {
            showToast('レースを開始するには最低3名を選択してください', true);
            return;
        }
        
        let teams = {};
        if (adminBetTypeSelect.value === 'two_teams') {
            selected.forEach(pid => {
                const radio = document.querySelector(`input[name="team-assign-${pid}"]:checked`);
                teams[pid] = radio ? parseInt(radio.value) : 1;
            });
        }
        
        try {
            await apiCall('/api/races/active', 'POST', { 
                race_number: parseInt(adminRaceNumberSelect.value),
                player_ids: selected,
                allowed_bet_type: adminBetTypeSelect.value,
                teams: teams
            });
            showToast('レースを作成しました！');
            await fetchActiveRace();
            await renderActiveRacesList();
            await loadCommissionLog();
        } catch(e) {}
    });

    if (btnRevealBets) {
        btnRevealBets.addEventListener('click', async () => {
            try {
                await apiCall('/api/admin/settings/reveal_bets', 'POST', { reveal: true });
                showToast('掲示板の買い目表示を【公開】に設定しました！');
            } catch(e) {
                showToast('設定の変更に失敗しました', true);
            }
        });
    }

    if (btnHideBets) {
        btnHideBets.addEventListener('click', async () => {
            try {
                await apiCall('/api/admin/settings/reveal_bets', 'POST', { reveal: false });
                showToast('掲示板の買い目表示を【非表示】に設定しました！');
            } catch(e) {
                showToast('設定の変更に失敗しました', true);
            }
        });
    }

    if (btnShowOdds) {
        btnShowOdds.addEventListener('click', async () => {
            try {
                await apiCall('/api/admin/settings/hide_odds', 'POST', { hide: false });
                showToast('投票ページのオッズ表示を【公開】に設定しました！');
            } catch(e) {
                showToast('設定の変更に失敗しました', true);
            }
        });
    }

    if (btnHideOdds) {
        btnHideOdds.addEventListener('click', async () => {
            try {
                await apiCall('/api/admin/settings/hide_odds', 'POST', { hide: true });
                showToast('投票ページのオッズ表示を【非表示】に設定しました！');
            } catch(e) {
                showToast('設定の変更に失敗しました', true);
            }
        });
    }

    async function renderActiveRacesList() {
        if (!isAdminAuthenticated) return;
        try {
            const data = await apiCall('/api/races/active_all');
            const races = data.races;
            
            const betTypeNamesMap = {
                'win': '単勝',
                'two_teams': '2チーム',
                'exacta': '2連単',
                'trifecta': '3連単'
            };
            
            let activeRacesHtml = '';
            for (let rNum = 1; rNum <= 10; rNum++) {
                const race = races[rNum.toString()];
                if (race && race.active) {
                    const betTypeName = betTypeNamesMap[race.allowed_bet_type] || '未指定';
                    activeRacesHtml += `
                        <div class="player-tag active-race-tag" style="background: rgba(0, 240, 255, 0.05); border: 1px solid var(--primary); display: inline-flex; align-items: center; gap: 8px; justify-content: space-between; padding: 0.5rem 1rem;">
                            <span style="font-weight: bold; color: #fff;">${rNum}R (${betTypeName})</span>
                            <button class="delete-active-race-btn" data-race-number="${rNum}" style="background: none; border: none; color: #ff4d4d; font-size: 1.25rem; font-weight: bold; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
                        </div>
                    `;
                }
            }
            
            if (!activeRacesHtml) {
                activeRacesHtml = '<div class="text-muted" style="font-size: 0.9rem; padding: 0.5rem 0;">作成済みの出走表はありません</div>';
            }
            
            adminActiveRacesList.innerHTML = activeRacesHtml;
            
            // Set up delete event listeners
            document.querySelectorAll('.delete-active-race-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const rNum = e.target.getAttribute('data-race-number');
                    if (confirm(`${rNum}R の出走表を削除し、このレースへのすべての投票をリセットしますか？`)) {
                        try {
                            await apiCall(`/api/races/active?race_number=${rNum}`, 'DELETE');
                            showToast(`${rNum}R の出走表を削除しました！`);
                            // Clear checked boxes in setup list
                            document.querySelectorAll('.setup-checkbox').forEach(cb => cb.checked = false);
                            document.querySelectorAll('.setup-checkbox-label').forEach(lbl => lbl.classList.remove('selected'));
                            await fetchActiveRace();
                            await renderActiveRacesList();
                            await loadCommissionLog();
                            loadVotersBets();
                            loadCompletedRacesHistory();
                        } catch(err) {
                            showToast('削除に失敗しました', true);
                        }
                    }
                });
            });
        } catch(e) {
            console.error("Error in renderActiveRacesList:", e);
        }
    }

    // === Voter Auth Logic ===
    if (voterAuthForm) {
        voterAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const data = await apiCall('/api/voter/auth', 'POST', { 
                    name: voterLoginNameInput.value.trim(), 
                    password: voterLoginPassInput.value 
                });
                currentVoter = data.voter;
                localStorage.setItem('currentVoter', JSON.stringify(currentVoter));
                displayVoterName.textContent = currentVoter.name;
                voterAuthContainer.style.display = 'none';
                voterDashboard.style.display = 'block';
                showToast(`${currentVoter.name}さん、ログインしました！`);
                voterLoginPassInput.value = ''; // clear for security
                
                fetchActiveRace();
                fetchMyVotes();
            } catch(err) {}
        });
    }

    if (btnVoterLogout) btnVoterLogout.addEventListener('click', () => {
        currentVoter = null;
        localStorage.removeItem('currentVoter');
        voterDashboard.style.display = 'none';
        voterAuthContainer.style.display = 'block';
        
        // Reset cart and mark combinations to prevent account pollution
        votingCart = [];
        selectedMarkCombination = [[], [], []];
        if (typeof updateVoteMarkSheet === 'function') updateVoteMarkSheet();
        if (typeof renderCartTable === 'function') renderCartTable();
        
        showToast('ログアウトしました');
    });

    // === Fetch Active Race State ===
    async function fetchActiveRace(raceNumber) {
        // 1. Fetch state of all 10 races to keep our local cache updated
        try {
            const allData = await apiCall('/api/races/active_all');
            activeRaces = allData.races;
        } catch (e) {
            console.error("Failed to fetch all active races state:", e);
        }

        // 2. Suggest next available race for Admin automatically
        if (isAdminAuthenticated && views.find(v => v.id === 'view-admin')?.classList.contains('active')) {
            let firstInactive = 1;
            for (let r = 1; r <= 10; r++) {
                if (activeRaces[r] && !activeRaces[r].active) {
                    firstInactive = r;
                    break;
                }
            }
            if (adminRaceNumberSelect && !adminRaceNumberSelect.dataset.userHasSelected) {
                adminRaceNumberSelect.value = firstInactive;
                raceNumber = firstInactive;
            }
        }

        if (!raceNumber) {
            const adminActive = views.find(v => v.id === 'view-admin')?.classList.contains('active');
            if (adminActive && adminRaceNumberSelect) {
                raceNumber = parseInt(adminRaceNumberSelect.value) || 1;
            } else if (voterRaceNumberSelect) {
                raceNumber = parseInt(voterRaceNumberSelect.value) || 1;
            } else {
                raceNumber = 1;
            }
        }

        try {
            const data = await apiCall(`/api/races/active?race_number=${raceNumber}`);
            currentCarryoverPool = data.carryover_pool || 0.0;
            updateCarryoverUI();
            if (data.active) {
                const resultsSection = document.getElementById('voter-race-results-section');
                if (resultsSection) resultsSection.style.display = 'none';

                currentRacePlayers = data.players;
                currentOdds = data.odds;
                currentPools = data.pools || {};
                currentTotalBets = data.total_bets || 0.0;
                allowedBetType = data.allowed_bet_type;
                isRaceLocked = data.is_locked;
                isOddsHidden = data.hide_odds || false;
                currentRaceResults = [];
                
                // Admin Active Race Section (Live record control)
                if (isAdminAuthenticated) {
                    adminActiveRaceSection.style.display = 'block';
                    renderRecordView();
                    
                    if (adminRaceLockStatus && adminQuickLockBtn) {
                        if (isRaceLocked) {
                            adminRaceLockStatus.textContent = '🔒 投票締切済';
                            adminRaceLockStatus.style.color = '#ff4d4d';
                            adminRaceLockStatus.style.borderColor = 'rgba(255, 77, 77, 0.4)';
                            adminRaceLockStatus.style.background = 'rgba(255, 77, 77, 0.1)';
                            adminQuickLockBtn.style.display = 'none';
                        } else {
                            adminRaceLockStatus.textContent = '🟢 投票受付中';
                            adminRaceLockStatus.style.color = '#00ff88';
                            adminRaceLockStatus.style.borderColor = 'rgba(0, 255, 136, 0.4)';
                            adminRaceLockStatus.style.background = 'rgba(0, 255, 136, 0.1)';
                            adminQuickLockBtn.style.display = 'inline-block';
                        }
                    }
                } else {
                    adminActiveRaceSection.style.display = 'none';
                    if (adminRaceLockStatus) {
                        adminRaceLockStatus.textContent = '⚪ 未作成';
                        adminRaceLockStatus.style.color = 'var(--text-muted)';
                        adminRaceLockStatus.style.borderColor = 'rgba(255,255,255,0.1)';
                        adminRaceLockStatus.style.background = 'rgba(255,255,255,0.05)';
                    }
                    if (adminQuickLockBtn) adminQuickLockBtn.style.display = 'none';
                }
                
                // Admin Setup Form synchronization
                if (adminBetTypeSelect) {
                    adminBetTypeSelect.value = allowedBetType;
                }
                if (isAdminAuthenticated) {
                    renderSetupPlayersList();
                }
                
                // Voter Tab setup
                if (currentVoter) {
                    noRaceMessagePublic.style.display = 'none';
                    activeVotingContent.style.display = 'block';
                    displayAllowedBetType.textContent = betTypeNames[allowedBetType];
                    
                    // Render Stats
                    const statsData = await apiCall('/api/stats');
                    const activeStats = currentRacePlayers.map(p => {
                        const s = statsData.stats.find(stat => stat.id === p.id);
                        return s || { id: p.id, name: p.name, races_played: 0, point_rate: 0, win_rate: 0, quinella_rate: 0, exacta_rate: 0 };
                    });
                    const tbody = document.getElementById('voting-stats-table-body');
                    if (tbody) {
                        tbody.innerHTML = activeStats.map((s, idx) => `
                            <tr>
                                <td style="font-weight:bold; color:var(--primary);">${idx + 1}</td>
                                <td>${s.name}</td>
                                <td>${s.races_played}</td>
                                <td>${s.point_rate.toFixed(2)}</td>
                                <td>${(s.win_rate * 100).toFixed(1)}%</td>
                                <td>${(s.quinella_rate * 100).toFixed(1)}%</td>
                                <td>${(s.exacta_rate * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('');
                    }

                    // Check if race is locked
                    const lockMessageEl = document.getElementById('voter-locked-message');
                    const markSheetCardEl = document.getElementById('voter-mark-sheet-card');
                    if (lockMessageEl && markSheetCardEl) {
                        if (isRaceLocked) {
                            lockMessageEl.style.display = 'block';
                            markSheetCardEl.style.display = 'none';
                            const cartSection = document.getElementById('cart-list-section');
                            if (cartSection) cartSection.style.display = 'none';
                        } else {
                            lockMessageEl.style.display = 'none';
                            markSheetCardEl.style.display = 'block';
                        }
                    }

                    // Update voter mark sheet options and status
                    updateVoteMarkSheet();
                    
                    renderVoterOddsView();
                }
            } else {
                currentRacePlayers = [];
                currentOdds = null;
                allowedBetType = null;
                
                // Admin Active Race Section
                adminActiveRaceSection.style.display = 'none';

                if (isAdminAuthenticated) {
                    renderSetupPlayersList();
                }

                // Voter Tab
                if (currentVoter) {
                    try {
                        const resData = await apiCall(`/api/races/results?race_number=${raceNumber}`);
                        const resultsSection = document.getElementById('voter-race-results-section');
                        if (resData.completed) {
                            noRaceMessagePublic.style.display = 'none';
                            activeVotingContent.style.display = 'none';
                            if (resultsSection) resultsSection.style.display = 'block';
                            
                            // Render Bet Type
                            const betTypesMap = { 'win': '単勝', 'two_teams': '2チーム', 'exacta': '2連単', 'trifecta': '3連単' };
                            const betTypeLabel = document.getElementById('voter-results-bet-type');
                            if (betTypeLabel) betTypeLabel.textContent = betTypesMap[resData.bet_type] || resData.bet_type;
                            
                            // Render Ranking
                            const rankingList = document.getElementById('voter-results-ranking-list');
                            if (rankingList) {
                                rankingList.innerHTML = resData.results.map(r => `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                                        <span style="font-weight: bold; color: var(--primary);">${r.position}着</span>
                                        <span>${r.player_name}</span>
                                        <span style="font-size: 0.85rem; color: var(--text-muted);">(+${r.points}点)</span>
                                    </div>
                                `).join('');
                            }
                            
                            // Filter my votes for this race
                            const myVotesForRace = resData.votes.filter(v => v.voter_id === currentVoter.id);
                            const myTbody = document.getElementById('voter-results-my-tbody');
                            if (myTbody) {
                                if (myVotesForRace.length > 0) {
                                    myTbody.innerHTML = myVotesForRace.map(w => {
                                        const payoutStr = w.is_hit 
                                            ? `<span style="color: var(--success); font-weight: bold;">+${w.payout.toLocaleString()} G</span>`
                                            : '<span style="color: var(--text-muted);">0 G</span>';
                                        return `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 0.75rem 0.5rem; color: var(--primary); font-family: monospace;">${w.display_pattern}</td>
                                                <td style="padding: 0.75rem 0.5rem;">${w.amount} G</td>
                                                <td style="padding: 0.75rem 0.5rem; color: var(--warning); font-weight: bold;">${w.odds.toFixed(1)}倍</td>
                                                <td style="padding: 0.75rem 0.5rem;">${payoutStr}</td>
                                            </tr>
                                        `;
                                    }).join('');
                                } else {
                                    myTbody.innerHTML = `
                                        <tr>
                                            <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                                                このレースへの投票はありませんでした
                                            </td>
                                        </tr>
                                    `;
                                }
                            }
                        } else {
                            if (resultsSection) resultsSection.style.display = 'none';
                            noRaceMessagePublic.style.display = 'block';
                            activeVotingContent.style.display = 'none';
                        }
                    } catch(err) {
                        const resultsSection = document.getElementById('voter-race-results-section');
                        if (resultsSection) resultsSection.style.display = 'none';
                        noRaceMessagePublic.style.display = 'block';
                        activeVotingContent.style.display = 'none';
                    }
                }
            }
        } catch(err) {
            console.error("Error in fetchActiveRace:", err);
        }
    }

    function updateVoteMarkSheet() {
        if (!voterRaceNumberSelect) return;
        const rNum = voterRaceNumberSelect.value;
        const raceData = activeRaces[rNum];
        
        // Find DOM container
        const container = document.getElementById('mark-sheet-rows-container');
        const betTypeLabel = document.getElementById('mark-sheet-bet-type-label');
        if (!container || !betTypeLabel) return;
        
        if (!raceData || !raceData.active) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-weight: bold;">
                    出走表が登録されていません。
                </div>
            `;
            betTypeLabel.textContent = '---';
            return;
        }
        
        const currentRaceKey = `${rNum}_${raceData.allowed_bet_type}`;
        if (lastRenderedRaceKey !== currentRaceKey) {
            selectedMarkCombination = [[], [], []];
            lastRenderedRaceKey = currentRaceKey;
        }
        
        betTypeLabel.textContent = betTypeNames[raceData.allowed_bet_type] || '---';
        
        // Restore/Set place columns in headers
        const place1Header = document.querySelector('.mark-sheet-row.header .place-1');
        const place2Header = document.querySelector('.mark-sheet-row.header .place-2');
        const place3Header = document.querySelector('.mark-sheet-row.header .place-3');
        
        if (raceData.allowed_bet_type === 'two_teams') {
            if (place1Header) place1Header.textContent = '選択';
            if (place2Header) place2Header.style.display = 'none';
            if (place3Header) place3Header.style.display = 'none';
            
            const redTeamPlayers = raceData.players.filter((p, idx) => (idx + 1) % 2 !== 0).map(p => p.name).join(', ');
            const blueTeamPlayers = raceData.players.filter((p, idx) => (idx + 1) % 2 === 0).map(p => p.name).join(', ');
            
            container.innerHTML = `
                <div class="mark-sheet-row team-row" data-team-id="1" style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between;">
                    <div class="mark-sheet-col col-runner" style="justify-content: flex-start;">
                        <span class="runner-boat-badge" style="background: linear-gradient(135deg, #ff4d4d, #b30000); box-shadow: 0 0 10px rgba(255, 77, 77, 0.4); width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; margin-right: 1rem;">赤</span>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: bold; color: #fff;">赤チーム (1・3・5号艇)</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${redTeamPlayers}</span>
                        </div>
                    </div>
                    <div class="mark-sheet-col col-place place-1">
                        <button type="button" class="cell-select-btn team-select-btn" data-place="1" data-player-id="1" style="background: linear-gradient(135deg, #ff4d4d, #b30000); box-shadow: 0 0 10px rgba(255, 77, 77, 0.3); border: none; padding: 0.75rem 2rem; border-radius: 12px; font-weight: bold; color: #fff; cursor: pointer; transition: all 0.2s;">選択</button>
                    </div>
                </div>
                <div class="mark-sheet-row team-row" data-team-id="2" style="padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between;">
                    <div class="mark-sheet-col col-runner" style="justify-content: flex-start;">
                        <span class="runner-boat-badge" style="background: linear-gradient(135deg, #0077ff, #0000b3); box-shadow: 0 0 10px rgba(0, 119, 255, 0.4); width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; margin-right: 1rem;">青</span>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: bold; color: #fff;">青チーム (2・4・6号艇)</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${blueTeamPlayers}</span>
                        </div>
                    </div>
                    <div class="mark-sheet-col col-place place-1">
                        <button type="button" class="cell-select-btn team-select-btn" data-place="1" data-player-id="2" style="background: linear-gradient(135deg, #0077ff, #0000b3); box-shadow: 0 0 10px rgba(0, 119, 255, 0.3); border: none; padding: 0.75rem 2rem; border-radius: 12px; font-weight: bold; color: #fff; cursor: pointer; transition: all 0.2s;">選択</button>
                    </div>
                </div>
            `;
            
            document.querySelectorAll('.team-select-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (raceData.is_locked) return;
                    const teamVal = parseInt(e.currentTarget.getAttribute('data-player-id'));
                    if (selectedMarkCombination[0].includes(teamVal)) {
                        selectedMarkCombination[0] = [];
                    } else {
                        selectedMarkCombination[0] = [teamVal];
                    }
                    refreshTeamSelectionUI();
                    updateSelectedOddsDisplay();
                });
            });
            
            refreshTeamSelectionUI();
            updateSelectedOddsDisplay();
            return;
        }
        
        if (place1Header) place1Header.textContent = '1着';
        if (place2Header) place2Header.style.display = 'flex';
        if (place3Header) place3Header.style.display = 'flex';

        // Generate rows for each player
        const html = raceData.players.map((p, idx) => {
            const boatNum = idx + 1;
            const is1stDisabled = raceData.is_locked ? 'disabled' : '';
            const is2ndDisabled = (raceData.is_locked || raceData.allowed_bet_type === 'win') ? 'disabled' : '';
            const is3rdDisabled = (raceData.is_locked || raceData.allowed_bet_type === 'win' || raceData.allowed_bet_type === 'exacta') ? 'disabled' : '';
            
            return `
                <div class="mark-sheet-row" data-player-id="${p.id}">
                    <div class="mark-sheet-col col-runner" style="justify-content: flex-start; padding-left: 1.5rem;">
                        <span class="runner-boat-badge boat-badge-${boatNum}">${boatNum}</span>
                        <span class="runner-name-text">${p.name}</span>
                    </div>
                    <div class="mark-sheet-col col-place place-1">
                        <button type="button" class="cell-select-btn" data-place="1" data-player-id="${p.id}" data-boat-num="${boatNum}" ${is1stDisabled}>${boatNum}</button>
                    </div>
                    <div class="mark-sheet-col col-place place-2">
                        <button type="button" class="cell-select-btn" data-place="2" data-player-id="${p.id}" data-boat-num="${boatNum}" ${is2ndDisabled}>${boatNum}</button>
                    </div>
                    <div class="mark-sheet-col col-place place-3">
                        <button type="button" class="cell-select-btn" data-place="3" data-player-id="${p.id}" data-boat-num="${boatNum}" ${is3rdDisabled}>${boatNum}</button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
        // Hide unused place columns in headers
        
        if (raceData.allowed_bet_type === 'win') {
            if (place2Header) place2Header.style.display = 'none';
            if (place3Header) place3Header.style.display = 'none';
            document.querySelectorAll('.mark-sheet-row:not(.header) .place-2').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.mark-sheet-row:not(.header) .place-3').forEach(el => el.style.display = 'none');
        } else if (raceData.allowed_bet_type === 'exacta') {
            if (place2Header) place2Header.style.display = 'flex';
            if (place3Header) place3Header.style.display = 'none';
            document.querySelectorAll('.mark-sheet-row:not(.header) .place-2').forEach(el => el.style.display = 'flex');
            document.querySelectorAll('.mark-sheet-row:not(.header) .place-3').forEach(el => el.style.display = 'none');
        } else {
            if (place2Header) place2Header.style.display = 'flex';
            if (place3Header) place3Header.style.display = 'flex';
            document.querySelectorAll('.mark-sheet-row:not(.header) .place-2').forEach(el => el.style.display = 'flex');
            document.querySelectorAll('.mark-sheet-row:not(.header) .place-3').forEach(el => el.style.display = 'flex');
        }
        
        // Restore active class based on selectedMarkCombination
        refreshCellSelectionUI();
        updateSelectedOddsDisplay();
        
        // Bind selection event listeners
        document.querySelectorAll('.cell-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.currentTarget;
                const placeIdx = parseInt(btnEl.getAttribute('data-place')) - 1;
                const playerId = parseInt(btnEl.getAttribute('data-player-id'));
                
                // Toggle selection (multiple selection allowed for formation!)
                if (selectedMarkCombination[placeIdx].includes(playerId)) {
                    selectedMarkCombination[placeIdx] = selectedMarkCombination[placeIdx].filter(id => id !== playerId);
                } else {
                    selectedMarkCombination[placeIdx].push(playerId);
                }
                
                refreshCellSelectionUI();
                updateSelectedOddsDisplay();
            });
        });
    }

    function refreshCellSelectionUI() {
        document.querySelectorAll('.cell-select-btn').forEach(btn => {
            const btnPlaceIdx = parseInt(btn.getAttribute('data-place')) - 1;
            const btnPlayerId = parseInt(btn.getAttribute('data-player-id'));
            
            if (selectedMarkCombination[btnPlaceIdx].includes(btnPlayerId)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function refreshTeamSelectionUI() {
        document.querySelectorAll('.team-select-btn').forEach(btn => {
            const teamVal = parseInt(btn.getAttribute('data-player-id'));
            if (selectedMarkCombination[0].includes(teamVal)) {
                btn.classList.add('active');
                btn.style.filter = 'brightness(1.2) contrast(1.1)';
                btn.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.4)';
                btn.textContent = '選択中';
            } else {
                btn.classList.remove('active');
                btn.style.filter = 'none';
                btn.style.boxShadow = 'none';
                btn.textContent = '選択';
            }
        });
    }

    function getSelectedCombinations() {
        const rNum = voterRaceNumberSelect.value;
        const raceData = activeRaces[rNum];
        if (!raceData || !raceData.active) return [];
        
        const type = raceData.allowed_bet_type;
        const A = selectedMarkCombination[0] || [];
        const B = selectedMarkCombination[1] || [];
        const C = selectedMarkCombination[2] || [];
        
        const list = [];
        
        if (type === 'win') {
            for (let a of A) {
                list.push({ pattern: [a], type: 'win' });
            }
        } else if (type === 'two_teams') {
            for (let a of A) {
                list.push({ pattern: [a], type: 'two_teams' });
            }
        } else if (type === 'exacta') {
            for (let a of A) {
                for (let b of B) {
                    if (a !== b) {
                        list.push({ pattern: [a, b], type: 'exacta' });
                    }
                }
            }
        } else if (type === 'trifecta') {
            for (let a of A) {
                for (let b of B) {
                    for (let c of C) {
                        if (a !== b && a !== c && b !== c) {
                            list.push({ pattern: [a, b, c], type: 'trifecta' });
                        }
                    }
                }
            }
        }
        return list;
    }

    function updateSelectedOddsDisplay() {
        const oddsValEl = document.getElementById('selected-bet-odds-val');
        const patternDisplayEl = document.getElementById('selected-bet-pattern-display');
        if (!oddsValEl || !patternDisplayEl) return;
        
        const combinations = getSelectedCombinations();
        if (combinations.length === 0) {
            oddsValEl.textContent = '---';
            patternDisplayEl.textContent = '選択されていません';
            return;
        }
        
        const rNum = voterRaceNumberSelect.value;
        const raceData = activeRaces[rNum];
        if (!raceData || !raceData.active || !currentOdds) return;
        
        const type = raceData.allowed_bet_type;
        
        // Render combination text description
        // Get sorted boat numbers for display in each column
        const getDisplayGroup = (pids) => {
            if (pids.length === 0) return '?';
            return pids.map(pid => {
                const idx = raceData.players.findIndex(p => p.id === pid);
                return idx !== -1 ? (idx + 1) : '?';
            }).sort((a, b) => a - b).join(',');
        };
        
        let patternStr = "";
        if (type === 'win') {
            patternStr = `${getDisplayGroup(selectedMarkCombination[0])}号艇`;
        } else if (type === 'two_teams') {
            patternStr = selectedMarkCombination[0][0] === 1 ? '赤チーム (1・3・5号艇)' : '青チーム (2・4・6号艇)';
        } else if (type === 'exacta') {
            patternStr = `${getDisplayGroup(selectedMarkCombination[0])} - ${getDisplayGroup(selectedMarkCombination[1])}`;
        } else {
            patternStr = `${getDisplayGroup(selectedMarkCombination[0])} - ${getDisplayGroup(selectedMarkCombination[1])} - ${getDisplayGroup(selectedMarkCombination[2])}`;
        }
        
        patternDisplayEl.textContent = `${patternStr} (計 ${combinations.length} 点)`;
        if (isOddsHidden) {
            oddsValEl.textContent = '🔒 非表示';
            return;
        }

        let matchedOddsList = [];
        for (let comb of combinations) {
            let liveOdds = 0.0;
            if (currentOdds && currentOdds[type]) {
                const oddsData = currentOdds[type];
                if (type === 'win') {
                    const found = oddsData.find(o => o.player_id === comb.pattern[0]);
                    if (found) liveOdds = found.odds;
                } else {
                    const patternStr = JSON.stringify(comb.pattern);
                    const found = oddsData.find(o => JSON.stringify(o.pattern) === patternStr);
                    if (found) liveOdds = found.odds;
                }
            }
            if (liveOdds >= 1.0) {
                matchedOddsList.push(liveOdds);
            }
        }
        
        if (matchedOddsList.length === 0) {
            oddsValEl.textContent = '---';
        } else {
            const minOdds = Math.min(...matchedOddsList);
            const maxOdds = Math.max(...matchedOddsList);
            if (minOdds === maxOdds) {
                oddsValEl.textContent = `${minOdds.toFixed(1)}倍`;
            } else {
                oddsValEl.textContent = `${minOdds.toFixed(1)}倍 〜 ${maxOdds.toFixed(1)}倍`;
            }
        }
    }

    function renderVoterOddsView() {
        if (isOddsHidden) {
            votingOddsDisplay.innerHTML = `
                <div style="grid-column: 1 / -1; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--glass-border); border-radius: 20px; padding: 2.5rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 1.1rem; font-weight: bold; letter-spacing: 0.5px; animation: fadeIn 0.4s ease;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.8rem; filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.2));">🔒</div>
                    オッズは現在締め切り前のため非表示となっています
                </div>
            `;
            return;
        }

        if (!currentOdds || !allowedBetType) return;
        const oddsData = currentOdds[allowedBetType];
        
        if (allowedBetType === 'win') {
            votingOddsDisplay.innerHTML = oddsData.map(o => {
                const displayOdds = (o.odds === 0.0 || o.odds < 1.0) ? '---' : o.odds.toFixed(1);
                const colorStyle = (o.odds === 0.0 || o.odds < 1.0) ? 'color: var(--text-muted); text-shadow: none;' : '';
                const boatNum = o.boat_pattern[0];
                return `
                <div class="odds-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.25rem; border-radius: 16px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); text-align: center;">
                    <div class="pattern-names" style="font-size:1.3rem; font-weight:bold; color: var(--primary); margin-bottom: 0.1rem;">${boatNum}号艇</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${o.name}</div>
                    <div class="odds-value" style="font-size: 1.8rem; font-weight: 900; color: var(--warning); text-shadow: 0 0 10px rgba(255,170,0,0.3); ${colorStyle}">${displayOdds}</div>
                </div>
                `;
            }).join('');
        } else if (allowedBetType === 'two_teams') {
            const rNum = voterRaceNumberSelect.value;
            const raceData = activeRaces[rNum];
            
            votingOddsDisplay.innerHTML = oddsData.map(o => {
                const displayOdds = (o.odds === 0.0 || o.odds < 1.0) ? '---' : o.odds.toFixed(1);
                const colorStyle = (o.odds === 0.0 || o.odds < 1.0) ? 'color: var(--text-muted); text-shadow: none;' : '';
                const teamName = o.team_name;
                const teamGradient = o.pattern[0] === 1 
                    ? 'background: linear-gradient(135deg, rgba(255,77,77,0.15), rgba(179,0,0,0.25)); border: 1px solid rgba(255,77,77,0.4);'
                    : 'background: linear-gradient(135deg, rgba(0,119,255,0.15), rgba(0,0,179,0.25)); border: 1px solid rgba(0,119,255,0.4);';
                const titleColor = o.pattern[0] === 1 ? '#ff4d4d' : '#0077ff';
                
                let membersDisplay = '';
                if (raceData && raceData.active && raceData.teams) {
                    const matchedPlayers = raceData.players.filter(p => raceData.teams[p.id] === o.pattern[0]);
                    membersDisplay = matchedPlayers.map((p) => {
                        const idx = raceData.players.findIndex(x => x.id === p.id);
                        const boatNum = idx !== -1 ? (idx + 1) : '?';
                        return `${boatNum}号艇:${p.name}`;
                    }).join(', ');
                }
                if (!membersDisplay) {
                    membersDisplay = o.pattern[0] === 1 ? '1・3・5号艇' : '2・4・6号艇';
                }
                
                return `
                <div class="odds-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.25rem; border-radius: 16px; ${teamGradient} text-align: center;">
                    <div class="pattern-names" style="font-size:1.3rem; font-weight:bold; color: ${titleColor}; margin-bottom: 0.1rem;">${teamName}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;">${membersDisplay}</div>
                    <div class="odds-value" style="font-size: 1.8rem; font-weight: 900; color: var(--warning); text-shadow: 0 0 10px rgba(255,170,0,0.3); ${colorStyle}">${displayOdds}</div>
                </div>
                `;
            }).join('');
        } else {
            votingOddsDisplay.innerHTML = oddsData.map(o => {
                const displayOdds = (o.odds === 0.0 || o.odds < 1.0) ? '---' : o.odds.toFixed(1);
                const colorStyle = (o.odds === 0.0 || o.odds < 1.0) ? 'color: var(--text-muted); text-shadow: none;' : '';
                const boatNumbers = o.boat_pattern;
                return `
                <div class="odds-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.1rem 0.5rem; border-radius: 16px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); text-align: center;">
                    <div class="pattern-names" style="font-size:1.4rem; font-weight:bold; letter-spacing: 1px; color: var(--primary); margin-bottom: 0.4rem;">${boatNumbers.join('-')}</div>
                    <div class="odds-value" style="font-size: 1.7rem; font-weight: 900; color: var(--warning); text-shadow: 0 0 10px rgba(255,170,0,0.3); ${colorStyle}">${displayOdds}</div>
                </div>
                `;
            }).join('');
        }
    }

    async function pollActiveRace() {
        if (!currentVoter) return;
        if (document.getElementById('view-voting').classList.contains('active')) {
            try {
                const rNum = voterRaceNumberSelect.value || 1;
                const data = await apiCall(`/api/races/active?race_number=${rNum}`);
                currentCarryoverPool = data.carryover_pool || 0.0;
                updateCarryoverUI();
                if (data.active) {
                    const wasInactive = (activeVotingContent.style.display === 'none');
                    if (wasInactive || currentRacePlayers.length !== data.players.length) {
                        fetchActiveRace(rNum);
                    } else {
                        currentOdds = data.odds;
                        currentPools = data.pools || {};
                        currentTotalBets = data.total_bets || 0.0;
                        isOddsHidden = data.hide_odds || false;
                        renderVoterOddsView();
                        updateSelectedOddsDisplay();
                    }
                } else {
                    if (activeVotingContent.style.display === 'block') {
                        fetchActiveRace(rNum);
                    }
                }
            } catch(e) {}
        }
    }
    
    // Poll every 3 seconds for dynamic odds
    setInterval(pollActiveRace, 3000);

    // Quick Amount buttons
    document.querySelectorAll('.quick-amt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.currentTarget.getAttribute('data-value');
            const amtInp = document.getElementById('selected-bet-amount');
            if (!amtInp) return;
            
            if (val === 'clear') {
                amtInp.value = '';
            } else {
                const currentVal = parseInt(amtInp.value) || 0;
                amtInp.value = currentVal + parseInt(val);
            }
            updateSelectedOddsDisplay();
        });
    });

    const amtInputEl = document.getElementById('selected-bet-amount');
    if (amtInputEl) {
        amtInputEl.addEventListener('input', () => {
            updateSelectedOddsDisplay();
        });
    }

    function renderCartTable() {
        const tbody = document.getElementById('cart-items-tbody');
        const cartSection = document.getElementById('cart-list-section');
        if (!tbody || !cartSection) return;
        
        if (votingCart.length === 0) {
            cartSection.style.display = 'none';
            tbody.innerHTML = '';
            return;
        }
        
        const totalCartAmount = votingCart.reduce((sum, x) => sum + x.amount, 0);
        const simulatedTotalPool = currentTotalBets + totalCartAmount;
        
        const addedCarryover = currentCarryoverPool * 0.90;
        cartSection.style.display = 'block';
        tbody.innerHTML = votingCart.map((item, index) => {
            let liveOdds = 0.0;
            if (currentOdds && currentOdds[item.bet_type]) {
                const oddsData = currentOdds[item.bet_type];
                if (item.bet_type === 'win') {
                    const found = oddsData.find(o => o.player_id === item.pattern[0]);
                    if (found) liveOdds = found.odds;
                } else {
                    const patternStr = JSON.stringify(item.pattern);
                    const found = oddsData.find(o => JSON.stringify(o.pattern) === patternStr);
                    if (found) liveOdds = found.odds;
                }
            }
            const displayOddsVal = (liveOdds === 0.0 || liveOdds < 1.0) ? '---' : liveOdds.toFixed(1) + 'x';
            const oddsDisplay = isOddsHidden ? '🔒 非表示' : displayOddsVal;
            
            const calcPayout = liveOdds >= 1.0 ? (item.amount * liveOdds) : 0;
            const payoutDisplay = isOddsHidden ? '🔒 非表示' : calcPayout.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' G';
            return `
                <tr class="cart-item-row">
                    <td style="font-weight: bold; color: var(--primary);">${item.boat_pattern}</td>
                    <td>${betTypeNames[item.bet_type]}</td>
                    <td>${item.player_names}</td>
                    <td style="font-weight: bold; color: #fff;">${item.amount.toLocaleString()} G</td>
                    <td style="font-weight: bold; color: var(--warning);">${oddsDisplay}</td>
                    <td style="font-weight: bold; color: var(--success);">${payoutDisplay}</td>
                    <td>
                        <button type="button" class="glass-btn danger delete-cart-item-btn" data-index="${index}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">🗑️ 削除</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Bind delete button events
        document.querySelectorAll('.delete-cart-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                votingCart.splice(index, 1);
                renderCartTable();
                showToast('買い目リストから削除しました');
            });
        });
    }

    function addCurrentSelectionToCart() {
        const combinations = getSelectedCombinations();
        if (combinations.length === 0) {
            showToast('投票マークシートで買い目を選択してください', true);
            return false;
        }
        
        const rNum = voterRaceNumberSelect.value;
        const raceData = activeRaces[rNum];
        if (!raceData || !raceData.active) return false;
        
        const amtInp = document.getElementById('selected-bet-amount');
        const amount = parseInt(amtInp ? amtInp.value : 0) || 0;
        
        if (amount < 100 || amount % 100 !== 0) {
            showToast('購入金額は100G単位（最低100G以上）で入力してください', true);
            return false;
        }
        
        let addedCount = 0;
        let skipCount = 0;
        
        for (let comb of combinations) {
            const patternStr = JSON.stringify(comb.pattern);
            
            // Check if already in cart
            const exists = votingCart.some(item => 
                item.race_number === parseInt(rNum) && 
                JSON.stringify(item.pattern) === patternStr && 
                item.bet_type === comb.type
            );
            
            if (exists) {
                skipCount++;
                continue;
            }
            
            // Get boat pattern and player names strings
            let boat_pattern = '';
            let player_names = '';
            
            if (comb.type === 'two_teams') {
                boat_pattern = comb.pattern[0] === 1 ? '赤チーム (1・3・5号艇)' : '青チーム (2・4・6号艇)';
                player_names = comb.pattern[0] === 1 ? '赤チーム' : '青チーム';
            } else {
                const boatNumbers = comb.pattern.map(pid => {
                    const idx = raceData.players.findIndex(p => p.id === pid);
                    return idx !== -1 ? (idx + 1) : '?';
                });
                
                const names = comb.pattern.map(pid => {
                    const p = raceData.players.find(x => x.id === pid);
                    return p ? p.name : '?';
                });
                
                boat_pattern = comb.type === 'win' ? `${boatNumbers[0]}号艇` : boatNumbers.join('-');
                player_names = names.join('-');
            }
            
            // Calculate simulated odds after purchasing this selection with this amount
            const simulatedTotalPool = currentTotalBets + (amount * combinations.length);
            
            let simulatedOdds = 0.0;
            if (simulatedTotalPool > 0) {
                simulatedOdds = (simulatedTotalPool * 0.90) / amount;
            } else {
                simulatedOdds = 0.90;
            }
            let odds = simulatedOdds;
            
            votingCart.push({
                race_number: parseInt(rNum),
                voter_id: currentVoter.id,
                bet_type: comb.type,
                pattern: comb.pattern,
                display_pattern: boat_pattern,
                amount: amount,
                odds: odds,
                boat_pattern: boat_pattern,
                player_names: player_names
            });
            addedCount++;
        }
        
        if (addedCount === 0) {
            showToast('選択したすべての買い目がすでに買い目リストにあります', true);
            return false;
        }
        
        // Reset sheet selection
        selectedMarkCombination = [[], [], []];
        refreshCellSelectionUI();
        updateSelectedOddsDisplay();
        if (amtInp) amtInp.value = '';
        
        renderCartTable();
        return true;
    }

    // Bind Add to Cart buttons
    const btnAddToCart = document.getElementById('btn-add-to-cart');
    const btnQuickVote = document.getElementById('btn-quick-vote');
    const btnSubmitCart = document.getElementById('btn-submit-cart');
    const btnClearCart = document.getElementById('btn-clear-cart');
    
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            if (addCurrentSelectionToCart()) {
                showToast('買い目リストに追加しました！下の「買い目リスト」から購入を確定してください。');
            }
        });
    }
    
    if (btnQuickVote) {
        btnQuickVote.addEventListener('click', async () => {
            if (addCurrentSelectionToCart()) {
                await submitCartVotes();
            }
        });
    }
    
    if (btnSubmitCart) {
        btnSubmitCart.addEventListener('click', async () => {
            await submitCartVotes();
        });
    }
    
    if (btnClearCart) {
        btnClearCart.addEventListener('click', () => {
            if (confirm('買い目リストを空にしてもよろしいですか？')) {
                votingCart = [];
                renderCartTable();
                showToast('買い目リストを空にしました');
            }
        });
    }

    async function submitCartVotes() {
        if (!currentVoter || votingCart.length === 0) return;
        
        const rNum = voterRaceNumberSelect.value;
        const raceData = activeRaces[rNum];
        
        if (raceData && raceData.is_locked) {
            showToast('このレースは投票が締め切られています', true);
            return;
        }
        
        try {
            const votesToSubmit = votingCart.filter(item => item.race_number === parseInt(rNum));
            if (votesToSubmit.length === 0) {
                showToast('現在の選択レースに対するベットがありません', true);
                return;
            }
            
            for (const b of votesToSubmit) {
                await apiCall('/api/votes', 'POST', {
                    race_number: b.race_number,
                    voter_id: b.voter_id,
                    bet_type: b.bet_type,
                    pattern: b.pattern,
                    display_pattern: b.display_pattern,
                    amount: b.amount
                });
            }
            showToast(`${votesToSubmit.length}件の投票を確定しました！`);
            
            // Remove submitted items from cart
            votingCart = votingCart.filter(item => item.race_number !== parseInt(rNum));
            
            renderCartTable();
            fetchMyVotes();
            fetchActiveRace();
        } catch(e) {
            console.error("Cart submission failed:", e);
        }
    }

    // === Voter: My Votes ===
    async function fetchMyVotes() {
        if (!currentVoter) return;
        try {
            // Fetch current hide_odds setting dynamically
            const settings = await apiCall('/api/settings/hide_odds');
            const hideOdds = settings.hide;

            const data = await apiCall(`/api/voter/votes?voter_id=${currentVoter.id}`);
            myVotesTableBody.innerHTML = data.votes.map(v => {
                let status = v.is_resolved ? (v.is_hit ? `<span class="neon-text">的中!</span>` : `<span style="color:var(--text-muted);">ハズレ</span>`) : 'レース中...';
                let payout = v.is_resolved ? (v.is_hit ? v.payout : 0) : '-';
                
                let oddsStr = (v.odds && v.odds > 0) ? v.odds.toFixed(1) + '倍' : '---';
                let payoutStr = payout;
                if (hideOdds) {
                    oddsStr = '🔒 非表示';
                    payoutStr = '🔒 非表示';
                    if (v.is_resolved) {
                        status = '🔒 非表示';
                    }
                }

                let actionBtn = `<span style="color:var(--success); font-weight:bold;">確定</span>`;
                const raceNumStr = v.race_number ? `${v.race_number}R` : '1R';
                
                return `
                    <tr>
                        <td style="font-weight:bold; color:var(--primary);">${raceNumStr}</td>
                        <td>${v.race_date}</td>
                        <td>${betTypeNames[v.bet_type]}</td>
                        <td style="font-weight:bold;">${v.display_pattern || v.pattern.join('-')}</td>
                        <td>${v.amount}</td>
                        <td style="font-weight:bold; color:var(--warning);">${oddsStr}</td>
                        <td>${status}</td>
                        <td style="font-weight:bold; color:var(--success);">${payoutStr}</td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            }).join('');
            
            document.querySelectorAll('.delete-vote-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const raceNum = parseInt(e.target.getAttribute('data-race-number')) || 1;
                    try {
                        await apiCall(`/api/votes/${id}?voter_id=${currentVoter.id}&race_number=${raceNum}`, 'DELETE');
                        showToast('投票を取り消しました');
                        fetchMyVotes();
                    } catch(err) {}
                });
            });
        } catch(e) {}
    }

    // === Live Race Recording (Admin) ===
    function renderRecordView() {
        btnLockRace.style.display = isRaceLocked ? 'none' : 'inline-block';
        
        const container = document.getElementById('record-players-selects-container');
        if (!container) return;

        if (!isRaceLocked) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1rem;">
                🔒 着順を記録するには、まず「投票を締め切る」ボタンをクリックして投票を締め切ってください。
            </div>`;
            btnSubmitRecord.disabled = true;
            return;
        }

        const raceNum = parseInt(adminRaceNumberSelect.value);
        const raceData = activeRaces[raceNum];
        const allowedBetType = (raceData && raceData.active) ? raceData.allowed_bet_type : '';

        if (allowedBetType === 'two_teams') {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; width: 100%;">
                    <label style="font-weight: bold; color: var(--primary); font-size: 1.1rem;">勝利チームを選択してください</label>
                    <div style="display: flex; gap: 1.5rem; justify-content: center; width: 100%; max-width: 400px; margin-top: 0.5rem;">
                        <label style="flex: 1; text-align: center; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.1rem; font-weight: bold; padding: 1rem; border-radius: 12px; background: rgba(255, 77, 77, 0.15); border: 2px solid rgba(255, 77, 77, 0.4); box-shadow: 0 0 10px rgba(255,77,77,0.1);" id="lbl-winner-team-1">
                            <input type="radio" name="admin-winner-team" value="1" class="admin-winner-team-radio" style="transform: scale(1.3);">
                            🔴 赤チーム 勝利
                        </label>
                        <label style="flex: 1; text-align: center; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.1rem; font-weight: bold; padding: 1rem; border-radius: 12px; background: rgba(0, 119, 255, 0.15); border: 2px solid rgba(0, 119, 255, 0.4); box-shadow: 0 0 10px rgba(0,119,255,0.1);" id="lbl-winner-team-2">
                            <input type="radio" name="admin-winner-team" value="2" class="admin-winner-team-radio" style="transform: scale(1.3);">
                            🔵 青チーム 勝利
                        </label>
                    </div>
                </div>
            `;
            btnSubmitRecord.disabled = true;

            const radios = container.querySelectorAll('.admin-winner-team-radio');
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const lbl1 = document.getElementById('lbl-winner-team-1');
                    const lbl2 = document.getElementById('lbl-winner-team-2');
                    if (document.querySelector('input[name="admin-winner-team"]:checked').value === '1') {
                        lbl1.style.background = 'rgba(255, 77, 77, 0.35)';
                        lbl1.style.borderColor = 'rgba(255, 77, 77, 1)';
                        lbl2.style.background = 'rgba(0, 119, 255, 0.15)';
                        lbl2.style.borderColor = 'rgba(0, 119, 255, 0.4)';
                    } else {
                        lbl1.style.background = 'rgba(255, 77, 77, 0.15)';
                        lbl1.style.borderColor = 'rgba(255, 77, 77, 0.4)';
                        lbl2.style.background = 'rgba(0, 119, 255, 0.35)';
                        lbl2.style.borderColor = 'rgba(0, 119, 255, 1)';
                    }
                    
                    const winningTeam = parseInt(document.querySelector('input[name="admin-winner-team"]:checked').value);
                    currentRaceResults = [winningTeam];
                    btnSubmitRecord.disabled = false;
                });
            });
            return;
        }

        // Generate dropdowns for each position (1st to Nth)
        let html = '';
        for (let idx = 0; idx < currentRacePlayers.length; idx++) {
            const rank = idx + 1;
            html += `
                <div class="rank-select-card" style="display: flex; flex-direction: column; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                    <label style="font-weight: bold; color: var(--primary); font-size: 1rem;">${rank}着</label>
                    <select class="admin-rank-select" data-rank="${rank}" style="background: rgba(0,0,0,0.6); border: 1px solid var(--glass-border); border-radius: 8px; padding: 0.6rem; color: #fff; font-size: 1rem; outline: none; cursor: pointer; width: 100%;">
                        <option value="">-- 選手を選択 --</option>
                        ${currentRacePlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        container.innerHTML = html;
        btnSubmitRecord.disabled = true;

        // Add event listeners to all select elements to handle duplicate selection prevention and enable submit button
        const selects = container.querySelectorAll('.admin-rank-select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                const selectedIds = [];
                let hasDuplicates = false;
                let allSelected = true;

                selects.forEach(s => {
                    const val = s.value;
                    if (!val) {
                        allSelected = false;
                    } else {
                        const id = parseInt(val);
                        if (selectedIds.includes(id)) {
                            hasDuplicates = true;
                        }
                        selectedIds.push(id);
                    }
                });

                selects.forEach(s => {
                    const val = s.value;
                    if (val) {
                        const id = parseInt(val);
                        const count = selectedIds.filter(x => x === id).length;
                        if (count > 1) {
                            s.style.borderColor = '#ff0055';
                            s.style.boxShadow = '0 0 8px rgba(255, 0, 85, 0.4)';
                        } else {
                            s.style.borderColor = 'var(--glass-border)';
                            s.style.boxShadow = 'none';
                        }
                    } else {
                        s.style.borderColor = 'var(--glass-border)';
                        s.style.boxShadow = 'none';
                    }
                });

                if (allSelected && !hasDuplicates) {
                    currentRaceResults = selectedIds;
                    btnSubmitRecord.disabled = false;
                } else {
                    btnSubmitRecord.disabled = true;
                }
            });
        });
    }

    const handleRaceLock = async () => {
        const raceNum = parseInt(adminRaceNumberSelect.value);
        if (confirm(`${raceNum}Rの投票を締め切りますか？\n（一度締め切ると解除できません）`)) {
            try {
                await apiCall('/api/races/lock', 'POST', { race_number: raceNum });
                showToast(`${raceNum}Rの投票を締め切りました！着順の入力が可能です。`);
                isRaceLocked = true;
                fetchActiveRace(raceNum);
            } catch(e) {}
        }
    };

    if (btnLockRace) btnLockRace.addEventListener('click', handleRaceLock);
    if (adminQuickLockBtn) adminQuickLockBtn.addEventListener('click', handleRaceLock);

    function updateLiveRanking() {
        // No-op or kept for compatibility
    }

    if (btnResetRecord) btnResetRecord.addEventListener('click', () => {
        currentRaceResults = [];
        renderRecordView();
    });

    if (btnSubmitRecord) btnSubmitRecord.addEventListener('click', async () => {
        const raceNum = parseInt(adminRaceNumberSelect.value);
        const raceData = activeRaces[raceNum];
        const allowedBetType = (raceData && raceData.active) ? raceData.allowed_bet_type : '';
        
        if (allowedBetType === 'two_teams') {
            if (currentRaceResults.length !== 1) return;
        } else {
            if (currentRaceResults.length !== currentRacePlayers.length) return;
        }
        try {
            const raceNum = parseInt(adminRaceNumberSelect.value);
            await apiCall('/api/races', 'POST', { 
                race_number: raceNum,
                results: currentRaceResults 
            });
            showToast('着順を確定し、配当を計算しました！');
            await fetchActiveRace();
            if (currentVoter) fetchMyVotes();

            const selectEl = document.getElementById('admin-results-race-select');
            if (selectEl) {
                selectEl.value = raceNum;
                if (typeof loadAdminRaceResults === 'function') loadAdminRaceResults();
            }
            loadCompletedRacesHistory();

            navBtns.forEach(b => {
                if(b.getAttribute('data-target') === 'view-stats') b.classList.add('active');
                else b.classList.remove('active');
            });
            views.forEach(v => {
                if(v.id === 'view-stats') v.classList.add('active');
                else v.classList.remove('active');
            });
            loadStats();
        } catch(e) {}
    });

    // === Stats Logic ===
    async function loadStats() {
        try {
            const data = await apiCall('/api/stats');
            const stats = data.stats.sort((a, b) => b.point_rate - a.point_rate);
            
            statsTableBody.innerHTML = stats.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.races_played}</td>
                    <td>${s.total_points}</td>
                    <td>${s.point_rate.toFixed(2)}</td>
                    <td>${(s.win_rate * 100).toFixed(1)}%</td>
                    <td>${(s.quinella_rate * 100).toFixed(1)}%</td>
                    <td>${(s.exacta_rate * 100).toFixed(1)}%</td>
                </tr>
            `).join('');
        } catch(e) {}
    }

    // === Commission Log Logic ===
    async function loadCommissionLog() {
        if (!isAdminAuthenticated) return;
        try {
            const data = await apiCall('/api/admin/commission_log');
            const log = data.log;
            
            let totalBetsAll = 0;
            let totalCommissionAll = 0;
            let totalCarryoverCommissionAll = 0;
            let totalPayoutAll = 0;
            let totalSurplusAll = 0;
            
            commissionLogTableBody.innerHTML = log.map(item => {
                totalBetsAll += item.total_bets;
                totalCommissionAll += item.bets_commission;
                totalCarryoverCommissionAll += item.carryover_commission;
                totalPayoutAll += item.total_payout;
                totalSurplusAll += item.surplus;
                
                const statusBadge = item.is_resolved 
                    ? `<span class="badge success" style="background: rgba(0,255,136,0.15); color: var(--success); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">確定済</span>`
                    : `<span class="badge warning" style="background: rgba(255,170,0,0.15); color: var(--warning); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">投票受付中/未確定</span>`;
                    
                return `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 1rem; font-weight: bold;">${item.race_number}R</td>
                        <td style="padding: 1rem;">${item.total_bets.toLocaleString()} G</td>
                        <td style="padding: 1rem; color: var(--primary); font-weight: bold;">${item.bets_commission.toLocaleString()} G</td>
                        <td style="padding: 1rem; color: var(--warning); font-weight: bold;">${item.carryover_commission.toLocaleString()} G</td>
                        <td style="padding: 1rem;">${item.total_payout.toLocaleString()} G</td>
                        <td style="padding: 1rem; color: var(--success); font-weight: bold;">${item.surplus.toLocaleString()} G</td>
                        <td style="padding: 1rem;">${statusBadge}</td>
                    </tr>
                `;
            }).join('');
            
            commissionLogTableFoot.innerHTML = `
                <tr>
                    <td style="padding: 1.25rem 1rem;">総合計</td>
                    <td style="padding: 1.25rem 1rem;">${totalBetsAll.toLocaleString()} G</td>
                    <td style="padding: 1.25rem 1rem; color: var(--primary); font-size: 1.1rem; text-shadow: 0 0 10px rgba(0,240,255,0.3);">${totalCommissionAll.toLocaleString()} G</td>
                    <td style="padding: 1.25rem 1rem; color: var(--warning); font-size: 1.1rem; text-shadow: 0 0 10px rgba(255,170,0,0.3);">${totalCarryoverCommissionAll.toLocaleString()} G</td>
                    <td style="padding: 1.25rem 1rem;">${totalPayoutAll.toLocaleString()} G</td>
                    <td style="padding: 1.25rem 1rem; color: var(--success); font-size: 1.1rem; text-shadow: 0 0 10px rgba(0,255,136,0.3);">${totalSurplusAll.toLocaleString()} G</td>
                    <td style="padding: 1.25rem 1rem;">-</td>
                </tr>
            `;
        } catch (e) {
            console.error("Error in loadCommissionLog:", e);
        }
    }

    if (btnRefreshCommissionLog) {
        btnRefreshCommissionLog.addEventListener('click', () => {
            loadCommissionLog();
            showToast('集計ログを最新に更新しました！');
        });
    }

    // === Voters Bets Logic ===
    async function loadVotersBets() {
        if (!isAdminAuthenticated) return;
        try {
            const data = await apiCall('/api/admin/voters_bets');
            const votersBets = data.voters_bets;
            
            const betTypeNames = {
                'win': '単勝',
                'two_teams': '2チーム',
                'exacta': '2連単',
                'trifecta': '3連単'
            };
            
            votersBetsContainer.innerHTML = votersBets.map(vb => {
                let votesTableHtml = '';
                if (vb.votes && vb.votes.length > 0) {
                    const rowsHtml = vb.votes.map(vote => {
                        const betTypeName = betTypeNames[vote.bet_type] || '未指定';
                        
                        let resultText = '';
                        if (vote.is_resolved) {
                           resultText = vote.is_hit 
                               ? `<span style="color: var(--success); font-weight: bold;">的中! (+${vote.payout.toLocaleString()} G)</span>`
                               : `<span style="color: #ff4d4d;">不的中</span>`;
                        } else {
                            resultText = `<span style="color: var(--warning);">未確定</span>`;
                        }
                        
                        return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 0.75rem; font-weight: bold;">${vote.race_number}R</td>
                                <td style="padding: 0.75rem;">${betTypeName}</td>
                                <td style="padding: 0.75rem; font-family: monospace; font-size: 0.95rem; color: var(--primary); font-weight: bold;">${vote.display_pattern}</td>
                                <td style="padding: 0.75rem;">${vote.amount.toLocaleString()} G</td>
                                <td style="padding: 0.75rem; font-weight: bold; color: var(--warning);">${vote.odds.toFixed(1)}x</td>
                                <td style="padding: 0.75rem;">${resultText}</td>
                            </tr>
                        `;
                    }).join('');
                    
                    votesTableHtml = `
                        <div class="table-container" style="overflow-x: auto; background: rgba(0,0,0,0.15); border-radius: 8px; border: 1px solid var(--glass-border); margin-top: 0.5rem;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--glass-border); background: rgba(255,255,255,0.02);">
                                        <th style="padding: 0.75rem;">レース</th>
                                        <th style="padding: 0.75rem;">賭け式</th>
                                        <th style="padding: 0.75rem; color: var(--primary);">買い目</th>
                                        <th style="padding: 0.75rem;">金額 (G)</th>
                                        <th style="padding: 0.75rem; color: var(--warning);">オッズ</th>
                                        <th style="padding: 0.75rem;">状態/結果</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                } else {
                    votesTableHtml = `
                        <div class="text-muted" style="font-size: 0.9rem; padding: 1rem; background: rgba(0,0,0,0.15); border-radius: 8px; border: 1px dashed var(--glass-border); text-align: center;">
                            まだ投票履歴はありません
                        </div>
                    `;
                }
                
                return `
                    <div class="voter-bets-group-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem 1.25rem;">
                        <div class="flex-between" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                           <h4 style="margin: 0; font-size: 1.1rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                               👤 <span style="font-weight: bold; color: var(--primary);">${vb.voter_name}</span> の投票状況
                           </h4>
                           <div style="font-size: 0.95rem; font-weight: bold;">
                               合計投票額: <span style="color: var(--warning); font-size: 1.15rem; text-shadow: 0 0 10px rgba(255,170,0,0.2);">${vb.total_amount.toLocaleString()} G</span>
                           </div>
                        </div>
                        ${votesTableHtml}
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error("Error in loadVotersBets:", e);
        }
    }

    if (btnRefreshVotersBets) {
        btnRefreshVotersBets.addEventListener('click', () => {
            loadVotersBets();
            showToast('各投票者の投票状況を最新に更新しました！');
        });
    }

    // === Completed Races Results & Payout History ===
    async function loadCompletedRacesHistory() {
        const container = document.getElementById('completed-races-history-container');
        if (!container) return;
        
        try {
            const data = await apiCall('/api/admin/races/completed');
            if (!data.races || data.races.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted" style="padding: 2.5rem; background: rgba(0,0,0,0.15); border-radius: 12px; border: 1px dashed var(--glass-border);">
                        確定済みのレース結果はありません
                    </div>
                `;
                return;
            }
            
            const betTypesMap = { 'win': '単勝', 'two_teams': '2チーム', 'exacta': '2連単', 'trifecta': '3連単' };
            
            container.innerHTML = data.races.map(r => {
                const resultsHtml = r.results.map(p => `
                    <div style="padding: 0.4rem 0.8rem; background: rgba(255,255,255,0.04); border-radius: 6px; font-size: 0.9rem;">
                        <span style="font-weight: bold; color: var(--primary);">${p.position}着:</span> ${p.player_name}
                    </div>
                `).join('');
                
                let winnersHtml = '';
                if (r.winning_voters.length > 0) {
                    winnersHtml = `
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: var(--text-muted);">
                                    <th style="padding: 0.4rem;">的中者</th>
                                    <th style="padding: 0.4rem;">買い目</th>
                                    <th style="padding: 0.4rem;">投票金</th>
                                    <th style="padding: 0.4rem;">オッズ</th>
                                    <th style="padding: 0.4rem; color: var(--success);">払い戻し額</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${r.winning_voters.map(w => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                                        <td style="padding: 0.4rem; font-weight: bold;">${w.voter_name}</td>
                                        <td style="padding: 0.4rem; color: var(--primary); font-family: monospace;">${w.display_pattern}</td>
                                        <td style="padding: 0.4rem;">${w.amount} G</td>
                                        <td style="padding: 0.4rem; color: var(--warning); font-weight: bold;">${w.odds.toFixed(1)}倍</td>
                                        <td style="padding: 0.4rem; color: var(--success); font-weight: bold;">${w.payout.toLocaleString()} G</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                } else {
                    winnersHtml = `
                        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">
                            的中した投票者はいませんでした
                        </div>
                    `;
                }
                
                return `
                    <div class="glass-card" style="background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); padding: 1.25rem; border-radius: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; animation: fadeIn 0.3s ease; margin-bottom: 1rem;">
                        <!-- Left Panel: Race ID, Bet Type and Confirmed Ranks -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <h4 style="margin: 0; font-size: 1.2rem; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-weight: 900; color: var(--primary);">${r.race_number}R <span style="font-size:0.9rem; font-weight:normal; color:#fff;">確定結果</span></span>
                                <span style="display: inline-flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 0.2rem 0.6rem; border-radius: 999px;">式別: ${betTypesMap[r.bet_type] || r.bet_type}</span>
                                    <button type="button" class="glass-btn danger delete-completed-race-btn" data-race-number="${r.race_number}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; cursor: pointer;">🗑️ 削除</button>
                                </span>
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                                ${resultsHtml}
                            </div>
                        </div>
                        
                        <!-- Right Panel: Winners nested details table -->
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; border-left: 1px dashed rgba(255,255,255,0.1); padding-left: 1.5rem;">
                            <h4 style="margin: 0; color: var(--success); font-size: 1.05rem; display: flex; align-items: center; gap: 0.4rem;">
                                💰 的中者・配当一覧
                            </h4>
                            <div class="overflow-auto" style="margin-top: 0.5rem;">
                                ${winnersHtml}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Bind delete history events
            document.querySelectorAll('.delete-completed-race-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const rNum = e.currentTarget.getAttribute('data-race-number');
                    if (confirm(`${rNum}R の確定結果および投票履歴を完全に削除しますか？`)) {
                        try {
                            await apiCall(`/api/races/active?race_number=${rNum}`, 'DELETE');
                            showToast(`${rNum}R の履歴を完全に削除しました！`);
                            loadCompletedRacesHistory();
                            loadCommissionLog();
                            loadStats();
                            loadVotersBets();
                        } catch (err) {
                            showToast('削除に失敗しました', true);
                        }
                    }
                });
            });
        } catch(e) {
            console.error("Failed to load completed races history:", e);
        }
    }

    const btnRefreshCompletedHistory = document.getElementById('btn-refresh-completed-history');
    if (btnRefreshCompletedHistory) {
        btnRefreshCompletedHistory.addEventListener('click', () => {
            loadCompletedRacesHistory();
            showToast('確定レース結果の履歴を最新に更新しました！');
        });
    }

    window._loadCompletedRacesHistory = loadCompletedRacesHistory;
    // Expose helpers globally to allow HTML to invoke actions directly and bypass form submit issues
    window._apiCall = apiCall;
    window._loadVoters = loadVoters;
    window._loadPlayers = loadPlayers;
    window._loadCommissionLog = loadCommissionLog;
    window._loadVotersBets = loadVotersBets;
    window._fetchActiveRace = fetchActiveRace;
    window._fetchMyVotes = fetchMyVotes;
    window._loadStats = loadStats;
    window._showToast = showToast;
    
    window._setAdminAuth = (val) => {
        isAdminAuthenticated = val;
        if (val) {
            loadPlayers();
            loadVoters();
            loadCommissionLog();
            renderActiveRacesList();
            loadVotersBets();
            loadCompletedRacesHistory();
            if (typeof loadAdminRaceResults === 'function') loadAdminRaceResults();
        }
    };

    function updateCarryoverUI() {
        const voterBanner = document.getElementById('voter-carryover-banner');
        const voterAmount = document.getElementById('voter-carryover-amount');
        const adminBanner = document.getElementById('admin-carryover-banner');
        const adminAmount = document.getElementById('admin-carryover-amount');

        if (currentCarryoverPool > 0) {
            const poolBeforeDeduction = currentCarryoverPool;
            const poolAfterDeduction = currentCarryoverPool * 0.90;

            if (voterBanner && voterAmount) {
                voterBanner.style.display = 'block';
                voterAmount.textContent = `${Math.floor(poolAfterDeduction).toLocaleString()} G`;
            }
            if (adminBanner && adminAmount) {
                adminBanner.style.display = 'block';
                adminAmount.textContent = `${Math.floor(poolBeforeDeduction).toLocaleString()} G`;
            }
        } else {
            if (voterBanner) voterBanner.style.display = 'none';
            if (adminBanner) adminBanner.style.display = 'none';
        }
    }

    window.resetCarryoverPool = async () => {
        if (!confirm('キャリーオーバープールを 0 G にリセットしますか？')) return;
        try {
            const res = await fetch('/api/admin/carryover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 0.0 })
            });
            if (res.ok) {
                showToast('キャリーオーバープールをリセットしました！');
                currentCarryoverPool = 0.0;
                updateCarryoverUI();
                // Refresh active race view so odds are recalculated on screen
                const rNum = voterRaceNumberSelect ? voterRaceNumberSelect.value : 1;
                fetchActiveRace(rNum);
            } else {
                showToast('キャリーオーバーのリセットに失敗しました。', true);
            }
        } catch(e) {
            showToast('サーバーに接続できません。', true);
        }
    };

    window._setCurrentVoter = (voter) => {
        currentVoter = voter;
        localStorage.setItem('currentVoter', JSON.stringify(voter));
        displayVoterName.textContent = voter.name;
        voterAuthContainer.style.display = 'none';
        voterDashboard.style.display = 'block';
        
        // Reset cart and mark combinations for the logged in user
        votingCart = [];
        selectedMarkCombination = [[], [], []];
        if (typeof updateVoteMarkSheet === 'function') updateVoteMarkSheet();
        if (typeof renderCartTable === 'function') renderCartTable();
        
        fetchActiveRace();
        fetchMyVotes();
    };

    // Init
    if (isAdminAuthenticated) {
        adminAuthContainer.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadPlayers();
        loadVoters();
        renderActiveRacesList();
        loadVotersBets();
        loadCompletedRacesHistory();
    }
    if (currentVoter) {
        displayVoterName.textContent = currentVoter.name;
        voterAuthContainer.style.display = 'none';
        voterDashboard.style.display = 'block';
    }
    fetchActiveRace();
    loadStats();
} catch(err) {
    console.error('JS CRASH:', err);
    document.body.insertAdjacentHTML('afterbegin', `<div style="position:fixed;top:0;left:0;right:0;background:#ff0055;color:#fff;padding:1rem;z-index:99999;font-size:1rem;word-break:break-all;">❌ JSエラー: ${err.message} (行: ${err.stack})<br>パスワード「admin」でログインしてください</div>`);
}
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
