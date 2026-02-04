# FairFace Insight

FairFace Insight is a fairness-aware face recognition prototype designed to bridge academic evaluation and real-world deployment. The system focuses on transparent bias auditing, illumination-aware preprocessing, and practical mitigation strategies without retraining the underlying face recognition model.

## Highlights
- Illumination normalization (CLAHE + gamma) to reduce low-light detection failures
- Bias audit with per-group metrics (FPR, FNR, balanced accuracy) and distance distributions
- Adaptive (group-aware) thresholds to reduce parity gaps
- Explicit look-alike / twin risk indicators to avoid misattributing biometric difficulty to bias
- Clear separation between detection quality, embedding behavior, and decision thresholds

## Project Structure
- `backend/` Flask API for analysis, audits, and similarity checks
- `backend/dataset/` Reference datasets grouped by demographic folders
- `src/` React UI for pipeline execution, audits, and reports

## Running Locally

### Backend
1. Create and activate a Python virtual environment.
2. Install dependencies.
3. Start the API server.

```bash
pip install -r backend/requirements.txt
python backend/app.py
```

The API will run at `http://localhost:5000`.

### Frontend
1. Install dependencies.
2. Start the Vite dev server.

```bash
npm install
npm run dev
```

## Dataset Layout
Place reference images under `backend/dataset/`. For reliable audit metrics, group images by identity (person) inside each demographic folder:

```
backend/dataset/
  African/
    person_001/
      img1.jpg
      img2.jpg
    person_002/
  Asian/
    person_010/
  Caucasian/
  Indian/
```

If identity subfolders are not available, each image is treated as a unique identity (which limits genuine-pair metrics such as FNR).

## Configuration (Optional)
You can tune the audit and preprocessing behavior via environment variables:
- `GROUPS`: Comma-separated list of group folder names (default: `African,Asian,Caucasian,Indian`)
- `STANDARD_THRESHOLD`: Global verification threshold (default: `0.68`)
- `TARGET_FPR`: Target FPR for adaptive thresholds (default: `0.01`)
- `MIN_FACE_CONFIDENCE`: Minimum detector confidence (default: `0.30`)
- `ENABLE_PREPROCESSING`: Enable illumination normalization (default: `true`)
- `PREPROCESS_METHOD`: `clahe_gamma`, `clahe`, `gamma`, or `hist_eq` (default: `clahe_gamma`)

### Demographic Grouping (Evaluation Proxy)
The default groups (African, Asian, Indian, Caucasian) are **evaluation proxies** derived from commonly used fairness datasets (e.g., FairFace). They are not exhaustive or definitive categories of human identity, and the system is designed to support alternative or expanded group definitions as needed for a given study.

## Bias Audit Metrics
The audit reports per-group:
- Detection rate and illumination breakdown
- False Match Rate (FPR)
- False Non-Match Rate (FNR)
- Balanced accuracy
- Genuine vs impostor distance distributions
- Look-alike/twin risk indicators based on distribution overlap

Mitigation is applied via adaptive thresholds calibrated to a target FPR. The audit clearly separates detection failures from embedding or threshold effects.

## Twins & Look-Alikes
High similarity can naturally occur for identical twins or close look-alikes. The system flags this risk and recommends stricter thresholds, secondary checks, or human review for high-stakes deployments.

## API Endpoints
- `POST /api/analyze-face` Detect face and generate embeddings (with illumination metadata)
- `POST /api/compare-faces` Baseline verification between two faces
- `POST /api/predict-demographic` Similarity to reference sets (not classification)
- `POST /api/fairness-audit` Demographic audit with baseline vs mitigation metrics
- `GET /api/health` Health check

## Privacy and Security
- Uploaded images are processed in memory and deleted immediately after analysis.
- The reference matching view reports similarity trends and does not classify race.
- Add authentication and access controls for production deployments.

## Limitations
- This prototype does **not** retrain the face recognition model.
- Results depend on dataset quality, identity labeling, and capture conditions.
- Fairness audits are diagnostic tools, not guarantees of bias elimination.
