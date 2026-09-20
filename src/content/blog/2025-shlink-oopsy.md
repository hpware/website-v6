---
title: "在測試時不小心做了一個 Oopsy"
description: "我在測試Shlink可以用多少字數時，使用錯伺服器( aka 用到 Production) (雖然測試耶是在同台伺服器，但那個是測試用的)，這個非常不好，我嘗試用他的API刪，不行，用curl? 不行"
pubDate: 2025-04-28
updatedDate: 2025-04-28
author: "Howard Wu"
status: "published"
---

我在測試Shlink可以用多少字數時，使用錯伺服器( aka 用到 Production) (雖然測試耶是在同台伺服器，但那個是測試用的)，這個非常不好，我嘗試用他的API刪，不行，用curl? 不行，在Database Level? 我登入伺服器ssh並看到我是用他不是給 Production 的指令 😫 然後 sqlite db也在 container 裡... 幸好我在Vultr有每個月付30元的備份，不然我完蛋了。 我這個禮拜把 sqlite 變到 Postgres，不然我重開 Container 資料全部都會消失
