import unittest
import json
import sqlite3
import database
import app

class TestHideOdds(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = app.app.test_client()

    def setUp(self):
        # Clean settings and race databases before each test
        conn = database.get_connection()
        c = conn.cursor()
        c.execute('DELETE FROM settings')
        c.execute('DELETE FROM races')
        c.execute('DELETE FROM players')
        
        # Insert test players
        self.player_ids = []
        for p in ['Mario', 'Luigi', 'Peach', 'Bowser']:
            c.execute('INSERT INTO players (name) VALUES (?)', (p,))
            self.player_ids.append(c.lastrowid)
            
        conn.commit()
        conn.close()

    def test_default_hide_odds_setting(self):
        # By default, odds visibility should be visible (hide: False)
        res = self.client.get('/api/settings/hide_odds')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertFalse(data['hide'])

    def test_toggle_hide_odds_setting(self):
        # 1. Set odds as hidden
        res = self.client.post('/api/admin/settings/hide_odds', json={'hide': True})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertTrue(data['hide'])

        # Check via GET endpoint
        res = self.client.get('/api/settings/hide_odds')
        data = json.loads(res.data)
        self.assertTrue(data['hide'])

        # 2. Set odds as visible
        res = self.client.post('/api/admin/settings/hide_odds', json={'hide': False})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertFalse(data['hide'])

        # Check via GET endpoint
        res = self.client.get('/api/settings/hide_odds')
        data = json.loads(res.data)
        self.assertFalse(data['hide'])

    def test_active_race_payload_contains_hide_odds(self):
        # Start a race (1R)
        res = self.client.post('/api/races/active', json={
            'race_number': 1,
            'player_ids': self.player_ids,
            'allowed_bet_type': 'win'
        })
        self.assertEqual(res.status_code, 200)

        # 1. Fetch active race when odds are visible
        self.client.post('/api/admin/settings/hide_odds', json={'hide': False})
        res = self.client.get('/api/races/active?race_number=1')
        data = json.loads(res.data)
        self.assertTrue(data['active'])
        self.assertFalse(data['hide_odds'])

        # 2. Fetch active race when odds are hidden
        self.client.post('/api/admin/settings/hide_odds', json={'hide': True})
        res = self.client.get('/api/races/active?race_number=1')
        data = json.loads(res.data)
        self.assertTrue(data['active'])
        self.assertTrue(data['hide_odds'])

if __name__ == '__main__':
    unittest.main()
