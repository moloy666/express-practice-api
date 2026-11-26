# Deploy the Express API with Docker

Practice deploying this public repository in a fresh Killercoda Ubuntu playground. The playground is temporary, so its files and containers disappear when the session expires. These commands assume the terminal runs as root; otherwise, use `sudo` for commands that require it.

```text
Browser or curl → Nginx :80 → Docker container :3000 → Express
```

Docker runs the app and handles container restarts. Nginx runs on the server and forwards requests to the container. PM2 and a separate Node.js installation on the server are not needed for this example.

## 1. Install basic tools and check Docker

```bash
whoami
apt update
apt install -y git nginx curl ca-certificates
docker --version
docker info
```

If both Docker commands work, skip to step 2. If Docker is installed but `docker info` reports that the daemon is not running, try `systemctl start docker` and check `docker info` again.

If Docker is not installed, install Docker Engine from Docker's official Ubuntu package repository:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl start docker
docker version
docker run hello-world
```

This assumes a supported Ubuntu release and a fresh playground without conflicting Docker packages. For prerequisites, conflicts, and alternatives, see the [official Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/).

## 2. Clone the repository

Replace the URL with your public GitHub repository URL:

```bash
cd /var/www
git clone https://github.com/USERNAME/REPOSITORY.git practice-api
cd /var/www/practice-api
cat package.json
```

This API uses `npm start` to run `server.js`, listens on port 3000 by default, and provides `GET /api/health`.

## 3. Create the Docker image

Create `Dockerfile` in the repository directory:

```bash
nano Dockerfile
```

Add:

```dockerfile
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

`npm ci` uses the repository's `package-lock.json`. The image contains Node.js, the app, and its production dependencies. `EXPOSE` documents the container port; the next step publishes it.

Create `.dockerignore`:

```bash
nano .dockerignore
```

Add:

```text
node_modules
.git
.env
.env.*
npm-debug.log
```

Build the image:

```bash
docker build -t practice-api .
docker images
```

The Dockerfile and `.dockerignore` created in the playground are local files. Commit them to your repository if you want them available in future playground sessions.

## 4. Run the container

```bash
docker run -d \
  --name practice-api \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  practice-api

docker ps
docker logs practice-api
curl http://127.0.0.1:3000/api/health
```

The response should be `{"status":"ok"}`. The port mapping makes the container available on the server's local port 3000, where Nginx can reach it. The restart policy starts the container again after a failure or Docker restart, subject to Docker's [restart policy rules](https://docs.docker.com/engine/containers/start-containers-automatically/).

## 5. Configure Nginx

```bash
nano /etc/nginx/sites-available/default
```

Replace the existing `location /` block with:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

Save the file, then:

```bash
nginx -t
systemctl start nginx
systemctl reload nginx
curl http://127.0.0.1/api/health
```

Use Killercoda's port-access interface to open port 80 in your browser.

## 6. Deploy an update

After pushing changes to the same branch on GitHub:

```bash
cd /var/www/practice-api
git pull
docker build -t practice-api .
docker rm -f practice-api
docker run -d \
  --name practice-api \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  practice-api
curl http://127.0.0.1/api/health
```

The running container does not change when you pull code or rebuild the image: recreate it to run the update. This simple replacement causes a short interruption. If the Dockerfile and `.dockerignore` were committed after you created them locally, resolve any Git conflict before pulling.

## Troubleshooting

```bash
docker ps -a
docker logs practice-api
docker info
nginx -t
ss -tlnp
```

A 502 response means Nginx cannot reach the app. Check the container logs, confirm it is running, and test `curl http://127.0.0.1:3000/api/health`. The app must listen on the container's network interface; this API's `app.listen(port)` works for this setup.

If port 3000 is already in use, find the process with `ss -tlnp | grep ':3000'`. An existing PM2 app from the non-Docker guide may be using it. Stop the conflicting app before starting this container.
