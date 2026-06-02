import unittest
import json
import sqlite3
import database
import app

class TestMultiRace(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Re-initialize DB
        database.init_db()
        cls.client = app.app.test_client()

    def test_multi_race_flow(self):
        # 1. Create players
        conn = database.get_connection()
        c = conn.cursor()
        c.execute('DELETE FROM players')
        c.execute('DELETE FROM settings')
        c.execute('DELETE FROM votes')
        c.execute('DELETE FROM races')
        c.execute('DELETE FROM voters')
        conn.commit()
        
        # Insert 4 test players
        players = ['Mario', 'Luigi', 'Peach', 'Bowser']
        player_ids = []
        for p in players:
            c.execute('INSERT INTO players (name) VALUES (?)', (p,))
            player_ids.append(c.lastrowid)
        
        # Insert a test voter
        c.execute('INSERT INTO voters (name, password) VALUES (?, ?)', ('test_voter', 'pass'))
        voter_id = c.lastrowid
        conn.commit()
        conn.close()

        # 2. Start 1R as Win (単勝)
        res = self.client.post('/api/races/active', json={
            'race_number': 1,
            'player_ids': player_ids,
            'allowed_bet_type': 'win'
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        
        # 3. Start 2R as Exacta (2連単)
        res = self.client.post('/api/races/active', json={
            'race_number': 2,
            'player_ids': player_ids,
            'allowed_bet_type': 'exacta'
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])

        # 4. Fetch 1R
        res = self.client.get('/api/races/active?race_number=1')
        data = json.loads(res.data)
        self.assertTrue(data['active'])
        self.assertEqual(data['allowed_bet_type'], 'win')
        self.assertEqual(data['race_number'], 1)

        # 5. Fetch 2R
        res = self.client.get('/api/races/active?race_number=2')
        data = json.loads(res.data)
        self.assertTrue(data['active'])
        self.assertEqual(data['allowed_bet_type'], 'exacta')
        self.assertEqual(data['race_number'], 2)

        # 6. Vote on 1R (Win for player 1)
        res = self.client.post('/api/votes', json={
            'race_number': 1,
            'voter_id': voter_id,
            'bet_type': 'win',
            'pattern': [player_ids[0]],
            'amount': 500
        })
        self.assertEqual(res.status_code, 200)

        # 7. Vote on 2R (Exacta for player 1-2)
        res = self.client.post('/api/votes', json={
            'race_number': 2,
            'voter_id': voter_id,
            'bet_type': 'exacta',
            'pattern': [player_ids[0], player_ids[1]],
            'amount': 300
        })
        self.assertEqual(res.status_code, 200)

        # 8. Check voter votes history
        res = self.client.get(f'/api/voter/votes?voter_id={voter_id}')
        data = json.loads(res.data)
        votes = data['votes']
        self.assertEqual(len(votes), 2)
        
        # Ensure correct race numbers are returned
        race_numbers = [v['race_number'] for v in votes]
        self.assertIn(1, race_numbers)
        self.assertIn(2, race_numbers)
        
        print("✅ Multi-race setup, dynamic fetching, separate voting, and voter history race mapping are all working perfectly!")

if __name__ == '__main__':
    unittest.main()
