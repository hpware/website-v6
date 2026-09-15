NOTE This is not a tutorial, this is just a random learning blog post, and putting what I've learned.

## Server setup

My main hypervisor is Proxmox, and is using VLAN `3002`. With three Debian VMs with Cloud-init, specs are 1 core, 1 gig of ram, and a 16 gig drive. With only `bgpd` installed.

### BGP Mappings

#### AS65001

```
10.65.0.0/23 (Server IP: 10.65.0.1/23)
MGMT: 10.77.1.158 (DHCP)
BGP IP: 10.223.254.20/24
  CLIENTS (Bridged via Proxmox VLAN 3003):
    Laptop (10.65.1.130/23)

```

#### AS65002

```
10.65.2.0/23 (Server takes the entire block)
MGMT: 10.77.1.161
BGP IP: 10.223.254.30/24
```

#### AS65003

```
10.65.4.0/23 (Server takes the entire block)
MGMT: 10.77.1.160
BGP IP: 10.223.254.40/24
```

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
network 10.65.2.0/23 # your IPv4 address block
exit-address-family # exit the "address family" block
end # ends the configured terminal
write memory # Saves details
```

### Setup making the server eat the entire block of IPs

```bash
sudo ip route add local 10.65.2.0/23 dev lo table local
```

## AS65003

```bash
configure terminal # Setup the env for setting up the BGP router
router bgp 65003 # Point what BGP ID you are
# peering
neighbor 10.223.254.20 remote-as 65001 # adding 65002
neighbor 10.223.254.30 remote-as 65002 # adding 65003
address-family ipv4 unicast # what address you have
network 10.65.4.0/23 # your IPv4 address block
exit-address-family # exit the "address family" block
end # ends the configured terminal
write memory # Saves details
```

### Setup making the server eat the entire block of IPs

```bash
sudo ip route add local 10.65.2.0/23 dev lo table local
```

## Testing

### Node 1

```bash
root@bgp-vm1:~$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:f6:e7:df brd ff:ff:ff:ff:ff:ff
    altname enp6s18
    altname enxbc2411f6e7df
    inet 10.77.1.158/24 metric 100 brd 10.77.1.255 scope global dynamic eth0
       valid_lft 79522sec preferred_lft 79522sec
    inet6 fe80::be24:11ff:fef6:e7df/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:f4:70:50 brd ff:ff:ff:ff:ff:ff
    altname enp6s19
    altname enxbc2411f47050
    inet 10.223.254.20/24 brd 10.223.254.255 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::be24:11ff:fef4:7050/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
4: ens20: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:a3:03:13 brd ff:ff:ff:ff:ff:ff
    altname enp6s20
    altname enxbc2411a30313
    inet 10.65.0.1/23 scope global ens20
       valid_lft forever preferred_lft forever
    inet6 fe80::be24:11ff:fea3:313/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever

root@bgp-vm1:~$ curl 10.65.0.1
BGP VM1
root@bgp-vm1:~$ curl 10.65.2.1
BGP VM2
root@bgp-vm1:~$ curl 10.65.4.1
BGP VM3
```

### Node 2

```bash
root@bgp-vm2:~$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:d6:ef:81 brd ff:ff:ff:ff:ff:ff
    altname enp6s18
    altname enxbc2411d6ef81
    inet 10.77.1.161/24 metric 100 brd 10.77.1.255 scope global dynamic eth0
       valid_lft 79290sec preferred_lft 79290sec
    inet6 fe80::be24:11ff:fed6:ef81/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:c4:50:65 brd ff:ff:ff:ff:ff:ff
    altname enp6s19
    altname enxbc2411c45065
    inet 10.223.254.30/24 brd 10.223.254.255 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::be24:11ff:fec4:5065/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
root@bgp-vm2:~$ curl 10.65.0.1
BGP VM1
root@bgp-vm2:~$ curl 10.65.2.1
BGP VM2
root@bgp-vm2:~$ curl 10.65.4.1
BGP VM3
```

### Node 3

```bash
root@bgp-vm3:~$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:4e:13:fd brd ff:ff:ff:ff:ff:ff
    altname enp6s18
    altname enxbc24114e13fd
    inet 10.77.1.160/24 metric 100 brd 10.77.1.255 scope global dynamic eth0
       valid_lft 79203sec preferred_lft 79203sec
    inet6 fe80::be24:11ff:fe4e:13fd/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:0e:73:e5 brd ff:ff:ff:ff:ff:ff
    altname enp6s19
    altname enxbc24110e73e5
    inet 10.223.254.40/24 brd 10.223.254.255 scope global eth1
       valid_lft forever preferred_lft forever
    inet6 fe80::be24:11ff:fe0e:73e5/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
root@bgp-vm3:~$ curl 10.65.0.1
BGP VM1
root@bgp-vm3:~$ curl 10.65.2.1
BGP VM2
root@bgp-vm3:~$ curl 10.65.4.1
BGP VM3
```
