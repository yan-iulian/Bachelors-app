"""
AerYan AI Recommendation Service
=================================
Micro-service Flask care expune 3 analize:
  1. Cosine Similarity  – potrivire user ↔ mașini
  2. ACP (PCA)          – reducere dimensională + vizualizare
  3. AC (Hierarchical Clustering) – grupare mașini în clustere

Se conectează la același PostgreSQL ca serverul Node.js.
Rulează pe portul 5000.
"""

import os
import json
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

from analiza_cosine import cosine_recommendation
from analiza_acp import run_pca_analysis
from analiza_ac import run_hc_analysis

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://localhost:3001'])

# ─── DB CONFIG ───────────────────────────────────────────────
DB_CONFIG = {
    'dbname':   os.environ.get('DB_NAME', 'AerYanDataBase'),
    'user':     os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASS', 'superuser'),
    'host':     os.environ.get('DB_HOST', 'localhost'),
    'port':     os.environ.get('DB_PORT', '5432'),
}

SCORE_COLUMNS = [
    'scorViteza', 'scorConfort', 'scorConsum', 'scorManevrabilitate', 'scorPret',
    'scorDesignInterior', 'scorDesignExterior', 'scorSpatiu', 'scorAcceleratieCuplu', 'scorFrana'
]

# Mapping 10 DB scores → 7 criteria user-facing keys
# Doar criterii cu mapping direct / clar din DB (fără improvizații)
SCORE_TO_CRITERIA = {
    'scorViteza':            'performanta',
    'scorAcceleratieCuplu':  'performanta',   # averaged with scorViteza
    'scorDesignInterior':    'design',
    'scorDesignExterior':    'design',         # averaged with DesignInterior
    'scorConfort':           'confort',
    'scorPret':              'pret',
    'scorConsum':            'consum',
    'scorFrana':             'siguranta',
    'scorSpatiu':            'spatiu',
}

CRITERIA_KEYS = [
    'performanta', 'design', 'confort', 'pret', 'consum',
    'siguranta', 'spatiu'
]


def get_masini_df():
    """Fetch all available cars from DB and return a DataFrame with mapped criteria scores."""
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        df = pd.read_sql(
            'SELECT * FROM masini WHERE status = %s',
            conn, params=('Disponibil',)
        )
    finally:
        conn.close()

    # Map raw DB scores (0-10) to the 7 criteria with mapping direct din DB
    df['performanta']   = ((df['scorViteza'].fillna(0) + df['scorAcceleratieCuplu'].fillna(0)) / 2).round(1)
    df['design']        = ((df['scorDesignInterior'].fillna(0) + df['scorDesignExterior'].fillna(0)) / 2).round(1)
    df['confort']       = df['scorConfort'].fillna(0).round(1)
    df['pret']          = df['scorPret'].fillna(0).round(1)
    df['consum']        = df['scorConsum'].fillna(0).round(1)
    df['siguranta']     = df['scorFrana'].fillna(0).round(1)
    df['spatiu']        = df['scorSpatiu'].fillna(0).round(1)

    return df


# ─── ENDPOINT 1: Cosine Similarity ──────────────────────────
@app.route('/analyze/cosine', methods=['POST'])
def analyze_cosine():
    """
    Body: { preferinte: { performanta: 8, design: 5, ... }, activeKeys: [...] }
    Returns: sorted list of cars with match %
    """
    data = request.get_json()
    preferinte = data.get('preferinte', {})
    active_keys = data.get('activeKeys', CRITERIA_KEYS)

    df = get_masini_df()
    results = cosine_recommendation(df, preferinte, active_keys)
    return jsonify(results)


# ─── ENDPOINT 2: PCA (ACP) ──────────────────────────────────
@app.route('/analyze/pca', methods=['POST'])
def analyze_pca():
    """
    Body: { preferinte: { ... }, activeKeys: [...] }
    Returns: PCA components, explained variance, car positions, user position
    """
    data = request.get_json()
    preferinte = data.get('preferinte', {})
    active_keys = data.get('activeKeys', CRITERIA_KEYS)

    df = get_masini_df()
    results = run_pca_analysis(df, preferinte, active_keys)
    return jsonify(results)


# ─── ENDPOINT 3: Hierarchical Clustering (AC) ───────────────
@app.route('/analyze/hc', methods=['POST'])
def analyze_hc():
    """
    Body: { preferinte: { ... }, activeKeys: [...] }
    Returns: cluster assignments, dendrogram data, user's closest cluster
    """
    data = request.get_json()
    preferinte = data.get('preferinte', {})
    active_keys = data.get('activeKeys', CRITERIA_KEYS)

    df = get_masini_df()
    results = run_hc_analysis(df, preferinte, active_keys)
    return jsonify(results)


# ─── HEALTH CHECK ────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'AerYan AI'})


if __name__ == '__main__':
    print("AerYan AI Service pornit pe http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
