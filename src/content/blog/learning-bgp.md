---
title: "Learning BGP"
description: "using FFR with bgpd"
pubDate: 2026-09-15
updatedDate: 2026-09-15
author: "Howard Wu"
status: "published"
---

NOTE This is not a tutorial, this is just a random learning blog post, and putting what I've learned.

## Server setup

My main hypervisor is Proxmox, and is using VLAN `3002`. With three Debian VMs with Cloud-init, specs are 1 core, 1 gig of ram, and a 16 gig drive. With only `bgpd` installed.

### BGP Mappings

#### AS65001

10.65.0.0/23 (Server IP: 10.65.0.1/23)
MGMT: 10.77.1.158 (DHCP)
BGP IP: 10.223.254.20/24

##### Clients:

Laptop (10.65.1.130/23)

#### AS65002

10.65.2.0/23 (Server takes the entire block)
MGMT: 10.77.1.161 (DHCP)
BGP IP: 10.223.254.30/24

#### AS65003

10.65.4.0/23 (Server takes the entire block)
MGMT: 10.77.1.160 (DHCP)
BGP IP: 10.223.254.40/24

## Setup FRR

Using debian's FRR lib for this learning session

```
apt list frr
sudo apt install frr
```

## First BGP Server :) (65001)

So this should be on `vm1`.

```bash
configure terminal # Setup the env for setting up the BGP router
router bgp 65001 # Point what BGP ID you are
# peering
neighbor 10.223.254.30 remote-as 65002 # adding 65002
neighbor 10.223.254.40 remote-as 65003 # adding 65003
address-family ipv4 unicast # what address you have
network 10.65.0.0/23 # your IPv4 address block
exit-address-family # exit the "address family" block
end # ends the configured terminal
write memory # Saves details
```

### Setup the LAN connected to the laptop

```bash
# both Management and BGP node's IPs are handled by Proxmox's Cloud Init env, so its not here
sudo sysctl -w net.ipv4.ip_forward=1 # setup IP forwarding
sudo ip addr add 10.65.0.1/23 dev ens20 # add 10.65.0.1 into ens20 (the port that will be hooked to my laptop)
```

## AS65002

```bash
configure terminal # Setup the env for setting up the BGP router
router bgp 65002 # Point what BGP ID you are
# peering
neighbor 10.223.254.20 remote-as 65001 # adding 65002
neighbor 10.223.254.40 remote-as 65003 # adding 65003
address-family ipv4 unicast # what address you have
network 10.65.0.0/23 # your IPv4 address block
exit-address-family # exit the "address family" block
end # ends the configured terminal
write memory # Saves details
```

### Setup making the server eat the entire block of IPs

```bash
sudo ip route add local 10.65.2.0/23 dev lo table local
```

## AS65003

Same as before, just changing the `remote-as`
