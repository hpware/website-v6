---
title: "釣魚新手法"
description: "最近我在我的個人信箱裡取得了一個MetaMask釣魚郵件，但我在導覽釣魚網頁時發現了一個特別的東西"
pubDate: 2025-01-14
updatedDate: 2025-01-14
author: "Howard Wu"
status: "published"
---

#  釣魚新手法
最近我在我的個人信箱裡取得了一個MetaMask釣魚郵件，但我在導覽釣魚網頁時發現了一個特別的東西
![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5lLpNwYV7tjKOZHLrAGbUcdNWuefTgPspQa8k)

[導向流程 (EN)](https://urlscan.io/result/a5980c31-86e2-4841-be73-9079c4dd79ea/#transactions) 

##  有趣的部分
這個釣魚是用 blob: (binary large object) 來解析，阻止用View page source

大多數的圖片與assets都用 polynethub . netlify . app 來傳到裝置，並用 Cloudflare R2 來運作。

在 index.html裡，Attacker用jquery來傳送被害人到blob: 的網頁上。

code: 
```
<script src="https://code.jquery.com/jquery-3.6.0.min.js">
</script>
<script>
$(document).ready(function() {
saveFile();});

function saveFile(name, type, data) {
if (data != null && navigator.msSaveBlob)
return navigator.msSaveBlob(new Blob([data], { type: type }), name);
var a = $("<a style='display: none;'/>");
var encodedStringAtoB = "PCFET0NUWVBF...CjwvaHRtbD4=";
var decodedStringAtoB = atob(encodedStringAtoB);
const myBlob = new Blob([decodedStringAtoB], { type: 'text/html' });
const url = window.URL.createObjectURL(myBlob);|
a.attr("href", url);
$("body").append(a);
a[0].click();
window.URL.revokeObjectURL(url);
a.remove();
}
</script>
```
## 網頁

 ![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5GPtP9TiCp1MaquLXiHKkfB2O7ZVhPI9xjDzS)

 
到網頁後就是平常的用Telegram來傳送，但Attacker有增加ipinfo


![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5JYKOx4NnsGrSAZ5CLplKfRB3xmED1ovdF07Q)

我更改Bot Token後得到的Telegram 訊息:


![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5Wyo9PytHLzPys01vAgOGKaduwXt2bNYVQ7Bp)
