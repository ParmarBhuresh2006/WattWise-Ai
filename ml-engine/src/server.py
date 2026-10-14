"""
server.py — Local loopback HTTP server for WattWise ML Engine.

IMPORTANT: This server binds to 127.0.0.1 ONLY.
It must never be exposed to the public network.

Endpoints:
  GET  /health
  POST /train
  GET  /evaluation
  POST /forecast
  POST /detect-anomalies
"""

import os
import sys
import json
import traceback

# Ensure src directory is on the path
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SRC_DIR)

from flask import Flask, request, jsonify

from train import train
from predict import forecast, load_meta
from anomaly_detection import detect_anomalies

app = Flask(__name__)

REPORTS_DIR = os.path.join(SRC_DIR, '..', 'reports')


def error_response(message: str, status: int = 500):
    return jsonify({'success': False, 'message': message}), status


@app.route('/health', methods=['GET'])
def health():
    meta = load_meta()
    return jsonify({
        'success': True,
        'service': 'wattwise-ml-engine',
        'modelReady': bool(meta),
        'modelVersion': meta.get('version'),
        'algorithm': meta.get('algorithm'),
        'trainedAt': meta.get('trainedAt'),
    })


@app.route('/train', methods=['POST'])
def train_model():
    try:
        body = request.get_json(force=True, silent=True) or {}
        records = body.get('records')
        use_sample = body.get('useSample', False)

        if not records and not use_sample:
            return error_response('No records provided and useSample is false.', 400)

        meta = train(records=records, use_sample=use_sample)
        return jsonify({'success': True, **meta})
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        traceback.print_exc()
        return error_response(f'Training error: {str(e)}', 500)


@app.route('/evaluation', methods=['GET'])
def get_evaluation():
    report_path = os.path.join(REPORTS_DIR, 'evaluation_report.json')
    if not os.path.exists(report_path):
        return error_response('No evaluation report available. Train the model first.', 404)
    with open(report_path) as f:
        report = json.load(f)
    return jsonify({'success': True, **report})


@app.route('/forecast', methods=['POST'])
def get_forecast():
    try:
        body = request.get_json(force=True, silent=True) or {}
        records = body.get('readings') or body.get('records')
        horizon = int(body.get('horizon', 7))

        if not records:
            return error_response('No readings provided.', 400)

        result = forecast(records, horizon=horizon)
        return jsonify({'success': True, **result})
    except FileNotFoundError as e:
        return error_response(str(e), 503)
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        traceback.print_exc()
        return error_response(f'Forecast error: {str(e)}', 500)


@app.route('/detect-anomalies', methods=['POST'])
def detect():
    try:
        body = request.get_json(force=True, silent=True) or {}
        records = body.get('readings') or body.get('records')
        method  = body.get('method', 'auto')

        if not records:
            return error_response('No readings provided.', 400)

        result = detect_anomalies(records, method=method)
        return jsonify({'success': True, **result})
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        traceback.print_exc()
        return error_response(f'Detection error: {str(e)}', 500)


if __name__ == '__main__':
    host = os.environ.get('ML_ENGINE_HOST', '127.0.0.1')
    port = int(os.environ.get('ML_ENGINE_PORT', 8001))
    print(f'[WattWise ML] Starting on http://{host}:{port}')
    print('[WattWise ML] Bound to loopback only — not accessible from network')
    app.run(host=host, port=port, debug=False, threaded=True)
