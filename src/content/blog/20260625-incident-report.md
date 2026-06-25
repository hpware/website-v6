---
title: "2026-06-25 Incident Report"
description: "Incident report!! TLDR; PPPoE service broke somehow"
pubDate: 2026-06-26
updatedDate: 2026-06-26
author: "Howard Wu"
status: "published"
---

## Effected services
- DNS (Internal)
- Web Services using `ip1.cname.thme.cc`
- Users who's services are port forwarded through `GW1_STATIC`

## Context
At 2026/06/25 11-ish I lost connection to my home lab. This only effected one of the WAN lines, the other two WANs work properly. Users using MANAGEUT to host discord/slack bots or such still works, due to the DNS is set to `8.8.8.8` and using `GW3` as the main gateway.

## What broke and what fixed it?
The PPPoE interface did not get an IP address for some reason, after I re-applyed the settings, its back again.

## What will be changed in the future?
1. The three gateway system is awesome, however the firewall's DNS is only forwarding requests to `GW1_STATIC`, this will be changed to a dynamic failback system.
2. From now on, some MANAGEUT that uses port forwarding will be migrated to `GW3`'s dynamic IP, including web services. And will be using a different reverse proxy from my main one. Legacy (Created before ~2026/06/25) will still be using the legacy `GW1_STATIC` IP address.
3. The manageUT site, will be migrated to new shared infra instead of a legacy Dokploy server that crashes randomly.
4. Some time in the future, the firewall will be replaced. I will fire a announcement at the status page. https://status.yhw.tw

This is a final report for ya!

~ Howard
