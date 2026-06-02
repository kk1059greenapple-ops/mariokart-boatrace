// Firebase Realtime Database 連携版 JavaScript アプリケーション
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
        let isAdminAuthenticated = false;
        let currentVoter = null;
        let lastRenderedRaceKey = null;
        
        // データベースが作成されたばかりの空っぽの状態なら、初期データを自動登録します
        db.ref('settings/admin_password').once('value', snapshot => {
            if (!snapshot.exists()) {
                db.ref('settings').set({
                    admin_password: "admin",
                    carryover_pool: 0,
                    reveal: false,
                    odds_hidden: false
                });
            }
        });

        try {
            const storedVoter = localStorage.getItem('currentVoter');
            if (storedVoter) currentVoter = JSON.parse(storedVoter);
        } catch(e) {}

        // Global functions for inline HTML event handlers (SPA Switching)
        window._setAdminAuth = function(val) {
            isAdminAuthenticated = val;
            if (val) {
                loadPlayers();
                loadVoters();
                fetchActiveRace();
                loadCommissionLog();
                renderActiveRacesList();
                loadVotersBets();
                loadCompletedRacesHistory();
            }
        };

        window._setCurrentVoter = function(voterObj) {
            currentVoter = voterObj;
            if (voterObj) {
                localStorage.setItem('currentVoter', JSON.stringify(voterObj));
                document.getElementById('display-voter-name').textContent = voterObj.name;
                document.getElementById('voter-auth-container').style.display = 'none';
                document.getElementById('voter-dashboard').style.display = 'block';
                fetchActiveRace();
                fetchMyVotes();
            } else {
                localStorage.removeItem('currentVoter');
                document.getElementById('voter-auth-container').style.display = 'block';
                document.getElementById('voter-dashboard').style.display = 'none';
                votingCart = [];
                renderCartItems();
            }
        };

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

        const betTypeNames = {
            'win': '単勝',
            'two_teams': '2チーム',
            'exacta': '2連単',
            'trifecta': '3連単'
        };

        // Permutations helper for JavaScript (equivalent to itertools.permutations)
        function permutations(list, k) {
            if (k === 1) return list.map(el => [el]);
            const result = [];
            list.forEach((el, i) => {
                const rest = [...list.slice(0, i), ...list.slice(i + 1)];
                const subPerms = permutations(rest, k - 1);
                subPerms.forEach(sub => result.push([el, ...sub]));
            });
            return result;
        }

        // === Admin Auth (Firebase) ===
        if (adminAuthForm) {
            adminAuthForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const entered = adminPasswordInput.value;
                db.ref('settings/admin_password').once('value', snapshot => {
                    const savedPassword = snapshot.val() || "admin";
                    // 入力されたパスワードがデータベースの値、または "admin" であれば強制ログイン許可
                    if (entered === savedPassword || entered === "admin") {
                        // データベースが空だった場合のために設定も強制保存
                        if (!snapshot.exists()) {
                            db.ref('settings').set({
                                admin_password: "admin",
                                carryover_pool: 0,
                                reveal: false,
                                odds_hidden: false
                            });
                        }
                        isAdminAuthenticated = true;
                        adminAuthContainer.style.display = 'none';
                        adminDashboard.style.display = 'block';
                        showToast('ログインしました！');
                        loadPlayers();
                        loadVoters();
                        loadCommissionLog();
                        renderActiveRacesList();
                        loadVotersBets();
                        loadCompletedRacesHistory();
                    } else {
                        showToast('パスワードが正しくありません', true);
                    }
                });
            });
        }

        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPass = newAdminPasswordInput.value;
                if (!newPass) return;
                db.ref('settings/admin_password').set(newPass, err => {
                    if (err) {
                        showToast('エラーが発生しました', true);
                    } else {
                        newAdminPasswordInput.value = '';
                        showToast('パスワードを変更しました！');
                    }
                });
            });
        }

        // === Admin: Voters Logic (Firebase) ===
        function loadVoters() {
            db.ref('voters').on('value', snapshot => {
                const data = snapshot.val() || {};
                voters = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                renderVotersList();
            });
        }

        function renderVotersList() {
            if (!votersList) return;
            votersList.innerHTML = voters.map(v => 
                `<div class="player-tag" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <span style="font-size: 1.1rem;">${v.name}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Pass: <span style="color: var(--primary);">${v.password}</span></span>
                    <button class="delete-voter-btn" data-id="${v.id}">&times;</button>
                </div>`
            ).join('');

            document.querySelectorAll('.delete-voter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('このアカウントを削除してもよろしいですか？（関連する投票履歴も消えます）')) {
                        db.ref(`voters/${id}`).remove(() => {
                            showToast('アカウントを削除しました！');
                        });
                    }
                });
            });
        }

        if (addVoterForm) {
            addVoterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = addVoterNameInput.value.trim();
                const password = addVoterPassInput.value;
                if (!name || !password) return;
                
                // 重複確認
                const exist = voters.some(v => v.name.toLowerCase() === name.toLowerCase());
                if (exist) {
                    showToast('すでに同じ名前のアカウントが存在します', true);
                    return;
                }

                const newVoterRef = db.ref('voters').push();
                newVoterRef.set({
                    name,
                    password,
                    balance: 10000 // 初期資金
                }, err => {
                    if (err) {
                        showToast('エラーが発生しました', true);
                    } else {
                        addVoterNameInput.value = '';
                        addVoterPassInput.value = '';
                        showToast('投票者アカウントを作成しました！');
                    }
                });
            });
        }

        // === Admin: Players Logic (Firebase) ===
        function loadPlayers() {
            db.ref('players').on('value', snapshot => {
                const data = snapshot.val() || {};
                players = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                renderPlayersList();
                renderSetupPlayersList();
                renderStatsPlayerSelect();
            });
        }

        function renderPlayersList() {
            if (!playersList) return;
            playersList.innerHTML = players.map(p => 
                `<div class="player-tag">
                    ${p.name}
                    <button class="delete-player-btn" data-id="${p.id}">&times;</button>
                </div>`
            ).join('');

            document.querySelectorAll('.delete-player-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    db.ref(`players/${id}`).remove(() => {
                        showToast('選手を削除しました！');
                    });
                });
            });
        }

        if (addPlayerForm) {
            addPlayerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = addPlayerNameInput.value.trim();
                if (!name) return;
                const newPlayerRef = db.ref('players').push();
                newPlayerRef.set({ name }, err => {
                    if (err) {
                        showToast('エラーが発生しました', true);
                    } else {
                        addPlayerNameInput.value = '';
                        showToast('選手を登録しました！');
                    }
                });
            });
        }

        // === Admin: Setup View (Firebase) ===
        function renderSetupPlayersList() {
            if (!setupPlayersList) return;
            setupPlayersList.innerHTML = players.map(p => 
                `<label class="setup-checkbox-label" id="setup-label-${p.id}">
                    <input type="checkbox" name="setup-players" value="${p.id}">
                    ${p.name}
                </label>`
            ).join('');

            // チェックボックス選択時のクラス切り替え
            document.querySelectorAll('input[name="setup-players"]').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const label = document.getElementById(`setup-label-${e.target.value}`);
                    if (e.target.checked) {
                        label.classList.add('selected');
                    } else {
                        label.classList.remove('selected');
                    }
                    rebuildTeamAllocationUI();
                });
            });
        }

        function rebuildTeamAllocationUI() {
            const selectedCbs = Array.from(document.querySelectorAll('input[name="setup-players"]:checked'));
            const selectedIds = selectedCbs.map(cb => cb.value);
            
            if (adminBetTypeSelect.value === 'two_teams' && selectedIds.length > 0) {
                adminTeamAllocSection.style.display = 'block';
                adminTeamAllocList.innerHTML = selectedIds.map((pid, idx) => {
                    const p = players.find(x => x.id === pid);
                    const boatNum = idx + 1;
                    const isRed = boatNum % 2 !== 0;
                    const teamName = isRed ? '赤チーム (1)' : '青チーム (2)';
                    const badgeClass = `boat-badge-${boatNum}`;
                    return `<div class="bet-row" style="padding: 0.5rem 1rem;">
                        <span class="runner-boat-badge ${badgeClass}">${boatNum}</span>
                        <span style="font-weight: bold; width: 120px;">${p ? p.name : ''}</span>
                        <span style="margin-left: auto; font-weight: bold; color: ${isRed ? '#ff4d4d' : '#3b82f6'}">${teamName}</span>
                    </div>`;
                }).join('');
            } else {
                adminTeamAllocSection.style.display = 'none';
            }
        }

        // === Admin: Setup View Operations ===
        if (btnStartRace) {
            btnStartRace.addEventListener('click', () => {
                const selectedCbs = Array.from(document.querySelectorAll('input[name="setup-players"]:checked'));
                const selectedIds = selectedCbs.map(cb => cb.value);
                const raceNum = parseInt(adminRaceNumberSelect.value);
                const betType = adminBetTypeSelect.value;
                
                if (selectedIds.length < 3) {
                    showToast('選手を3人以上選択してください', true);
                    return;
                }

                // チーム自動割り当ての構築
                const teams = {};
                if (betType === 'two_teams') {
                    selectedIds.forEach((pid, idx) => {
                        const boatNum = idx + 1;
                        teams[pid] = (boatNum % 2 !== 0) ? 1 : 2; // 奇数が赤(1)、偶数が青(2)
                    });
                }

                db.ref(`races/${raceNum}`).set({
                    active: true,
                    resolved: false,
                    allowed_bet_type: betType,
                    player_ids: selectedIds,
                    teams: teams,
                    race_number: raceNum
                }, err => {
                    if (err) {
                        showToast('エラーが発生しました', true);
                    } else {
                        showToast(`${raceNum}Rを開始しました！`);
                        fetchActiveRace();
                    }
                });
            });
        }

        function renderActiveRacesList() {
            db.ref('races').on('value', snapshot => {
                const data = snapshot.val() || {};
                const activeNums = [];
                Object.keys(data).forEach(num => {
                    if (data[num] !== null && data[num] !== undefined) {
                        activeNums.push(parseInt(num));
                    }
                });
                
                if (adminActiveRacesList) {
                    if (activeNums.length === 0) {
                        adminActiveRacesList.innerHTML = `<span style="color: var(--text-muted);">作成済みのレースはありません</span>`;
                    } else {
                        adminActiveRacesList.innerHTML = activeNums.sort((a,b)=>a-b).map(num => {
                            const race = data[num];
                            return `<div class="bet-row flex-between" style="padding: 0.75rem 1rem;">
                                <div>
                                    <strong style="color: var(--primary); font-size: 1.1rem;">${num}R</strong> 
                                    <span style="margin-left: 10px; color: var(--text-muted); font-size: 0.9rem;">(${betTypeNames[race.allowed_bet_type]})</span>
                                </div>
                                <button class="glass-btn danger btn-delete-race" data-num="${num}" style="padding: 0.4rem 1rem; font-size: 0.85rem;">削除</button>
                            </div>`;
                        }).join('');

                        document.querySelectorAll('.btn-delete-race').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const num = e.currentTarget.getAttribute('data-num');
                                if (confirm(`${num}Rを削除してもよろしいですか？（このレースの投票も消去されます）`)) {
                                    db.ref(`races/${num}`).remove(() => {
                                        // 投票も削除
                                        db.ref('votes').once('value', vSnap => {
                                            const vData = vSnap.val() || {};
                                            Object.keys(vData).forEach(vid => {
                                                if (vData[vid].race_number === parseInt(num)) {
                                                    db.ref(`votes/${vid}`).remove();
                                                }
                                            });
                                            showToast(`${num}Rを削除しました`);
                                            fetchActiveRace();
                                        });
                                    });
                                }
                            });
                        });
                    }
                }
            });
        }

        // === Admin: Setup controls for active race ===
        if (btnRevealBets) {
            btnRevealBets.addEventListener('click', () => {
                db.ref('settings/reveal').set(true, () => showToast('投票内容を公開しました'));
            });
        }
        if (btnHideBets) {
            btnHideBets.addEventListener('click', () => {
                db.ref('settings/reveal').set(false, () => showToast('投票内容を非公開にしました'));
            });
        }
        if (btnShowOdds) {
            btnShowOdds.addEventListener('click', () => {
                db.ref('settings/odds_hidden').set(false, () => showToast('投票所のオッズを表示しました'));
            });
        }
        if (btnHideOdds) {
            btnHideOdds.addEventListener('click', () => {
                db.ref('settings/odds_hidden').set(true, () => showToast('投票所のオッズを非表示にしました'));
            });
        }

        // === Global state sync ===
        db.ref('settings').on('value', snapshot => {
            const settings = snapshot.val() || {};
            isOddsHidden = !!settings.odds_hidden;
            currentCarryoverPool = parseFloat(settings.carryover_pool) || 0.0;
            
            const reveal = !!settings.reveal;
            if (btnRevealBets && btnHideBets) {
                if (reveal) {
                    btnRevealBets.classList.add('active');
                    btnHideBets.classList.remove('active');
                } else {
                    btnRevealBets.classList.remove('active');
                    btnHideBets.classList.add('active');
                }
            }
            if (btnShowOdds && btnHideOdds) {
                if (isOddsHidden) {
                    btnShowOdds.classList.remove('active');
                    btnHideOdds.classList.add('active');
                } else {
                    btnShowOdds.classList.add('active');
                    btnHideOdds.classList.remove('active');
                }
            }
        });

        // === Active Race Operations & Rendering ===
        function fetchActiveRace() {
            const isAdminView = document.getElementById('view-admin').classList.contains('active');
            let raceNum = 1;
            
            if (isAdminView) {
                raceNum = parseInt(adminRaceNumberSelect.value);
            } else {
                raceNum = parseInt(voterRaceNumberSelect.value);
            }

            db.ref('/').on('value', snapshot => {
                try {
                    const data = snapshot.val() || {};
                    const races = data.races || {};
                    const race = races[raceNum] || null;
                    const dbVoters = data.voters || {};
                    const dbVotes = data.votes || {};

                    // 投票者リストのローカルキャッシュ更新
                    voters = Object.keys(dbVoters).map(k => ({ id: k, ...dbVoters[k] }));

                // ログイン中の投票者残高をリアルタイム同期
                if (currentVoter) {
                    const matched = voters.find(v => v.name === currentVoter.name);
                    if (matched) {
                        currentVoter = matched;
                        const headerBalance = document.getElementById('display-voter-balance');
                        if (headerBalance) headerBalance.textContent = matched.balance.toLocaleString() + ' G';
                    }
                }

                if (!race || !race.active) {
                    // 非稼働状態
                    if (isAdminView) {
                        adminActiveRaceSection.style.display = 'none';
                        adminRaceLockStatus.textContent = "未稼働";
                        adminRaceLockStatus.className = "status-badge waiting";
                    } else {
                        noRaceMessagePublic.style.display = 'block';
                        activeVotingContent.style.display = 'none';
                    }
                    return;
                }

                // 稼働中
                currentRacePlayers = race.player_ids.map(id => {
                    const p = players.find(x => x.id === id);
                    return p || { id, name: "不明" };
                });
                allowedBetType = race.allowed_bet_type;
                isRaceLocked = !!race.locked;

                // オッズ計算
                const totalVotes = [];
                Object.keys(dbVotes).forEach(vid => {
                    const v = dbVotes[vid];
                    if (v.race_number === raceNum && v.bet_type === allowedBetType) {
                        totalVotes.push(v);
                    }
                });

                // オッズ計算ロジックの実行
                const calculated = calculateDynamicOddsJS(race.player_ids, totalVotes, allowedBetType, currentCarryoverPool);
                currentOdds = calculated.odds;
                currentPools = calculated.pools;
                currentTotalBets = calculated.total_bets;

                if (isAdminView) {
                    adminActiveRaceSection.style.display = 'block';
                    adminRaceLockStatus.textContent = isRaceLocked ? "締め切り済み" : "受付中";
                    adminRaceLockStatus.className = isRaceLocked ? "status-badge complete" : "status-badge waiting";
                    adminQuickLockBtn.textContent = isRaceLocked ? "受付再開" : "投票締め切り";
                    if (btnLockRace) btnLockRace.innerHTML = isRaceLocked ? "🔓 投票受付を再開する" : "🔒 投票を締め切る";
                    
                    if (isRaceLocked) {
                        if (recordPlayersGrid) recordPlayersGrid.style.display = 'grid';
                        const liveResultsBar = document.querySelector('.live-results-bar');
                        if (liveResultsBar) liveResultsBar.style.display = 'block';
                        if (btnSubmitRecord) btnSubmitRecord.disabled = false;
                    } else {
                        if (recordPlayersGrid) recordPlayersGrid.style.display = 'none';
                        const liveResultsBar = document.querySelector('.live-results-bar');
                        if (liveResultsBar) liveResultsBar.style.display = 'none';
                        if (btnSubmitRecord) btnSubmitRecord.disabled = true;
                    }

                    renderRecordPlayersGrid();
                    renderLiveRankingDisplay();
                    renderCommissionLog(data);
                } else {
                    noRaceMessagePublic.style.display = 'none';
                    activeVotingContent.style.display = 'block';
                    displayAllowedBetType.textContent = betTypeNames[allowedBetType];
                    
                    const raceKey = `${raceNum}_${allowedBetType}_${race.player_ids.join('_')}`;
                    if (lastRenderedRaceKey !== raceKey) {
                        renderGridMarkSheet();
                        lastRenderedRaceKey = raceKey;
                    }
                    renderCartItems();
                    updateOddsValues();
                    renderOddsTable(calculated.odds, allowedBetType);
                }
                } catch (err) {
                    window.onerror(err.message, 'app.js (fetchActiveRace)', err.lineNumber || 0, 0, err);
                    console.error('fetchActiveRace Error:', err);
                }
            });
        }

        // JavaScript側での動的オッズ計算
        function calculateDynamicOddsJS(playerIds, votesList, betType, carryoverPool) {
            const RETURN_RATE = 0.90;
            const addedCarryover = carryoverPool * 0.90;
            
            const pools = {};
            let totalBets = 0.0;

            // プールの初期化
            if (betType === 'win') {
                playerIds.forEach(pid => {
                    pools[JSON.stringify([pid])] = 0.0;
                });
            } else if (betType === 'two_teams') {
                [1, 2].forEach(team => {
                    pools[JSON.stringify([team])] = 0.0;
                });
            } else if (betType === 'exacta') {
                permutations(playerIds, 2).forEach(pair => {
                    pools[JSON.stringify(pair)] = 0.0;
                });
            } else if (betType === 'trifecta') {
                permutations(playerIds, 3).forEach(triple => {
                    pools[JSON.stringify(triple)] = 0.0;
                });
            }

            // リアル投票の加算
            votesList.forEach(v => {
                const patternStr = JSON.stringify(v.pattern);
                if (pools[patternStr] !== undefined) {
                    pools[patternStr] += parseFloat(v.amount);
                    totalBets += parseFloat(v.amount);
                }
            });

            // オッズの算出
            const oddsResult = {};
            oddsResult[betType] = [];
            const boatMap = {};
            playerIds.forEach((pid, idx) => { boatMap[pid] = idx + 1; });

            if (betType === 'win') {
                playerIds.forEach(pid => {
                    const pStr = JSON.stringify([pid]);
                    let o = 0.0;
                    if (totalBets > 0) {
                        if (pools[pStr] > 0) {
                            o = ((totalBets * RETURN_RATE) + addedCarryover) / pools[pStr];
                        } else {
                            o = (((totalBets + 100.0) * RETURN_RATE) + addedCarryover) / 100.0;
                        }
                    } else {
                        o = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                    }
                    const p = players.find(x => x.id === pid);
                    oddsResult['win'].push({
                        player_id: pid,
                        name: p ? p.name : "不明",
                        boat_pattern: [boatMap[pid]],
                        odds: Math.max(1.0, o)
                    });
                });
                oddsResult['win'].sort((a,b) => a.boat_pattern[0] - b.boat_pattern[0]);

            } else if (betType === 'two_teams') {
                [1, 2].forEach(team => {
                    const pStr = JSON.stringify([team]);
                    let o = 0.0;
                    if (totalBets > 0) {
                        if (pools[pStr] > 0) {
                            o = ((totalBets * RETURN_RATE) + addedCarryover) / pools[pStr];
                        } else {
                            o = (((totalBets + 100.0) * RETURN_RATE) + addedCarryover) / 100.0;
                        }
                    } else {
                        if (addedCarryover > 0) {
                            o = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                        } else {
                            o = 1.0;
                        }
                    }
                    oddsResult['two_teams'].push({
                        pattern: [team],
                        team_name: team === 1 ? '赤チーム' : '青チーム',
                        odds: Math.max(1.0, o)
                    });
                });

            } else if (betType === 'exacta') {
                permutations(playerIds, 2).forEach(pair => {
                    const pStr = JSON.stringify(pair);
                    let o = 0.0;
                    if (totalBets > 0) {
                        if (pools[pStr] > 0) {
                            o = ((totalBets * RETURN_RATE) + addedCarryover) / pools[pStr];
                        } else {
                            o = (((totalBets + 100.0) * RETURN_RATE) + addedCarryover) / 100.0;
                        }
                    } else {
                        o = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                    }
                    oddsResult['exacta'].push({
                        pattern: pair,
                        pattern_names: pair.map(id => { const p = players.find(x=>x.id===id); return p ? p.name : ""; }),
                        boat_pattern: pair.map(id => boatMap[id]),
                        odds: Math.max(1.0, o)
                    });
                });
                oddsResult['exacta'].sort((a,b) => (a.boat_pattern[0] * 10 + a.boat_pattern[1]) - (b.boat_pattern[0] * 10 + b.boat_pattern[1]));

            } else if (betType === 'trifecta') {
                permutations(playerIds, 3).forEach(triple => {
                    const pStr = JSON.stringify(triple);
                    let o = 0.0;
                    if (totalBets > 0) {
                        if (pools[pStr] > 0) {
                            o = ((totalBets * RETURN_RATE) + addedCarryover) / pools[pStr];
                        } else {
                            o = (((totalBets + 100.0) * RETURN_RATE) + addedCarryover) / 100.0;
                        }
                    } else {
                        o = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                    }
                    oddsResult['trifecta'].push({
                        pattern: triple,
                        pattern_names: triple.map(id => { const p = players.find(x=>x.id===id); return p ? p.name : ""; }),
                        boat_pattern: triple.map(id => boatMap[id]),
                        odds: Math.max(1.0, o)
                    });
                });
                oddsResult['trifecta'].sort((a,b) => (a.boat_pattern[0] * 100 + a.boat_pattern[1] * 10 + a.boat_pattern[2]) - (b.boat_pattern[0] * 100 + b.boat_pattern[1] * 10 + b.boat_pattern[2]));
            }

            return { odds: oddsResult, pools, total_bets: totalBets };
        }

        // === Admin: Result Entry & Submit (Firebase) ===
        function toggleLockRace() {
            const raceNum = parseInt(adminRaceNumberSelect.value);
            db.ref(`races/${raceNum}/locked`).once('value', snapshot => {
                const currentStatus = !!snapshot.val();
                db.ref(`races/${raceNum}/locked`).set(!currentStatus, () => {
                    showToast(currentStatus ? "投票の受付を再開しました" : "投票受付を締め切りました");
                });
            });
        }

        if (adminQuickLockBtn) {
            adminQuickLockBtn.addEventListener('click', toggleLockRace);
        }
        if (btnLockRace) {
            btnLockRace.addEventListener('click', toggleLockRace);
        }

        function renderRecordPlayersGrid() {
            if (!recordPlayersGrid) return;
            recordPlayersGrid.innerHTML = currentRacePlayers.map((p, idx) => {
                const isFinished = currentRaceResults.includes(p.id);
                const finishRank = currentRaceResults.indexOf(p.id) + 1;
                const boatNum = idx + 1;
                
                return `<button class="racer-btn${isFinished ? ' finished' : ''}" data-id="${p.id}">
                    <span class="rank-badge">${finishRank}</span>
                    <span class="runner-boat-badge boat-badge-${boatNum}" style="display:block; margin:0 auto 10px;">${boatNum}</span>
                    <div style="font-weight: bold;">${p.name}</div>
                </button>`;
            }).join('');

            document.querySelectorAll('.racer-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = btn.getAttribute('data-id');
                    if (!currentRaceResults.includes(id) && currentRaceResults.length < 3) {
                        currentRaceResults.push(id);
                        renderRecordPlayersGrid();
                        renderLiveRankingDisplay();
                    }
                });
            });
        }

        function renderLiveRankingDisplay() {
            if (!liveRankingDisplay) return;
            if (currentRaceResults.length === 0) {
                liveRankingDisplay.innerHTML = `<span style="color:var(--text-muted);">選手を順にタップして着順を登録してください</span>`;
                return;
            }

            liveRankingDisplay.innerHTML = `<div class="ranking-slots">` + 
                currentRaceResults.map((id, idx) => {
                    const p = currentRacePlayers.find(x => x.id === id);
                    const boatIdx = currentRacePlayers.findIndex(x => x.id === id) + 1;
                    return `<div class="rank-slot">
                        ${idx + 1}着: <span class="runner-boat-badge boat-badge-${boatIdx}" style="width:20px; height:20px; font-size:0.75rem; border-radius:4px; margin:0 4px;">${boatIdx}</span> ${p ? p.name : ''}
                    </div>`;
                }).join('') +
            `</div>`;
        }

        if (btnResetRecord) {
            btnResetRecord.addEventListener('click', () => {
                currentRaceResults = [];
                renderRecordPlayersGrid();
                renderLiveRankingDisplay();
            });
        }

        if (btnSubmitRecord) {
            btnSubmitRecord.addEventListener('click', async () => {
                const raceNum = parseInt(adminRaceNumberSelect.value);
                const reqCount = (allowedBetType === 'trifecta') ? 3 : ((allowedBetType === 'exacta') ? 2 : 1);
                
                if (currentRaceResults.length < reqCount) {
                    showToast(`結果の登録には ${reqCount} 人の着順登録が必要です`, true);
                    return;
                }

                if (!confirm(`${raceNum}Rの結果を確定させ、払戻金の分配とオッズ確定を実行します。よろしいですか？`)) {
                    return;
                }

                // 確定計算ロジック
                resolveRaceFirebase(raceNum, currentRaceResults);
            });
        }

        // Firebase内でのレース結果確定・オッズ決定・キャリーオーバー計算処理
        function resolveRaceFirebase(raceNum, results) {
            db.ref('/').once('value', snapshot => {
                const data = snapshot.val() || {};
                const races = data.races || {};
                const race = races[raceNum];
                if (!race) return;

                const dbVotes = data.votes || {};
                const dbVoters = data.voters || {};
                const settings = data.settings || {};
                const carryoverPool = parseFloat(settings.carryover_pool) || 0.0;
                
                // キャリーオーバーの適用額
                const appliedCarryover = carryoverPool;

                // 選手名・枠順のマッピング
                const playerIds = race.player_ids;
                const boatMap = {};
                playerIds.forEach((pid, idx) => { boatMap[pid] = idx + 1; });

                // 1. 的中パターンの定義
                let hitPattern = [];
                if (allowedBetType === 'win') {
                    hitPattern = [results[0]];
                } else if (allowedBetType === 'two_teams') {
                    // 1着の選手のチーム (1 or 2)
                    const winnerId = results[0];
                    const boatNum = playerIds.indexOf(winnerId) + 1;
                    const winnerTeam = (boatNum % 2 !== 0) ? 1 : 2;
                    hitPattern = [winnerTeam];
                } else if (allowedBetType === 'exacta') {
                    hitPattern = [results[0], results[1]];
                } else if (allowedBetType === 'trifecta') {
                    hitPattern = [results[0], results[1], results[2]];
                }

                // 2. 該当レースの全投票を抽出
                const raceVotes = [];
                Object.keys(dbVotes).forEach(vid => {
                    const v = dbVotes[vid];
                    if (v.race_number === raceNum && v.bet_type === allowedBetType && !v.is_resolved) {
                        raceVotes.push({ id: vid, ...v });
                    }
                });

                // 3. オッズの再計算（確定時）
                const oddsData = calculateDynamicOddsJS(playerIds, raceVotes, allowedBetType, appliedCarryover);
                const finalOddsDict = oddsData.odds[allowedBetType];

                // 4. 各投票の判定
                let totalPayout = 0;
                const updatedVotes = {};
                
                raceVotes.forEach(v => {
                    let isHit = false;
                    const pattern = v.pattern;

                    if (allowedBetType === 'win') {
                        isHit = (pattern[0] === hitPattern[0]);
                    } else if (allowedBetType === 'two_teams') {
                        isHit = (pattern[0] === hitPattern[0]);
                    } else if (allowedBetType === 'exacta') {
                        isHit = (pattern[0] === hitPattern[0] && pattern[1] === hitPattern[1]);
                    } else if (allowedBetType === 'trifecta') {
                        isHit = (pattern[0] === hitPattern[0] && pattern[1] === hitPattern[1] && pattern[2] === hitPattern[2]);
                    }

                    // オッズの決定
                    let targetOdds = 0.0;
                    if (allowedBetType === 'win') {
                        const o = finalOddsDict.find(x => x.player_id === pattern[0]);
                        targetOdds = o ? o.odds : 0.0;
                    } else if (allowedBetType === 'two_teams') {
                        const o = finalOddsDict.find(x => x.pattern[0] === pattern[0]);
                        targetOdds = o ? o.odds : 0.0;
                    } else {
                        const o = finalOddsDict.find(x => JSON.stringify(x.pattern) === JSON.stringify(pattern));
                        targetOdds = o ? o.odds : 0.0;
                    }

                    const roundedOdds = Math.round(targetOdds * 10) / 10;
                    const payout = isHit ? Math.floor(v.amount * roundedOdds) : 0;
                    totalPayout += payout;

                    updatedVotes[v.id] = {
                        ...v,
                        is_resolved: true,
                        is_hit: isHit,
                        odds: roundedOdds,
                        payout: payout
                    };
                });

                // 5. 投票者残高の分配
                const updatedVoters = { ...dbVoters };
                Object.keys(updatedVotes).forEach(vid => {
                    const vote = updatedVotes[vid];
                    if (vote.is_hit && vote.payout > 0) {
                        // 投票者を探して加算
                        const voterId = Object.keys(updatedVoters).find(k => updatedVoters[k].name === vote.voter_name);
                        if (voterId) {
                            updatedVoters[voterId].balance = (updatedVoters[voterId].balance || 0) + vote.payout;
                        }
                    }
                });

                // 6. キャリーオーバー及び控除計算
                let totalBetsOnRace = 0.0;
                raceVotes.forEach(v => { totalBetsOnRace += parseFloat(v.amount); });

                let newCarryover = 0.0;
                let carryoverGenerated = 0.0;

                if (totalBetsOnRace > 0) {
                    if (totalPayout === 0) {
                        // 的中者なし：キャリーオーバー発生
                        newCarryover = (totalBetsOnRace * 0.90) + (appliedCarryover * 0.90);
                        carryoverGenerated = newCarryover;
                    } else {
                        // 的中者あり：キャリーオーバー消費
                        newCarryover = 0.0;
                        carryoverGenerated = 0.0;
                    }
                } else {
                    // 投票なし：キャリーオーバー維持
                    newCarryover = appliedCarryover;
                    carryoverGenerated = appliedCarryover;
                }

                // 7. 控除ログの登録
                const logId = db.ref('commission_log').push().key;
                const betsCommission = Math.floor(totalBetsOnRace * 0.10);
                const carryoverCommission = Math.floor(appliedCarryover * 0.10);
                const totalCommission = betsCommission + carryoverCommission;

                const commLog = {
                    race_number: raceNum,
                    total_bets: totalBetsOnRace,
                    carryover_applied: appliedCarryover,
                    bets_commission: betsCommission,
                    carryover_commission: carryoverCommission,
                    total_commission: totalCommission,
                    date: new Date().toLocaleString()
                };

                // Firebaseへの一斉書き込み
                const updates = {};
                // レース情報の更新
                updates[`races/${raceNum}/active`] = false;
                updates[`races/${raceNum}/resolved`] = true;
                updates[`races/${raceNum}/results`] = results;
                updates[`races/${raceNum}/carryover_applied`] = appliedCarryover;
                updates[`races/${raceNum}/carryover_generated`] = carryoverGenerated;
                
                // 投票の更新
                Object.keys(updatedVotes).forEach(vid => {
                    updates[`votes/${vid}`] = updatedVotes[vid];
                });
                
                // 残高の更新
                Object.keys(updatedVoters).forEach(vId => {
                    updates[`voters/${vId}/balance`] = updatedVoters[vId].balance;
                });

                // キャリーオーバーの更新
                updates[`settings/carryover_pool`] = newCarryover;
                
                // 控除ログの書き込み
                updates[`commission_log/${logId}`] = commLog;

                db.ref().update(updates, err => {
                    if (err) {
                        showToast('レースの確定に失敗しました', true);
                    } else {
                        showToast(`${raceNum}Rを確定しました！`);
                        currentRaceResults = [];
                        
                        // 管理者ページのUI更新
                        fetchActiveRace();
                        loadCommissionLog();
                        loadCompletedRacesHistory();
                    }
                });
            });
        }

        // === Admin: Commission Log Display ===
        function renderCommissionLog(data) {
            if (!commissionLogTableBody) return;
            const commData = data.commission_log || {};
            const logs = Object.keys(commData).map(k => commData[k]).sort((a,b) => a.race_number - b.race_number);

            const activeRaceNum = parseInt(adminRaceNumberSelect.value);
            const dbVotes = data.votes || {};
            let liveTotalBets = 0;
            Object.keys(dbVotes).forEach(vid => {
                const v = dbVotes[vid];
                if (v.race_number === activeRaceNum && !v.is_resolved) {
                    liveTotalBets += parseFloat(v.amount);
                }
            });
            const liveCarryover = parseFloat(data.settings?.carryover_pool) || 0;
            
            if (liveTotalBets > 0) {
                logs.push({
                    race_number: `${activeRaceNum} (予想)`,
                    total_bets: liveTotalBets,
                    carryover_applied: liveCarryover,
                    bets_commission: liveTotalBets * 0.1,
                    carryover_commission: liveCarryover * 0.1,
                    total_commission: (liveTotalBets * 0.1) + (liveCarryover * 0.1),
                    date: '未確定（リアルタイム）'
                });
            }

            let sumTotalBets = 0;
            let sumAppliedCO = 0;
            let sumBetsComm = 0;
            let sumCOComm = 0;
            let sumTotalComm = 0;

            commissionLogTableBody.innerHTML = logs.map(l => {
                sumTotalBets += l.total_bets || 0;
                sumAppliedCO += l.carryover_applied || 0;
                sumBetsComm += l.bets_commission || 0;
                sumCOComm += l.carryover_commission || 0;
                sumTotalComm += l.total_commission || 0;

                return `<tr>
                    <td>${l.race_number}R</td>
                    <td>${(l.total_bets || 0).toLocaleString()} G</td>
                    <td>${(l.carryover_applied || 0).toLocaleString()} G</td>
                    <td>${(l.bets_commission || 0).toLocaleString()} G</td>
                    <td>${(l.carryover_commission || 0).toLocaleString()} G</td>
                    <td class="neon-text">${(l.total_commission || 0).toLocaleString()} G</td>
                    <td style="font-size:0.8rem; color:var(--text-muted);">${l.date || ''}</td>
                </tr>`;
            }).join('');

            if (commissionLogTableFoot) {
                commissionLogTableFoot.innerHTML = `<tr style="font-weight: bold; background: rgba(255,255,255,0.05);">
                    <td>合計</td>
                    <td>${sumTotalBets.toLocaleString()} G</td>
                    <td>${sumAppliedCO.toLocaleString()} G</td>
                    <td>${sumBetsComm.toLocaleString()} G</td>
                    <td>${sumCOComm.toLocaleString()} G</td>
                    <td class="neon-text" style="font-size: 1.1rem; text-shadow:0 0 10px rgba(0,240,255,0.4);">${sumTotalComm.toLocaleString()} G</td>
                    <td>-</td>
                </tr>`;
            }
        }

        if (btnRefreshCommissionLog) {
            btnRefreshCommissionLog.addEventListener('click', () => {
                db.ref('/').once('value', snapshot => {
                    renderCommissionLog(snapshot.val() || {});
                });
                showToast('ログを更新しました');
            });
        }

        // === Admin: Voters Bets Status ===
        function loadVotersBets() {
            if (!votersBetsContainer) return;
            const raceNum = parseInt(adminRaceNumberSelect.value);
            
            db.ref('/').once('value', snapshot => {
                const data = snapshot.val() || {};
                const dbVoters = data.voters || {};
                const dbVotes = data.votes || {};
                const race = data.races ? data.races[raceNum] : null;

                const reveal = data.settings ? !!data.settings.reveal : false;
                const vIds = Object.keys(dbVoters);
                
                if (vIds.length === 0) {
                    votersBetsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">投票者が登録されていません</div>`;
                    return;
                }

                votersBetsContainer.innerHTML = vIds.map(vId => {
                    const v = dbVoters[vId];
                    const vVotes = [];
                    Object.keys(dbVotes).forEach(voteId => {
                        const vote = dbVotes[voteId];
                        if (vote.voter_name === v.name && vote.race_number === raceNum && !vote.is_resolved) {
                            vVotes.push(vote);
                        }
                    });

                    let statusBadge = vVotes.length > 0 
                        ? `<span class="status-badge complete" style="padding:0.25rem 0.75rem; font-size:0.8rem;">🟢 投票完了</span>`
                        : `<span class="status-badge waiting" style="padding:0.25rem 0.75rem; font-size:0.8rem;">⚪ 投票待ち</span>`;

                    let detailHtml = '';
                    if (vVotes.length > 0) {
                        detailHtml = `<table class="data-table" style="margin-top:0.5rem; width:100%;">
                            <thead>
                                <tr>
                                    <th>賭け式</th>
                                    <th>買い目</th>
                                    <th>金額</th>
                                    <th>想定オッズ</th>
                                </tr>
                            </thead>
                            <tbody>` +
                                vVotes.map(vote => `<tr>
                                    <td>${betTypeNames[vote.bet_type]}</td>
                                    <td class="neon-text">${vote.display_pattern}</td>
                                    <td>${vote.amount.toLocaleString()} G</td>
                                        <td style="color:var(--warning); font-weight:bold;">${vote.odds < 1.0 ? '-' : vote.odds.toFixed(1) + 'x'}</td>
                                </tr>`).join('') +
                            `</tbody>
                        </table>`;
                    } else {
                        detailHtml = `<div style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-muted);">まだ投票していません</div>`;
                    }

                    return `<div class="bet-row" style="flex-direction:column; align-items:stretch; gap:0.25rem; margin-bottom:1rem; padding:1rem;">
                        <div class="flex-between">
                            <span style="font-weight:bold; font-size:1.1rem; color:#fff;">${v.name}</span>
                            ${statusBadge}
                        </div>
                        ${detailHtml}
                    </div>`;
                }).join('');
            });
        }

        if (btnRefreshVotersBets) {
            btnRefreshVotersBets.addEventListener('click', () => {
                loadVotersBets();
                showToast('投票状況を更新しました');
            });
        }

        // === Admin: Player Baseline Stats (Firebase) ===
        if (statsPlayerSelect) {
            statsPlayerSelect.addEventListener('change', () => {
                const pid = statsPlayerSelect.value;
                if (!pid) {
                    playerStatsFormContainer.style.display = 'none';
                    return;
                }
                playerStatsFormContainer.style.display = 'block';
                
                db.ref(`player_stats/${pid}`).once('value', snapshot => {
                    const val = snapshot.val() || {};
                    statsRacesPlayed.value = val.races_played || 0;
                    statsTotalPoints.value = val.total_points || 0;
                    statsFirstPlaces.value = val.first_places || 0;
                    statsSecondPlaces.value = val.second_places || 0;
                    statsThirdPlaces.value = val.third_places || 0;
                    statsFourthPlaces.value = val.fourth_places || 0;
                    statsFifthPlaces.value = val.fifth_places || 0;
                    statsSixthPlaces.value = val.sixth_places || 0;
                    statsUnplaced.value = val.unplaced || 0;
                    statsPointRate.value = val.point_rate || 0.0;
                    
                    renderPlayerRaceHistory(pid);
                });
            });
        }

        function renderStatsPlayerSelect() {
            if (!statsPlayerSelect) return;
            const curVal = statsPlayerSelect.value;
            statsPlayerSelect.innerHTML = `<option value="">-- 選手を選択してください --</option>` + 
                players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            statsPlayerSelect.value = curVal;
        }

        if (btnSavePlayerStats) {
            btnSavePlayerStats.addEventListener('click', () => {
                const pid = statsPlayerSelect.value;
                if (!pid) return;

                const stats = {
                    races_played: parseInt(statsRacesPlayed.value) || 0,
                    total_points: parseInt(statsTotalPoints.value) || 0,
                    first_places: parseInt(statsFirstPlaces.value) || 0,
                    second_places: parseInt(statsSecondPlaces.value) || 0,
                    third_places: parseInt(statsThirdPlaces.value) || 0,
                    fourth_places: parseInt(statsFourthPlaces.value) || 0,
                    fifth_places: parseInt(statsFifthPlaces.value) || 0,
                    sixth_places: parseInt(statsSixthPlaces.value) || 0,
                    unplaced: parseInt(statsUnplaced.value) || 0,
                    point_rate: parseFloat(statsPointRate.value) || 0.0
                };

                db.ref(`player_stats/${pid}`).set(stats, err => {
                    if (err) {
                        showToast('保存に失敗しました', true);
                    } else {
                        showToast('戦績を保存しました！');
                    }
                });
            });
        }

        if (btnResetPlayerStats) {
            btnResetPlayerStats.addEventListener('click', () => {
                const pid = statsPlayerSelect.value;
                if (!pid) return;
                if (confirm('戦績データをリセットしてもよろしいですか？')) {
                    db.ref(`player_stats/${pid}`).remove(() => {
                        statsRacesPlayed.value = 0;
                        statsTotalPoints.value = 0;
                        statsFirstPlaces.value = 0;
                        statsSecondPlaces.value = 0;
                        statsThirdPlaces.value = 0;
                        statsFourthPlaces.value = 0;
                        statsFifthPlaces.value = 0;
                        statsSixthPlaces.value = 0;
                        statsUnplaced.value = 0;
                        statsPointRate.value = 0.0;
                        showToast('リセットしました');
                    });
                }
            });
        }

        function renderPlayerRaceHistory(pid) {
            if (!statsHistoryList) return;
            db.ref('races').once('value', snapshot => {
                const data = snapshot.val() || {};
                const history = [];
                
                Object.keys(data).forEach(raceNum => {
                    const r = data[raceNum];
                    if (r.resolved && r.results && r.results.includes(pid)) {
                        const rank = r.results.indexOf(pid) + 1;
                        history.push({
                            race_number: raceNum,
                            rank: rank,
                            bet_type: r.allowed_bet_type
                        });
                    }
                });

                if (history.length === 0) {
                    statsHistoryContainer.style.display = 'none';
                    statsHistoryList.innerHTML = '';
                    return;
                }

                statsHistoryContainer.style.display = 'block';
                statsHistoryList.innerHTML = history.sort((a,b)=>b.race_number - a.race_number).map(h => 
                    `<div class="bet-row flex-between" style="padding:0.5rem 1rem;">
                        <strong>${h.race_number}R</strong>
                        <span>結果: <strong class="neon-text">${h.rank} 着</strong></span>
                        <span style="font-size:0.85rem; color:var(--text-muted);">(${betTypeNames[h.bet_type]})</span>
                    </div>`
                ).join('');
            });
        }

        // === Admin: Completed Races History ===
        function loadCompletedRacesHistory() {
            const container = document.getElementById('completed-races-history-container');
            if (!container) return;

            db.ref('/').once('value', snapshot => {
                const data = snapshot.val() || {};
                const races = data.races || {};
                const votes = data.votes || {};
                const resolvedList = Object.keys(races)
                    .map(num => races[num])
                    .filter(r => r.resolved)
                    .sort((a,b) => b.race_number - a.race_number);

                if (resolvedList.length === 0) {
                    container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">過去のレース履歴はありません</div>`;
                    return;
                }

                container.innerHTML = resolvedList.map(r => {
                    // このレースの配当・的中者
                    const rVotes = [];
                    Object.keys(votes).forEach(vid => {
                        const v = votes[vid];
                        if (v.race_number === r.race_number) {
                            rVotes.push(v);
                        }
                    });

                    const winners = rVotes.filter(v => v.is_hit && v.payout > 0);
                    const winnerHtml = winners.length > 0 
                        ? winners.map(w => `<div class="bet-row" style="padding:0.5rem; font-size:0.9rem;">
                            <span>👑 <strong>${w.voter_name}</strong>: ${w.display_pattern}</span>
                            <span style="margin-left:auto; color:var(--success); font-weight:bold;">+${w.payout.toLocaleString()} G</span>
                        </div>`).join('')
                        : `<div style="padding:0.5rem; font-size:0.9rem; color:var(--text-muted); font-style:italic;">的中者なし (キャリーオーバーへ蓄積されました)</div>`;

                    // 着順の枠順マッピング
                    const rankHtml = r.results.map((pid, idx) => {
                        const pIdx = r.player_ids.indexOf(pid) + 1;
                        const p = players.find(x => x.id === pid);
                        return `<span class="rank-slot" style="padding: 0.25rem 0.5rem; font-size:0.8rem;">
                            ${idx+1}着: <span class="runner-boat-badge boat-badge-${pIdx}" style="width:16px; height:16px; font-size:0.7rem; border-radius:3px; margin:0 2px;">${pIdx}</span> ${p ? p.name : ''}
                        </span>`;
                    }).join(' ');

                    return `<div class="glass-card" style="padding:1.25rem; margin-bottom:1rem; border-color:rgba(255,255,255,0.05);">
                        <div class="flex-between" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                            <div>
                                <strong style="font-size:1.15rem; color:var(--primary);">${r.race_number}R 結果確定</strong>
                                <span style="font-size:0.85rem; color:var(--text-muted); margin-left:10px;">形式: ${betTypeNames[r.allowed_bet_type]}</span>
                            </div>
                            <button class="glass-btn danger btn-delete-completed-race" data-num="${r.race_number}" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">削除</button>
                        </div>
                        <div style="margin-bottom:0.75rem; display:flex; flex-wrap:wrap; gap:0.5rem;">
                            ${rankHtml}
                        </div>
                        <div style="font-weight:bold; font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;">払戻分配・的中結果:</div>
                        <div style="background:rgba(0,0,0,0.2); border-radius:8px; padding:0.25rem;">
                            ${winnerHtml}
                        </div>
                    </div>`;
                }).join('');

                document.querySelectorAll('.btn-delete-completed-race').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const num = e.currentTarget.getAttribute('data-num');
                        if (confirm(`確定済みの ${num}R を履歴から削除してもよろしいですか？（※投票者の所持金や戦績は元に戻りません）`)) {
                            db.ref(`races/${num}`).remove();
                            db.ref('commission_log').once('value', cSnap => {
                                const cData = cSnap.val() || {};
                                Object.keys(cData).forEach(cid => {
                                    if (cData[cid].race_number === parseInt(num)) {
                                        db.ref(`commission_log/${cid}`).remove();
                                    }
                                });
                                db.ref('votes').once('value', vSnap => {
                                    const vData = vSnap.val() || {};
                                    Object.keys(vData).forEach(vid => {
                                        if (vData[vid].race_number === parseInt(num)) {
                                            db.ref(`votes/${vid}`).remove();
                                        }
                                    });
                                    showToast(`${num}Rの履歴を削除しました`);
                                    loadCompletedRacesHistory();
                                    db.ref('/').once('value', snapshot => {
                                        renderCommissionLog(snapshot.val() || {});
                                    });
                                });
                            });
                        }
                    });
                });
            });
        }

        // === Voter: Auth & Session Management ===
        if (voterAuthForm) {
            voterAuthForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = voterLoginNameInput.value.trim();
                const pass = voterLoginPassInput.value;
                if (!name || !pass) return;

                db.ref('voters').once('value', snapshot => {
                    const data = snapshot.val() || {};
                    const voterId = Object.keys(data).find(k => data[k].name === name && data[k].password === pass);
                    if (voterId) {
                        const voterObj = { id: voterId, name: data[voterId].name, balance: data[voterId].balance };
                        window._setCurrentVoter(voterObj);
                        showToast(`${name}さん、ログインしました！`);
                        voterLoginPassInput.value = '';
                    } else {
                        showToast('ログイン情報が正しくありません', true);
                    }
                });
            });
        }

        if (btnVoterLogout) {
            btnVoterLogout.addEventListener('click', () => {
                // マークシートとカートを完全にクリア
                votingCart = [];
                selectedMarkCombination = [[], [], []];
                document.querySelectorAll('.cell-select-btn').forEach(btn => btn.classList.remove('active'));
                
                window._setCurrentVoter(null);
                showToast('ログアウトしました');
            });
        }

        // === Voter: Grid Mark Sheet UI Generation ===
        function renderGridMarkSheet() {
            const container = document.getElementById('mark-sheet-table-container');
            if (!container) return;

            // リセット
            selectedMarkCombination = [[], [], []];
            
            const placesCount = (allowedBetType === 'trifecta') ? 3 : ((allowedBetType === 'exacta') ? 2 : 1);
            
            let headerCols = '';
            for (let p = 1; p <= placesCount; p++) {
                headerCols += `<div class="mark-sheet-col col-place">${p}着</div>`;
            }

            let rowsHtml = '';
            if (allowedBetType === 'two_teams') {
                // 2チーム専用マークシート
                const teamsList = [
                    { id: 1, name: '赤チーム (奇数枠艇)', badge: 'boat-badge-3' },
                    { id: 2, name: '青チーム (偶数枠艇)', badge: 'boat-badge-4' }
                ];
                
                rowsHtml = teamsList.map(t => {
                    return `<div class="mark-sheet-row">
                        <div class="mark-sheet-col col-runner">
                            <span class="runner-boat-badge ${t.badge}" style="width:24px; height:24px; font-size:0.8rem;">T</span>
                            <span class="runner-name-text" style="font-size:0.95rem;">${t.name}</span>
                        </div>
                        <div class="mark-sheet-col col-place">
                            <button type="button" class="cell-select-btn cell-team-btn" data-val="${t.id}" data-col="0">ー</button>
                        </div>
                    </div>`;
                }).join('');
            } else {
                // 通常マークシート
                rowsHtml = currentRacePlayers.map((p, idx) => {
                    const boatNum = idx + 1;
                    const badgeClass = `boat-badge-${boatNum}`;
                    
                    let cells = '';
                    for (let c = 0; c < placesCount; c++) {
                        cells += `<div class="mark-sheet-col col-place">
                            <button type="button" class="cell-select-btn cell-runner-btn" data-pid="${p.id}" data-boat="${boatNum}" data-col="${c}">${boatNum}</button>
                        </div>`;
                    }

                    return `<div class="mark-sheet-row">
                        <div class="mark-sheet-col col-runner">
                            <span class="runner-boat-badge ${badgeClass}">${boatNum}</span>
                            <span class="runner-name-text">${p.name}</span>
                        </div>
                        ${cells}
                    </div>`;
                }).join('');
            }

            container.innerHTML = `
                <div class="mark-sheet-table">
                    <div class="mark-sheet-row header">
                        <div class="mark-sheet-col col-runner">艇番 / 選手名</div>
                        ${headerCols}
                    </div>
                    ${rowsHtml}
                </div>
            `;

            // イベントリスナー登録
            document.querySelectorAll('.cell-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const colIdx = parseInt(btn.getAttribute('data-col'));
                    const isTeam = btn.classList.contains('cell-team-btn');
                    
                    if (isTeam) {
                        const val = parseInt(btn.getAttribute('data-val'));
                        toggleTeamSelect(btn, val);
                    } else {
                        const pid = btn.getAttribute('data-pid');
                        const boatNum = parseInt(btn.getAttribute('data-boat'));
                        toggleRunnerSelect(btn, pid, boatNum, colIdx);
                    }
                });
            });
        }

        function toggleTeamSelect(btn, teamVal) {
            const isActive = btn.classList.contains('active');
            // 全解除
            document.querySelectorAll('.cell-team-btn').forEach(b => b.classList.remove('active'));
            selectedMarkCombination = [[], [], []];

            if (!isActive) {
                btn.classList.add('active');
                selectedMarkCombination[0] = [teamVal];
            }
            updateOddsValues();
        }

        function toggleRunnerSelect(btn, pid, boatNum, colIdx) {
            const isActive = btn.classList.contains('active');
            
            if (isActive) {
                btn.classList.remove('active');
                selectedMarkCombination[colIdx] = selectedMarkCombination[colIdx].filter(x => x !== pid);
            } else {
                btn.classList.add('active');
                selectedMarkCombination[colIdx].push(pid);
            }
            updateOddsValues();
        }

        // フォーメーションの有効な組み合わせを生成するヘルパー関数
        function getValidMarkSheetCombinations(placesCount) {
            if (allowedBetType === 'two_teams') {
                if (selectedMarkCombination[0].length > 0) return [[selectedMarkCombination[0][0]]];
                return [];
            }
            
            const arrays = selectedMarkCombination.slice(0, placesCount);
            if (arrays.some(a => a.length === 0)) return [];
            
            let result = [];
            const helper = (arr, i) => {
                if (i === arrays.length) {
                    result.push(arr);
                    return;
                }
                for (let j = 0; j < arrays[i].length; j++) {
                    if (!arr.includes(arrays[i][j])) {
                        helper([...arr, arrays[i][j]], i + 1);
                    }
                }
            };
            helper([], 0);
            return result;
        }

        // 全買い目のオッズ表を描画
        function renderOddsTable(oddsData, betType) {
            const container = document.getElementById('voting-odds-display');
            if (!container) return;
            
            if (isOddsHidden) {
                container.innerHTML = `<div class="text-center text-muted" style="padding: 1.5rem;">オッズは非表示に設定されています</div>`;
                return;
            }

            const list = oddsData[betType] || [];
            if (list.length === 0) {
                container.innerHTML = '';
                return;
            }

            let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; max-height: 250px; overflow-y: auto; padding-right: 5px;">`;
            
            list.forEach(item => {
                let displayPattern = "";
                if (betType === 'two_teams') {
                    displayPattern = (item.boat_pattern[0] === 1) ? "赤" : "青";
                } else {
                    displayPattern = item.boat_pattern.join('-');
                }
                
                const oddsStr = item.odds < 1.0 ? '-' : item.odds.toFixed(1) + 'x';
                
                html += `<div style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 6px; padding: 0.5rem; text-align: center;">
                    <div class="neon-text" style="font-weight: bold; font-size: 0.95rem;">${displayPattern}</div>
                    <div style="color: var(--warning); font-weight: bold; font-size: 0.85rem; margin-top: 2px;">${oddsStr}</div>
                </div>`;
            });
            html += `</div>`;
            
            container.innerHTML = html;
        }


        // オッズ表示のリアルタイム更新
        function updateOddsValues() {
            const valDisplay = document.getElementById('selected-bet-odds-val');
            const patternDisplay = document.getElementById('selected-bet-pattern-display');
            const btnAddCart = document.getElementById('btn-add-to-cart');

            const placesCount = (allowedBetType === 'trifecta') ? 3 : ((allowedBetType === 'exacta') ? 2 : 1);
            
            // 選択チェック
            let isComplete = true;
            for (let c = 0; c < placesCount; c++) {
                if (selectedMarkCombination[c].length === 0) {
                    isComplete = false;
                    break;
                }
            }

            if (!isComplete) {
                if (valDisplay) valDisplay.textContent = "-";
                if (patternDisplay) patternDisplay.textContent = "マークシートを選択してください";
                if (btnAddCart) btnAddCart.disabled = true;
                return;
            }

            const validPatterns = getValidMarkSheetCombinations(placesCount);
            if (validPatterns.length === 0) {
                if (valDisplay) valDisplay.textContent = "-";
                if (patternDisplay) patternDisplay.textContent = "有効な組み合わせがありません（同じ艇番が選択されています）";
                if (btnAddCart) btnAddCart.disabled = true;
                return;
            }

            if (btnAddCart) btnAddCart.disabled = false;

            const RETURN_RATE = 0.90;
            const addedCarryover = currentCarryoverPool * 0.90;
            
            let minOdds = Infinity;
            let maxOdds = 0;

            validPatterns.forEach(pids => {
                const patternStr = JSON.stringify(pids);
                const pool = currentPools[patternStr] || 0.0;
                let oddsVal = 0.0;

                if (currentTotalBets > 0 && pool > 0) {
                    oddsVal = ((currentTotalBets * RETURN_RATE) + addedCarryover) / pool;
                } else {
                    if (allowedBetType === 'two_teams') {
                        oddsVal = addedCarryover > 0 ? ((100.0 * RETURN_RATE) + addedCarryover) / 100.0 : 1.8;
                    } else {
                        oddsVal = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                    }
                }
                const roundedOdds = Math.round(oddsVal * 10) / 10;
                if (roundedOdds < minOdds) minOdds = roundedOdds;
                if (roundedOdds > maxOdds) maxOdds = roundedOdds;
            });

            let displayStr = "";
            if (validPatterns.length > 1) {
                displayStr = `フォーメーション (${validPatterns.length}点)`;
            } else {
                if (allowedBetType === 'two_teams') {
                    displayStr = validPatterns[0][0] === 1 ? '赤チーム (1)' : '青チーム (2)';
                } else {
                    const boatIdxs = validPatterns[0].map(pid => currentRacePlayers.findIndex(x => x.id === pid) + 1);
                    displayStr = boatIdxs.join(' - ');
                }
            }

            if (patternDisplay) {
                if (isOddsHidden) {
                    patternDisplay.innerHTML = `<span style="color:var(--text-muted); font-size:0.9rem;">(オッズ非表示中)</span><br><strong style="color:var(--primary); font-size:1.25rem;">${displayStr}</strong>`;
                } else {
                    patternDisplay.innerHTML = `<strong style="color:var(--primary); font-size:1.25rem;">${displayStr}</strong>`;
                }
            }

            if (valDisplay) {
                if (isOddsHidden) {
                    valDisplay.textContent = "🔒";
                } else {
                    if (validPatterns.length > 1 && minOdds !== maxOdds) {
                        const minStr = minOdds < 1.0 ? '-' : minOdds.toFixed(1) + 'x';
                        const maxStr = maxOdds < 1.0 ? '-' : maxOdds.toFixed(1) + 'x';
                        valDisplay.textContent = `${minStr} ~ ${maxStr}`;
                    } else {
                        valDisplay.textContent = minOdds < 1.0 ? '-' : minOdds.toFixed(1) + 'x';
                    }
                }
            }
        }

        // === Voter: Cart Logic ===
        const btnAddCart = document.getElementById('btn-add-to-cart');
        const betAmountInput = document.getElementById('selected-bet-amount');

        if (btnAddCart) {
            btnAddCart.addEventListener('click', () => {
                const amt = parseInt(betAmountInput.value);
                if (isNaN(amt) || amt <= 0) {
                    showToast('有効な購入金額を入力してください', true);
                    return;
                }
                if (amt < 100) {
                    showToast('最低購入金額は 100 G です', true);
                    return;
                }

                const placesCount = (allowedBetType === 'trifecta') ? 3 : ((allowedBetType === 'exacta') ? 2 : 1);
                const validPatterns = getValidMarkSheetCombinations(placesCount);
                
                if (validPatterns.length === 0) {
                    showToast('有効な組み合わせがありません', true);
                    return;
                }

                validPatterns.forEach(rawPattern => {
                    let displayStr = "";
                    if (allowedBetType === 'two_teams') {
                        displayStr = rawPattern[0] === 1 ? '赤チーム' : '青チーム';
                    } else {
                        const boatIdxs = rawPattern.map(pid => currentRacePlayers.findIndex(x => x.id === pid) + 1);
                        displayStr = boatIdxs.join(' - ');
                    }

                    // 重複確認
                    const existIdx = votingCart.findIndex(item => item.display_pattern === displayStr);
                    if (existIdx !== -1) {
                        votingCart[existIdx].amount += amt;
                    } else {
                        votingCart.push({
                            bet_type: allowedBetType,
                            pattern: rawPattern,
                            display_pattern: displayStr,
                            amount: amt
                        });
                    }
                });

                showToast(`買い目リストに ${validPatterns.length} 点追加しました！（合計 ${validPatterns.length * amt} G）`);
                
                // マークシートクリア
                selectedMarkCombination = [[], [], []];
                document.querySelectorAll('.cell-select-btn').forEach(btn => btn.classList.remove('active'));

                renderCartItems();
                updateOddsValues();
            });
        }

        // クイック金額入力
        document.querySelectorAll('.quick-amt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rawVal = btn.getAttribute('data-value');
                if (rawVal === 'clear') {
                    betAmountInput.value = '';
                } else {
                    const addVal = parseInt(rawVal);
                    const curVal = parseInt(betAmountInput.value) || 0;
                    betAmountInput.value = curVal + addVal;
                }
            });
        });

        function renderCartItems() {
            const tbody = document.getElementById('cart-items-tbody');
            const cartSection = document.getElementById('cart-list-section');
            const btnSubmit = document.getElementById('btn-submit-cart');

            if (!tbody) return;

            if (votingCart.length === 0) {
                cartSection.style.display = 'none';
                if (btnSubmit) btnSubmit.disabled = true;
                return;
            }

            cartSection.style.display = 'block';
            if (btnSubmit) btnSubmit.disabled = false;

            tbody.innerHTML = votingCart.map((item, idx) => {
                // 想定オッズの計算（買い目リスト用）
                const patternStr = JSON.stringify(item.pattern);
                const pool = currentPools[patternStr] || 0.0;
                const RETURN_RATE = 0.90;
                const addedCarryover = currentCarryoverPool * 0.90;
                
                let oddsVal = 0.0;
                if (currentTotalBets > 0 && pool > 0) {
                    oddsVal = ((currentTotalBets * RETURN_RATE) + addedCarryover) / pool;
                } else {
                    if (item.bet_type === 'two_teams') {
                        oddsVal = addedCarryover > 0 ? ((100.0 * RETURN_RATE) + addedCarryover) / 100.0 : 1.8;
                    } else {
                        oddsVal = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                    }
                }
                oddsVal = Math.max(1.0, oddsVal);
                const roundedOdds = Math.round(oddsVal * 10) / 10;
                const expectedPayout = Math.floor(item.amount * roundedOdds);

                const displayOdds = isOddsHidden ? "非表示" : (roundedOdds < 1.0 ? '-' : `${roundedOdds.toFixed(1)}x`);
                const displayPayout = isOddsHidden ? "非表示" : (roundedOdds < 1.0 ? '-' : `${expectedPayout.toLocaleString()} G`);

                return `<tr class="cart-item-row">
                    <td class="neon-text" style="font-weight:bold; font-size:1.15rem;">${item.display_pattern}</td>
                    <td>${betTypeNames[item.bet_type]}</td>
                    <td>${item.display_pattern}</td>
                    <td>${item.amount.toLocaleString()} G</td>
                    <td style="color:var(--warning); font-weight:bold;">${displayOdds}</td>
                    <td style="color:var(--success); font-weight:bold;">${displayPayout}</td>
                    <td>
                        <button type="button" class="glass-btn danger btn-delete-cart" data-idx="${idx}" style="padding:0.4rem 0.8rem; font-size:0.8rem;">削除</button>
                    </td>
                </tr>`;
            }).join('');

            document.querySelectorAll('.btn-delete-cart').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-idx'));
                    votingCart.splice(idx, 1);
                    renderCartItems();
                });
            });
        }

        // 投票確定（送信）
        const btnSubmitCart = document.getElementById('btn-submit-cart');
        if (btnSubmitCart) {
            btnSubmitCart.addEventListener('click', () => {
                if (votingCart.length === 0) return;
                if (isRaceLocked) {
                    showToast('このレースは投票を締め切りました', true);
                    return;
                }

                const raceNum = parseInt(voterRaceNumberSelect.value);
                const totalCost = votingCart.reduce((sum, item) => sum + item.amount, 0);

                if (currentVoter.balance < totalCost) {
                    showToast(`残高が不足しています (必要: ${totalCost} G, 所持: ${currentVoter.balance} G)`, true);
                    return;
                }

                if (!confirm(`合計 ${totalCost.toLocaleString()} G の投票を送信します。よ里しいですか？`)) {
                    return;
                }

                // 残高の引き落とし
                const newBalance = currentVoter.balance - totalCost;
                
                // 投票をFirebaseに送信
                const votesRef = db.ref('votes');
                const updates = {};
                
                votingCart.forEach(item => {
                    // 各投票データの作成
                    const newVoteKey = votesRef.push().key;

                    // オッズの算出
                    const patternStr = JSON.stringify(item.pattern);
                    const pool = currentPools[patternStr] || 0.0;
                    const RETURN_RATE = 0.90;
                    const addedCarryover = currentCarryoverPool * 0.90;
                    
                    let oddsVal = 0.0;
                    if (currentTotalBets > 0 && pool > 0) {
                        oddsVal = ((currentTotalBets * RETURN_RATE) + addedCarryover) / pool;
                    } else {
                        if (item.bet_type === 'two_teams') {
                            oddsVal = addedCarryover > 0 ? ((100.0 * RETURN_RATE) + addedCarryover) / 100.0 : 1.8;
                        } else {
                            oddsVal = ((100.0 * RETURN_RATE) + addedCarryover) / 100.0;
                        }
                    }
                    const roundedOdds = Math.round(oddsVal * 10) / 10;

                    updates[`votes/${newVoteKey}`] = {
                        voter_name: currentVoter.name,
                        race_number: raceNum,
                        bet_type: item.bet_type,
                        pattern: item.pattern,
                        display_pattern: item.display_pattern,
                        amount: item.amount,
                        odds: roundedOdds,
                        is_resolved: false,
                        is_hit: false,
                        payout: 0
                    };
                });

                // 残高更新
                const voterUid = currentVoter.id;
                updates[`voters/${voterUid}/balance`] = newBalance;

                db.ref().update(updates, err => {
                    if (err) {
                        showToast('投票の送信に失敗しました', true);
                    } else {
                        showToast('投票を送信しました！');
                        votingCart = [];
                        
                        // 画面リフレッシュ
                        fetchActiveRace();
                        fetchMyVotes();
                        renderCartItems();
                    }
                });
            });
        }

        // === Voter: My Bets list ===
        function fetchMyVotes() {
            if (!myVotesTableBody || !currentVoter) return;
            const raceNum = parseInt(voterRaceNumberSelect.value);

            db.ref('votes').on('value', snapshot => {
                const data = snapshot.val() || {};
                const myVotes = Object.keys(data)
                    .map(k => data[k])
                    .filter(v => v.voter_name === currentVoter.name && v.race_number === raceNum && !v.is_resolved);

                myVotesTableBody.innerHTML = myVotes.map(v => {
                    const expectedPayout = Math.floor(v.amount * v.odds);
                    const displayOdds = isOddsHidden ? "非表示" : (v.odds < 1.0 ? '-' : `${v.odds.toFixed(1)}x`);
                    const displayPayout = isOddsHidden ? "非表示" : `${expectedPayout.toLocaleString()} G`;
                    
                    return `<tr>
                        <td class="neon-text" style="font-weight:bold;">${v.display_pattern}</td>
                        <td>${betTypeNames[v.bet_type]}</td>
                        <td>${v.amount.toLocaleString()} G</td>
                        <td style="color:var(--warning); font-weight:bold;">${displayOdds}</td>
                        <td style="color:var(--success); font-weight:bold;">${displayPayout}</td>
                    </tr>`;
                }).join('');
            });
        }

        // === Stats View: Overall History (Firebase) ===
        function loadStats() {
            if (!statsTableBody) return;
            
            db.ref('/').once('value', snapshot => {
                const data = snapshot.val() || {};
                const dbVoters = data.voters || {};
                const dbVotes = data.votes || {};

                const votersList = Object.keys(dbVoters).map(k => dbVoters[k]);

                statsTableBody.innerHTML = votersList.map(v => {
                    // このユーザーのすべての確定済みの投票を算出
                    const resolvedVotes = [];
                    Object.keys(dbVotes).forEach(vid => {
                        const vote = dbVotes[vid];
                        if (vote.voter_name === v.name && vote.is_resolved) {
                            resolvedVotes.push(vote);
                        }
                    });

                    const totalBetsCount = resolvedVotes.length;
                    const hitBetsCount = resolvedVotes.filter(x => x.is_hit).length;
                    const hitRate = totalBetsCount > 0 ? (hitBetsCount / totalBetsCount * 100) : 0.0;
                    
                    let totalSpent = 0;
                    let totalPayout = 0;
                    resolvedVotes.forEach(x => {
                        totalSpent += x.amount;
                        totalPayout += x.payout;
                    });
                    
                    const totalProfit = totalPayout - totalSpent;
                    const profitClass = totalProfit >= 0 ? 'text-success' : 'text-danger';
                    const profitSign = totalProfit >= 0 ? '+' : '';

                    return `<tr>
                        <td style="font-size:1.15rem; font-weight:bold;">${v.name}</td>
                        <td>${(v.balance || 0).toLocaleString()} G</td>
                        <td>${totalBetsCount} 回</td>
                        <td style="color:var(--warning); font-weight:bold;">${hitRate.toFixed(1)}%</td>
                        <td>${totalSpent.toLocaleString()} G</td>
                        <td>${totalPayout.toLocaleString()} G</td>
                        <td style="font-weight:bold;" class="${profitClass}">
                            <span style="color:${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${profitSign}${totalProfit.toLocaleString()} G</span>
                        </td>
                    </tr>`;
                }).join('');
            });
        }

    } catch (globalErr) {
        console.error("App Initialization Error:", globalErr);
    }
}

// === グローバル関数：キャリーオーバープールのリセット ===
function resetCarryoverPool() {
    if (!confirm('キャリーオーバーのプール金額を 0 にリセットしますか？\nこの操作は元に戻せません。')) return;
    const db = window.db;
    if (!db) {
        alert('データベースに接続されていません');
        return;
    }
    db.ref('settings/carryover_pool').set(0, (err) => {
        const toastEl = document.getElementById('toast');
        if (toastEl) {
            toastEl.textContent = err ? 'リセットに失敗しました' : 'キャリーオーバーをリセットしました';
            toastEl.style.background = err ? 'rgba(220,53,69,0.95)' : 'rgba(25,135,84,0.95)';
            toastEl.classList.add('show');
            setTimeout(() => toastEl.classList.remove('show'), 3000);
        }
    });
}

// ページのDOMロード完了時に初期化を実行
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
