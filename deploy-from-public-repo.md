# Deploy from public repo

Practice deploying a public GitHub repository in a fresh Killercoda Ubuntu playground. The playground is temporary, so its files are deleted when the session expires.

These steps assume a Node.js app with an `npm start` script that listens on port 3000, such as the Express practice API. Killercoda usually runs the terminal as root.

## 1. Install the tools

```bash
whoami
apt update
apt install -y git nginx nodejs npm
git --version
node --version
npm --version
nginx -v
```

## 2. Clone the repository

Replace the URL with your public GitHub repository URL:

```bash
cd /var/www
git clone https://github.com/USERNAME/REPOSITORY.git practice-api
cd /var/www/practice-api
ls -la
npm install
cat package.json
```

Check that `package.json` has a `start` script. For the Express practice API, it runs `node server.js`.

## 3. Start the app with PM2

```bash
npm install -g pm2
pm2 start npm --name practice-api -- start
pm2 list
curl http://127.0.0.1:3000
curl http://127.0.0.1:3000/api/health
```

The practice API's health endpoint should return `{"status":"ok"}`.

## 4. Configure Nginx

```bash
nano /etc/nginx/sites-available/default
```

Find the existing `location /` block and replace that block with:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

Save with Ctrl+O, press Enter, then exit with Ctrl+X. Check and start or reload Nginx:

```bash
nginx -t
systemctl start nginx
systemctl reload nginx
curl http://127.0.0.1
curl http://127.0.0.1/api/health
```

The `proxy_pass` configuration is needed for Nginx to forward requests to the app. Without it, the app can still be accessed directly on port 3000, but Nginx will usually serve its default page.

```text
Browser or curl → Nginx :80 → Express :3000
                                  ↑
                                 PM2
```

Use Killercoda's port-access interface to open port 80 in your browser.

## 5. Deploy an update

After pushing changes to the same branch on GitHub:

```bash
cd /var/www/practice-api
git pull
npm install
pm2 restart practice-api
curl http://127.0.0.1/api/health
```

## Troubleshooting

```bash
pm2 list
pm2 logs practice-api --lines 20 --nostream
nginx -t
ss -tlnp
```

A 502 response means Nginx cannot reach the app. Check that the app is running and listening on port 3000. `EADDRINUSE` means the address and port are already in use:

```bash
ss -tlnp | grep ':3000'
```
