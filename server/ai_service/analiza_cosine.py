"""
Cosine Similarity – Algoritmul principal de recomandare
========================================================
Calculează similaritatea cosinus AJUSTATĂ (centered) între vectorul de
preferințe al utilizatorului și scorurile fiecărei mașini.

Abordare:
  1. Se centrează scorurile mașinilor per coloană (z-score pe dataset)
     → un scor „mediu" devine 0, nu 7
  2. Se centrează preferințele user-ului (scade media proprie)
     → doar criteriile RELATIV importante rămân pozitive
  3. Se aplică cosine similarity ponderat pe vectorii centrați
     = echivalent cu Corelația Pearson ponderată

Avantaje:
  - Procentele variază natural între 40-95% în loc de 85-99%
  - Direcția preferinței contează, nu magnitudinea absolută
  - Un user care vrea performance+design dar NU confort va primi
    match scăzut cu mașini de confort, chiar dacă toate au scoruri > 5
"""

import numpy as np


def cosine_similarity_adjusted(user_centered, car_centered, weights=None):
    """Compute weighted cosine similarity on centered vectors (≈Pearson)."""
    u = np.array(user_centered, dtype=float)
    c = np.array(car_centered, dtype=float)

    if weights is not None:
        w = np.array(weights, dtype=float)
    else:
        w = np.ones_like(u)

    dot = np.sum(w * u * c)
    norm_u = np.sqrt(np.sum(w * u ** 2))
    norm_c = np.sqrt(np.sum(w * c ** 2))

    if norm_u < 1e-9 or norm_c < 1e-9:
        return 0.0

    return float(dot / (norm_u * norm_c))


def cosine_recommendation(df, preferinte, active_keys):
    """
    Compute adjusted cosine similarity for all cars against user preferences.

    Centering strategy:
      - Car scores are z-normalized per criterion across the entire dataset
      - User preferences are centered by subtracting the user's own mean
      - Weights = absolute value of centered user prefs (big deviations = important)

    Args:
        df: DataFrame with car data + criteria columns
        preferinte: dict { 'performanta': 8, 'design': 5, ... }
        active_keys: list of criteria keys to use

    Returns:
        list of dicts with car info + match %, sorted descending
    """
    # Build user vector and center it (relative importance)
    user_raw = np.array([preferinte.get(k, 5) for k in active_keys], dtype=float)
    user_centered = user_raw - user_raw.mean()

    # Compute dataset column means and stds for z-score normalization
    car_matrix = df[active_keys].values.astype(float)
    col_means = car_matrix.mean(axis=0)
    col_stds = car_matrix.std(axis=0)
    col_stds[col_stds < 1e-9] = 1  # avoid division by zero

    # Weights: absolute centered user prefs — criteria the user deviates on matter more
    weights = np.abs(user_centered) + 0.1  # small baseline so nothing is zero

    results = []
    for idx, (_, row) in enumerate(df.iterrows()):
        # Z-score normalize car vector (how much above/below dataset average per criterion)
        car_raw = car_matrix[idx]
        car_centered = (car_raw - col_means) / col_stds

        sim = cosine_similarity_adjusted(user_centered, car_centered, weights)

        # Map Pearson correlation [-1, 1] → match percentage [0, 100]
        # Using non-linear mapping for better spread in the useful range
        match_pct = max(0, min(100, round(50 + sim * 50)))

        results.append({
            'idMasina':     int(row['idMasina']),
            'marca':        row['marca'],
            'model':        row['model'],
            'an':           int(row.get('anFabricatie', 0)),
            'km':           int(row.get('km', 0)),
            'pret':         float(row.get('pretPromotional', 0) if row.get('esteInPromotie') and row.get('pretPromotional') else row.get('pretEuro', 0)),
            'combustibil':  int(row.get('combustibil', 0)),
            'categorie':    int(row.get('categorieAuto', 0)),
            'imagine':      row.get('imaginePrincipala', ''),
            'esteInPromotie': bool(row.get('esteInPromotie', False)),
            'match':        match_pct,
            # Return individual criteria scores for radar chart
            'scores': {k: float(row.get(k, 0)) for k in active_keys},
        })

    results.sort(key=lambda x: x['match'], reverse=True)
    return results
