import os
import time
import uuid
import random
from datetime import datetime
from typing import Dict, List, Tuple, Optional

import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
DATASET_PATH = os.path.join(BASE_DIR, "dataset")

for folder in [UPLOAD_FOLDER, DATASET_PATH]:
    os.makedirs(folder, exist_ok=True)

MODEL_NAME = os.getenv("MODEL_NAME", "ArcFace")
DETECTOR_BACKEND = os.getenv("DETECTOR_BACKEND", "opencv")
STANDARD_THRESHOLD = float(os.getenv("STANDARD_THRESHOLD", "0.68"))

DEFAULT_GROUP_DEFINITIONS = {
    "African": "Evaluation proxy group aligned with common fairness datasets (e.g., FairFace).",
    "Asian": "Evaluation proxy group aligned with common fairness datasets (e.g., FairFace).",
    "Caucasian": "Evaluation proxy group aligned with common fairness datasets (e.g., FairFace).",
    "Indian": "Evaluation proxy group aligned with common fairness datasets (e.g., FairFace).",
}
GROUPS = [
    group.strip()
    for group in os.getenv("GROUPS", "African,Asian,Caucasian,Indian").split(",")
    if group.strip()
]
GROUP_DEFINITIONS = {
    group: DEFAULT_GROUP_DEFINITIONS.get(
        group, "Custom evaluation group provided by the system operator."
    )
    for group in GROUPS
}
GROUPS_NOTE = (
    "Groups are evaluation proxies derived from widely used fairness datasets and are extensible. "
    "They are not exhaustive definitions of human identity."
)

MAX_AUDIT_SAMPLES_PER_GROUP = int(os.getenv("MAX_AUDIT_SAMPLES_PER_GROUP", "120"))
MAX_REFERENCE_SAMPLES_PER_GROUP = int(os.getenv("MAX_REFERENCE_SAMPLES_PER_GROUP", "80"))
MAX_PAIRS_PER_GROUP = int(os.getenv("MAX_PAIRS_PER_GROUP", "3000"))
MIN_FACE_CONFIDENCE = float(os.getenv("MIN_FACE_CONFIDENCE", "0.30"))
TARGET_FPR = float(os.getenv("TARGET_FPR", "0.01"))
RNG_SEED = int(os.getenv("AUDIT_RANDOM_SEED", "1337"))

ENABLE_PREPROCESSING = os.getenv("ENABLE_PREPROCESSING", "true").lower() in ("1", "true", "yes")
PREPROCESS_METHOD = os.getenv("PREPROCESS_METHOD", "clahe_gamma")
LOW_LIGHT_LUMINANCE = float(os.getenv("LOW_LIGHT_LUMINANCE", "70"))
HIGH_LIGHT_LUMINANCE = float(os.getenv("HIGH_LIGHT_LUMINANCE", "170"))

LOOKALIKE_DISTANCE_RATIO = float(os.getenv("LOOKALIKE_DISTANCE_RATIO", "0.55"))

EMBEDDING_CACHE: Dict[Tuple[str, bool], Tuple[Optional[List[float]], dict]] = {}
AUDIT_CACHE: Dict[str, object] = {
    "timestamp": None,
    "group_thresholds": {},
    "calibration": {},
}


def _save_upload(file, prefix):
    filename = secure_filename(file.filename or f"{prefix}.jpg")
    request_id = uuid.uuid4().hex
    temp_path = os.path.join(UPLOAD_FOLDER, f"{prefix}_{request_id}_{filename}")
    file.save(temp_path)
    return temp_path


def _cleanup(paths):
    if not paths:
        return
    if isinstance(paths, str):
        paths = [paths]
    for path in paths:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


def _is_image_file(filename: str) -> bool:
    return filename.lower().endswith((".jpg", ".jpeg", ".png"))


def _list_images(folder):
    if not os.path.isdir(folder):
        return []
    images = [f for f in os.listdir(folder) if _is_image_file(f)]
    images.sort()
    return images


def _list_image_paths(folder):
    return [os.path.join(folder, name) for name in _list_images(folder)]


def _format_bounding_box(area):
    if not area:
        return None
    x = int(area.get("x", 0))
    y = int(area.get("y", 0))
    w = int(area.get("w", area.get("width", 0)))
    h = int(area.get("h", area.get("height", 0)))
    if w <= 0 or h <= 0:
        return None
    return {"x": x, "y": y, "width": w, "height": h}


def _read_image(img_path: str):
    try:
        return cv2.imread(img_path)
    except Exception:
        return None


def _estimate_luminance(img) -> Optional[float]:
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return float(np.mean(gray))


def _bucket_luminance(mean_luminance: Optional[float]) -> str:
    if mean_luminance is None:
        return "unknown"
    if mean_luminance < LOW_LIGHT_LUMINANCE:
        return "low"
    if mean_luminance > HIGH_LIGHT_LUMINANCE:
        return "high"
    return "normal"


def _apply_gamma(img, gamma: float):
    if gamma <= 0:
        return img
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
    return cv2.LUT(img, table)


def _apply_clahe(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_clahe = clahe.apply(l_channel)
    merged = cv2.merge((l_clahe, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def _apply_hist_eq(img):
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y_channel, cr_channel, cb_channel = cv2.split(ycrcb)
    y_eq = cv2.equalizeHist(y_channel)
    merged = cv2.merge((y_eq, cr_channel, cb_channel))
    return cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)


def _normalize_illumination(img, mean_luminance: Optional[float]):
    if img is None:
        return None, {"applied": False, "method": "none"}
    if not ENABLE_PREPROCESSING:
        return img, {"applied": False, "method": "none"}

    method = PREPROCESS_METHOD
    gamma = 1.0
    if mean_luminance is not None:
        if mean_luminance < LOW_LIGHT_LUMINANCE:
            gamma = 1.6
        elif mean_luminance < HIGH_LIGHT_LUMINANCE:
            gamma = 1.25
        else:
            gamma = 1.05

    processed = img.copy()
    if method in ("clahe", "clahe_gamma", "clahe+gamma"):
        processed = _apply_clahe(processed)
    if method in ("hist_eq", "histogram"):
        processed = _apply_hist_eq(processed)
    if method in ("gamma", "clahe_gamma", "clahe+gamma"):
        processed = _apply_gamma(processed, gamma)

    return processed, {
        "applied": True,
        "method": method,
        "gamma": gamma,
    }


def _write_temp_image(img, prefix: str) -> Optional[str]:
    request_id = uuid.uuid4().hex
    temp_path = os.path.join(UPLOAD_FOLDER, f"{prefix}_{request_id}.jpg")
    try:
        success = cv2.imwrite(temp_path, img)
        if not success:
            return None
        return temp_path
    except Exception:
        return None


def _prepare_variants(img_path: str, use_preprocessing: bool):
    temp_paths = []
    img = _read_image(img_path)
    mean_luminance = _estimate_luminance(img)
    bucket = _bucket_luminance(mean_luminance)

    variants = [
        {
            "label": "original",
            "path": img_path,
            "preprocess": {"applied": False, "method": "none"},
            "luminance": mean_luminance,
            "bucket": bucket,
        }
    ]

    if use_preprocessing and img is not None and ENABLE_PREPROCESSING:
        normalized, preprocess_info = _normalize_illumination(img, mean_luminance)
        if normalized is not None:
            temp_path = _write_temp_image(normalized, "normalized")
            if temp_path:
                temp_paths.append(temp_path)
                variants.append(
                    {
                        "label": "normalized",
                        "path": temp_path,
                        "preprocess": preprocess_info,
                        "luminance": mean_luminance,
                        "bucket": bucket,
                    }
                )

    illumination = {
        "meanLuminance": mean_luminance,
        "bucket": bucket,
    }

    return variants, illumination, temp_paths


def _detector_backends():
    backends = [DETECTOR_BACKEND]
    if DETECTOR_BACKEND != "opencv":
        backends.append("opencv")
    return backends


def _extract_faces(img_path: str, detector_backend: str):
    try:
        return DeepFace.extract_faces(
            img_path=img_path,
            detector_backend=detector_backend,
            enforce_detection=False,
            align=True,
        )
    except Exception:
        return []


def _detect_face_on_path(img_path: str):
    best = {"detected": False, "confidence": 0.0, "area": None, "backend": None}
    for backend in _detector_backends():
        faces = _extract_faces(img_path, backend)
        if not faces:
            continue
        for face in faces:
            confidence = float(
                face.get("confidence", face.get("detector_confidence", 0.0)) or 0.0
            )
            area = face.get("facial_area") or {}
            if confidence > best["confidence"]:
                best = {
                    "detected": confidence >= MIN_FACE_CONFIDENCE,
                    "confidence": confidence,
                    "area": area,
                    "backend": backend,
                }
    return best


def _represent_face(img_path: str, detector_backend: Optional[str]):
    backends = [detector_backend] if detector_backend else []
    for backend in _detector_backends():
        if backend not in backends:
            backends.append(backend)

    for backend in backends:
        try:
            representations = DeepFace.represent(
                img_path=img_path,
                model_name=MODEL_NAME,
                detector_backend=backend,
                enforce_detection=False,
            )
            if representations:
                return representations[0].get("embedding")
        except Exception:
            continue
    return None


def _select_best_variant(variants):
    best_variant = variants[0]
    best_detection = {"detected": False, "confidence": 0.0, "area": None, "backend": None}
    for variant in variants:
        detection = _detect_face_on_path(variant["path"])
        if detection["confidence"] > best_detection["confidence"]:
            best_detection = detection
            best_variant = variant
    return best_variant, best_detection


def _get_embedding_with_metadata(img_path: str, use_preprocessing: bool = True):
    variants, illumination, temp_paths = _prepare_variants(img_path, use_preprocessing)
    selected_variant, detection = _select_best_variant(variants)

    embedding = None
    if detection["detected"]:
        embedding = _represent_face(selected_variant["path"], detection["backend"])

    metadata = {
        "detected": bool(detection["detected"]),
        "confidence": float(detection["confidence"] or 0.0),
        "boundingBox": _format_bounding_box(detection["area"]),
        "detectorBackend": detection["backend"] or DETECTOR_BACKEND,
        "illumination": illumination,
        "preprocessing": {
            "applied": bool(selected_variant["preprocess"].get("applied")),
            "method": selected_variant["preprocess"].get("method", "none"),
            "gamma": selected_variant["preprocess"].get("gamma"),
            "variant": selected_variant["label"],
        },
    }

    _cleanup(temp_paths)
    return embedding, metadata


def _get_cached_embedding(img_path: str, use_preprocessing: bool):
    key = (img_path, bool(use_preprocessing))
    if key in EMBEDDING_CACHE:
        return EMBEDDING_CACHE[key]
    embedding, metadata = _get_embedding_with_metadata(img_path, use_preprocessing)
    EMBEDDING_CACHE[key] = (embedding, metadata)
    return embedding, metadata


def _cosine_distance(vec_a, vec_b):
    a = np.asarray(vec_a, dtype=np.float32)
    b = np.asarray(vec_b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9
    return float(1.0 - float(np.dot(a, b) / denom))


def _calibrated_similarity(distance: float, threshold: float):
    if threshold <= 0:
        return 0.0
    score = 1.0 - (distance / threshold)
    return float(min(max(score, 0.0), 1.0))


def _iter_genuine_pairs(embeddings_by_identity: Dict[str, List[List[float]]]):
    for embeds in embeddings_by_identity.values():
        if len(embeds) < 2:
            continue
        for i in range(len(embeds)):
            for j in range(i + 1, len(embeds)):
                yield embeds[i], embeds[j]


def _iter_impostor_pairs(embeddings_by_identity: Dict[str, List[List[float]]]):
    identities = list(embeddings_by_identity.items())
    for i in range(len(identities)):
        _, embeds_a = identities[i]
        for j in range(i + 1, len(identities)):
            _, embeds_b = identities[j]
            for emb_a in embeds_a:
                for emb_b in embeds_b:
                    yield emb_a, emb_b


def _sample_distances(pair_iter, max_pairs: int, rng: random.Random):
    distances = []
    if max_pairs <= 0:
        for emb_a, emb_b in pair_iter:
            distances.append(_cosine_distance(emb_a, emb_b))
        return distances

    seen = 0
    for emb_a, emb_b in pair_iter:
        distance = _cosine_distance(emb_a, emb_b)
        if len(distances) < max_pairs:
            distances.append(distance)
        else:
            idx = rng.randint(0, seen)
            if idx < max_pairs:
                distances[idx] = distance
        seen += 1
    return distances


def _distribution_stats(distances: List[float], bins: int = 20):
    if not distances:
        return {
            "count": 0,
            "mean": None,
            "std": None,
            "min": None,
            "max": None,
            "p10": None,
            "p50": None,
            "p90": None,
            "histogram": {"bins": [], "counts": []},
        }
    arr = np.asarray(distances, dtype=np.float32)
    counts, edges = np.histogram(arr, bins=bins, range=(0, 1))
    return {
        "count": int(len(arr)),
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "p10": float(np.percentile(arr, 10)),
        "p50": float(np.percentile(arr, 50)),
        "p90": float(np.percentile(arr, 90)),
        "histogram": {"bins": edges.tolist(), "counts": counts.tolist()},
    }


def _compute_metrics(genuine: List[float], impostor: List[float], threshold: float):
    metrics = {
        "threshold": float(threshold),
        "fpr": None,
        "fnr": None,
        "tpr": None,
        "tnr": None,
        "accuracy": None,
        "balancedAccuracy": None,
    }
    if not genuine and not impostor:
        return metrics

    if impostor:
        fpr = sum(1 for d in impostor if d <= threshold) / len(impostor)
        metrics["fpr"] = float(fpr)
        metrics["tnr"] = float(1.0 - fpr)

    if genuine:
        fnr = sum(1 for d in genuine if d > threshold) / len(genuine)
        metrics["fnr"] = float(fnr)
        metrics["tpr"] = float(1.0 - fnr)

    if genuine and impostor:
        tpr = metrics["tpr"] if metrics["tpr"] is not None else 0.0
        tnr = metrics["tnr"] if metrics["tnr"] is not None else 0.0
        metrics["accuracy"] = float(
            (tpr * len(genuine) + tnr * len(impostor)) / (len(genuine) + len(impostor))
        )
        metrics["balancedAccuracy"] = float((tpr + tnr) / 2.0)
    return metrics


def _threshold_for_target_fpr(impostor: List[float], target_fpr: float, fallback: float):
    if not impostor:
        return fallback
    target = min(max(target_fpr, 0.001), 0.2)
    return float(np.quantile(np.asarray(impostor, dtype=np.float32), target))


def _distribution_overlap(genuine: List[float], impostor: List[float], bins: int = 20):
    if not genuine or not impostor:
        return None
    g_counts, edges = np.histogram(genuine, bins=bins, range=(0, 1), density=True)
    i_counts, _ = np.histogram(impostor, bins=edges, density=True)
    bin_width = edges[1] - edges[0]
    overlap = float(np.sum(np.minimum(g_counts, i_counts)) * bin_width)
    return overlap


def _d_prime(genuine: List[float], impostor: List[float]):
    if not genuine or not impostor:
        return None
    g = np.asarray(genuine, dtype=np.float32)
    i = np.asarray(impostor, dtype=np.float32)
    mean_diff = np.mean(i) - np.mean(g)
    pooled_std = np.sqrt(0.5 * (np.var(i) + np.var(g)) + 1e-9)
    if pooled_std <= 0:
        return None
    return float(mean_diff / pooled_std)


def _collect_identities(group_folder: str, max_samples: int, rng: random.Random):
    identities = {}
    identity_dirs = [entry for entry in os.scandir(group_folder) if entry.is_dir()]
    if identity_dirs:
        for entry in sorted(identity_dirs, key=lambda e: e.name):
            images = _list_image_paths(entry.path)
            if images:
                identities[entry.name] = images
    else:
        for image_path in _list_image_paths(group_folder):
            identity_key = os.path.splitext(os.path.basename(image_path))[0]
            identities[identity_key] = [image_path]

    if max_samples and max_samples > 0:
        identities = _limit_identity_samples(identities, max_samples, rng)

    return identities


def _limit_identity_samples(identities: Dict[str, List[str]], max_samples: int, rng: random.Random):
    all_items = []
    for identity, paths in identities.items():
        for path in paths:
            all_items.append((identity, path))

    if len(all_items) <= max_samples:
        return identities

    rng.shuffle(all_items)
    selected = all_items[:max_samples]

    trimmed = {}
    for identity, path in selected:
        trimmed.setdefault(identity, []).append(path)

    return trimmed


def _embed_identities(identities: Dict[str, List[str]], use_preprocessing: bool):
    embeddings_by_identity: Dict[str, List[List[float]]] = {}
    detection_total = 0
    detected_count = 0
    preprocessing_used = 0
    luminance_values = []
    buckets = {
        "low": {"count": 0, "detected": 0},
        "normal": {"count": 0, "detected": 0},
        "high": {"count": 0, "detected": 0},
        "unknown": {"count": 0, "detected": 0},
    }

    for identity, paths in identities.items():
        for path in paths:
            detection_total += 1
            embedding, metadata = _get_cached_embedding(path, use_preprocessing)
            illumination = metadata.get("illumination", {})
            bucket = illumination.get("bucket", "unknown")
            buckets.setdefault(bucket, {"count": 0, "detected": 0})
            buckets[bucket]["count"] += 1

            if illumination.get("meanLuminance") is not None:
                luminance_values.append(float(illumination["meanLuminance"]))

            if metadata.get("detected"):
                detected_count += 1
                buckets[bucket]["detected"] += 1

            preprocessing = metadata.get("preprocessing", {})
            if preprocessing.get("applied") and preprocessing.get("variant") == "normalized":
                preprocessing_used += 1

            if embedding is not None:
                embeddings_by_identity.setdefault(identity, []).append(embedding)

    embeddings_by_identity = {
        identity: embeds
        for identity, embeds in embeddings_by_identity.items()
        if embeds
    }

    detection_rate = float(detected_count / detection_total) if detection_total else 0.0
    bucket_rates = {}
    for bucket, stats in buckets.items():
        if stats["count"]:
            rate = stats["detected"] / stats["count"]
        else:
            rate = None
        bucket_rates[bucket] = {"count": stats["count"], "detectionRate": rate}

    preprocessing_rate = float(preprocessing_used / detection_total) if detection_total else 0.0

    return embeddings_by_identity, {
        "rawSampleCount": detection_total,
        "detectedCount": detected_count,
        "detectionRate": detection_rate,
        "illumination": {
            "meanLuminance": float(np.mean(luminance_values)) if luminance_values else None,
            "buckets": bucket_rates,
        },
        "preprocessingUsageRate": preprocessing_rate,
    }


def _interpret_group(metrics: dict, detection_rate: float):
    balanced = metrics.get("balancedAccuracy")
    if balanced is None:
        return "insufficient_data", "Insufficient identity pairs to compute error rates."
    if detection_rate < 0.7:
        return "detection_risk", "Low detection rate suggests acquisition or lighting issues dominate errors."
    if balanced >= 0.9:
        return "low_bias", "Strong separation between genuine and impostor pairs at the chosen threshold."
    if balanced >= 0.8:
        return "moderate_bias", "Moderate separation; review thresholds and data balance."
    return "high_bias", "Low separation; consider threshold tuning and data quality improvements."


def _audit_group(group: str, group_folder: str, threshold: float, use_preprocessing: bool, max_pairs: int, rng: random.Random):
    identities = _collect_identities(group_folder, MAX_AUDIT_SAMPLES_PER_GROUP, rng)
    if not identities:
        return None

    embeddings_by_identity, detection_stats = _embed_identities(identities, use_preprocessing)
    identity_count = len(embeddings_by_identity)
    all_embeddings = [emb for embeds in embeddings_by_identity.values() for emb in embeds]

    warnings = []
    if identity_count < 2:
        warnings.append("Need at least two identities to compute impostor pairs.")
    genuine_pairs_iter = _iter_genuine_pairs(embeddings_by_identity)
    impostor_pairs_iter = _iter_impostor_pairs(embeddings_by_identity)

    genuine_distances = _sample_distances(genuine_pairs_iter, max_pairs, rng)
    impostor_distances = _sample_distances(impostor_pairs_iter, max_pairs, rng)

    if not genuine_distances:
        warnings.append("Insufficient same-identity pairs for FNR and TPR metrics.")
    if not impostor_distances:
        warnings.append("Insufficient different-identity pairs for FPR and TNR metrics.")

    centroid_distance = None
    if all_embeddings:
        centroid = np.mean(np.asarray(all_embeddings, dtype=np.float32), axis=0)
        centroid_distance = float(
            np.mean([_cosine_distance(emb, centroid) for emb in all_embeddings])
        )

    baseline_metrics = _compute_metrics(genuine_distances, impostor_distances, threshold)
    adaptive_threshold = _threshold_for_target_fpr(impostor_distances, TARGET_FPR, threshold)
    mitigated_metrics = _compute_metrics(genuine_distances, impostor_distances, adaptive_threshold)

    overlap = _distribution_overlap(genuine_distances, impostor_distances)
    d_prime_value = _d_prime(genuine_distances, impostor_distances)

    lookalike_risk = {
        "threshold": None,
        "rate": None,
        "overlap": overlap,
        "dPrime": d_prime_value,
    }
    if impostor_distances:
        percentile = 5 if len(impostor_distances) >= 20 else 10
        candidate = float(np.percentile(np.asarray(impostor_distances, dtype=np.float32), percentile))
        lookalike_threshold = float(min(threshold * LOOKALIKE_DISTANCE_RATIO, candidate))
        rate = sum(1 for d in impostor_distances if d <= lookalike_threshold) / len(impostor_distances)
        lookalike_risk["threshold"] = lookalike_threshold
        lookalike_risk["rate"] = float(rate)

    interpretation_status, interpretation_message = _interpret_group(
        baseline_metrics, detection_stats["detectionRate"]
    )

    calibrated_similarity = None
    if baseline_metrics.get("threshold"):
        genuine_mean = None
        impostor_mean = None
        if genuine_distances:
            genuine_mean = float(1.0 - np.mean(genuine_distances))
        if impostor_distances:
            impostor_mean = float(1.0 - np.mean(impostor_distances))
        calibrated_similarity = {
            "genuineMean": genuine_mean,
            "impostorMean": impostor_mean,
            "method": "distance_to_threshold",
        }

    return {
        "group": group,
        "sampleCount": len(all_embeddings),
        "identityCount": identity_count,
        "centroidDistance": centroid_distance,
        "detectionRate": detection_stats["detectionRate"],
        "illumination": detection_stats["illumination"],
        "preprocessingUsageRate": detection_stats["preprocessingUsageRate"],
        "genuine": _distribution_stats(genuine_distances),
        "impostor": _distribution_stats(impostor_distances),
        "metrics": baseline_metrics,
        "mitigation": {
            **mitigated_metrics,
            "calibratedSimilarity": calibrated_similarity,
        },
        "lookAlikeRisk": lookalike_risk,
        "warnings": warnings,
        "interpretation": {
            "status": interpretation_status,
            "message": interpretation_message,
        },
    }


def _gap_summary(values: List[Optional[float]]):
    valid = [v for v in values if v is not None]
    if not valid:
        return None
    return {
        "min": float(min(valid)),
        "max": float(max(valid)),
        "gap": float(max(valid) - min(valid)),
        "mean": float(sum(valid) / len(valid)),
    }


def _overall_fairness_score(group_results: List[dict], use_mitigation: bool):
    if not group_results:
        return 0
    metrics_key = "mitigation" if use_mitigation else "metrics"
    balanced = [g[metrics_key].get("balancedAccuracy") for g in group_results]
    avg_balanced = _gap_summary(balanced)
    if not avg_balanced:
        return 0
    fpr_gap = _gap_summary([g[metrics_key].get("fpr") for g in group_results])
    fnr_gap = _gap_summary([g[metrics_key].get("fnr") for g in group_results])

    gap_penalty = 0.0
    if fpr_gap and fnr_gap:
        gap_penalty = (fpr_gap["gap"] + fnr_gap["gap"]) / 2.0
    score = max(0.0, min(1.0, avg_balanced["mean"] - gap_penalty))
    return int(round(score * 100))


def _run_fairness_audit(threshold: float, use_preprocessing: bool, max_pairs: int, seed: int):
    rng = random.Random(seed)
    group_results = []

    for group in GROUPS:
        group_folder = os.path.join(DATASET_PATH, group)
        if not os.path.isdir(group_folder):
            continue
        group_result = _audit_group(group, group_folder, threshold, use_preprocessing, max_pairs, rng)
        if group_result:
            group_results.append(group_result)

    if not group_results:
        return None

    demographic_distances = []
    for group in group_results:
        avg_distance = group.get("centroidDistance")
        if avg_distance is None:
            avg_distance = 0.0
        demographic_distances.append(
            {
                "group": group["group"],
                "averageDistance": float(avg_distance),
                "sampleCount": int(group["sampleCount"]),
                "isAboveThreshold": avg_distance >= threshold,
            }
        )

    baseline_score = _overall_fairness_score(group_results, use_mitigation=False)
    mitigated_score = _overall_fairness_score(group_results, use_mitigation=True)

    thresholds = {g["group"]: g["mitigation"]["threshold"] for g in group_results}
    calibration = {g["group"]: g["mitigation"].get("calibratedSimilarity") for g in group_results}

    AUDIT_CACHE["timestamp"] = datetime.utcnow().isoformat() + "Z"
    AUDIT_CACHE["group_thresholds"] = thresholds
    AUDIT_CACHE["calibration"] = calibration

    return {
        "groups": group_results,
        "demographicDistances": demographic_distances,
        "thresholds": {
            "standard": float(threshold),
            "adaptiveStrategy": "target_fpr",
            "targetFpr": float(TARGET_FPR),
        },
        "overall": {
            "baselineScore": baseline_score,
            "mitigatedScore": mitigated_score,
            "baselineFprGap": _gap_summary([g["metrics"].get("fpr") for g in group_results]),
            "baselineFnrGap": _gap_summary([g["metrics"].get("fnr") for g in group_results]),
            "baselineBalancedAccuracy": _gap_summary(
                [g["metrics"].get("balancedAccuracy") for g in group_results]
            ),
            "mitigatedFprGap": _gap_summary([g["mitigation"].get("fpr") for g in group_results]),
            "mitigatedFnrGap": _gap_summary([g["mitigation"].get("fnr") for g in group_results]),
            "mitigatedBalancedAccuracy": _gap_summary(
                [g["mitigation"].get("balancedAccuracy") for g in group_results]
            ),
        },
        "notes": [
            "Bias metrics are computed from verification-style genuine and impostor pairs within each group.",
            "Detection failures are reported separately to avoid conflating acquisition issues with embedding bias.",
            "High overlap between genuine and impostor distributions can indicate look-alike or twin difficulty.",
            "Mitigation applies adaptive thresholds and calibrated similarity scores relative to those thresholds.",
            GROUPS_NOTE,
        ],
        "groupDefinitions": GROUP_DEFINITIONS,
        "config": {
            "model": MODEL_NAME,
            "detectorBackend": DETECTOR_BACKEND,
            "minFaceConfidence": MIN_FACE_CONFIDENCE,
            "preprocessingEnabled": ENABLE_PREPROCESSING,
            "preprocessMethod": PREPROCESS_METHOD,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def _load_group_embeddings(group_folder, limit, use_preprocessing: bool):
    images = _list_image_paths(group_folder)
    if limit and limit > 0:
        images = images[:limit]
    embeddings = []
    for img_path in images:
        embedding, metadata = _get_cached_embedding(img_path, use_preprocessing)
        if metadata.get("detected") and embedding is not None:
            embeddings.append(embedding)
    return embeddings


@app.after_request
def add_security_headers(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "model": MODEL_NAME,
        "detectorBackend": DETECTOR_BACKEND,
        "groups": GROUPS,
        "groupDefinitions": GROUP_DEFINITIONS,
        "preprocessing": {
            "enabled": ENABLE_PREPROCESSING,
            "method": PREPROCESS_METHOD,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


@app.route("/api/analyze-face", methods=["POST"])
def analyze_face():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    temp_path = _save_upload(file, "analysis")
    start_time = time.time()

    try:
        embedding, metadata = _get_embedding_with_metadata(temp_path, use_preprocessing=True)
        embedding_size = len(embedding) if embedding is not None else 0

        response = {
            "faceDetected": bool(metadata.get("detected")),
            "embeddingSize": int(embedding_size),
            "modelUsed": MODEL_NAME,
            "processingTime": float(time.time() - start_time),
            "detectorBackend": metadata.get("detectorBackend"),
            "illumination": metadata.get("illumination"),
            "preprocessing": metadata.get("preprocessing"),
        }

        bbox = metadata.get("boundingBox")
        if bbox:
            response["boundingBox"] = bbox
        if metadata.get("detected"):
            response["confidence"] = float(metadata.get("confidence") or 0.0)

        return jsonify(response)
    except Exception as exc:
        return jsonify({"error": f"Analysis failed: {str(exc)}"}), 500
    finally:
        _cleanup(temp_path)


@app.route("/api/compare-faces", methods=["POST"])
def compare_faces():
    if "image1" not in request.files or "image2" not in request.files:
        return jsonify({"error": "Both image1 and image2 are required"}), 400

    file1 = request.files["image1"]
    file2 = request.files["image2"]
    path1 = _save_upload(file1, "compare1")
    path2 = _save_upload(file2, "compare2")
    start_time = time.time()

    try:
        embedding1, meta1 = _get_embedding_with_metadata(path1, use_preprocessing=True)
        embedding2, meta2 = _get_embedding_with_metadata(path2, use_preprocessing=True)

        face1_detected = bool(meta1.get("detected"))
        face2_detected = bool(meta2.get("detected"))

        cosine_similarity = 0.0
        distance = None
        is_match = False
        calibrated_similarity = 0.0
        warnings = []

        threshold_source = "standard"
        threshold_used = STANDARD_THRESHOLD

        requested_group = request.form.get("group") or request.args.get("group")
        use_adaptive = str(
            request.form.get("useAdaptiveThreshold")
            or request.args.get("useAdaptiveThreshold")
            or ""
        ).lower() in ("1", "true", "yes")

        if use_adaptive and requested_group in AUDIT_CACHE.get("group_thresholds", {}):
            threshold_used = AUDIT_CACHE["group_thresholds"][requested_group]
            threshold_source = "adaptive"

        if not face1_detected or not face2_detected:
            warnings.append("Face detection failed for one or both images.")
        elif embedding1 is None or embedding2 is None:
            warnings.append("Embedding extraction failed for one or both images.")
        else:
            distance = _cosine_distance(embedding1, embedding2)
            cosine_similarity = max(0.0, 1.0 - distance)
            is_match = bool(distance <= threshold_used)
            calibrated_similarity = _calibrated_similarity(distance, threshold_used)

        lookalike_threshold = threshold_used * LOOKALIKE_DISTANCE_RATIO
        twin_flag = bool(distance is not None and distance <= lookalike_threshold)

        return jsonify({
            "face1Detected": face1_detected,
            "face2Detected": face2_detected,
            "cosineSimilarity": float(cosine_similarity),
            "distance": float(distance) if distance is not None else None,
            "isMatch": bool(is_match),
            "confidence": float(calibrated_similarity),
            "calibratedSimilarity": float(calibrated_similarity),
            "threshold": float(threshold_used),
            "thresholdSource": threshold_source,
            "twinLookAlikeRisk": {
                "flag": twin_flag,
                "threshold": float(lookalike_threshold),
                "note": (
                    "Very high similarity can occur for twins or look-alikes. "
                    "Use stricter thresholds or human review when risk is flagged."
                ),
            },
            "processingTime": float(time.time() - start_time),
            "warnings": warnings,
        })
    except Exception as exc:
        return jsonify({"error": f"Comparison failed: {str(exc)}"}), 500
    finally:
        _cleanup([path1, path2])


@app.route("/api/predict-demographic", methods=["POST"])
def predict_demographic():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    temp_path = _save_upload(file, "affinity")
    start_time = time.time()

    try:
        embedding, metadata = _get_embedding_with_metadata(temp_path, use_preprocessing=True)
        if embedding is None:
            return jsonify({"error": "Unable to generate embedding"}), 500

        distances = []
        for group in GROUPS:
            group_folder = os.path.join(DATASET_PATH, group)
            if not os.path.isdir(group_folder):
                continue

            embeddings = _load_group_embeddings(group_folder, MAX_REFERENCE_SAMPLES_PER_GROUP, True)
            if not embeddings:
                continue

            centroid = np.mean(np.asarray(embeddings, dtype=np.float32), axis=0)
            distance = _cosine_distance(embedding, centroid)
            thresholds = AUDIT_CACHE.get("group_thresholds", {})
            group_threshold = thresholds.get(group, STANDARD_THRESHOLD)

            distances.append({
                "group": group,
                "averageDistance": float(distance),
                "sampleCount": int(len(embeddings)),
                "isAboveThreshold": distance >= group_threshold,
                "threshold": float(group_threshold),
            })

        if not distances:
            return jsonify({"error": "No reference images found"}), 500

        distances_sorted = sorted(distances, key=lambda d: d["averageDistance"])
        best_match = distances_sorted[0]
        predicted_group = best_match["group"]
        min_distance = float(best_match["averageDistance"])

        runner_up = distances_sorted[1]["averageDistance"] if len(distances_sorted) > 1 else None
        confidence_score = 0.0
        if runner_up is not None and runner_up > 0:
            confidence_score = max(0.0, 1.0 - (min_distance / runner_up))
        else:
            confidence_score = max(0.0, 1.0 - min_distance)

        threshold_used = float(best_match.get("threshold", STANDARD_THRESHOLD))

        return jsonify({
            "predictedGroup": predicted_group,
            "confidenceScore": float(confidence_score),
            "distances": distances,
            "referenceDecision": {
                "threshold": float(threshold_used),
                "withinThreshold": bool(min_distance <= threshold_used),
                "thresholdSource": "adaptive" if predicted_group in AUDIT_CACHE.get("group_thresholds", {}) else "standard",
                "note": "Thresholds are calibrated for verification audits and are informational only in this view.",
            },
            "disclaimer": (
                "This system does NOT classify race. It reports similarity trends from face embeddings "
                "by comparing against reference demographic datasets. The results indicate embedding "
                "similarity patterns, not racial identity."
            ),
            "preprocessing": metadata.get("preprocessing"),
            "processingTime": float(time.time() - start_time),
        })
    except Exception as exc:
        return jsonify({"error": f"Affinity analysis failed: {str(exc)}"}), 500
    finally:
        _cleanup(temp_path)


@app.route("/api/fairness-audit", methods=["POST"])
def fairness_audit():
    start_time = time.time()
    payload = request.get_json(silent=True) or {}

    threshold = float(payload.get("threshold", STANDARD_THRESHOLD))
    use_preprocessing = bool(payload.get("usePreprocessing", True))
    max_pairs = int(payload.get("maxPairs", MAX_PAIRS_PER_GROUP))
    seed = int(payload.get("seed", RNG_SEED))

    result = _run_fairness_audit(threshold, use_preprocessing, max_pairs, seed)
    if not result:
        return jsonify({"error": "No reference images found for audit"}), 500

    result["processingTime"] = float(time.time() - start_time)
    result["overallFairnessScore"] = result["overall"]["baselineScore"]
    result["evaluationPlan"] = {
        "metrics": [
            "FPR",
            "FNR",
            "TPR parity",
            "Balanced Accuracy",
            "Distribution overlap",
        ],
        "baselines": [
            "ArcFace baseline threshold",
            "Adaptive thresholds (target FPR)",
        ],
        "dataset": "Local reference sets in backend/dataset",
    }

    return jsonify(result)


if __name__ == "__main__":
    print("FairFace Insight API running on http://localhost:5000")
    app.run(port=5000, debug=True)
