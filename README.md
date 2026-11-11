# NetWatch

NetWatch is a Flask dashboard for live network totals, transfer rates, CPU use, and memory use on the machine running the app.

## Run locally on Windows

From this directory, create an environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Start the development server:

```powershell
python app.py
```

Open http://127.0.0.1:5000. The `/health` endpoint returns `{"status":"ok"}` for deployment health checks.

## Deploy from GitHub to Render

1. Create a **private** GitHub repository. Do not initialize it with another README, license, or `.gitignore`.
2. From PowerShell in this project folder, add only the app files (this avoids uploading the unrelated `NetWatch` subfolder), commit, and push. Replace `YOUR_GITHUB_NAME` with your GitHub username:

	```powershell
	git init
	git add app.py index.html script.js style.css requirements.txt Dockerfile .dockerignore .gitignore README.md render.yaml
	git commit -m "Prepare NetWatch for Render"
	git branch -M main
	git remote add origin https://github.com/YOUR_GITHUB_NAME/netwatch.git
	git push -u origin main
	```

3. In Render, choose **New → Blueprint**, connect the GitHub repository, and apply the `render.yaml` configuration.
4. When prompted, set `NETWATCH_USERNAME` and `NETWATCH_PASSWORD`. Use a unique password; these values are not stored in GitHub.
5. Wait for the deploy to finish, then open the Render URL and sign in with those credentials. Render will automatically redeploy after pushes to `main`.

The Blueprint uses Render's free web-service plan. Free services can sleep when idle and may take a little time to respond on the first visit. Check Render's current plan limits before use.

## Build and run the production container locally

Install Docker Desktop, then run these commands from the project directory:

```powershell
docker build -t netwatch:latest .
docker run --rm -p 8000:8000 netwatch:latest
```

Open http://127.0.0.1:8000. The container runs Gunicorn, listens on the port in `PORT` (8000 by default), and runs as an unprivileged user. A hosting platform must support Linux containers and route traffic to the configured container port.

Render deployments require HTTP Basic Authentication. The `/health` endpoint remains public for Render's health check.

When deployed in a container or cloud host, measurements describe that container or host, not your personal computer or visitors' devices. To monitor a personal computer remotely, run the app on that computer and restrict access through a VPN or another authenticated private connection.