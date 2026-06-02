from flask import Flask, render_template, request, jsonify
import database
import math
import itertools
import time
import json

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # 開発中はキャッシュ無効化


# Initialize DB on startup
with app.app_context():
    database.init_db()

@app.route('/')
def index():
    return render_template('index.html', v=int(time.time()))

@app.route('/board')
def board():
    return render_template('board.html')

# --- Admin Auth ---
@app.route('/api/auth', methods=['POST'])
def auth():
    data = request.json
    if data.get('password') == database.get_admin_password():
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid password'}), 401

@app.route('/api/admin/password', methods=['POST'])
def change_password():
    data = request.json
    new_password = data.get('password')
    if not new_password:
        return jsonify({'error': 'Password is required'}), 400
    database.set_admin_password(new_password)
    return jsonify({'success': True})

# --- Players ---
@app.route('/api/players', methods=['GET'])
def get_players():
    players = database.get_players()
    return jsonify({'players': players})

@app.route('/api/players', methods=['POST'])
def add_player():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    success = database.add_player(name)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Player already exists'}), 409

@app.route('/api/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    success = database.delete_player(player_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to delete player'}), 500

@app.route('/api/players/<int:player_id>/stats', methods=['DELETE'])
def clear_player_stats(player_id):
    database.clear_manual_stats_log(player_id)
    return jsonify({'success': True})

@app.route('/api/players/<int:player_id>/stats/log', methods=['GET'])
def get_player_stats_log(player_id):
    log = database.get_player_manual_stats_log(player_id)
    return jsonify({'log': log})

@app.route('/api/players/<int:player_id>/stats/log', methods=['POST'])
def add_player_stats_log_entry(player_id):
    data = request.json
    p1 = int(data.get('first_places', 0))
    p2 = int(data.get('second_places', 0))
    p3 = int(data.get('third_places', 0))
    p4 = int(data.get('fourth_places', 0))
    p5 = int(data.get('fifth_places', 0))
    p6 = int(data.get('sixth_places', 0))
    unplaced = int(data.get('unplaced', 0))
    races_played = int(data.get('races_played', 0))
    total_points = int(data.get('total_points', 0))
    
    database.add_manual_stats_log_entry(
        player_id, p1, p2, p3, p4, p5, p6, unplaced, races_played, total_points
    )
    return jsonify({'success': True})

@app.route('/api/players/<int:player_id>/stats/overwrite', methods=['POST'])
def overwrite_player_stats(player_id):
    data = request.json
    p1 = int(data.get('first_places', 0))
    p2 = int(data.get('second_places', 0))
    p3 = int(data.get('third_places', 0))
    p4 = int(data.get('fourth_places', 0))
    p5 = int(data.get('fifth_places', 0))
    p6 = int(data.get('sixth_places', 0))
    unplaced = int(data.get('unplaced', 0))
    races_played = int(data.get('races_played', 0))
    total_points = int(data.get('total_points', 0))
    
    database.clear_manual_stats_log(player_id)
    database.add_manual_stats_log_entry(
        player_id, p1, p2, p3, p4, p5, p6, unplaced, races_played, total_points
    )
    return jsonify({'success': True})

@app.route('/api/players/<int:player_id>/stats/log/<int:log_id>', methods=['DELETE'])
def delete_player_stats_log_entry(player_id, log_id):
    database.delete_manual_stats_log_entry(player_id, log_id)
    return jsonify({'success': True})

# --- Voters ---
@app.route('/api/voters', methods=['GET'])
def get_voters():
    voters = database.get_voters()
    return jsonify({'voters': voters})

@app.route('/api/voters', methods=['POST'])
def add_voter():
    data = request.json
    name = data.get('name')
    password = data.get('password')
    if not name or not password:
        return jsonify({'error': 'Name and password required'}), 400
    success = database.add_voter(name, password)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Voter name already exists'}), 409

@app.route('/api/voters/<int:voter_id>', methods=['DELETE'])
def delete_voter(voter_id):
    success = database.delete_voter(voter_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to delete voter'}), 500

@app.route('/api/voter/auth', methods=['POST'])
def voter_auth():
    data = request.json
    name = data.get('name')
    password = data.get('password')
    voter = database.verify_voter(name, password)
    if voter:
        return jsonify({'success': True, 'voter': voter})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/voter/votes', methods=['GET'])
def get_voter_votes():
    voter_id = request.args.get('voter_id', type=int)
    if not voter_id:
        return jsonify({'error': 'voter_id required'}), 400
    votes = database.get_votes_by_voter(voter_id)
    update_active_votes_odds(votes)
    return jsonify({'votes': votes})

# --- Odds Calculation (Dynamic Pari-Mutuel) ---
def calculate_dynamic_odds(race_id, selected_player_ids, allowed_bet_type):
    stats = database.get_stats()
    player_stats = {s['id']: s for s in stats if s['id'] in selected_player_ids}
    
    if len(player_stats) != len(selected_player_ids):
        return None
        
    RETURN_RATE = 0.90
    carryover_pool = database.get_carryover_pool()
    added_carryover = carryover_pool * 0.90
    
    # 1. Initialize empty real pools
    real_pools = {}
    if allowed_bet_type == 'win':
        for pid in selected_player_ids:
            real_pools[json.dumps([pid], separators=(',', ':'))] = 0.0
    elif allowed_bet_type == 'two_teams':
        for team_val in [1, 2]:
            real_pools[json.dumps([team_val], separators=(',', ':'))] = 0.0
    elif allowed_bet_type == 'exacta':
        for i, j in itertools.permutations(selected_player_ids, 2):
            real_pools[json.dumps([i, j], separators=(',', ':'))] = 0.0
    elif allowed_bet_type == 'trifecta':
        for i, j, k in itertools.permutations(selected_player_ids, 3):
            real_pools[json.dumps([i, j, k], separators=(',', ':'))] = 0.0
            
    # 2. Add real bets
    votes = database.get_votes_for_race(race_id)
    total_real_bets = 0.0
    
    for v in votes:
        if v['bet_type'] == allowed_bet_type:
            pattern_str = json.dumps(v['pattern'], separators=(',', ':'))
            if pattern_str in real_pools:
                real_pools[pattern_str] += v['amount']
                total_real_bets += v['amount']
                
    # 3. Calculate dynamic odds (Pure Pari-Mutuel)
    odds_result = {allowed_bet_type: []}
    boat_map = {pid: idx + 1 for idx, pid in enumerate(selected_player_ids)}
    
    if allowed_bet_type == 'win':
        for pid in selected_player_ids:
            p_str = json.dumps([pid], separators=(',', ':'))
            o = 0.0
            if total_real_bets > 0:
                if real_pools[p_str] > 0:
                    o = ((total_real_bets * RETURN_RATE) + added_carryover) / real_pools[p_str]
                else:
                    o = (((total_real_bets + 100.0) * RETURN_RATE) + added_carryover) / 100.0
            else:
                o = ((100.0 * RETURN_RATE) + added_carryover) / 100.0
            odds_result['win'].append({
                'player_id': pid,
                'name': player_stats[pid]['name'],
                'boat_pattern': [boat_map[pid]],
                'odds': o
            })
        odds_result['win'].sort(key=lambda x: x['boat_pattern'][0])
        
    elif allowed_bet_type == 'two_teams':
        for team_val in [1, 2]:
            p_str = json.dumps([team_val], separators=(',', ':'))
            o = 0.0
            if total_real_bets > 0:
                if real_pools[p_str] > 0:
                    o = ((total_real_bets * RETURN_RATE) + added_carryover) / real_pools[p_str]
                else:
                    o = (((total_real_bets + 100.0) * RETURN_RATE) + added_carryover) / 100.0
            else:
                if added_carryover > 0:
                    o = ((100.0 * RETURN_RATE) + added_carryover) / 100.0
                else:
                    o = 1.8
            odds_result['two_teams'].append({
                'pattern': [team_val],
                'team_name': '赤チーム' if team_val == 1 else '青チーム',
                'odds': o
            })
            
    elif allowed_bet_type == 'exacta':
        for i, j in itertools.permutations(selected_player_ids, 2):
            p_str = json.dumps([i, j], separators=(',', ':'))
            o = 0.0
            if total_real_bets > 0:
                if real_pools[p_str] > 0:
                    o = ((total_real_bets * RETURN_RATE) + added_carryover) / real_pools[p_str]
                else:
                    o = (((total_real_bets + 100.0) * RETURN_RATE) + added_carryover) / 100.0
            else:
                o = ((100.0 * RETURN_RATE) + added_carryover) / 100.0
            odds_result['exacta'].append({
                'pattern': [i, j],
                'pattern_names': [player_stats[i]['name'], player_stats[j]['name']],
                'boat_pattern': [boat_map[i], boat_map[j]],
                'odds': o
            })
        odds_result['exacta'].sort(key=lambda x: (x['boat_pattern'][0], x['boat_pattern'][1]))
        
    elif allowed_bet_type == 'trifecta':
        for i, j, k in itertools.permutations(selected_player_ids, 3):
            p_str = json.dumps([i, j, k], separators=(',', ':'))
            o = 0.0
            if total_real_bets > 0:
                if real_pools[p_str] > 0:
                    o = ((total_real_bets * RETURN_RATE) + added_carryover) / real_pools[p_str]
                else:
                    o = (((total_real_bets + 100.0) * RETURN_RATE) + added_carryover) / 100.0
            else:
                o = ((100.0 * RETURN_RATE) + added_carryover) / 100.0
            odds_result['trifecta'].append({
                'pattern': [i, j, k],
                'pattern_names': [player_stats[i]['name'], player_stats[j]['name'], player_stats[k]['name']],
                'boat_pattern': [boat_map[i], boat_map[j], boat_map[k]],
                'odds': o
            })
        odds_result['trifecta'].sort(key=lambda x: (x['boat_pattern'][0], x['boat_pattern'][1], x['boat_pattern'][2]))
        
    return {
        'odds': odds_result,
        'pools': real_pools,
        'total_bets': total_real_bets
    }

def update_active_votes_odds(votes):
    carryover_pool = database.get_carryover_pool()
    added_carryover = carryover_pool * 0.90
    for v in votes:
        if not v.get('is_resolved', False):
            race_id = v['race_id']
            race_number = v.get('race_number')
            if not race_number:
                conn = database.get_connection()
                c = conn.cursor()
                c.execute('SELECT race_number FROM races WHERE id = ?', (race_id,))
                row = c.fetchone()
                conn.close()
                if row:
                    race_number = row['race_number']
            
            if race_number:
                active_race = database.get_active_race(race_number)
                if active_race:
                    odds_data = calculate_dynamic_odds(race_id, active_race['player_ids'], active_race['allowed_bet_type'])
                    if odds_data:
                        pools = odds_data['pools']
                        total_bets = odds_data['total_bets']
                        pattern_str = json.dumps(v['pattern'], separators=(',', ':'))
                        pool = pools.get(pattern_str, 0.0)
                        if total_bets > 0 and pool > 0:
                            v['odds'] = ((total_bets * 0.90) + added_carryover) / pool
                        else:
                            v['odds'] = (90.0 + added_carryover) / 100.0

# --- Races & Voting ---
@app.route('/api/races/active', methods=['POST'])
def start_active_race():
    data = request.json
    race_number = data.get('race_number', 1)
    player_ids = data.get('player_ids', [])
    allowed_bet_type = data.get('allowed_bet_type', 'win')
    teams = data.get('teams', {})
    
    if len(player_ids) < 3:
        return jsonify({'error': 'At least 3 players required'}), 400
        
    race_id = database.set_active_race(race_number, player_ids, {}, allowed_bet_type, teams)
    odds_data = calculate_dynamic_odds(race_id, player_ids, allowed_bet_type)
    
    if not odds_data:
        return jsonify({'error': 'Invalid player IDs'}), 400
        
    return jsonify({
        'success': True,
        'race_id': race_id,
        'odds': odds_data['odds'][allowed_bet_type],
        'allowed_bet_type': allowed_bet_type,
        'carryover_pool': database.get_carryover_pool()
    })

@app.route('/api/races/active', methods=['DELETE'])
def delete_active_race():
    race_number = request.args.get('race_number', 1, type=int)
    database.clear_active_race(race_number)
    return jsonify({'success': True})

@app.route('/api/races/active', methods=['GET'])
def get_active_race():
    race_number = request.args.get('race_number', 1, type=int)
    active_race = database.get_active_race(race_number)
    if active_race:
        race_id = active_race['race_id']
        player_ids = active_race['player_ids']
        allowed_bet_type = active_race.get('allowed_bet_type', 'win')
        
        players = database.get_players()
        p_dict = {p['id']: p for p in players}
        active_players = [p_dict[pid] for pid in player_ids if pid in p_dict]
        
        odds_data = calculate_dynamic_odds(race_id, player_ids, allowed_bet_type)
        
        return jsonify({
            'active': True,
            'race_id': race_id,
            'race_number': race_number,
            'players': active_players,
            'odds': odds_data['odds'] if odds_data else None,
            'pools': odds_data['pools'] if odds_data else {},
            'total_bets': odds_data['total_bets'] if odds_data else 0.0,
            'allowed_bet_type': allowed_bet_type,
            'is_locked': active_race.get('is_locked', False),
            'hide_odds': database.get_hide_voter_odds(),
            'carryover_pool': database.get_carryover_pool()
        })
    return jsonify({'active': False, 'carryover_pool': database.get_carryover_pool()})

@app.route('/api/races/active_all', methods=['GET'])
def get_all_active_races():
    races_data = {}
    players = database.get_players()
    p_dict = {p['id']: p for p in players}
    
    for r in range(1, 11):
        active_race = database.get_active_race(r)
        if active_race:
            race_id = active_race['race_id']
            player_ids = active_race['player_ids']
            allowed_bet_type = active_race.get('allowed_bet_type', 'win')
            active_players = [p_dict[pid] for pid in player_ids if pid in p_dict]
            odds_data = calculate_dynamic_odds(race_id, player_ids, allowed_bet_type)
            
            races_data[str(r)] = {
                'active': True,
                'race_id': race_id,
                'race_number': r,
                'players': active_players,
                'odds': odds_data['odds'] if odds_data else None,
                'pools': odds_data['pools'] if odds_data else {},
                'total_bets': odds_data['total_bets'] if odds_data else 0.0,
                'allowed_bet_type': allowed_bet_type,
                'is_locked': active_race.get('is_locked', False),
                'carryover_pool': database.get_carryover_pool()
            }
        else:
            races_data[str(r)] = {'active': False}
            
    return jsonify({'races': races_data})

@app.route('/api/admin/carryover', methods=['POST'])
def set_carryover():
    data = request.json or {}
    amount = float(data.get('amount', 0.0))
    database.set_carryover_pool(amount)
    return jsonify({'success': True, 'carryover_pool': amount})

@app.route('/api/races/lock', methods=['POST'])
def lock_active_race():
    data = request.json or {}
    race_number = data.get('race_number', 1)
    success = database.lock_active_race(race_number)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'No active race'}), 400

@app.route('/api/votes', methods=['POST'])
def submit_vote():
    data = request.json
    race_number = data.get('race_number', 1)
    voter_id = data.get('voter_id')
    bet_type = data.get('bet_type')
    pattern = data.get('pattern')
    display_pattern = data.get('display_pattern', '-'.join(map(str, pattern)) if pattern else '')
    amount = data.get('amount')
    
    if not voter_id or not bet_type or not pattern or not amount:
        return jsonify({'error': 'Missing vote data'}), 400
        
    active_race = database.get_active_race(race_number)
    if not active_race:
        return jsonify({'error': f'No active {race_number}R to vote on'}), 400
        
    if active_race.get('is_locked'):
        return jsonify({'error': 'Race is locked, voting is closed'}), 400
        
    if active_race.get('allowed_bet_type') != bet_type:
        return jsonify({'error': 'Bet type not allowed for this race'}), 400
        
    race_id = active_race['race_id']
    pattern_list = list(pattern)
    
    # Insert vote first to include it in the pari-mutuel pool calculations!
    vote_id = database.submit_vote(race_id, voter_id, bet_type, pattern_list, display_pattern, amount, 0.0)
    
    # Now compute dynamic odds INCLUDING this vote
    odds_data = calculate_dynamic_odds(race_id, active_race['player_ids'], active_race['allowed_bet_type'])
    odds_dict = odds_data['odds'] if odds_data else None
    
    found_pattern = False
    target_odds = 0.0
    if bet_type == 'win':
        for o in odds_dict['win']:
            if o['player_id'] == pattern_list[0]:
                target_odds = o['odds']
                found_pattern = True
                break
    elif bet_type == 'two_teams':
        for o in odds_dict['two_teams']:
            if o['pattern'] == pattern_list:
                target_odds = o['odds']
                found_pattern = True
                break
    elif bet_type == 'exacta':
        for o in odds_dict['exacta']:
            if o['pattern'] == pattern_list:
                target_odds = o['odds']
                found_pattern = True
                break
    elif bet_type == 'trifecta':
        for o in odds_dict['trifecta']:
            if o['pattern'] == pattern_list:
                target_odds = o['odds']
                found_pattern = True
                break
                
    if not found_pattern:
        # Rollback/delete the vote if pattern is invalid
        database.delete_vote(vote_id, voter_id)
        return jsonify({'error': 'Invalid bet pattern'}), 400
        
    # Update the vote with the accurate post-vote odds!
    database.update_vote_odds(vote_id, target_odds)
    return jsonify({'success': True})

@app.route('/api/votes/<int:vote_id>', methods=['DELETE'])
def delete_vote(vote_id):
    voter_id = request.args.get('voter_id', type=int)
    race_number = request.args.get('race_number', 1, type=int)
    if not voter_id:
        return jsonify({'error': 'voter_id required'}), 400
        
    active_race = database.get_active_race(race_number)
    if active_race and active_race.get('is_locked'):
        return jsonify({'error': 'Race is locked, cannot delete vote'}), 400
        
    success = database.delete_vote(vote_id, voter_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to delete vote or not found'}), 404

@app.route('/api/races', methods=['POST'])
def save_race():
    data = request.json
    race_number = data.get('race_number', 1)
    results = data.get('results')
    if not results:
        return jsonify({'error': 'Results are required'}), 400
        
    active_race = database.get_active_race(race_number)
    if not active_race:
        return jsonify({'error': f'No active {race_number}R to save'}), 400
        
    race_id = active_race['race_id']
    player_ids = active_race['player_ids']
    allowed_bet_type = active_race.get('allowed_bet_type', 'win')
    
    for index, player_id in enumerate(results):
        position = index + 1
        database.add_race_result(race_id, player_id, position)
        
    # Calculate FINAL dynamic odds for payouts
    odds_data = calculate_dynamic_odds(race_id, player_ids, allowed_bet_type)
    final_odds = odds_data['odds'] if odds_data else None
    
    database.resolve_votes(race_id, results, final_odds, player_ids)
    database.archive_active_race(race_number)
        
    return jsonify({'success': True, 'race_id': race_id})

@app.route('/api/admin/commission_log', methods=['GET'])
def get_commission_log_endpoint():
    log = database.get_commission_log()
    return jsonify({'log': log})

@app.route('/api/admin/voters_bets', methods=['GET'])
def get_voters_bets_endpoint():
    voters = database.get_voters()
    result = []
    for v in voters:
        votes = database.get_votes_by_voter(v['id'])
        update_active_votes_odds(votes)
        total_amount = sum(vote['amount'] for vote in votes)
        result.append({
            'voter_id': v['id'],
            'voter_name': v['name'],
            'total_amount': total_amount,
            'votes': votes
        })
    return jsonify({'voters_bets': result})

@app.route('/api/settings/reveal_bets', methods=['GET'])
def get_reveal_bets():
    return jsonify({'reveal': database.get_reveal_bets_setting()})

@app.route('/api/admin/settings/reveal_bets', methods=['POST'])
def set_reveal_bets():
    data = request.json or {}
    reveal = data.get('reveal', False)
    database.set_reveal_bets_setting(reveal)
    return jsonify({'success': True, 'reveal': reveal})

@app.route('/api/admin/races/completed', methods=['GET'])
def get_completed_races():
    races = database.get_all_completed_race_results()
    formatted_races = []
    for r in races:
        winner_player = next((p for p in r['results'] if p['position'] == 1), None)
        winning_voters = []
        bet_type = r['bet_type']
        
        first_place = next((p['player_id'] for p in r['results'] if p['position'] == 1), None)
        second_place = next((p['player_id'] for p in r['results'] if p['position'] == 2), None)
        third_place = next((p['player_id'] for p in r['results'] if p['position'] == 3), None)
        
        for v in r['votes']:
            is_hit = False
            pattern = v['pattern']
            
            if bet_type == 'win':
                is_hit = (pattern[0] == first_place)
            elif bet_type == 'two_teams':
                winner_idx = next((idx for idx, p in enumerate(r['results']) if p['player_id'] == first_place), 0)
                winner_lane = winner_idx + 1
                winner_team = 1 if winner_lane in [1, 3, 5] else 2
                is_hit = (pattern[0] == winner_team)
            elif bet_type == 'exacta':
                is_hit = (len(pattern) >= 2 and pattern[0] == first_place and pattern[1] == second_place)
            elif bet_type == 'trifecta':
                is_hit = (len(pattern) >= 3 and pattern[0] == first_place and pattern[1] == second_place and pattern[2] == third_place)
                
            if is_hit:
                winning_voters.append({
                    'voter_name': v['voter_name'],
                    'display_pattern': v['display_pattern'],
                    'amount': v['amount'],
                    'odds': v['odds'],
                    'payout': v['payout']
                })
                
        formatted_races.append({
            'race_number': r['race_number'],
            'bet_type': bet_type,
            'results': r['results'],
            'winning_voters': winning_voters
        })
    return jsonify({'races': formatted_races})

@app.route('/api/settings/hide_odds', methods=['GET'])
def get_hide_odds():
    return jsonify({'hide': database.get_hide_voter_odds()})

@app.route('/api/admin/settings/hide_odds', methods=['POST'])
def set_hide_odds():
    data = request.json or {}
    hide = data.get('hide', False)
    database.set_hide_voter_odds(hide)
    return jsonify({'success': True, 'hide': hide})

@app.route('/api/board/bets', methods=['GET'])
def get_board_bets():
    reveal = database.get_reveal_bets_setting()
    voters = database.get_voters()
    
    # Find active race numbers
    active_races = []
    for r in range(1, 11):
        active = database.get_active_race(r)
        if active:
            active_races.append(r)
            
    board_data = []
    for v in voters:
        v_votes = database.get_votes_by_voter(v['id'])
        # Only active race votes
        active_votes = [vote for vote in v_votes if vote['race_number'] in active_races]
        
        formatted_votes = []
        for vote in active_votes:
            if reveal:
                formatted_votes.append({
                    'race_number': vote['race_number'],
                    'bet_type': vote['bet_type'],
                    'display_pattern': vote['display_pattern'],
                    'amount': vote['amount'],
                    'odds': vote['odds'],
                    'is_resolved': vote['is_resolved']
                })
            else:
                formatted_votes.append({
                    'race_number': vote['race_number'],
                    'bet_type': vote['bet_type'],
                    'display_pattern': '*** (非表示中)',
                    'amount': '***',
                    'odds': 0,
                    'is_resolved': vote['is_resolved']
                })
                
        board_data.append({
            'voter_name': v['name'],
            'has_voted': len(active_votes) > 0,
            'votes': formatted_votes
        })
        
    latest_resolved = database.get_latest_resolved_race_hits()
        
    return jsonify({
        'reveal': reveal,
        'active_races': active_races,
        'board_data': board_data,
        'latest_resolved': latest_resolved
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    stats = database.get_stats()
    return jsonify({'stats': stats})

@app.route('/api/races/results', methods=['GET'])
def get_race_results_endpoint():
    race_number = request.args.get('race_number', type=int)
    if not race_number:
        return jsonify({'error': 'race_number is required'}), 400
    res = database.get_race_results(race_number)
    if not res:
        return jsonify({'completed': False})
    
    # Filter winning voters and their payouts
    winning_voters = []
    for vote in res['votes']:
        if vote['is_resolved'] and vote['is_hit']:
            winning_voters.append({
                'voter_name': vote['voter_name'],
                'display_pattern': vote['display_pattern'],
                'amount': vote['amount'],
                'odds': vote['odds'],
                'payout': vote['payout']
            })
            
    return jsonify({
        'completed': True,
        'race_number': res['race_number'],
        'bet_type': res['bet_type'],
        'results': res['results'],
        'winning_voters': winning_voters,
        'votes': res['votes']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5001)
