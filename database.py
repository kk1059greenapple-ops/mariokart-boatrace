import sqlite3
import os
import json

DB_PATH = 'mariokart.db'

def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS races (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_number INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Try altering existing table in case it was created without race_number
    try:
        c.execute('ALTER TABLE races ADD COLUMN race_number INTEGER')
        conn.commit()
    except sqlite3.OperationalError:
        pass

    try:
        c.execute('ALTER TABLE races ADD COLUMN carryover_applied REAL DEFAULT 0.0')
        conn.commit()
    except sqlite3.OperationalError:
        pass

    try:
        c.execute('ALTER TABLE races ADD COLUMN carryover_generated REAL DEFAULT 0.0')
        conn.commit()
    except sqlite3.OperationalError:
        pass

    # Try altering players table to add manual baseline stats
    cols = [
        ('races_played_manual', 'INTEGER DEFAULT 0'),
        ('total_points_manual', 'INTEGER DEFAULT 0'),
        ('first_places_manual', 'INTEGER DEFAULT 0'),
        ('second_places_manual', 'INTEGER DEFAULT 0'),
        ('third_places_manual', 'INTEGER DEFAULT 0'),
        ('fourth_places_manual', 'INTEGER DEFAULT 0'),
        ('fifth_places_manual', 'INTEGER DEFAULT 0'),
        ('sixth_places_manual', 'INTEGER DEFAULT 0'),
        ('unplaced_manual', 'INTEGER DEFAULT 0')
    ]
    for col_name, col_type in cols:
        try:
            c.execute(f'ALTER TABLE players ADD COLUMN {col_name} {col_type}')
            conn.commit()
        except sqlite3.OperationalError:
            pass

    c.execute('''
        CREATE TABLE IF NOT EXISTS race_results (
            race_id INTEGER,
            player_id INTEGER,
            position INTEGER,
            points INTEGER,
            FOREIGN KEY(race_id) REFERENCES races(id),
            FOREIGN KEY(player_id) REFERENCES players(id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS manual_stats_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER,
            first_places INTEGER DEFAULT 0,
            second_places INTEGER DEFAULT 0,
            third_places INTEGER DEFAULT 0,
            fourth_places INTEGER DEFAULT 0,
            fifth_places INTEGER DEFAULT 0,
            sixth_places INTEGER DEFAULT 0,
            unplaced INTEGER DEFAULT 0,
            races_played INTEGER DEFAULT 0,
            total_points INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(player_id) REFERENCES players(id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER,
            voter_id INTEGER,
            bet_type TEXT,
            pattern TEXT,
            display_pattern TEXT,
            amount INTEGER,
            odds REAL,
            is_resolved INTEGER DEFAULT 0,
            is_hit INTEGER DEFAULT 0,
            payout INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(race_id) REFERENCES races(id),
            FOREIGN KEY(voter_id) REFERENCES voters(id)
        )
    ''')
    c.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ('admin_password', 'admin'))
    conn.commit()
    conn.close()

# --- Players ---

def get_players():
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM players ORDER BY created_at DESC')
    players = [dict(row) for row in c.fetchall()]
    conn.close()
    return players

def add_player(name):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO players (name) VALUES (?)', (name,))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    conn.close()
    return success

def delete_player(player_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM race_results WHERE player_id = ?', (player_id,))
    c.execute('DELETE FROM players WHERE id = ?', (player_id,))
    conn.commit()
    conn.close()
    return True

# --- Admin ---

def get_admin_password():
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT value FROM settings WHERE key = ?', ('admin_password',))
    row = c.fetchone()
    conn.close()
    return row['value'] if row else 'admin'

def set_admin_password(new_password):
    conn = get_connection()
    c = conn.cursor()
    c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('admin_password', new_password))
    conn.commit()
    conn.close()

# --- Voters ---

def get_voters():
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT id, name, password FROM voters ORDER BY created_at DESC')
    voters = [dict(row) for row in c.fetchall()]
    conn.close()
    return voters

def add_voter(name, password):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO voters (name, password) VALUES (?, ?)', (name, password))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    conn.close()
    return success

def delete_voter(voter_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM votes WHERE voter_id = ?', (voter_id,))
    c.execute('DELETE FROM voters WHERE id = ?', (voter_id,))
    conn.commit()
    conn.close()
    return True

def verify_voter(name, password):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT id, name FROM voters WHERE name = ? AND password = ?', (name, password))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

# --- Active Race & Voting ---

def set_active_race(race_number, player_ids, odds_dict, allowed_bet_type, teams=None):
    conn = get_connection()
    c = conn.cursor()
    c.execute('INSERT INTO races (race_number) VALUES (?)', (race_number,))
    race_id = c.lastrowid
    
    state = {
        'race_id': race_id,
        'race_number': race_number,
        'player_ids': player_ids,
        'odds': odds_dict,
        'allowed_bet_type': allowed_bet_type,
        'is_locked': False,
        'teams': teams or {}
    }
    c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (f'active_race_{race_number}', json.dumps(state)))
    conn.commit()
    conn.close()
    return race_id

def get_active_race(race_number=1):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT value FROM settings WHERE key = ?', (f'active_race_{race_number}',))
    row = c.fetchone()
    conn.close()
    if row and row['value']:
        return json.loads(row['value'])
    return None

def lock_active_race(race_number=1):
    state = get_active_race(race_number)
    if state:
        state['is_locked'] = True
        conn = get_connection()
        c = conn.cursor()
        c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (f'active_race_{race_number}', json.dumps(state)))
        conn.commit()
        conn.close()
        return True
    return False

def clear_active_race(race_number=1):
    conn = get_connection()
    c = conn.cursor()
    
    # 1. Try to get race_id from active state
    state = get_active_race(race_number)
    race_id = None
    if state:
        race_id = state['race_id']
        
    # 2. If not active, find the latest race in races table for this race_number
    if not race_id:
        c.execute('SELECT id FROM races WHERE race_number = ? ORDER BY id DESC LIMIT 1', (race_number,))
        row = c.fetchone()
        if row:
            race_id = row['id']
            
    # 3. Delete everything associated with that race_id
    if race_id:
        c.execute('DELETE FROM votes WHERE race_id = ?', (race_id,))
        c.execute('DELETE FROM races WHERE id = ?', (race_id,))
        c.execute('DELETE FROM race_results WHERE race_id = ?', (race_id,))
        
    c.execute('DELETE FROM settings WHERE key = ?', (f'active_race_{race_number}',))
    conn.commit()
    conn.close()

def archive_active_race(race_number=1):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM settings WHERE key = ?', (f'active_race_{race_number}',))
    conn.commit()
    conn.close()

def submit_vote(race_id, voter_id, bet_type, pattern_list, display_pattern, amount, odds):
    conn = get_connection()
    c = conn.cursor()
    pattern_str = json.dumps(pattern_list)
    c.execute('''
        INSERT INTO votes (race_id, voter_id, bet_type, pattern, display_pattern, amount, odds)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (race_id, voter_id, bet_type, pattern_str, display_pattern, amount, odds))
    vote_id = c.lastrowid
    conn.commit()
    conn.close()
    return vote_id

def update_vote_odds(vote_id, odds):
    conn = get_connection()
    c = conn.cursor()
    c.execute('UPDATE votes SET odds = ? WHERE id = ?', (odds, vote_id))
    conn.commit()
    conn.close()

def delete_vote(vote_id, voter_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM votes WHERE id = ? AND voter_id = ? AND is_resolved = 0', (vote_id, voter_id))
    changes = conn.total_changes
    conn.commit()
    conn.close()
    return changes > 0

def get_votes_by_voter(voter_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT v.*, r.race_number, r.created_at as race_date 
        FROM votes v
        JOIN races r ON v.race_id = r.id
        WHERE v.voter_id = ? 
        ORDER BY v.created_at DESC LIMIT 50
    ''', (voter_id,))
    votes = []
    for row in c.fetchall():
        d = dict(row)
        d['pattern'] = json.loads(d['pattern'])
        votes.append(d)
    conn.close()
    return votes

def get_votes_for_race(race_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM votes WHERE race_id = ?', (race_id,))
    votes = []
    for row in c.fetchall():
        d = dict(row)
        d['pattern'] = json.loads(d['pattern'])
        votes.append(d)
    conn.close()
    return votes

def resolve_votes(race_id, results_list, final_odds_dict, player_ids=None):
    conn = get_connection()
    c = conn.cursor()
    
    # Store the carryover that was applied to this race
    c.execute("SELECT value FROM settings WHERE key = 'carryover_pool'")
    row_co = c.fetchone()
    try:
        applied_carryover = float(row_co['value']) if row_co else 0.0
    except (ValueError, TypeError):
        applied_carryover = 0.0
    c.execute("UPDATE races SET carryover_applied = ? WHERE id = ?", (applied_carryover, race_id))
    
    c.execute('SELECT * FROM votes WHERE race_id = ? AND is_resolved = 0', (race_id,))
    votes = c.fetchall()
    
    for v in votes:
        vid = v['id']
        bet_type = v['bet_type']
        pattern = json.loads(v['pattern'])
        amount = v['amount']
        
        is_hit = False
        if bet_type == 'win' and len(results_list) >= 1:
            if results_list[0] == pattern[0]:
                is_hit = True
        elif bet_type == 'two_teams' and len(results_list) >= 1:
            winner_val = results_list[0]
            if winner_val in [1, 2]:
                if pattern[0] == winner_val:
                    is_hit = True
            elif player_ids and winner_val in player_ids:
                winner_boat_num = player_ids.index(winner_val) + 1
                winner_team = 1 if winner_boat_num % 2 != 0 else 2
                if pattern[0] == winner_team:
                    is_hit = True
        elif bet_type == 'exacta' and len(results_list) >= 2:
            if results_list[0] == pattern[0] and results_list[1] == pattern[1]:
                is_hit = True
        elif bet_type == 'trifecta' and len(results_list) >= 3:
            if results_list[0] == pattern[0] and results_list[1] == pattern[1] and results_list[2] == pattern[2]:
                is_hit = True
                
        target_odds = 0.0
        if bet_type == 'win':
            for o in final_odds_dict['win']:
                if o['player_id'] == pattern[0]:
                    target_odds = o['odds']
                    break
        elif bet_type == 'two_teams':
            for o in final_odds_dict['two_teams']:
                if o['pattern'] == pattern:
                    target_odds = o['odds']
                    break
        elif bet_type == 'exacta':
            for o in final_odds_dict['exacta']:
                if o['pattern'] == pattern:
                    target_odds = o['odds']
                    break
        elif bet_type == 'trifecta':
            for o in final_odds_dict['trifecta']:
                if o['pattern'] == pattern:
                    target_odds = o['odds']
                    break
                    
        rounded_odds = round(target_odds, 1)
        payout = int(amount * rounded_odds) if is_hit else 0
        
        c.execute('''
            UPDATE votes 
            SET is_resolved = 1, is_hit = ?, payout = ?, odds = ?
            WHERE id = ?
        ''', (is_hit, payout, rounded_odds, vid))
        
    # Check if this race had any votes and if there were any hits
    c.execute('SELECT COUNT(*) as cnt FROM votes WHERE race_id = ?', (race_id,))
    total_votes_count = c.fetchone()['cnt']
    
    c.execute('SELECT SUM(payout) as total_payout FROM votes WHERE race_id = ?', (race_id,))
    row_payout = c.fetchone()
    total_payout = row_payout['total_payout'] if row_payout and row_payout['total_payout'] else 0
    
    if total_votes_count > 0:
        if total_payout == 0:
            c.execute('SELECT SUM(amount) as sum_amount FROM votes WHERE race_id = ?', (race_id,))
            total_bets_on_race = c.fetchone()['sum_amount'] or 0.0
            
            c.execute('SELECT value FROM settings WHERE key = ?', ('carryover_pool',))
            row_co = c.fetchone()
            try:
                previous_carryover = float(row_co['value']) if row_co else 0.0
            except (ValueError, TypeError):
                previous_carryover = 0.0
                
            new_carryover = (total_bets_on_race * 0.90) + (previous_carryover * 0.90)
            c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('carryover_pool', str(new_carryover)))
        else:
            c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('carryover_pool', '0.0'))
            
    # Fetch current carryover_pool value and store in races as carryover_generated
    c.execute("SELECT value FROM settings WHERE key = 'carryover_pool'")
    row_co = c.fetchone()
    try:
        current_co = float(row_co['value']) if row_co else 0.0
    except (ValueError, TypeError):
        current_co = 0.0
    c.execute("UPDATE races SET carryover_generated = ? WHERE id = ?", (current_co, race_id))
    
    conn.commit()
    conn.close()

def get_commission_log():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT r.id as race_id, r.race_number, r.created_at, r.carryover_applied, r.carryover_generated,
               COALESCE(SUM(v.amount), 0) as total_bets,
               COALESCE(SUM(v.payout), 0) as total_payout,
               MIN(v.is_resolved) as all_votes_resolved
        FROM races r
        LEFT JOIN votes v ON r.id = v.race_id
        GROUP BY r.id
        ORDER BY r.id ASC
    ''')
    rows = c.fetchall()
    conn.close()
    
    log = []
    for row in rows:
        tb = row['total_bets']
        tp = row['total_payout']
        ca = row['carryover_applied'] or 0.0
        cg = row['carryover_generated'] or 0.0
        
        bets_commission = int(tb * 0.10)
        carryover_commission = int(ca * 0.10)
        total_commission = bets_commission + carryover_commission
        surplus = tb + ca - cg - tp
        
        # If there are no votes at all, it's considered resolved.
        # Otherwise, check if all_votes_resolved is 1 (meaning resolved).
        is_resolved = True if tb == 0 else (row['all_votes_resolved'] == 1)
        
        log.append({
            'race_id': row['race_id'],
            'race_number': row['race_number'],
            'created_at': row['created_at'],
            'total_bets': tb,
            'bets_commission': bets_commission,
            'carryover_applied': ca,
            'carryover_commission': carryover_commission,
            'commission': total_commission,
            'total_payout': tp,
            'surplus': surplus,
            'is_resolved': is_resolved
        })
    return log

def get_reveal_bets_setting():
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT value FROM settings WHERE key = ?', ('reveal_all_bets',))
    row = c.fetchone()
    conn.close()
    return row['value'] == 'true' if row else False

def set_reveal_bets_setting(value):
    val_str = 'true' if value else 'false'
    conn = get_connection()
    c = conn.cursor()
    c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('reveal_all_bets', val_str))
    conn.commit()
    conn.close()

def get_hide_voter_odds():
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT value FROM settings WHERE key = ?', ('hide_voter_odds',))
    row = c.fetchone()
    conn.close()
    return row['value'] == 'true' if row else False

def set_hide_voter_odds(hide):
    conn = get_connection()
    c = conn.cursor()
    val_str = 'true' if hide else 'false'
    c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('hide_voter_odds', val_str))
    conn.commit()
    conn.close()

def get_carryover_pool():
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT value FROM settings WHERE key = ?', ('carryover_pool',))
    row = c.fetchone()
    conn.close()
    try:
        return float(row['value']) if row else 0.0
    except (ValueError, TypeError):
        return 0.0

def set_carryover_pool(amount):
    conn = get_connection()
    c = conn.cursor()
    c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('carryover_pool', str(amount)))
    conn.commit()
    conn.close()

def get_latest_resolved_race_hits():
    conn = get_connection()
    c = conn.cursor()
    # Find the most recently resolved race_id
    c.execute('''
        SELECT MAX(v.race_id) as latest_race_id, r.race_number
        FROM votes v
        JOIN races r ON v.race_id = r.id
        WHERE v.is_resolved = 1
    ''')
    row = c.fetchone()
    if not row or not row['latest_race_id']:
        conn.close()
        return None
        
    race_id = row['latest_race_id']
    race_number = row['race_number']
    
    # Get all hit votes for this race
    c.execute('''
        SELECT v.*, vt.name as voter_name
        FROM votes v
        JOIN voters vt ON v.voter_id = vt.id
        WHERE v.race_id = ? AND v.is_resolved = 1
        ORDER BY v.payout DESC
    ''', (race_id,))
    
    hits = []
    for r in c.fetchall():
        d = dict(r)
        d['pattern'] = json.loads(d['pattern'])
        hits.append(d)
        
    conn.close()
    return {
        'race_number': race_number,
        'hits': hits
    }

# --- Race Results & Stats ---

def add_race_result(race_id, player_id, position):
    points_map = {1:10, 2:8, 3:7, 4:5, 5:4, 6:3}
    points = points_map.get(position, 0)
    
    conn = get_connection()
    c = conn.cursor()
    c.execute('INSERT INTO race_results (race_id, player_id, position, points) VALUES (?, ?, ?, ?)',
              (race_id, player_id, position, points))
    conn.commit()
    conn.close()

def get_stats():
    conn = get_connection()
    c = conn.cursor()
    query = '''
        SELECT 
            p.id, 
            p.name, 
            (COALESCE(COUNT(r.player_id), 0) + p.races_played_manual) as races_played, 
            (COALESCE(SUM(r.points), 0) + p.total_points_manual) as total_points,
            (COALESCE(SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END), 0) + p.first_places_manual) as first_places,
            (COALESCE(SUM(CASE WHEN r.position <= 2 THEN 1 ELSE 0 END), 0) + p.second_places_manual) as second_places,
            (COALESCE(SUM(CASE WHEN r.position <= 3 THEN 1 ELSE 0 END), 0) + p.third_places_manual) as third_places,
            p.races_played_manual,
            p.total_points_manual,
            p.first_places_manual,
            p.second_places_manual,
            p.third_places_manual
        FROM players p
        LEFT JOIN race_results r ON p.id = r.player_id
        GROUP BY p.id
    '''
    c.execute(query)
    stats = []
    for row in c.fetchall():
        d = dict(row)
        d['races_played'] = d['races_played'] or 0
        d['total_points'] = d['total_points'] or 0
        d['first_places'] = d['first_places'] or 0
        d['second_places'] = d['second_places'] or 0
        d['third_places'] = d['third_places'] or 0
        
        if d['races_played'] > 0:
            d['point_rate'] = d['total_points'] / d['races_played']
            d['win_rate'] = d['first_places'] / d['races_played']
            d['quinella_rate'] = d['second_places'] / d['races_played']
            d['exacta_rate'] = d['third_places'] / d['races_played']
        else:
            d['point_rate'] = 0.0
            d['win_rate'] = 0.0
            d['quinella_rate'] = 0.0
            d['exacta_rate'] = 0.0
            
        stats.append(d)
    conn.close()
    return stats

def update_player_baseline_stats(player_id, races_played, total_points, first_places, second_places, third_places, fourth_places=0, fifth_places=0, sixth_places=0, unplaced=0):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE players SET 
            races_played_manual = ?,
            total_points_manual = ?,
            first_places_manual = ?,
            second_places_manual = ?,
            third_places_manual = ?,
            fourth_places_manual = ?,
            fifth_places_manual = ?,
            sixth_places_manual = ?,
            unplaced_manual = ?
        WHERE id = ?
    ''', (races_played, total_points, first_places, second_places, third_places, fourth_places, fifth_places, sixth_places, unplaced, player_id))
    conn.commit()
    conn.close()
    return True

def add_manual_stats_log_entry(player_id, first_places, second_places, third_places, fourth_places, fifth_places, sixth_places, unplaced, races_played, total_points):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO manual_stats_log (
            player_id, first_places, second_places, third_places,
            fourth_places, fifth_places, sixth_places, unplaced,
            races_played, total_points
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (player_id, first_places, second_places, third_places, fourth_places, fifth_places, sixth_places, unplaced, races_played, total_points))
    conn.commit()
    conn.close()
    recalculate_player_manual_stats(player_id)
    return True

def clear_manual_stats_log(player_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM manual_stats_log WHERE player_id = ?', (player_id,))
    conn.commit()
    conn.close()
    recalculate_player_manual_stats(player_id)
    return True

def get_player_manual_stats_log(player_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM manual_stats_log WHERE player_id = ? ORDER BY created_at DESC', (player_id,))
    log = [dict(row) for row in c.fetchall()]
    conn.close()
    return log

def delete_manual_stats_log_entry(player_id, log_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM manual_stats_log WHERE id = ? AND player_id = ?', (log_id, player_id))
    conn.commit()
    conn.close()
    recalculate_player_manual_stats(player_id)
    return True

def recalculate_player_manual_stats(player_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT 
            COALESCE(SUM(races_played), 0) as races_played,
            COALESCE(SUM(total_points), 0) as total_points,
            COALESCE(SUM(first_places), 0) as first_places,
            COALESCE(SUM(second_places), 0) as second_places,
            COALESCE(SUM(third_places), 0) as third_places,
            COALESCE(SUM(fourth_places), 0) as fourth_places,
            COALESCE(SUM(fifth_places), 0) as fifth_places,
            COALESCE(SUM(sixth_places), 0) as sixth_places,
            COALESCE(SUM(unplaced), 0) as unplaced
        FROM manual_stats_log
        WHERE player_id = ?
    ''', (player_id,))
    row = c.fetchone()
    
    first_places = row['first_places']
    second_places = row['first_places'] + row['second_places']
    third_places = row['first_places'] + row['second_places'] + row['third_places']
    
    c.execute('''
        UPDATE players SET
            races_played_manual = ?,
            total_points_manual = ?,
            first_places_manual = ?,
            second_places_manual = ?,
            third_places_manual = ?,
            fourth_places_manual = ?,
            fifth_places_manual = ?,
            sixth_places_manual = ?,
            unplaced_manual = ?
        WHERE id = ?
    ''', (
        row['races_played'], row['total_points'],
        first_places, second_places, third_places,
        row['fourth_places'], row['fifth_places'], row['sixth_places'], row['unplaced'],
        player_id
    ))
    conn.commit()
    conn.close()
    return True

def get_race_results(race_number):
    import json
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT id FROM races WHERE race_number = ? ORDER BY id DESC LIMIT 1', (race_number,))
    row = c.fetchone()
    if not row:
        conn.close()
        return None
    
    race_id = row['id']
    
    c.execute('''
        SELECT rr.*, p.name as player_name 
        FROM race_results rr
        LEFT JOIN players p ON rr.player_id = p.id
        WHERE rr.race_id = ?
        ORDER BY rr.position ASC
    ''', (race_id,))
    results = []
    for r in c.fetchall():
        d = dict(r)
        if not d['player_name']:
            d['player_name'] = "赤チーム" if d['player_id'] == 1 else "青チーム"
        results.append(d)
    
    if not results:
        conn.close()
        return None
        
    c.execute('SELECT DISTINCT bet_type FROM votes WHERE race_id = ? LIMIT 1', (race_id,))
    vote_row = c.fetchone()
    bet_type = vote_row['bet_type'] if vote_row else 'win'
    
    c.execute('''
        SELECT v.*, vt.name as voter_name
        FROM votes v
        JOIN voters vt ON v.voter_id = vt.id
        WHERE v.race_id = ?
    ''', (race_id,))
    votes = [dict(v) for v in c.fetchall()]
    for v in votes:
        v['pattern'] = json.loads(v['pattern'])
        
    conn.close()
    return {
        'race_id': race_id,
        'race_number': race_number,
        'bet_type': bet_type,
        'results': results,
        'votes': votes
    }

def get_all_completed_race_results():
    import json
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT id, race_number FROM races ORDER BY id ASC')
    race_rows = c.fetchall()
    
    completed_races = []
    for r in race_rows:
        race_id = r['id']
        race_number = r['race_number']
        
        # Check if results exist
        c.execute('''
            SELECT rr.*, p.name as player_name 
            FROM race_results rr
            LEFT JOIN players p ON rr.player_id = p.id
            WHERE rr.race_id = ?
            ORDER BY rr.position ASC
        ''', (race_id,))
        results = []
        for row in c.fetchall():
            d = dict(row)
            if not d['player_name']:
                d['player_name'] = "赤チーム" if d['player_id'] == 1 else "青チーム"
            results.append(d)
        if not results:
            continue
            
        c.execute('SELECT DISTINCT bet_type FROM votes WHERE race_id = ? LIMIT 1', (race_id,))
        vote_row = c.fetchone()
        bet_type = vote_row['bet_type'] if vote_row else 'win'
        
        c.execute('''
            SELECT v.*, vt.name as voter_name
            FROM votes v
            JOIN voters vt ON v.voter_id = vt.id
            WHERE v.race_id = ?
        ''', (race_id,))
        votes = [dict(row) for row in c.fetchall()]
        for v in votes:
            v['pattern'] = json.loads(v['pattern'])
            
        completed_races.append({
            'race_id': race_id,
            'race_number': race_number,
            'bet_type': bet_type,
            'results': results,
            'votes': votes
        })
    conn.close()
    return completed_races
