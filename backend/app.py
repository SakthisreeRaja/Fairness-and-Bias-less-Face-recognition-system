import os
import time
import uuid
from datetime import datetime

import numpy as np
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

MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "opencv"
STANDARD_THRESHOLD = 0.68

GROUPS = ["African", "Asian", "Caucasian", "Indian"]

ADAPTIVE_THRESHOLDS = {
    "African": 0.40,
    "Asian": STANDARD_THRESHOLD,
    "Caucasian": STANDARD_THRESHOLD,
    "Indian": STANDARD_THRESHOLD,
}

MAX_AUDIT_SAMPLES_PER_GROUP = int(os.getenv("MAX_AUDIT_SAMPLES_PER_GROUP", "50"))
MAX_REFERENCE_SAMPLES_PER_GROUP = int(os.getenv("MAX_REFERENCE_SAMPLES_PER_GROUP", "50"))
MIN_FACE_CONFIDENCE = float(os.getenv("MIN_FACE_CONFIDENCE", "0.30"))


def _save_upload(file, prefix):
    filename = secure_filename(file.filename or f"{prefix}.jpg")
    request_id = uuid.uuid4().hex
    temp_path = os.path.join(UPLOAD_FOLDER, f"{prefix}_{request_id}_{filename}")
    file.save(temp_path)
    return temp_path


def _cleanup(path):
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


def _list_images(folder):
    if not os.path.isdir(folder):
        return []
    images = [f for f in os.listdir(folder) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    images.sort()
    return images


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


def _detect_face(img_path):
    try:
        faces = DeepFace.extract_faces(
            img_path=img_path,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
        )
    except Exception:
        return False, None, 0.0
    if not faces:
        return False, None, 0.0
    face = faces[0]
    confidence = float(face.get("confidence", 0.0) or 0.0)
    area = face.get("facial_area") or {}
    detected = confidence >= MIN_FACE_CONFIDENCE
    return detected, area, confidence


def _embed_face(img_path):
    try:
        representations = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
        )
    except Exception:
        return None
    if not representations:
        return None
    rep = representations[0]
    return rep.get("embedding")


def _cosine_distance(vec_a, vec_b):
    a = np.asarray(vec_a, dtype=np.float32)
    b = np.asarray(vec_b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9
    return float(1.0 - float(np.dot(a, b) / denom))


def _compute_overall_fairness(distances):
    if not distances:
        return 0
    ratios = []
    for item in distances:
        ratio = min(item["averageDistance"] / STANDARD_THRESHOLD, 1.0)
        ratios.append(ratio)
    return int(round((sum(ratios) / len(ratios)) * 100))


def _interpret_distance(value):
    if value >= STANDARD_THRESHOLD:
        return "low_bias", "Distance above threshold suggests strong within-group separability."
    if value >= STANDARD_THRESHOLD * 0.90:
        return "moderate_bias", "Distance slightly below threshold; review same-demographic errors."
    return "high_bias", "Distance well below threshold; consider rebalancing and threshold tuning."


def _load_group_embeddings(group_folder, limit):
    images = _list_images(group_folder)
    if limit and limit > 0:
        images = images[:limit]
    embeddings = []
    for img_name in images:
        img_path = os.path.join(group_folder, img_name)
        embedding = _embed_face(img_path)
        if embedding is not None:
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
        "groups": GROUPS,
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
        detected, area, confidence = _detect_face(temp_path)
        embedding_size = 0

        if detected:
            embedding = _embed_face(temp_path)
            if embedding is not None:
                embedding_size = len(embedding)

        response = {
            "faceDetected": bool(detected),
            "embeddingSize": int(embedding_size),
            "modelUsed": MODEL_NAME,
            "processingTime": float(time.time() - start_time),
        }

        bbox = _format_bounding_box(area)
        if bbox:
            response["boundingBox"] = bbox
        if detected:
            response["confidence"] = float(confidence)

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
        face1_detected, _, _ = _detect_face(path1)
        face2_detected, _, _ = _detect_face(path2)

        cosine_similarity = 0.0
        is_match = False

        if face1_detected and face2_detected:
            result = DeepFace.verify(
                img1_path=path1,
                img2_path=path2,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False,
                distance_metric="cosine",
            )
            distance = float(result.get("distance", 1.0))
            cosine_similarity = max(0.0, 1.0 - distance)
            threshold = float(result.get("threshold", STANDARD_THRESHOLD))
            is_match = bool(result.get("verified", distance <= threshold))

        confidence = cosine_similarity if is_match else (1.0 - cosine_similarity)

        return jsonify({
            "face1Detected": bool(face1_detected),
            "face2Detected": bool(face2_detected),
            "cosineSimilarity": float(cosine_similarity),
            "isMatch": bool(is_match),
            "confidence": float(confidence),
            "processingTime": float(time.time() - start_time),
        })
    except Exception as exc:
        return jsonify({"error": f"Comparison failed: {str(exc)}"}), 500
    finally:
        _cleanup(path1)
        _cleanup(path2)


@app.route("/api/predict-demographic", methods=["POST"])
def predict_demographic():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    temp_path = _save_upload(file, "affinity")
    start_time = time.time()

    try:
        embedding = _embed_face(temp_path)
        if embedding is None:
            return jsonify({"error": "Unable to generate embedding"}), 500

        distances = []
        for group in GROUPS:
            group_folder = os.path.join(DATASET_PATH, group)
            if not os.path.isdir(group_folder):
                continue

            embeddings = _load_group_embeddings(group_folder, MAX_REFERENCE_SAMPLES_PER_GROUP)
            if not embeddings:
                continue

            centroid = np.mean(np.asarray(embeddings, dtype=np.float32), axis=0)
            distance = _cosine_distance(embedding, centroid)

            distances.append({
                "group": group,
                "averageDistance": float(distance),
                "sampleCount": int(len(embeddings)),
                "isAboveThreshold": distance >= STANDARD_THRESHOLD,
            })

        if not distances:
            return jsonify({"error": "No reference images found"}), 500

        distances_sorted = sorted(distances, key=lambda d: d["averageDistance"])
        best_match = distances_sorted[0]
        predicted_group = best_match["group"]
        min_distance = float(best_match["averageDistance"])

        confidence_score = max(0.0, 1.0 - min_distance)
        applied_threshold = ADAPTIVE_THRESHOLDS.get(predicted_group, STANDARD_THRESHOLD)
        is_safe = min_distance < applied_threshold

        return jsonify({
            "predictedGroup": predicted_group,
            "confidenceScore": float(confidence_score),
            "distances": distances,
            "disclaimer": (
                "This system does NOT classify race. It reports similarity trends from face embeddings "
                "by comparing against reference demographic datasets. The results indicate embedding "
                "similarity patterns, not racial identity."
            ),
            "mitigation": {
                "appliedThreshold": float(applied_threshold),
                "standardThreshold": float(STANDARD_THRESHOLD),
                "biasReductionActive": applied_threshold != STANDARD_THRESHOLD,
                "status": "VERIFIED SAFE" if is_safe else "REJECTED (Threshold Mismatch)",
            },
            "processingTime": float(time.time() - start_time),
        })
    except Exception as exc:
        return jsonify({"error": f"Affinity analysis failed: {str(exc)}"}), 500
    finally:
        _cleanup(temp_path)


@app.route("/api/fairness-audit", methods=["POST"])
def fairness_audit():
    start_time = time.time()
    distances = []

    for group in GROUPS:
        group_folder = os.path.join(DATASET_PATH, group)
        if not os.path.isdir(group_folder):
            continue

        embeddings = _load_group_embeddings(group_folder, MAX_AUDIT_SAMPLES_PER_GROUP)
        if not embeddings:
            continue

        centroid = np.mean(np.asarray(embeddings, dtype=np.float32), axis=0)
        group_distances = [_cosine_distance(e, centroid) for e in embeddings]
        avg_dist = float(sum(group_distances) / len(group_distances))

        distances.append({
            "group": group,
            "averageDistance": avg_dist,
            "sampleCount": int(len(embeddings)),
            "isAboveThreshold": avg_dist >= STANDARD_THRESHOLD,
        })

    if not distances:
        return jsonify({"error": "No reference images found for audit"}), 500

    interpretation = []
    for item in distances:
        status, message = _interpret_distance(item["averageDistance"])
        interpretation.append({
            "group": item["group"],
            "status": status,
            "message": message,
        })

    return jsonify({
        "demographicDistances": distances,
        "threshold": float(STANDARD_THRESHOLD),
        "overallFairnessScore": _compute_overall_fairness(distances),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "interpretation": interpretation,
        "evaluationPlan": {
            "metrics": [
                "FMR",
                "FNMR",
                "TPR parity",
                "EER",
                "ROC-AUC",
            ],
            "baselines": [
                "ArcFace baseline",
                "ArcFace with adaptive thresholds",
            ],
            "dataset": "Local reference sets in backend/dataset",
        },
        "processingTime": float(time.time() - start_time),
    })


if __name__ == "__main__":
    print("FairFace Insight API running on http://localhost:5000")
    app.run(port=5000, debug=True)
