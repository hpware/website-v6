---
title: "Patching copy.fail"
description: "New expoilt :<"
pubDate: 2026-05-01
updatedDate: 2026-05-14
author: "Howard Wu"
status: "published"
---

# New expoilt :<
Update May 14, 2026: Some servers are upgraded to patch the issue, but some are not. During the period before all the servers are patched, some services will be offline.

Effected instances:
- RP (Home Lab) Patched: ✅
- core 1 (Home Lab)  Patched: ✅
- core 2 (Home Lab)  Patched: ✅
- SG Wordpress & Analytics & URL Shortener service (Vultr)  Patched: ✅
- TW Legacy Syno (HiNet external) now offline for non taiwan users.
- JP Pangolin server (Vultr)  Patched: ✅
- US Monitoring server (Racknerd)  Patched: ✅

& All users using [manageUT](https://manageut.yhw.tw) using my Home Lab to self host services. Please patch your servers.

## Copy Fail
### Temporary mitigation
```bash
echo "install algif_aead /bin/false" | sudo tee /etc/modprobe.d/disable-algif-aead.conf
sudo rmmod algif_aead 2>/dev/null || true
```
### Debian (users using manageUT)
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot 
```
