---
title: "same.dev 的使用經驗"
description: "這個是一個我在 Twitter (X) 看到許多人在噴的AI Agent"
pubDate: 2025-03-16
updatedDate: 2025-03-16
author: "Howard Wu"
status: "published"
---

## 我的經驗
我在這個平台上體驗了一個東西，叫做卡到爆，我在手機使用的時候，根本不能用，我也看到他是用Amazon AWS EC2 的伺服器。而且他的複製按鈕只會複製 "true"

### 被路由器擋
在使用這個程式時，我在家用的路由器華碩(Asus)把它擋下了
![](https://pbs.twimg.com/media/GmISx-4awAAL81R?format=jpg&name=4096x4096)

我最終是用我手機熱點來存取這個網站

### clone v2.yuanh.xyz
我叫他來把我的第2版網站把它複製一下，結果：
![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5xQ3WufZwdlPBRZAusnGvaepgLEb97KoMHimV)

console: 
```
 yuanh-clone  bunx next dev
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3000

 ✓ Starting...
 ⚠ Invalid next.config.js options detected:
 ⚠     Unrecognized key(s) in object: 'outDir'
 ⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
 ✓ Ready in 2.5s
(node:30177) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ○ Compiling / ...
 ✓ Compiled / in 2.7s (648 modules)
 GET / 200 in 3043ms
 ✓ Compiled in 198ms (314 modules)
```
好看起來比較好看，但是我為什麼是截圖不是用網頁？

### Deploying
在 Deploying 的時候做了一些憃事，例如在失敗時在創一個 static 版的網頁...
![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5DufT1IO7K02ZsmuXqoNcTnlrPgFiOpM4R5Yf)

我是不知道為什麼要這一樣做，但有點誇張

## 在 Twitter / X 上面的人在講的
### 1.  超級好笑的漏洞 (sudo)
這叫權利給太多

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">they literally give out containers with root access. how could you not take advantage of this Beautiful Offer</p>&mdash; PatRyk (@Patrosi73) <a href="https://twitter.com/Patrosi73/status/1900913515403132945?ref_src=twsrc%5Etfw">March 15, 2025</a></blockquote>
### 2. 超級不會躲是搬運程式碼
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">oh come on, this shit just straight up steals the source code and tries to change it around a little <a href="https://t.co/plfcIxEs1V">https://t.co/plfcIxEs1V</a> <a href="https://t.co/kKkgYb7i1d">pic.twitter.com/kKkgYb7i1d</a></p>&mdash; Rebane (@rebane2001) <a href="https://twitter.com/rebane2001/status/1900480704716124342?ref_src=twsrc%5Etfw">March 14, 2025</a></blockquote>

### 3. 被使用來製作釣魚網站
(這個只是測試而已，我不希望這個工具用來製作釣魚網站)

我測試幾間台灣的銀行例如中國信託．與上海商銀在做測試
#### 1.  中國信託
無法運行
![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5OX2CcpkkG0Pjwg39cbCULIBuo5r7Wl8SDeay)

#### 2. 上海商銀
可以，這個大約花費20分鍾，而且產生不一樣的東西(但比較好看?
![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD5iyn7t34nTx4Vw5YzdoKBN6r3DEgJHpGI0uiQ)

Project: https://same.dev/chat/clone-www-scsb-com-tw-v6paggx8nkp

Live : https://scsb-clone-app.same-app.com/

然後創 作者說要擋創作銀行網站，不會叫AI自己辨識是不是銀行嗎？ (但在網站頁頭有寫警示就是了)
