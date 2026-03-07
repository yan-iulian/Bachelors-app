"""
AerYan AI Recommendation Service
=================================
Micro-service Flask care expune 6 analize:
  1. Cosine Similarity  – potrivire user ↔ mașini
  2. ACP (PCA)          – reducere dimensională + vizualizare
  3. AC (Hierarchical Clustering) – grupare mașini în clustere
  4. K-Means Clustering – alternativă la HC cu Elbow Method
  5. Anomaly Detection  – identificare mașini sub/supraevaluate
  6. Car DNA Fingerprint – amprentă completă 10 scoruri per mașină

Se conectează la același PostgreSQL ca serverul Node.js.
Rulează pe portul 5000.
"""

import os
import json
import io
import base64
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

from analiza_cosine import cosine_recommendation
from analiza_acp import run_pca_analysis
from analiza_ac import run_hc_analysis
from analiza_kmeans import run_kmeans_analysis
from analiza_anomaly import run_anomaly_detection

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


# ─── ENDPOINT 4: K-Means Clustering ─────────────────────────
@app.route('/analyze/kmeans', methods=['POST'])
def analyze_kmeans():
    """
    Body: { preferinte: { ... }, activeKeys: [...], nrClusteri_hc: 4 }
    Returns: K-Means clusters, elbow data, comparație cu HC
    """
    data = request.get_json()
    preferinte = data.get('preferinte', {})
    active_keys = data.get('activeKeys', CRITERIA_KEYS)
    nr_clusteri_hc = data.get('nrClusteri_hc', None)

    df = get_masini_df()
    results = run_kmeans_analysis(df, preferinte, active_keys, nr_clusteri_hc)
    return jsonify(results)


# ─── ENDPOINT 5: Anomaly Detection ──────────────────────────
@app.route('/analyze/anomaly', methods=['POST'])
def analyze_anomaly():
    """
    Body: { activeKeys: [...] }
    Returns: anomalii detectate (chilipiruri, supraevaluate), grafice
    """
    data = request.get_json()
    active_keys = data.get('activeKeys', CRITERIA_KEYS)

    df = get_masini_df()
    results = run_anomaly_detection(df, active_keys)
    return jsonify(results)


# ─── ENDPOINT 6: Car DNA Fingerprint ────────────────────────
@app.route('/analyze/fingerprint', methods=['POST'])
def analyze_fingerprint():
    """
    Body: { idMasina: 123 }
    Returns: full 10-score radar + comparație cu media flotei + percentile
    """
    data = request.get_json()
    id_masina = data.get('idMasina')

    if not id_masina:
        return jsonify({'error': 'idMasina este obligatoriu'}), 400

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        # Fetch target car
        car_df = pd.read_sql('SELECT * FROM masini WHERE "idMasina" = %s', conn, params=(id_masina,))
        # Fetch all available cars for comparison
        fleet_df = pd.read_sql('SELECT * FROM masini WHERE status = %s', conn, params=('Disponibil',))
    finally:
        conn.close()

    if car_df.empty:
        return jsonify({'error': 'Mașina nu a fost găsită'}), 404

    car = car_df.iloc[0]

    SCORE_COLS_FULL = [
        'scorViteza', 'scorConfort', 'scorConsum', 'scorManevrabilitate', 'scorPret',
        'scorDesignInterior', 'scorDesignExterior', 'scorSpatiu', 'scorAcceleratieCuplu', 'scorFrana'
    ]

    SCORE_LABELS = {
        'scorViteza': 'Viteză',
        'scorConfort': 'Confort',
        'scorConsum': 'Consum',
        'scorManevrabilitate': 'Manevrabilitate',
        'scorPret': 'Preț',
        'scorDesignInterior': 'Design Interior',
        'scorDesignExterior': 'Design Exterior',
        'scorSpatiu': 'Spațiu',
        'scorAcceleratieCuplu': 'Accelerație/Cuplu',
        'scorFrana': 'Frână',
    }

    # Scorurile mașinii
    car_scores = {}
    for col in SCORE_COLS_FULL:
        car_scores[col] = float(car.get(col, 0) or 0)

    # Media flotei
    fleet_means = {}
    fleet_percentiles = {}
    for col in SCORE_COLS_FULL:
        vals = fleet_df[col].fillna(0).values.astype(float)
        fleet_means[col] = round(float(vals.mean()), 2)
        if len(vals) > 0:
            pct = float(np.sum(vals <= car_scores[col])) / len(vals) * 100
            fleet_percentiles[col] = round(pct, 1)
        else:
            fleet_percentiles[col] = 50.0

    # Scor global: media tuturor scorurilor
    all_scores = list(car_scores.values())
    global_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0

    # Percentila globală: comparăm scorul global cu media scorurilor tuturor mașinilor
    fleet_globals = fleet_df[SCORE_COLS_FULL].fillna(0).mean(axis=1).values.astype(float)
    if len(fleet_globals) > 0:
        fleet_percentiles['global'] = round(float(np.sum(fleet_globals <= global_score)) / len(fleet_globals) * 100, 1)
    else:
        fleet_percentiles['global'] = 50.0

    # Punktele forte și slabe
    sorted_scores = sorted(car_scores.items(), key=lambda x: x[1], reverse=True)
    strengths = [(SCORE_LABELS[k], v) for k, v in sorted_scores[:3]]
    weaknesses = [(SCORE_LABELS[k], v) for k, v in sorted_scores[-3:]]

    # Chart: Radar 10 dimensiuni
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    colors_chart = {
        'bg': '#151022', 'panel': '#1e1538', 'grid': '#2a2045',
        'text': '#e2e8f0', 'muted': '#94a3b8', 'accent': '#895af6',
        'teal': '#2DD4BF', 'gold': '#D4AF37',
    }

    plt.rcParams.update({
        'figure.facecolor': colors_chart['bg'],
        'axes.facecolor': colors_chart['panel'],
        'axes.edgecolor': colors_chart['grid'],
        'axes.labelcolor': colors_chart['text'],
        'text.color': colors_chart['text'],
        'font.size': 10,
    })

    # Radar chart cu 10 axe
    labels_list = [SCORE_LABELS[c] for c in SCORE_COLS_FULL]
    car_vals = [car_scores[c] for c in SCORE_COLS_FULL]
    fleet_vals = [fleet_means[c] for c in SCORE_COLS_FULL]

    n_axes = len(SCORE_COLS_FULL)
    angles = np.linspace(0, 2 * np.pi, n_axes, endpoint=False).tolist()
    angles += angles[:1]
    car_vals_plot = car_vals + car_vals[:1]
    fleet_vals_plot = fleet_vals + fleet_vals[:1]

    fig, ax = plt.subplots(figsize=(9, 9), subplot_kw=dict(polar=True))
    ax.set_facecolor(colors_chart['panel'])
    fig.patch.set_facecolor(colors_chart['bg'])

    # Grid rings
    for ring in [2, 4, 6, 8, 10]:
        ax.plot(angles, [ring] * (n_axes + 1), color=colors_chart['grid'], linewidth=0.5, alpha=0.4)

    # Fleet average
    ax.plot(angles, fleet_vals_plot, 'o-', color=colors_chart['muted'], linewidth=1.5,
            markersize=4, label='Media Flotei', alpha=0.6)
    ax.fill(angles, fleet_vals_plot, color=colors_chart['muted'], alpha=0.05)

    # Car DNA
    ax.plot(angles, car_vals_plot, 'o-', color=colors_chart['teal'], linewidth=2.5,
            markersize=7, label=f'{car["marca"]} {car["model"]}', zorder=5)
    ax.fill(angles, car_vals_plot, color=colors_chart['teal'], alpha=0.15)

    # Puncte cu valori
    for i, (angle, val) in enumerate(zip(angles[:-1], car_vals)):
        pct_rank = fleet_percentiles[SCORE_COLS_FULL[i]]
        color = colors_chart['teal'] if pct_rank >= 70 else (colors_chart['gold'] if pct_rank >= 40 else '#ef4444')
        ax.annotate(f'{val:.1f}', (angle, val), textcoords="offset points",
                    xytext=(0, 12), ha='center', fontsize=9, fontweight='bold', color=color)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels_list, fontsize=9, color=colors_chart['text'])
    ax.set_ylim(0, 10)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(['2', '4', '6', '8', '10'], fontsize=7, color=colors_chart['muted'])

    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), framealpha=0.3,
              edgecolor=colors_chart['grid'], fontsize=10)
    ax.set_title(f'Car DNA – {car["marca"]} {car["model"]}',
                 fontsize=15, fontweight='bold', pad=25, color=colors_chart['text'])

    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor=colors_chart['bg'], edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    radar_chart = base64.b64encode(buf.read()).decode('utf-8')

    # Chart 2: Bar chart comparativ
    fig, ax = plt.subplots(figsize=(12, 5))
    x = np.arange(n_axes)
    width = 0.35

    bars1 = ax.bar(x - width/2, car_vals, width, color=colors_chart['teal'],
                   alpha=0.8, label=f'{car["marca"]} {car["model"]}', edgecolor='white', linewidth=0.5)
    bars2 = ax.bar(x + width/2, fleet_vals, width, color=colors_chart['muted'],
                   alpha=0.5, label='Media Flotei', edgecolor='white', linewidth=0.5)

    # Valori deasupra barelor
    for bar, val in zip(bars1, car_vals):
        ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.15,
                f'{val:.1f}', ha='center', va='bottom', fontsize=8,
                color=colors_chart['teal'], fontweight='bold')

    ax.set_xlabel('Criteriu')
    ax.set_ylabel('Scor (0-10)')
    ax.set_title(f'Comparație {car["marca"]} {car["model"]} vs. Media Flotei',
                 fontsize=13, fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(labels_list, rotation=30, ha='right', fontsize=9)
    ax.set_ylim(0, 11)
    ax.legend(framealpha=0.3, edgecolor=colors_chart['grid'])
    ax.grid(True, axis='y', alpha=0.15)
    fig.tight_layout()

    buf2 = io.BytesIO()
    fig.savefig(buf2, format='png', dpi=150, bbox_inches='tight',
                facecolor=colors_chart['bg'], edgecolor='none')
    plt.close(fig)
    buf2.seek(0)
    bar_chart = base64.b64encode(buf2.read()).decode('utf-8')

    return jsonify({
        'idMasina':     int(car['idMasina']),
        'marca':        car['marca'],
        'model':        car['model'],
        'scores':       car_scores,
        'labels':       SCORE_LABELS,
        'fleetMeans':   fleet_means,
        'percentiles':  fleet_percentiles,
        'globalScore':  global_score,
        'strengths':    [{'label': s[0], 'score': s[1]} for s in strengths],
        'weaknesses':   [{'label': w[0], 'score': w[1]} for w in weaknesses],
        'charts': {
            'radar': radar_chart,
            'comparison': bar_chart,
        }
    })


# ─── HEALTH CHECK ────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'AerYan AI'})


if __name__ == '__main__':
    print("AerYan AI Service pornit pe http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
