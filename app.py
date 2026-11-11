from flask import Flask, Response, jsonify, render_template, request, send_from_directory
import hmac
import os
import psutil
import socket
from datetime import datetime

app = Flask(__name__, template_folder=".")

@app.before_request
def require_dashboard_auth():
    if request.endpoint == "health" or os.environ.get("NETWATCH_REQUIRE_AUTH") != "1":
        return None

    username = os.environ.get("NETWATCH_USERNAME", "")
    password = os.environ.get("NETWATCH_PASSWORD", "")
    if not username or not password:
        return Response("Dashboard authentication is not configured.", status=503)

    credentials = request.authorization
    if credentials and hmac.compare_digest(credentials.username or "", username) and hmac.compare_digest(credentials.password or "", password):
        return None

    return Response(
        "Authentication required.",
        status=401,
        headers={"WWW-Authenticate": 'Basic realm="NetWatch", charset="UTF-8"'},
    )

def get_network_stats():
    network = psutil.net_io_counters()

    return {
        "bytes_sent": network.bytes_sent,
        "bytes_received": network.bytes_recv,
        "packets_sent": network.packets_sent,
        "packets_received": network.packets_recv
    }

def get_system_stats():
    return {
        "cpu": psutil.cpu_percent(interval=0.5),
        "memory": psutil.virtual_memory().percent,
        "hostname": socket.gethostname(),
        "time": datetime.now().strftime("%H:%M:%S")
    }

@app.route("/")
def dashboard():
    return render_template("index.html")

@app.route("/api/stats")
def stats():
    return jsonify({
        "system": get_system_stats(),
        "network": get_network_stats()
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

@app.route("/style.css")
def stylesheet():
    return send_from_directory(app.root_path, "style.css")

@app.route("/script.js")
def javascript():
    return send_from_directory(app.root_path, "script.js")

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")