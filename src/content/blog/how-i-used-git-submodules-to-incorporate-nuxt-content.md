---
title: "我如何用Git Submodules 來配合 @nuxt/content"
description: "這個系統主要是用 Nuxt Content (aka 我懶的寫一個CMS) 與 Git submodules (之後可能會換成 S3??) 配合"
pubDate: 2025-01-29
updatedDate: 2025-01-29
author: "Howard Wu"
status: "published"
---

這個系統主要是用 Nuxt Content (aka 我懶的寫一個CMS) 與 Git submodules (之後可能會換成 S3??) 配合

## 為什麼是用 Submodules?
第一: 在2023時用了一個 nuxt blog(? 當然，nuxt blog 依賴 Git 的編輯

第二: 我在2024年的暑假用了一個V2，他依賴一個叫做 .vue 的檔案 aka 我的每個文章需要 1. 寫 html 2. 在 prod 主頁上增加連結

第三: v3 雖然沒有很多東西，但他有超過 300+ Commits，新的不想用這麼多

第四: Comments，Comments是在我之前做的都沒有的東西，而我用的 Giscus 依賴 Github (之後一定會自己做一套)，這個也只是剛好用這個而已．

第五: 寫文章的編輯器，我用的是 Obsidian 來寫我的文章，我也不想要把我的Source Code 拿進來 obsidian 來鬧．
![](https://1qz92oj9ol.ufs.sh/f/CCLPSN5W2HD50NEqFSPZROuFIXvNoH7J3cq4rpTLtdwDMiKQ)
## 我中間學習到的東西

1. Vercel 不會看 Submodules 是誰 Commit 的，他只會看主要的repo，所以之後可以把 src 變成 git submodules(?
2. 我在之前根本用不到submodules，但我也在中途學到了一些，例: 
```git submodules update --init --remote```
我也不知道為什麼 git submodules 更新可以加 init(? 而且不是我就是要遠端嗎(? 可以用local? 我不確定

I guess that's it. 差不多就這樣
