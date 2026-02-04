# FairFace Insight

FairFace Insight is an end-to-end, fairness-aware face recognition prototype designed to narrow the gap
between academic research and practical deployment. The system covers data curation, algorithm design,
privacy and security controls, bias auditing, and deployment guidance with reproducible metrics.

## Highlights
- End-to-end pipeline from dataset collection to deployment
- Bias mitigation using adaptive thresholds and demographic audits
- Clear evaluation metrics with baseline comparisons
- Privacy-first processing with ephemeral uploads and report exports

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
Place reference images under `backend/dataset/` using the group names below:

```
backend/dataset/
  African/
  Asian/
  Caucasian/
  Indian/
```

## API Endpoints
- `POST /api/analyze-face` Detect face and generate embeddings
- `POST /api/compare-faces` Baseline verification between two faces
- `POST /api/predict-demographic` Similarity to reference sets (not classification)
- `POST /api/fairness-audit` Demographic audit with evaluation plan
- `GET /api/health` Health check

## Evaluation and Baselines
The audit pipeline documents metrics and baseline comparisons for reproducible reporting.
Planned metrics include:
- FMR (False Match Rate)
- FNMR (False Non-Match Rate)
- TPR parity
- EER (Equal Error Rate)
- ROC-AUC

Baselines include a standard ArcFace pipeline and an adaptive-threshold variant.

## Privacy and Security
- Uploaded images are processed in memory and deleted immediately after analysis.
- The reference matching view reports similarity trends and does not classify race.
- Add authentication and access controls for production deployments.
