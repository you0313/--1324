# Utopia
Utopia Unblocker unblocks hundreds of millions of websites and bypasses web restrictions with ease.
The most revolutionary proxy service out there, adding unprecendented technology and algorithms to circumvent blocks.

Trusted by over **22 million users** and counting.

## Special Features
These features can be enabled/disabled in the Settings page in Utopia:
 * **🔒 Hidden Mode**
   * Utopia revolutionized the world by being the first ever website to have about:blank cloaking
   * **Hides Utopia completely from your history** and **prevents extensions** such as GoGuardian **from seeing your screen**
 * **🚫 Anti-Closing**
   - Prevents extensions such as GoGuardian from closing the tab you're on
 * **🎭 Tab Cloak**
   - Disguises the tab you're on as something else, such as Google Classroom, Drive, Gmail, etc.
 * **⚡ Quick Links**
   * Access websites faster than ever with a click of a button
 * **🎨 Themes**
   * Personalize Utopia with countless high-quality themes
* **🔍 Search Engine**
   * Switch between Google, DuckDuckGo, and more.
* **📑 Tabs System**
   * See site URL, title, and icon while browsing for smoother navigation.
* **🚫 Experimental Ad Blocker**
   * Blocks ads globally, meaning a faster and privacy-focused browing experience.
* **🛠 Dev Tools**
   * Access an integrated dev panel by clicking the ⚙️ icon while browsing.
* **And more to come...**

---
## 📦 Deployment
### Netlify

The Netlify configuration publishes `main/` and routes `/bare/` to a serverless relay compatible with the bundled Ultraviolet v1 client. No separate relay server or API key is required. Deploy the repository, open the site over HTTPS, and enter a URL or search term. Service Workers must be enabled in the browser. URL inputs and HTTP resources are upgraded to HTTPS; destinations without working HTTPS are not supported.

The relay checks TLS certificates, permits only port 443, blocks private and reserved IPv4/IPv6 destinations, and pins DNS resolution to the checked address to prevent DNS rebinding. It does not follow redirects internally: redirected requests go through the same validation again. Hop-by-hop and hosting-provider headers are not forwarded. Requests and decompressed responses are limited to 4 MiB, with a 20-second relay timeout. The function declares an IP-based platform rate limit of 600 requests per minute. The site refuses cross-origin browser relay requests and sends no-cache and no-referrer headers. These origin checks are not authentication; the endpoint is still public and hosting usage must be monitored.

This Netlify configuration supports ordinary HTTPS requests, not WebSockets, long-lived connections, large downloads, or every modern website. The browser displays an error when a request is blocked or fails. WebSocket endpoints return an explicit unsupported response rather than pretending to work.

This is **not an anonymity service, malware filter, or security sandbox**. Proxied pages execute through a legacy URL-rewriting engine on this site's origin; the application should not share an origin with sensitive services. Do not use it to enter passwords, payment details, or other confidential information. The relay must handle plaintext content to rewrite it, and the hosting provider may keep infrastructure logs. Cookies and preferences remain in the browser. The site's bundled Arc.io, Google Analytics, and advertising scripts were removed from the top-level application pages, but destination sites and remaining font/icon resources can still contact third parties. A successful HTTPS connection does not prove a destination is trustworthy.

The original `npm start` command still starts the standalone Node server; the security restrictions above describe the new Netlify relay, not that legacy server.

Easily deploy your own instance of Utopia using one of the platforms below:

[![Run on Replit](https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/replit.svg)](https://replit.com/github/UtopiaUnblocker/Utopia)
<br>
[![Deploy to Heroku](https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/heroku.svg)](https://heroku.com/deploy/?template=https://github.com/UtopiaUnblocker/Utopia)
<br>
[![Deploy to IBM Cloud](https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/ibmcloud.svg)](https://cloud.ibm.com/devops/setup/deploy?repository=https://github.com/UtopiaUnblocker/Utopia)
<br>
[![Deploy to Amplify Console](https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/amplifyconsole.svg)](https://console.aws.amazon.com/amplify/home#/deploy?repo=https://github.com/UtopiaUnblocker/Utopia)
<br>
[![Run on Google Cloud](https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/master/buttons/remade/googlecloud.svg)](https://deploy.cloud.run/?git_repo=https://github.com/UtopiaUnblocker/Utopia)
<br>
[![Remix on Glitch](https://binbashbanana.github.io/deploy-buttons/buttons/remade/glitch.svg)](https://glitch.com/edit/#!/import/github/UtopiaUnblocker/Utopia)
<br>
[![Deploy To Koyeb](https://binbashbanana.github.io/deploy-buttons/buttons/remade/koyeb.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/UtopiaUnblocker/Utopia&branch=main&name=Utopia)

### Manual Setup
```bash
# Clone the repository
git clone https://github.com/UtopiaUnblocker/Utopia.git
cd Utopia

# Install dependencies
npm install

# Start the server
npm start
```

---
## 💬 Community & Support
Need help deploying or want to suggest features?
- Join the official Discord: **[discord.gg/hFZC5cgsmq](https://discord.gg/hFZC5cgsmq)**

[![Join us on Discord](https://invidget.switchblade.xyz/hFZC5cgsmq?theme=dark)](https://discord.gg/unblockers)

---
<p align="center">
  <strong>⭐ Star this repository if Utopia helps you!</strong>
</p>
