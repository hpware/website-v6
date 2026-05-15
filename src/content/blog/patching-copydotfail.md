---
title: Patching copy.fail and others
description: Patching exploits.
pubDate: 2026-05-14
updatedDate: 2026-05-15
author: Howard Wu
status: published
---

# Patching exploits
Update May 15th 2026: Nginx RCE!! Affected services is currently unknwon
Update May 14, 2026: Some servers are upgraded to patch the issue, but some are not. During the period before all the servers are patched, some services will be offline.

## Effected instances:
| Instance                 | Provider | Copy Fail (CVE-2026-31431) | Dirty Frag (CVE-2026-43284)  | Fragnesia (CVE-2026-46300) | Nginx RCE (CVE-2026-42945) | Status |
| ------------------------ | -------- | --------- | ---------- | ---------- | ---------- | ------------------------------------ |
| RP                       | Home Lab | ✅         | ❓          |❓          |❓          |                                      |
| core 1                   | Home Lab | ✅         | ✅          |❓          |❓          |                                      |
| core 2                   | Home Lab | ✅         | ✅          |❓          |❓          |                                      |
| SG Wordpress & Analytics | Vultr    | ✅         | ❓          |❓          |❓          |                                      |
| TW Legacy Syno           | HiNet    | ❌         | ❓          |❓          |❓          | Unavailable users outside of Taiwan. |
| JP Pangolin              | Vultr    | ✅         | ❓          |❓          |❓          |                                      |
| US Monitoring server     | Racknerd | ✅         | ❓          |❓          |❓          |                                      |

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
